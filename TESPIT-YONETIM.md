# Yönetim Paneli — İşlevsel Tarama (19 Eylül 2026)

Kaynak: kod (`YoneticiPaneli.jsx` ve bağlı bileşenler), veritabanı şeması ve RPC listesi, canlıda demo koç
(yönetici yetkili) ile beş sekmenin taranması. Tasarım turu 8 bu belgeden bağımsız olarak uygulandı; burası
**işlev** eksiklerini ve yeni yapı önerisini anlatır. Hiçbiri henüz uygulanmadı.

## 1. Bugün ne var

| Sekme | İçerik |
|---|---|
| (üst) | Dört ölçü: aktif öğrenci, sessiz öğrenci, haftalık hedefi tutturan, veli özeti yayınlanan |
| Koçlar | Koç listesi (öğrenci sayısı, bekleyen onay, yanıt süresi, veli özeti oranı), yönetici anahtarı, koç ekle (geçici şifre), Telegram |
| Öğrenciler | Kurumun tüm öğrencileri tablo (koça göre süzgeç), kopma riski listesi |
| Tahsilat | Bu ay tahsil / geciken, gecikenler listesi |
| Sosyal | Instagram + YouTube gelen kutusu, platform bağlantıları |
| Sistem | Zamanlanmış işler, e-posta kuyruğu, Çizbi olayları, arka plan hataları, e-posta kaydı, vekâlet kayıtları, haftalık ilham takvimi, ayar kısayolları |

RPC'ler: `yonetici_nabzi`, `yonetici_koc_performansi`, `yonetici_risk_listesi`, `yonetici_sistem_durumu`,
`yonetici_vekalet_kayitlari`, `yonetici_tahsilat_ozeti`, `yonetici_ogrenci_listesi`, `yonetici_yetkisi`.
Edge Function: `kullanici-olustur`, `kullanici-sil`.

## 2. Eksikler

### 2.1 Hesap ve güvenlik — **kritik**
- **Şifre değiştirme hiçbir yerde yok.** İlk tasarımda ilk girişte zorunlu şifre değişimi vardı; sonra "öneri"ye
  indirildi (`62205f5`), öneri bileşeni de bir temizlik turunda "ölü kod" diye silindi (`a36e9b6`).
  `profiller.sifre_degistirmeli` bayrağı okunuyor ama hiçbir ekran kullanmıyor. Sonuç: koçun ürettiği geçici şifre
  kalıcı şifre olarak kalıyor ve kimse değiştiremiyor.
- Yönetici bir hesabın şifresini **sıfırlayamıyor** (yeni geçici şifre üretme yok).
- Hesap **dondurma / erişimi kapatma** yalnız öğrenci için var (Kayıt sekmesi); koç ve veli için yok.
- E-posta değiştirme, açık oturumları kapatma yok.
- Demo koç hesabı şu an yönetici ve şifresi belgelerde yazılı: gerçek veri gelmeden **yetki geri alınmalı**.

### 2.2 Koç yönetimi
Koç kaydı yalnız ad, telefon, fotoğraf, yönetici bayrağı ve oluşturulma zamanı taşıyor. Eksik:
- İletişim (e-posta görünmüyor; auth tablosunda), **başlangıç tarihi**, **son giriş**, **durum** (aktif / izinde / ayrıldı),
  **kapasite** (en fazla öğrenci), alan/branş, iç not.
- **Koç detay sayfası** (satıra dokununca): bilgiler, öğrencileri, performans geçmişi, yetki, hesap işlemleri.
- **Öğrenci aktarma**: bir koçun öğrencilerini başka koça devretme (koç ayrılınca şart). Şu an arayüzde yok.
- Koçu pasife alma / silme (öğrencisi varken aktarmadan engellenmeli).

### 2.3 Öğrenci ve veli yönetimi (kurum geneli)
- Öğrencinin koçunu değiştirme, toplu erişim aç/kapat.
- Veli listesi ve **KVKK izin kayıtları** (kim, ne zaman, hangi metinle, hangi kanaldan) tek yerde; izni geri çekme.
- Veri silme / dışa aktarma talepleri (KVKK) için iz.

### 2.4 Koç ekranlarından buraya taşınması önerilenler
| Şu an | Öneri | Sebep |
|---|---|---|
| Kaynaklar (koç hesap menüsü) | Yönetim → İçerik | Kurum geneli kütüphane; ekleme yetkisi yöneticide olmalı |
| Konu öncelikleri (koç hesap menüsü) | Yönetim → İçerik | Katalog ağırlıkları kurum kararı |
| Haftalık ilham takvimi (Sistem içinde) | Yönetim → İçerik | Teknik değil, içerik |
| Öğrenciyi kalıcı silme (koçta Kayıt → Tehlikeli bölge) | Yönetici onayına bağla | Geri alınamaz işlem |
| Randevu başvuruları (yalnız Telegram + e-posta) | Yönetim → İletişim → Başvurular | Kayıt listesi yok; bir bildirim kaçarsa başvuru kaybolur |

### 2.5 İletişim
- **Başvurular** listesi (durum: yeni / arandı / kayıt oldu / olmadı).
- **SMS**: gönderici başlığı (şu an `FIRATILTSM`, `KIVANCHOCA` onay bekliyor), gönderim kaydı, kalan kredi — arayüzde yok.
- Kuruma duyuru (koçlara / öğrencilere) — yok.

## 3. Teknik (IT) — ayrı alt başlık
Bugün "Sistem" sekmesinde içerikle karışık duruyor. Önerilen **Teknik** sekmesi:
- Zamanlanmış işler ve arka plan hataları (mevcut)
- Kuyruklar: e-posta (mevcut), SMS (yok), bildirim
- **Entegrasyon durumları** tek listede: Telegram botu, İleti Merkezi (SMS), Instagram, YouTube, Resend/e-posta,
  Cloudflare Workers AI (YZ sağlayıcı ve günlük kota), Supabase Vault anahtarları (var/yok — değer gösterilmez)
- **Erişim günlüğü**: vekâlet kayıtları (mevcut) + yetki değişiklikleri, hesap açma/silme, şifre sıfırlama
- Sürüm ve dağıtım: canlıdaki sürüm, son dağıtım zamanı
- Yedek / dışa aktarma (KVKK)

## 4. Önerilen sekme yapısı
**Genel** (ölçüler + dikkat isteyenler) · **Koçlar** · **Öğrenciler ve veliler** · **Tahsilat** ·
**İletişim** (Başvurular, Sosyal, SMS) · **İçerik** (Kaynaklar, Konu öncelikleri, Haftalık ilham) · **Teknik**

## 5. Önerilen sıra
1. ✓ **Şifre işleri** (19 Eylül 2026) (kritik, küçük): herkes için "Şifremi değiştir" (hesap menüsü), ilk girişte değişim,
   yöneticinin "şifre sıfırla" düğmesi (yeni geçici şifre, Edge Function).
2. ✓ **Koç detay + durum + öğrenci aktarma** (19 Eylül 2026) (veritabanı: `profiller`'e durum/başlangıç/kapasite; aktarma RPC'si).
3. ✓ **Teknik sekmesi** (19 Eylül 2026) ayrımı + entegrasyon durumları + erişim günlüğü.
4. **Başvurular** listesi (İletişim).
5. **İçerik** sekmesi ve taşımalar.
6. Öğrenci/veli yönetimi ve KVKK kayıtları.
