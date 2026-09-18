# Sosyal video (Remotion)

Sitedeki sahneleri 9:16 dikey videoya çeviren ayrı paket. Sitenin derlemesine
dokunmaz; kendi `package.json`'u var.

```
cd sosyal/video
npm install
npm run studio   # tarayıcıda canlı önizleme, kare kare oynatma
npm run render   # -> sosyal/medya/carsamba.mp4 (1080x1920, 20 sn)
npm run kapak    # -> sosyal/medya/carsamba-kapak.png
```

- `src/Carsamba.jsx` — "Kötü gün olur" videosu. Metinler `src/icerik/hafta.js`'ten
  okunur; sitede yazışma değişirse video da değişir. Zaman çizelgesi dosyanın
  başındaki sabitlerde (kare cinsinden, 30 kare = 1 sn).
- `src/renk.js` — `src/tema.css` tanıtım paletinin kopyası.
- Reels/TikTok arayüzü üstte ~200px, altta ~320px kapatır; içerik aradadır.
- Render edilen video onaylanınca `sosyal/medya/` altına alınır ve
  `sosyal/kuyruk.json`'a satır düşülür (bkz. `sosyal/higgsfield.md`).
