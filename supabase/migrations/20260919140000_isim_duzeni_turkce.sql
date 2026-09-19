-- Kişi adları tamamı BÜYÜK ya da tamamı küçük girilirse "Baş Harfler Büyük" yapılır
-- (Türkçe I/ı, İ/i doğru). Karışık yazıma dokunulmaz. Hedef üniversite/bölüm
-- alanlarına uygulanmaz: ODTÜ, İTÜ, PDR gibi kısaltmaları bozuyordu.
create or replace function public.tr_kucuk(s text) returns text language sql immutable as $$
  select lower(replace(replace(s, 'I', 'ı'), 'İ', 'i'))
$$;
create or replace function public.tr_buyuk(s text) returns text language sql immutable as $$
  select upper(replace(replace(s, 'i', 'İ'), 'ı', 'I'))
$$;
create or replace function public.isim_duzelt(s text) returns text language plpgsql immutable as $$
declare sonuc text := ''; onceki text := ' '; c text; i int;
begin
  if s is null then return null; end if;
  s := regexp_replace(btrim(s), '\s+', ' ', 'g');
  if s !~ '[[:alpha:]]' then return s; end if;
  if s <> tr_buyuk(s) and s <> tr_kucuk(s) then return s; end if;
  for i in 1..char_length(s) loop
    c := substr(s, i, 1);
    if onceki in (' ', '-', '(', '/') then sonuc := sonuc || tr_buyuk(c);
    else sonuc := sonuc || tr_kucuk(c); end if;
    onceki := c;
  end loop;
  return sonuc;
end $$;
create or replace function public.profil_isim_duzelt() returns trigger language plpgsql as $$
begin new.ad_soyad := isim_duzelt(new.ad_soyad); return new; end $$;
create or replace function public.veli_isim_duzelt() returns trigger language plpgsql as $$
begin new.ad_soyad := isim_duzelt(new.ad_soyad); return new; end $$;
drop trigger if exists profiller_isim_duzelt on public.profiller;
create trigger profiller_isim_duzelt before insert or update of ad_soyad on public.profiller
  for each row execute function public.profil_isim_duzelt();
drop trigger if exists veliler_isim_duzelt on public.veliler;
create trigger veliler_isim_duzelt before insert or update of ad_soyad on public.veliler
  for each row execute function public.veli_isim_duzelt();
update public.profiller set ad_soyad = isim_duzelt(ad_soyad) where ad_soyad is distinct from isim_duzelt(ad_soyad);
update public.veliler set ad_soyad = isim_duzelt(ad_soyad) where ad_soyad is distinct from isim_duzelt(ad_soyad);
