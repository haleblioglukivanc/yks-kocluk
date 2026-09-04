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
yazılmaz. Gece moduna geçince de kendiliğinden doğru tonu alır.

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

## Gündüz / gece

`App.jsx` `body`'ye `data-mod` yazıyor; seçim `localStorage`'da kalıyor,
seçim yoksa cihazın sistem tercihi geçerli.

Yeni bileşen için gece modu **ayrıca yazılmaz**. `--d-*` ve yüzey
tokenlarını kullandığın sürece iki modda da doğru çalışır. Eğer bir
bileşen için gece kuralı yazmak zorunda kaldıysan, o bileşen bir yerde
sabit renk kullanıyordur.

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

Tek canlı adres: `https://yks-kocluk.haleblioglukivanc.workers.dev`

Cloudflare Workers Builds repoya doğrudan bağlı. `main`'e push atınca
Cloudflare kendisi derleyip yayınlar — GitHub Actions'ta dağıtım iş akışı
yoktur, aramaya gerek yok. Bir push'un yayına çıkıp çıkmadığını commit
üzerindeki **`Workers Builds: yks-kocluk`** kontrolünden görürsün.

Değişikliği göremiyorsan önce service worker önbelleğini temizle:
adresin sonuna `?sifirla=1` ekle. Üst bardaki sürüm damgası derleme
saatini verir; beklediğin saatse yeni sürüm sendedir.

## Anlık bildirim
Web push; mağaza gerekmez. Ayrıntı: `supabase/functions/bildirim-gonder/README.md`.
Kuyruk deseni mail ile aynı: tablo → cron dürtmesi → edge function → `sistem_gunlugu`.
Kural: cron "başarılı" demesi işin yapıldığını göstermez; kuyruğun boşalıp boşalmadığına
bakılır (`bildirim_gondericiyi_durt` 1 saatten eski bekleyen görürse günlüğe yazar).
