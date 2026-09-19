-- DEMO VERİ — 25 öğrenci (19 Eylül 2026)
--
-- Amaç: koç ekranlarının kalabalık bir sınıfla nasıl göründüğünü görmek.
-- Hepsi Demo Koç'a bağlı; e-postaları @demo.khkocluk.com, şifreleri
-- Demo2026!ux. Gerçek öğrenci değil.
--
-- Profiller (kural tabanlı, aynı tohumla aynı veri çıkar):
--   1–9   yolunda   (işlerin %85–97'si biter)
--   10–16 orta      (%50–70)
--   17–20 zorlanan  (%20–40, gecikmiş iş birikir)
--   21–23 kaybolan  (4, 6 ve 10 gündür işaret yok)
--   24–25 yeni      (3 gün önce kayıt, hiç başlamadı)
-- Her öğrenciye: son 14 gün + önümüzdeki 7 gün görev (günde 1–4),
-- biten işlere sayaç oturumu, gün kapanışları, seri, iki TYT + bir AYT
-- deneme (ders ders), konu ilerlemesi (bazıları koç onayı bekliyor),
-- beş öğrenciden koça okunmamış mesaj.
--
-- Not: canlıda çalıştırılan sürüm plpgsql'de CASE yerine IF kullandı (aynı mantık).
-- Bildirim/telegram tetikleri bu yükleme sırasında kapatıldı: koça
-- yüzlerce bildirim düşmesin, tarihler de geçmişte kalsın.
--
-- ───────────────────────────────────────────────────────────────────
-- TEMİZLİK (gerçek kullanıma geçerken):
--   delete from public.mesajlar where gonderen_id in (select id from auth.users where email like '%@demo.khkocluk.com')
--                                   or alici_id in (select id from auth.users where email like '%@demo.khkocluk.com');
--   delete from auth.users where email like '%@demo.khkocluk.com';   -- profiller/ogrenciler ve bağlı kayıtlar zincirle gider
-- ───────────────────────────────────────────────────────────────────

do $seed$
declare
  v_koc uuid := 'e11766c5-6d9c-48df-99f7-cbca4bda90d6';
  v_bugun date := date '2026-09-19';
  adlar text[] := array['Ayşe Yılmaz','Mehmet Kaya','Zeynep Demir','Emre Çelik','Elif Şahin','Can Aydın','Defne Öztürk','Burak Arslan','Selin Koç',
                        'Yusuf Kurt','Ecem Polat','Arda Doğan','Nehir Aslan','Kerem Yıldız','Ebru Tekin','Ozan Erdem',
                        'İrem Güneş','Baran Kılıç','Duru Şimşek','Mert Aksoy',
                        'Sude Karaca','Efe Ateş','Melis Bulut',
                        'Kaan Uçar','Berra Kaplan'];
  d_say int[] := array[2,3,4,5,6,1,11,12,13,14];
  d_ea  int[] := array[2,1,3,7,8,10,11,15,16];
  d_soz int[] := array[1,7,8,9,10,15,16];
  sessizler int[] := array[4,6,10];
  i int; j int; n int; k int;
  v_id uuid; v_ad text; v_alan public.alan_turu; v_tip text; v_p numeric; v_sessiz int; v_kayit date;
  v_dersler int[]; v_ders int; v_konu int; v_konu_ad text; v_kcnt int;
  v_tur text; v_baslik text; v_hedef int; v_done boolean; v_zaman timestamptz; v_sure int;
  d date; v_gun_toplam int; v_gun_biten int; v_aktif_gun boolean;
  v_seri int; v_enuzun int; v_son date; v_run int;
  v_net_hedef numeric; v_deneme bigint; v_q int; v_r numeric; v_dogru int; v_yanlis int;
  v_frac numeric; v_tamam int; v_pending boolean;
  ayt_dersler int[]; ayt_q int[];
  tyt_dersler int[] := array[1,2,3,4,5,6,7,8,9];
  tyt_q int[] := array[40,30,10,7,7,6,5,5,5];
begin
  perform setseed(0.4219);

  -- Bildirim, telegram, onay koruması, "guncellendi = now()" gibi tetikler
  -- yükleme boyunca kapalı; blok sonunda açılıyor.
  alter table public.gorevler disable trigger user;
  alter table public.calisma_oturumlari disable trigger user;
  alter table public.denemeler disable trigger user;
  alter table public.deneme_sonuclari disable trigger user;
  alter table public.konu_ilerleme disable trigger user;
  alter table public.mesajlar disable trigger user;

  for i in 1..25 loop
    v_ad := adlar[i];
    v_id := gen_random_uuid();
    v_alan := case when i in (6,15,20,23) then 'sozel'
                   when i % 3 = 2 then 'esit_agirlik'
                   else 'sayisal' end;
    v_dersler := case v_alan when 'sayisal' then d_say when 'esit_agirlik' then d_ea else d_soz end;
    if i <= 9 then v_tip := 'iyi'; v_p := 0.85 + random() * 0.12;
    elsif i <= 16 then v_tip := 'orta'; v_p := 0.5 + random() * 0.2;
    elsif i <= 20 then v_tip := 'zayif'; v_p := 0.2 + random() * 0.2;
    elsif i <= 23 then v_tip := 'kayip'; v_p := 0.75; v_sessiz := sessizler[i - 20];
    else v_tip := 'yeni'; v_p := 0;
    end if;
    v_kayit := case when v_tip = 'yeni' then v_bugun - 3 else v_bugun - 30 end;

    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current,
      phone_change, phone_change_token, reauthentication_token, is_sso_user, is_anonymous)
    values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
      'demo' || lpad(i::text, 2, '0') || '@demo.khkocluk.com',
      extensions.crypt('Demo2026!ux', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('rol', 'ogrenci', 'ad_soyad', v_ad),
      v_kayit::timestamptz, now(), '', '', '', '', '', '', '', '', false, false);

    insert into public.ogrenciler (id, koc_id, alan, sinif, katalog_id, kayit_tarihi, aktif,
      hedef_tyt_net, hedef_ayt_net, haftalik_calisma_hedefi_dk)
    values (v_id, v_koc, v_alan, case when i % 4 = 0 then 13 else 12 end, 1, v_kayit, true,
      70 + (i * 7) % 35, 45 + (i * 5) % 30, 900);

    -- ── Görevler, oturumlar, gün kapanışları ──
    for d in select generate_series(v_bugun - 14, v_bugun + 7, interval '1 day')::date loop
      if d < v_kayit then continue; end if;
      n := case when extract(isodow from d) = 7 then 1 else 2 + floor(random() * 3)::int end;
      v_gun_toplam := 0; v_gun_biten := 0;
      for j in 1..n loop
        v_ders := v_dersler[1 + ((i * 3 + (d - v_bugun + 40) * 2 + j * 5) % array_length(v_dersler, 1))];
        select count(*) into v_kcnt from public.konular where ders_id = v_ders;
        k := ((d - v_bugun + 14) / 3 + i % 5 + j) % greatest(v_kcnt, 1);
        select kk.id, kk.ad into v_konu, v_konu_ad from public.konular kk
          where kk.ders_id = v_ders order by kk.sira nulls last, kk.id offset k limit 1;
        v_tur := case when extract(isodow from d) = 6 and j = 1 then 'deneme'
                      when j % 3 = 0 then 'tekrar' when j % 3 = 1 then 'soru_cozumu' else 'konu_anlatimi' end;
        v_hedef := case when v_tur = 'soru_cozumu' then (array[20,30,40])[1 + (i + j) % 3] else null end;
        v_baslik := case v_tur
          when 'deneme' then 'Branş denemesi — ' || v_konu_ad
          when 'tekrar' then 'Tekrar — ' || v_konu_ad
          when 'soru_cozumu' then 'Soru çözümü — ' || v_konu_ad
          else 'Konu çalışması — ' || v_konu_ad end;

        if d > v_bugun or v_tip = 'yeni' then v_done := false;
        elsif v_tip = 'kayip' and d > v_bugun - v_sessiz then v_done := false;
        elsif d = v_bugun then v_done := (j = 1 and random() < v_p * 0.8);
        else v_done := random() < v_p;
        end if;

        v_zaman := case when d = v_bugun
          then (d::timestamp + interval '8 hours' + (random() * 120) * interval '1 minute') at time zone 'Europe/Istanbul'
          else (d::timestamp + interval '16 hours' + (j * 70 + random() * 60) * interval '1 minute') at time zone 'Europe/Istanbul' end;

        insert into public.gorevler (ogrenci_id, koc_id, tarih, ders_id, konu_id, tur, baslik, hedef_adet, yapilan_adet, durum,
                                     olusturuldu, guncellendi, islem_yapan)
        values (v_id, v_koc, d, v_ders, v_konu, v_tur::public.gorev_turu, v_baslik, v_hedef,
                case when v_done and v_hedef is not null then v_hedef else 0 end,
                (case when v_done then 'tamamlandi' else 'bekliyor' end)::public.gorev_durumu,
                least(d, v_bugun)::timestamp - interval '2 days',
                case when v_done then v_zaman else least(d, v_bugun)::timestamp - interval '2 days' end,
                case when v_done then v_id else v_koc end);

        v_gun_toplam := v_gun_toplam + 1;
        if v_done then
          v_gun_biten := v_gun_biten + 1;
          v_sure := (array[25,45,50])[1 + (i + j) % 3];
          insert into public.calisma_oturumlari (ogrenci_id, ders_id, konu_id, baslangic, sure_dk, kaynak, olusturuldu, islem_yapan)
          values (v_id, v_ders, v_konu, v_zaman - v_sure * interval '1 minute', v_sure, 'sayac', v_zaman, v_id);
        end if;
      end loop;

      -- Gün kapanışı: yalnız geçmiş günler, öğrencinin tempoya göre
      v_aktif_gun := d < v_bugun and v_tip <> 'yeni' and not (v_tip = 'kayip' and d > v_bugun - v_sessiz);
      if v_aktif_gun and random() < (case v_tip when 'iyi' then 0.85 when 'orta' then 0.5 when 'kayip' then 0.6 else 0.2 end) then
        insert into public.gun_kapanis (ogrenci_id, tarih, kapandi, tam, islem_yapan)
        values (v_id, d, (d::timestamp + interval '22 hours') at time zone 'Europe/Istanbul',
                v_gun_toplam > 0 and v_gun_biten = v_gun_toplam, v_id);
      end if;
    end loop;

    -- ── Seri: dünden geriye, en az bir işin bittiği ardışık günler ──
    v_seri := 0; v_enuzun := 0; v_run := 0; v_son := null;
    for d in select generate_series(v_bugun - 14, v_bugun, interval '1 day')::date loop
      if exists (select 1 from public.gorevler g where g.ogrenci_id = v_id and g.tarih = d and g.durum = 'tamamlandi') then
        v_run := v_run + 1; v_son := d; v_enuzun := greatest(v_enuzun, v_run);
      elsif d < v_bugun then
        v_run := 0;
      end if;
    end loop;
    v_seri := case when v_son >= v_bugun - 1 then v_run else 0 end;
    insert into public.seriler (ogrenci_id, guncel_seri, en_uzun_seri, son_aktif_gun, guncellendi)
    values (v_id, v_seri, v_enuzun, v_son, now())
    on conflict (ogrenci_id) do update set guncel_seri = excluded.guncel_seri, en_uzun_seri = excluded.en_uzun_seri,
      son_aktif_gun = excluded.son_aktif_gun;

    -- ── Denemeler: iki TYT, bir AYT ──
    if v_tip <> 'yeni' then
      v_net_hedef := case v_tip when 'iyi' then 75 + random() * 20 when 'orta' then 55 + random() * 15
                                when 'zayif' then 35 + random() * 15 else 50 + random() * 15 end;
      for k in 1..2 loop
        d := case k when 1 then date '2026-09-06' else date '2026-09-13' end;
        if v_tip = 'kayip' and d > v_bugun - v_sessiz then continue; end if;
        if k = 2 then
          v_net_hedef := v_net_hedef + case v_tip when 'iyi' then 3 + random() * 4 when 'orta' then -2 + random() * 6
                                                  when 'zayif' then -7 + random() * 7 else -3 + random() * 4 end;
        end if;
        insert into public.denemeler (ogrenci_id, koc_id, tarih, tur, yayin, ad, olusturuldu, islem_yapan)
        values (v_id, v_koc, d, 'tyt', (array['3D','Limit','Bilgi Sarmal'])[k + i % 2],
                case k when 1 then 'TYT Genel Deneme 3' else 'TYT Genel Deneme 4' end,
                (d::timestamp + interval '15 hours') at time zone 'Europe/Istanbul', v_id)
        returning id into v_deneme;
        for j in 1..9 loop
          v_q := tyt_q[j];
          v_r := least(0.97, greatest(0.05, v_net_hedef / 120 + (random() - 0.5) * 0.2));
          v_dogru := round(v_q * v_r); v_yanlis := round((v_q - v_dogru) * (0.3 + random() * 0.4));
          insert into public.deneme_sonuclari (deneme_id, ders_id, dogru, yanlis, bos)
          values (v_deneme, tyt_dersler[j], v_dogru, v_yanlis, v_q - v_dogru - v_yanlis);
        end loop;
      end loop;

      if v_tip in ('iyi', 'orta') then
        if v_alan = 'sayisal' then ayt_dersler := array[11,12,13,14]; ayt_q := array[40,14,13,13];
        elsif v_alan = 'esit_agirlik' then ayt_dersler := array[10,11,15,16]; ayt_q := array[24,40,10,6];
        else ayt_dersler := array[10,15,16]; ayt_q := array[24,10,6]; end if;
        insert into public.denemeler (ogrenci_id, koc_id, tarih, tur, yayin, ad, olusturuldu, islem_yapan)
        values (v_id, v_koc, date '2026-09-14', 'ayt', 'Limit', 'AYT Genel Deneme 2',
                (date '2026-09-14' + interval '15 hours') at time zone 'Europe/Istanbul', v_id)
        returning id into v_deneme;
        for j in 1..array_length(ayt_dersler, 1) loop
          v_q := ayt_q[j];
          v_r := least(0.95, greatest(0.05, (case v_tip when 'iyi' then 0.55 else 0.35 end) + (random() - 0.5) * 0.25));
          v_dogru := round(v_q * v_r); v_yanlis := round((v_q - v_dogru) * (0.3 + random() * 0.4));
          insert into public.deneme_sonuclari (deneme_id, ders_id, dogru, yanlis, bos)
          values (v_deneme, ayt_dersler[j], v_dogru, v_yanlis, v_q - v_dogru - v_yanlis);
        end loop;
      end if;
    end if;

    -- ── Konu ilerlemesi ──
    if v_tip <> 'yeni' then
      v_pending := i % 3 = 0;  -- her üç öğrenciden biri koç onayı bekliyor
      foreach v_ders in array v_dersler loop
        select count(*) into v_kcnt from public.konular where ders_id = v_ders;
        v_frac := case v_tip when 'iyi' then 0.35 + random() * 0.2 when 'orta' then 0.2 + random() * 0.15
                             when 'zayif' then 0.08 + random() * 0.1 else 0.15 + random() * 0.15 end;
        v_tamam := floor(v_kcnt * v_frac);
        k := 0;
        for v_konu in select kk.id from public.konular kk where kk.ders_id = v_ders order by kk.sira nulls last, kk.id loop
          k := k + 1;
          if k <= v_tamam then
            insert into public.konu_ilerleme (ogrenci_id, konu_id, durum, guncellendi, koc_onayi, onaylayan_id, onay_tarihi, islem_yapan)
            values (v_id, v_konu,
                    (case when v_tip in ('orta','zayif') and k = v_tamam - 1 then 'tekrar_gerekli' else 'tamamlandi' end)::public.ilerleme_durumu,
                    now() - (v_tamam - k + 1) * interval '1 day',
                    not (v_pending and k = v_tamam and v_ders = v_dersler[1]),
                    case when v_pending and k = v_tamam and v_ders = v_dersler[1] then null else v_koc end,
                    case when v_pending and k = v_tamam and v_ders = v_dersler[1] then null else now() - (v_tamam - k) * interval '1 day' end,
                    v_id);
          elsif k = v_tamam + 1 then
            insert into public.konu_ilerleme (ogrenci_id, konu_id, durum, guncellendi, koc_onayi, islem_yapan)
            values (v_id, v_konu, 'calisiliyor', now() - interval '1 day', false, v_id);
          else
            exit;
          end if;
        end loop;
      end loop;
    end if;

    -- ── Mesajlar: birkaç öğrenci koça yazmış, okunmamış ──
    if i in (2, 5, 11, 18, 22) then
      insert into public.mesajlar (gonderen_id, alici_id, ogrenci_id, icerik, okundu_mu, olusturuldu)
      values (v_koc, v_id, v_id, 'Bu hafta programı biraz hafiflettim, takıldığın yer olursa yaz.', true, now() - interval '3 days');
      insert into public.mesajlar (gonderen_id, alici_id, ogrenci_id, icerik, okundu_mu, olusturuldu)
      values (v_id, v_koc, v_id,
              (array['Hocam paragrafta süre yetmiyor, ne yapmalıyım?',
                     'Türev sorularında takıldım, yarın konuşabilir miyiz?',
                     'Denemede fen çok düşük geldi, moralim bozuk.',
                     'Bu hafta okulda sınavlar var, programı biraz azaltabilir miyiz?',
                     'Hocam birkaç gündür hastayım, geri dönünce devam edeceğim.'])[array_position(array[2,5,11,18,22], i)],
              false, now() - (array_position(array[2,5,11,18,22], i)) * interval '3 hours');
    end if;
  end loop;

  alter table public.gorevler enable trigger user;
  alter table public.calisma_oturumlari enable trigger user;
  alter table public.denemeler enable trigger user;
  alter table public.deneme_sonuclari enable trigger user;
  alter table public.konu_ilerleme enable trigger user;
  alter table public.mesajlar enable trigger user;
end
$seed$;
