// Teknik sekmesi: Edge Function ortamında hangi gizli anahtarların TANIMLI
// oldugunu soyler (yalniz ADLAR; degerler asla donmez). Yalniz yonetici.
// SQL tarafi bu anahtarlari goremez (Supabase function secrets), o yuzden ayri.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2.49.4'

const IZINLI = new Set(['https://khkocluk.com', 'https://www.khkocluk.com', 'http://localhost:5173', 'http://localhost:4173'])
const basliklar = (req: Request) => {
  const k = req.headers.get('Origin') ?? ''
  return {
    'Access-Control-Allow-Origin': IZINLI.has(k) ? k : 'https://khkocluk.com',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    Vary: 'Origin',
  }
}

// Degeri gizli olmayan, gosterilebilecek ayarlar.
const ACIK_DEGERLER = ['AI_SAGLAYICI', 'ILETIMERKEZI_SENDER']

Deno.serve(async (req: Request) => {
  const H = basliklar(req)
  const cevap = (g: unknown, kod = 200) => new Response(JSON.stringify(g), { status: kod, headers: H })
  if (req.method === 'OPTIONS') return new Response('ok', { headers: H })

  const yetki = req.headers.get('Authorization') ?? ''
  const jeton = yetki.replace(/^bearer\s+/i, '').trim()
  if (!jeton) return cevap({ hata: 'Giris gerekli.' }, 401)
  const ADRES = Deno.env.get('SUPABASE_URL')!
  const istemci = createClient(ADRES, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: `Bearer ${jeton}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: u } = await istemci.auth.getUser()
  if (!u?.user) return cevap({ hata: 'Oturum gecersiz.' }, 401)
  const yonetim = createClient(ADRES, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: p } = await yonetim.from('profiller').select('yonetici').eq('id', u.user.id).maybeSingle()
  if (p?.yonetici !== true) return cevap({ hata: 'Yalnizca yonetici.' }, 403)

  const adlar = Object.keys(Deno.env.toObject())
    .filter((a) => !a.startsWith('SUPABASE_') && !a.startsWith('DENO_') && /^[A-Z][A-Z0-9_]+$/.test(a))
    .filter((a) => !['PATH', 'HOME', 'HOSTNAME', 'TZ', 'LANG', 'PWD', 'SB_REGION', 'SB_EXECUTION_ID', 'EDGE_RUNTIME_PORT'].includes(a))
    .sort()
  const degerler = Object.fromEntries(ACIK_DEGERLER.map((a) => [a, Deno.env.get(a) ?? null]))
  return cevap({ anahtarlar: adlar, degerler, zaman: new Date().toISOString() })
})
