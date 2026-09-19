do $do$
declare d text;
begin
  d := pg_get_functiondef('public.koc_karar_kuyrugu'::regproc);
  if position('''ilham''' in d) > 0 then return; end if;
  d := replace(d, E'
),
temiz as (', $ek$
  union all
  /* Haftanın kitabı ve sözü: öğrenci başına öneri, koç tek kartta onaylar.
     Cuma–Pazar gelecek hafta, hafta içi bu hafta için; seçimi yapılmamış
     aktif öğrenci kaldıkça çıkar. Onaylanmazsa öğrenci genel seçimi görür. */
  select 'ilham', 'hafta', hb.bas::text, null::uuid, 'Haftanın kitabı ve sözü', null::text,
         to_char(hb.bas, 'DD') || '–' || to_char(hb.bas + 6, 'DD') || ' ' || (array['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'])[extract(month from hb.bas + 6)::int]
           || ' · ' || count(*) || ' öğrenci',
         'Her öğrenciye kendi haftasına göre öneri. Onaylanmazsa genel seçim gider.',
         null, null,
         jsonb_build_object('onay','Hepsini onayla'),
         5::smallint, 0::numeric,
         jsonb_build_object('hafta_basi', hb.bas, 'satirlar',
           jsonb_agg(jsonb_build_object('ogrenci_id', o.id, 'ad', p.ad_soyad, 'fotograf_yolu', p.fotograf_yolu)
                     || private.ilham_onerisi(o.id, hb.bas) order by p.ad_soyad))
  from public.ogrenciler o
  join public.profiller p on p.id = o.id
  cross join lateral (select case when private.plan_gunu_mu()
         then (private.yerel_gun(now()) + (8 - extract(isodow from private.yerel_gun(now()))::int))::date
         else (private.yerel_gun(now()) - (extract(isodow from private.yerel_gun(now()))::int - 1))::date end as bas) hb
  where o.aktif and private.ogrencim_mi(o.id)
    and not exists (select 1 from public.ogrenci_ilham oi where oi.ogrenci_id = o.id and oi.hafta_basi = hb.bas)
  group by hb.bas
),
temiz as ($ek$);
  d := replace(d, 'z.tip in (''plan'', ''veli_ozet'')', 'z.tip in (''plan'', ''veli_ozet'', ''ilham'')');
  execute d;
end $do$;
