# Sosyal medya video hattı (Higgsfield + Remotion)

> **Karar (18 Eylül 2026, Bekir):** Proje sıfır bütçeyle yürüyor. Sosyal
> medya animasyonları **Remotion ile, ücretsiz** üretilecek — çizim tabanlı
> anlatım (kâğıt, kutular, silinen satır, değişen ışık) zaten sitedeki
> çarşamba sahnesinde var, 9:16 dikeye çevrilecek. Yüz gereken içerik
> Kıvanç'ın kendi telefonuyla çekilecek. Higgsfield bağlı ve çalışır
> durumda ama **kredi gerektirdiği için şimdilik kullanılmıyor**; yalnızca
> çizimle anlatılamayan gerçek görüntü gerektiğinde açılacak.
>
> Uyarı: Higgsfield'ın 3 günlük ücretsiz denemesi kart istiyor ve süre
> bitince otomatik ücretlendiriyor. Kullanılırsa hemen ardından otomatik
> yenileme iptal edilmeli.
>
> Sıradaki iş: sitedeki çarşamba sahnesinin + yazışmanın Remotion ile
> ~20 saniyelik dikey videoya çevrilmesi (ilk test). Ayrı bir sohbette
> yürütülecek. Not: bu repoda Remotion ve Buffer'a ait hiçbir dosya yok;
> o çalışma başka bir yerde duruyorsa önce birleştirilmeli.

---

## Higgsfield — referans (kullanılmaya başlandığında)

Kısa dikey videoları (Reels / Shorts / TikTok) üretmek için kullanılıyor.
Higgsfield kendi modeli değil; Sora, Veo, Kling, Seedance gibi modelleri tek
abonelikte toplayan bir kabuk. Bizim için önemli üç özelliği: kamera hazır
ayarları, karakter tutarlılığı (Soul ID) ve **ilk kare / son kare** kilidi.

## Bağlantı

Herkese açık bir API'si yok. İki yol var, ikisi de aynı hesabın kredilerini
harcar:

- **Claude (web / Cowork):** Ayarlar → Bağlayıcılar → özel bağlayıcı ekle →
  `https://higgsfield.ai/mcp`. Higgsfield hesabıyla yetkilendirilir, API
  anahtarı istenmez.
- **Claude Code / Cursor:** `npx skills add higgsfield-ai/skills` ve
  `higgsfield auth login`.

Bağlantı kurulduktan sonra üretimler Higgsfield hesabındaki "Assets"
bölümünde de görünür; oradan indirilip bu depoya alınır.

**Durum (18 Eylül 2026):** bağlantı kuruldu ve doğrulandı. Hesap "free"
planda, 10 kredi var — üretim için yetersiz, ilk videodan önce kredi
gerekiyor.

Bağlantıyla birlikte gelen araçlar: görsel / video / ses / 3B üretimi,
arka plan silme, upscale, reframe (var olan videoyu 9:16'ya çevirme),
Soul (karakter tutarlılığı) ve referans öğeleri.

**Not — Buffer kararı gözden geçirilebilir:** Higgsfield'ın kendi TikTok
yayın araçları var (hesap bağlama, doğrudan paylaşım veya taslağa gönderme,
TikTok ticari müzik kütüphanesinden parça seçme). TikTok için Buffer'a gerek
kalmayabilir; YouTube ve Instagram yine Buffer'dan gider. Karar sosyal medya
komitinde verilecek.

## Kurallar (bunlara uyulmazsa marka bozulur)

1. **Karede Türkçe yazı üretilmez.** Modeller ş/ğ/ı/İ harflerini bozuyor.
   Bütün metin katmanı Remotion'da, kendi fontumuzla (Bricolage Grotesque /
   JetBrains Mono) basılır.
2. **Logo üretilmez.** KH monogramı `marka/logo-kh.svg` dosyasından gelir.
3. **Çizbi modele çizdirilmez.** Gerekirse kendi SVG'mizden (`src/bilesenler/
   Kalem.jsx`) PNG kare dışa aktarılır ve plana *ilk kare* olarak verilir;
   model yalnız aradaki hareketi ve ortamı üretir. Modelin kendi çizdiği
   kalem karakteri sekiz duygu halimizin hiçbirine benzemiyor.
4. **Kıvanç'ın yüzü üretilmez.** Gerçek görüntü varsa kendi kamerasından.
5. Format 9:16, plan başına 5–8 saniye. Uzun tek çekim yerine kısa planlar.

## Plan istemi kalıbı

Her plan için şu beş satır yazılır, gerisi modele bırakılmaz:

```
Sahne:      (mekân, saat, ışık)
Özne:       (karede ne var; insan yüzü yoksa "no faces")
Hareket:    (öznenin hareketi)
Kamera:     (yavaş yaklaşma / yana kaydırma / geri çekilme)
Kaçınılacak: on-screen text, logos, watermarks, distorted hands
```

## Hazır senaryo — "Kötü gün olur" (~20 sn, 5 plan)

Sitedeki çarşamba bölümünün sosyal karşılığı. Metinler Remotion'da basılır.

| # | Süre | Plan | Basılacak metin |
|---|------|------|-----------------|
| 1 | 0–4 | Gece, masa lambası, açık defter, yarım kalmış üç satır. Kamera yavaşça yaklaşır. | Çarşamba, 21:40. |
| 2 | 4–8 | Telefon ekranı aydınlanır, kâğıdın üstüne mavi ışık düşer. Kamera hafif yana kayar. | "Bugün hiçbir şey yapamadım." |
| 3 | 8–12 | Bir satır silinir, kalan iki satır sonraki sayfaya geçer. | Biri silindi. İkisi yarına. |
| 4 | 12–16 | Işık geceden sabaha döner, iki satırın yanına tik konur. | Kötü gün olur. |
| 5 | 16–20 | Kamera geri çekilir, haftanın yedi günü görünür; biri soluk, kalanı dolu. | Kötü hafta olmasın. |

Ses: tek enstrüman, altta. Alternatif: 4. ve 5. planın metnini Kıvanç kendi
sesiyle okur.

## Maliyet

Plan başına yaklaşık 1–3 dolar (modele ve çözünürlüğe göre değişir; Veo
pahalı, Kling ucuz). Beş planlık bir senaryo tek turda 5–15 dolar, ama ilk
tur tutmaz — üç dört tur hesaba katılmalı.

## Çıktının akışı

1. Klipler indirilir → `sosyal/medya/` altına konur.
2. Remotion'da metin + logo katmanı basılır, tek dosya haline getirilir.
3. `sosyal/kuyruk.json` içine kayıt düşülür, paylaşım Buffer üzerinden
   planlanır (YouTube, Instagram, TikTok).
