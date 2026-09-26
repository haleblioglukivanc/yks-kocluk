# YKS Koçluk

Tek koç, çok öğrenci. Program, deneme takibi ve konu ilerlemesi tek yerde.

## Teknoloji

| Katman   | Seçim                                  |
| -------- | -------------------------------------- |
| Arayüz   | Vite + React 19, `vite-plugin-pwa`     |
| Veri     | Supabase (Auth, Postgres, RLS, Storage) |
| Yayın    | Cloudflare Workers (statik varlıklar)   |

Uygulama statik bir SPA olarak derlenir. Sunucu tarafı kod yoktur; tüm veri erişimi
Supabase üzerinden, RLS politikalarıyla korunarak yapılır.

## Kurulum

```bash
npm install
cp .env.example .env   # değerleri doldurun
npm run dev
```

## Ortam değişkenleri

`.env` dosyası depoya gönderilmez. Gereken değişkenler `.env.example` içinde listelidir.

- `VITE_SUPABASE_URL` — proje adresi
- `VITE_SUPABASE_ANON_KEY` — anon (publishable) anahtar

`service_role` anahtarı istemci tarafında kullanılmaz ve hiçbir koşulda depoya girmez.
`VITE_` önekli her değişken derlenmiş pakete gömülür ve tarayıcıdan okunabilir.

## Yayın

Cloudflare Workers, bu depoya bağlıdır. `main` dalına yapılan her push otomatik olarak
derlenir ve yayınlanır.

| Ayar            | Değer           |
| --------------- | --------------- |
| Derleme komutu  | `npm run build` |
| Çıktı dizini    | `dist`          |
| Yayın komutu    | `npx wrangler deploy` |

SPA yönlendirmesi `wrangler.jsonc` içindeki `not_found_handling: "single-page-application"`
ayarıyla sağlanır; bilinmeyen yollar `index.html` döner.

## Sayfalar

| Yol | İçerik |
| --- | --- |
| `/` | Tanıtım sayfası (giriş yapılmamışsa) |
| `/giris` | Giriş formu |
| `/` | Panel (giriş yapılmışsa, role göre) |

Tanıtım sayfasının bütün metinleri `src/icerik/site.js` dosyasındadır.

### Belgeler (sertifikalar)

Tanıtım sayfasındaki "Aldığım eğitimler" bölümü `src/icerik/site.js` içindeki
`belgeler.alanlar` dizisinden çizilir. Belgeler alanlara ayrılır (psikolojik
yaklaşım, aile ve iletişim, eğitim ve öğretim); Çarşamba ve Veli bölümleri ilgili
alana bağlanır, Koç bölümü toplam belge ve saati kendisi hesaplar.

Yeni belge eklemek:

1. PDF'i depo dışındaki bir klasöre koyun (orijinaller depoya **girmez**).
2. `python belge-uret/maskele.py <klasör>` çalıştırın. Betik TC kimlik no,
   anne/baba adı, "İbrahim" ön adı ve karekodu (içinde TC var) metin
   katmanından siler, `public/belgeler/<ad>.jpg` ve `<ad>-kucuk.jpg` üretir,
   sonunda çıktıda kişisel veri kalıp kalmadığını denetler.
   Gerekenler: `pip install pymupdf opencv-python-headless`.
3. Yeni dosya adını `maskele.py` içindeki `ADLAR` sözlüğüne ekleyin.
4. `site.js`'te ilgili alanın `liste`sine `{ ad, kisa, kurum, yil, saat, gorsel }` ekleyin.

Terapi eğitimleri "uygulayıcı eğitimi" sertifikasıdır, terapist unvanı vermez.
Sayfada terapi hizmeti vaat edilmez; yalnız bakış açısı ve yöntemden söz edilir.

Belge görselleri service worker ön belleğine alınmaz, böylece uygulamayı
kuranlar gereksiz veri indirmez.

### Yayın öncesi kontrol listesi

`site.js` içinde `[DEMO]` ve `[DOLDURULACAK]` araması yapın. Kalan yoksa hazırdır.
Özellikle `yorumlar.liste` gerçek değilse boşaltın (`[]`) — uydurma referans
gerçek bir kişinin adı altında yayınlanmamalı.

## Roller

| Rol | Yetki |
| --- | --- |
| Koç | Kendi öğrencilerini yönetir, program yazar, davet kodu üretir |
| Öğrenci | Kendi görevlerini işaretler, ilerlemesini görür |
| Veli | Çocuğunun verisini yalnızca görüntüler |

Bir koç, veritabanı seviyesinde başka koçun verisine erişemez. Yetkilendirme
uygulama kodunda değil, RLS politikalarında tanımlıdır.

## Hesap açma akışı

Siteden kendi kendine kayıt olunamaz. Bütün hesapları koç açar.

1. Koç panelden öğrencinin adını, e-postasını, kataloğunu ve sınıfını girer.
2. Sistem rastgele bir geçici şifre üretir ve hesabı açar.
3. Koç bu bilgileri öğrenciye iletir. Şifre bir daha gösterilmez.
4. Öğrenci giriş yaptığında kendi şifresini belirlemesi önerilir; zorunlu değildir.

Şifre değişimi zorunlu olmadığı için koç, öğrencinin şifresini bilmeye devam eder.
Öğrenci öneriyi kabul edip şifresini değiştirene kadar bu geçerlidir.

Hesap açma işlemi `service_role` anahtarı gerektirdiği için tarayıcıda değil,
`supabase/functions/kullanici-olustur` Edge Function'ında yapılır.

## Konu katalogları

Sistem katalogları (`koc_id IS NULL`) tüm koçlara açıktır; koç kendi konusunu
ekleyebilir. Öğrenci bir kataloğa bağlanır.

| Katalog | Müfredat |
| --- | --- |
| YKS Sayısal / Eşit Ağırlık / Sözel | MEB 2018 (12. sınıf henüz Maarif'e geçmedi) |
| 9., 10., 11. Sınıf | Türkiye Yüzyılı Maarif Modeli |
| LGS 8. Sınıf | MEB 2018 (8. sınıf 2027-2028'de Maarif'e geçecek) |
