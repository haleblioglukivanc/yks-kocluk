# sms-gonder

`sms_kuyrugu` tablosunu boşaltır. İki dakikada bir `sms-kuyrugu-bosalt`
cron'u tarafından dürtülür; kuyruk boşsa istek atılmaz.

## Sağlayıcı: İleti Merkezi

JSON POST API:

```
POST https://api.iletimerkezi.com/v1/send-sms/json
{
  "request": {
    "authentication": { "key": "...", "hash": "..." },
    "order": {
      "sender": "BASLIK",
      "iys": "0",
      "message": { "text": "...", "receipents": { "number": ["905xxxxxxxxx"] } }
    }
  }
}
```

Yanıt: `{ "response": { "status": { "code": "200", ... }, "order": { "id": "..." } } }`
Kod `200` başarılı sayılır, sipariş numarası `sms_kuyrugu.saglayici_id`'ye yazılır.

İki tuzak var:

- **Alıcı listesinin yeri.** `order.message.receipents.number[]` altında;
  `order.receipents` değil. Yanlış yere konursa 452 döner.
- **`iys` zorunlu ve varsayılanı yok.** Alan atlanırsa istek geçmez.
  Bizim mesajlarımız izinli veliye giden hizmet bilgilendirmesi, 6563 sayılı
  kanunda ticari ileti sayılmıyor — bu yüzden `"0"`. Ticari mesaja geçilirse
  `"1"` ve `iysList` eklenmeli.

## Ortam değişkenleri

```
ILETIMERKEZI_KEY      panel > ayarlar > API anahtarı
ILETIMERKEZI_HASH     API anahtarı + gizli anahtar ile üretilen hash
ILETIMERKEZI_SENDER   onaylı gönderici başlığı (en fazla 11 karakter)
```

Üçü de tanımlı değilse fonksiyon kuyruğa dokunmadan `atlandi` döner.

## Hata yönetimi

Kalıcı hatalarda (401 üyelik bilgisi, 450 başlık geçersiz, 452 alıcı geçersiz,
454 metin boş, 422 doğrulama) deneme sayacı doldurulur — tekrar denemenin
anlamı yok, satır `hata` durumunda kalır ve panelde görünür.

**402 bakiye yetersiz** ayrı ele alınır: deneme harcanmaz, satır bir saat
sonraya ertelenir. Bakiye yüklenince kendiliğinden gider.

## Kurulum sınaması

Kuyruğa dokunmadan tek mesaj atar:

```
POST /functions/v1/sms-gonder   { "sinama": "5xxxxxxxxx" }
```

Sonuç sistem günlüğüne de yazılır.

## İzin kuralı

Kuyruğa yalnızca `sms_izni` olan veli için satır düşer (`private.sms_ekle`).
Burada izin yeniden kontrol edilmez: iki yerde kontrol, iki ayrı doğruluk
kaynağı yaratır.
