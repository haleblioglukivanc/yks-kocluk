-- Koçun öğrenciyle teması tek kayıttan okunur (19 Eylül 2026).
-- Mesaj zaten mesajlar tablosunda; yalnız telefon / yüz yüze görüşme için
-- yeni tablo. Bugün kuyruğu, Öğrenciler listesi ve Çizbi aynı fonksiyonu okur.
--   bekliyor   : son 72 saatte temas yok
--   atildi     : mesaj gitti, henüz yanıt/ilerleme yok (24 saate kadar)
--   yanit      : öğrenci mesaja yazdı
--   hareket    : temastan sonra görev tamamladı
--   gorusuldu  : koç "Görüştük" dedi
--   hareketsiz : mesajın üstünden 24 saat geçti, ne yanıt ne ilerleme

create table if not exists public.koc_gorusmeleri (
  id bigint generated always as identity primary key,
  koc_id uuid not null references public.profiller(id) on delete cascade,
  ogrenci_id uuid not null references public.profiller(id) on delete cascade,
  tur text not null default 'telefon' check (tur in ('telefon', 'yuz_yuze')),
  notu text check (notu is null or char_length(notu) <= 300),
  olusturuldu timestamptz not null default now()
);
create index if not exists koc_gorusmeleri_ogrenci on public.koc_gorusmeleri (ogrenci_id, olusturuldu desc);
alter table public.koc_gorusmeleri enable row level security;
-- Politika yok: yazma ve okuma yalnız aşağıdaki fonksiyonlardan.
revoke all on public.koc_gorusmeleri from anon, authenticated;

create or replace function private.temas_durumu(p_ogrenci uuid)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  with son as (
    select * from (
      (select m.olusturuldu as zaman, 'mesaj'::text as tur, null::text as notu
         from public.mesajlar m
        where m.alici_id = p_ogrenci and m.gonderen_id <> p_ogrenci and m.geri_alindi is null
          and m.olusturuldu > now() - interval '72 hours'
        order by m.olusturuldu desc limit 1)
      union all
      (select g.olusturuldu, g.tur, g.notu from public.koc_gorusmeleri g
        where g.ogrenci_id = p_ogrenci and g.olusturuldu > now() - interval '72 hours'
        order by g.olusturuldu desc limit 1)
    ) x order by zaman desc limit 1
  )
  select coalesce((
    select jsonb_build_object(
      'durum', case
         when s.tur <> 'mesaj' then 'gorusuldu'
         when exists (select 1 from public.mesajlar y
                       where y.gonderen_id = p_ogrenci and y.olusturuldu > s.zaman and y.geri_alindi is null) then 'yanit'
         when exists (select 1 from public.gorevler gv
                       where gv.ogrenci_id = p_ogrenci and gv.durum = 'tamamlandi' and gv.guncellendi > s.zaman) then 'hareket'
         when s.zaman < now() - interval '24 hours' then 'hareketsiz'
         else 'atildi' end,
      'zaman', s.zaman, 'tur', s.tur, 'not', s.notu)
    from son s), jsonb_build_object('durum', 'bekliyor'));
$$;

-- Hedef bu temas döneminde (7 gün) hafifletildi ya da koç "aynı kalsın" dedi mi?
create or replace function private.hafiflet_yakin(p_ogrenci uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.karar_ertelemeleri e
                  where e.koc_id = auth.uid() and e.tip = 'hafiflet'
                    and e.kaynak_id = p_ogrenci::text and e.tekrar_tarihi > private.yerel_gun(now()));
$$;

-- Hedefi %20 hafifletir; bir hafta içinde ikinci kez hafifletmez.
create or replace function private.hedef_hafiflet(p_ogrenci uuid, p_koc uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if exists (select 1 from public.karar_ertelemeleri e
              where e.koc_id = p_koc and e.tip = 'hafiflet' and e.kaynak_id = p_ogrenci::text
                and e.tekrar_tarihi > private.yerel_gun(now())) then
    return;
  end if;
  update public.ogrenciler
     set haftalik_calisma_hedefi_dk = greatest(600, round(haftalik_calisma_hedefi_dk * 0.8))::smallint
   where id = p_ogrenci and haftalik_calisma_hedefi_dk is not null;
  insert into public.karar_ertelemeleri (koc_id, tip, kaynak_id, sayi, tekrar_tarihi)
  values (p_koc, 'hafiflet', p_ogrenci::text, 0, private.yerel_gun(now()) + 7)
  on conflict (koc_id, tip, kaynak_id)
  do update set sayi = 0, tekrar_tarihi = private.yerel_gun(now()) + 7;
end $$;

-- Liste için: koçun her öğrencisinin temas durumu.
create or replace function public.koc_temas_durumlari()
returns table (ogrenci_id uuid, durum text, zaman timestamptz, tur text, notu text)
language sql stable security definer set search_path = public, pg_temp as $$
  select o.id, t.d->>'durum', (t.d->>'zaman')::timestamptz, t.d->>'tur', t.d->>'not'
  from public.ogrenciler o
  cross join lateral (select private.temas_durumu(o.id) as d) t
  where o.koc_id = auth.uid() and o.aktif;
$$;

-- "Görüştük": telefon ya da yüz yüze konuşma kaydı.
create or replace function public.koc_gorustum(p_ogrenci uuid, p_tur text default 'telefon', p_not text default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not private.koc_yetkisi_var() or not private.ogrencim_mi(p_ogrenci) then
    raise exception 'yetki yok';
  end if;
  insert into public.koc_gorusmeleri (koc_id, ogrenci_id, tur, notu)
  values (auth.uid(), p_ogrenci, coalesce(p_tur, 'telefon'), nullif(trim(coalesce(p_not, '')), ''));
end $$;

revoke all on function public.koc_temas_durumlari() from public, anon;
revoke all on function public.koc_gorustum(uuid, text, text) from public, anon;
grant execute on function public.koc_temas_durumlari() to authenticated;
grant execute on function public.koc_gorustum(uuid, text, text) to authenticated;
revoke all on function private.temas_durumu(uuid) from public, anon;
revoke all on function private.hafiflet_yakin(uuid) from public, anon;
revoke all on function private.hedef_hafiflet(uuid, uuid) from public, anon;
grant execute on function private.temas_durumu(uuid) to authenticated;
grant execute on function private.hafiflet_yakin(uuid) to authenticated;

-- Mevcut fonksiyonları yerinde yamala; her parça tam bir kez eşleşmeli.
do $yama$
declare
  d text; y text;
begin
  ------------------------------------------------------------ karar kuyruğu
  d := pg_get_functiondef('public.koc_karar_kuyrugu'::regproc);
  y := d;
  y := replace(y,
    $a$case when r.sessiz_gun >= 2 then$a$,
    $a$case when tm.d->>'durum' = 'hareketsiz' then 'Mesaja rağmen hareket yok · ' || coalesce(r.gecikmis_gorev, 0) || ' gecikmiş görev'
              when r.sessiz_gun >= 2 then$a$);
  y := replace(y,
    $a$'Mesajı gönderirsen haftalık hedefi de %20 hafifletilir.'::text as oneri,$a$,
    $a$(case when private.hafiflet_yakin(r.ogrenci_id) then 'Hedef bu hafta zaten hafifletildi; yalnız mesaj gider.'
               else 'Mesajı gönderirsen haftalık hedefi de %20 hafifletilir.' end)::text as oneri,$a$);
  y := replace(y,
    $a$jsonb_build_object('onay','Mesajı gönder','ortaKod','duzelt','orta','Mesajı değiştir','ertele','Ertele')$a$,
    $a$jsonb_build_object('onay','Mesajı gönder','ortaKod','duzelt','orta','Mesajı değiştir','ertele','Ertele','sil','Görüştük')$a$);
  y := replace(y,
    $a$  from public.ogrenci_risk r
  join public.profiller p on p.id = r.ogrenci_id
  where r.risk_seviyesi = 'acil' and private.ogrencim_mi(r.ogrenci_id)
$a$,
    $a$  from public.ogrenci_risk r
  join public.profiller p on p.id = r.ogrenci_id
  cross join lateral (select private.temas_durumu(r.ogrenci_id) as d) tm
  where r.risk_seviyesi = 'acil' and private.ogrencim_mi(r.ogrenci_id)
    and tm.d->>'durum' in ('bekliyor', 'hareketsiz')
  union all
  /* Temas kurulmuş (toplu mesaj, tekil mesaj, görüşme) ama hedef kararı
     verilmemiş öğrenci: mesaj yeniden sorulmaz, yalnız hedef sorulur. */
  select 'hafiflet', 'bugun', r.ogrenci_id::text, r.ogrenci_id, r.ad_soyad, p.fotograf_yolu,
         (case tm.d->>'durum' when 'gorusuldu' then 'Görüşüldü' when 'yanit' then 'Mesaja yanıt geldi' else 'Mesaj atıldı' end)
           || ' · ' || to_char(((tm.d->>'zaman')::timestamptz) at time zone 'Europe/Istanbul', 'HH24:MI'),
         'Haftalık hedefi ' || round(o.haftalik_calisma_hedefi_dk / 60.0) || ' saatten '
           || round(greatest(600, round(o.haftalik_calisma_hedefi_dk * 0.8)) / 60.0) || ' saate indirelim mi?',
         null, null,
         jsonb_build_object('onay','Hafiflet','ertele','Aynı kalsın'),
         2::smallint, r.risk_ham::numeric, null
  from public.ogrenci_risk r
  join public.profiller p on p.id = r.ogrenci_id
  join public.ogrenciler o on o.id = r.ogrenci_id
  cross join lateral (select private.temas_durumu(r.ogrenci_id) as d) tm
  where r.risk_seviyesi = 'acil' and private.ogrencim_mi(r.ogrenci_id)
    and tm.d->>'durum' in ('atildi', 'gorusuldu', 'yanit')
    and o.haftalik_calisma_hedefi_dk is not null
    and not private.hafiflet_yakin(r.ogrenci_id)
$a$);
  if (length(y) - length(d)) < 1500 or y like '%case when r.sessiz_gun >= 2 then%' then
    raise exception 'kuyruk yaması tutmadı';
  end if;
  if position($a$'sil','Görüştük'$a$ in y) = 0 or position('hafiflet_yakin(r.ogrenci_id) then' in y) = 0 then
    raise exception 'kuyruk yaması eksik';
  end if;
  execute y;

  ------------------------------------------------------------ karar ver
  d := pg_get_functiondef('public.koc_karar_ver'::regproc);
  y := replace(d,
    $a$when 'odeme' then 7 else 1 end;$a$,
    $a$when 'odeme' then 7 when 'hafiflet' then 7 else 1 end;$a$);
  y := replace(y,
    $a$  elsif p_tip = 'risk' then
    v_ogrenci := p_kaynak_id::uuid;
    if not private.ogrencim_mi(v_ogrenci) then raise exception 'yetki yok'; end if;
$a$,
    $a$  elsif p_tip = 'hafiflet' then
    v_ogrenci := p_kaynak_id::uuid;
    if not private.ogrencim_mi(v_ogrenci) then raise exception 'yetki yok'; end if;
    perform private.hedef_hafiflet(v_ogrenci, v_koc);
    return jsonb_build_object('durum','hafifletildi');

  elsif p_tip = 'risk' then
    v_ogrenci := p_kaynak_id::uuid;
    if not private.ogrencim_mi(v_ogrenci) then raise exception 'yetki yok'; end if;
    if p_karar = 'sil' then
      insert into public.koc_gorusmeleri (koc_id, ogrenci_id, tur) values (v_koc, v_ogrenci, 'telefon');
      delete from public.karar_ertelemeleri where koc_id = v_koc and tip = 'risk' and kaynak_id = p_kaynak_id;
      return jsonb_build_object('durum','gorusuldu');
    end if;
$a$);
  y := replace(y,
    $a$    select haftalik_calisma_hedefi_dk into v_hedef from public.ogrenciler where id = v_ogrenci;
    if v_hedef is not null then
      update public.ogrenciler set haftalik_calisma_hedefi_dk = greatest(600, round(v_hedef * 0.8))::smallint where id = v_ogrenci;
    end if;
    delete from public.karar_ertelemeleri where koc_id = v_koc and tip = 'risk'$a$,
    $a$    perform private.hedef_hafiflet(v_ogrenci, v_koc);
    delete from public.karar_ertelemeleri where koc_id = v_koc and tip = 'risk'$a$);
  if position($a$when 'hafiflet' then 7$a$ in y) = 0
     or position($a$return jsonb_build_object('durum','gorusuldu')$a$ in y) = 0
     or position('greatest(600, round(v_hedef * 0.8))' in y) > 0 then
    raise exception 'karar_ver yaması tutmadı';
  end if;
  execute y;

  ------------------------------------------------------------ panel özeti
  d := pg_get_functiondef('public.koc_panel_ozeti'::regproc);
  y := replace(d,
    $a$'netFarki', net_farki)$a$,
    $a$'netFarki', net_farki, 'temas', private.temas_durumu(ogrenci_id)->>'durum')$a$);
  if y = d then raise exception 'panel özeti yaması tutmadı'; end if;
  execute y;
end
$yama$;

-- Alt sınır (600 dk = 10 saat): hedef zaten en alttaysa hafifletme sorulmaz.
do $yama$
declare d text; y text;
begin
  d := pg_get_functiondef('public.koc_karar_kuyrugu'::regproc);
  y := replace(d,
    $a$    and o.haftalik_calisma_hedefi_dk is not null
    and not private.hafiflet_yakin(r.ogrenci_id)$a$,
    $a$    and o.haftalik_calisma_hedefi_dk > 600
    and not private.hafiflet_yakin(r.ogrenci_id)$a$);
  y := replace(y,
    $a$(case when private.hafiflet_yakin(r.ogrenci_id) then 'Hedef bu hafta zaten hafifletildi; yalnız mesaj gider.'$a$,
    $a$(case when private.hafiflet_yakin(r.ogrenci_id) then 'Hedef bu hafta zaten hafifletildi; yalnız mesaj gider.'
               when coalesce((select o2.haftalik_calisma_hedefi_dk from public.ogrenciler o2 where o2.id = r.ogrenci_id), 0) <= 600
                 then 'Haftalık hedef zaten en alt sınırda; yalnız mesaj gider.'$a$);
  if y = d then raise exception 'yama tutmadı'; end if;
  execute y;
end $yama$;
