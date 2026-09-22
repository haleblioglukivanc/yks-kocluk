-- Haftalık izleme linkleri (22 Eylül 2026, Bekir mokabı onayladı: "onay ok").
-- Koç öğrencinin haftasına link (video) ekler; öğrenci linki uygulama dışında
-- açar, izledikten sonra tiki kendisi atar. Açıp açmadığı denetlenmez.
-- Hafta bitince izlenmeyen varsa Yapılacaklar'a öğrenci başına tek kart düşer:
-- "Bu haftaya taşı" ya da "Kapat".

create table if not exists public.haftalik_link (
  id           bigint generated always as identity primary key,
  ogrenci_id   uuid not null references public.ogrenciler(id) on delete cascade,
  hafta_basi   date not null,
  url          text not null check (url ~* '^https?://' and char_length(url) <= 2000),
  baslik       text not null check (char_length(baslik) between 1 and 200),
  not_metni    text check (char_length(not_metni) <= 200),
  izlendi      timestamptz,
  kapandi      boolean not null default false,
  olusturuldu  timestamptz not null default now(),
  islem_yapan  uuid default auth.uid()
);
create index if not exists haftalik_link_ogrenci_hafta on public.haftalik_link (ogrenci_id, hafta_basi);

alter table public.haftalik_link enable row level security;
drop policy if exists haftalik_link_okur on public.haftalik_link;
create policy haftalik_link_okur on public.haftalik_link for select to authenticated
  using (private.erisebilir_mi(ogrenci_id));
drop policy if exists haftalik_link_koc on public.haftalik_link;
create policy haftalik_link_koc on public.haftalik_link for all to authenticated
  using (private.ogrencim_mi(ogrenci_id))
  with check (private.ogrencim_mi(ogrenci_id));
-- Öğrenci yalnız kendi tikini değiştirir, o da RPC üzerinden.

create or replace function public.link_izledim(p_id bigint, p_izledi boolean)
returns timestamptz language plpgsql security definer
set search_path to 'public', 'pg_temp' as $$
declare v timestamptz;
begin
  update public.haftalik_link
     set izlendi = case when p_izledi then coalesce(izlendi, now()) else null end
   where id = p_id and ogrenci_id = auth.uid()
  returning izlendi into v;
  if not found then raise exception 'yetki yok'; end if;
  return v;
end $$;
revoke all on function public.link_izledim(bigint, boolean) from public, anon;
grant execute on function public.link_izledim(bigint, boolean) to authenticated;

-- Kuyruk kartı ve karar
do $mig$
declare d text; k text;
begin
  k := pg_get_functiondef('public.koc_karar_kuyrugu'::regproc);
  if position('link_izle' in k) = 0 then
    k := replace(k, E'  union all\n  select ''tebrik'', ''bugun'', oo.ogrenci_id::text', $b$  union all
  select 'link_izle', 'hafta', l.ogrenci_id::text, l.ogrenci_id, p.ad_soyad, p.fotograf_yolu,
         case when count(*) = 1 then 'Geçen haftadan 1 video izlenmedi'
              else 'Geçen haftadan ' || count(*) || ' video izlenmedi' end,
         'Taşırsan izlenmeyenler bu haftanın listesine geçer; kapatırsan listeden düşer.',
         string_agg(l.baslik, E'\n' order by l.id), null,
         jsonb_build_object('onay', 'Bu haftaya taşı', 'ertele', 'Ertele', 'sil', 'Kapat'),
         4::smallint, count(*)::numeric, null
  from public.haftalik_link l
  join public.profiller p on p.id = l.ogrenci_id
  where l.izlendi is null and not l.kapandi
    and l.hafta_basi < (private.yerel_gun(now()) - (extract(isodow from private.yerel_gun(now()))::int - 1))
    and private.ogrencim_mi(l.ogrenci_id)
  group by l.ogrenci_id, p.ad_soyad, p.fotograf_yolu
  union all
  select 'tebrik', 'bugun', oo.ogrenci_id::text$b$);
    if position('link_izle' in k) = 0 then raise exception 'kuyruk eklenemedi'; end if;
    execute k;
  end if;

  d := pg_get_functiondef('public.koc_karar_ver'::regproc);
  if position('link_izle' in d) = 0 then
    d := replace(d, 'if p_tip = ''konu_tekrar'' then', $b$if p_tip = 'link_izle' then
    v_ogrenci := p_kaynak_id::uuid;
    if not private.ogrencim_mi(v_ogrenci) then raise exception 'yetki yok'; end if;
    if p_karar = 'onay' then
      update public.haftalik_link
         set hafta_basi = (private.yerel_gun(now()) - (extract(isodow from private.yerel_gun(now()))::int - 1))
       where ogrenci_id = v_ogrenci and izlendi is null and not kapandi
         and hafta_basi < (private.yerel_gun(now()) - (extract(isodow from private.yerel_gun(now()))::int - 1));
      return jsonb_build_object('durum', 'tasindi');
    elsif p_karar = 'sil' then
      update public.haftalik_link set kapandi = true
       where ogrenci_id = v_ogrenci and izlendi is null and not kapandi
         and hafta_basi < (private.yerel_gun(now()) - (extract(isodow from private.yerel_gun(now()))::int - 1));
      return jsonb_build_object('durum', 'kapandi');
    end if;
    return jsonb_build_object('durum', 'yok');
  end if;

  if p_tip = 'konu_tekrar' then$b$);
    if position('link_izle' in d) = 0 then raise exception 'karar eklenemedi'; end if;
    execute d;
  end if;
end $mig$;
