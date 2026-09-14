# kullanici-sil

Öğrenci, veli veya koç hesabını **kalıcı olarak** siler.

Silmek de hesap açmak gibi `service_role` anahtarını gerektirir; o anahtar
tarayıcıya konulamaz. Bu yüzden işlem sunucu tarafında yapılır.

## Rol yetkisi kademeli

| Silinen hesap | Kim silebilir |
|---|---|
| `ogrenci` | koç (yalnızca kendi öğrencisi), yönetici |
| `veli` | koç (kendi öğrencisinin velisi), yönetici |
| `koc` / `yonetici` | **yalnızca yönetici** |

Kimse kendi hesabını silemez.

## Akış

1. Çağıranın oturum jetonu doğrulanır, rolü **veritabanından** okunur.
2. Hedefin rolüne göre yetki kademesi uygulanır.
3. Öğrenci siliniyorsa yalnızca ona bağlı veliler toplanır; başka öğrencisi
   olan veli bırakılır.
4. Fotoğraflar `ogrenci-foto` kovasından silinir — depolama zincirlemeye dahil
   değildir.
5. Karar kuyruğundaki ertelemeler temizlenir (`kaynak_id` önek eşleşmesi).
6. `profiller` satırı silinir; zincirleme (CASCADE) görev, deneme, konu
   ilerlemesi, skor, rozet, seri, mesaj ve rapor kayıtlarını alır.
7. En son `auth.users` kaydı silinir. Sıra tersi olsaydı auth'suz yetim bir
   profil kalabilirdi.

## Sürüm sabitleme

`supabase-js` sürümü sabit (`jsr:@supabase/supabase-js@2.49.4`), gerekçesi
`kullanici-olustur` README'sinde yazıyor. Yükseltirken orada anlatılan iki
noktayı yeniden test edin.

## Yayınlama

Fonksiyon Supabase üzerinde yayınlanır, Cloudflare derlemesine dahil değildir.
