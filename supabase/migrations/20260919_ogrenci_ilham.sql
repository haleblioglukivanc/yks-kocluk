-- Haftanın kitabı ve sözü öğrenciye özel (19 Eylül 2026).
-- Sistem her öğrenci için öneri hesaplar, koç tek kartta onaylar ya da
-- değiştirir. Onaylanmayan haftada öğrenci genel seçimi görür.

alter table public.haftalik_kitap
  add column if not exists seviye text not null default 'ikisi'
  check (seviye in ('lgs', 'yks', 'ikisi'));

create table if not exists public.ogrenci_ilham (
  ogrenci_id  uuid not null references public.ogrenciler(id) on delete cascade,
  hafta_basi  date not null,
  kitap_id    bigint references public.haftalik_kitap(id) on delete set null,
  soz_id      bigint references public.haftalik_soz(id) on delete set null,
  kaynak      text not null default 'oneri' check (kaynak in ('oneri', 'koc')),
  onaylayan   uuid references public.profiller(id) on delete set null,
  olusturuldu timestamptz not null default now(),
  primary key (ogrenci_id, hafta_basi)
);
alter table public.ogrenci_ilham enable row level security;
-- Politikalar yalnız authenticated: anon'a açık olsaydı tanıtım sayfasındaki
-- haftalik_ilham() ogrencim_mi yetkisine takılıp kutuyu boş bırakıyordu.
drop policy if exists ogrenci_ilham_okuma on public.ogrenci_ilham;
create policy ogrenci_ilham_okuma on public.ogrenci_ilham for select to authenticated
  using (ogrenci_id = auth.uid() or private.ogrencim_mi(ogrenci_id));

-- Daha önce okunmuş kitaplar (Kıvanç'ın Excel'indeki kitap sekmesi buraya
-- aktarılacak). Öneri bunları atlar.
create table if not exists public.ogrenci_okuma (
  ogrenci_id  uuid not null references public.ogrenciler(id) on delete cascade,
  kitap_id    bigint not null references public.haftalik_kitap(id) on delete cascade,
  not_metni   text,
  olusturuldu timestamptz not null default now(),
  primary key (ogrenci_id, kitap_id)
);
alter table public.ogrenci_okuma enable row level security;
drop policy if exists ogrenci_okuma_okuma on public.ogrenci_okuma;
create policy ogrenci_okuma_okuma on public.ogrenci_okuma for select to authenticated
  using (ogrenci_id = auth.uid() or private.ogrencim_mi(ogrenci_id));
drop policy if exists ogrenci_okuma_koc on public.ogrenci_okuma;
create policy ogrenci_okuma_koc on public.ogrenci_okuma for all to authenticated
  using (private.ogrencim_mi(ogrenci_id)) with check (private.ogrencim_mi(ogrenci_id));

-- Kararlı karıştırma: aynı öğrenci + hafta her çağrıda aynı sonucu verir.
create or replace function private.ilham_zar(p_a text)
returns int language sql immutable as $$
  select ('x' || substr(md5(p_a), 1, 7))::bit(28)::int
$$;

-- Bir öğrenci için o haftanın önerisi. Kitap: seviye (LGS/YKS), haftanın
-- yükü (tatil / yoğun / normal), alan yakınlığı; daha önce önerilen ya da
-- okunan atlanır. Söz: öğrencinin durumundan tema.
create or replace function private.ilham_onerisi(p_ogrenci uuid, p_bas date)
returns jsonb
language sql stable security definer
set search_path to 'public', 'pg_temp'
as $$
with o as (
  select o.id, coalesce(o.sinif, 12) as sinif, o.alan::text as alan,
         coalesce(o.haftalik_calisma_hedefi_dk, 0) as hedef
  from public.ogrenciler o where o.id = p_ogrenci
),
r as (
  select r.risk_seviyesi, r.net_farki, r.tamamlama_yuzdesi, r.sessiz_gun, coalesce(r.hic_baslamadi, false) as yeni
  from public.ogrenci_risk r where r.ogrenci_id = p_ogrenci
),
h as (
  select extract(week from p_bas)::int as hafta,
         (extract(week from p_bas)::int between 3 and 6
          or extract(week from p_bas)::int between 25 and 36) as tatil,
         ((coalesce((select risk_seviyesi from r), '') in ('acil', 'izle')
           and not coalesce((select yeni from r), false))
          or (select hedef from o) >= 1800) as yogun
),
gecmis as (
  select kitap_id, soz_id from public.ogrenci_ilham
  where ogrenci_id = p_ogrenci and hafta_basi <> p_bas
),
kitap as (
  select k.*,
    (case when h.tatil then
            case when 'uzun' = any(k.etiket) then 3 when 'orta' = any(k.etiket) then 2 else 0 end
          when h.yogun then
            case when 'kisa' = any(k.etiket) then 3 when 'uzun' = any(k.etiket) then -6 else 0 end
            + case when 'tek_oturusta' = any(k.etiket) then 1 else 0 end
          else
            case when 'uzun' = any(k.etiket) then -3 else 2 end
     end)
    + case when o.alan = 'sayisal' and 'bilim' = any(k.etiket) then 1
           when o.alan in ('sozel', 'esit_agirlik') and 'turk_edebiyati' = any(k.etiket) then 1
           when o.alan in ('sozel', 'esit_agirlik') and 'felsefe' = any(k.etiket) then 1
           when o.alan = 'dil' and 'dunya_klasigi' = any(k.etiket) then 1
           else 0 end
    + case when o.sinif <= 8 and k.seviye = 'lgs' then 1 else 0 end as puan,
    (o.alan = 'sayisal' and 'bilim' = any(k.etiket))
      or (o.alan in ('sozel', 'esit_agirlik') and ('turk_edebiyati' = any(k.etiket) or 'felsefe' = any(k.etiket))) as alan_uyar
  from public.haftalik_kitap k cross join o cross join h
  where k.aktif
    and (case when o.sinif <= 8 then k.seviye in ('lgs', 'ikisi') else k.seviye in ('yks', 'ikisi') end)
    and (h.tatil or not ('tatil_icin' = any(k.etiket)))
    and k.id not in (select kitap_id from gecmis where kitap_id is not null)
    and k.id not in (select kitap_id from public.ogrenci_okuma where ogrenci_id = p_ogrenci)
  order by puan desc, private.ilham_zar(p_ogrenci::text || k.id || p_bas)
  limit 1
),
tema as (
  select case
    when h.tatil then 'dinlenme'
    when (select yeni from r) then 'baslangic'
    when (select net_farki from r) < 0 then 'hata'
    when (select sessiz_gun from r) >= 2 or (select risk_seviyesi from r) = 'acil' then 'baslangic'
    when (select risk_seviyesi from r) = 'izle' then 'oz_sefkat'
    when (select tamamlama_yuzdesi from r) >= 90 then 'sureklilik'
    else (array['odak','sabir','emek','merak','cesaret'])[1 + (h.hafta + private.ilham_zar(p_ogrenci::text)) % 5]
  end as t,
  case
    when h.tatil then 'Tatil haftası'
    when (select yeni from r) then 'Yeni başlıyor'
    when (select net_farki from r) < 0 then 'Son denemede net düştü'
    when (select sessiz_gun from r) >= 2 then (select sessiz_gun from r) || ' gündür işaret yok'
    when (select risk_seviyesi from r) = 'acil' then 'Tempo çok düştü'
    when (select risk_seviyesi from r) = 'izle' then 'Tempo biraz düştü'
    when (select tamamlama_yuzdesi from r) >= 90 then 'Düzenli gidiyor'
    else null
  end as neden
  from h
),
soz as (
  select s.* from public.haftalik_soz s cross join tema
  where s.aktif
  order by (s.id in (select soz_id from gecmis where soz_id is not null)) asc,
           (s.tema = tema.t) desc,
           private.ilham_zar(p_ogrenci::text || s.id || p_bas)
  limit 1
)
select jsonb_build_object(
  'kitap', (select jsonb_build_object('id', id, 'ad', ad, 'yazar', yazar, 'sayfa', sayfa, 'emoji', emoji) from kitap),
  'kitap_gerekce', (select case when x = '' then null else upper(left(x, 1)) || substr(x, 2) end from (select array_to_string(array_remove(array[
      case when h.tatil then 'tatil haftası, uzun kitaba yer var'
           when h.yogun then 'yoğun hafta, kısa bir kitap'
           else null end,
      case when k.alan_uyar and o.alan = 'sayisal' then 'sayısal alana yakın'
           when k.alan_uyar then 'alanına yakın'
           else null end,
      case when 'tek_oturusta' = any(k.etiket) then 'tek oturuşta biter' else null end
    ], null), ', ') as x from kitap k cross join h cross join o) g),
  'soz', (select jsonb_build_object('id', id, 'metin', metin, 'tema', tema) from soz),
  'soz_gerekce', (select neden from tema)
)
$$;
revoke all on function private.ilham_onerisi(uuid, date) from public;

-- Koçun onayı. p_secimler: [{ogrenci_id, kitap_id, soz_id, koc: bool}]
create or replace function public.koc_ilham_onayla(p_hafta_basi date, p_secimler jsonb)
returns int
language plpgsql security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  e jsonb;
  n int := 0;
begin
  if not private.koc_yetkisi_var() then
    raise exception 'Bu işlem için koç yetkisi gerekiyor';
  end if;
  for e in select * from jsonb_array_elements(coalesce(p_secimler, '[]'::jsonb)) loop
    if not private.ogrencim_mi((e->>'ogrenci_id')::uuid) then continue; end if;
    insert into public.ogrenci_ilham (ogrenci_id, hafta_basi, kitap_id, soz_id, kaynak, onaylayan)
    values ((e->>'ogrenci_id')::uuid, p_hafta_basi,
            nullif(e->>'kitap_id', '')::bigint, nullif(e->>'soz_id', '')::bigint,
            case when (e->>'koc')::boolean then 'koc' else 'oneri' end, auth.uid())
    on conflict (ogrenci_id, hafta_basi) do update
      set kitap_id = excluded.kitap_id, soz_id = excluded.soz_id,
          kaynak = excluded.kaynak, onaylayan = excluded.onaylayan, olusturuldu = now();
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.koc_ilham_onayla(date, jsonb) from public, anon;
grant execute on function public.koc_ilham_onayla(date, jsonb) to authenticated;

-- Haftanın kitabı + sözü: öğrenciye özel onaylı seçim varsa o, yoksa genel.
-- p_ogrenci boşsa çağıran kişi (öğrenci kendi ekranında). Koç öğrenci
-- ekranına girdiğinde öğrencinin kimliği geçilir; RLS koçun yalnız kendi
-- öğrencisini okumasına izin verir.
drop function if exists public.haftalik_ilham(date);
create or replace function public.haftalik_ilham(p_tarih date default null, p_ogrenci uuid default null)
 returns table(iso_yil integer, iso_hafta integer, hafta_basi date, elle_secildi boolean, kitap_id bigint, kitap_ad text, kitap_yazar text, kitap_yil text, kitap_sayfa smallint, kitap_sure_dk smallint, kitap_neden text, kitap_alinti text, kitap_emoji text, kitap_etiket text[], kitap_kapak_url text, soz_id bigint, soz_metin text, soz_kaynak text, soz_emoji text, soz_tema text)
 language sql stable
 set search_path to 'public', 'pg_temp'
as $function$
with h as (
  select
    extract(isoyear from t.g)::int as yil,
    extract(week    from t.g)::int as hafta,
    date_trunc('week', t.g::timestamp)::date as hb,
    (((t.g - date '2024-01-01') / 7) + 5200)::int as n,
    (extract(week from t.g)::int between 3 and 6
     or extract(week from t.g)::int between 25 and 36) as tatil
  from (select coalesce(p_tarih, (now() at time zone 'Europe/Istanbul')::date) as g) t
),
kx as (
  select k.id, (row_number() over (order by k.sira, k.id) - 1)::int as ix,
         (count(*) over ())::int as toplam
  from public.haftalik_kitap k cross join h
  where k.aktif and k.seviye <> 'lgs' and (h.tatil or not ('tatil_icin' = any(k.etiket)))
),
sx as (
  select s.id, (row_number() over (order by s.sira, s.id) - 1)::int as ix,
         (count(*) over ())::int as toplam
  from public.haftalik_soz s where s.aktif
),
prg as (
  select pr.kitap_id as kid, pr.soz_id as sid
  from public.haftalik_program pr
  join h on pr.iso_yil = h.yil and pr.iso_hafta = h.hafta
  where pr.yayinlandi
),
ozel as (
  select oi.kitap_id as kid, oi.soz_id as sid
  from public.ogrenci_ilham oi join h on oi.hafta_basi = h.hb
  where oi.ogrenci_id = coalesce(p_ogrenci, auth.uid())
),
sec as (
  select
    coalesce((select o.kid from ozel o), (select p.kid from prg p),
             (select kx.id from kx cross join h where kx.ix = h.n % kx.toplam)) as kid,
    coalesce((select o.sid from ozel o), (select p.sid from prg p),
             (select sx.id from sx cross join h where sx.ix = h.n % sx.toplam)) as sid,
    exists (select 1 from ozel) or exists (select 1 from prg) as elle
)
select
  h.yil, h.hafta, h.hb, sec.elle,
  k.id, k.ad, k.yazar, k.yil, k.sayfa, k.sure_dk, k.neden, k.alinti, k.emoji, k.etiket, k.kapak_url,
  s.id, s.metin,
  case when s.dogrulandi then s.kaynak else null end,
  s.emoji, s.tema
from h
cross join sec
left join public.haftalik_kitap k on k.id = sec.kid
left join public.haftalik_soz   s on s.id = sec.sid;
$function$;
grant execute on function public.haftalik_ilham(date, uuid) to anon, authenticated;
