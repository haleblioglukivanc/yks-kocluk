-- Risk skorundaki net farkı aynı tür denemeler arasında hesaplanır
-- (19 Eylül 2026). Eskiden son iki deneme türüne bakılmadan
-- karşılaştırılıyordu: TYT'den (≈85 net) sonra AYT (≈40 net) giren her
-- öğrencide "45 net düştü" sayılıyor, iyi giden öğrenci bile acile
-- düşüyordu. Artık her tür kendi içinde karşılaştırılır; en son girilen
-- ve iki denemesi olan türün farkı kullanılır.
create or replace view public.ogrenci_risk with (security_invoker = true) as
 WITH aktiflik AS (
         SELECT o.id AS ogrenci_id, o.koc_id, o.kayit_tarihi,
            NULLIF(GREATEST(
              COALESCE((SELECT max(private.yerel_gun(g.guncellendi)) FROM gorevler g
                         WHERE g.ogrenci_id = o.id AND g.durum = 'tamamlandi'::gorev_durumu), '2000-01-01'::date),
              COALESCE((SELECT max(private.yerel_gun(c.baslangic)) FROM calisma_oturumlari c
                         WHERE c.ogrenci_id = o.id), '2000-01-01'::date),
              COALESCE((SELECT max(d.tarih) FROM denemeler d WHERE d.ogrenci_id = o.id), '2000-01-01'::date)
            ), '2000-01-01'::date) AS son_aktiflik
           FROM ogrenciler o
          WHERE o.aktif
        ), hafta AS (
         SELECT gorevler.ogrenci_id,
            count(*) FILTER (WHERE gorevler.durum = 'tamamlandi'::gorev_durumu) AS tamamlanan,
            count(*) AS toplam,
            count(*) FILTER (WHERE gorevler.durum <> 'tamamlandi'::gorev_durumu AND gorevler.tarih < private.yerel_gun(now())) AS gecikmis
           FROM gorevler
          WHERE gorevler.tarih >= (private.yerel_gun(now()) - 7) AND gorevler.tarih <= private.yerel_gun(now())
          GROUP BY gorevler.ogrenci_id
        ), deneme_netleri AS (
         SELECT d.ogrenci_id, d.tur, d.id AS deneme_id, d.tarih, sum(s.net) AS toplam_net,
            row_number() OVER (PARTITION BY d.ogrenci_id, d.tur ORDER BY d.tarih DESC, d.id DESC) AS sira
           FROM denemeler d
             JOIN deneme_sonuclari s ON s.deneme_id = d.id
          GROUP BY d.ogrenci_id, d.tur, d.id, d.tarih
        ), tur_farki AS (
         SELECT ogrenci_id, tur,
            max(toplam_net) FILTER (WHERE sira = 1) - max(toplam_net) FILTER (WHERE sira = 2) AS fark,
            max(tarih) FILTER (WHERE sira = 1) AS son_tarih
           FROM deneme_netleri
          WHERE sira <= 2
          GROUP BY ogrenci_id, tur
        ), net_fark AS (
         SELECT DISTINCT ON (ogrenci_id) ogrenci_id, fark
           FROM tur_farki
          ORDER BY ogrenci_id, (fark IS NULL), son_tarih DESC
        ), kapanis AS (
         SELECT k.ogrenci_id,
            bool_or(k.tam) FILTER (WHERE k.tarih = (private.yerel_gun(now()) - 1)) AS dun_tam,
            ( SELECT count(*) AS count
                   FROM generate_series(1, 14) n(n)
                  WHERE NOT (EXISTS ( SELECT 1 FROM gun_kapanis e
                          WHERE e.ogrenci_id = k.ogrenci_id AND e.tarih = (private.yerel_gun(now()) - n.n) AND e.tam))
                    AND (EXISTS ( SELECT 1 FROM gun_kapanis e
                          WHERE e.ogrenci_id = k.ogrenci_id AND e.tarih = (private.yerel_gun(now()) - n.n)))
                    AND NOT (EXISTS ( SELECT 1 FROM generate_series(1, n.n - 1) m(m)
                          WHERE NOT (EXISTS ( SELECT 1 FROM gun_kapanis e2
                                  WHERE e2.ogrenci_id = k.ogrenci_id AND e2.tarih = (private.yerel_gun(now()) - m.m) AND NOT e2.tam))))) AS eksik_ust_uste
           FROM gun_kapanis k
          WHERE k.tarih >= (private.yerel_gun(now()) - 14)
          GROUP BY k.ogrenci_id
        ), skor AS (
         SELECT a.ogrenci_id, a.koc_id, a.son_aktiflik,
            a.son_aktiflik IS NULL AS hic_baslamadi,
            CASE WHEN a.son_aktiflik IS NULL THEN NULL::integer ELSE private.yerel_gun(now()) - a.son_aktiflik END AS gun_gecti,
            LEAST(COALESCE(private.yerel_gun(now()) - a.son_aktiflik, private.yerel_gun(now()) - a.kayit_tarihi, 0), 14) AS sessiz_gun,
            round(COALESCE(h.tamamlanan::numeric * 100::numeric / NULLIF(h.toplam, 0)::numeric, 0::numeric))::integer AS tamamlama_yuzdesi,
            COALESCE(h.gecikmis, 0::bigint) AS gecikmis_gorev,
            round(COALESCE(nf.fark, 0::numeric), 2) AS net_farki,
            COALESCE(private.etkin_seri(a.ogrenci_id), 0) AS guncel_seri,
            COALESCE(h.toplam, 0::bigint) AS haftalik_gorev,
            kp.dun_tam,
            COALESCE(kp.eksik_ust_uste, 0::bigint)::integer AS eksik_ust_uste
           FROM aktiflik a
             LEFT JOIN hafta h ON h.ogrenci_id = a.ogrenci_id
             LEFT JOIN net_fark nf ON nf.ogrenci_id = a.ogrenci_id
             LEFT JOIN kapanis kp ON kp.ogrenci_id = a.ogrenci_id
        ), puan AS (
         SELECT sk.*,
            GREATEST(0::numeric, round((sk.sessiz_gun * 5)::numeric + (100 - sk.tamamlama_yuzdesi)::numeric * 0.4
              + GREATEST(0::numeric, - sk.net_farki) * 1.5 + (sk.gecikmis_gorev * 4)::numeric - (sk.guncel_seri * 2)::numeric))::integer AS risk_ham
           FROM skor sk
        )
 SELECT p2.ogrenci_id, p2.koc_id, p2.son_aktiflik, p2.hic_baslamadi, p2.gun_gecti, p2.sessiz_gun,
    p2.tamamlama_yuzdesi, p2.gecikmis_gorev, p2.net_farki, p2.guncel_seri, p2.haftalik_gorev,
    LEAST(100, p2.risk_ham) AS risk_skoru, p2.risk_ham, pr.ad_soyad,
    CASE WHEN p2.risk_ham >= 60 THEN 'acil'::text WHEN p2.risk_ham >= 35 THEN 'izle'::text ELSE 'iyi'::text END AS risk_seviyesi,
    p2.dun_tam, p2.eksik_ust_uste
   FROM puan p2
     JOIN profiller pr ON pr.id = p2.ogrenci_id
  ORDER BY p2.risk_ham DESC;
