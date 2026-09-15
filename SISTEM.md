# Tasarım sistemi

Üç katman var. Yeni bir ekran yazarken hangi katmana dokunduğunu bil.

| Dosya | İşi | Ne zaman dokunulur |
|---|---|---|
| `src/tema.css` | Renkleri, puntoları, yazı tiplerini **tanımlar** | Marka değişirse. Yılda bir. |
| `src/sistem.css` | O renklerin **ne zaman** kullanılacağını tanımlar | Yeni bir bileşen türü çıkarsa |
| `src/index.css` | Yalnızca **yerleşim**: ızgara, boşluk, hizalama | Her ekranda |

Kural: `index.css`'e hex yazılmaz. Bir yerde `#` görüyorsan sistem kaçağı var.

## Renk nasıl geliyor

Renk seçilmez, **durum söylenir**. Bir öğeye `data-durum` verirsin;
o öğe ve içindeki her şey rengini oradan alır.

```jsx
<div className="satir durum-serit" data-durum="acil">
  <span className="rozet">19 gecikmiş</span>   {/* kırmızı olur */}
  <span className="nokta" />                    {/* kırmızı olur */}
  <div className="cubuk"><i style={{width:'30%'}} /></div>
</div>
```

Aynı işaretleme `data-durum="iyi"` ile yeşile döner. Tek satır CSS
yazılmaz.

### Beş durum

| Durum | Renk | Anlamı |
|---|---|---|
| `eylem` | mavi | dokunulabilir, bağlantı, odak, aktif sekme |
| `acil` | kırmızı | bugün müdahale gerektiren |
| `izle` | amber | geride ama acil değil |
| `iyi` | yeşil | bitti, yolunda |
| `notr` | gri | bilgi taşımayan |

`sonuk` da var: nötrden sessiz, sıraya girmiş ama henüz iş olmayan şeyler.

**Altıncı bir renk ekleme.** Önce sor: bu gerçekten yeni bir anlam mı,
yoksa var olan beşten birinin tonu mu? Eskiden sekmelerin yedi ayrı
rengi vardı ve sonuçta hiçbir renk bir şey söylemiyordu.

## Hazır bileşenler

Hepsi yalnızca durumdan beslenir, marka rengine dokunmaz.

- `.rozet` — küçük durum etiketi
- `.durum-serit` — satırın solunda şiddet kenarı
- `.nokta` — yer kaplamayan durum işareti
- `.cubuk` + içinde `<i>` — oran çubuğu
- `.cip` — seçilebilir etiket, `aria-pressed` ile dolar
- `.kart[data-durum]` — kenarı boyanır, içi boyanmaz

## Yüzey katları

Kart içindeki kutu kartla aynı renk olamaz. Hex yazma, kat ver:

```jsx
<div className="kart" data-kat="1">
  <div data-kat="2">içerideki kutu</div>
</div>
```

## Metin ve sayı

Üç metin kademesi var, dördüncüsü yok: gövde (varsayılan),
`.metin-2` (ikincil), `.metin-3` (üçüncül).

Her metrik `.sayi` alır — mono ve `tabular-nums`, listede rakamlar
alt alta hizalansın diye. Büyük olacaksa `.sayi--buyuk` veya
`.sayi--dev`.

`.fosforlu` ekranın **tek** önemli sayısı içindir. İkincisini
eklersen ikisi de sönük kalır.

## Tek tema

Gece modu 14 Eylül 2026'da kaldırıldı: her UI değişikliğinin iki temada
doğrulanması gerekiyordu ve doğrulanmıyordu. `--k-*` koyu paleti duruyor;
onu yalnız **her zaman koyu** olan yüzeyler okur: üst şerit, Bugün
başlığı (`.hero-yuzey.ob`), odak bloğu, köşedeki Çizbi balonu. Bileşen
yazarken `--k-*`'ya elle uzanılmaz; koyu yüzeyin içindeysen zaten oradan
geliyordur.

## Punto

`tema.css`'te dokuz token var, `index.css`'e rem/px punto yazılmaz:

| Token | px | İşi |
|---|---|---|
| `--punto-sayi` | 32 | ekranın tek büyük rakamı (`.sayi--buyuk`) |
| `--punto-dev` | 28 | ekran başlığı (Denemelerim, Giriş) |
| `--punto-buyuk` | 22 | selam satırı, büyük kart başlığı |
| `--punto-baslik` | 18 | Çizbi'nin cümlesi, kart başlığı |
| `--punto-govde` | 16 | akan metin |
| `--punto-orta` | 15 | sıkışık akan metin |
| `--punto-kucuk` | 14 | ikincil satır |
| `--punto-mini` | 13 | akan yazının alt sınırı |
| `--punto-etiket` | 12 | **yalnız** büyük harfli/mono etiket ve rozet; cümle bu boyutta yazılmaz |

## Çizbi'nin sesi

Çizbi nerede konuşursa konuşsun aynı yüzle konuşur: Bricolage 700,
`--punto-baslik`, beyaz, koyu zemin. Bunu tek kural verir
(`.ob-mesaj, .kalem-kabarcik-metin`). Koç, öğrenci ve veli başlığı aynı
iskeleti kullanır: selam + tarih / Çizbi (76px) + cümle / eylemler.
Yeni bir yerde Çizbi konuşturulacaksa bu sınıflar kullanılır, yeni bir
balon çizilmez.

## Köşe ve katman

Köşe yarıçapı sekiz token: `--r-ince` 3 · `--r-kucuk` 6 · `--r-orta` 8 ·
`--r` 10 · `--r-kart` 12 · `--r-buyuk` 16 · `--r-dev` 20 · `--r-tam` hap.
z-index adla verilir: `--kat-yapisik` 12 · `--kat-uyari` 20 · `--kat-tepe`
30 · `--kat-yaprak` 40 · `--kat-cizbi` 60 · `--kat-perde` 100 ·
`--kat-kutlama` 110. `index.css`'e çıplak sayı yazılmaz.

## Katman ve boşluk

- **Bir ekranda en fazla iki katman:** yüzey (koyu tepe ya da kâğıt) ve
  üstündeki kart. Kart içinde kenarlıklı ikinci bir kutu olmaz; kartın
  içindeki gruplar boşluk ve başlıkla ayrılır. Hafta şeridi bu yüzden
  kâğıt üstünde kapsız durur, odak bloğu tek başına karttır.
- **Kartlar arası tek boşluk: 12px.** Ayrı ölçü gerekiyorsa önce sor:
  bu gerçekten yeni bir ilişki mi, yoksa aynı boşluğun bir tonu mu?

## Doku ve gölge

- **Zemin dokulu, kart temiz.** `body` kâğıdı `--doku-kagit` grenini
  taşır (%3–5, tek renk, 160px sabit ölçek). Kart yüzeyine doku girmez;
  yazı orada okunuyor.
- **Kartı ayıran renk değil gölge.** İki kademe var, üçüncüsü yok:
  `--golge-kart` (her `.kart`) ve `--golge-kalkik` (`.kart--kaldirilmis`,
  karar kartı). `.kart--duz` gölgesiz ve kenarsız, o bilerek kapsız.
  Gölgeli kartın kenarı `--cizgi-hafif`; gölge + koyu kenar birlikte
  ağır durur. Gölge telefonda küçültülmez.
- Kart başlığı `--punto-kart` (19), büyük sayı `--punto-sayi` (34,
  `tabular-nums`). İkisi de token; index.css'e punto yazılmaz.
- **Hareket geri bildirim ya da ilerleme anlatır.** Amaçsız hareket
  yok, ama her eylemin bir cevabı var: Çizbi girişi (520ms), balon pop
  (380ms), cümle yazılarak akar (22ms/harf), biten güne damga (420ms,
  7 öğe 70ms kademeli — tek istisna), görev bitince kart uçar + tik
  patlar (240ms + 700ms), sıradaki kart gelir (220ms), sayaç halkası
  dersin rengiyle dolar, dokunuş `scale(.98)`. Yol'da patika kendini
  çizer (1.1s) ve Çizbi durak değiştirince zıplar; grafiklerde çizgi
  kendini çizer (`.grafik-cizgi`, 900ms), son nokta patlar, büyük sayı
  sayarak gelir (`useSayarak`), yay ve çubuklar boştan dolar. Koç tarafı bunlardan
  yalnız kart girişi ve düğme basmayı alır; Bugün sade kalır. Hepsi
  `prefers-reduced-motion` ile kapanır.
- **İki rol, iki sıcaklık.** Koç lacivert (araç), öğrenci sıcak
  mürekkep + krem kâğıt (`body[data-rol='ogrenci']`, tema.css).
  Öğrencide Çizbi'nin cümlesi beyaz balonda, Sıradaki kartı dersin
  renginde çerçeveli beyaz kart, görev satırları dersin açık tonunda —
  renk süs değil, ders kimliği (`dersGorunumu`).
- **Boş durum bir davet.** `Bos` bileşeni Çizbi'nin 48px hâlini ve
  isteğe bağlı `eylem` düğmesini alır; metin suçlamaz ("Henüz X yok"
  değil, "X girilince burada belirir"). Tek satırlık boşluklarda
  `ruh={null}`. Grafik boşsa eksen çizilmez, `Bos` gösterilir.
- **Rozet cümle düzeninde,** 20px sabit yükseklik; durum rozetlerinde
  (yolunda/izle/acil) solda 6px nokta.

## Genişlik

Platform değil genişlik dinlenir. Üç kesme noktası, yalnız `src/yerlesim.css`'te
yazılır (medya sorgusu değişken okuyamaz): dar `< 40rem` telefon (alt çubuk),
orta `40–64rem` tablet dikey (ortada toplanmış alt çubuk), geniş `≥ 64rem`
masaüstü ve yatay tablet (sol koyu yan çubuk, üst şeritte yalnız zil/hesap,
içerik sola yaslı 56rem, yapraklar ortadan pencere). Geniş ekranda koç iki
sütun görür (`useGenisEkran`, `.iki-sutun`): Bugün'de solda karar kuyruğu,
sağda öğrenci listesi; Öğrenciler'de solda liste, sağda seçilen öğrenci
(listeden seç, yanda aç). Öğrencinin Bugün'ü genişte iki sütun: solda
sıradaki, sağda günün geri kalanı. `yerlesim.css` yalnız
kabuğu yerleştirir; renk, punto, bileşen oraya girmez. Her UI değişikliği üç
genişlikte (390 / 820 / 1366) doğrulanır.

## Telefon

- Dokunma hedefi 44px. Görünen boyutu küçük kalması gereken düğmeler
  `sistem.css`'teki listeye eklenir; görünmez `::after` halkası hedefi
  büyütür, JSX'e sınıf eklenmez.
- `:hover` kuralı `@media (hover: hover)` içine yazılır; dışarıda kalan
  hover telefonda dokunulan düğmeyi vurgulu bırakır.
- Bağlantı kopunca `BaglantiSeridi` üst şeridin altına iner (amber);
  gelince iki saniye yeşil onay. Kayıt kuyruğu yoktur.

## Kontrast eşiği

- Metin: 4.5:1
- Nokta, çubuk, kenar gibi grafik öğeler: 3:1

Amber üç değerlidir çünkü üç ayrı iş yapar: `--g-amber` fosforlu vurgu
(parlak olmak zorunda, üstüne koyu mürekkep gelir), `--g-amber-cizim`
nokta ve çubuk için, `--g-amber-metin` yazı için. Yazıya parlak amber
verirsen beyazda 2.2:1 çıkar ve okunmaz.

## İki tuzak

**Çıplak eleman seçicisiyle boyut verme.** `button { min-height: 44px }`
gibi bir kural yazma. Panelde küçük ve yuvarlak olması gereken kontroller
var — optik form baloncukları 14px, görev tikleri 22px — ve böyle bir kural
onları 44px'e uzatıp daireden yumurtaya çeviriyor. Küçük yuvarlak
kontroller dokunma alanını **boyutlarını büyüterek değil**, görünmez bir
`::after` halkasıyla taşır. Hazır yardımcı var: `.dokun-halka`.

**Eylem rengini süs olarak kullanma.** Mavi "dokunulabilir" demek. Her
kartın üst kenarına ya da her başlığa çekersen o anlamı kaybeder ve
gerçekten dokunulabilir olan şey öne çıkmaz. Aynı şey kırmızı için de
geçerli: kırmızı yalnızca ACİL demek, dekoratif çizgi olamaz.

## Dağıtım

Tek canlı adres: `https://khkocluk.com` (www ile birlikte).

Cloudflare Workers Builds repoya doğrudan bağlı. `main`'e push atınca
Cloudflare kendisi derleyip yayınlar — GitHub Actions'ta dağıtım iş akışı
yoktur, aramaya gerek yok. Bir push'un yayına çıkıp çıkmadığını commit
üzerindeki **`Workers Builds: yks-kocluk`** kontrolünden görürsün.

Değişikliği göremiyorsan önce service worker önbelleğini temizle:
adresin sonuna `?sifirla=1` ekle. Üst bardaki sürüm damgası derleme
saatini verir; beklediğin saatse yeni sürüm sendedir.
