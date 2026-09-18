# sosyal-yanit

Instagram yorum/DM webhook'u + Telegram onay botu. Ayrıntılar: `sosyal/yanit/kurallar.md`.

- Adres: `https://sjcovxnhardtvmvooqpn.supabase.co/functions/v1/sosyal-yanit` (JWT kapalı; Meta
  isteği HMAC imzasıyla, Telegram isteği gizli başlıkla doğrulanır).
- Tablolar: `sosyal_yanit` (kuyruk), `sosyal_ayar` (anahtarlar; ortam değişkeni yoksa buradan okunur).
- Gereken anahtarlar: `IG_VERIFY_TOKEN`, `IG_APP_SECRET`, `IG_TOKEN`, `TG_BOT_TOKEN`, `TG_CHAT_ID`,
  `TG_SECRET`, isteğe bağlı `CF_ACCOUNT_ID` + `CF_AI_TOKEN` (yapay zekâ taslağı; yoksa şablon).
- Hiçbir yanıt onaysız gitmez. Kriz/istismar: sabit güvenli yanıt önerisi + 🔔 bildirim.
