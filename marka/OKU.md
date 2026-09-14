# Marka dosyaları

Logo, profil görselleri ve YouTube bannerı burada durur. **Yeniden çizilmezler.**
Bir yerde marka işareti lazım olduğunda bu klasördeki dosya kullanılır; yeni bir
çizim yapılmaz.

Bu klasör siteye dahil değildir (`public/` altında değil), derlemeye girmez.
Ölçünün kaynağı uygulamadır: `src/bilesenler/Marka.jsx` ve `public/` altındaki
ikonlar neyi çiziyorsa buradaki dosyalar onu izler, tersi değil. Oran ya da renk
değişecekse önce uygulamada değişir, sonra `uret/` betikleri yeniden çalıştırılır.

---

## Dosyalar

| Dosya | Nerede kullanılır |
| --- | --- |
| `logo-kh.svg` | Koyu zeminde vektör logo. Baskı, sunum, üçüncü taraf yerler. |
| `logo-kh-acik-zemin.svg` | Beyaz/açık zemin için aynı logo, harfler lacivert. |
| `logo-kh.png` / `logo-kh-acik-zemin.png` | 1024 px yükseklik, şeffaf zemin. SVG kabul etmeyen yerler için. |
| `logo-yatay.png` / `logo-yatay-acik-zemin.png` | Monogram + "Kıvanç Hoca ile Eğitim Koçluğu" kilidi, şeffaf zemin. |
| `profil-1080-koyu.png` | YouTube, Instagram, TikTok profil fotoğrafı. Üçü için de tek dosya yeter. |
| `profil-1080-acik.png` | Açık zeminli profil varyantı (ör. WhatsApp Business). |
| `profil-800-koyu.png` | YouTube'un istediği tam ölçü. |
| `banner-youtube-patika.png` | YouTube kanal bannerı, 2560 × 1440. Seçilen tasarım: "patika". |
| `filigran-150-daire.png` | YouTube video filigranı, 150 × 150. Koyu daire zeminli; her renkteki videoda okunur, önerilen budur. |
| `filigran-150-seffaf.png` | Aynı filigranın zeminsiz hali; harflerin altında hafif gölge var. Videolar hep koyuysa kullanılabilir. |

Filigran, oynatıcının sağ alt köşesinde durur ve aynı zamanda abone ol düğmesidir;
yalnızca masaüstünde görünür. YouTube 150 × 150 ve 1 MB altı ister.

Profil görsellerinde monogram kasten ortada ve küçükçe durur: Instagram ile TikTok
profili daire kırpar, köşeler gidince harfler yine rahat durur.

---

## Monogram

İki harf **KH** sırasındadır — Kıvanç Hoca. Soldaki K'nin kolları ortadaki dikeyde
biter; o dikey aynı zamanda H'nin sol bacağıdır ve **amber** çizilir. Markanın tek
imza hattı budur. Turuncu başka hiçbir yere girmez.

Geometri (100 birim yükseklik, çizgi kalınlığı 16, uçlar yuvarlak):

```
K gövde       x = 8,     y = 0 → 100
K üst kol     (10.4, 50) → (72, 0)
K alt kol     (10.4, 50) → (72, 100)
H orta çizgi  y = 50,    x = 72 → 137
H sağ bacak   x = 137,   y = 0 → 100
Ortak dikey   x = 72,    y = 0 → 100    ← amber, en üstte çizilir

Toplam genişlik 145 birim (çizgi kalınlığı dahil), yükseklik 100.
```

Ortak dikey **en son** çizilir; altındaki kol uçları ve orta çizginin başı onun
altında kalır, amber bant kesintisiz görünür.

İki harf yalnızca ikondur, daima ismin ya da bir başlığın yanında durur. Marka adı
"KH" değildir; adı "Kıvanç Hoca".

---

## Renk ve yazı

| | |
| --- | --- |
| Harfler (koyu zemin) | `#E9EEF7` |
| Harfler (açık zemin) | `#0F1520` |
| Ortak dikey — amber | `#FFC24A` |
| Zemin | `#0F1520` |

Başlıklar **Bricolage Grotesque** (700), alt satırlar **Karla**. İkisi de uygulamanın
kullandığı aileler; font dosyaları `uret/fontlar/` altında (SIL Open Font License).

---

## Yeniden üretim

Normalde gerek yok — dosyalar hazır. Yeni bir ölçü ya da varyant lazım olursa:

```bash
cd marka/uret
python3 logo.py      # logo, profil görselleri, yatay kilit, filigran
python3 banner.py    # banner: patika + üç alternatif tasarım
```

`temel.py` ortak çizim yardımcılarını ve paleti tutar. `banner.py` dört tasarım
üretir; kanalda kullanılan **patika**dır, diğer üçü elenmiş alternatiflerdir ve
depoda tutulmaz.

Bağımlılık: `pillow`.
