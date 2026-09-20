-- Yanlış havuzu düzeltmesi (20 Eylül 2026, Bekir onayı)
-- Test bulgusu: bir zorlanma sinyali (denemede yanlış, öğrenci "tekrar gerekli"
-- beyanı...) tekrar tarihini "yarın" yapıyordu ama hemen ardından çalışan
-- konu_skor_tazele tarihi son çalışma tarihinden yeniden hesaplayıp siliyordu:
--   * hiç çalışılmamış konudaki yanlış tekrar planına hiç girmiyordu,
--   * çalışılmış konuda yanlış "19 gün gecikmiş" gibi yanlış gerekçeyle giriyordu.
-- Kural: son çalışmadan SONRA gelen bir zorlanma sinyali varsa sıradaki tekrar
-- = sinyal tarihi + 1 gün, aralık başa döner. Plan taslağı gerekçeyi sinyalin
-- kaynağından yazar.

create or replace function public.konu_skor_tazele(p_ogrenci uuid, p_sinav date default null::date)
 returns integer
 language plpgsql
 set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_kalan  integer := greatest(coalesce(p_sinav, current_date + 300) - current_date, 0);
  wa numeric; wz numeric; wt numeric; wk numeric; carpan numeric;
  v_adet integer;
begin
  if v_kalan <= 60 then
    wa := 0.50; wz := 0.30; wt := 0.15; wk := 0.05; carpan := 1.25;
  elsif v_kalan <= 180 then
    wa := 0.40; wz := 0.30; wt := 0.20; wk := 0.10; carpan := 1.10;
  else
    wa := 0.35; wz := 0.30; wt := 0.20; wk := 0.15; carpan := 1.00;
  end if;

  with kapsamdaki as (
    select k.id as konu_id, coalesce(n.a_terimi, 0) as a
    from public.konular k
    join public.dersler d on d.id = k.ders_id
    join public.ogrenciler o on o.id = p_ogrenci
    left join public.v_konu_agirlik_norm n on n.konu_id = k.id
    where o.katalog_id is null or d.katalog_id = o.katalog_id
  ),
  sinyal as (
    -- şiddet 30 günde yarılanır, 180 günden eskisi sayılmaz
    select z.konu_id,
           sum((z.siddet / 3.0) * power(0.5, (current_date - z.tarih) / 30.0)) as puan,
           sum(power(0.5, (current_date - z.tarih) / 30.0))                    as gozlem,
           max(z.tarih) as son_sinyal
    from public.zorlanma_sinyali z
    where z.ogrenci_id = p_ogrenci and z.tarih >= current_date - 180
    group by z.konu_id
  ),
  ilerleme as (
    select i.konu_id, i.durum::text as durum, i.guncellendi::date as son_calisma
    from public.konu_ilerleme i where i.ogrenci_id = p_ogrenci
  ),
  hesap as (
    select ka.konu_id,
           ka.a as a_terimi,
           (coalesce(s.puan,0) + 0.15 * 2) / (coalesce(s.gozlem,0) + 2) as z_terimi,
           case when il.son_calisma is null then 0
                else least(greatest(current_date - il.son_calisma, 0)::numeric
                     / (array[1,3,7,21,60])[least(coalesce(ks.aralik_indeksi,0),4) + 1], 1)
           end as t_terimi,
           case when il.durum is null or il.durum = 'baslanmadi' then 1 else 0 end as k_terimi,
           il.son_calisma, coalesce(ks.aralik_indeksi,0) as ai,
           -- son çalışmadan sonra gelmiş sinyal = tekrar yarına
           case when s.son_sinyal is not null
                 and (il.son_calisma is null or s.son_sinyal > il.son_calisma)
                then s.son_sinyal end as acik_sinyal
    from kapsamdaki ka
    left join sinyal   s  on s.konu_id  = ka.konu_id
    left join ilerleme il on il.konu_id = ka.konu_id
    left join public.konu_skor ks on ks.konu_id = ka.konu_id and ks.ogrenci_id = p_ogrenci
  )
  insert into public.konu_skor (ogrenci_id, konu_id, p_skor, son_calisma, aralik_indeksi, sonraki_tekrar, hesaplandi)
  select p_ogrenci, h.konu_id,
         least(round(100 * (wa*h.a_terimi + wz*h.z_terimi + wt*h.t_terimi + wk*h.k_terimi) * carpan), 100)::smallint,
         h.son_calisma,
         case when h.acik_sinyal is not null then 0 else h.ai end,
         case when h.acik_sinyal is not null then h.acik_sinyal + 1
              when h.son_calisma is null then null
              else h.son_calisma + (array[1,3,7,21,60])[least(h.ai,4) + 1] end,
         now()
  from hesap h
  on conflict (ogrenci_id, konu_id) do update
     set p_skor = excluded.p_skor,
         son_calisma = excluded.son_calisma,
         aralik_indeksi = excluded.aralik_indeksi,
         sonraki_tekrar = excluded.sonraki_tekrar,
         hesaplandi = excluded.hesaplandi;

  get diagnostics v_adet = row_count;
  return v_adet;
end $function$;

create or replace function private.plan_taslagi_hesapla(p_ogrenci uuid, p_hafta date default null::date)
 returns jsonb
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
with son as (
  select b.bas, (b.bas + 6)::date as bit
  from (select coalesce(p_hafta,
          (private.yerel_gun(now()) + (8 - extract(isodow from private.yerel_gun(now()))::int))::date
        ) as bas) b
),
gecmis as (
  select extract(isodow from g.tarih)::int as dow, count(*)::numeric / 2 as ort
  from public.gorevler g, son
  where g.ogrenci_id = p_ogrenci and g.durum = 'tamamlandi'
    and g.tarih >= son.bas - 14 and g.tarih < son.bas
  group by 1
),
gunler as (
  select i.i, (son.bas + (i.i - 1))::date as tarih,
         least(4, greatest(0, coalesce(round(ge.ort)::int,
           case when exists (select 1 from gecmis) then 0 else 2 end)))::int as slot
  from generate_series(1, 7) i(i)
  left join gecmis ge on ge.dow = i.i
  cross join son
),
slotlar as (
  select row_number() over (order by g.tarih, s.s) as no, g.tarih
  from gunler g, lateral generate_series(1, g.slot) s(s)
  where g.slot > 0
),
tekrar_ham as (
  select ks.konu_id, k.ad as konu, d.id as ders_id, d.ad as ders, d.sira as ders_sira,
         ks.p_skor, ks.sonraki_tekrar,
         -- son çalışmadan sonra gelmiş en yeni sinyal: tekrarın asıl sebebi
         (select z.kaynak from public.zorlanma_sinyali z
           where z.ogrenci_id = p_ogrenci and z.konu_id = ks.konu_id
             and (ks.son_calisma is null or z.tarih > ks.son_calisma)
           order by z.tarih desc, z.id desc limit 1) as sinyal_kaynak,
         row_number() over (partition by d.id order by ks.p_skor desc, ks.sonraki_tekrar) as ders_ici
  from public.konu_skor ks
  join public.konular k on k.id = ks.konu_id
  join public.dersler d on d.id = k.ders_id
  cross join son
  where ks.ogrenci_id = p_ogrenci and ks.sonraki_tekrar is not null
    and ks.sonraki_tekrar <= son.bit
),
tekrarlar as (
  select *, row_number() over (order by ders_ici, p_skor desc, ders_sira) as sira from tekrar_ham
),
yeni_ham as (
  select k.id as konu_id, k.ad as konu, d.id as ders_id, d.ad as ders, d.sira as ders_sira,
         row_number() over (partition by d.id order by k.sira) as ders_ici
  from public.konular k
  join public.dersler d on d.id = k.ders_id
  join public.ogrenciler o on o.id = p_ogrenci
  left join public.konu_ilerleme i on i.konu_id = k.id and i.ogrenci_id = p_ogrenci
  where (o.katalog_id is null or d.katalog_id = o.katalog_id)
    and (i.durum is null or i.durum = 'baslanmadi')
    and not exists (select 1 from tekrar_ham t where t.konu_id = k.id)
),
yeniler as (
  select *, row_number() over (order by ders_ici, ders_sira) as sira from yeni_ham
),
havuz as (
  select 'tekrar'::text as tur, konu_id, konu, ders_id, ders, 20 as hedef_adet,
         case sinyal_kaynak
              when 'deneme'         then 'Denemede yanlış'
              when 'soru_cozumu'    then 'Soru çözümünde yanlış'
              when 'ogrenci_beyani' then 'Öğrenci tekrar istedi'
              when 'koc_notu'       then 'Koç notu'
              else case when sonraki_tekrar < current_date
                        then (current_date - sonraki_tekrar) || ' gün gecikmiş'
                        else 'Tekrar zamanı' end
         end as gerekce,
         sira * 2 - 1 as anahtar
  from tekrarlar
  union all
  select 'konu_anlatimi', konu_id, konu, ders_id, ders, null,
         'Sıradaki konu', sira * 2
  from yeniler
),
esles as (
  select s.tarih, h.tur, h.konu_id, h.konu, h.ders_id, h.ders,
         h.hedef_adet, h.gerekce, h.anahtar
  from (select *, row_number() over (order by anahtar) as no from havuz) h
  join slotlar s on s.no = h.no
)
select jsonb_build_object(
  'haftaBaslangic', (select bas from son),
  'haftaBitis', (select bit from son),
  'ozet', jsonb_build_object(
    'tekrar', (select count(*) from esles where tur = 'tekrar'),
    'yeni',   (select count(*) from esles where tur = 'konu_anlatimi'),
    'toplam', (select count(*) from esles),
    'gecikmis', (select count(*) from esles where gerekce like '%gecikmiş%')),
  'gunler', coalesce((
    select jsonb_agg(x order by x->>'tarih') from (
      select jsonb_build_object(
        'tarih', g.tarih, 'slot', g.slot,
        'gorevler', coalesce((
          select jsonb_agg(jsonb_build_object(
            'tur', e.tur, 'dersId', e.ders_id, 'ders', e.ders,
            'konuId', e.konu_id, 'konu', e.konu,
            'baslik', case e.tur when 'tekrar' then e.konu || ' tekrarı' else e.konu end,
            'hedefAdet', e.hedef_adet, 'gerekce', e.gerekce) order by e.anahtar)
          from esles e where e.tarih = g.tarih), '[]'::jsonb)) as x
      from gunler g) t), '[]'::jsonb))
$function$;
