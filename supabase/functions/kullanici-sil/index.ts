// Kullanici silme. Yalnizca koc veya yonetici rolundeki kisiler cagirabilir.
//
// Neden Edge Function: silmek de acmak gibi service_role anahtarini gerektirir.
// O anahtar veritabaninin tamamina sinirsiz erisim verir ve tarayiciya asla
// inmemelidir. Ayrica yetki kurali istemcinin soyledigine degil, veritabanindan
// okunan role bakarak calismali.
//
// Rol yetkisi kademeli (kullanici-olustur ile ayni mantik):
//   ogrenci, veli  -> koc (yalnizca kendi ogrencisi) ve yonetici
//   koc, yonetici  -> YALNIZCA yonetici
// Kimse kendini silemez.
//
// Silme sirasi onemli: once profiller satiri gider, zincirleme (CASCADE) tum
// gorev/deneme/ilerleme kayitlarini alir; auth kullanicisi en son silinir.
// Tersi olsaydi auth'suz yetim bir profil kalabilirdi.
//
// SURUM NOTU: supabase-js surumu sabit (2.49.4). Sebebi kullanici-olustur
// README'sinde: "@2" ile yayinlandiginda admin istemcisi uzerinden
// auth.getUser(jeton) "Auth session missing" vermeye baslamisti.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2.49.4'

const BASLIKLAR = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

const KOVA = 'ogrenci-foto'

function cevap(govde: unknown, kod = 200) {
  return new Response(JSON.stringify(govde), { status: kod, headers: BASLIKLAR })
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

  const yonetim = createClient(ADRES, SERVIS, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 1) Cagiran kim?
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

  // 2) Cagiranin rolu veritabanindan okunur.
  const { data: cagiran, error: cagiranHatasi } = await yonetim
    .from('profiller')
    .select('rol')
    .eq('id', cagiranId)
    .maybeSingle()

  if (cagiranHatasi) return cevap({ hata: `Profil okunamadi: ${cagiranHatasi.message}` }, 500)
  if (!cagiran || (cagiran.rol !== 'koc' && cagiran.rol !== 'yonetici')) {
    return cevap({ hata: 'Bu islem icin koc yetkisi gerekli.' }, 403)
  }

  // 3) Girdi
  let govde: Record<string, unknown>
  try {
    govde = await req.json()
  } catch {
    return cevap({ hata: 'Gecersiz istek.' }, 400)
  }
  const hedefId = String(govde.id ?? '').trim()
  if (!hedefId) return cevap({ hata: 'Silinecek kisi belirtilmedi.' }, 400)
  if (hedefId === cagiranId) return cevap({ hata: 'Kendi hesabinizi silemezsiniz.' }, 403)

  const { data: hedef } = await yonetim
    .from('profiller')
    .select('rol, ad_soyad, fotograf_yolu')
    .eq('id', hedefId)
    .maybeSingle()
  if (!hedef) return cevap({ hata: 'Kayit bulunamadi.' }, 404)

  // 4) Yetki kademesi
  if (hedef.rol === 'koc' || hedef.rol === 'yonetici') {
    if (cagiran.rol !== 'yonetici') {
      return cevap({ hata: 'Koc hesabini yalnizca yonetici silebilir.' }, 403)
    }
  } else if (cagiran.rol !== 'yonetici') {
    // Koc yalnizca kendi ogrencisine (ve o ogrencinin velisine) dokunabilir.
    if (hedef.rol === 'ogrenci') {
      const { data: o } = await yonetim
        .from('ogrenciler')
        .select('id')
        .eq('id', hedefId)
        .eq('koc_id', cagiranId)
        .maybeSingle()
      if (!o) return cevap({ hata: 'Bu ogrenci size ait degil.' }, 403)
    } else if (hedef.rol === 'veli') {
      const { data: bag } = await yonetim
        .from('veli_ogrenci')
        .select('ogrenci_id, ogrenciler!inner(koc_id)')
        .eq('veli_id', hedefId)
        .eq('ogrenciler.koc_id', cagiranId)
      if (!bag || bag.length === 0) return cevap({ hata: 'Bu veli size ait degil.' }, 403)
    }
  }

  // 5) Ogrenci siliniyorsa: yalnizca bu ogrenciye bagli veliler de gider.
  //    Baska ogrencisi olan veli birakilir, yoksa ikinci cocugun velisi de
  //    silinmis olurdu.
  const oksuzVeliler: string[] = []
  if (hedef.rol === 'ogrenci') {
    const { data: veliler } = await yonetim
      .from('veli_ogrenci')
      .select('veli_id')
      .eq('ogrenci_id', hedefId)
    for (const v of veliler ?? []) {
      const { data: digerleri } = await yonetim
        .from('veli_ogrenci')
        .select('ogrenci_id')
        .eq('veli_id', v.veli_id)
        .neq('ogrenci_id', hedefId)
      if (!digerleri || digerleri.length === 0) oksuzVeliler.push(v.veli_id as string)
    }
  }

  // 6) Fotograflar. Depolama zincirlemeye dahil degil, elle temizlenir.
  const yollar = [hedef.fotograf_yolu].filter(Boolean) as string[]
  if (oksuzVeliler.length > 0) {
    const { data: veliProfilleri } = await yonetim
      .from('profiller')
      .select('fotograf_yolu')
      .in('id', oksuzVeliler)
    for (const p of veliProfilleri ?? []) if (p.fotograf_yolu) yollar.push(p.fotograf_yolu)
  }
  if (yollar.length > 0) await yonetim.storage.from(KOVA).remove(yollar)

  // 7) Karar kuyrugundaki ertelemeler. kaynak_id metin ve bazen "uuid|sira"
  //    biciminde, o yuzden esitlik degil onek eslesmesi.
  await yonetim.from('karar_ertelemeleri').delete().like('kaynak_id', `${hedefId}%`)

  // 8) Silme. Once profil (zincirleme her seyi alir), sonra auth kullanicisi.
  const silinecekler = [hedefId, ...oksuzVeliler]
  const { error: silmeHatasi } = await yonetim.from('profiller').delete().in('id', silinecekler)
  if (silmeHatasi) return cevap({ hata: `Kayit silinemedi: ${silmeHatasi.message}` }, 400)

  const kalanlar: string[] = []
  for (const id of silinecekler) {
    const { error } = await yonetim.auth.admin.deleteUser(id)
    if (error) kalanlar.push(id)
  }

  return cevap({
    silindi: hedefId,
    ad_soyad: hedef.ad_soyad,
    veli_silindi: oksuzVeliler.length,
    // Profil gitti ama auth kaydi kaldiysa kisi giris yapamaz (profili yok);
    // yine de sessiz gecmiyoruz.
    auth_kalan: kalanlar,
  })
})
