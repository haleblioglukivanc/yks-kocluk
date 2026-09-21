-- Yönetim paneli kalktı (22 Eylül 2026, Bekir). Tanıtım sitesinden gelen yeni
-- başvurular koçun Yapılacaklar'ına kart olarak düşer (yalnız yöneticide):
-- "Aradım" → durum arandı; "Yarın" → bir gün ertelenir.
do $mig$
declare d text; k text;
begin
  k := pg_get_functiondef('public.koc_karar_kuyrugu'::regproc);
  k := replace(k, E'  union all\n  (select ''konu_tekrar''', $b$  union all
  select 'basvuru', 'bugun', b.id::text, null::uuid, coalesce(nullif(trim(b.ad_soyad), ''), 'Yeni başvuru'), null::text,
         concat_ws(' · ', nullif(b.hizmet, ''), nullif(b.sinif::text, ''), case b.arama_zamani when 'hafta_ici_gunduz' then 'hafta içi gündüz aranmak istiyor' when 'hafta_ici_aksam' then 'hafta içi akşam aranmak istiyor' when 'hafta_sonu' then 'hafta sonu aranmak istiyor' end),
         'Tanıtım sitesinden yeni başvuru. Aradıktan sonra "Aradım" de.',
         nullif(b.not_metni, ''), b.telefon,
         jsonb_build_object('onay', 'Aradım', 'ertele', 'Yarın'),
         1::smallint, extract(epoch from b.olusturuldu),
         jsonb_build_object('telefon', b.telefon, 'dolduran', b.dolduran)
  from public.basvurular b
  where b.durum = 'yeni' and private.yonetici_mi()
  union all
  (select 'konu_tekrar'$b$);
  execute k;

  d := pg_get_functiondef('public.koc_karar_ver'::regproc);
  d := replace(d, 'if p_tip = ''konu_tekrar'' then', $b$if p_tip = 'basvuru' then
    if not private.yonetici_mi() then raise exception 'yetki yok'; end if;
    if p_karar = 'onay' then
      update public.basvurular set durum = 'arandi', arandi_zaman = now(), isleyen_id = v_koc, guncellendi = now()
       where id = p_kaynak_id::bigint and durum = 'yeni';
      return jsonb_build_object('durum', 'tamam');
    end if;
    return jsonb_build_object('durum', 'yok');
  end if;

  if p_tip = 'konu_tekrar' then$b$);
  execute d;
end $mig$;
