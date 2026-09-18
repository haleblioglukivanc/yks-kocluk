# sosyal-yanit

Instagram yorum/DM webhook'u + yönetim panelinden gönderim. Ayrıntılar: `sosyal/yanit/kurallar.md`.

- Adres: `https://sjcovxnhardtvmvooqpn.supabase.co/functions/v1/sosyal-yanit` (JWT kapalı; Meta
  isteği HMAC imzasıyla, panel isteği kullanıcı oturumu + `profiller.yonetici` ile doğrulanır).
- Tablolar: `sosyal_yanit` (kuyruk), `sosyal_ayar` (anahtarlar; ortam değişkeni yoksa buradan okunur).
- Panel: Yönetim → Sosyal sekmesi (`src/bilesenler/SosyalKutusu.jsx`). Liste `sosyal_kutusu()`,
  sayaç `sosyal_bekleyen()`, atla/geri al `sosyal_karar()` RPC'leri; gönder bu fonksiyon (`{islem:'gonder', id, metin}`).
- Kriz/istismar: tetikleyici `private.sosyal_acil_bildir` → `mail_kuyrugu` (`sosyal_acil`) → `rapor-mail`.
- `deneme = true` kayıtlar platforma gitmez (panel denemesi için).
- Gereken anahtarlar: `IG_VERIFY_TOKEN`, `IG_APP_SECRET`, `IG_TOKEN`, isteğe bağlı `CF_ACCOUNT_ID` +
  `CF_AI_TOKEN` (yapay zekâ taslağı; yoksa şablon). Hiçbir yanıt onaysız gitmez.
- Kayıtlar 90 gün sonra silinir (`sosyal-yanit-temizle` cron).
