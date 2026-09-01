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
