# Tabeladaki canlılar — ince ayar rehberi

> Yeni bir sohbette bu dosyayı referans ver: "docs/TABELA-CANLILARI.md'ye göre canlılara ince ayar yapalım."
> Son güncelleme: 22 Eylül 2026 (akşam). Durum: **canlıda, ince ayar turu 1 yapıldı** (konum, boyut, serçe kanadı).

## 1. Ne bu?

Uygulamanın sahneli tepesindeki tabelalara (fotoğraf çerçevesini taşıyan direk ve kol, Öğrencilerim tabelası) mevsime göre küçük, hareketli bir canlı konar. Amaç: ekranın "yaşadığı" hissi, göz yormadan.

| Mevsim | Canlı | Ne yapıyor |
|---|---|---|
| İlkbahar | Kelebek (pembe) | Soldan süzülerek gelir, çubuğa konar, kanatlarını ara ara ikişer kez yavaşça açıp kapar, sağ üstten uçup gider. |
| Yaz | Serçe (kahverengi) | Sağ üstten kanat çırparak süzülür, ~1,5 sn'de yay çizip konar (kanat kapanır); sağa-sola bakınır, başını eğer, iki kez yana zıplayıp döner; sol üstten uçup gider. |
| Sonbahar | Sincap (turuncu, ağzında palamut) | Direğe aşağıdan tırmanır, çubukta oturur, kuyruğu yavaşça sallanır; arada bir yaprak tabelaya çarpıp düşer; direkten inip gider. |
| Kış | Kızılgerdan (tombul, kırmızı göğüslü) | Karlı çubuğa konar ve **kalır**; arada silkelenir, çubuktan birkaç kar tanesi dökülür. |

Onaylanan mokap (hızlı, 16 sn'lik tur; mevsim düğmeli): https://claude.ai/artifact/57at2ZbY4B2SWNENogTWoG
Mokap dosyası: `/mnt/user-data/outputs/tabela-canlilar-mokap.html` (oturuma bağlı; kalıcı değil).

## 2. Kurallar (Bekir'le konuşulan, bozulmasın)

- **Sürekli hareket yok.** Nabız efektinde de öyle istendi. Bir tur ~35 sn; canlı ekran açılınca gelir, birkaç saniye bir şey yapar, sonra ya durur ya gider. (Kış kuşu kalır, yalnız arada silkelenir.)
- **Fotoğrafın ve sayıların üstüne binmez.** Hep çubuğun sol ucunda (fotoğraf tabelası) ya da tabelanın üst kenarının sağında (Öğrencilerim).
- **Aynı ekranda iki canlı olmaz.** Koçun ana ekranında canlı **sahnenin sağ üstündeki fotoğraf tabelasında** (Bekir'in isteği, 22 Eylül 2026: "ilk açtığımda alttaki tabelada görünüyordu, sağ üstte olmalı"); alttaki Öğrencilerim kapı kartında yok. Öğrencilerim ekranının tepesindeki tabelada var.
- **Hareket azaltma açıksa** canlı çubukta hareketsiz durur; yaprak ve kar hiç çizilmez.
- **Mevsim seçiciyle çalışır** (koçun profilindeki Görünüm → Mevsim teması; öğrenciler tarihe göre görür).
- **Hafif:** yalnız SVG + CSS keyframe; JS zamanlayıcısı yok.

## 3. Kod nerede?

| Ne | Dosya | Not |
|---|---|---|
| Canlı bileşeni | `src/ortak/KapiCizimleri.jsx` → `export function TabelaCanlisi({ mevsim, x, y, olcek })` | Dört mevsimin SVG çizimi. `(x, y)` = canlının ayağının bastığı nokta (çubuğun üst yüzü). |
| Fotoğraf tabelası | aynı dosya → `PortreCizimi({ ..., canli = true })` | `<TabelaCanlisi x={30} y={12} olcek={1} />`; svg `overflow: visible` (canlı viewBox'ın üstüne taşar). |
| Öğrencilerim tabelası | aynı dosya → `TabelaCizimi({ ..., canli = false })` | `<TabelaCanlisi x={88} y={12} olcek={0.85} />`; yalnız `canli` verilince. |
| Nerede açık/kapalı | `src/ekranlar/KocAnaSayfa.jsx` | Koç ana ekranı: `PortreCizimi` (varsayılan canlılı), Öğrencilerim kapı kartı `TabelaCizimi` canlısız, Öğrencilerim ekranı tepesi `TabelaCizimi ... canli`. Diğer ekranlarda (öğrenci ana ekranı, öğrenci koç ekranı, profiller) `PortreCizimi` varsayılanla canlılı. |
| Animasyonlar | `src/mevsim.css` → "Tabeladaki canlılar" bölümü (dosyanın sonuna yakın) | Sınıflar aşağıda. |

### Geometri

- `PortreCizimi` viewBox `0 0 120 112`: direk `x 16–22`, kol (çubuk) `x 16–80, y 12–17`, çerçeve merkezi `(72, 60)` r 33. Canlı çapası `(30, 12)`.
- `TabelaCizimi` viewBox `0 0 150 84`: tabela gövdesi `x 12–104 (ok ucu 116), y 12–40`, direk `x 22–28`. Canlı çapası `(88, 12)`.
- Canlıların iç konumları (çapaya göre, ölçek 1'de): kelebek `(4, -14)`, serçe `(0, -16)`, sincap `(-2, -20)`, kızılgerdan `(2, -18)`.

### CSS sınıfları ve zaman çizelgesi (tur = 35 sn)

| Sınıf | Ne | Keyframe özeti |
|---|---|---|
| `.tc` | Her canlının hareket kabı | `animation-duration: 35s; infinite; ease-in-out` |
| `.tc-kelebek` / `@keyframes tc-kelebek` | Geliş–konma–gidiş | 0% sol alttan görünmez → %13 konmuş → %50'ye kadar durur → %56–59 sağ üstten çıkar → turun kalanı görünmez |
| `.tc-kanat` (+ `--sag`) | Kanat | 2.4 sn'lik döngü, döngüde iki yavaş kapanma (scaleX .3) |
| `.tc-serce` | Geliş, iki zıplama, gidiş | %0–4,4 sağ üstten yay çizerek konar (~1,5 sn), %22–24 ve %38–40 zıplama, %55–62 sola sıçrayıp uçar |
| `.tc-serce-govde` | Yön | %55'ten sonra `scaleX(-1)`: giderken sola bakar |
| `.tc-serce-ucan` / `.tc-serce-kapali` | Açık / kapalı kanat | Yalnız uçuş pencerelerinde (%0–4,4 ve %55–62) açık kanat görünür, aksi hâlde kapalı kanat çizgisi; `step-end` opaklık |
| `.tc-serce-kanat` (+ `--arka`) | Çırpma | 0,22 sn ileri-geri, -38°…+22°; iki kanat yarım faz kaymalı |
| `.tc-serce-bas` | Bakınma | %13–17 ters döner (scaleX -1), %30–33 başını eğer (-18°) |
| `.tc-sincap` | Tırmanma–oturma–inme | Direkte -90° dönük tırmanır (%0–12), %12–52 oturur, %55–64 iner |
| `.tc-kuyruk` | Kuyruk | 1.6 sn ileri-geri, -12° |
| `.tc-yaprak` | Düşen yaprak (sonbahar) | %29–43 arası tabeladan düşer |
| `.tc-gerdan` | Kış kuşunun gelişi | Bir kez, 1.2 sn yukarıdan konar; sonra kalır |
| `.tc-gerdan-govde` | Silkelenme | %38–42 arası sağa-sola sallanıp kabarır |
| `.tc-kar` | Dökülen kar | %39–46 arası 5 tane, `--tc-x` ile yana saçılır |

Renkler çizimin içinde sabit (mevsim paletine bağlı değil): kelebek `#F28FB0/#F6B8CC`, serçe `#9A6A43/#E9D8BE`, sincap `#C9763A/#B8642E`, kızılgerdan `#7A6453` + göğüs `#D9573A`.

## 4. İnce ayar için açık sorular / fikirler

Tur 1 (22 Eylül 2026): koç ana ekranında canlı sağ üstteki fotoğraf tabelasına taşındı; ölçekler büyütüldü (0.8→1, 0.6→0.85); serçeye açık kanat + çırpma ve süzülen geliş eklendi. Kalan konular:

1. **Boyut:** fotoğraf tabelasında `olcek 1`, Öğrencilerim tabelasında `0.85` (390px'te doğrulandı).
2. **Sıklık:** 35 sn uygun mu? Her açılışta ilk tur hemen başlıyor; ekranda uzun kalınca sonraki turlar 35 sn arayla.
3. **Rastgelelik:** Her tur aynı. İstenirse gecikme ya da hareket sırası rastgele yapılabilir (küçük bir JS ya da `animation-delay` ile).
4. **Dokununca tepki:** Şu an canlılar dokunuşa kapalı (fotoğrafa dokununca profil açılıyor). Canlıya dokununca uçup gitmesi gibi bir etkileşim istenirse, profil açma tıklamasıyla çakışmaması gerekir.
5. **Kış kuşunun hiç gitmemesi** doğru mu, yoksa o da ara ara uçmalı mı?
6. **Başka ekranlar:** Posta kutusu (Yapılacaklar) ve kâğıt uçak / çan gibi diğer sahne nesnelerine de mevsim canlısı eklenebilir; şu an yok.
7. **Gece/gündüz:** Sahne mevsime göre; saat bilgisiyle akşam kuşun uyuması gibi küçük şeyler eklenebilir.
8. **Öğrencinin seçimi:** Öğrenci kendi canlısını seçebilir mi (ödül olarak)? Şimdilik yok.

## 5. Nasıl test edilir?

- **Canlı:** khkocluk.com. Koç: ana ekranda Öğrencilerim kartı, Öğrencilerim ekranı, öğrenci ekranı, profil. Öğrenci (test: Bekir Yılmaz, `bekiryilmaz@msn.com`): ana ekran, profil. Mevsimi koçun profilinden değiştir.
- **Önizleme (yerel, repoda):** `npx vite --config .onizleme/vite.config.mjs` → `http://localhost:5190/?mevsim=yaz` (`mevsim=ilkbahar|yaz|sonbahar|kis`). Yalnız iki tabelayı (fotoğraf + Öğrencilerim) 140px genişlikte çizer; sahte supabase. Kareleri görmek için Playwright'ta `document.getAnimations().forEach(a=>{a.pause(); a.currentTime=1000})` ile zamanı sarabilirsin (tur 35 000 ms).
- **Hareket azaltma:** tarayıcıda `prefers-reduced-motion: reduce` öykünmesi ya da telefonda Erişilebilirlik → Hareketi Azalt.

## 6. Yayın

`main` dalına push → Cloudflare Workers otomatik derler (yaklaşık 1,5 dk). Değişiklikten sonra `DURUM.md`'nin başına kısa not eklenir (repo geleneği).
