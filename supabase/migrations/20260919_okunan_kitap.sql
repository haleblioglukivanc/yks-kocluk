-- Okunan kitap öğrenciye bağlı, haftaya değil (19 Eylül 2026, Bekir): kitap
-- Bugün'de sözün altında sabit durur; öğrenci "Bitirdim" deyince geçmişe
-- yazılır, sıradaki kitap gelir, koçun iyi haber şeridine tebrik düşer.

alter table public.ogrenci_okuma
  add column if not exists durum text not null default 'bitti' check (durum in ('okuyor', 'bitti')),
  add column if not exists kaynak text,
  add column if not exists bitti timestamptz;
create unique index if not exists ogrenci_okuma_tek_okuyor
  on public.ogrenci_okuma (ogrenci_id) where durum = 'okuyor';

-- Öğrencinin okuduğu kitabı ata (varsa öncekinin yerine geçer).
create or replace function private.kitap_ata(p_ogrenci uuid, p_kitap bigint, p_kaynak text)
returns void language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
begin
  if p_kitap is null then return; end if;
  if exists (select 1 from public.ogrenci_okuma
             where ogrenci_id = p_ogrenci and durum = 'okuyor' and kitap_id = p_kitap) then return; end if;
  delete from public.ogrenci_okuma where ogrenci_id = p_ogrenci and durum = 'okuyor';
  insert into public.ogrenci_okuma (ogrenci_id, kitap_id, durum, kaynak)
  values (p_ogrenci, p_kitap, 'okuyor', p_kaynak)
  on conflict (ogrenci_id, kitap_id) do update
    set durum = 'okuyor', kaynak = excluded.kaynak, bitti = null, olusturuldu = now();
end $$;
revoke all on function private.kitap_ata(uuid, bigint, text) from public;

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
simdiki as (
  select k.id, k.ad, k.yazar, k.sayfa, k.emoji,
         (private.yerel_gun(now()) - (oo.olusturuldu at time zone 'Europe/Istanbul')::date) as gun
  from public.ogrenci_okuma oo join public.haftalik_kitap k on k.id = oo.kitap_id
  where oo.ogrenci_id = p_ogrenci and oo.durum = 'okuyor'
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
select (x - 'kitap_oneri_gerekce') || jsonb_build_object('kitap_gerekce', coalesce(x->>'kitap_gerekce', x->>'kitap_oneri_gerekce')) from (select jsonb_build_object(
  'okuyor', exists (select 1 from simdiki),
  'kitap', coalesce(
      (select jsonb_build_object('id', id, 'ad', ad, 'yazar', yazar, 'sayfa', sayfa, 'emoji', emoji) from simdiki),
      (select jsonb_build_object('id', id, 'ad', ad, 'yazar', yazar, 'sayfa', sayfa, 'emoji', emoji) from kitap)),
  'kitap_gerekce', (select case when gun <= 0 then 'Okumaya yeni başladı, kitap aynı kalır'
                                else 'Okuyor · ' || gun || ' gündür, kitap aynı kalır' end from simdiki),
  'kitap_oneri_gerekce', (select case when x = '' then null else upper(left(x, 1)) || substr(x, 2) end from (select array_to_string(array_remove(array[
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
) as x) y
$$;
revoke all on function private.ilham_onerisi(uuid, date) from public;

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
    perform private.kitap_ata((e->>'ogrenci_id')::uuid, nullif(e->>'kitap_id', '')::bigint,
                              case when (e->>'koc')::boolean then 'koc' else 'oneri' end);
    n := n + 1;
  end loop;
  return n;
end $$;

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
okunan as (
  select oo.kitap_id as kid from public.ogrenci_okuma oo
  where oo.ogrenci_id = coalesce(p_ogrenci, auth.uid()) and oo.durum = 'okuyor'
),
sec as (
  select
    coalesce((select ok.kid from okunan ok), (select o.kid from ozel o), (select p.kid from prg p),
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

-- Öğrenci "Bitirdim" der: kitap geçmişe, sıradaki kitap atanır, koça haber.
create or replace function public.ogrenci_kitap_bitir(p_kitap_id bigint)
returns jsonb language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
declare
  v_ogr uuid := auth.uid();
  v_koc uuid;
  v_ad text;
  v_kitap text;
  v_yeni bigint;
begin
  select o.koc_id, p.ad_soyad into v_koc, v_ad
  from public.ogrenciler o join public.profiller p on p.id = o.id where o.id = v_ogr;
  if not found then raise exception 'Yalnız öğrenci kendi kitabını bitirebilir'; end if;
  select ad into v_kitap from public.haftalik_kitap where id = p_kitap_id;
  if v_kitap is null then raise exception 'Kitap bulunamadı'; end if;

  insert into public.ogrenci_okuma (ogrenci_id, kitap_id, durum, kaynak, bitti)
  values (v_ogr, p_kitap_id, 'bitti', 'ogrenci', now())
  on conflict (ogrenci_id, kitap_id) do update set durum = 'bitti', bitti = now();

  v_yeni := (private.ilham_onerisi(v_ogr,
              (private.yerel_gun(now()) - (extract(isodow from private.yerel_gun(now()))::int - 1))::date)
            -> 'kitap' ->> 'id')::bigint;
  perform private.kitap_ata(v_ogr, v_yeni, 'oneri');

  perform private.bildirim_ekle(v_koc, 'iyi_haber',
    split_part(v_ad, ' ', 1) || ' kitabını bitirdi', v_kitap || ' bitti. Bugün ekranından tebrik edebilirsin.',
    '/', 'kitap-bitti-' || v_ogr || '-' || p_kitap_id);

  return jsonb_build_object('biten', v_kitap, 'yeni_kitap_id', v_yeni);
end $$;
revoke all on function public.ogrenci_kitap_bitir(bigint) from public, anon;
grant execute on function public.ogrenci_kitap_bitir(bigint) to authenticated;


-- Koçun iyi haber şeridine "kitabını bitirdi" (mevcut tebrik akışı: kaynak
-- "öğrenci|kitap:id", koc_karar_ver tebrik dalı mesajı gönderip kapatır).
do $do$
declare d text;
begin
  d := pg_get_functiondef('public.koc_karar_kuyrugu'::regproc);
  if position('|kitap:' in d) > 0 then return; end if;
  d := replace(d, E'\n),\ntemiz as (', $ek$
  union all
  select 'tebrik', 'bugun', oo.ogrenci_id::text || '|kitap:' || oo.kitap_id, oo.ogrenci_id, p.ad_soyad, p.fotograf_yolu,
         k.ad || ' kitabını bitirdi',
         'Fark ettiğini söylemek yeter.',
         split_part(p.ad_soyad, ' ', 1) || ', ' || k.ad || ' bitmiş, eline sağlık. Aklında ne kaldı, merak ettim.',
         null,
         jsonb_build_object('onay','Tebrik gönder','ortaKod','duzelt','orta','Cümleyi değiştir','ertele','Ertele','sil','Gönderme'),
         6::smallint, extract(epoch from oo.bitti), null
  from public.ogrenci_okuma oo
  join public.haftalik_kitap k on k.id = oo.kitap_id
  join public.profiller p on p.id = oo.ogrenci_id
  where oo.durum = 'bitti' and oo.bitti > now() - interval '7 days' and private.ogrencim_mi(oo.ogrenci_id)
),
temiz as ($ek$);
  execute d;
end $do$;
