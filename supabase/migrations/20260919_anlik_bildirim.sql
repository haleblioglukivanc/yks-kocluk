-- Anlık bildirim (web push), 19 Eylül 2026 — Supabase'de "anlik_bildirim_yeniden" adıyla uygulandı.
-- Gelen kutusu (bildirim_kuyrugu) aynen kalır; her satır için "telefona da gitsin mi"
-- kararı tek kuralda: private.anlik_mi. Telefona gitmeyenler durum='kutu'.
-- Tam metin veritabanındaki fonksiyonlardadır; burası özet + yeniden kurulum için şema.

alter table public.bildirim_kuyrugu
  add column if not exists anlik boolean not null default false,
  add column if not exists son_gecerlilik timestamptz;

update public.bildirim_kuyrugu set durum = 'kutu' where durum in ('bekliyor','hata','abone_yok');

-- Telefona giden olaylar (Bekir'in onayladığı liste)
--   koç:     mesaj, gorusme (acil görüşme), blok_talebi (ek süre / mazeret),
--            blok_kacirildi (blok 15 dk başlamadı), basvuru
--   öğrenci: mesaj (randevu mesajı dahil), ders_yaklasiyor (15 dk kala), plan (haftalık plan onaylandı)
--   veli:    yok
create or replace function private.anlik_mi(p_alici uuid, p_tip text)
returns boolean language sql stable security definer set search_path = '' as $$
  select case (select rol::text from public.profiller where id = p_alici)
    when 'koc'     then p_tip in ('mesaj','gorusme','blok_talebi','blok_kacirildi','basvuru','test')
    when 'ogrenci' then p_tip in ('mesaj','ders_yaklasiyor','plan','test')
    else p_tip = 'test'
  end
$$;

-- Sessiz saatler 23:00–07:00; gorusme / ders_yaklasiyor beklemez (bildirim_ekle)
create or replace function private.bildirim_zamani(p_an timestamptz default now())
returns timestamptz language sql stable set search_path = public, pg_temp as $$
  select case
    when extract(hour from (p_an at time zone 'Europe/Istanbul')) >= 23
      then ((p_an at time zone 'Europe/Istanbul')::date + 1 + time '07:00') at time zone 'Europe/Istanbul'
    when extract(hour from (p_an at time zone 'Europe/Istanbul')) < 7
      then ((p_an at time zone 'Europe/Istanbul')::date + time '07:00') at time zone 'Europe/Istanbul'
    else p_an end
$$;

-- Ayrıca bu migration'da (tam metinleri veritabanında):
--   private.bildirim_ekle(..., p_son_gecerlilik)  anlik/durum/planlanan belirler, anlıksa göndericiyi dürter
--   private.bildirim_gondericiyi_durt()            yalnız anlik satırlar için bildirim-gonder'i çağırır
--   public.bildirim_rozet(uuid)                    ikon rakamı = okunmamış mesaj + okunmamış bildirim
--   public.bildirim_cihaz_kaydet / _sil            cihaz kaydı (aynı cihaz hesap değiştirirse yeni hesaba geçer)
--   private.ders_yaklasiyor_bildir()               cron 'ders-yaklasiyor' her dakika; saatli, bekleyen görev
--                                                  başlangıca ≤15 dk kala bir kez (tekil 'ders-<id>')
--   private.basvuru_uygulama_bildir + tetikleyici  yeni başvuru koça (Telegram/e-posta aynen)
--   public.plan_taslagini_uygula                   plan onaylanınca öğrenciye 'plan'
--   cron 'bildirim-gorev-hatirlat' (20:00 dürtme) ve private.bildirim_gorev_hatirlat kaldırıldı

-- Ek (19 Eylül 2026, "bildirim_cihaz_kayitli_mi"): uygulama her açılışta bu cihazın sunucuda kayıtlı
-- olduğunu sorar; değilse (hesap değişti ya da gönderici ölü aboneliği sildi) yeni abonelik alır.
create or replace function public.bildirim_cihaz_kayitli_mi(p_endpoint text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.bildirim_abonelikleri where endpoint = p_endpoint and profil_id = auth.uid())
$$;
revoke all on function public.bildirim_cihaz_kayitli_mi(text) from public, anon;
grant execute on function public.bildirim_cihaz_kayitli_mi(text) to authenticated;
