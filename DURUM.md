# Proje Durumu

Son güncelleme: 18 Eylül 2026 (tasarım turu, 2. adım)

Bu belge, çalışmaya yeni bir oturumda devam edebilmek için yazıldı. Neyin hazır
olduğunu, hangi kararların neden alındığını ve nelerin açık kaldığını anlatır.

---

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
