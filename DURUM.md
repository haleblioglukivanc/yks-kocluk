# Proje Durumu

Son güncelleme: 29 Ağustos 2026

Bu belge, çalışmaya yeni bir oturumda devam edebilmek için yazıldı. Neyin hazır
olduğunu, hangi kararların neden alındığını ve nelerin açık kaldığını anlatır.

---

## Altyapı

| Parça | Durum |
| --- | --- |
| Depo | `github.com/haleblioglukivanc/yks-kocluk` (özel) |
| Veritabanı | Supabase `yks-kocluk` · `sjcovxnhardtvmvooqpn` · Frankfurt |
| Yayın | Cloudflare Workers · `yks-kocluk.haleblioglukivanc.workers.dev` |
| Dağıtım | Cloudflare **Workers Builds**, repoya doğrudan bağlı. `main`'e her push'ta Cloudflare kendisi derleyip yayınlar. GitHub Actions'ta dağıtım iş akışı **yoktur**; commit'teki `Workers Builds: yks-kocluk` kontrolü bakılacak yerdir. |
| Yayın hattı | `main` dalına her push otomatik derlenip yayınlanır |
| Edge Function | `kullanici-olustur` · sürüm 3 · aktif |

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
