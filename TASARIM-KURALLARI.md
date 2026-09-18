# Tasarım Kuralları — Tek Dil

Bu dosya koç, öğrenci ve veli ekranlarının tamamı için geçerlidir. Yeni bir ekran ya da düzeltme bu kurallara uymuyorsa canlıya gitmez. Amaç: uygulama her yerde tek parça (yekpare) görünsün ve bir yerde yapılan düzeltme her yere kendiliğinden yansısın.

Referans: "Koç · Öğrenci ekranı — önce / sonra" mokapı (18 Eylül 2026).

---

## A. Görsel kurallar

**1. Tek yüzey katmanı.**
Sayfada iki seviye vardır: zemin ve üzerindeki yüzey. Yüzeyin içinde ikinci bir yüzey (kutu içinde kutu) olmaz. İçerideki ayrımı üç şey yapar: boşluk, ince çizgi (`--cizgi`) ve yazı ağırlığı.

**2. Kenarlık yalnız dokunulan şeyde olur.**
Giriş alanı, ikincil düğme ve seçilebilir öğe kenarlık alabilir. Bilgi gösteren alan (istatistik, açıklama, boş durum) kenarlık ya da gölge almaz.

**3. Üst bölge tek parça olur.**
Her rolde ekranın başı tek bir koyu bloktur (`UstBlok`). Header, bağlam (kişi adı ya da sayfa başlığı), özet satırı, uyarı, birincil eylem ve sekmeler bu bloğun içindedir. Kenardan boşluklu, havada duran bir kart kullanılmaz.

**4. Sekmeler alt çizgili yazıdır.**
Kutu düğme şeklinde sekme olmaz. Tek bileşen (`Sekmeler`) iki varyantla kullanılır: koyu blok içinde ve açık zeminde.

**5. Boş durum kart değildir.**
Başlık ya da en fazla bir cümle, altında tek bir düğme. Kart, çerçeve ya da uzun açıklama kullanılmaz.

**6. İçerik alanında tek birincil eylem olur.**
Zeminde dolu düğme bir tanedir (üst bloktaki vurgulu eylem, örn. Mesaj, bunun dışındadır). Diğer eylemler yazı düğmesidir ("+ Ekle"). Yüzen yuvarlak artı düğmesi kullanılmaz.

**7. Önemli bilgi rozetin içinde saklanmaz.**
Uyarı, önündeki renkli noktayla birlikte düz metin olarak yazılır. Aynı bilgi ilgili yerde de renkle tekrar görünür (örnek: hafta şeridinde geciken günler kırmızı yazılır).

**8. Bölümün kalıbı sabittir.**
Bölüm = başlık satırı (solda başlık, sağda yazı eylemi) + bir satır açıklama + içerik. Bölümleri birbirinden ince çizgi ya da boşluk ayırır, kutu ayırmaz.

**9. Rol yoğunluğu değiştirir, dili değiştirmez.**
Koç masaüstünde yoğun (tablo, iki sütun), öğrenci tek işe odaklı, veli tek sayfa görür. Ama üçü de aynı bileşenleri, aynı renkleri ve aynı boşlukları kullanır. Fark yalnız yoğunluk tokenıyla ve düzenle yaratılır.

**10. Yönetim ve teknik ekranlar günlük işe karışmaz.**
Koçlar, Tahsilat, Sosyal ve Sistem gibi ekranlar hesap menüsünün arkasındaki "Yönetim" alanındadır. Zamanlanmış görevler (cron) listesi yalnız yönetim ekranında görünür.

**İstisnalar:** Çizbi balonu ve yaprak/pencere (modal). Yaprak kendi başına bir yüzeydir; içinde yine kart olmaz.

---

## B. "Bir düzeltme her yere yansısın" mekanizması

Kurallar tek başına yetmez. Aynı şey iki yerde ayrı ayrı yazılırsa zamanla iki farklı hâle gelir. Bu yüzden:

**1. Aynı kavram = tek bileşen.**
Ortak bileşenler `src/ortak/` altında durur ve her rol yalnız bunları kullanır:

- `UstBlok` — ekranın koyu başı (header'a bitişik; `sekmeli` ise sekmelerle biter) ✓
- `Sekmeler` — alt çizgili sekmeler (`varyant="koyu"` / `"acik"`) ✓
- `GunSeridi` — hafta şeridi; koçta da öğrencide de birebir aynı (`gecikmeVurgusu`, `damga`) ✓
- `BosDurum` — bir cümle + tek düğme ✓
- `Bolum` — başlık + yazı eylemi + açıklama + içerik (`cizgili`) ✓
- `UyariSatiri` — nokta + düz metin (`durum="acil|izle|iyi|notr|kapali"`) ✓
- `ListeSatiri` — öğrenci, görev, bildirim satırları (sonraki tur)

Hepsi `src/ortak/` altında, stilleri tek dosyada: `src/ortak/ortak.css`.
(`Ortak.jsx` içindeki `Uyari` hata kutusudur; durum satırı için `UyariSatiri` kullanılır.)

Rol klasöründe bunların benzeri yeniden yazılmaz. Rol farkı bileşene prop olarak verilir (`yogunluk="koc"`, `varyant="koyu"` gibi).

**2. Yüzey tokenları sabit ve az.**
`tema.css` içinde yalnız üç yüzey tanımı olur: `--zemin`, `--yuzey`, `--ust-blok`. Yeni bir arka plan rengi eklemek bu dosyada değişiklik gerektirir; bileşen içinde elle renk verilmez.

**3. Makine denetimi (Tur 0'a eklenir).**
`denetim/` taramasına şu kontroller eklenir ve bulgular `DENETIM.md`'ye yazılır:

- iç içe yüzey (yüzey sınıfı taşıyan öğenin içinde yine yüzey sınıfı)
- bilgi alanında `border` ya da `box-shadow`
- ekranda birden fazla dolu birincil düğme
- rol klasöründe ortak bileşenin kopyası (hafta şeridi, sekme, boş durum benzeri yapılar)
- `src/ortak/` dışından tanımlanmış yüzey rengi

---

## C. Uygulama sırası

1. ✓ Ortak bileşenler çıkarıldı (18 Eylül 2026).
2. ✓ Koçun öğrenci ekranı mokaptaki "Sonra" hâline getirildi; Yönetim sekmeleri de `Sekmeler`'e geçti (18 Eylül 2026).
3. Öğrenci ekranları aynı bileşenlere geçirilir (görünüm büyük ölçüde korunur, yalnız kaynak ortaklaşır).
4. Koç Bugün: yönetim düğmeleri hesap menüsüne taşınır, istatistik kartları üst bloğun özet satırına iner.
5. Rapor ve veli ekranları.
6. Yönetim alanı (`/yonetim`): Koçlar, Tahsilat, Sosyal, Sistem.
7. Denetim kontrolleri eklenir ve tek Playwright koşusuyla üç genişlikte doğrulanır.

Her adım ayrı bir oturumda yapılır ve sonucu `DURUM.md`'ye yazılır.
