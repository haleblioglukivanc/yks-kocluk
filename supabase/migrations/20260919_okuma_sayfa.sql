-- Kitap okuma takibi (19 Eylül 2026, Bekir onayladı): Kıvanç'ın Excel'indeki
-- "günlük sayfa + başlama/bitirme + puan" uyarlaması. Öğrenci Günü
-- tamamla'da o gün kaç sayfa okuduğunu yazar (boş bırakılabilir); ilk sayfa
-- girdiği gün başlama günüdür; bitirince isteğe bağlı 1–5 yıldız verir.

alter table public.ogrenci_okuma
  add column if not exists puan smallint check (puan between 1 and 5),
  add column if not exists basladi date;

create table if not exists public.ogrenci_okuma_gunluk (
  ogrenci_id  uuid not null references public.ogrenciler(id) on delete cascade,
  tarih       date not null,
  kitap_id    bigint not null references public.haftalik_kitap(id) on delete cascade,
  sayfa       smallint not null check (sayfa between 1 and 500),
  olusturuldu timestamptz not null default now(),
  primary key (ogrenci_id, tarih, kitap_id)
);
alter table public.ogrenci_okuma_gunluk enable row level security;
drop policy if exists ogrenci_okuma_gunluk_okuma on public.ogrenci_okuma_gunluk;
create policy ogrenci_okuma_gunluk_okuma on public.ogrenci_okuma_gunluk for select to authenticated
  using (ogrenci_id = auth.uid() or private.ogrencim_mi(ogrenci_id));

-- Öğrenci o günün sayfasını yazar (0 = sil). Okunan kitap yoksa (genel
-- seçimi okuyorsa) yazdığı kitap okunan kitap olur.
create or replace function public.ogrenci_sayfa_kaydet(p_kitap_id bigint, p_tarih date, p_sayfa int)
returns jsonb language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
declare
  v_ogr uuid := auth.uid();
  v_bugun date := private.yerel_gun(now());
  v_okunan bigint;
begin
  if not exists (select 1 from public.ogrenciler where id = v_ogr) then
    raise exception 'Yalnız öğrenci kendi okumasını yazabilir';
  end if;
  if p_tarih > v_bugun or p_tarih < v_bugun - 7 then
    raise exception 'Yalnız son bir haftanın okuması yazılabilir';
  end if;
  if p_sayfa < 0 or p_sayfa > 500 then raise exception 'Sayfa 0 ile 500 arasında olmalı'; end if;

  select kitap_id into v_okunan from public.ogrenci_okuma where ogrenci_id = v_ogr and durum = 'okuyor';
  if v_okunan is null then
    perform private.kitap_ata(v_ogr, p_kitap_id, 'ogrenci');
  elsif v_okunan <> p_kitap_id then
    raise exception 'Bu kitap şu an okuduğun kitap değil';
  end if;

  if coalesce(p_sayfa, 0) = 0 then
    delete from public.ogrenci_okuma_gunluk where ogrenci_id = v_ogr and tarih = p_tarih and kitap_id = p_kitap_id;
  else
    insert into public.ogrenci_okuma_gunluk (ogrenci_id, tarih, kitap_id, sayfa)
    values (v_ogr, p_tarih, p_kitap_id, p_sayfa)
    on conflict (ogrenci_id, tarih, kitap_id) do update set sayfa = excluded.sayfa;
  end if;

  update public.ogrenci_okuma oo
     set basladi = (select min(g.tarih) from public.ogrenci_okuma_gunluk g
                    where g.ogrenci_id = v_ogr and g.kitap_id = p_kitap_id)
   where oo.ogrenci_id = v_ogr and oo.kitap_id = p_kitap_id;

  return jsonb_build_object('okunan',
    (select coalesce(sum(sayfa), 0) from public.ogrenci_okuma_gunluk where ogrenci_id = v_ogr and kitap_id = p_kitap_id));
end $$;
revoke all on function public.ogrenci_sayfa_kaydet(bigint, date, int) from public, anon;
grant execute on function public.ogrenci_sayfa_kaydet(bigint, date, int) to authenticated;

-- Bitirdikten sonra isteğe bağlı yıldız.
create or replace function public.ogrenci_kitap_puanla(p_kitap_id bigint, p_puan int)
returns void language sql security definer set search_path to 'public', 'pg_temp' as $$
  update public.ogrenci_okuma set puan = greatest(1, least(5, p_puan))
  where ogrenci_id = auth.uid() and kitap_id = p_kitap_id and durum = 'bitti'
$$;
revoke all on function public.ogrenci_kitap_puanla(bigint, int) from public, anon;
grant execute on function public.ogrenci_kitap_puanla(bigint, int) to authenticated;

-- Öğrencinin okuma özeti: okuduğu kitabın ilerlemesi ve Okuduklarım listesi.
-- RLS'e tabi (invoker): öğrenci kendini, koç kendi öğrencisini görür.
create or replace function public.ogrenci_okuma_ozeti(p_ogrenci uuid default null)
returns jsonb language sql stable set search_path to 'public', 'pg_temp' as $$
with o as (select coalesce(p_ogrenci, auth.uid()) as id),
s as (
  select oo.kitap_id, k.sayfa,
         (select coalesce(sum(g.sayfa), 0) from public.ogrenci_okuma_gunluk g
           where g.ogrenci_id = oo.ogrenci_id and g.kitap_id = oo.kitap_id) as okunan,
         (select g.sayfa from public.ogrenci_okuma_gunluk g
           where g.ogrenci_id = oo.ogrenci_id and g.kitap_id = oo.kitap_id
             and g.tarih = private.yerel_gun(now())) as bugun
  from public.ogrenci_okuma oo join public.haftalik_kitap k on k.id = oo.kitap_id, o
  where oo.ogrenci_id = o.id and oo.durum = 'okuyor'
),
b as (
  select oo.kitap_id, k.ad, k.yazar, k.emoji, k.sayfa, oo.puan, oo.bitti,
         greatest(1, (oo.bitti at time zone 'Europe/Istanbul')::date
                     - coalesce(oo.basladi, (oo.olusturuldu at time zone 'Europe/Istanbul')::date) + 1) as gun
  from public.ogrenci_okuma oo join public.haftalik_kitap k on k.id = oo.kitap_id, o
  where oo.ogrenci_id = o.id and oo.durum = 'bitti' and oo.bitti is not null
)
select jsonb_build_object(
  'simdiki', (select to_jsonb(s) from s),
  'okunanlar', coalesce((select jsonb_agg(to_jsonb(b) order by b.bitti desc) from b), '[]'::jsonb),
  'toplam_kitap', (select count(*) from b),
  'toplam_sayfa', (select coalesce(sum(sayfa), 0) from b)
)
$$;
grant execute on function public.ogrenci_okuma_ozeti(uuid) to authenticated;

-- Koçun Cuma kartında okuyan öğrencinin satırı sayfayla konuşur.
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
         (private.yerel_gun(now()) - (oo.olusturuldu at time zone 'Europe/Istanbul')::date) as gun,
         (select coalesce(sum(g.sayfa), 0) from public.ogrenci_okuma_gunluk g
           where g.ogrenci_id = oo.ogrenci_id and g.kitap_id = oo.kitap_id
             and g.tarih > private.yerel_gun(now()) - 7) as hafta_sayfa,
         (select coalesce(sum(g.sayfa), 0) from public.ogrenci_okuma_gunluk g
           where g.ogrenci_id = oo.ogrenci_id and g.kitap_id = oo.kitap_id) as okunan,
         (select private.yerel_gun(now()) - max(g.tarih) from public.ogrenci_okuma_gunluk g
           where g.ogrenci_id = oo.ogrenci_id and g.kitap_id = oo.kitap_id) as sessiz
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
  'kitap_gerekce', (select case
        when hafta_sayfa > 0 then 'Okuyor · bu hafta ' || hafta_sayfa || ' sayfa · ' || okunan || '/' || coalesce(sayfa, 0)
        when sessiz is not null then 'Okuyor · ' || sessiz || ' gündür sayfa yok · ' || okunan || '/' || coalesce(sayfa, 0)
        when gun <= 0 then 'Okumaya yeni başladı, kitap aynı kalır'
        else 'Okuyor · ' || gun || ' gündür, sayfa girilmedi' end from simdiki),
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
