-- Öğrenci ekranında haftalık programı hızlı kurmak için iki toplu işlem
-- (22 Eylül 2026, Bekir: "Kıvanç haftalık program yapıyor").
-- 1) koc_haftayi_kopyala: geçen haftanın görevlerini bu haftanın aynı
--    günlerine yazar; yalnız bu hafta hiç görevi olmayan günlere (üzerine
--    yazmaz). Görüşme görevleri kopyalanmaz. Durum bekliyor, sayaç sıfır.
-- 2) koc_yarimlari_tasi: bu haftanın bugüne kadarki bitmemiş görevlerini
--    (bekliyor/devam) yarına taşır.
create or replace function public.koc_haftayi_kopyala(p_ogrenci uuid, p_hafta_basi date)
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare v_n integer;
begin
  if not private.ogrencim_mi(p_ogrenci) then raise exception 'yetki yok'; end if;
  insert into public.gorevler (ogrenci_id, koc_id, tarih, periyot, tur, baslik, aciklama, hedef_adet, ders_id, konu_id, kaynak_id, kaynak_aralik, baslangic_saat, bitis_saat)
  select g.ogrenci_id, auth.uid(), g.tarih + 7, g.periyot, g.tur, g.baslik, g.aciklama, g.hedef_adet, g.ders_id, g.konu_id, g.kaynak_id, g.kaynak_aralik, g.baslangic_saat, g.bitis_saat
    from public.gorevler g
   where g.ogrenci_id = p_ogrenci
     and g.tarih between p_hafta_basi - 7 and p_hafta_basi - 1
     and g.tur::text <> 'gorusme'
     and not exists (select 1 from public.gorevler x where x.ogrenci_id = p_ogrenci and x.tarih = g.tarih + 7);
  get diagnostics v_n = row_count;
  return v_n;
end $function$;

create or replace function public.koc_yarimlari_tasi(p_ogrenci uuid, p_hafta_basi date)
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare v_n integer; v_bugun date := private.yerel_gun(now());
begin
  if not private.ogrencim_mi(p_ogrenci) then raise exception 'yetki yok'; end if;
  update public.gorevler g
     set tarih = v_bugun + 1, guncellendi = now()
   where g.ogrenci_id = p_ogrenci
     and g.tarih between p_hafta_basi and v_bugun
     and g.durum::text in ('bekliyor', 'devam')
     and g.tur::text <> 'gorusme';
  get diagnostics v_n = row_count;
  return v_n;
end $function$;

grant execute on function public.koc_haftayi_kopyala(uuid, date) to authenticated;
grant execute on function public.koc_yarimlari_tasi(uuid, date) to authenticated;
