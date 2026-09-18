# Bir yıllık içerik takvimi (19 Eylül 2026 – 18 Eylül 2027)

Her gün bir video; YouTube Shorts, Instagram Reels ve TikTok'a aynı video,
platforma göre farklı saat ve etiketle gider.

```
python3 sosyal/takvim/uret.py
```
`yillik-plan.json` (makine), `yillik-plan.csv` (Excel'de açılır, `;` ayraçlı)
ve `takvim.html` (tarayıcıda tıklanabilir takvim) üretir.

## Dosyalar
- `bankalar.py` — konu bankaları (seri başına ~50 konu, her biri başlık + kanca)
  ve mevsime bağlı konuların hangi aylarda çıkacağı.
- `uret.py` — takvimi kuran kurallar: tarihler, özel günler, yayın saatleri,
  etiketler, gün batımı hesabı.
- `sablon.html` — takvim sayfasının tasarımı; veri `uret.py` ile içine gömülür.

## Haftanın ritmi
| Gün | Seri | Kitle | Video şablonu |
|---|---|---|---|
| Pzt | Haftanın Planı | öğrenci | kart-liste |
| Sal | Ders Taktiği | öğrenci | soru-cozum |
| Çar | Aynı Hafta (koç–öğrenci yazışması) | öğrenci | yazisma (çarşamba videosunun şablonu) |
| Per | Veli Köşesi | veli | kart-veli |
| Cum | Doğru Bilinen Yanlışlar | öğrenci | efsane-gercek |
| Cmt | Deneme Günü | öğrenci | kart-liste |
| Paz | Sınav Psikolojisi | öğrenci | tek-cumle |

Takvime bağlı 41 gün ("Özel Gün") serinin yerini alır. Hassas günlerde
(10 Kasım, 6 Şubat, 15 Temmuz) müzik, etiket ve satış çağrısı yoktur; sade kart.

## Hesaba katılanlar
- **Gün batımı:** Tarsus (36.918 K, 34.895 D), UTC+3. Ramazanda yayın saati
  iftardan sonraya kayar (IG +2 sa, TikTok +2,5 sa, YouTube +1,5 sa).
- **MEB 2026-27 takvimi (kesin):** 14 Eylül açılış, 16–20 Kasım ve 8–12 Mart
  ara tatil, 22 Ocak karne, 25 Ocak–5 Şubat yarıyıl, 25 Haziran kapanış.
- **Sınavlar (tahmini):** YKS 19–20 Haziran 2027, LGS 13 Haziran 2027.
  Resmi takvim gelince `uret.py` başındaki `YKS` ve `LGS` satırları değişir.
- **Dini günler (tahmini, Diyanet'le teyit):** Ramazan 8 Şubat–8 Mart,
  Ramazan Bayramı 9–11 Mart, Kurban Bayramı 16–19 Mayıs 2027.
- **Kohort:** YKS'den sonra etiket #yks2028'e geçer.
- **Yayın saatleri:** başlangıç varsayımı (okul günü, cumartesi, pazar, tatil,
  veli, bayram için ayrı). İlk 4 haftanın Buffer ölçümleriyle ayarlanır.

## Üretim hattı (sırada)
1. Her şablon için bir Remotion kompozisyonu (`sosyal/video/`), veriyi
   `yillik-plan.json`'dan alır. İlk kare kapak kuralı hepsinde geçerli.
2. Günlük iş akışı: o günün satırından videoyu GitHub Actions'ta render eder,
   üç kanala `kuyruk.json` satırı yazar, Buffer'a planlar.
3. Haftalık ölçüm: Buffer metriklerinden saat ve etiket ayarı.

## Sınav Psikolojisi (pazar) ve gündem
- Pazar serisi **Sınav Psikolojisi**: ekipteki psikolojik danışmanın (PDR) imzasıyla çıkar.
  Ad ve unvan `sosyal/ekip.json`'da; açıklamaya "bilgilendirme amaçlıdır, uzun sürüyorsa
  rehber öğretmene / uzmana, acilde 112" notu kendiliğinden eklenir. Aylık metinler
  yayından önce uzmana okutulur.
- **Gündem**: `.github/workflows/sosyal-gundem.yml` pazartesi ve perşembe sabahı
  Google Haberler + Google Trends'i tarayıp bir GitHub konusu açar. Hassas haberler ⚠️ ile
  işaretlenir. Seçilen konu `takvim/gundem.json`'a eklenir:
  `{"tarih": "2026-10-05", "baslik": "...", "kanca": "...", "govde": ["...","...","..."], "onay": true}`
  O günün videosu takvimdeki konunun yerine bununla üretilir.

## Sınav tarihleri kendiliğinden güncellenir
- Bütün sınava bağlı günler `sinavlar.json`'daki tarihlerden hesaplanır: geri sayımlar
  (200/150/100/50/30/10 gün), başvuru, LGS, TYT/AYT, sınav bitti, sonuç, tercih,
  yerleştirme; ayrıca "son pazar", "son denemeler", "tercih kaygısı" gibi konular sınava
  göre bir pencere içinde yerleşir (`bankalar.py` → `MEVSIM`).
- `.github/workflows/sosyal-sinav-takip.yml` her pazartesi ÖSYM takvimini okur. O yılın
  YKS'si yayınlanınca dosyayı günceller (`kesin: true`), takvimi yeniden kurar, depoya
  işler ve "Sınav tarihleri güncellendi" konusuyla haber verir. Ertesi sabahki üretim
  yeni takvimle çalışır. Yayınlanmış/planlanmış günler değişmez.
- LGS için MEB'in okunabilir bir takvimi yok: haberlerde tarih görülürse yalnız öneri
  yazılır; `sinavlar.json`'da `lgs.tarih` elle güncellenir.
