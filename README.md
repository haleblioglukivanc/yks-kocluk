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

## Durum

Şu an depoda yalnızca yayın hattını doğrulayan bir durum sayfası var. Sıradaki adım
veritabanı şeması ve RLS politikaları.
