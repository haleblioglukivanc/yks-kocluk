# DENETİM — makine taraması (Tur 0)

Tarih: 2026-09-16 · Commit: 2c15722 2026-09-16 · Adres: https://khkocluk.com
Yeniden üretmek için: `bash denetim/tara.sh` (ham çıktılar denetim/ham, görüntüler denetim/ekran — depoya girmez).

## Özet

Toplam 109 bulgu — **3 kritik**, 58 önemli, 48 hijyen.
Alanlar: veri 5 · supabase 10 · yapı 4 · tasarım sistemi 7 · kalıntı 3 · erişilebilirlik 40 · dokunma 36 · ekran 1 · performans 1 · güvenlik 1 · seo 1

Nasıl okunur: 1 kritik = veri/erişim/çökme, Tur 2'de (yargı) ilk bakılacaklar. 2 önemli = kalite ve uyum, Tur 2'de sıralanır. 3 hijyen = tartışmasız temizlik, Tur 1'de (mekanik) kapatılır.

## Kritik ve önemli bulgular
- [1] **veri** — Ziyaretçi (anon) v_kaynak_konu görünümünden 3 satır okuyabiliyor
- [1] **veri** — RPC ogrenci_gorusme_hakki: ziyaretçi (anon) çağırınca nesne(2) dönüyor
- [1] **supabase** — Advisor güvenlik [ERROR] SECURITY DEFINER görünüm — public.v_kaynak_konu — RLS'i atlıyor; anon dahil herkes okuyor (RLS matrisinde doğrulandı)
- [2] **yapı** — Build 1 uyarı veriyor (chunk boyutu / dinamik import) — ham/build.log
- [2] **yapı** — npm audit: 0 kritik, 4 yüksek açık
- [2] **tasarım sistemi** — yerlesim.css dışında 14 @media kesme noktası (kural: yalnız yerlesim.css)
- [2] **kalıntı** — workers.dev adresi 1 yerde (kapalı yayın)
- [2] **erişilebilirlik** — 1 ikon düğme aria-label'sız
- [2] **veri** — Ziyaretçi (anon) haftalik_kitap tablosundan 28 satır okuyabiliyor (tanıtım içeriği olabilir — bilinçli mi, Tur 2 karar versin)
- [2] **veri** — Ziyaretçi (anon) haftalik_program tablosundan 1 satır okuyabiliyor (tanıtım içeriği olabilir — bilinçli mi, Tur 2 karar versin)
- [2] **veri** — Ziyaretçi (anon) haftalik_soz tablosundan 26 satır okuyabiliyor (tanıtım içeriği olabilir — bilinçli mi, Tur 2 karar versin)
- [2] **supabase** — Advisor güvenlik [WARN] anon'un çağırabildiği SECURITY DEFINER fonksiyon — 28 fonksiyon; içinde auth.uid() geçmeyen 9'u: analiz_taslaklari, basvuru_gonder, bildirim_
- [2] **supabase** — Advisor güvenlik [WARN] Giriş yapan herkesin çağırabildiği SECURITY DEFINER fonksiyon — 38 fonksiyon (43 definer'ın 20'sinde auth.uid() yok: yonetici_*, plan_*, sistem_gunlugu_*,
- [2] **supabase** — Advisor güvenlik [WARN] search_path sabitlenmemiş fonksiyon — private.tebrik_taslagi, private.html_kacir
- [2] **supabase** — Advisor güvenlik [WARN] Sızmış şifre koruması kapalı — Auth ayarı: HaveIBeenPwned kontrolü açılabilir
- [2] **supabase** — Advisor güvenlik [INFO] RLS açık, politika yok — telegram_ayarlari, telegram_baglanti_kodlari, telegram_deneme_limiti, telegram_hesaplari, 
- [2] **erişilebilirlik** — ziyaretci / @telefon chromium: axe color-contrast (serious, 3 öğe) .t-kanal-rozet
- [2] **erişilebilirlik** — ziyaretci / @telefon chromium: axe scrollable-region-focusable (serious, 2 öğe) .t-ders-serit-ic
- [2] **dokunma** — ziyaretci / @telefon chromium: 7 hedef 32px altında (Pzt 52×31; Sal 52×31; Çar 52×31)
- [2] **dokunma** — ziyaretci /randevu @telefon chromium: 2 hedef 32px altında (Kıvanç HocaYKS · LGS koçu 286×31; INPUT 20×20)
- [2] **erişilebilirlik** — ziyaretci / @tablet chromium: axe color-contrast (serious, 3 öğe) .t-kanal-rozet
- [2] **erişilebilirlik** — ziyaretci / @tablet chromium: axe scrollable-region-focusable (serious, 2 öğe) .t-ders-serit-ic
- [2] **erişilebilirlik** — ziyaretci / @masaustu chromium: axe color-contrast (serious, 3 öğe) .t-kanal-rozet
- [2] **erişilebilirlik** — ziyaretci / @masaustu chromium: axe scrollable-region-focusable (serious, 2 öğe) .t-ders-serit-ic
- [2] **erişilebilirlik** — ogrenci / @telefon chromium: axe color-contrast (serious, 7 öğe) .hafta-gun--gecmis.hafta-gun[role="tab"]:nth-child(1) > .haf
- [2] **erişilebilirlik** — ogrenci /yol @telefon chromium: axe color-contrast (serious, 3 öğe) .yol-balon-ad
- [2] **erişilebilirlik** — ogrenci /denemeler @telefon chromium: axe color-contrast (serious, 2 öğe) .alt-bag:nth-child(1) > .alt-bag-ad
- [2] **erişilebilirlik** — ogrenci /mesajlar @telefon chromium: axe color-contrast (serious, 3 öğe) .alt-bag:nth-child(1) > .alt-bag-ad
- [2] **erişilebilirlik** — ogrenci /bildirimler @telefon chromium: axe color-contrast (serious, 3 öğe) .alt-bag:nth-child(1) > .alt-bag-ad
- [2] **erişilebilirlik** — ogrenci / @tablet chromium: axe color-contrast (serious, 9 öğe) .hafta-gun--gecmis.hafta-gun[role="tab"]:nth-child(1) > .haf
- [2] **erişilebilirlik** — ogrenci /yol @tablet chromium: axe color-contrast (serious, 3 öğe) .yol-balon-ad
- [2] **erişilebilirlik** — ogrenci /denemeler @tablet chromium: axe color-contrast (serious, 2 öğe) .alt-bag:nth-child(1) > .alt-bag-ad
- [2] **erişilebilirlik** — ogrenci /mesajlar @tablet chromium: axe color-contrast (serious, 3 öğe) .alt-bag:nth-child(1) > .alt-bag-ad
- [2] **erişilebilirlik** — ogrenci /bildirimler @tablet chromium: axe color-contrast (serious, 3 öğe) .alt-bag:nth-child(1) > .alt-bag-ad
- [2] **erişilebilirlik** — ogrenci / @masaustu chromium: axe color-contrast (serious, 7 öğe) .hafta-gun--gecmis.hafta-gun[role="tab"]:nth-child(1) > .haf
- [2] **erişilebilirlik** — ogrenci /yol @masaustu chromium: axe color-contrast (serious, 1 öğe) .yol-balon-ad
- [2] **erişilebilirlik** — koc / @telefon chromium: axe color-contrast (serious, 8 öğe) li:nth-child(1) > .sirada-satir.sirada-satir--dokun[data-seg
- [2] **erişilebilirlik** — koc /ogrenciler @telefon chromium: axe color-contrast (serious, 2 öğe) .alt-bag:nth-child(1) > .alt-bag-ad
- [2] **erişilebilirlik** — koc /raporlar @telefon chromium: axe color-contrast (serious, 2 öğe) .alt-bag:nth-child(1) > .alt-bag-ad
- [2] **erişilebilirlik** — koc /mesajlar @telefon chromium: axe color-contrast (serious, 3 öğe) .alt-bag:nth-child(1) > .alt-bag-ad
- [2] **erişilebilirlik** — koc /bildirimler @telefon chromium: axe color-contrast (serious, 3 öğe) .alt-bag:nth-child(1) > .alt-bag-ad
- [2] **erişilebilirlik** — koc /konular @telefon chromium: axe color-contrast (serious, 2 öğe) .alt-bag:nth-child(1) > .alt-bag-ad
- [2] **erişilebilirlik** — koc /kaynaklar @telefon chromium: axe color-contrast (serious, 2 öğe) .alt-bag:nth-child(1) > .alt-bag-ad
- [2] **ekran** — koc /kaynaklar @telefon chromium: sayfa 34k px uzunluğunda (40 ekran boyu) — liste sayfalanmalı ya da katlanmalı
- [2] **erişilebilirlik** — koc /yonetim @telefon chromium: axe color-contrast (serious, 9 öğe) li:nth-child(1) > .sirada-satir.sirada-satir--dokun[data-seg
- [2] **erişilebilirlik** — koc /ogrenci/054b18c7-1c4e-46b4-8cba-bbc0de0c1af2 @telefon chromium: axe color-contrast (serious, 10 öğe) .olcum-hedef:nth-child(2) > .olcum-hedef-satir > .olcum-hede
- [2] **erişilebilirlik** — koc /gozuyle/054b18c7-1c4e-46b4-8cba-bbc0de0c1af2 @telefon chromium: axe color-contrast (serious, 2 öğe) .alt-bag:nth-child(2) > .alt-bag-ad
- [2] **erişilebilirlik** — koc / @tablet chromium: axe color-contrast (serious, 2 öğe) .alt-bag:nth-child(2) > .alt-bag-ad
- [2] **erişilebilirlik** — koc /ogrenciler @tablet chromium: axe color-contrast (serious, 2 öğe) .alt-bag:nth-child(1) > .alt-bag-ad
- [2] **erişilebilirlik** — koc /raporlar @tablet chromium: axe color-contrast (serious, 2 öğe) .alt-bag:nth-child(1) > .alt-bag-ad
- [2] **erişilebilirlik** — koc /mesajlar @tablet chromium: axe color-contrast (serious, 3 öğe) .alt-bag:nth-child(1) > .alt-bag-ad
- [2] **erişilebilirlik** — koc /bildirimler @tablet chromium: axe color-contrast (serious, 3 öğe) .alt-bag:nth-child(1) > .alt-bag-ad
- [2] **erişilebilirlik** — koc /konular @tablet chromium: axe color-contrast (serious, 2 öğe) .alt-bag:nth-child(1) > .alt-bag-ad
- [2] **erişilebilirlik** — koc /kaynaklar @tablet chromium: axe color-contrast (serious, 2 öğe) .alt-bag:nth-child(1) > .alt-bag-ad
- [2] **erişilebilirlik** — koc /yonetim @tablet chromium: axe color-contrast (serious, 9 öğe) li:nth-child(1) > .sirada-satir.sirada-satir--dokun[data-seg
- [2] **erişilebilirlik** — koc /ogrenci/054b18c7-1c4e-46b4-8cba-bbc0de0c1af2 @tablet chromium: axe color-contrast (serious, 13 öğe) .olcum-hedef:nth-child(2) > .olcum-hedef-satir > .olcum-hede
- [2] **erişilebilirlik** — koc /gozuyle/054b18c7-1c4e-46b4-8cba-bbc0de0c1af2 @tablet chromium: axe color-contrast (serious, 2 öğe) .alt-bag:nth-child(2) > .alt-bag-ad
- [2] **erişilebilirlik** — koc /ogrenci/054b18c7-1c4e-46b4-8cba-bbc0de0c1af2 @masaustu chromium: axe color-contrast (serious, 2 öğe) .olcum-hedef:nth-child(2) > .olcum-hedef-satir > .olcum-hede
- [2] **dokunma** — ziyaretci / @telefon webkit: 7 hedef 32px altında (Pzt 52×31; Sal 52×31; Çar 52×31)
- [2] **dokunma** — ziyaretci /randevu @telefon webkit: 2 hedef 32px altında (Kıvanç HocaYKS · LGS koçu 273×31; INPUT 20×20)
- [2] **performans** — Lighthouse tanitim: performans 27 (LCP 8.3 s, TBT 5,240 ms)

## Hijyen bulguları (Tur 1)
- **yapı** — 1 dosya hiçbir yerden import edilmiyor (ölü dosya): SifreOnerisi.jsx
- **yapı** — 17 kullanılmayan export
- **tasarım sistemi** — tema.css dışında 73 ham renk (hex) — en çok: tanitim.css 50, index.css 16, KonuYolu.css 5
- **tasarım sistemi** — tema.css dışında 95 rgb()/hsl() rengi
- **tasarım sistemi** — JSX içinde 46 satırda ham renk
- **tasarım sistemi** — 26 satır inline style — en çok: Kalem.jsx 3, SiradakiKart.jsx 3, App.jsx 2
- **tasarım sistemi** — 8 !important
- **tasarım sistemi** — 27 seçici birden fazla CSS dosyasında tanımlı
- **kalıntı** — "Kâmil" 18 yerde geçiyor (maskot adı Çizbi)
- **kalıntı** — 2 TODO/FIXME
- **güvenlik** — Edge function kullanici-sil: CORS * (herhangi bir siteden çağrılabilir)
- **supabase** — Advisor performans [WARN] İndekssiz yabancı anahtar — 15+: gorevler.ders_id/konu_id, mesajlar.gonderen_id/ogrenci_id, calisma_oturumlari.ders_id
- **supabase** — Advisor performans [WARN] Politikada auth.uid() satır başına çalışıyor — 15+ politika (profiller, ogrenciler, gorevler, denemeler, konu_ilerleme, kataloglar, dersl
- **supabase** — Advisor performans [WARN] Aynı tablo/komut/rol için birden çok permissive politika — 14: calisma_oturumlari, dersler, kataloglar, kaynak_konu, kaynaklar, koc_notlari, konu_ile
- **supabase** — Advisor performans [INFO] Hiç kullanılmamış indeks — ix_sinyal_konu, sms_kuyrugu_bekleyen, kaynaklar_koc_idx, taksitler_vade_idx, deneme_anketi
- **dokunma** — ziyaretci /giris @telefon chromium: 1 hedef 44px altında
- **dokunma** — ogrenci / @telefon chromium: 18 hedef 44px altında
- **dokunma** — ogrenci /yol @telefon chromium: 2 hedef 44px altında
- **dokunma** — ogrenci /denemeler @telefon chromium: 2 hedef 44px altında
- **dokunma** — ogrenci /mesajlar @telefon chromium: 2 hedef 44px altında
- **dokunma** — ogrenci /bildirimler @telefon chromium: 2 hedef 44px altında
- **dokunma** — koc / @telefon chromium: 5 hedef 44px altında
- **dokunma** — koc /ogrenciler @telefon chromium: 3 hedef 44px altında
- **dokunma** — koc /raporlar @telefon chromium: 6 hedef 44px altında
- **dokunma** — koc /mesajlar @telefon chromium: 2 hedef 44px altında
- **dokunma** — koc /bildirimler @telefon chromium: 2 hedef 44px altında
- **dokunma** — koc /konular @telefon chromium: 2 hedef 44px altında
- **dokunma** — koc /kaynaklar @telefon chromium: 12 hedef 44px altında
- **dokunma** — koc /yonetim @telefon chromium: 5 hedef 44px altında
- **dokunma** — koc /ogrenci/054b18c7-1c4e-46b4-8cba-bbc0de0c1af2 @telefon chromium: 6 hedef 44px altında
- **dokunma** — koc /gozuyle/054b18c7-1c4e-46b4-8cba-bbc0de0c1af2 @telefon chromium: 3 hedef 44px altında
- **dokunma** — ziyaretci /giris @telefon webkit: 1 hedef 44px altında
- **dokunma** — ogrenci / @telefon webkit: 18 hedef 44px altında
- **dokunma** — ogrenci /yol @telefon webkit: 2 hedef 44px altında
- **dokunma** — ogrenci /denemeler @telefon webkit: 2 hedef 44px altında
- **dokunma** — ogrenci /mesajlar @telefon webkit: 2 hedef 44px altında
- **dokunma** — ogrenci /bildirimler @telefon webkit: 2 hedef 44px altında
- **dokunma** — koc / @telefon webkit: 5 hedef 44px altında
- **dokunma** — koc /ogrenciler @telefon webkit: 3 hedef 44px altında
- **dokunma** — koc /raporlar @telefon webkit: 6 hedef 44px altında
- **dokunma** — koc /mesajlar @telefon webkit: 2 hedef 44px altında
- **dokunma** — koc /bildirimler @telefon webkit: 2 hedef 44px altında
- **dokunma** — koc /konular @telefon webkit: 2 hedef 44px altında
- **dokunma** — koc /yonetim @telefon webkit: 3 hedef 44px altında
- **dokunma** — koc /ogrenci/054b18c7-1c4e-46b4-8cba-bbc0de0c1af2 @telefon webkit: 6 hedef 44px altında
- **dokunma** — koc /gozuyle/054b18c7-1c4e-46b4-8cba-bbc0de0c1af2 @telefon webkit: 17 hedef 44px altında
- **dokunma** — koc /kaynaklar @telefon webkit: 12 hedef 44px altında
- **seo** — Lighthouse giris: SEO 83

## Yapı
- Build: başarılı, 1 uyarı
- Dist: toplam 2.9M · index-CaGBIZ62.js 719KB · index-BDfgwpOJ.css 202KB
- npm audit: low 0, moderate 2, high 4, critical 0
- knip: 1 ölü dosya, 17 kullanılmayan export, 0 kullanılmayan paket
  - src/ekranlar/SifreOnerisi.jsx

## Tasarım sistemi ve hijyen (statik)
- CSS 6001 satır / 7 dosya; JSX/JS 83 dosya; edge function 1
- Ham renk (hex) tema.css dışında: 73 — tanitim.css 50, index.css 16, KonuYolu.css 5, randevu.css 1, yerlesim.css 1
- rgb()/hsl(): 95 · JSX'te renk: 46 · inline style: 26 · px (tema/yerlesim dışı, ince ayar hariç): 86 · !important: 8
- @media yerlesim.css dışında: 14 — index.css:318, index.css:372, index.css:630, index.css:968, index.css:1009, index.css:1030, index.css:1032, index.css:1042, index.css:1056, index.css:1473
- Tekrarlı seçici: 27
  - `.uygulama` → index.css, yerlesim.css
  - `.uygulama > main` → index.css, yerlesim.css
  - `main` → index.css, yerlesim.css
  - `.kart` → index.css, yerlesim.css
  - `.sayi` → index.css, sistem.css
  - `.ilerleme--tekrar_gerekli` → index.css, sistem.css
  - `.konu-rozet` → index.css, sistem.css
  - `.kalem-kose` → index.css, yerlesim.css
  - `.rapor-kpi` → index.css, yerlesim.css
  - `.alt-sayfa` → index.css, yerlesim.css
  - `.alt-bag:active` → index.css, yerlesim.css
  - `.alt-gezinme` → index.css, yerlesim.css
  - `.alt-bag` → index.css, yerlesim.css
  - `.alt-bag-ikon` → index.css, yerlesim.css
  - `.alt-bag--etkin .alt-bag-ikon` → index.css, yerlesim.css
- Kalıntı: Kâmil 18 · workers.dev 1 · eski alan adı 0 · console.log 0 · TODO 2 · localhost 0
  - Kâmil: src/bilesenler/KonuYolu.css:123 — .yol-kamil { position: absolute; width: 56px; pointer-events: none; z-index: 1; transition: left 0.5s cubic-be
  - Kâmil: src/bilesenler/KonuYolu.css:125 — .yol-kamil--ayna { transform: scaleX(-1); }
  - Kâmil: src/bilesenler/KonuYolu.css:126 — .yol-kamil--zipla { animation: yol-zipla 0.6s cubic-bezier(0.3, 1.4, 0.5, 1); }
  - Kâmil: src/bilesenler/KonuYolu.css:127 — .yol-kamil--ayna.yol-kamil--zipla { animation-name: yol-zipla-ayna; }
  - Kâmil: src/bilesenler/KonuYolu.css:138 — .yol-balon-kamil { flex: none; width: 40px; height: 40px; }
  - Kâmil: src/bilesenler/KonuYolu.css:176 — .yol-kamil, .yol-cubuk i { transition: none; }
- En büyük dosyalar: index.css 4519, OgrenciDetay.jsx 1534, KararKuyrugu.jsx 789, YoneticiPaneli.jsx 739, App.jsx 619, Tanitim.jsx 569
- Edge function'lar:
  - kullanici-sil: 181 satır · auth başlığı var · getUser var · rol kontrolü var · service_role var · CORS *
- PWA: manifest var, service worker var

## Veri erişimi (RLS matrisi — canlı, yalnız okuma)
Sütunlar: ziyaretçi (anon) · demo öğrenci · başka öğrenci (ornek.deniz) · demo koç. Sayı = okunabilen satır; "izin yok" = grant yok; 0 = RLS gizliyor.

| tablo | anon | öğrenci | başka öğr. | koç |
|---|---|---|---|---|
| basvurular | 0 | 0 | 0 | 0 |
| bildirim_abonelikleri | 0 | 0 | 0 | 0 |
| bildirim_kuyrugu | 0 | 0 | 2 | 1 |
| blok_talepleri | undefined | 0 | 0 | 0 |
| calisma_oturumlari | 0 | 0 | 0 | 0 |
| deneme_analizleri | undefined | 0 | 0 | 0 |
| deneme_anketi | 0 | 0 | 0 | 0 |
| deneme_hatalari | 0 | 0 | 9 | 0 |
| deneme_ozet | 0 | 0 | 3 | 0 |
| deneme_sonuclari | 0 | 0 | 27 | 0 |
| denemeler | 0 | 0 | 3 | 0 |
| dersler | 0 | 82 | 82 | 82 |
| gorevler | 0 | 14 | 42 | 14 |
| gorusme_talepleri | undefined | 0 | 0 | 0 |
| gun_kapanis | undefined | 1 | 1 | 1 |
| haftalik_kitap | 28 | 28 | 28 | 28 |
| haftalik_program | 1 | 1 | 1 | 1 |
| haftalik_soz | 26 | 26 | 26 | 26 |
| kalem_ayarlari | 0 | 0 | 0 | 0 |
| kalem_olaylari | 0 | 5 | 0 | 3 |
| karar_ertelemeleri | 0 | 0 | 0 | 0 |
| karne_yuklemeleri | 0 | 0 | 12 | 0 |
| kataloglar | 0 | 7 | 7 | 7 |
| kaynak_konu | undefined | 1 | 1 | 1 |
| kaynaklar | undefined | 243 | 243 | 243 |
| koc_notlari | 0 | 0 | 0 | 0 |
| konu_agirlik | 0 | 1453 | 1453 | 1453 |
| konu_ilerleme | 0 | 14 | 26 | 14 |
| konu_skor | 0 | 323 | 323 | 323 |
| konular | 0 | 1498 | 1498 | 1498 |
| mail_kuyrugu | 0 | 0 | 0 | 5 |
| mesajlar | 0 | 0 | 0 | 0 |
| ogrenci_gun_kapanis_ozeti | undefined | 1 | 1 | 1 |
| ogrenci_net_durumu | 0 | 0 | 1 | 0 |
| ogrenci_risk | undefined | 1 | 1 | 1 |
| ogrenci_rozet | 0 | 2 | 2 | 2 |
| ogrenciler | 0 | 1 | 1 | 1 |
| profiller | 0 | 2 | 2 | 2 |
| rapor_ayarlari | 0 | 0 | 0 | 2 |
| rozetler | 0 | 12 | 12 | 12 |
| rutin_kayit | undefined | 0 | 0 | 0 |
| rutinler | undefined | 0 | 0 | 0 |
| seriler | 0 | 1 | 0 | 1 |
| sms_kuyrugu | 0 | 0 | 0 | 0 |
| soru_kayitlari | undefined | 0 | 0 | 0 |
| sozlesmeler | 0 | 0 | 0 | 0 |
| tahsilatlar | 0 | 0 | 0 | 0 |
| taksitler | 0 | 0 | 0 | 0 |
| telegram_ayarlari | 0 | 0 | 0 | 0 |
| telegram_baglanti_kodlari | 0 | 0 | 0 | 0 |
| telegram_deneme_limiti | 0 | 0 | 0 | 0 |
| telegram_hesaplari | 0 | 0 | 0 | 0 |
| v_kaynak_konu | 3 | 3 | 3 | 3 |
| v_konu_agirlik_norm | 0 | 1498 | 1498 | 1498 |
| v_konu_beklenen | 0 | 1498 | 1498 | 1498 |
| v_konu_oncelik | 0 | 323 | 323 | 323 |
| v_taksit_durum | 0 | 0 | 0 | 0 |
| veli_haftalik_ozet | 0 | 0 | 1 | 0 |
| veli_ogrenci | 0 | 0 | 0 | 0 |
| veliler | 0 | 0 | 0 | 0 |
| zorlanma_sinyali | 0 | 0 | 9 | 0 |

Öğrenciler arası sızıntı denemesi (öğrenci, diğer öğrencinin satırını filtreleyip sayıyor):
- bildirim_kuyrugu (id): demo→diğer undefined, diğer→demo undefined
- deneme_ozet (ogrenci_id): demo→diğer 0, diğer→demo 0
- deneme_sonuclari (id): demo→diğer undefined, diğer→demo undefined
- denemeler (ogrenci_id): demo→diğer 0, diğer→demo 0
- dersler (id): demo→diğer undefined, diğer→demo undefined
- gorevler (ogrenci_id): demo→diğer 0, diğer→demo 0
- gun_kapanis (ogrenci_id): demo→diğer 0, diğer→demo 0
- haftalik_kitap (id): demo→diğer undefined, diğer→demo undefined
- haftalik_soz (id): demo→diğer undefined, diğer→demo undefined
- kalem_olaylari (profil_id): demo→diğer 0, diğer→demo 0
- karne_yuklemeleri (ogrenci_id): demo→diğer 0, diğer→demo 0
- kataloglar (id): demo→diğer undefined, diğer→demo undefined
- kaynaklar (id): demo→diğer undefined, diğer→demo undefined
- konu_ilerleme (ogrenci_id): demo→diğer 0, diğer→demo 0
- konu_skor (ogrenci_id): demo→diğer 0, diğer→demo 0
- konular (id): demo→diğer undefined, diğer→demo undefined
- mail_kuyrugu (ogrenci_id): demo→diğer 0, diğer→demo 0
- ogrenci_gun_kapanis_ozeti (ogrenci_id): demo→diğer 0, diğer→demo 0
- ogrenci_net_durumu (ogrenci_id): demo→diğer 0, diğer→demo 0
- ogrenci_risk (ogrenci_id): demo→diğer 0, diğer→demo 0
- ogrenci_rozet (ogrenci_id): demo→diğer 0, diğer→demo 0
- ogrenciler (id): demo→diğer 0, diğer→demo 0
- profiller (id): demo→diğer 0, diğer→demo 0
- rapor_ayarlari (ogrenci_id): demo→diğer 0, diğer→demo 0
- rozetler (id): demo→diğer undefined, diğer→demo undefined
- seriler (ogrenci_id): demo→diğer 0, diğer→demo 0
- v_konu_oncelik (koc_id): demo→diğer 0, diğer→demo 0
- veli_haftalik_ozet (ogrenci_id): demo→diğer 0, diğer→demo 0
- zorlanma_sinyali (ogrenci_id): demo→diğer 0, diğer→demo 0

RPC sondası (yalnız okuyan SECURITY DEFINER fonksiyonlar; beklenen hata ya da boş):
- yonetici_ogrenci_listesi: ziyaretçi → 0 satır · öğrenci → 0 satır
- yonetici_risk_listesi: ziyaretçi → hata 42501 · öğrenci → hata 42501
- analiz_taslaklari: ziyaretçi → 0 satır · öğrenci → 0 satır
- koc_karar_kuyrugu: ziyaretçi → 0 satır · öğrenci → 0 satır
- odeme_ozeti: ziyaretçi → nesne(0) · öğrenci → nesne(0)
- anket_egrisi: ziyaretçi → 0 satır · öğrenci → 0 satır
- koc_gorusme_haftasi: ziyaretçi → 0 satır · öğrenci → 0 satır
- ogrenci_gorusme_hakki: ziyaretçi → nesne(2) · öğrenci → hata P0001
- telegram_durumum: ziyaretçi → hata P0001 · öğrenci → hata P0001
- sistem_gunlugu_son: ziyaretçi → hata 42501 · öğrenci → 0 satır
- yonetici_nabzi: ziyaretçi → hata 42501 · öğrenci → hata 42501

## Supabase advisors
- Güvenlik: 6 · Performans: 4
  - [güvenlik ERROR] SECURITY DEFINER görünüm: public.v_kaynak_konu — RLS'i atlıyor; anon dahil herkes okuyor (RLS matrisinde doğrulandı)
  - [güvenlik WARN] anon'un çağırabildiği SECURITY DEFINER fonksiyon: 28 fonksiyon; içinde auth.uid() geçmeyen 9'u: analiz_taslaklari, basvuru_gonder, bildirim_genel_anahtar, karne_eslestir, odeme_oze
  - [güvenlik WARN] Giriş yapan herkesin çağırabildiği SECURITY DEFINER fonksiyon: 38 fonksiyon (43 definer'ın 20'sinde auth.uid() yok: yonetici_*, plan_*, sistem_gunlugu_*, telegram_isle, bildirim_*…
  - [güvenlik WARN] search_path sabitlenmemiş fonksiyon: private.tebrik_taslagi, private.html_kacir
  - [güvenlik WARN] Sızmış şifre koruması kapalı: Auth ayarı: HaveIBeenPwned kontrolü açılabilir
  - [güvenlik INFO] RLS açık, politika yok: telegram_ayarlari, telegram_baglanti_kodlari, telegram_deneme_limiti, telegram_hesaplari, private.sistem_gunlugu — API'den kapalı, muhtemelen bilinçli
  - [performans WARN] İndekssiz yabancı anahtar: 15+: gorevler.ders_id/konu_id, mesajlar.gonderen_id/ogrenci_id, calisma_oturumlari.ders_id/konu_id, deneme_sonuclari.ders_id, konu_ilerleme.onaylayan_i
  - [performans WARN] Politikada auth.uid() satır başına çalışıyor: 15+ politika (profiller, ogrenciler, gorevler, denemeler, konu_ilerleme, kataloglar, dersler…) — (select auth.uid()) ile sarılmalı
  - [performans WARN] Aynı tablo/komut/rol için birden çok permissive politika: 14: calisma_oturumlari, dersler, kataloglar, kaynak_konu, kaynaklar, koc_notlari, konu_ilerleme, konular, profiller (SEL
  - [performans INFO] Hiç kullanılmamış indeks: ix_sinyal_konu, sms_kuyrugu_bekleyen, kaynaklar_koc_idx, taksitler_vade_idx, deneme_anketi_ogrenci (istatistik sıfırlanmış olabilir)

## Ekranlar (canlı, demo hesaplar)
72 yükleme: Chromium 390/820/1366 + WebKit 390. Görüntüler denetim/ekran/*.png (depoda değil).

| rol | yol | genişlik | motor | sn | boy | taşma | konsol | istek | axe c/s | <44px |
|---|---|---|---|---|---|---|---|---|---|---|
| ziyaretci | / | telefon | chromium | 5.2 | 9.5k |  |  |  | 0/2 | 7 |
| ziyaretci | /giris | telefon | chromium | 3.1 | 0.8k |  |  |  | 0/0 | 1 |
| ziyaretci | /randevu | telefon | chromium | 2.7 | 1.1k |  |  |  | 0/0 | 2 |
| ziyaretci | / | tablet | chromium | 4.3 | 7.9k |  |  |  | 0/2 |  |
| ziyaretci | /giris | tablet | chromium | 3.3 | 1.2k |  |  |  | 0/0 |  |
| ziyaretci | /randevu | tablet | chromium | 2.8 | 1.2k |  |  |  | 0/0 |  |
| ziyaretci | / | masaustu | chromium | 3.4 | 7.1k |  |  |  | 0/2 |  |
| ziyaretci | /giris | masaustu | chromium | 2.7 | 0.9k |  |  |  | 0/0 |  |
| ziyaretci | /randevu | masaustu | chromium | 2.7 | 1.1k |  |  |  | 0/0 |  |
| ogrenci | / | telefon | chromium | 2.9 | 1.2k |  |  |  | 0/1 | 18 |
| ogrenci | /yol | telefon | chromium | 2.7 | 3.7k |  |  |  | 0/1 | 2 |
| ogrenci | /denemeler | telefon | chromium | 2.7 | 0.8k |  |  |  | 0/1 | 2 |
| ogrenci | /mesajlar | telefon | chromium | 2.7 | 0.8k |  |  |  | 0/1 | 2 |
| ogrenci | /bildirimler | telefon | chromium | 2.7 | 0.8k |  |  |  | 0/1 | 2 |
| ogrenci | / | tablet | chromium | 3.0 | 1.2k |  |  |  | 0/1 |  |
| ogrenci | /yol | tablet | chromium | 2.7 | 3.6k |  |  |  | 0/1 |  |
| ogrenci | /denemeler | tablet | chromium | 2.7 | 1.2k |  |  |  | 0/1 |  |
| ogrenci | /mesajlar | tablet | chromium | 2.7 | 1.2k |  |  |  | 0/1 |  |
| ogrenci | /bildirimler | tablet | chromium | 2.6 | 1.2k |  |  |  | 0/1 |  |
| ogrenci | / | masaustu | chromium | 2.8 | 0.9k |  |  |  | 0/1 |  |
| ogrenci | /yol | masaustu | chromium | 2.6 | 3.4k |  |  |  | 0/1 |  |
| ogrenci | /denemeler | masaustu | chromium | 2.6 | 0.9k |  |  |  | 0/0 |  |
| ogrenci | /mesajlar | masaustu | chromium | 2.6 | 0.9k |  |  |  | 0/0 |  |
| ogrenci | /bildirimler | masaustu | chromium | 2.6 | 0.9k |  |  |  | 0/0 |  |
| koc | / | telefon | chromium | 2.8 | 1.1k |  |  |  | 0/1 | 5 |
| koc | /ogrenciler | telefon | chromium | 2.6 | 0.8k |  |  |  | 0/1 | 3 |
| koc | /raporlar | telefon | chromium | 2.6 | 3.3k |  |  |  | 0/1 | 6 |
| koc | /mesajlar | telefon | chromium | 2.6 | 0.8k |  |  |  | 0/1 | 2 |
| koc | /bildirimler | telefon | chromium | 2.6 | 0.8k |  |  |  | 0/1 | 2 |
| koc | /konular | telefon | chromium | 2.6 | 0.8k |  |  |  | 0/1 | 2 |
| koc | /kaynaklar | telefon | chromium | 2.6 | 33.8k |  |  |  | 0/1 | 12 |
| koc | /yonetim | telefon | chromium | 2.6 | 1.1k |  |  |  | 0/1 | 5 |
| koc | /ogrenci/054b18c7-1c4e-46b4-8cba-bbc0de0c1af2 | telefon | chromium | 2.6 | 1.1k |  |  |  | 0/1 | 6 |
| koc | /gozuyle/054b18c7-1c4e-46b4-8cba-bbc0de0c1af2 | telefon | chromium | 2.6 | 1k |  |  |  | 0/1 | 3 |
| koc | / | tablet | chromium | 2.7 | 1.2k |  |  |  | 0/1 |  |
| koc | /ogrenciler | tablet | chromium | 2.6 | 1.2k |  |  |  | 0/1 |  |
| koc | /raporlar | tablet | chromium | 2.6 | 2.3k |  |  |  | 0/1 |  |
| koc | /mesajlar | tablet | chromium | 2.6 | 1.2k |  |  |  | 0/1 |  |
| koc | /bildirimler | tablet | chromium | 2.6 | 1.2k |  |  |  | 0/1 |  |
| koc | /konular | tablet | chromium | 2.6 | 1.2k |  |  |  | 0/1 |  |
| koc | /kaynaklar | tablet | chromium | 2.6 | 29.6k |  |  |  | 0/1 |  |
| koc | /yonetim | tablet | chromium | 2.6 | 1.2k |  |  |  | 0/1 |  |
| koc | /ogrenci/054b18c7-1c4e-46b4-8cba-bbc0de0c1af2 | tablet | chromium | 2.6 | 1.2k |  |  |  | 0/1 |  |
| koc | /gozuyle/054b18c7-1c4e-46b4-8cba-bbc0de0c1af2 | tablet | chromium | 2.6 | 1.2k |  |  |  | 0/1 |  |
| koc | / | masaustu | chromium | 3.0 | 1.2k |  |  |  | 0/0 |  |
| koc | /ogrenciler | masaustu | chromium | 2.6 | 0.9k |  |  |  | 0/0 |  |
| koc | /raporlar | masaustu | chromium | 2.6 | 1.7k |  |  |  | 0/0 |  |
| koc | /mesajlar | masaustu | chromium | 2.6 | 0.9k |  |  |  | 0/0 |  |
| koc | /bildirimler | masaustu | chromium | 2.6 | 0.9k |  |  |  | 0/0 |  |
| koc | /konular | masaustu | chromium | 2.6 | 0.9k |  |  |  | 0/0 |  |
| koc | /kaynaklar | masaustu | chromium | 2.6 | 0.9k |  |  |  | 0/0 |  |
| koc | /yonetim | masaustu | chromium | 2.6 | 1.1k |  |  |  | 0/0 |  |
| koc | /ogrenci/054b18c7-1c4e-46b4-8cba-bbc0de0c1af2 | masaustu | chromium | 2.6 | 0.9k |  |  |  | 0/1 |  |
| koc | /gozuyle/054b18c7-1c4e-46b4-8cba-bbc0de0c1af2 | masaustu | chromium | 2.6 | 0.9k |  |  |  | 0/0 |  |
| ziyaretci | / | telefon | webkit | 3.1 | 9.6k |  |  |  |  | 7 |
| ziyaretci | /giris | telefon | webkit | 2.6 | 0.8k |  |  |  |  | 1 |
| ziyaretci | /randevu | telefon | webkit | 2.6 | 1.1k |  |  |  |  | 2 |
| ogrenci | / | telefon | webkit | 2.7 | 1.2k |  |  |  |  | 18 |
| ogrenci | /yol | telefon | webkit | 2.7 | 3.7k |  |  |  |  | 2 |
| ogrenci | /denemeler | telefon | webkit | 2.6 | 0.8k |  |  |  |  | 2 |
| ogrenci | /mesajlar | telefon | webkit | 2.6 | 0.8k |  |  |  |  | 2 |
| ogrenci | /bildirimler | telefon | webkit | 2.6 | 0.8k |  |  |  |  | 2 |
| koc | / | telefon | webkit | 2.8 | 1.1k |  |  |  |  | 5 |
| koc | /ogrenciler | telefon | webkit | 2.6 | 0.8k |  |  |  |  | 3 |
| koc | /raporlar | telefon | webkit | 2.6 | 3.2k |  |  |  |  | 6 |
| koc | /mesajlar | telefon | webkit | 2.6 | 0.8k |  |  |  |  | 2 |
| koc | /bildirimler | telefon | webkit | 2.6 | 1.6k |  |  |  |  | 2 |
| koc | /konular | telefon | webkit | 2.6 | 0.8k |  |  |  |  | 2 |
| koc | /yonetim | telefon | webkit | 2.7 | 1.1k |  |  |  |  | 3 |
| koc | /ogrenci/054b18c7-1c4e-46b4-8cba-bbc0de0c1af2 | telefon | webkit | 2.6 | 1.1k |  |  |  |  | 6 |
| koc | /gozuyle/054b18c7-1c4e-46b4-8cba-bbc0de0c1af2 | telefon | webkit | 2.6 | 1.2k |  |  |  |  | 17 |
| koc | /kaynaklar | telefon | webkit | 2.8 | 33.1k |  |  |  |  | 12 |

axe kural özeti (tüm ekranlar): color-contrast (serious) ×36 · page-has-heading-one (moderate) ×17 · heading-order (moderate) ×7 · region (moderate) ×6 · landmark-one-main (moderate) ×5 · scrollable-region-focusable (serious) ×3

## Lighthouse (mobil)
- giris: performans 71 · erişilebilirlik 100 · best practices 100 · SEO 83 · LCP 4.3 s · CLS 0.002 · TBT 230 ms · Total size was 457 KiB
- tanitim: performans 27 · erişilebilirlik 96 · best practices 100 · SEO 92 · LCP 8.3 s · CLS 0.114 · TBT 5,240 ms · Total size was 1,963 KiB

## Bu turda ölçülmeyenler (Tur 2'de elle/yargıyla)
- Yazma yetkileri (RLS insert/update/delete) — canlı veriye yazılmadı
- Veli hesabı (demo veli yok) ve /gozuyle akışının içi
- Telegram / SMS / mail kuyruğu / pg_cron işleri
- İş mantığının doğruluğu (karar kuyruğu, plan taslağı, aralıklı tekrar)
- Metin tonu ve yazım (Türkçe)
