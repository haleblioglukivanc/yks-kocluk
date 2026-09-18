// Sifre sifirlama: hedef hesaba yeni bir gecici sifre uretir ve bir kez
// cagirana dondurur. Kimse baskasinin sifresini "gormez"; yalnizca yenisini
// uretebilir. (Tasarim turu, 19 Eylul 2026 — TESPIT-YONETIM.md 2.1)
//
// Yetki kademesi (kullanici-olustur / kullanici-sil ile ayni mantik):
//   ogrenci, veli  -> yonetici her hesaba; koc yalnizca kendi ogrencisine
//                     ve o ogrencinin velisine
//   koc            -> YALNIZCA yonetici
// Kendi sifreni buradan sifirlayamazsin: onun yeri "Sifremi degistir".
//
// Yonetici bir ROL degil, profiller.yonetici BAYRAGI (private.yonetici_mi ile
// ayni kaynak). Eski fonksiyonlar rol = 'yonetici' bakiyordu; o rol artik yok.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2.49.4'

const IZINLI_KOKENLER = new Set([
  'https://khkocluk.com',
  'https://www.khkocluk.com',
  'http://localhost:5173',
  'http://localhost:4173',
])

function basliklar(req: Request) {
  const koken = req.headers.get('Origin') ?? ''
  return {
    'Access-Control-Allow-Origin': IZINLI_KOKENLER.has(koken) ? koken : 'https://khkocluk.com',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    Vary: 'Origin',
  }
}

/** 8 karakter, sozlu aktarilabilir: I, l, 1, O, 0 yok. Or. "Kmedza47". */
function geciciSifreUret(): string {
  const buyuk = 'ABCDEFGHJKMNPQRSTUVWXYZ'
  const kucuk = 'abcdefghjkmnpqrstuvwxyz'
  const rakam = '23456789'
  const b = new Uint8Array(8)
  crypto.getRandomValues(b)
  let s = buyuk[b[0] % buyuk.length]
  for (let i = 1; i <= 5; i++) s += kucuk[b[i] % kucuk.length]
  s += rakam[b[6] % rakam.length] + rakam[b[7] % rakam.length]
  return s
}

Deno.serve(async (req: Request) => {
  const H = basliklar(req)
  const cevap = (g: unknown, kod = 200) => new Response(JSON.stringify(g), { status: kod, headers: H })
  if (req.method === 'OPTIONS') return new Response('ok', { headers: H })
  if (req.method !== 'POST') return cevap({ hata: 'Yalnizca POST.' }, 405)

  const ADRES = Deno.env.get('SUPABASE_URL')!
  const SERVIS = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const ANON = Deno.env.get('SUPABASE_ANON_KEY')!

  const yetki = req.headers.get('Authorization') ?? ''
  if (!yetki.toLowerCase().startsWith('bearer ')) return cevap({ hata: 'Giris gerekli.' }, 401)
  const jeton = yetki.slice(7).trim()

  const yonetim = createClient(ADRES, SERVIS, { auth: { autoRefreshToken: false, persistSession: false } })
  const istemci = createClient(ADRES, ANON, {
    global: { headers: { Authorization: `Bearer ${jeton}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: oturum } = await istemci.auth.getUser()
  const cagiranId = oturum?.user?.id
  if (!cagiranId) return cevap({ hata: 'Oturum gecersiz.' }, 401)

  const { data: cagiran } = await yonetim
    .from('profiller').select('rol, yonetici').eq('id', cagiranId).maybeSingle()
  const yoneticiMi = cagiran?.yonetici === true || cagiran?.rol === 'yonetici'
  if (!cagiran || (cagiran.rol !== 'koc' && !yoneticiMi)) {
    return cevap({ hata: 'Bu islem icin koc yetkisi gerekli.' }, 403)
  }

  let govde: Record<string, unknown>
  try { govde = await req.json() } catch { return cevap({ hata: 'Gecersiz istek.' }, 400) }
  const hedefId = String(govde.id ?? '').trim()
  if (!hedefId) return cevap({ hata: 'Kisi belirtilmedi.' }, 400)
  if (hedefId === cagiranId) {
    return cevap({ hata: 'Kendi sifreni buradan degil, hesap menusundeki "Sifremi degistir"den yenilersin.' }, 403)
  }

  const { data: hedef } = await yonetim
    .from('profiller').select('rol, ad_soyad').eq('id', hedefId).maybeSingle()
  if (!hedef) return cevap({ hata: 'Kayit bulunamadi.' }, 404)

  if (hedef.rol === 'koc' || hedef.rol === 'yonetici') {
    if (!yoneticiMi) return cevap({ hata: 'Koc sifresini yalnizca yonetici sifirlayabilir.' }, 403)
  } else if (!yoneticiMi) {
    if (hedef.rol === 'ogrenci') {
      const { data: o } = await yonetim.from('ogrenciler').select('id').eq('id', hedefId).eq('koc_id', cagiranId).maybeSingle()
      if (!o) return cevap({ hata: 'Bu ogrenci size ait degil.' }, 403)
    } else if (hedef.rol === 'veli') {
      const { data: bag } = await yonetim
        .from('veli_ogrenci').select('ogrenci_id, ogrenciler!inner(koc_id)')
        .eq('veli_id', hedefId).eq('ogrenciler.koc_id', cagiranId)
      if (!bag || bag.length === 0) return cevap({ hata: 'Bu veli size ait degil.' }, 403)
    }
  }

  const sifre = geciciSifreUret()
  const { data: guncel, error } = await yonetim.auth.admin.updateUserById(hedefId, { password: sifre })
  if (error) return cevap({ hata: `Sifre degistirilemedi: ${error.message}` }, 400)

  // Ilk giriste yeni sifre belirlemesi icin bayrak.
  await yonetim.from('profiller').update({ sifre_degistirmeli: true }).eq('id', hedefId)

  return cevap({
    id: hedefId,
    ad_soyad: hedef.ad_soyad,
    eposta: guncel?.user?.email ?? null,
    gecici_sifre: sifre,
  })
})
