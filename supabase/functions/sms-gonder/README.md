# sms-gonder

> **Kapalı (19 Eylül 2026, Bekir):** kendi gönderici başlığı alınmayacak. Veli özetleri kalıcı olarak koçun
> WhatsApp'ından gidiyor ("Veliye iletilecek" kutusu). Kod ve kuyruk yerinde; açmak gerekirse aşağıdaki cron satırı.

`sms_kuyrugu` tablosunu boşaltır.

> **Şu an uykuda.** `sms-kuyrugu-bosalt` cron'u 16 Eylül 2026'da kaldırıldı:
> elimizdeki onaylı gönderici başlığı başka bir firmanın (FIRATILTSM) ve
> veli, tanımadığı bir başlıktan gelen mesajı anlamıyor. Başlıklar firma
> unvanı/marka ile eşleşmek zorunda olduğundan "bilgi" gibi genel bir başlık
> da alınamıyor. Kuyruk artık koç panelindeki "Veliye iletilecek" kutusunda
> görünüyor; koç kendi telefonundan WhatsApp ile iletiyor
> (`koc_veli_mesajlari`, `koc_veli_mesaji_isaretle`).
>
> Kendi başlığımız onaylanınca fonksiyon olduğu gibi çalışır; cron'u geri
> kurmak yeter:
>
> ```sql
> select cron.schedule('sms-kuyrugu-bosalt', '*/2 * * * *', $$ select private.sms_gondericiyi_durt() $$);
> ```
>
> Kurulum sınaması (aşağıdaki `sinama` çağrısı) her zaman çalışır.

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
