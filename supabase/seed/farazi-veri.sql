-- FARAZİ (DEMO) VERİ — 12 Eylül 2026
--
-- Beş öğrencinin sayfaları örnek veriyle dolduruldu. Amaç uygulamayı
-- dolu halde görmek; bu veri gerçek öğrenci kaydı değil.
--
-- Ne eklendi:
--   gorevler            ~675 satır  · geçen hafta + bu hafta + önümüzdeki
--                                     iki hafta, 6 periyotluk ızgara
--   rutinler            ~270 satır  · Geometri (20 soru), Paragraf (20),
--                                     Problem (15); gorevler tablosunda
--                                     periyot = null
--   kaynak eşleşmesi                · her öğrenci-ders çifti için iki kitap,
--                                     görevlere kaynak_id + kaynak_aralik
--                                     olarak iliştirildi
--   denemeler           15 satır    · öğrenci başına 2 TYT + 1 AYT,
--                                     deneme_sonuclari ders ders,
--                                     deneme_hatalari konu konu
--   konu_ilerleme       ~785 satır  · derse göre %20–55 bitmiş, her derste
--                                     son iki konu koç onayı bekliyor,
--                                     bir konu çalışılıyor, bazılarında
--                                     tekrar gerekiyor
--
-- Üretim mantığı kural tabanlıydı (tarih ve ders id'lerinden türeyen
-- rotasyon), rastgele değil: aynı betik tekrar çalıştırılırsa aynı veri
-- çıkar. Koç onayları auth.uid() gerektirdiği için koçun kimliğiyle
-- verildi (private.konu_onayi_koru trigger'ı bunu zorunlu kılıyor).
--
-- ───────────────────────────────────────────────────────────────────
-- TEMİZLİK: gerçek kullanıma geçerken farazi veriyi silmek için.
-- Sıra önemli: çocuk tablolar önce.
-- ───────────────────────────────────────────────────────────────────

-- delete from public.deneme_hatalari
-- where deneme_id in (select id from public.denemeler
--                     where ad in ('TYT Genel Deneme 12', 'TYT Simülasyon Deneme 4',
--                                  'AYT Genel Deneme 6'));

-- delete from public.deneme_sonuclari
-- where deneme_id in (select id from public.denemeler
--                     where ad in ('TYT Genel Deneme 12', 'TYT Simülasyon Deneme 4',
--                                  'AYT Genel Deneme 6'));

-- delete from public.denemeler
-- where ad in ('TYT Genel Deneme 12', 'TYT Simülasyon Deneme 4', 'AYT Genel Deneme 6');

-- delete from public.gorevler
-- where olusturuldu::date = date '2026-09-12';

-- delete from public.konu_ilerleme
-- where ogrenci_id in (select id from public.ogrenciler);

-- Kaynak kütüphanesi (kaynaklar tablosu) farazi değil, kalmalı.
