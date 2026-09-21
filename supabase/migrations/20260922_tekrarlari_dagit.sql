-- "Tekrarları dağıt" (22 Eylül 2026, Bekir: "boş günlere yaysın").
-- Bu haftanın yarından itibaren hiç görevi olmayan her gününe birer tekrar
-- görevi yazar (20 soru). Konu sırası: denemelerde en çok hata çıkan
-- konular, sonra "tekrar gerekli" işaretliler, sonra en uzun süredir
-- dokunulmamış bitmiş konular. O konuda bekleyen/devam eden görevi olan
-- konu atlanır; aynı konu iki güne yazılmaz.
create or replace function public.koc_tekrarlari_dagit(p_ogrenci uuid, p_hafta_basi date)
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_bugun date := private.yerel_gun(now());
  v_gun date;
  v_id bigint; v_ad text; v_ders bigint;
  v_n integer := 0;
  v_kullanilan bigint[] := '{}';
begin
  if not private.ogrencim_mi(p_ogrenci) then raise exception 'yetki yok'; end if;
  for v_gun in
    select d::date from generate_series(greatest(p_hafta_basi, v_bugun + 1), p_hafta_basi + 6, interval '1 day') d
     where not exists (select 1 from public.gorevler g where g.ogrenci_id = p_ogrenci and g.tarih = d::date)
     order by d
  loop
    select k.id, k.ad, k.ders_id into v_id, v_ad, v_ders
      from public.konular k
      left join (
        select dh.konu_id, sum(dh.adet) as hata
          from public.deneme_hatalari dh join public.denemeler dn on dn.id = dh.deneme_id
         where dn.ogrenci_id = p_ogrenci group by dh.konu_id
      ) h on h.konu_id = k.id
      left join public.konu_ilerleme ki on ki.konu_id = k.id and ki.ogrenci_id = p_ogrenci
     where (h.hata > 0 or ki.durum in ('tekrar_gerekli', 'tamamlandi'))
       and not (k.id = any(v_kullanilan))
       and not exists (select 1 from public.gorevler g where g.ogrenci_id = p_ogrenci and g.konu_id = k.id and g.durum::text in ('bekliyor', 'devam'))
     order by coalesce(h.hata, 0) desc, (ki.durum = 'tekrar_gerekli') desc nulls last, ki.guncellendi asc nulls last
     limit 1;
    exit when not found;
    insert into public.gorevler (ogrenci_id, koc_id, tarih, ders_id, konu_id, tur, baslik, hedef_adet)
    values (p_ogrenci, auth.uid(), v_gun, v_ders, v_id, 'tekrar', left(v_ad || ' tekrarı', 200), 20);
    v_kullanilan := v_kullanilan || v_id;
    v_n := v_n + 1;
  end loop;
  return v_n;
end $function$;

grant execute on function public.koc_tekrarlari_dagit(uuid, date) to authenticated;
