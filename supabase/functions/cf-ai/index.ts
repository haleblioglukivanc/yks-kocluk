// Cloudflare Workers AI köprüsü: Supabase'deki mevcut CF_ACCOUNT_ID / CF_API_TOKEN sırlarıyla (deneme analizinin kullandığı)
// bir modeli çalıştırır. Anahtarlar Supabase'den çıkmaz; GitHub'a ayrıca Cloudflare anahtarı gerekmez.
// Kullanan: sosyal/gorsel.py (günlük Shorts için satır görselleri).
// Yetki: x-anahtar başlığı = sosyal_ayar.CF_KOPRU_ANAHTAR (yalnız servis anahtarı okuyabilir).
// İstek: POST { model: "@cf/...", govde: {...} } → Cloudflare yanıtı (JSON ya da görsel) aynen döner.

const URL_ = Deno.env.get('SUPABASE_URL')!
const SERVIS = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

async function kopruAnahtari(): Promise<string | undefined> {
  const r = await fetch(`${URL_}/rest/v1/sosyal_ayar?anahtar=eq.CF_KOPRU_ANAHTAR&select=deger`, {
    headers: { apikey: SERVIS, Authorization: `Bearer ${SERVIS}` },
  })
  const satir = r.ok ? await r.json() : []
  return satir[0]?.deger
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('ok')
  const beklenen = await kopruAnahtari()
  if (!beklenen || req.headers.get('x-anahtar') !== beklenen) return new Response('yetki yok', { status: 401 })
  const { model, govde } = await req.json()
  if (typeof model !== 'string' || !model.startsWith('@cf/')) return new Response('model', { status: 400 })
  const hesap = Deno.env.get('CF_ACCOUNT_ID'), anahtar = Deno.env.get('CF_API_TOKEN') ?? Deno.env.get('CF_AI_TOKEN')
  if (!hesap || !anahtar) return new Response('cloudflare anahtarı yok', { status: 500 })
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${hesap}/ai/run/${model}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${anahtar}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(govde ?? {}),
  })
  return new Response(r.body, { status: r.status, headers: { 'Content-Type': r.headers.get('Content-Type') ?? 'application/octet-stream' } })
})
