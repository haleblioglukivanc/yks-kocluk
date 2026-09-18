// Kullanici olusturma. Yalnizca koc veya yonetici cagirabilir.
//
// Neden Edge Function: hesap acmak service_role anahtarini gerektirir. O anahtar
// veritabaninin tamamina sinirsiz erisim verir ve tarayiciya asla inmemelidir.
//
// Rol yetkisi kademeli:
//   ogrenci, veli  -> koc da yonetici de acabilir
//   koc            -> YALNIZCA yonetici acabilir
//
// Yonetici artik bir ROL degil, profiller.yonetici BAYRAGI (private.yonetici_mi
// ile ayni kaynak). Eskiden rol = 'yonetici' bakiliyordu; o rol veritabaninda
// kalmadigi icin koc ekleme sessizce 403 veriyordu (19 Eylul 2026 duzeltmesi).
// Bu dosya yayindaki surumden (v14) repoya alindi; oncesinde repoda yoktu.
//
// SURUM NOTU: supabase-js surumu sabit (2.49.4); "@2" ile yayinlandiginda
// auth.getUser(jeton) "Auth session missing" vermeye baslamisti.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2.49.4'

const BASLIKLAR = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

const ROL_ADI: Record<string, string> = { ogrenci: 'öğrenci', veli: 'veli', koc: 'koç', yonetici: 'yönetici' }

function cevap(govde: unknown, kod = 200) {
  return new Response(JSON.stringify(govde), { status: kod, headers: BASLIKLAR })
}

/** 8 karakter, sozlu aktarilabilir: I, l, 1, O, 0 yok. Or. "Kmedza47". */
function geciciSifreUret(): string {
  const buyuk = 'ABCDEFGHJKMNPQRSTUVWXYZ'
  const kucuk = 'abcdefghjkmnpqrstuvwxyz'
  const rakam = '23456789'
  const bayt = new Uint8Array(8)
  crypto.getRandomValues(bayt)
  let s = buyuk[bayt[0] % buyuk.length]
  for (let i = 1; i <= 5; i++) s += kucuk[bayt[i] % kucuk.length]
  s += rakam[bayt[6] % rakam.length]
  s += rakam[bayt[7] % rakam.length]
  return s
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: BASLIKLAR })
  if (req.method !== 'POST') return cevap({ hata: 'Yalnizca POST.' }, 405)

  const ADRES = Deno.env.get('SUPABASE_URL')!
  const SERVIS = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const ANON = Deno.env.get('SUPABASE_ANON_KEY')!

  const yetki = req.headers.get('Authorization') ?? ''
  if (!yetki.toLowerCase().startsWith('bearer ')) return cevap({ hata: 'Giris gerekli.' }, 401)
  const jeton = yetki.slice(7).trim()
  if (!jeton) return cevap({ hata: 'Giris gerekli.' }, 401)

  const yonetim = createClient(ADRES, SERVIS, { auth: { autoRefreshToken: false, persistSession: false } })

  let cagiranId: string | null = null
  let sonHata = ''
  const kullaniciIstemci = createClient(ADRES, ANON, {
    global: { headers: { Authorization: `Bearer ${jeton}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: baslikla, error: baslikHatasi } = await kullaniciIstemci.auth.getUser()
  if (baslikla?.user) {
    cagiranId = baslikla.user.id
  } else {
    sonHata = baslikHatasi?.message ?? ''
    const { data: jetonla, error: jetonHatasi } = await yonetim.auth.getUser(jeton)
    if (jetonla?.user) cagiranId = jetonla.user.id
    else sonHata = jetonHatasi?.message ?? sonHata
  }
  if (!cagiranId) return cevap({ hata: `Oturum gecersiz. ${sonHata}`.trim() }, 401)

  const { data: profil, error: profilHatasi } = await yonetim
    .from('profiller').select('rol, yonetici').eq('id', cagiranId).maybeSingle()
  if (profilHatasi) return cevap({ hata: `Profil okunamadi: ${profilHatasi.message}` }, 500)
  const yoneticiMi = profil?.yonetici === true || profil?.rol === 'yonetici'
  if (!profil || (profil.rol !== 'koc' && !yoneticiMi)) {
    return cevap({ hata: 'Bu islem icin koc yetkisi gerekli.' }, 403)
  }

  let govde: Record<string, unknown>
  try { govde = await req.json() } catch { return cevap({ hata: 'Gecersiz istek.' }, 400) }

  const rol = String(govde.rol ?? 'ogrenci')
  const eposta = String(govde.eposta ?? '').trim().toLowerCase()
  const adSoyad = String(govde.ad_soyad ?? '').trim()

  if (rol !== 'ogrenci' && rol !== 'veli' && rol !== 'koc') return cevap({ hata: 'Gecersiz rol.' }, 400)
  if (rol === 'koc' && !yoneticiMi) return cevap({ hata: 'Koc hesabini yalnizca yonetici acabilir.' }, 403)
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(eposta)) return cevap({ hata: 'Gecerli bir e-posta girin.' }, 400)
  if (adSoyad.length < 2) return cevap({ hata: 'Ad soyad girin.' }, 400)

  let hedefOgrenci: string | null = null
  if (rol === 'veli') {
    hedefOgrenci = String(govde.ogrenci_id ?? '')
    const sorgu = yonetim.from('ogrenciler').select('id').eq('id', hedefOgrenci)
    if (!yoneticiMi) sorgu.eq('koc_id', cagiranId)
    const { data: o } = await sorgu.maybeSingle()
    if (!o) return cevap({ hata: 'Bu ogrenci size ait degil.' }, 403)
  }

  const sifre = geciciSifreUret()
  const { data: yeni, error: acmaHatasi } = await yonetim.auth.admin.createUser({
    email: eposta,
    password: sifre,
    email_confirm: true,
    user_metadata: { ad_soyad: adSoyad, rol },
  })

  if (acmaHatasi || !yeni?.user) {
    const m = acmaHatasi?.message ?? ''
    if (m.includes('already been registered') || m.includes('already exists')) {
      const { data: mevcut } = await yonetim.rpc('eposta_rolu', { p_eposta: eposta })
      const sifat = mevcut?.rol ? ROL_ADI[mevcut.rol] ?? mevcut.rol : null
      return cevap({
        hata: sifat
          ? `Bu e-posta zaten ${sifat} olarak kayitli${mevcut?.ad_soyad ? ` (${mevcut.ad_soyad})` : ''}. Bir e-posta yalnizca tek hesaba baglanabilir.`
          : 'Bu e-posta zaten kayitli. Baska bir adres kullanin.',
      }, 409)
    }
    return cevap({ hata: m || 'Hesap olusturulamadi.' }, 400)
  }

  const yeniId = yeni.user.id
  try {
    // sifre_degistirmeli: ilk giriste yeni sifre belirleme ekrani acilir.
    const { error: pHata } = await yonetim
      .from('profiller')
      .update({ rol, ad_soyad: adSoyad, telefon: govde.telefon ?? null, sifre_degistirmeli: true })
      .eq('id', yeniId)
    if (pHata) throw pHata

    if (rol === 'ogrenci') {
      const { error: oHata } = await yonetim.from('ogrenciler').insert({
        id: yeniId,
        koc_id: govde.koc_id ?? cagiranId,
        katalog_id: govde.katalog_id ?? null,
        alan: govde.alan ?? null,
        sinif: govde.sinif ?? null,
      })
      if (oHata) throw oHata
    } else if (rol === 'veli') {
      const { error: vHata } = await yonetim.from('veli_ogrenci').insert({
        veli_id: yeniId,
        ogrenci_id: hedefOgrenci,
        iliski: govde.iliski ?? 'diger',
      })
      if (vHata) throw vHata
    }
  } catch (e) {
    await yonetim.auth.admin.deleteUser(yeniId)
    return cevap({ hata: (e as Error).message ?? 'Kayit tamamlanamadi.' }, 400)
  }

  return cevap({ id: yeniId, eposta, ad_soyad: adSoyad, rol, gecici_sifre: sifre }, 201)
})
