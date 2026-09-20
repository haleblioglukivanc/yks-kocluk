-- Hata defteri (20 Eylül 2026, Bekir mokabı onayladı)
-- Soru bazlı yanlış kaydı: fotoğraf + neden + güven + doğru şık.
-- Tekrar 1-3-7-14-28 gün; üst üste iki doğru = öğrenildi, defterden çıkar.
-- Yanlış konu bazlı yanlış havuzuna da (zorlanma_sinyali) bağlanır; denemeden
-- gelen kayıt sinyal üretmez, çünkü deneme_hatalari o konuyu zaten sayıyor.

alter table public.zorlanma_sinyali drop constraint if exists zorlanma_sinyali_hata_turu_check;
alter table public.zorlanma_sinyali add constraint zorlanma_sinyali_hata_turu_check
  check (hata_turu = any (array['bilgi','dikkat','sure','yontem']));

create table if not exists public.hata_defteri (
  id               bigint generated always as identity primary key,
  ogrenci_id       uuid not null references public.ogrenciler(id) on delete cascade,
  ders_id          bigint references public.dersler(id) on delete set null,
  konu_id          bigint references public.konular(id) on delete set null,
  deneme_id        bigint references public.denemeler(id) on delete set null,
  kaynak           text not null default 'soru' check (kaynak in ('deneme','soru')),
  foto_yolu        text,
  not_metni        text check (char_length(not_metni) <= 500),
  neden            text not null check (neden in ('bilgi','dikkat','yontem','sure')),
  guven            text check (guven in ('emin','tahmin')),
  dogru_sik        text check (dogru_sik in ('A','B','C','D','E')),
  aralik_indeksi   smallint not null default 0,
  sonraki_tekrar   date not null default (current_date + 1),
  ust_uste_dogru   smallint not null default 0,
  ogrenildi        timestamptz,
  olusturuldu      timestamptz not null default now(),
  islem_yapan      uuid default auth.uid()
);
create index if not exists hata_defteri_ogrenci_tekrar on public.hata_defteri (ogrenci_id, sonraki_tekrar) where ogrenildi is null;
create index if not exists hata_defteri_kronik on public.hata_defteri (ogrenci_id, konu_id, neden, olusturuldu);

create table if not exists public.hata_tekrarlari (
  id          bigint generated always as identity primary key,
  hata_id     bigint not null references public.hata_defteri(id) on delete cascade,
  ogrenci_id  uuid not null references public.ogrenciler(id) on delete cascade,
  secilen     text,
  dogru       boolean not null,
  zaman       timestamptz not null default now()
);
create index if not exists hata_tekrarlari_hata on public.hata_tekrarlari (hata_id);

alter table public.hata_defteri enable row level security;
alter table public.hata_tekrarlari enable row level security;

create policy hata_defteri_okur on public.hata_defteri for select to authenticated
  using (private.erisebilir_mi(ogrenci_id));
create policy hata_defteri_yazar on public.hata_defteri for all to authenticated
  using (ogrenci_id = (select auth.uid()) or private.ogrencim_mi(ogrenci_id))
  with check (ogrenci_id = (select auth.uid()) or private.ogrencim_mi(ogrenci_id));
create policy hata_tekrarlari_okur on public.hata_tekrarlari for select to authenticated
  using (private.erisebilir_mi(ogrenci_id));
-- tekrar kaydı yalnız hata_tekrar_cevapla üzerinden yazılır

/* İlk tekrar: öğrencinin yerel gününe göre yarın. Konu varsa ve kayıt
   denemeden gelmediyse konu havuzuna da sinyal düşer. */
create or replace function private.hata_defteri_eklenince()
 returns trigger language plpgsql security definer
 set search_path to 'public', 'pg_temp'
as $$
begin
  if tg_op = 'INSERT' then
    new.sonraki_tekrar := private.yerel_gun(now()) + 1;
    if new.konu_id is not null and new.ders_id is null then
      select ders_id into new.ders_id from public.konular where id = new.konu_id;
    end if;
  end if;
  return new;
end $$;

create or replace function private.hata_defteri_sinyale()
 returns trigger language plpgsql security definer
 set search_path to 'public', 'pg_temp'
as $$
begin
  if new.konu_id is not null and new.kaynak = 'soru' then
    insert into public.zorlanma_sinyali
      (ogrenci_id, konu_id, tarih, kaynak, siddet, hata_turu, aciklama, kaynak_ref, islem_yapan)
    values
      (new.ogrenci_id, new.konu_id, private.yerel_gun(now()), 'soru_cozumu',
       case when new.guven = 'emin' then 2 else 1 end, new.neden,
       'Hata defterine eklendi', 'hata:' || new.id, auth.uid())
    on conflict do nothing;
    perform private.skoru_sessizce_tazele(new.ogrenci_id);
  end if;
  return new;
end $$;

drop trigger if exists hata_defteri_once on public.hata_defteri;
create trigger hata_defteri_once before insert on public.hata_defteri
  for each row execute function private.hata_defteri_eklenince();
drop trigger if exists hata_defteri_sinyal on public.hata_defteri;
create trigger hata_defteri_sinyal after insert on public.hata_defteri
  for each row execute function private.hata_defteri_sinyale();

/* Tekrar cevabı. Doğru şık kayıtlıysa doğruluk sunucuda hesaplanır;
   yoksa öğrencinin beyanı (p_dogru) esas alınır. */
create or replace function public.hata_tekrar_cevapla(p_id bigint, p_secilen text default null, p_dogru boolean default null)
 returns jsonb language plpgsql security definer
 set search_path to 'public', 'pg_temp'
as $$
declare
  h public.hata_defteri; v_dogru boolean; v_ai smallint; v_ust smallint; v_bugun date := private.yerel_gun(now());
  v_ara int[] := array[1,3,7,14,28];
begin
  select * into h from public.hata_defteri where id = p_id for update;
  if h.id is null or not (h.ogrenci_id = auth.uid() or private.ogrencim_mi(h.ogrenci_id)) then
    raise exception 'yetki yok';
  end if;
  v_dogru := case when h.dogru_sik is not null and p_secilen is not null then upper(p_secilen) = h.dogru_sik
                  else coalesce(p_dogru, false) end;

  insert into public.hata_tekrarlari (hata_id, ogrenci_id, secilen, dogru)
  values (h.id, h.ogrenci_id, upper(p_secilen), v_dogru);

  if v_dogru then
    v_ust := h.ust_uste_dogru + 1;
    v_ai := least(h.aralik_indeksi + 1, 4);
    update public.hata_defteri
       set ust_uste_dogru = v_ust, aralik_indeksi = v_ai,
           sonraki_tekrar = v_bugun + v_ara[v_ai + 1],
           ogrenildi = case when v_ust >= 2 then now() end
     where id = h.id;
  else
    v_ust := 0; v_ai := 0;
    update public.hata_defteri
       set ust_uste_dogru = 0, aralik_indeksi = 0, sonraki_tekrar = v_bugun + 1, ogrenildi = null
     where id = h.id;
  end if;

  return jsonb_build_object('dogru', v_dogru, 'dogru_sik', h.dogru_sik,
    'ogrenildi', v_dogru and v_ust >= 2,
    'sonraki', case when v_dogru and v_ust >= 2 then null
                    when v_dogru then v_bugun + v_ara[v_ai + 1] else v_bugun + 1 end);
end $$;
revoke all on function public.hata_tekrar_cevapla(bigint, text, boolean) from public, anon;
grant execute on function public.hata_tekrar_cevapla(bigint, text, boolean) to authenticated;

-- Fotoğraf kovası: yol "<ogrenci_id>/<dosya>"
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('hata-foto', 'hata-foto', false, 3145728, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy hata_foto_okur on storage.objects for select to authenticated
  using (bucket_id = 'hata-foto' and private.erisebilir_mi(private.yol_ogrenci_id(name)));
create policy hata_foto_yazar on storage.objects for insert to authenticated
  with check (bucket_id = 'hata-foto' and (private.yol_ogrenci_id(name) = auth.uid() or private.ogrencim_mi(private.yol_ogrenci_id(name))));
create policy hata_foto_siler on storage.objects for delete to authenticated
  using (bucket_id = 'hata-foto' and (private.yol_ogrenci_id(name) = auth.uid() or private.ogrencim_mi(private.yol_ogrenci_id(name))));
