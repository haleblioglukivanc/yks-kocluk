# kullanici-olustur

Öğrenci ve veli hesaplarını koç adına açar.

Hesap açmak Supabase'in `service_role` anahtarını gerektirir. O anahtar veritabanının
tamamına sınırsız erişim verdiği için tarayıcıya konulamaz. Bu yüzden işlem sunucu
tarafında, bu fonksiyonun içinde yapılır; anahtar Supabase'in ortam değişkeni olarak
durur ve istemciye hiç ulaşmaz.

## Akış

1. Çağıranın oturum jetonu doğrulanır.
2. Rolü **veritabanından** okunur (istekten değil); koç veya yönetici değilse 403.
3. Veli hesabı açılıyorsa hedef öğrencinin gerçekten o koça ait olduğu kontrol edilir.
4. Rastgele geçici şifre üretilir, hesap açılır, `sifre_degistirmeli` işaretlenir.
5. Profil veya öğrenci kaydı yazılamazsa auth kullanıcısı geri alınır (yarım kayıt kalmaz).

Yanıt geçici şifreyi bir kez döndürür; saklanmaz.

## Yayınlama

Fonksiyon Supabase üzerinde yayınlanır, Cloudflare derlemesine dahil değildir.
Kaynak burada sürüm kontrolü için tutulur.
