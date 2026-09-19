-- DEMO VERİ — ikinci dalga (19 Eylül 2026): koçlar, veliler, ödemeler ve
-- kalan bütün modüller. demo-25-ogrenci.sql'in üstüne çalışır.
--
--   3 koç    koc1..koc3@demo.khkocluk.com (biri izinde), her birine 3 öğrenci
--            (demo26..demo34), son 7 gün + 3 gün görev
--   veliler  25 demo öğrencinin hepsine veli iletişim kaydı (veliler);
--            6'sına giriş yapabilen veli hesabı veli01..veli06@demo.khkocluk.com
--            + geçen haftanın yayınlanmış veli özeti
--   ödemeler bütün demo öğrencilere sözleşme + taksit; çoğu ilk taksiti
--            ödemiş, 6'sı gecikmiş, 2'si kısmi, 3'ü erken ödemiş, 2'si peşin
--   ayrıca   görüşme talepleri, blok talepleri (ek süre / mazeret / kaçırıldı),
--            deneme analizi taslakları, gelen kutusu bildirimleri, başvurular,
--            koç notları, rutinler, günlük soru kayıtları, veli mesajları
-- Bütün şifreler Demo2026!ux.
--
-- TEMİZLİK: demo-25-ogrenci.sql'deki satırlar + 
--   delete from public.basvurular where telefon like '555000%';

do $seed2$
declare
  v_kivanc uuid := 'a210568a-1ae6-4c6c-92cc-b734702d6379';
  v_bugun date := date '2026-09-19';
  koc_ad text[] := array['Ahmet Yıldırım','Gizem Aras','Serkan Uysal'];
  a_brans text[] := array['Matematik','Türkçe · Edebiyat','Fen bilimleri'];
  a_durum text[] := array['aktif','aktif','izinde'];
  a_kap int[] := array[20,15,10];
  yeni_ad text[] := array['Tuna Er','Asya Kara','Alp Demirci','Lina Yurt','Deniz Oral','Ada Sezer','Poyraz Kalkan','Eylül Çınar','Umut Başaran'];
  veli_ad text[] := array['Fatma','Ali','Hülya','Murat','Gül','Hakan','Sevgi','Osman','Aylin','Kemal','Nur','Cem','Derya','Levent','Serap','Volkan','Pınar','Erkan','Songül','Tarık','Esra','Barış','Gamze','Orhan','Filiz'];
  i int; j int; k int; n int;
  v_koc uuid; v_id uuid; v_p numeric; v_ders int; v_konu int; v_konu_ad text; v_done boolean; v_zaman timestamptz;
  d date; v_ogr record; v_soz bigint; v_taksit bigint; v_plan int; v_tutar numeric; v_say int;
  v_gorev bigint; v_veli uuid; v_deneme bigint;
  dersler int[] := array[2,1,3,4,7,8,10,11];
begin
  perform setseed(0.777);
  alter table public.gorevler disable trigger user;
  alter table public.calisma_oturumlari disable trigger user;
  alter table public.mesajlar disable trigger user;
  alter table public.profiller disable trigger user;
  alter table public.blok_talepleri disable trigger user;
  alter table public.gorusme_talepleri disable trigger user;
  alter table public.basvurular disable trigger user;
  alter table public.veli_haftalik_ozet disable trigger user;
  alter table public.deneme_analizleri disable trigger user;
  alter table public.rutin_kayit disable trigger user;
  alter table public.soru_kayitlari disable trigger user;
  alter table public.sozlesmeler disable trigger user;
  alter table public.veliler disable trigger user;

  -- ── Koçlar ve öğrencileri ──
  for i in 1..3 loop
    v_koc := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current,
      phone_change, phone_change_token, reauthentication_token, is_sso_user, is_anonymous)
    values ('00000000-0000-0000-0000-000000000000', v_koc, 'authenticated', 'authenticated',
      'koc' || i || '@demo.khkocluk.com', extensions.crypt('Demo2026!ux', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('rol', 'koc', 'ad_soyad', koc_ad[i]),
      now() - interval '100 days', now(), '', '', '', '', '', '', '', '', false, false);
    update public.profiller set koc_durum = a_durum[i], kapasite = a_kap[i], brans = a_brans[i],
      baslangic_tarihi = date '2026-06-01' + (i * 20), telefon = '+90 555 000 01 0' || i,
      ic_not = case when i = 3 then 'Ekim sonuna kadar izinde; öğrencileri geçici olarak aktarılacak.' else null end
    where id = v_koc;

    for j in 1..3 loop
      v_id := gen_random_uuid();
      k := (i - 1) * 3 + j;
      insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current,
        phone_change, phone_change_token, reauthentication_token, is_sso_user, is_anonymous)
      values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
        'demo' || (25 + k) || '@demo.khkocluk.com', extensions.crypt('Demo2026!ux', extensions.gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('rol', 'ogrenci', 'ad_soyad', yeni_ad[k]),
        now() - interval '40 days', now(), '', '', '', '', '', '', '', '', false, false);
      insert into public.ogrenciler (id, koc_id, alan, sinif, katalog_id, kayit_tarihi, aktif, hedef_tyt_net, haftalik_calisma_hedefi_dk)
      values (v_id, v_koc, (case when j = 2 then 'esit_agirlik' else 'sayisal' end)::public.alan_turu, 12, 1, v_bugun - 40, true, 80, 900);
      if j = 1 then v_p := 0.9; elsif j = 2 then v_p := 0.6; else v_p := 0.3; end if;
      for d in select generate_series(v_bugun - 7, v_bugun + 3, interval '1 day')::date loop
        n := 2 + floor(random() * 2)::int;
        for k in 1..n loop
          v_ders := dersler[1 + ((d - v_bugun + 20) * 3 + k + j) % 8];
          select kk.id, kk.ad into v_konu, v_konu_ad from public.konular kk where kk.ders_id = v_ders
            order by kk.sira nulls last, kk.id offset ((d - v_bugun + 7) / 2 + k) limit 1;
          v_done := d < v_bugun and random() < v_p;
          v_zaman := (d::timestamp + interval '17 hours' + k * interval '1 hour') at time zone 'Europe/Istanbul';
          insert into public.gorevler (ogrenci_id, koc_id, tarih, ders_id, konu_id, tur, baslik, durum, olusturuldu, guncellendi, islem_yapan)
          values (v_id, v_koc, d, v_ders, v_konu, (case when k = 1 then 'soru_cozumu' else 'konu_anlatimi' end)::public.gorev_turu,
                  (case when k = 1 then 'Soru çözümü — ' else 'Konu çalışması — ' end) || v_konu_ad,
                  (case when v_done then 'tamamlandi' else 'bekliyor' end)::public.gorev_durumu,
                  least(d, v_bugun)::timestamp - interval '2 days',
                  (case when v_done then v_zaman else least(d, v_bugun)::timestamp - interval '2 days' end), v_koc);
          if v_done then
            insert into public.calisma_oturumlari (ogrenci_id, ders_id, konu_id, baslangic, sure_dk, kaynak, olusturuldu, islem_yapan)
            values (v_id, v_ders, v_konu, v_zaman - interval '45 minutes', 45, 'sayac', v_zaman, v_id);
          end if;
        end loop;
      end loop;
    end loop;
  end loop;

  -- ── Veliler: iletişim kaydı herkese, giriş hesabı altı öğrenciye ──
  i := 0;
  for v_ogr in select u.id, u.email, p.ad_soyad from auth.users u join public.profiller p on p.id = u.id
               where u.email ~ '^demo(0[1-9]|1[0-9]|2[0-5])@' order by u.email loop
    i := i + 1;
    insert into public.veliler (ogrenci_id, ad_soyad, telefon, iliski, sms_izni, izin_zamani, izin_kanali, izin_metni, aktif)
    values (v_ogr.id, veli_ad[i] || ' ' || split_part(v_ogr.ad_soyad, ' ', 2), '+90555000' || lpad((1000 + i)::text, 4, '0'),
            (case when i % 2 = 0 then 'baba' else 'anne' end)::public.veli_iliskisi,
            i % 5 <> 0, case when i % 5 <> 0 then now() - interval '20 days' end,
            case when i % 5 <> 0 then 'sozlesme' end, case when i % 5 <> 0 then 'Kayıt sözleşmesinde onaylandı.' end, true);
    if i <= 6 then
      v_veli := gen_random_uuid();
      insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current,
        phone_change, phone_change_token, reauthentication_token, is_sso_user, is_anonymous)
      values ('00000000-0000-0000-0000-000000000000', v_veli, 'authenticated', 'authenticated',
        'veli0' || i || '@demo.khkocluk.com', extensions.crypt('Demo2026!ux', extensions.gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('rol', 'veli', 'ad_soyad', veli_ad[i] || ' ' || split_part(v_ogr.ad_soyad, ' ', 2)),
        now() - interval '25 days', now(), '', '', '', '', '', '', '', '', false, false);
      insert into public.veli_ogrenci (veli_id, ogrenci_id, iliski)
      values (v_veli, v_ogr.id, (case when i % 2 = 0 then 'baba' else 'anne' end)::public.veli_iliskisi);
      insert into public.veli_haftalik_ozet (ogrenci_id, hafta_baslangic, devam_yuzdesi, toplam_dakika, trend, koc_yorumu, yayinlandi, yayin_zamani, yaklasan_deneme)
      values (v_ogr.id, date '2026-09-07', 60 + i * 5, 600 + i * 90,
              (array['yukseliyor','sabit','dusuyor'])[1 + i % 3]::public.ozet_trendi,
              (array['Bu hafta düzenli çalıştı, matematikte belirgin ilerleme var.',
                     'Tempo iyi, paragraf hızını artırmak için ek çalışma koyduk.',
                     'Hafta ortasında biraz aksadı; birlikte programı hafiflettik.'])[1 + i % 3],
              true, date '2026-09-13' + interval '20 hours', date '2026-09-27');
      if i in (2, 5) then
        insert into public.mesajlar (gonderen_id, alici_id, ogrenci_id, icerik, okundu_mu, olusturuldu)
        values (v_veli, v_kivanc, v_ogr.id,
                case i when 2 then 'Merhaba hocam, oğlumun deneme sonucu hakkında konuşabilir miyiz?'
                       else 'Kızım bu hafta çok yoruldu, programı biraz hafifletebilir misiniz?' end,
                false, now() - i * interval '2 hours');
      end if;
    end if;
  end loop;

  -- ── Ödemeler: sözleşme + taksit + tahsilat ──
  i := 0;
  for v_ogr in select o.id, o.koc_id, u.email from public.ogrenciler o join auth.users u on u.id = o.id
               where u.email like 'demo%@demo.khkocluk.com' order by u.email loop
    i := i + 1;
    -- plan 1: 10 taksit, 2: 5 taksit, 3: peşin
    if i in (4, 17) then v_plan := 3; elsif i % 4 = 0 then v_plan := 2; else v_plan := 1; end if;
    if v_plan = 1 then v_tutar := 36000; v_say := 10; elsif v_plan = 2 then v_tutar := 34000; v_say := 5; else v_tutar := 32000; v_say := 1; end if;
    insert into public.sozlesmeler (ogrenci_id, koc_id, baslik, baslangic, bitis, toplam_tutar, durum, aciklama, olusturan, olusturuldu)
    values (v_ogr.id, v_ogr.koc_id, 'YKS Koçluk · 2026–2027', date '2026-09-01', date '2027-06-30', v_tutar, 'aktif',
            case v_plan when 1 then '10 aylık taksit' when 2 then '5 taksit, %5 indirimli' else 'Peşin, %11 indirimli' end,
            v_ogr.koc_id, date '2026-08-28')
    returning id into v_soz;
    for j in 1..v_say loop
      insert into public.taksitler (sozlesme_id, sira, vade, tutar)
      values (v_soz, j, (date '2026-09-05' + ((j - 1) * (case v_plan when 2 then 2 else 1 end)) * interval '1 month')::date, round(v_tutar / v_say))
      returning id into v_taksit;
      if j = 1 then
        if i in (19, 20, 22, 23, 24, 34) then
          null;  -- gecikmiş: ilk taksit ödenmedi
        elsif i in (12, 29) then
          insert into public.tahsilatlar (taksit_id, tutar, tarih, yontem, makbuz_no, not_metni, kaydeden)
          values (v_taksit, 2000, date '2026-09-08', 'nakit', 'M-2026-' || lpad((100 + i)::text, 4, '0'), 'Kalanı ay sonunda', v_ogr.koc_id);
        else
          insert into public.tahsilatlar (taksit_id, tutar, tarih, yontem, makbuz_no, kaydeden)
          values (v_taksit, round(v_tutar / v_say), date '2026-09-02' + (i % 6),
                  (array['havale','kredi_karti','odeme_linki','nakit'])[1 + i % 4]::public.odeme_yontemi,
                  'M-2026-' || lpad((100 + i)::text, 4, '0'), v_ogr.koc_id);
        end if;
      elsif j = 2 and i in (1, 7, 13) then
        insert into public.tahsilatlar (taksit_id, tutar, tarih, yontem, makbuz_no, not_metni, kaydeden)
        values (v_taksit, round(v_tutar / v_say), date '2026-09-15', 'havale', 'M-2026-' || lpad((200 + i)::text, 4, '0'), 'Erken ödeme', v_ogr.koc_id);
      end if;
    end loop;
  end loop;

  -- ── Görüşme talepleri ──
  insert into public.gorusme_talepleri (ogrenci_id, koc_id, durum, aciliyet, not_metni, olusturuldu, guncellendi)
  select o.id, o.koc_id, 'talep', 'bugun', 'Denemeden sonra moralim çok bozuk, konuşabilir miyiz?', now() - interval '2 hours', now() - interval '2 hours'
    from public.ogrenciler o join auth.users u on u.id = o.id where u.email = 'demo18@demo.khkocluk.com';
  insert into public.gorusme_talepleri (ogrenci_id, koc_id, durum, aciliyet, not_metni, olusturuldu, guncellendi)
  select o.id, o.koc_id, 'talep', 'bu_hafta', 'Tercih listesi hakkında konuşmak istiyorum.', now() - interval '1 day', now() - interval '1 day'
    from public.ogrenciler o join auth.users u on u.id = o.id where u.email = 'demo03@demo.khkocluk.com';
  insert into public.gorusme_talepleri (ogrenci_id, koc_id, durum, aciliyet, not_metni, kapanis, kapanis_tarihi, karar_veren, olusturuldu, guncellendi)
  select o.id, o.koc_id, 'tamamlandi', 'bu_hafta', 'Program çok yoğun geliyor.', 'telefon', now() - interval '4 days', o.koc_id, now() - interval '6 days', now() - interval '4 days'
    from public.ogrenciler o join auth.users u on u.id = o.id where u.email = 'demo12@demo.khkocluk.com';

  -- ── Blok talepleri: bugün saatli görev + ek süre / mazeret / kaçırıldı ──
  k := 0;
  for v_ogr in select o.id, o.koc_id, u.email from public.ogrenciler o join auth.users u on u.id = o.id
               where u.email in ('demo10@demo.khkocluk.com','demo14@demo.khkocluk.com','demo17@demo.khkocluk.com') order by u.email loop
    k := k + 1;
    select kk.id, kk.ad into v_konu, v_konu_ad from public.konular kk where kk.ders_id = 2 order by kk.sira offset 5 + k limit 1;
    insert into public.gorevler (ogrenci_id, koc_id, tarih, ders_id, konu_id, tur, baslik, hedef_adet, durum, baslangic_saat, bitis_saat, olusturuldu, guncellendi, islem_yapan)
    values (v_ogr.id, v_ogr.koc_id, v_bugun, 2, v_konu, 'soru_cozumu', 'Soru çözümü — ' || v_konu_ad, 30, 'bekliyor',
            (time '08:00' + k * interval '30 minutes'), (time '09:00' + k * interval '30 minutes'), now() - interval '1 day', now() - interval '1 day', v_ogr.koc_id)
    returning id into v_gorev;
    insert into public.blok_talepleri (gorev_id, ogrenci_id, koc_id, tur, durum, mesaj, ek_dk, olusturuldu)
    values (v_gorev, v_ogr.id, v_ogr.koc_id, (array['ek_sure','mazeret','kacirildi'])[k]::public.blok_talep_turu, 'bekliyor',
            (array['Sorular uzun sürdü, yarım saat daha lazım.','Okuldan geç çıktım, akşam telafi edeceğim.', null])[k],
            case when k = 1 then 30 end, now() - (60 - k * 10) * interval '1 minute');
  end loop;

  -- ── Gelen kutusu bildirimleri (öğrenciler) ──
  insert into public.bildirim_kuyrugu (alici_id, tip, baslik, govde, yol, durum, gonderildi, olusturuldu, okundu_mu)
  select u.id, x.tip, x.baslik, x.govde, '/', 'gonderildi', now() - x.once, now() - x.once, false
    from auth.users u
    cross join (values ('program', 'Programın güncellendi', 'Koçun yarına 2 iş ekledi.', interval '3 hours'),
                       ('kaynak', 'Yeni kaynak', 'TYT Tarih 3 Kademeli Soru Bankası kütüphanene eklendi.', interval '1 day')) x(tip, baslik, govde, once)
   where u.email in ('demo01@demo.khkocluk.com','demo02@demo.khkocluk.com','demo05@demo.khkocluk.com','demo11@demo.khkocluk.com','demo.ogrenci@khkocluk.com');

  -- ── Başvurular (Yönetim → İletişim) ──
  insert into public.basvurular (hizmet, ad_soyad, telefon, dolduran, sinav, sinif, arama_zamani, not_metni, kvkk_onay, durum, arandi_zaman, sonuc_notu, olusturuldu)
  values ('kocluk','Sibel Aktaş','5550000201','veli','YKS','12','hafta_ici_aksam','Oğlum sayısalcı, matematik zayıf.', now() - interval '5 hours','yeni',null,null, now() - interval '5 hours'),
         ('kocluk','Mert Güler','5550000202','ogrenci','YKS','mezun','hafta_sonu',null, now() - interval '1 day','yeni',null,null, now() - interval '1 day'),
         ('kocluk','Hande Yücel','5550000203','veli','LGS','8','hafta_ici_gunduz','LGS için destek arıyoruz.', now() - interval '3 days','arandi', now() - interval '2 days','Hafta sonu tekrar aranacak.', now() - interval '3 days'),
         ('kocluk','Cenk Tuna','5550000204','ogrenci','YKS','11','hafta_ici_aksam',null, now() - interval '6 days','kayit_oldu', now() - interval '5 days','Kayıt tamam, Ekim başı başlıyor.', now() - interval '6 days'),
         ('danismanlik','Leyla Soylu','5550000205','veli','YKS','12','hafta_ici_gunduz','Sınav kaygısı var.', now() - interval '8 days','olmadi', now() - interval '7 days','Fiyat uygun gelmedi.', now() - interval '8 days'),
         ('kocluk','Kaya Işık','5550000206','ogrenci','YKS','12','hafta_sonu',null, now() - interval '12 days','kapandi', now() - interval '11 days','Ulaşılamadı, üç deneme.', now() - interval '12 days');

  -- ── Koç notları ──
  insert into public.koc_notlari (ogrenci_id, koc_id, icerik, gorunurluk, olusturuldu)
  select o.id, o.koc_id, x.icerik, x.g::public.not_gorunurlugu, now() - x.once
    from public.ogrenciler o join auth.users u on u.id = o.id
    join (values ('demo01@demo.khkocluk.com','Tempo çok iyi; AYT''ye ağırlık verme zamanı.','sadece_koc', interval '2 days'),
                 ('demo10@demo.khkocluk.com','Geometri ağırlıklı haftaya geçtik, üçgenler tekrar.','ogrenci', interval '3 days'),
                 ('demo17@demo.khkocluk.com','Ailesiyle görüşüldü, okul sınav haftası.','sadece_koc', interval '1 day'),
                 ('demo21@demo.khkocluk.com','Hastalık nedeniyle ara verdi, dönünce programı yeniden kuracağız.','veli', interval '4 days'),
                 ('demo05@demo.khkocluk.com','Paragrafta hız sorunu, günlük 20 soru rutini eklendi.','ogrenci', interval '6 days')) x(eposta, icerik, g, once)
      on x.eposta = u.email;

  -- ── Rutinler ve günlük soru kayıtları ──
  for v_ogr in select o.id from public.ogrenciler o join auth.users u on u.id = o.id
               where u.email ~ '^demo(0[1-9]|1[0-6])@' order by u.email loop
    insert into public.rutinler (ogrenci_id, ad, sira, aktif) values (v_ogr.id, 'Paragraf · 20 soru', 1, true) returning id into v_gorev;
    for d in select generate_series(v_bugun - 7, v_bugun - 1, interval '1 day')::date loop
      if random() < 0.7 then
        insert into public.rutin_kayit (rutin_id, ogrenci_id, tarih, isaretlendi, islem_yapan)
        values (v_gorev, v_ogr.id, d, (d::timestamp + interval '21 hours') at time zone 'Europe/Istanbul', v_ogr.id);
      end if;
      insert into public.soru_kayitlari (ogrenci_id, tarih, ders_id, dogru, yanlis, bos, islem_yapan)
      values (v_ogr.id, d, 2, 15 + floor(random() * 15)::int, floor(random() * 8)::int, floor(random() * 5)::int, v_ogr.id),
             (v_ogr.id, d, 1, 20 + floor(random() * 15)::int, floor(random() * 6)::int, floor(random() * 4)::int, v_ogr.id);
    end loop;
    insert into public.rutinler (ogrenci_id, ad, sira, aktif) values (v_ogr.id, 'Problem · 15 soru', 2, true);
  end loop;

  -- ── Deneme analizi taslakları (koçun kuyruğunda) ──
  for v_deneme in select distinct on (d2.ogrenci_id) d2.id from public.denemeler d2 join auth.users u on u.id = d2.ogrenci_id
                  where u.email in ('demo02@demo.khkocluk.com','demo11@demo.khkocluk.com','demo17@demo.khkocluk.com','demo18@demo.khkocluk.com')
                    and d2.tur = 'tyt' order by d2.ogrenci_id, d2.tarih desc loop
    perform private.deneme_analizi_uret(v_deneme);
  end loop;
  alter table public.gorevler enable trigger user;
  alter table public.basvurular enable trigger user;
  alter table public.veli_haftalik_ozet enable trigger user;
  alter table public.deneme_analizleri enable trigger user;
  alter table public.rutin_kayit enable trigger user;
  alter table public.soru_kayitlari enable trigger user;
  alter table public.sozlesmeler enable trigger user;
  alter table public.veliler enable trigger user;
  alter table public.calisma_oturumlari enable trigger user;
  alter table public.mesajlar enable trigger user;
  alter table public.profiller enable trigger user;
  alter table public.blok_talepleri enable trigger user;
  alter table public.gorusme_talepleri enable trigger user;

end
$seed2$;
