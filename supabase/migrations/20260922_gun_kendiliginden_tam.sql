-- "Günü tamamla" düğmesi kalktı (22 Eylül 2026, Bekir). Gün gece yarısı
-- kendiliğinden kapanır; "tam" artık düğmeye basılmasına değil, o günün
-- işlerine bakar: koçun o gün için verdiği bütün görevler tamamlanmış (ya da
-- atlanmış) ve bütün aktif rutinler işaretlenmişse gün tamdır. O gün hiç
-- görev ve rutin yoksa gün eksik sayılmaz. Koçun "N gündür günü
-- tamamlamıyor" uyarısı ve dün_tam bu değeri okumaya devam eder.
create or replace function private.gunleri_kapat()
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_dun date := private.yerel_gun(now()) - 1;
  v_sayi integer;
begin
  insert into public.gun_kapanis (ogrenci_id, tarih, kapandi, tam, islem_yapan)
  select o.id, v_dun, now(),
         not exists (
           select 1 from public.gorevler g
            where g.ogrenci_id = o.id and g.tarih = v_dun
              and coalesce(g.durum::text, 'bekliyor') not in ('tamamlandi', 'atlandi')
         )
         and not exists (
           select 1 from public.rutinler r
            where r.ogrenci_id = o.id and r.aktif
              and r.olusturuldu::date <= v_dun
              and not exists (select 1 from public.rutin_kayit k where k.rutin_id = r.id and k.tarih = v_dun)
         ),
         null
    from public.ogrenciler o
   where o.aktif
     and o.kayit_tarihi <= v_dun
     and not exists (select 1 from public.gun_kapanis k where k.ogrenci_id = o.id and k.tarih = v_dun);
  get diagnostics v_sayi = row_count;
  return v_sayi;
end $function$;
