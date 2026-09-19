-- Mesaj geri alma ve düzenleme (19 Eylül 2026; Supabase'de "mesaj_geri_al_duzenle" ve
-- "mesaj_geri_al_ayni_dakika" adlarıyla uygulandı; tam metinler veritabanında).
-- Karar (Bekir): gönderen kendi mesajını 24 saat içinde düzenleyebilir ya da geri alabilir.
--
-- mesajlar.geri_alindi, mesajlar.duzenlendi (timestamptz)
-- public.mesaj_geri_al(id)          içerik silinir, iz kalır ("Bu mesaj geri alındı"), okundu sayılır
-- public.mesaj_duzenle(id, metin)   içerik değişir, "düzenlendi" işareti
-- private.mesaj_bildirimini_duzelt  telefona giden bildirim: gitmediyse metni değişir/silinir;
--                                   gittiyse aynı satır yeniden gönderilir (aynı etiket → telefondaki
--                                   bildirimin metni "Mesaj geri alındı" ya da yeni metinle değişir).
--                                   Aynı dakikada giden mesajlar tek bildirimde birleştiği için
--                                   biri geri alınınca kalan son mesaj gösterilir.
-- private.mesaj_telegram_notu       Telegram kopyası silinemiyor; arkasından not düşülür
-- mesajlar_getir / mesaj_kutum      geriAlindi / duzenlendi alanları, önizlemede "Mesaj geri alındı"
alter table public.mesajlar
  add column if not exists geri_alindi timestamptz,
  add column if not exists duzenlendi timestamptz;
