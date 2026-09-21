-- Birebir koçluk (22 Eylül 2026, Bekir): "Konu öncelikleri" sayfası menüden
-- kalktı. Aynı konuda en az iki öğrenci zorlanıyor ya da tekrarı gecikmişse
-- Yapılacaklar'a "konu_tekrar" kartı düşer; onaylanınca o öğrencilere yarın
-- için tekrar görevi yazılır. O konuda bekleyen görevi olan öğrenci sayılmaz.
do $mig$
declare d text; k text;
begin
  k := pg_get_functiondef('public.koc_karar_kuyrugu'::regproc);
  k := replace(k, E'  union all\n  select ''tebrik'', ''bugun'', oo.ogrenci_id::text', $b$  union all
  (select 'konu_tekrar', 'hafta', x.konu_id::text, null::uuid, x.ders || ' · ' || x.konu, null::text,
         (select string_agg(split_part(z->>'ad', ' ', 1), ', ') from jsonb_array_elements(x.ogr) z)
           || ' bu konuda zorlanıyor',
         'Onaylarsan her birine yarın için 20 soruluk tekrar görevi yazılır.',
         null, null,
         jsonb_build_object('onay', 'Tekrar görevi ver', 'ertele', 'Ertele'),
         4::smallint, x.skor,
         jsonb_build_object('konu_id', x.konu_id, 'ogrenciler', x.ogr)
  from (
    select (e->>'konuId')::bigint as konu_id, e->>'ders' as ders, e->>'konu' as konu,
           coalesce((e->>'skor')::numeric, 0) as skor,
           (select jsonb_agg(distinct jsonb_build_object('id', z->>'id', 'ad', z->>'ad'))
              from jsonb_array_elements(coalesce(e->'zorlananlar', '[]'::jsonb) || coalesce(e->'gecikenler', '[]'::jsonb)) z
             where not exists (select 1 from public.gorevler g
                                where g.ogrenci_id = (z->>'id')::uuid and g.konu_id = (e->>'konuId')::bigint
                                  and g.durum in ('bekliyor', 'devam'))) as ogr
    from (select public.konu_oncelik_listesi(null, 15) as j) jj
    cross join lateral jsonb_array_elements(coalesce(jj.j->'sinif', '[]'::jsonb) || coalesce(jj.j->'bireysel', '[]'::jsonb)) e
  ) x
  where jsonb_array_length(coalesce(x.ogr, '[]'::jsonb)) >= 2
  order by x.skor desc
  limit 2)
  union all
  select 'tebrik', 'bugun', oo.ogrenci_id::text$b$);
  execute k;

  d := pg_get_functiondef('public.koc_karar_ver'::regproc);
  d := replace(d, 'when ''hafiflet'' then 7', 'when ''hafiflet'' then 7 when ''konu_tekrar'' then 7');
  d := replace(d, 'if p_tip = ''odeme'' then', $b$if p_tip = 'konu_tekrar' then
    if p_karar = 'onay' then
      select array_agg((z->>'id')::uuid) into strict v_n_idler
        from public.koc_karar_kuyrugu(99) q
        cross join lateral jsonb_array_elements(q.ek->'ogrenciler') z
       where q.tip = 'konu_tekrar' and q.kaynak_id = p_kaynak_id;
      v_n := public.konu_tekrar_gorevi_ac(p_kaynak_id::bigint, v_n_idler, private.yerel_gun(now()) + 1, 20);
      return jsonb_build_object('durum', 'tamam', 'gorev', v_n);
    end if;
    return jsonb_build_object('durum', 'yok');
  end if;

  if p_tip = 'odeme' then$b$);
  d := replace(d, 'v_ogrenci uuid; v_konu bigint;', 'v_ogrenci uuid; v_n_idler uuid[]; v_konu bigint;');
  execute d;
end $mig$;
