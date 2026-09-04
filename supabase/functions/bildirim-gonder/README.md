# bildirim-gonder

Anlık bildirim (web push) kuyruğunu boşaltır. Kod Supabase'de; bu klasör yalnız belge.

## Akış
1. Uygulama, izin alınca cihazı `bildirim_abonelikleri`ne yazar (kişi kendi satırını görür, RLS).
2. Olaylar `private.bildirim_ekle` ile `bildirim_kuyrugu`na düşer. Cihazı olmayan kişi için satır
   açılmaz. 22:00–08:00 arası planlanan bildirim sabaha kayar. `tekil_anahtar` aynıysa üstüne yazılır.
3. `bildirim-kuyrugu-bosalt` cron'u (her dakika, `private.bildirim_gondericiyi_durt()`) bekleyen
   varsa bu fonksiyonu çağırır. Kuyruk boşsa istek atılmaz.
4. Fonksiyon her satır için kişinin tüm cihazlarına gönderir; 404/410 dönen cihaz silinir.
   3 denemede gitmeyen satır `sistem_gunlugu`ne düşer, yönetici panelinde görünür.

## Tetikleyiciler
| Olay | Kime | Metin |
|---|---|---|
| `mesajlar` insert | alıcı | gönderenin adıyla, mesajın ilk 140 karakteri |
| `deneme_analizleri` taslak | koç | birleşik: "N onay bekliyor. Son gelen: …" (10 dk toplanır) |
| `deneme_analizleri` onaylandı | öğrenci | koçun adıyla "Deneme analizini onayladım…" |
| `konu_ilerleme` tamamlandı (onaysız) | koç | birleşik, yukarıdakiyle aynı satır |
| `veli_haftalik_ozet` yayınlandı | veliler | "…'in haftalık özeti hazır." |
| cron 20:00 | görevi açık öğrenci | Kâmil: "Bugünün görevi hâlâ açık." (günde 1) |
| cron 09:00 | koç | "X 3 gündür sessiz." (öğrenci başına haftada 1) |

Kâmil'in kutlama/aşınma olayları bildirime girmez; ekranda kalır.

## Anahtarlar
VAPID çifti Vault'ta: `vapid_genel`, `vapid_ozel`. Genel anahtar `bildirim_genel_anahtar()` ile
herkese açık; özel anahtar yalnız servis rolüne (`bildirim_vapid_al`). Anahtar değişirse bütün
cihazlar yeniden izin vermek zorunda kalır — değiştirme.

## iPhone notu
Push yalnız ana ekrana eklenmiş uygulamada çalışır (iOS 16.4+). Uygulama bunu kendisi anlatır
(`BildirimIzni`); Hesap yaprağındaki anahtar da aynı uyarıyı verir.
