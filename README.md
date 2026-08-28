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

## Roller

| Rol | Yetki |
| --- | --- |
| Koç | Kendi öğrencilerini yönetir, program yazar, davet kodu üretir |
| Öğrenci | Kendi görevlerini işaretler, ilerlemesini görür |
| Veli | Çocuğunun verisini yalnızca görüntüler |

Bir koç, veritabanı seviyesinde başka koçun verisine erişemez. Yetkilendirme
uygulama kodunda değil, RLS politikalarında tanımlıdır.

## Katılım akışı

1. Koç kayıt olurken "Koç olarak kayıt oluyorum" kutusunu işaretler.
2. Panelden davet kodu üretir (`XXXX-XXXX`), öğrenciye gönderir.
3. Öğrenci normal kayıt olur, kodu girer; hesabı otomatik olarak koça bağlanır.
4. Veli daveti aynı şekilde, ancak koç kodu belirli bir öğrenci için üretir.

Kodlar tek kullanımlıktır ve 30 gün geçerlidir.

## Konu katalogları

Sistem katalogları (`koc_id IS NULL`) tüm koçlara açıktır; koç kendi konusunu
ekleyebilir. Öğrenci bir kataloğa bağlanır.

| Katalog | Müfredat |
| --- | --- |
| YKS Sayısal / Eşit Ağırlık / Sözel | MEB 2018 (12. sınıf henüz Maarif'e geçmedi) |
| 9., 10., 11. Sınıf | Türkiye Yüzyılı Maarif Modeli |
| LGS 8. Sınıf | MEB 2018 (8. sınıf 2027-2028'de Maarif'e geçecek) |
