# kullanici-olustur

Öğrenci, veli ve koç hesaplarını açar.

Hesap açmak Supabase'in `service_role` anahtarını gerektirir. O anahtar veritabanının
tamamına sınırsız erişim verdiği için tarayıcıya konulamaz. Bu yüzden işlem sunucu
tarafında, bu fonksiyonun içinde yapılır; anahtar Supabase'in ortam değişkeni olarak
durur ve istemciye hiç ulaşmaz.

## Rol yetkisi kademeli

| Açılan hesap | Kim açabilir |
|---|---|
| `ogrenci` | koç, yönetici |
| `veli` | koç (kendi öğrencisine), yönetici (herkese) |
| `koc` | **yalnızca yönetici** |

Koç, koç işe alamaz. İşe alma kurumun işi, koçun değil. Kural burada duruyor
çünkü istemcinin söylediğine değil, veritabanından okunan role bakılıyor.

Koç için ayrı bir tablo yok: koç kaydı profilin kendisi. Öğrenciler
`ogrenciler.koc_id` ile bağlanıyor; ayrı bir `koclar` tablosu profillerin
kopyası olurdu.

## Akış

1. Çağıranın oturum jetonu doğrulanır.
2. Rolü **veritabanından** okunur (istekten değil); koç veya yönetici değilse 403.
3. Koç hesabı açılıyorsa çağıranın yönetici olduğu ayrıca kontrol edilir.
4. Veli hesabı açılıyorsa hedef öğrencinin erişilebilir olduğu kontrol edilir.
5. Rastgele geçici şifre üretilir, hesap açılır, `sifre_degistirmeli` işaretlenir.
6. Profil veya öğrenci kaydı yazılamazsa auth kullanıcısı geri alınır (yarım kayıt kalmaz).

Yanıt geçici şifreyi bir kez döndürür; saklanmaz.

## Sürüm sabitleme — dikkat

`supabase-js` sürümü **sabit** (`jsr:@supabase/supabase-js@2.49.4`). Önce `@2`
yazıyordu; fonksiyon yeniden yayınlandığında JSR daha yeni bir sürüm çekti ve
admin istemcisi üzerinden `auth.getUser(jeton)` çağrısı `Auth session missing`
vermeye başladı. Kod değişmediği hâlde davranış değişti.

Çağıranın kimliği artık belgelenen yöntemle doğrulanıyor: jeton `Authorization`
başlığıyla ayrı bir istemciye veriliyor, `getUser()` argümansız çağrılıyor. Eski
biçim yedek olarak duruyor.

Sürümü yükseltirken bu iki noktayı yeniden test edin.

## Yayınlama

Fonksiyon Supabase üzerinde yayınlanır, Cloudflare derlemesine dahil değildir.
Kaynak burada sürüm kontrolü için tutulur.
