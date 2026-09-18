# Tasarım Tespiti — 18 Eylül 2026

Kaynak: canlı site (khkocluk.com), demo hesaplar (koç / öğrenci / veli), 390px ve 1280px, Chromium.
Ölçüm makineyle yapıldı (DOM taraması) + beş ekranın görüntüsüne bakıldı + kodda `<Kart>` / `<Bos>` sayımı.
Kurallar: `TASARIM-KURALLARI.md`. Bu belge ekranlara dokunmaz; yalnız sırayı belirlemek için.

**Sınırlar:** Demo verisi az (1 öğrenci), bazı ekranlar boş durumda ölçüldü. Yönetim ekranı demo koça
kapalı olduğu için ölçülemedi; yalnız koddan değerlendirildi.

## Özet tablo (telefon)

| Ekran | Yüzey | İç içe | Kenarlı | Dolu düğme | Hap/rozet | Durum |
|---|---|---|---|---|---|---|
| Koç · öğrenci ekranı (Program) | 4 | 0 | 2 | 1 | 0 | ✓ 1. adımda düzeltildi |
| Koç · öğrenci ekranı (Kayıt) | 8 | 1 | 6 | 1 | 0 | form kutusu kart içinde |
| Koç · Bugün | 3 | 0 | 1 | 1 | 0 | karar kartında 3 çerçeveli düğme, "Sırada" satırlarında hap |
| Koç · Raporlar | 18 | 7 | 13 | 2 | 4 | **en kötü**: KPI kutuları kart içinde, filtre hapları, 4 yuvarlak düğme |
| Koç · Kaynaklar | 730 | 729 | 730 | 0 | — | 243 kaynak kartı, her birinde 2 çerçeveli etiket |
| Koç · Öğrenciler / Mesajlar / Bildirimler / Konular | ≤2 | 0 | ≤2 | 0 | 0 | temiz |
| Öğrenci · Bugün | 5 | 0 | 3 | 0 | 0 | şeritte gün kutuları çerçeveli, beyaz kart dikişte |
| Öğrenci · Yol | 8 | 4 | 7 | 0 | 4 | haritada rozetler kart içinde, ikinci Çizbi balonu (bilinen) |
| Öğrenci · Denemeler / Mesajlar / Bildirimler | ≤3 | 0 | ≤2 | ≤1 | 0 | temiz |
| Veli · ana sayfa | 7 | 3 | 6 | 0 | 4 | "Haftanın kitabı/sözü" kutuları, rozetler |
| Yönetim (koddan) | — | — | — | — | — | 12 `<Kart>`; Sistem (cron) listesi günlük işe karışıyor (kural 10) |

## Ekran ekran bulgular

**Koç · Raporlar** — Kural 1, 2, 6, 7. Dört ölçüm kutusu kartın içinde ayrı kutular; dönem filtresi
hap şeklinde; boş grafikler Çizbi'li ayrı kartlar; iki dolu düğme ("Yenile", "Bu raporu bana gönder");
öğrenci satırında "Durgun" hapı.

**Koç · Bugün** — Kural 2, 6, 7. Karar kartında dolu "Onayla" + iki çerçeveli düğme (üç eylem kutusu);
"Bugün 12 / Bu hafta 1" sekmeleri hap şeklinde; "Sırada" listesinde ders·konu hapları.
Kıvanç'ın her gün açtığı ekran — etkisi en yüksek.

**Koç · öğrenci ekranı, kalan sekmeler** — Denemeler, Konular, Kayıt kart dizisi; Kayıt'ta form kutusu
kart içinde (kural 1); "Öğrencinin kaynakları" ayrı kart.

**Koç · Kaynaklar** — Kural 1, 2, 7. Her kitap bir kart, içinde iki çerçeveli renkli etiket
("Soru bankası", "Sınav ayarı"). Liste satırı + düz metin alt satırı yeterli.

**Öğrenci · Bugün** — Kural 1, 9. Hafta şeridinde gün kutuları çerçeveli (`.siradaki` kapsamlı eski stil;
`GunSeridi` ortak, kapsamlı stil kaldırılınca koçtakiyle aynı olur). Genel olarak iyi durumda.

**Öğrenci · Yol** — Kural 7 + bilinen açık: açık renkli ikinci Çizbi balonu "tek ses" dışında.

**Veli** — Kural 1, 7. Küçük; iki bilgi kutusu ve rozetler.

**Yönetim** — Kural 10: Koçlar/Tahsilat/Sosyal/Sistem sekmeleri doğru yerde (hesap menüsü arkası),
ama Sistem'in cron listesi ve KPI kartları kart dizisi. Kıvanç hesabıyla ayrıca bakılmalı.

## Önerilen sıra

1. ✓ Koç · Bugün (18 Eylül 2026; renk dili de güncellendi: koç lacivert, öğrenci koyu amber)
2. ✓ Koç · öğrenci ekranının kalan sekmeleri (18 Eylül 2026)
3. ✓ Koç · Raporlar (18 Eylül 2026)
4. ✓ Öğrenci · Bugün şeridi + Yol (18 Eylül 2026)
5. ✓ Koç · Kaynaklar (18 Eylül 2026)
6. ✓ Veli (19 Eylül 2026)
7. Yönetim (Kıvanç'ın hesabıyla tespit + düzeltme)
8. Denetim kontrollerinin `denetim/`'e eklenmesi — sonraki ekranlar kuralı bozarsa otomatik yakalansın

Ayrı konu (kural temizliği değil, yeni özellik): Kıvanç'ın Excel'deki "tek bakışta her şey" ihtiyacı için
koç masaüstünde öğrenci × gün tablosu. Bugün ekranı sadeleştikten sonra ele alınmalı.
