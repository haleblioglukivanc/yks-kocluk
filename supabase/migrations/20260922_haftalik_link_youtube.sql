-- Haftalık linkler yalnız YouTube (22 Eylül 2026, Bekir). Önceden eklenmiş
-- satırlara dokunulmaz (not valid); yeni ve değişen satırlar denetlenir.
alter table public.haftalik_link drop constraint if exists haftalik_link_youtube;
alter table public.haftalik_link add constraint haftalik_link_youtube
  check (url ~* '^https?://([a-z0-9-]+\.)?(youtube\.com|youtu\.be)/') not valid;
