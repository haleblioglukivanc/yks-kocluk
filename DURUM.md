# Proje Durumu

Son güncelleme: 19 Eylül 2026 (oturum özeti)

Bu belge, çalışmaya yeni bir oturumda devam edebilmek için yazıldı. Neyin hazır
olduğunu, hangi kararların neden alındığını ve nelerin açık kaldığını anlatır.

---

## 22 Eylül 2026 — Profile girildiği belli olsun

- Bekir: geçişler çok hızlı, profile girildiği anlaşılmıyor. Koç ve öğrenci profilinde (`.profil-modu`) sahnenin alt yarısı akşam gibi kararıyor (girişte 0,5 sn'de koyulaşır, profilde öyle kalır); altındaki kartlar sırayla aşağıdan süzülerek geliyor. Hareket azaltma açıksa animasyon yok, kararma sabit.

## 22 Eylül 2026 — Koç fotoğrafı görünmüyordu; WhatsApp gibi kırpma

- Hata: koçun yüklediği fotoğraf depoya ve profile yazılıyordu ama oturumdaki profil sorgusu `fotograf_yolu` (ve `telefon`) okumuyordu; ekran hep baş harf gösteriyordu. `lib/oturum.js` sorgusuna eklendi. Aynı sebeple eski dosya silinemedi: Kıvanç'ın klasöründe iki fazla kopya var (`portre-1789995301161.jpg`, `portre-1789995316615.jpg`), panelden silinebilir.
- `FotoKirpici` (Fotograf.jsx): fotoğraf seçilince tam ekran pencere; yuvarlak dairenin altında sürükleme, iki parmakla / kaydırıcıyla / tekerlekle büyütme (1–5x), büyütürken daire ortası sabit, resim daireyi hep kaplar. "Kullan" yalnız seçilen kareyi 320px JPEG yapıp yükler. Öğrenci ve koç fotoğraflarında aynı.

## 22 Eylül 2026 — Fotoğraflar hızlı ve her yerde; sahne çizimleri büyüdü

- Fotoğraflar zaten küçültülüyordu (512px); sorun her açılışta yeni imzalı bağlantı üretilmesiydi (önbellek tutmuyor, resim parça parça iniyordu). `useFotograf`: aynı yol için bağlantı 50 dk hatırlanıyor, fotoğraf tamamen inmeden gösterilmiyor (o ana kadar baş harf), sonra yumuşakça beliriyor. Yeni yüklemeler 320px, JPEG 0.82 (~20–30 KB).
- Fotoğraf artık Öğrencilerim satırındaki halkada, Mesajlar kişi satırında ve tabelaya asılı baş harflerde de görünüyor (profiller.fotograf_yolu ayrıca okunuyor).
- Tabela, posta kutusu, fotoğraf çerçeveleri ve çan ~%25 büyük.
- Ağustos'tan kalma, hiçbir profile bağlı olmayan 1,3 MB'lık dosya (`101ac9a4-…/portre-1788072121141.jpg`) SQL'den silinemiyor (Storage API gerekli); Supabase panelinden Storage > ogrenci-foto'dan elle silinebilir.

## 22 Eylül 2026 — Koçun profil sayfası, KH düğmesi kalktı

- Bekir: köşedeki KH düğmesi yerine öğrenci profilindeki mantık. Koçun ana ekranında sağda ağaçların önünde Kıvanç'ın fotoğraf çerçevesi (yoksa baş harfleri; kenar mevsim vurgu rengi). Çerçeveye ya da selama dokununca `/profil` açılır; profilde çerçeveye dokununca ana ekrana döner.
- `KocProfili.jsx`: aynı sahneli tepe (ad, "Koç" / "Koç · Yönetici", Profil etiketi). Bölümler: Bilgilerim (fotoğraf ekle/değiştir/kaldır, ad soyad + telefon düzenle, e-posta), Görünüm (mevsim teması), Koçluk araçları (Konu öncelikleri, Kaynaklar, Telegram), Uygulama (bildirimler, yükle, yenile), Hesap (şifre, yöneticiye Yönetim/Koç görünümü, çıkış), sürüm.
- Koçta KH düğmesi hiçbir ekranda yok; eski üst şeritli sayfalardaki hesap düğmesi de /profil'e gider. Öğrenci ve velide hesap yaprağı şimdilik duruyor (öğrenci ekranlarında aynısı yapılacak).
- Fotoğraf için veritabanı değişikliği gerekmedi: `ogrenci-foto` kovası kişinin kendi klasörüne yazmaya ve okumaya zaten izin veriyor; profiller kendi satırını güncelleyebiliyor.

## 22 Eylül 2026 — Öğrenci ekranının sekme içleri yeni dilde

- Bekir: doğrudan. `.od-govde` kapsamında (yalnız koçun öğrenci ekranı): bölüm başlıkları zeminde Fraunces 1.3rem, çizgili ayraçlar kalktı (boşlukla ayrılıyor), görev listesi / formlar / deneme ve konu listeleri beyaz kâğıt kart (22px), hap düğmeler; hafta şeridi beyaz kart, bugün mürekkep renginde, seçili gün yumuşak ton, yapışkan şerit güvenli alanın altında. Bileşenlerin içi ve davranışı değişmedi.

## 22 Eylül 2026 — Bildirimler yeni dilde

- Bekir: aynı dille doğrudan. Ortak sahneli tepe ("Bildirimler", öğrencide "Gelen kutusu"), sağda ağaçların önünde direğe asılı çan (`CanCizimi`; bekleyen varsa arada sallanır, üstünde sayı; mevsim süsleri). Liste iki grup: "Senden bekleyenler" (okunmamış mesaj → doğrudan o yazışma, karar kartı → Yapılacaklar) ve "Son 7 gün" (bildirim kuyruğu; yeniler noktalı, okunmuşlar soluk). Durum rengine göre simge dairesi.

## 22 Eylül 2026 — Mesajlar yeni dilde

- Mokap onaylı. `Mesajlar.jsx`: ortak sahneli tepe (başlık "Mesajlar", okunmamış cümlesi; sağda gökyüzünde süzülen kâğıt uçak `UcakCizimi`, üstünde okunmamış sayısı). Koçta arama + Tümü / Okunmamış / Veliler süzgeci; kişi satırları (baş harf, rol etiketi, önizleme, saat, okunmamış rozeti; okunmamışlar üstte).
- Yazışma aynı sayfada: tepe kısalır (`AnaTepe kisa`), başlık kişinin adı; balonlar gün ayraçlı (benim koyu sağda, karşı taraf açık solda); düzenle / geri al (24 saat) aynı; koçta hazır cevaplar (dokununca yazma kutusuna düşer); yapışkan yazma kutusu. Geri: yazışmadan kutuya, kutudan ana ekrana; öğrenci ekranından gelindiyse oraya.
- Koç ve öğrencide /mesajlar üst şeritsiz (ana sayfa kabuğu).

## 22 Eylül 2026 — Deneme öğrencisi: Bekir Yılmaz

- Kıvanç'a bağlı deneme öğrencisi açıldı: Bekir Yılmaz (`bekiryilmaz@msn.com`, 12. sınıf sayısal, katalog 1; şifre sohbette Bekir'e verildi, repoya yazılmadı; ilk girişte şifre değiştirme istenmez).
- Örnek veri (tetikleyiciler kapalı eklendi, kimseye bildirim gitmedi): 15–22 Eylül arası 20 görev (bitmiş / yarım / bekleyen karışık, bugün 4 iş), 12 sayaç oturumu, 16 konu ilerlemesi, 2 TYT denemesi (13 ve 20 Eylül, sonuçlar ve konu hataları), 2 hata defteri kaydı, 3 günlük seri, koçtan 1 okunmamış mesaj.
- Gerçek veri geldiğinde bu hesap Yönetim'den silinmeli.

## 22 Eylül 2026 — Tepedeki mevsim adı kalktı

- Bekir: mevsim adının ekranda yazmasına gerek yok. "Sonbahar" hapı kalktı, yalnız tarih kaldı (sahne mevsimi zaten gösteriyor). Mevsim seçici hesap menüsünde duruyor.

## 22 Eylül 2026 — Fotoğraf çerçevesi iki yönlü

- Öğrenci ekranında çerçeve profili açar, profilde öğrenci ekranına geri götürür. Çerçeve aslında hiç dokunulamıyordu: tepedeki yazı katmanı (`.ana-tepe-ic`) üstüne biniyordu; `.ana-tepe-cizim` artık z-index 2.

## 22 Eylül 2026 — Öğrenci profil sayfası yeni dilde

- Tepe öğrenci detayıyla aynı: sahne, tek satır ad, sınıf/alan, "Profil" etiketi (erişim kapalıysa "Erişim kapalı"), sağda fotoğraf çerçevesi; geri öğrenci ekranına döner (`ProfilPortresi`, `AnaTepe`).
- Altı: künye satırı (kayıt tarihi, kaç gündür birlikte), bölümler (İletişim, Sınav ve hedef, Ödeme, Hesap) Fraunces başlık zeminde + beyaz kâğıt kart, çerçeveli hap "Düzenle"; silme en altta kapalı "Tehlikeli işlemler" satırında. İçerik ve formlar aynı.
- Tepedeki başlık her ekranda tek satır (telefonda 1.9rem).

## 22 Eylül 2026 — Öğrenci detayında fotoğraf çerçevesi, kısa durum

- Tabelanın yerinde, ağaçların önünde direğe asılı yuvarlak çerçeve (`PortreCizimi`): öğrencinin fotoğrafı (`useFotograf`, imzalı bağlantı), yoksa baş harfleri; kenarı risk renginde; üstü/dibi mevsime göre (kar, yaprak, çiçek, ot). Dokununca profil sayfası (fotoğraf yükleme orada).
- Durum etiketi tek kısa bilgi, öncelik sırasıyla: erişim kapalı → bugünkü temas ("Bugün mesaj attın", yeşil) → hiç başlamadı → "N gündür yok" → "N iş gecikti" → "N gündür eksik" → düşük net → Yolunda/İzle/Dikkat. Uzun `sebepCumlesi` bu ekrandan kalktı (listede ve karar kartında duruyor).

## 22 Eylül 2026 — Öğrenci detayı sadeleşti

- Bekir: ad zaten kocaman yazıyor, tabelaya gerek yok; %56 / seri / son net şeridine gerek yok. Tabela kalktı (yerine mevsim dalı), ölçü şeridi kalktı; haftalık yüzde alt başlığa taşındı ("12. sınıf, Sayısal · bu hafta %56"), son net Denemeler'de, gecikme durumu etiketinde.
- Telefonda bütün `.ana-tepe`'ler 21rem: ana ekran, Öğrencilerim, Yapılacaklar ve öğrenci detayı aynı boy.

## 22 Eylül 2026 — Tepe her ekranda aynı boy

- Öğrenci detayında uzun ad üç satıra, uzun durum cümlesi iki satıra kırılıp tepeyi büyütüyordu. Ad ve durum tek satır (sığmazsa üç nokta), ad tam genişlik (tabela ağaç hizasında olduğu için çakışmıyor). Ana ekran, Öğrencilerim, Yapılacaklar ve öğrenci detayında tepe aynı yükseklikte. Ölçü şeridindeki %56 da artık diğer sayılarla aynı puntoda.

## 22 Eylül 2026 — Koçun öğrenci detayı yeni dilde

- Mokap onaylı. `OgrenciKimlikKarti` koyu kimlik kartı yerine ortak sahneli `AnaTepe` çiziyor: sol üstte geri (→ /ogrencilerim), büyük ad + "11. sınıf, sayısal ›" (dokununca profil), durum etiketi (risk ya da bugünkü temas), sağda ağaçların önünde öğrencinin tek tabelası (adı + risk halkalı baş harfleri). Altında tek satır eylem (Mesaj, Görüştük, gözüyle), üç ölçü şeridi (bu hafta %, seri, son net ▲▼), bölüm anahtarı (Program / Denemeler / Konular; eski koyu sekmelerin yerine).
- `AnaTepe` yeni `onBaslik`, `altBaslik`, `durum` seçeneklerini aldı. Geniş ekranda /ogrenci/:id artık tek sütun (liste + detay ikilisi yalnız /ogrenciler'de). Program, Denemeler, Konular, Kaynaklar, Notlar ve profil sayfasının içi değişmedi.
- `.ana-govde` esnek `.panel` içinde daralıyordu: `width: 100%`.

## 22 Eylül 2026 — Görüştük düğmesi kalktı, çizimler ağaç hizasında

- Bekir yanlışlıkla Berçem için "Görüştük"e bastı (üç kayıt, 13:24); `koc_gorusmeleri` id 2, 3, 4 silindi. Öğrencilerim satırındaki tik düğmesi kaldırıldı; satırda yalnız mesaj düğmesi var (görüşme kaydı öğrenci detayındaki "Görüştük"ten).
- Tabela ve posta kutusu ağaçların hizasına indi, ağaçların önünde duruyor (`.ana-tepe-cizim` alttan %4–6).

## 22 Eylül 2026 — Öğrencilerim yenilendi, çizimler tepelere indi

- Mokap onaylı ("Ok"). `OgrenciNabzi.jsx` yeniden yazıldı: satırda ders şeritleri yok (bugünün işleri öğrenci detayında). Her satır: bugünün ilerleme halkası (risk renginde), tek satır durum (son giriş ya da bugünkü temas: "Mesaj atıldı · 10:12"), 7 günlük ritim + "bugün x / n iş", sağda mesaj (→ /mesajlar/:id) ve Görüştük (`koc_gorustum`, telefon) düğmeleri.
- Eski listeden geri gelenler: her zaman görünen arama; süzgeçler (Tümü / Önce bunlar / Bugün girmeyenler / Plansız, sayılı); toplu mesaj kartı (öncelikli ve bugün dokunulmamış öğrencilere `TopluDurtme`); Önce bunlar / İzle / Yolunda grupları. Renk açıklaması kapalı "Halka ve noktalar ne anlatıyor?" satırında.
- Yapılacaklar'daki posta kutusu ve Öğrencilerim'deki tabela gökyüzünden indi, tepelerin üstünde duruyor.

## 22 Eylül 2026 — Yapılacaklar ve Öğrencilerim ana ekranla aynı

- Bekir: bu ekranların tasarımı çok değişmesin, ekran aynı kalsın; Yapılacaklar'da posta kutusu, Öğrencilerim'de tabela sahnenin sağ üstüne çıksın, içerik altta yine olsun. Yeni mokap (açılır kartlar, toplu veli onayı) istenmedi.
- İki ekran da ana ekranın sahneli tepesini kullanıyor (üst şerit gizli); `AnaTepe` yeni `onGeri` (sol üstte geri) ve `sagCizim` (sağ üstte nesne; mevsim dalının yerine) aldı. Tepede başlık + tek cümle; altta Yapılacaklar'da KararKuyrugu + VeliMesajlari, Öğrencilerim'de OgrenciNabzi.

## 22 Eylül 2026 — Kapı kartlarında tabela ve posta kutusu

- Bekir: "tabela ve kutu çok tatlıydı, kartlara koyalım". `src/ortak/KapiCizimleri.jsx`: Öğrencilerim kartında tabela ("N öğrenci", altında risk halkalı baş harfler, 3'ten fazlası +N), Yapılacaklar kartında posta kutusu (iş sayısı; acil varsa kırmızı; iş varken bayrak kalkık ve sallanır, yoksa iner). Kartın üstünde küçük mevsim zemini ve süsü (kar, çiçek, ot, yaprak). Tepedeki gri gölge (sis) de kaldırıldı.

## 22 Eylül 2026 — Koç ana ekranı: kapı kartları

- Bekir'in kararı: tepe eski haliyle (sahne, selam, tek cümle); tabela/posta kutusu kalktı (`SahneKapilari.jsx` silindi). Dikkat gerektirenler'in yerinde iki kart: Öğrencilerim (risk halkalı baş harfler, en fazla 4 + "+N") → `/ogrencilerim`, Yapılacaklar (üst üste kart çizimi, iş sayısı; acil varsa kırmızı) → `/yapilacaklar`. Öğrencinin Yol/Denemeler kartlarıyla aynı kalıp (`.ana-kapi`).
- Altta Gidişat eski haliyle (ikonlu, pastel 2×2 kartlar, Bugün/7 gün/30 gün). "Son 7 gün çalışma" çubukları kaldırıldı.

## 22 Eylül 2026 — Tabela/posta kutusu geri geldi, koça mevsim teması seçici

- Bekir önce geri aldırdı, sonra "o tasarım güzeldi" dedi: koç ana ekranındaki tabela + posta kutusu yeniden canlıda.
- Hesap yaprağında yalnız koçta "Mevsim teması": Otomatik (tarihe göre) / İlkbahar / Yaz / Sonbahar / Kış. Seçim o cihazın localStorage'ında (`mevsim-onizleme`), öğrencileri etkilemez; yaprak açık kalır, değişim arkada hemen görünür.

## 22 Eylül 2026 — Koç ana ekranı: kapılar sahnenin içinde

- Bekir kart tabanlı dashboard mokaplarını reddetti ("mevsimleri yaptık, yukarı kartları eklersen tasarımın ne anlamı kalır"); onaylanan yön: gezinme sahnenin içinde.
- `src/ortak/SahneKapilari.jsx`: manzaranın ön planında patika, solda "Öğrenciler" tabelası (baş harfler risk renginde halkayla asılı, 3'ten fazlası "+N"), sağda Yapılacaklar posta kutusu (üstünde iş sayısı; iş varken kırmızı bayrak kalkık ve arada sallanır, iş yoksa iner). Süsler mevsime göre: kış kar, ilkbahar çiçek, yaz ot, sonbahar yaprak. Ön plan zemini tam genişlik (`--m-on-zemin`, `--m-patika`).
- Tabela → `/ogrencilerim` (OgrenciNabzi), posta kutusu → `/yapilacaklar` (KararKuyrugu + VeliMesajlari). İkisinde de üst şeritte geri düğmesi ana ekrana döner.
- Sahnenin altı: Gidişat tek şerit (dört sayı) + "Son 7 gün çalışma" çubukları; veri başlangıcından önceki günler taralı "veri yok" kutusu.
- Tepedeki cümle bekleyen işten: "5 iş bekliyor, 2 tanesi acil. Önce Berçem."

## 22 Eylül 2026 — Sahne hafifletildi

- Sayfa boyu düşen parçacıklar kaldırıldı; yaprak/kar/çiçek yalnız tepedeki manzaranın içinde düşer ve tepenin altında kaybolur (Bekir: "kartların altına girince kaybolsun, en aşağı inmesine gerek yok, sistemi yormayalım").
- Manzara animasyonları tepe ekrandan çıkınca ve sekme arka plandayken durur (IntersectionObserver + SVG pauseAnimations).
- Kartlardaki buzlu cam (backdrop-filter) kaldırıldı, kartlar %94 opak; zemin arka planı artık sabit değil (iOS'ta kaydırmayı yoruyordu). Ekranın dibindeki ufuk hareketsiz kaldı.

## 22 Eylül 2026 — Koç ana ekranı toparlandı (telefon)

- Üstteki boş bant: iOS'ta durum çubuğu "default" olduğu için saatin altında buzlu bir şerit kalıyordu. `apple-mobile-web-app-status-bar-style` → `black-translucent`; sahne saatin altına kadar uzanıyor, beyaz saat okunsun diye tepede hafif gölge. Ana ekrana eklenmiş uygulamada değişikliğin görünmesi için uygulamayı kapatıp açmak (gerekirse yeniden eklemek) gerekebilir.
- Telefonda sıra: Dikkat gerektirenler → Öğrencilerim → Gidişat.
- Karar kuyruğu ana sayfada `kompakt`: "Sırada N iş daha" tek satır, dokununca açılır.
- Öğrencilerim telefonda satır başına iki sıra (kim + 7 günlük ritim + sayı; altında işler yana kayan tek şerit). Arama 6 öğrenciden fazlaysa çıkar; süzgeç "Tümü / Dikkat".
- Gidişat telefonda sıkı 2×2; tepe kısaldı, slogan yalnız masaüstünde, telefonda mevsim hapı ve tarih tek satır.

## 22 Eylül 2026 — Mevsimsel tasarım: sahne (koç ana ekranı)

- Bekir'in geri bildirimi: mevsim yalnız üst barda gibi duruyordu; brifte uygulama komple bir sahnenin içindeydi.
- `src/ortak/MevsimSahnesi.jsx`: sayfanın arkasında sabit katman — mevsim tonlu zemin, ekran dibinde soluk ufuk, bütün ekrana yayılan 8 parçacık (yaprak / kar / çiçek yaprağı / ışık); hareket azaltmada parçacık yok. App'te bir kez çiziliyor, bütün panel ekranlarında geçerli.
- Tepe kart olmaktan çıktı: yuvarlak alt köşe yok, manzara alt ve üst kenardan sahneye eriyor, yazı gökyüzünde, tepeler altında. Sağ üstte mevsim dalı (`MevsimDali`), tarihin üstünde mevsim hapı ("Sonbahar, Odaklan, derinleş, güçlen.").
- Kartlar yarı saydam buzlu kâğıt; Gidişat kartları ikonlu ve her biri mevsim paletinden kendi pastel tonunda.
- Karar kartları yeni dile çekildi (yalnız ana sayfada, `.dikkat` altında): sol renk çizgisi yok, tür büyük harf yerine hap, öğrenci adı mürekkep (iOS'ta mavi görünüyordu), ikincil düğmeler çerçeveli.
- Özet cümlesi: hiç öğrenci yolunda değilse "0 tanesi" yerine "hepsi bugün bir göz istiyor".

## 21 Eylül 2026 — Mevsimsel tasarım, 1. adım (menüsüz ana sayfalar)

- Referans: Bekir'in "Mevsimsel UI/UX Brifi v2" ve onaylanan kanvas mokabı. Eski rol renkleri (koç lacivert / öğrenci amber) bırakıldı; tek tasarım dili.
- `src/lib/mevsim.js`: mevsim tarihten (Mar–May ilkbahar, Haz–Ağu yaz, Eyl–Kas sonbahar, Ara–Şub kış); önizleme `?mevsim=kis`, geri `?mevsim=otomatik`. Kök etikete `data-mevsim` yazılır.
- `src/mevsim.css`: dört mevsim paleti (`--m-*`) paneldeki anlam tokenlarını ezer (kagit, yuzey, murekkep, cizgi, tepe-ust…). Durum üçlüsü sabit (acil #be2847, dikkat #8f5a00, yolunda #2d7a4e). Eylem = mürekkep. Başlık Fraunces, metin/sayı Manrope.
- `src/ortak/Manzara.jsx`: dört mevsim SVG manzarası, hareket azaltmada durağan. `AnaTepe.jsx`: iki rolün ortak tepesi (manzara, marka, zil, hesap, selam, tek cümle özet). `Gidisat.jsx`: Bugün / 7 gün / 30 gün kartları; veri başlangıcından önceki günler çizilmez, 30 gün dolmadan "şu tarihte dolar" yer tutucusu.
- Alt menü ve masaüstü yan çubuk kaldırıldı. Rapor sekmesi, KocPaneli, KocBasligi, SinifOzeti, BugunCalisanlar ve OgrenciBasligi silindi. Alt ekranlardan dönüş üst şeritteki geri düğmesiyle.
- Koç ana sayfası (`KocAnaSayfa.jsx`): tepe → Dikkat gerektirenler (KararKuyrugu + VeliMesajlari) → Gidişat (`rapor_ozeti`) → Öğrencilerim (`OgrenciNabzi.jsx`: bugünün işleri, 7 günlük ritim, arama, dikkat süzgeci).
- Öğrenci ana sayfası (OgrenciPaneli bugün): tepe (acil görüşme sağ üstte) → hafta şeridi → koç notu → Şimdi (SiradakiKart + Günü tamamla) → Gidişatın → Yol / Denemeler kapıları → söz, kitap, kaynaklar.
- Çizbi ana sayfalarda şimdilik yok (yeri sonra kararlaştırılacak). Sıradaki: kitap/söz kütüphanesinin Yönetim'e taşınması, detay sayfalarının (öğrenci detayı, Yol, Denemeler) aynı iskelete çekilmesi.

## Oturum özeti — 18–19 Eylül 2026 (tasarım turu + Yönetim paneli)

**Tasarım** (`TASARIM-KURALLARI.md`, `TESPIT.md`): 11 kural, `src/ortak/` ortak bileşenleri (UstBlok, Sekmeler, GunSeridi,
BosDurum, Bolum, UyariSatiri, EylemDugmesi). Renk dili: koç ve veli lacivert, öğrenci koyu amber; veri beyaz yüzeyde;
ikincil düğmeler ikonlu. Bütün ekranlar yenilendi: koç Bugün, koçun öğrenci ekranı (4 sekme), Raporlar, öğrenci Bugün/Yol,
Kaynaklar, Veli, Yönetim, Şifre ekranları.

**Yönetim paneli** (`TESPIT-YONETIM.md`, 6/6 tamam): şifre değiştir/sıfırla; koç detayı, durum, kapasite, öğrenci aktarma,
koç silme; sekmeler Koçlar · Öğrenciler ve veliler · Tahsilat · İletişim · İçerik · Teknik; entegrasyon durumları;
erişim günlüğü; başvuru takibi; SMS kaydı; KVKK talepleri ve veri indirme.

**Düzeltilen hatalar**: yönetici koç ekleyemiyordu / silemiyordu (rol → bayrak); şifre değiştirme ekranı yoktu.

**Bekir'in kararları (19 Eylül)**: Demo Koç yönetici kalıyor (şimdilik). Hesap açma/silmede günlükte "sistem" yazması
kabul. **SMS kapandı**: kendi başlık alınmayacak; veli özetleri kalıcı olarak koçun WhatsApp'ından.

**Sıradaki olası işler**: Kıvanç'ın Yönetim turu ve geri bildirimi; anlık bildirimin telefonda denenmesi; koç masaüstünde
"Excel gibi" öğrenci × gün tablosu (Kıvanç'ın isteği); `denetim/`'e tasarım kuralı kontrolleri (TASARIM-KURALLARI C.7).

## 19 Eylül 2026 — Haftanın kitabı ve sözü öğrenciye özel

Bekir'in isteği, mokap onaylı. **Nasıl çalışır:** `private.ilham_onerisi(öğrenci, hafta)` her öğrenci için kitap ve söz
önerir. Kitap: seviye (sınıf ≤ 8 → LGS, değilse YKS; `haftalik_kitap.seviye` lgs/yks/ikisi), haftanın yükü (tatil →
uzun, risk acil/izle ya da hedef ≥ 30 saat → kısa), alan (sayısal → bilim, sözel/EA → Türk edebiyatı/felsefe);
daha önce önerilen (`ogrenci_ilham`) ve okunan (`ogrenci_okuma`) atlanır. Söz teması durumdan: tatil → dinlenme,
yeni → başlangıç, net düştü → hata, sessiz/acil → başlangıç, izle → öz şefkat, ≥ %90 → süreklilik, değilse döner.
**Koç:** kuyrukta haftada tek kart (`tip = 'ilham'`, Cuma–Pazar gelecek hafta, hafta içi bu hafta), öğrenci başına
satır; kitabı kütüphaneden arayarak, sözü temaya göre değiştirir; satır satır ya da "Hepsini onayla"
(`koc_ilham_onayla`). **Öğrenci:** `haftalik_ilham(p_tarih, p_ogrenci)` önce onaylı kişisel seçimi, yoksa genel seçimi
verir; koç öğrenci ekranına girdiğinde öğrencinin kimliği geçilir. Veli, rapor ve tanıtım genel seçimi görür (genel
havuz LGS'ye özel kitapları atlar). **Kütüphane:** 28 → 81 kitap (dünya klasikleri, Türk edebiyatı, bilim/düşünce,
LGS düzeyi), 26 → 44 söz; yeni etiketler `bilim`, `psikoloji`. Migration'lar: `20260919_ogrenci_ilham.sql`,
`20260919_kutuphane_genisleme.sql`, `20260919_kuyruk_ilham.sql`. **Okunan kitap öğrenciye bağlı (aynı gün, Bekir'in isteği):** kitap Yol'un sonunda kayboluyordu; artık öğrencinin
Bugün'ünün sonunda, sözün altında sabit (gün kapansa da durur). `ogrenci_okuma.durum` okuyor/bitti; koç onayı
`private.kitap_ata` ile okunan kitabı atar; okuyan öğrenciye Cuma kartında yeni kitap önerilmez ("Okuyor · N gündür,
kitap aynı kalır"). Öğrenci "Bitirdim" (`ogrenci_kitap_bitir`) → kitap geçmişe, sıradaki kitap öneriden hemen atanır,
koçun iyi haber şeridine tebrik (tip `tebrik`, kaynak `öğrenci|kitap:id`, mevcut tebrik akışı) ve bildirim kutusuna
not. Ayrı akış yok (tanışma kartı, rutin satırı, ilerleme işareti istenmedi). Migration: `20260919_okunan_kitap.sql`.
**Okuma takibi (aynı gün, Bekir onayladı):** Kıvanç'ın Excel'indeki kitap sekmesinin (günlük sayfa takvimi,
başlama/bitirme, puan, sayaçlar) uyarlaması. Günü tamamla 2. adımda çözülen sorunun altında "Bugün kaç sayfa okudun?"
(`BugunOkuma`, `ogrenci_sayfa_kaydet`, tablo `ogrenci_okuma_gunluk`; boş bırakılabilir, son 7 gün yazılabilir).
İlk sayfa girilen gün `ogrenci_okuma.basladi`. Bugün'deki kitap kutusunda ilerleme çubuğu (x/y sayfa); sayfa kitap
uzunluğuna ulaşınca "Bitirdim" birincil olur. Bitirdim'den sonra isteğe bağlı 1–5 yıldız (`ogrenci_kitap_puanla`).
Yol'un sonunda Okuduklarım (`Okuduklarim`, `ogrenci_okuma_ozeti`): kitap, sayfa, kaç günde, yıldız; toplam kitap/sayfa.
Koçun Cuma kartında okuyan öğrencinin satırı "Okuyor · bu hafta 45 sayfa · 45/100" ya da "N gündür sayfa yok".
Excel'deki kitap sekmesi boş şablondu; veri alınmadı (Bekir'in kararı). Migration: `20260919_okuma_sayfa.sql`.
**Açık:** veli raporunda okuma satırı yok.

## 19 Eylül 2026 — Temiz başlangıç: bütün test verisi silindi

Bekir'in isteğiyle bütün demo/test hesapları ve bağlı veriler silindi: Demo Koç/Öğrenci/Veli, 3 demo koç, 34 demo
öğrenci (Kıvanç'a bağlı gerçek hesap Roşin Alp dahil, Bekir'in kararı), 6 demo veli; görevler, denemeler, mesajlar,
sözleşme/tahsilat, görüşme talepleri, bildirimler; başvurular, sosyal yanıt denemeleri, mail/SMS kuyrukları, Çizbi
olayları. Kalanlar: Kıvanç'ın hesabı ve ayarları, müfredat (ders/konu/katalog), kaynaklar, haftalık söz/kitap, günlükler.
Demo Koç'un geçici yönetici yetkisi hesapla birlikte gitti. Yeni test hesabı: **Bekir Yılmaz, Kıvanç'ın öğrencisi**
(`bekiryilmaz@msn.com`; sınav türü/alan/sınıf boş, Kayıt'tan seçilecek). Bu belgedeki demo hesap
adları artık yok.

## 19 Eylül 2026 — Anlık bildirim (web push)

Gelen kutusu (`bildirim_kuyrugu`) aynen duruyor; her satır için "telefona da gitsin mi" kararı tek kuralda:
`private.anlik_mi`. Telefona gitmeyenler `durum='kutu'` (yalnız uygulamadaki gelen kutusunda).

- **Telefona gidenler** (Bekir onayı): koç — mesaj, acil görüşme, ek süre / mazeret, blok 15 dk başlamadı, yeni
  başvuru. Öğrenci — mesaj (randevu mesajı dahil), **ders 15 dk kala** (`ders-yaklasiyor` cron, her dakika, görev
  başına bir kez), haftalık plan onaylandı. Veli yok. Dürtme/motivasyon/Çizbi yok; 20:00 "görev açık" cron'u silindi.
- **Sessiz saatler** 23:00–07:00 (sabaha kayar); acil görüşme ve ders hatırlatması beklemez. Vakti geçen ders
  hatırlatması gönderilmez (`son_gecerlilik`).
- **İkon rakamı** = okunmamış mesaj + okunmamış bildirim (`bildirim_rozet`), uygulamadaki rozetle aynı. iPhone ve
  bilgisayarda görünür; Android'de telefon kendisi yönetir.
- **Gönderici** `bildirim-gonder` (v5, repoda `supabase/functions/bildirim-gonder`) yeniden yazıldı.
- **İstemci**: `src/pwa/bildirim.js` (izin, cihaz kaydı `bildirim_cihaz_kaydet`, ikon rakamı), `public/bildirim-sw.js`
  (service worker'a `importScripts` ile; göster + dokununca ilgili ekran). Davet şeridi yalnız kurulu uygulamada
  (`BildirimDaveti`, rolüne göre metin, bir kez). Hesap → "Bildirimler: Açık/Kapalı". Çıkışta cihaz hesaptan ayrılır,
  izin telefonda kalır; aynı cihazda kim girerse bildirim ona bağlanır.
- Doğrulama: kural tablosu, boru hattı (tetik → kuyruk → gönderici → web-push) ve SW gösterimi test edildi.
  **Gerçek telefonda doğrulandı (19 Eylül 2026, Bekir):** iPhone (Kıvanç) acil görüşme bildirimi aldı; Android
  (Bekir, öğrenci) deneme bildirimi ve Kıvanç'ın görev bildirimini aldı. Android'de ilk abonelik FCM'den 410 aldı;
  bunun üzerine cihaz kaydı kendini onarır hale getirildi (`bildirimKaydiniTazele`, `bildirim_cihaz_kayitli_mi`,
  aynı anda tek onarım) ve ölü abonelik günlüğe yazılıyor. Kıvanç'ın 4 Eylül denemesinden kalma iPhone kaydı duruyor: koç olayları ona gider.

## 19 Eylül 2026 — PWA sıfırdan

Eski PWA kurulmuyor, kurulunca beyaz ekranda kalabiliyordu. Katman sıfırdan yazıldı (`src/pwa/`, `vite.config.js`,
`index.html`). Bildirim bu turun dışında.

- **Manifest**: ad "Kıvanç Hoca ile koçluk", ana ekranda "Kıvanç Hoca"; `id: /` sabit; açılış `/giris` (kurulu uygulama
  tanıtımı açmaz, giriş yapmış olan Bugün'e düşer); yön kilidi kalktı; lacivert tema, ikon zemini `#0f1520`.
- **Kurulum izni erken yakalanıyor** (`pwa.js` → `baslat`, React'ten önce). Eski kod izni girişten sonra dinliyordu;
  Chrome/Android izni sayfa açılır açılmaz verdiği için "Ekle" düğmesi çoğu zaman hiç çıkmıyordu.
- **Ortama göre tarif** (`ortam()`): tek tuş (Chrome/Edge/Samsung) · iPhone Safari/Chrome Paylaş → Ana Ekrana Ekle ·
  iPhone'da diğer tarayıcı → Safari'de aç · Instagram/TikTok içi tarayıcı → "Tarayıcıda aç" · Mac Safari → Dock'a Ekle ·
  Android menü · masaüstü adres çubuğu simgesi. Davet kendiliğinden bir kez; Hesap → "Uygulamayı yükle" her zaman açar.
- **Kurtarma uygulama kodundan bağımsız**: `?sifirla=1` betiği `index.html`'de. Açılış yedeği: React 8 sn'de açılmazsa
  "Açılmadı mı? Uygulamayı yenile" görünür (kurulu uygulamada adres çubuğu yok). Hesap → "Uygulamayı yenile" aynı yol.
- **Güncelleme**: kayıt elle (`injectRegister: false`); yeni sürüm kullanım ortasında sayfayı yenilemez, uygulamaya
  bir sonraki dönüşte devreye girer; öne her gelişte güncelleme kontrolü.
- **Ön bellek** yalnız uygulama (12 dosya, önceden 29): tanıtım görselleri, seminer/video, `gizlilik.html` ağdan.
  Uzantılı yollara `index.html` dönmez.
- **Durum çubuğu** rolün `--tepe-ust`'u: öğrenci koyu amber, koç/veli lacivert (eski `--durum-cubugu-panel` kalktı).
- Apple ikonu köşesiz (iOS kendi yuvarlar; şeffaf köşeyi siyaha boyuyordu).
- Rötuşlar: kurulu uygulamada çıkış yapmış kullanıcı tanıtımı hiç görmez, doğrudan giriş (geri düğmesi yok, `/randevu`
  hariç); girişten sonra adres `/giris`'ten `/`'a döner (geçmişe kayıt eklemeden); manifest kısayolları Mesajlar ve
  Bildirimler (her rolde var olan iki ekran; koça ve öğrenciye ayrı kısayol verilemiyor).
- Doğrulama: Chromium kurulabilirlik hatası yok, manifest hatası yok, çevrimdışı açılıyor, `?sifirla=1` temizliyor.
  iPhone'da gerçek kurulum elle denenmeli.

## 19 Eylül 2026 — Yönetim işlevleri 6: öğrenci/veli yönetimi ve KVKK

- Sekme adı **Öğrenciler ve veliler**. Öğrenci tablosunda "Seç" → toplu: başka koça aktar, erişimi kapat/aç,
  (tek öğrenci) **verisini indir** (KVKK; tüm tablolardan JSON, `yonetici_ogrenci_disa_aktar`). Erişimi kapalı satır soluk.
- **Veliler** (`Veliler.jsx`, `yonetici_veli_listesi`): uygulama hesabı olanlar + SMS izin kaydı olanlar; izin zamanı,
  kanalı, alan kişi; "İzni geri çek".
- **KVKK talepleri** (`KvkkTalepleri.jsx`, tablo `kvkk_talepleri`): talep kaydet (tür, kişi, öğrenci, kanal, not),
  açık talebin kaç gündür beklediği (25+ gün kırmızı; yasal süre 30 gün), dışa aktarma talebinde "Veriyi indir",
  Tamamlandı / Reddet.
- Erişim günlüğüne yeni olaylar: erişim açıldı/kapandı, SMS izni geri çekildi, veri dışa aktarıldı.
- Denendi: Demo Öğrenci erişimi kapat → aç, veri indirme (98 KB JSON).
- TESPIT-YONETIM.md sırası tamamlandı. Açık kalanlar: Demo Koç'un yönetici yetkisi (gerçek veriden önce geri alınmalı),
  `kullanici-olustur`/`kullanici-sil` yapanı günlüğe yazmıyor, SMS başlık onayı.

## 19 Eylül 2026 — Yönetim işlevleri 5: İçerik sekmesi

- Haftalık ilham takvimi (`HaftalikTakvim.jsx`) yeni dilde: kart değil `Bolum`, 12 hafta tek beyaz yüzeyde çizgiyle,
  düzenleme alanı satırın içinde açılıyor, "elle" hap değil yazı, "Otomatiğe dön" yazı düğmesi.
- "Platform ayarları" → **Kütüphane ve katalog** (Konu öncelikleri, Kaynaklar).
- Karar: Kaynaklar ve Konu öncelikleri koçun hesap menüsünden **kaldırılmadı**. Koç kendi kaynağını ekleyip
  kaldırabiliyor ve Konular ekranında toplu görev atıyor; taşımak bu koç işlerini koparırdı. Yönetici İçerik'ten açıyor.
- Sıradaki (TESPIT-YONETIM.md 5): öğrenci/veli yönetimi ve KVKK kayıtları.

## 19 Eylül 2026 — Yönetim işlevleri 4: İletişim (başvurular, sosyal, SMS)

- Sosyal sekmesi **İletişim** oldu (`#sosyal` bağlantısı çalışmaya devam ediyor): Başvurular + Sosyal gelen kutusu + SMS kaydı.
- **Başvurular** (`bilesenler/Basvurular.jsx`): tanıtım formundan gelenler, durum sekmeleri (Yeni · Arandı · Kayıt oldu ·
  Olmadı · Tümü), dokunulabilir telefon, formdaki not, görüşme notu, durum düğmeleri. Migration `iletisim_basvurular_sms`:
  durumlar genişledi (`kayit_oldu`, `olmadi`; eski `kapandi` Olmadı sayılır), `sonuc_notu`, `isleyen_id`, `guncellendi`;
  yönetici okur/günceller; RPC `basvuru_isle`.
- **SMS kaydı** (`bilesenler/SmsKaydi.jsx`, RPC `yonetici_sms_kaydi`, `yonetici_sms_iptal`): kuyruk durumu, bekleyen/hatalı iptal.
  Teknik'te görülen 2 bekleyen SMS silinmiş örnek öğrencilerdendi (alıcısı yok) → iptal edildi.
- **Düzeltme**: "SMS kuyruğunu boşaltan cron yok" bir hata değil, 16 Eylül 2026 kararı (`sms-gonder/README.md`): onaylı
  başlık başka firmanın (FIRATILTSM), kendi başlığımız onay bekliyor; koç veli özetini Bugün'deki "Veliye iletilecek"
  kutusundan WhatsApp'la iletiyor. Entegrasyon satırı artık "Uykuda" gösteriyor. Başlık onaylanınca tek satır:
  `select cron.schedule('sms-kuyrugu-bosalt', '*/2 * * * *', $$ select private.sms_gondericiyi_durt() $$);`
  (Entegrasyon RPC'sine `sms.cron` bayrağı eklenecek; o gelene kadar satır "Uykuda" varsayar.)

## 19 Eylül 2026 — Yönetim işlevleri 3: Teknik ve İçerik sekmeleri

- Sekmeler: Koçlar · Öğrenciler · Tahsilat · Sosyal · **İçerik** · **Teknik** (Sistem → Teknik; eski `#sistem` bağlantısı Teknik'i açar).
- **Entegrasyonlar** (`bilesenler/Entegrasyonlar.jsx`): e-posta, SMS (İleti Merkezi), Telegram, web bildirimi, YouTube,
  Instagram, yapay zekâ — anahtar var mı, son çalışma, bekleyen/hata. Kaynak: `yonetici_entegrasyon_durumu` RPC +
  yeni `sistem-durumu` Edge Function (fonksiyon ortamındaki anahtar ADLARI; değer dönmez; yalnız yönetici).
  İlk bulgular: SMS kuyruğunda 2 kayıt hiç gönderilmemiş; YouTube ve Instagram anahtarları tanımlı değil.
- **Erişim günlüğü** (`erisim_gunlugu` tablosu + `ErisimGunlugu.jsx`): hesap açma (auth tetikleyicisi, yapan "sistem"),
  hesap silme, şifre sıfırlama (`sifre-sifirla` v2 yazıyor, yapanıyla), kendi şifresini değiştirme, yönetici yetkisi,
  koç durumu, öğrenci aktarma. Günlük 19 Eylül 2026'dan itibaren.
- Teknik ayrıca: arka plan işleri + hatalar, e-posta kaydı, vekâlet kayıtları, sürüm (derleme zamanı).
- İçerik: haftalık ilham takvimi + platform ayarları (Konu öncelikleri, Kaynaklar). Görsel yenileme sıradaki İçerik adımında.
- Açık: `kullanici-olustur`/`kullanici-sil` yapanı günlüğe kendileri yazmıyor (tetikleyici "sistem" gösteriyor).

## 19 Eylül 2026 — Yönetim işlevleri 2: koç detayı, durum, öğrenci aktarma

- Migration `koc_yonetimi_detay_durum_aktarma`: `profiller`'e `koc_durum` (aktif/izinde/ayrildi), `baslangic_tarihi`
  (mevcut koçlar için hesap açılış günü), `kapasite`, `brans`, `ic_not`; koç bu alanları kendisi değiştiremez
  (`private.koc_alan_koruma` tetikleyicisi — denendi). RPC'ler: `yonetici_koc_ozellikleri`, `yonetici_koc_detay`,
  `yonetici_koc_guncelle`, `yonetici_ogrenci_aktar`.
- Yönetim → Koçlar: satıra dokununca `KocDetay` yaprağı: bilgiler (e-posta, telefon, durum, başlangıç, son giriş,
  kapasite, branş, iç not) + düzenle; öğrencileri + seçip başka koça **aktar** (görev, deneme, not, ödeme planı da
  geçer); şifre sıfırla; öğrencisi kalmamış koçu silme (ad yazarak onay). Listede durum ve "öğrenci/kapasite".
- "Ayrıldı" yalnız aktif öğrencisi yokken seçilebilir; ayrılan koç giriş yapamaz (`oturum.js` erişim kapısı).
- `kullanici-sil` v6 yayında (yönetici bayrağı düzeltmesi). Demo öğrenci aktarma testinden sonra Demo Koç'a geri alındı.
- Sıradaki (TESPIT-YONETIM.md 5): Teknik sekmesi.

## 19 Eylül 2026 — Yönetim işlevleri 1: şifre işleri

- **Şifremi değiştir** (`/sifre`, `ekranlar/SifreDegistir.jsx`): hesap menüsünde herkes için. Supabase'de "mevcut şifre
  gerekli" ayarı açık olduğu için form mevcut şifreyi de istiyor (`updateUser({ password, current_password })`).
  Başarılı olunca `profiller.sifre_degistirmeli = false`.
- **İlk giriş önerisi**: `sifre_degistirmeli` açık hesap girişte "Kendi şifreni belirle" ekranını görür; karar gereği
  zorunlu değil, "Sonra" oturum boyunca ertelenir (sessionStorage).
- **Şifre sıfırla** (`bilesenler/SifreSifirla.jsx` + yeni Edge Function `sifre-sifirla` v1): yönetici herkes için
  (Yönetim → Koçlar satırı), koç kendi öğrencisi/velisi için (öğrenci ekranı → Kayıt → Hesap). Yeni geçici şifre bir
  kez görünür, bayrak açılır. Uçtan uca denendi (demo öğrenci: sıfırla → geçici şifreyle giriş → yeni şifre).
- **Hata düzeltmesi**: "yönetici" artık rol değil bayrak (`profiller.yonetici`), ama Edge Function'lar rol = 'yonetici'
  bakıyordu → yönetici koç **ekleyemiyordu**. `kullanici-olustur` v15 düzeltildi ve kaynağı ilk kez repoya alındı.
  `kullanici-sil` repoda düzeltildi, **henüz yayınlanmadı** (koç silme arayüzü yok; öğrenci silme etkilenmiyor).
- Sıradaki (TESPIT-YONETIM.md 5): koç detay + durum + öğrenci aktarma.

## 19 Eylül 2026 — tasarım turu 8: Yönetim + işlevsel tarama

- Mokap: https://claude.ai/artifact/JwGsaGkMDhu2snWH4GcZpa (Bekir onayladı).
- Fırat Koç test hesabı silindi (Bekir'in isteği); Demo Koç'a yönetici yetkisi verildi (tarama için — gerçek veri
  gelmeden geri alınmalı).
- `/yonetim` koyu tepe: başlık + sekmeler tek blok; dört ölçü kartı altında. Koçlar tek listede (iki kart birleşti,
  yetki anahtarı, uyarı durum satırı, "+ Koç ekle" formu listenin üstünde). Öğrenciler/Önce bunlar/Tahsilat/Vekâlet/
  Platform ayarları `Bolum`; haplar `durum-yazi`. Sistem: işler okunur zamanla (`cronOku`), hatalar ayrı bölüm (son 3 + Tümü).
  Sosyal: sayılar tek satır, filtreler alt çizgili, mesaj tek beyaz yüzey, platform/etiket renkli yazı, Gönder ikincil düğme.
- İşlevsel tarama: `TESPIT-YONETIM.md` — kritik bulgu: şifre değiştirme hiçbir yerde yok (bileşen temizlikte silinmiş).

## 19 Eylül 2026 — tasarım turu 7: Veli

- Mokap: https://claude.ai/artifact/ST9euM4pS7LLCKhfjLv7H5 (Bekir onayladı).
- Veli tepesi koçla aynı lacivert (`body[data-rol='veli']` tokenları); Çizbi koyu zeminde beyaz cümle; başlık dikiş kartı taşımıyor.
- Koçun notu: kart değil `Bolum`, not beyaz yüzeyde büyük yazı + imza/hafta; yaklaşan deneme hap değil düz satır.
- Takip ettiğim öğrenciler: `Bolum` + baş harfli satırlar (beyaz yüzey). Haftanın kitabı/sözü "Bu hafta" bölümünde tek yüzey.
- Sıradaki: Yönetim (Kıvanç hesabı gerekli; demo koç yönetici değil).

## 18 Eylül 2026 — tasarım turu 6: Kaynaklar

- Mokap: https://claude.ai/artifact/Mmi2CYPKG7fJjRA7DvBKno (Bekir onayladı).
- Koyu tepe (`/kaynaklar` koyuTepe'ye eklendi): başlık + toplam sayı + amber "Kaynak ekle" (asıl eylem).
  Ekleme formu açılınca "Yeni kaynak" bölümünde, kutusuz.
- Süzgeç: arama + ders + seviye seçim kutuları (seviye hapları kalktı); tür alt çizgili `Sekmeler`.
- Liste derse göre gruplu (`Bolum` başlığı + sayı), beyaz yüzeyde satırlar; masaüstünde iki sütun.
- `KaynakKarti` kart değil satır: emoji ikon ve çerçeveli etiketler kalktı; açıklama satırı "Yayınevi · tür · seviye"
  (seviye renkli yazı), resmî/uyarı notları düz yazı. Göreve kaynak seçerken (`KaynakSecici`) seçilebilir öğe
  olduğu için kenarlık korunuyor.
- Sıradaki (TESPIT.md): Veli.

## 18 Eylül 2026 — tasarım turu 5: öğrenci Bugün ve Yol

- Mokap: https://claude.ai/artifact/8QgWvpyZ6f5unKFTVJ8hkG (Bekir onayladı).
- Çizbi'nin sesi öğrencide de koyu zeminde beyaz kalın cümle (beyaz balon kalktı); "Tamam" beyaz yazı.
- Bugün: gün başlığı ("Cuma, 18 Eylül") + hafta şeridi `SiradakiKart`'ın dışına, zemine çıktı (`.ogr-gun`); gün
  kutuları çerçevesiz, tamamlanan günde tik sayının yanında (`GunSeridi`, koçta da aynı bileşen). Sayaç seçenekleri
  saat ikonlu `EylemDugmesi`. "Günü tamamla" içerikteki tek dolu düğme. Kaynaklarım `Bolum`, haftanın sözü beyaz yüzey.
- Yol: başlık + ders sekmeleri tek koyu blok (`KonuHaritasi` portal ile `.ob-sekme-yuvasi`na çiziyor); harita kartsız,
  ders kapsamları beyaz yüzeyde. Haritanın üstüne binen ikinci Çizbi balonu kalktı: aynı dinamik metin haritanın
  üstünde düz durum satırı (`.yol-balon`, koçun Konular sekmesinde de aynı bileşen).
- Sıradaki (TESPIT.md): Koç · Kaynaklar.

## 18 Eylül 2026 — rötuş turu (Bekir'in değerlendirmesi)

- **Kural 1 düzeltmesi:** sadeleşme renk ayrımını yok etmişti. Başlık/açıklama krem zeminde, veri (künye, liste,
  tablo, form) tek beyaz yüzeyde — `ortak.css` "Veri yüzeyi" seçicisi `Bolum` içindeki blokları kendiliğinden yakalar.
  Kayıt künyesi, Sırada, Konular, notlar/veli formları, öğrenci tablosu, bu hafta giden… hepsi beyaz yüzeye oturdu.
- **Kural 6 düzeltmesi:** düz mavi yazı düğmesi kayboluyordu. Yeni `EylemDugmesi`: ikonlu, hafif dolgulu (metinden ikon
  çıkarır: "+" → artı, "Düzenle" → kalem, "gönder" → uçak). `Bolum` eylemleri, "+ İş ekle", karar kartı ikincil eylemleri.
- **Raporlar:** dört ölçü kartı geri geldi (Bekir: "güzeldi, tasarımı bozmuyordu"); üst bloktaki gösterge ve özet satırı
  kalktı (sayılar iki kez görünmesin). Kural 11: e-posta kaydı → Yönetim → Sistem (`EpostaKaydi`: haftalık raporu elle
  gönder + test maili + son 20 kayıt); Telegram → Yönetim → Koçlar ve hesap menüsü → yeni `/baglantilar` ekranı;
  Araçlar (Konu öncelikleri, Kaynaklar) → hesap menüsü. Raporlar artık yalnız "bak" ekranı.
- `TASARIM-KURALLARI.md`: kural 1 ve 6 güncellendi, kural 11 ve "ölçü kartı" istisnası eklendi.
- Sıradaki (TESPIT.md): öğrenci Bugün şeridi + Yol.

## 18 Eylül 2026 — tasarım turu, 4. adım: Raporlar

- Mokap: https://claude.ai/artifact/5bTmZZmbD8NmDmdmK5VLrf (Bekir onayladı).
- Tek üst blok (`UstBlok`, `.rapor-tepe`): gösterge + seçilen dönemin görev tamamlaması (tek sayı), çalışma / çalışan
  öğrenci / deneme satırı, durum satırı, dönem sekmeleri (Bugün, Bu hafta, Son 30 gün, Özel). Eskiden haftalık
  plan tamamlama (%86) ile dönemlik görev tamamlama (%100) iki ayrı sayı olarak çelişiyordu; artık tek sayı.
  "Yenile" düğmesi kalktı (dönem değişince yeniden yüklüyor).
- `SinifOzeti` yalnız "Sınıf ortalaması net" bölümü; `RaporTepesi` koçta kullanılmıyor (öğrencinin Denemeler'inde duruyor),
  `Gosterge` oradan dışa açıldı.
- Risk dağılımı kartı → Öğrenciler bölümünde tek satır. Hap/rozetler → `.durum-yazi`. E-posta: "Bana gönder" ve
  "Test maili" yazı düğmesi, geçmiş son 3 + "Tümü". `TelegramBaglanti` bölüm oldu.
- `HaftalikIlham` kutusuz (koç, öğrenci ve velide ortak — üçünde de değişti).
- Geniş ekranda `.rapor-izgara` iki sütun (yerlesim.css).

## 18 Eylül 2026 — tasarım turu, 3. adım: koçun öğrenci ekranı, kalan sekmeler

- Mokap: https://claude.ai/artifact/B98gZ1ueHHUdTrbWC2gDrW (Bekir onayladı).
- `Bolum` artık `sag` (serbest içerik) ve `sinif` alıyor. `Kart` → `Bolum` dönüşümü:
  Denemeler (`DenemePaneli`: boş hâl tek cümle + tek düğme, dolu hâlde dört bölüm), Konular (Konu yolu),
  Kayıt (Bilgiler, Ödeme, Veli, Notlar, Tehlikeli bölge — çizgiyle ayrılan bölümler, eylemler yazı düğmesi,
  boş durumlar tek cümle, formlar kutusuz `form-kutu--duz`, künye iki sütun), Program altı "Öğrencinin kaynakları".
- `DenemePaneli` öğrencinin Denemeler ekranıyla ortak: öğrencide de aynı sade boş hâl görünüyor (tek bileşen kuralı).
- Açık: öğrencinin Bugün'deki "Kaynaklarım" kartı (öğrenci turu), Denemeler'deki hedef net kartı (`HedefNet`).

## 18 Eylül 2026 — tasarım turu, 2. adım: koç Bugün + renk dili

- Mokap: https://claude.ai/artifact/To7GoQKsCe85rVkAXweyjf (Bekir onayladı).
- **Renk kararı (Bekir):** amber/şeftali tonları öğrenci dünyasına ait. Koçun Bugün başlığı artık üst şeritle
  aynı koyu lacivert (tek parça tepe, beyaz kalın cümle); şeftali degrade kalktı. Öğrencinin tepesi daha koyu
  amber (`--ogr-tepe-ust #44280e`, `--ogr-tepe-alt #2c1908`); üst şerit ve başlık aynı ton.
- Karar segmentleri (Acil / Süreli / Bugün / Bu hafta) hap şerit yerine `Sekmeler` (koyu) olarak başlığın alt
  kenarında — KararKuyrugu portal ile KocBasligi'ndeki `.ob-sekme-yuvasi`na çiziyor.
- Karar kartı: tek beyaz yüzey, sol çizgi/gölge yok; tür etiketi hap değil küçük başlık yazısı; tek dolu düğme,
  diğer eylemler yazı düğmesi; gidecek mesaj gri kutu değil etiketli düz metin (üç kart türünde de).
- Sırada: kart değil `Bolum`; renkli hap ve sol çizgi yok, bağlam adın altında düz metin ("Konu onayı · Ders · Konu").
- Masaüstü: başlıktaki üç sayı kutusuz.
- Sıradaki: TESPIT.md sırası — koçun öğrenci ekranının kalan sekmeleri.

## 18 Eylül 2026 — tasarım turu, 1. adım: ortak bileşenler + koçun öğrenci ekranı

- Kurallar: `TASARIM-KURALLARI.md` (10 görsel kural, "bir düzeltme her yere" mekanizması, uygulama sırası).
  Mokap: https://claude.ai/artifact/D85kWNPKkGaYHaohVbwCQL
- `src/ortak/`: `UstBlok`, `Sekmeler`, `GunSeridi`, `BosDurum`, `Bolum`, `UyariSatiri` + `ortak.css` (main.jsx'te en son yüklenir).
- Koçun öğrenci ekranı (`/ogrenci/:id`): telefonda da koyu tepe; kimlik kartı header'a bitişik tek blok,
  sekmeler bloğun alt kenarında alt çizgili; durum hapı → nokta + düz metin; hedef kartı kartsız;
  hafta şeridi kapsız, geçmişte bitmemiş gün sayısı kırmızı; gün başlığı ("Cuma, 18 Eylül") + kartsız boş durum
  + tek düğme; "Hafta boyu tekrarlar" `Bolum` (sarı yuvarlak artı → "+ Ekle"). Geniş ekranda şerit yapışmıyor.
- Öğrencinin `HaftaSeridi`'si de `GunSeridi`'yi çiziyor (görünüm aynı; boş gün "—" yerine "·").
- Yönetim sekmeleri `Sekmeler` (açık varyant) oldu.
- Tespit raporu: `TESPIT.md` (tüm ekranlar, önerilen sıra). Sonraki adımlar o sıraya göre, ekran ekran.
- Açık kalanlar (sıradaki adımlar): öğrenci Bugün'deki şeritte gün kutularının kenarlığı (`.siradaki` kapsamlı stil),
  "Öğrencinin kaynakları" kartı, Denemeler/Konular/Kayıt sekmelerindeki kartlar, koç Bugün, Rapor/veli, yönetim alanı, denetim kontrolleri.

## 18 Eylül 2026 — Sosyal Gelen Kutusu (yönetim paneli)

- Yönetim → **Sosyal** sekmesi: Instagram DM/yorum ve YouTube yorumları tek listede; taslak düzenle → Gönder / Atla / Geri al.
  Sekmede bekleyen sayısı rozeti (acil varsa kırmızı). `/yonetim#sosyal` doğrudan açar.
- Veri: `sosyal_yanit` (+`baglam`, `deneme`, `karar_*`), RPC `sosyal_kutusu`, `sosyal_bekleyen`, `sosyal_karar`.
  Gönderim `sosyal-yanit` Edge Function (yönetici oturumu). Telegram onayı kaldırıldı.
- Kriz/istismar → `private.sosyal_acil_bildir` → `mail_kuyrugu` (`sosyal_acil`) → `rapor-mail` (kaynağı artık repoda).
- `deneme = true` 7 örnek kayıt var; platforma gitmez. Gerçek bağlantılar gelince silinecek.
- YouTube: panelde "YouTube'u bağla" (Google OAuth, `youtube.force-ssl`) → yenileme anahtarı `sosyal_ayar`'da.
  Cron `sosyal-youtube-tara` 10 dakikada bir yeni yorumları çeker (yalnız bağlantı anından sonrakiler; kanalın zaten yanıtladıkları atlanır).
  Gereken: Google Cloud'da OAuth istemcisi → Supabase secret `YT_CLIENT_ID`, `YT_CLIENT_SECRET`;
  yönlendirme adresi `https://sjcovxnhardtvmvooqpn.supabase.co/functions/v1/sosyal-yanit`. Uygulama "In production" olmalı (Testing'de izin 7 günde düşer).
- Bekleyen: Instagram bağlantısı (Meta uygulaması + IG_TOKEN/IG_APP_SECRET).

## 18 Eylül 2026 — sosyal bağlantılar ve son paylaşım (oturum raporu)

- TikTok (`@khkocluk`) `site.js` → `iletisim.tiktok` alanına yazıldı; kanal kartı ve alt bilgi bağlantısı canlıda.
- Kanallar bölümüne "Son paylaşım" kartı eklendi (mokap onaylı). Kaynak YouTube'un herkese açık
  akışı (kanal `UCE5lZ1CG0-CqeRpaqlxa5-Q`); Instagram/TikTok API'leri anahtar yenileme ve uygulama
  onayı istediği için seçilmedi, içerik üç kanalda aynı olduğundan ikisi yalnız bağlantı.
- Yeni Edge Function `son-paylasim` (JWT kapalı, yalnız herkese açık veri): en yeni videoyu döner,
  1 saat bellek + 15 dk CDN önbelleği. Video yoksa `{video:null}` → kart hiç basılmaz. Shorts dikey,
  normal video yatay kapakla gösterilir.
- Tablette kanal kartları 2+1 diziliyordu; ızgara `minmax(220px)` ile üçü tek sıraya alındı.
- 390/820/1366'da örnek veriyle doğrulandı, yatay taşma yok.
- Açık: kanalda henüz video yok; 18 Eyl 20:00'deki ilk Buffer gönderisinden sonra kartın canlıda
  dolduğu kontrol edilmeli. "Videolar" bölümü hâlâ demo içerikte; istenirse aynı akışa bağlanabilir.

## 16 Eylül 2026 — Tur 0 makine denetimi

Proje geneli kalite/tutarlılık denetimi başladı. Yöntem: makine okur, model yargılar.
`bash denetim/tara.sh` tüm taramayı yeniden üretir ve `DENETIM.md`'yi yazar
(build/knip/audit, token kaçakları, kalıntılar, canlı RLS matrisi + RPC sondası,
Supabase advisors, Playwright 390/820/1366 Chromium + 390 WebKit, axe, dokunma
hedefleri, Lighthouse). Ham çıktılar ve görüntüler depoya girmez.

Sonuç: 109 bulgu — 3 kritik (`v_kaynak_konu` SECURITY DEFINER görünüm anon'a açık;
`ogrenci_gorusme_hakki` RPC'si null `auth.uid()` ile ziyaretçiye yanıt veriyor),
58 önemli, 48 hijyen. Sıradaki: Tur 1 (hijyen, mekanik) ve Tur 2 (kritik/önemli, yargı);
ikisi de DENETIM.md'den başlar.

---

## Altyapı

| Parça | Durum |
| --- | --- |
| Depo | `github.com/haleblioglukivanc/yks-kocluk` (özel) |
| Veritabanı | Supabase `yks-kocluk` · `sjcovxnhardtvmvooqpn` · Frankfurt |
| Yayın | Cloudflare Workers · `khkocluk.com` |
| Dağıtım | Cloudflare **Workers Builds**, repoya doğrudan bağlı. `main`'e her push'ta Cloudflare kendisi derleyip yayınlar. GitHub Actions'ta dağıtım iş akışı **yoktur**; commit'teki `Workers Builds: yks-kocluk` kontrolü bakılacak yerdir. |
| Yayın hattı | `main` dalına her push otomatik derlenip yayınlanır |
| Edge Function | `kullanici-olustur` · sürüm 3 · aktif; `son-paylasim` · tanıtım sayfası için YouTube akışı |

Depo ve Cloudflare Kıvanç'ın hesabında; Supabase projesi ayrı bir org altında.
İki hesap ayrı olduğu için erişim yetkileri elle takip edilmeli.

---

## Teknoloji

Vite + React 19 + `vite-plugin-pwa` ile derlenen statik SPA. Sunucu tarafı kod
yalnızca hesap açma için var (Edge Function). Veri erişimi doğrudan Supabase'e,
RLS politikalarıyla korunarak yapılır.

Tasarım iki ayrı dilde:

- **Tanıtım sayfası ve giriş** — kareli sınav defteri. Bricolage Grotesque + Karla.
  Kırmızı marj çizgisi, fosforlu sarı vurgu.
- **Panel** — işlevsel arayüz. Archivo + Inter + JetBrains Mono. Program
  hücrelerinde mor/yeşil.

Bu ayrım bilinçli ama tam oturmuş değil; ileride birleştirmek gerekebilir.

---

## Veri modeli

11 tablo, 2 görünüm, tamamında RLS açık.

```
profiller ──┬── ogrenciler ──┬── gorevler
            │                ├── konu_ilerleme
            │                ├── denemeler ── deneme_sonuclari
            │                └── veli_ogrenci
            └── kataloglar ── dersler ── konular
```

Görünümler: `deneme_ozet` (deneme başına toplam net), `ogrenci_net_durumu`
(tür bazında son ve en yüksek net). İkisi de `security_invoker`.

### Yetkilendirme kuralları

Yardımcı fonksiyonlar `private` şemasında; PostgREST yalnızca `public` şemasını
yayınladığı için dışarıdan çağrılamazlar. Bu, güvenlik denetimindeki uyarıları
gidermek için sonradan taşındı.

| Rol | Yetki |
| --- | --- |
| Yönetici | Koçun her şeyi + sistem kataloğunu düzenleme |
| Koç | Kendi öğrencileri; başka koçun verisine erişemez |
| Öğrenci | Kendi verisi; görevde yalnızca `yapilan_adet` ve `durum` |
| Veli | Çocuğunun verisi, salt okunur |

Öğrencinin görev tanımını (başlık, tarih, hedef) değiştirmesi bir tetikleyiciyle
engellenir. Rol yükseltme de ayrı bir tetikleyiciyle engellenir; kullanıcı
bağlamı olmayan işlemler (SQL editörü, migration) istisnadır.

---

## Konu katalogları

**7 katalog, 82 ders, 1.498 konu.**

| Katalog | Müfredat | Ders | Konu |
| --- | --- | --- | --- |
| YKS Sayısal | MEB 2018 | 16 | 323 |
| YKS Eşit Ağırlık | MEB 2018 | 15 | 359 |
| YKS Sözel | MEB 2018 | 16 | 273 |
| 9. Sınıf | Maarif 2024 | 9 | 185 |
| 10. Sınıf | Maarif 2024 | 10 | 168 |
| 11. Sınıf | Maarif 2024 | 10 | 121 |
| LGS 8. Sınıf | MEB 2018 | 6 | 69 |

### Müfredat durumu (2026-2027)

Araştırmayla doğrulandı: Maarif Modeli ortaöğretimde 9, 10 ve 11. sınıflarda
uygulanıyor. **12. sınıf ve 8. sınıf hâlâ 2018 müfredatında.** 8. sınıf
2027-2028'de geçecek, ilk Maarif uyumlu LGS 2028'de.

Bu yüzden YKS ve LGS katalogları 2018 müfredatından, sınıf katalogları
Maarif'ten yüklendi. `kataloglar.mufredat` alanı bunu takip eder.

### Katalog yapısı

`koc_id IS NULL` olan kayıtlar sistem kataloğudur, tüm koçlar görür. Koç kendi
konusunu ekleyebilir (`koc_id` dolu olur). Öğrenci bir kataloğa bağlanır.

---

## Çalışan özellikler

**Tanıtım sayfası** — Net grafiği (açılışta çizilen animasyon), kimim, 10 belge
(yatay kaydırmalı), nasıl çalışıyoruz, sistemde ne takip ediliyor, kimler için,
yorumlar, SSS, iletişim.

**Hesap açma** — Siteden kayıt olunamaz. Koç panelden ad, e-posta, katalog ve
sınıf girer; sistem 8 karakterlik geçici şifre üretir (`Kmedza47` biçimi) ve
ekranda bir kez gösterir. Şifre değişimi zorunlu değil.

**Öğrenci detayı** — Fotoğraf ve kimlik kartı; bilgi düzenleme; haftalık program
ızgarası; deneme kaydı ve net hesabı; konu bazlı ilerleme.

**Program ızgarası** — Satırlar 6 zaman dilimi (09—11 … 21—23), sütunlar 7 gün.
Koç boş hücreye ders atar, öğrenci dolu hücreye dokunup tamamlar. Aynı hücreye
iki blok konulamaz (benzersizlik kısıtı).

**Hedef netler** — TYT (0–120) ve AYT (0–80). Kimlik kartında gerçekleşen netle
karşılaştırmalı çubuk olarak görünür. Hedefi yalnızca koç girer.

**Fotoğraflar** — `ogrenci-foto` kovası **gizli**. Öğrenciler reşit olmayabilir;
fotoğraflar herkese açık adreste durmaz. Her görüntülemede bir saatlik imzalı
bağlantı üretilir. Yalnızca öğrenci, koçu ve velisi görebilir.

---

## 15 Eylül 2026 — görsel dil turu (oturum raporu)

Ayrıntı SISTEM.md'de ("Doku ve gölge", "Koçun dünyası", "İki rol, iki
sıcaklık"). Özet:

- **Kılavuz turu:** kâğıt dokusu, iki gölge tokenı, kart başlığı/sayı ritmi,
  boş durumlarda Çizbi + davet, grafik dolgusu ve son değer etiketi, rozetler
  cümle düzeninde, yan çubukta amber imza.
- **Öğrencinin dünyası** (`body[data-rol='ogrenci']`): sıcak mürekkep tepe,
  krem kâğıt, Çizbi sekerek girer + beyaz balon + yazılarak akan cümle, hafta
  damgası, dersin renginde Sıradaki kartı, sayaç halkası ders renginde ve
  yanında çalışan Çizbi, bitirme koreografisi (kart uçar, tik patlar). Yol'da
  patika kendini çizer, Çizbi durak zıplar; Denemeler'de çizgi çizilir, sayı
  sayar, yay/çubuk dolar. Acil görüşme sağ üst köşede, yaprağı alt sayfa.
- **Koçun dünyası** (`body[data-rol='koc']`): mürekkep-mavi yan çubuk + karar
  rozeti + Çizbi notu, şeftali tepe kartı (üç sayan sayı), geniş ekranda zemin
  lekeleri ve pırıltı, karar kartında tip çizgisi, Sırada'da "Ders · Konu"
  çipleri (konu kataloğundan ders bulunur), öğrenci satırları risk renginde,
  Öğrenciler başlığı beyaz kart, KPI kartları pastel ve sayan.
- **Düzeltilen hatalar:** Rapor'da devleşen net grafiği; `.ders-cip` sınıf
  çakışması (Yol sekmeleri bozuluyordu); masaüstünde logo yan çubuğun altında
  kalıyordu; karar sayısı 20'de kesiliyordu; koç tepesi bir ara çöktü (kapsam
  dışı değişken), dakikalar içinde düzeltildi.

### Açık kalanlar

- Yol'da hiç konuya başlanmamış öğrencide "sıradaki durak" işareti yok
  ("buradasın" nabzı yalnız çalışılan durakta yanar).
- Öğrenciler listesinde satırın alt yazısına tıklamak detayı açmıyor.
- Öğrenciler/öğrenci detayı ve Rapor'un "Raporlar" kartı yeni dile tam
  çekilmedi; Kıvanç'ın geri bildirimiyle devam.

---

## Açık işler

### Yayın öncesi zorunlu

1. **`site.js` içindeki demo veri.** `[DEMO]` ve `[DOLDURULACAK]` araması yapın.
   Özellikle `yorumlar.liste` gerçek değilse boşaltın (`[]`) — uydurma referansı
   gerçek bir kişinin adı altında yayınlamak etik ve hukuki risk.
2. **Belge görselleri.** `public/belgeler/` altındaki 10 dosya örnektir,
   üzerlerinde "ÖRNEK" filigranı vardır. Gerçekleriyle değiştirilmeli.
3. **Kıvanç'ın biyografisi.** Hâlâ yer tutucu.
4. **GitHub token.** Depoya yazılmış olan `ghp_` ile başlayan klasik token
   hâlâ geçerli. İptal edilmeli.

### Bilinen eksikler

- **Öğrenciye mail gitmiyor.** Geçici şifreyi koç elden iletiyor. Mail için
  ayrı bir SMTP servisi (Resend, Brevo) bağlanmalı; Supabase'in varsayılan
  servisi saatte birkaç mailde sınırlı.
- **11. sınıf Fizik "Optik" ünitesi eksik.** 36 ders saati ve 10 öğrenme çıktısı
  doğrulandı ama alt konu başlıkları resmi kaynaktan çıkarılamadı.
- **11. sınıf listeleri kaba.** 121 konu tema ve içerik çerçevesi düzeyinde.
  Maarif programları klasik konu listesi vermiyor. Kullandıkça bölünmesi
  gereken başlıklar görülecek.
- **TYT listeleri kataloglar arasında farklı.** Sayısal 29 konu, eşit ağırlık
  22 konu içeriyor (TYT Türkçe örneği). Öğrenci alan değiştirirse TYT ilerlemesi
  eşleşmez. "Ortak TYT" kararı verilmiş ama uygulanmamıştı.
- **Tarih TYT ve AYT listeleri birebir aynı.** Kaynak dokümandan öyle geldi;
  kasıtlı mı, kopyala-yapıştır mı belirsiz.
- **Sızdırılmış şifre koruması kapalı.** Supabase'de Pro plan gerektiriyor.
- **Koç hesabı, öğrencisi varken silinemiyor.** Kasıtlı (`on delete restrict`),
  ama "koç ayrılıyor" senaryosu için öğrenci devri gerekecek.

### Sıradaki adımlar

- Veli paneli şu an yalnızca çocuk listesi gösteriyor; program ve deneme
  görünümü eklenmeli.
- Koç panosunda haftalık özet (kim aksadı, kimin neti düştü) yok.
- Konu ilerlemesi ile program arasında bağ yok; bir konu tamamlanınca ilgili
  görevler işaretlenmiyor.

---

## Çalışma düzeni

Altyapı (şema, RLS, Edge Function, katalog) bu sohbetten MCP araçlarıyla
yönetildi. Kod yazımı ve push da buradan yapıldı. Cloudflare'e GitHub bağlantısı
tek seferlik tarayıcı işlemiydi, tamamlandı.

Her değişiklikten sonra izlenen yöntem: değişikliği uygula → veritabanında
gerçek kullanıcı bağlamıyla test et → test verisini temizle → derle → push.
Bu yöntem yol boyunca birkaç gerçek hata yakaladı; en önemlileri yönetici
rolünün yabancı anahtar kısıtını ihlal etmesi ve fotoğraf yolu çözümleyicisinin
geçersiz girdide RLS politikası içinde hata fırlatması.

## 16 Eylül 2026 — Tanışma başvuru formu

- `/randevu` sayfası (`src/ekranlar/Randevu.jsx`, `src/randevu.css`). Tanıtımdaki
  "Tanışma görüşmesi ayarla/iste" düğmeleri buraya gidiyor; e-posta adresi siteden kalktı
  (yalnızca formun aydınlatma metninde duruyor).
- Veritabanı: `public.basvurular` (alanı `hizmet`: bugün hep `kocluk`, ileride `danismanlik`).
  Ziyaretçi tabloya erişemez, yalnızca `public.basvuru_gonder(jsonb)` RPC'si ile ekler
  (doğrulama, tuzak alan, aynı numaraya 24 saatte tek bildirim, saatte 20 başvuru freni).
  Okuma/güncelleme yalnızca `private.basvuru_ayari.alici_id` (Kıvanç) için.
- Bildirim: `private.basvuru_bildir` tetikleyicisi → Telegram (`private.telegram_gonder`)
  + `mail_kuyrugu` (`rapor_tipi = 'basvuru'`, şablon `rapor-mail` v11 içinde).
- **Açık sorun:** Telegram bot token'ı 401 Unauthorized dönüyor (Vault: `telegram_bot_token`).
  Telegram bildirimlerinin hiçbiri gitmiyor; token yenilenmeli.
- Sırada: koç panelinde Başvurular listesi (önce mokap), WhatsApp Business karşılama mesajı.

## 16 Eylül 2026 — Veli mesajları elden iletime döndü

- **Karar:** veliye giden haftalık özet otomatik SMS ile gitmiyor. Elimizdeki
  onaylı gönderici başlığı başka bir firmanın (`FIRATILTSM`); veli tanımadığı
  bir başlıktan gelen mesajı anlamıyor ve başkasının markasıyla mesaj atmak
  doğru değil. Başlıklar firma unvanı/marka ile eşleşmek zorunda olduğundan
  "bilgi" gibi genel bir başlık da alınamıyor.
- **Yeni akış:** koç karar kuyruğunda özeti onaylar → tetikleyici `sms_kuyrugu`'na
  satır atar (değişmedi) → satır koç panelindeki **Veliye iletilecek** kutusunda
  görünür → koç `wa.me` bağlantısıyla kendi WhatsApp'ından gönderir → satır
  "İletildi" damgalanır (`saglayici_id = 'elden'`).
- `sms-kuyrugu-bosalt` cron'u kaldırıldı. `sms-gonder` fonksiyonu duruyor ve
  çalışır durumda; geri açma komutu README'sinde.
- Yeni: `public.koc_veli_mesajlari()` (RLS'e güvenir, bekleyenler üstte,
  iletilenler 24 saat listede kalır) ve `public.koc_veli_mesaji_isaretle(id, iletildi)`
  (definer; öğrenci sahipliğini elle doğrular, geri alınabilir).
- Arayüz: `src/bilesenler/VeliMesajlari.jsx`, stiller `index.css` sonunda.
  WhatsApp yeşili (`#25d366`) yalnız bu düğmede; panelin "yeşil = yolunda"
  anlam katmanına karışmıyor.
- İleti Merkezi kurulumu tamamlandı ve çalışıyor (API izni, 2FA, üç secret,
  iki numaraya başarılı sınama). Koçun kendi bildirimleri için hazır duruyor.
- Sırada: bekleyen mesaj için Bugün rozeti ve Telegram bildirimi; üç gün
  bekleyen mesajın kırmızıya dönmesi arayüzde var, bildirimi yok.

### 16 Eylül 2026 — veli özeti akışında üç düzeltme

1. **Sessiz kayıp (asıl kusur).** `private.veli_ozeti_yayinlaninca`, `koc_yorumu`
   10 karakterden kısaysa hiçbir şey yapmadan çıkıyor. Ekrandaki özet metni
   saklı değil, `koc_karar_kuyrugu` içinde anlık üretiliyor; metin kaydedilmeden
   yayınlanan bir özet ne SMS kuyruğuna ne veli e-postasına düşüyordu — yalnız
   "yayınlandı" damgası vuruluyordu. `koc_karar_ver` artık metin gelmediğinde
   ekranda gösterilen taslağın aynısını üretip kaydediyor.
2. **Kuyruk limiti.** Veli özeti 'hafta' segmentinde olduğu için sıranın sonuna
   düşüyor, 12'lik pencere tebrik/analizle dolunca hiç görünmüyordu. Haftalık
   plan taslağının muafiyeti veli özetine de verildi.
3. **Etiket ve tazeleme.** Düğme "Gönder" diyordu ama mesaj gitmiyor, kutuya
   düşüyor: "Onayla, iletime hazırla" oldu. Onaydan sonra kutu kendini
   tazeliyor (`veli-mesaji-eklendi` olayı) — önce sayfa yenilemek gerekiyordu.

Ayrıca taslak metnindeki ek hatası düzeldi: "hedefinin %36'ini" → "%36 kadarını"
(doğru ek sayının okunuşuna göre değişiyor, ek istemeyen kalıba geçildi).

## 19 Eylül 2026 — Şifremi unuttum

- Girişte **Şifremi unuttum**: e-posta yazılır, `resetPasswordForEmail` bağlantı yollar (adres kayıtlı olsun olmasın aynı cevap). Bağlantıyla gelen oturum (`type=recovery` / `PASSWORD_RECOVERY`) `SifreDegistir kurtarma` ekranına düşer; mevcut şifre sorulmaz. Erişim günlüğüne `sifre_degistirdi` + `ayrinti.yol = e-posta bağlantısı`.
- Koçun öğrenci ekranı → Kayıt → Hesap: öğrencinin yanında bağlı veli hesapları da listelenir, her birine geçici şifre üretme (`sifre-sifirla` zaten veliyi destekliyordu, düğme yoktu).
- **Panelden yapılacak (koddan yapılamıyor):** Supabase → Authentication → SMTP (varsayılan sunucu yalnız proje ekibine mail atar), URL Configuration (Site URL + yönlendirme), Emails → Reset password şablonu Türkçe.

## 19 Eylül 2026 — vekalet kabuğu öğrenci gibi

Göz ikonu (`/gozuyle/:id`) zaten öğrencinin kendi `OgrenciPaneli`ni açıyordu; fark kabuktaydı (giriş yapan koça göre çiziliyordu). Düzeltme: vekalette üst şeritte Çizbi yüzlü gelen kutusu (dokununca o öğrenciyle yazışma), koçun zil/karar sayısı ve hesap düğmesi yok, yalnız "Yönetime dön"; köşe Çizbi'si koçun cümlelerini söylediği için vekalette hiç yok; koç mesajı balonu öğrencideki gibi görünür ama kapatmak okundu işaretlemez. Bilerek kapalı kalanlar: kutlama/konfeti, kitap "Bitirdim", acil görüşme (üçü de öğrencinin kendi eylemi). Playwright 390px ile öğrenci ve vekalet ekranı karşılaştırıldı.

## 19 Eylül 2026 — koçun teması tek kayıtta
- Temas = koçun öğrenciye mesajı (kart, toplu, tekil) veya "Görüştük" (telefon / yüz yüze, `koc_gorusmeleri`). Durum `private.temas_durumu`: bekliyor → atildi → yanit / hareket / gorusuldu; mesajdan 24 saat sonra ne yanıt ne görev varsa hareketsiz; 72 saat sonra sıfırlanır.
- Öğrenciler: dokunulan öğrenci grubunda kalır, sönükleşir, üçüncü satırda "Mesaj atıldı · 19:20". Toplu mesaj yalnız dokunulmamışlara gider.
- Bugün: "Kaybolan öğrenci" kartı yalnız bekliyor/hareketsiz öğrencide; "Görüştük" düğmesi eklendi. Temas kurulmuş öğrencide yalnız "Hedef ayarı" kartı (hafiflet / aynı kalsın). Hedef 7 gün içinde bir kez hafifler, 10 saatin altına inmez. Eski hata: "Mesajı gönder" kartı kapatmıyordu, her basışta hedef yeniden %20 düşüyordu.
- Çizbi: acil ve dokunulmamış öğrenci varsa onu söyler ("dikkat isteyen bir şey görünmüyor" yanlışı giderildi).
- Öğrenci kartı: Mesaj'ın yanında telefon ikonu = Görüştük (tür + isteğe bağlı not).

## 20 Eylül 2026 — yanlış havuzu düzeltmesi + hata defteri

**Yanlış havuzu testi (geri alınan işlemde, gerçek öğrenci verisinde):** zincir deneme_hatalari → zorlanma_sinyali → konu_skor → plan_taslagi_hesapla → tekrar görevi → tekrar_araligini_ilerlet.
Bulgu: sinyal tekrar tarihini "yarın" yapıyor, hemen ardından `konu_skor_tazele` son çalışma tarihinden yeniden hesaplayıp siliyordu. Hiç çalışılmamış konudaki yanlış plana hiç girmiyor, çalışılmış konuda "19 gün gecikmiş" gerekçesiyle giriyordu.
Düzeltme (`20260920_yanlis_tekrar_duzeltme.sql`): son çalışmadan sonra gelmiş sinyal varsa sıradaki tekrar = sinyal + 1 gün, aralık 0; plan gerekçesi sinyal kaynağından ("Denemede yanlış", "Soru çözümünde yanlış", "Öğrenci tekrar istedi"); aynı konu hem tekrar hem yeni konu olarak iki kez çıkmaz. Test tekrarlandı: iki konu da yarına kuruldu, gece tazelemesi bozmadı, tekrar bitince aralık 3 güne ilerledi. Konu aralıkları 1-3-7-21-60 olarak kaldı (bilinçli).

**Hata defteri** (`20260920_hata_defteri.sql`, `src/bilesenler/HataDefteri.jsx/.css`), mokap: Design kanvası "Hata Defteri — öğrenci mokabı".
- Tablolar `hata_defteri`, `hata_tekrarlari`; kova `hata-foto` (`<ogrenci_id>/…`, uzun kenar 1600px JPEG).
- Neden: bilgi/dikkat/yontem/sure; güven emin/tahmin; doğru şık isteğe bağlı (yoksa öğrenci "doğru yaptım / yine yanlış" der).
- Tekrar `hata_tekrar_cevapla`: 1-3-7-14-28 gün, üst üste 2 doğru = öğrenildi, yanlış = yarın.
- Soru çözümünden eklenen kayıt konu havuzuna `soru_cozumu` sinyali düşer (zorlanma_sinyali.hata_turu'na `yontem` eklendi); denemeden eklenen düşmez (deneme_hatalari zaten sayıyor).
- Girişler: öğrenci Denemeler sekmesi (satır → tam sayfa defter), deneme kaydındaki "Yanlışlar nereden geldi?" adımı, Günü tamamla → Bugün çözülen (yanlışı olan ders varsa). Koçun öğrenci ekranı Denemeler'de salt okunur.
- Açık: koç karar kartı (aynı konu + aynı neden 3. hata) sonraki adım. Playwright doğrulaması yapılamadı (test hesabı yok); Bekir telefondan deneyecek.
