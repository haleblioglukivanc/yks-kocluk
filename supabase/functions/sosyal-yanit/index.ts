// Sosyal medya yanıt hattı.
//  • Meta (Instagram) webhook'u: yorum ve DM gelir → kategori → taslak → sosyal_yanit tablosuna
//  • YouTube: 10 dakikada bir cron yeni yorumları çeker (youtube_tara); bağlantı panelden OAuth ile
//  • Yönetim paneli (Sosyal sekmesi): yönetici "Gönder" der → yanıt platforma buradan gider
// Hiçbir şey onaysız gitmez. Kriz/istismar e-postası veritabanı tetikleyicisinden (sosyal_acil_bildir).
// Atla / geri al işlemleri panelden doğrudan RPC ile (sosyal_karar); gönderme burada, çünkü anahtar burada.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { SABIT, SABLON, SISTEM, YANITSIZ, kategori } from './kurallar.ts'

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const IG = 'https://graph.instagram.com/v23.0'

let ayarlar: Record<string, string> | null = null
async function ayar(k: string): Promise<string | undefined> {
  const e = Deno.env.get(k)
  if (e) return e
  if (!ayarlar) {
    const { data } = await db.from('sosyal_ayar').select('anahtar, deger')
    ayarlar = Object.fromEntries((data ?? []).map((r) => [r.anahtar, r.deger]))
  }
  return ayarlar![k]
}
async function ayarYaz(k: string, v: string | null) {
  if (v === null) await db.from('sosyal_ayar').delete().eq('anahtar', k)
  else await db.from('sosyal_ayar').upsert({ anahtar: k, deger: v })
  ayarlar = null
}
const FONK = () => `${Deno.env.get('SUPABASE_URL')}/functions/v1/sosyal-yanit`
const SITE_SOSYAL = 'https://khkocluk.com/yonetim#sosyal'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}
const json = (v: unknown, s = 200) =>
  new Response(JSON.stringify(v), { status: s, headers: { 'Content-Type': 'application/json', ...CORS } })

// ── Meta imza doğrulaması ─────────────────────────────────────────
async function imzaDogru(govde: string, imza: string | null) {
  const gizli = await ayar('IG_APP_SECRET')
  if (!gizli || !imza?.startsWith('sha256=')) return false
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(gizli), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const s = new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(govde)))
  const hex = [...s].map((b) => b.toString(16).padStart(2, '0')).join('')
  return hex === imza.slice(7)
}

// ── Panelden gelen istek: yalnız yönetici ─────────────────────────
async function yonetici(req: Request): Promise<string | null> {
  const jeton = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  if (!jeton) return null
  const { data } = await db.auth.getUser(jeton)
  const id = data?.user?.id
  if (!id) return null
  const { data: p } = await db.from('profiller').select('yonetici').eq('id', id).single()
  return p?.yonetici === true ? id : null
}

// ── Taslak ────────────────────────────────────────────────────────
async function yapayZeka(metin: string, kat: string): Promise<string | null> {
  const hesap = await ayar('CF_ACCOUNT_ID'), anahtar = await ayar('CF_AI_TOKEN')
  if (!hesap || !anahtar) return null
  try {
    const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${hesap}/ai/run/@cf/meta/llama-3.3-70b-instruct-fp8-fast`, {
      method: 'POST', headers: { Authorization: `Bearer ${anahtar}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ max_tokens: 220, messages: [{ role: 'system', content: SISTEM },
        { role: 'user', content: `Kategori: ${kat}\nGelen mesaj: ${metin}` }] }),
    })
    const v = await r.json()
    return v?.result?.response?.trim() || null
  } catch { return null }
}

async function taslak(metin: string) {
  const kat = kategori(metin)
  if (YANITSIZ.has(kat)) return { kat, taslak: null as string | null }
  if (SABIT[kat]) return { kat, taslak: SABIT[kat] }
  return { kat, taslak: (await yapayZeka(metin, kat)) ?? SABLON[kat] }
}

// ── Platforma gönder ──────────────────────────────────────────────
async function instagramaGonder(tur: string, hedef: string, metin: string) {
  const token = await ayar('IG_TOKEN')
  if (!token) throw new Error('Instagram bağlı değil (IG_TOKEN yok)')
  const r = tur === 'dm'
    ? await fetch(`${IG}/me/messages`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient: { id: hedef }, message: { text: metin } }) })
    : await fetch(`${IG}/${hedef}/replies`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: metin }) })
  if (!r.ok) throw new Error(`Instagram ${r.status}: ${(await r.text()).slice(0, 300)}`)
}


// ── YouTube ───────────────────────────────────────────────────────
const YT = 'https://www.googleapis.com/youtube/v3'
const YT_KAPSAM = 'https://www.googleapis.com/auth/youtube.force-ssl'

async function ytBaglantiAdresi() {
  const id = await ayar('YT_CLIENT_ID')
  if (!id || !(await ayar('YT_CLIENT_SECRET'))) throw new Error('Google uygulama bilgileri (YT_CLIENT_ID / YT_CLIENT_SECRET) eksik')
  const durum = crypto.randomUUID()
  await ayarYaz('YT_STATE', durum)
  return 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
    client_id: id, redirect_uri: FONK(), response_type: 'code', scope: YT_KAPSAM,
    access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true', state: durum,
  })
}

async function ytDonus(kod: string, durum: string) {
  if (!durum || durum !== (await ayar('YT_STATE'))) throw new Error('Bağlantı isteği tanınmadı; panelden yeniden dene')
  await ayarYaz('YT_STATE', null)
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code: kod, client_id: (await ayar('YT_CLIENT_ID'))!, client_secret: (await ayar('YT_CLIENT_SECRET'))!,
      redirect_uri: FONK(), grant_type: 'authorization_code' }),
  })
  const v = await r.json()
  if (!v.refresh_token) throw new Error('Google kalıcı izin vermedi: ' + (v.error_description ?? v.error ?? 'refresh_token yok'))
  const k = await fetch(`${YT}/channels?part=snippet&mine=true`, { headers: { Authorization: `Bearer ${v.access_token}` } })
  const kv = await k.json()
  const kanal = kv.items?.[0]
  if (!kanal) throw new Error('Bu Google hesabında YouTube kanalı bulunamadı; kanalı yöneten hesapla gir')
  await ayarYaz('YT_REFRESH_TOKEN', v.refresh_token)
  await ayarYaz('YT_KANAL_ID', kanal.id)
  await ayarYaz('YT_KANAL_ADI', kanal.snippet?.title ?? '')
  if (!(await ayar('YT_BASLANGIC'))) await ayarYaz('YT_BASLANGIC', new Date().toISOString())
  await ayarYaz('YT_SON_HATA', null)
}

async function ytErisim() {
  const rt = await ayar('YT_REFRESH_TOKEN')
  if (!rt) throw new Error('YouTube bağlı değil')
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: (await ayar('YT_CLIENT_ID'))!, client_secret: (await ayar('YT_CLIENT_SECRET'))!,
      refresh_token: rt, grant_type: 'refresh_token' }),
  })
  const v = await r.json()
  if (!v.access_token) throw new Error('YouTube izni yenilenemedi (' + (v.error_description ?? v.error) + '); panelden yeniden bağla')
  return v.access_token as string
}

async function youtubeTara() {
  if (!(await ayar('YT_REFRESH_TOKEN'))) return { atlandi: 'bağlı değil' }
  try {
    const tok = await ytErisim()
    const kanal = (await ayar('YT_KANAL_ID'))!
    const bas = new Date((await ayar('YT_BASLANGIC')) ?? 0)
    const r = await fetch(`${YT}/commentThreads?` + new URLSearchParams({ part: 'snippet,replies',
      allThreadsRelatedToChannelId: kanal, maxResults: '50', order: 'time', textFormat: 'plainText' }),
      { headers: { Authorization: `Bearer ${tok}` } })
    const v = await r.json()
    if (!r.ok) throw new Error(`YouTube ${r.status}: ${v.error?.message ?? ''}`.slice(0, 300))
    const aday: { id: string; video: string; ad: string; metin: string }[] = []
    for (const t of v.items ?? []) {
      const c = t.snippet?.topLevelComment?.snippet
      if (!c || new Date(c.publishedAt) < bas) continue
      if (c.authorChannelId?.value === kanal) continue                                   // kendi yorumumuz
      if ((t.replies?.comments ?? []).some((x: any) => x.snippet?.authorChannelId?.value === kanal)) continue  // zaten yanıtlamışız
      aday.push({ id: t.id, video: t.snippet.videoId, ad: String(c.authorDisplayName ?? '').replace(/^@/, ''), metin: c.textDisplay })
    }
    let yeni = 0
    if (aday.length) {
      const { data: olan } = await db.from('sosyal_yanit').select('olay_id').in('olay_id', aday.map((a) => 'yt:' + a.id))
      const var_ = new Set((olan ?? []).map((x) => x.olay_id))
      const kalan = aday.filter((a) => !var_.has('yt:' + a.id))
      if (kalan.length) {
        const vid = [...new Set(kalan.map((k) => k.video).filter(Boolean))]
        const baslik: Record<string, string> = {}
        if (vid.length) {
          const vr = await fetch(`${YT}/videos?part=snippet&id=${vid.join(',')}`, { headers: { Authorization: `Bearer ${tok}` } })
          for (const x of (await vr.json()).items ?? []) baslik[x.id] = x.snippet?.title
        }
        for (const k of kalan) {
          const { kat, taslak: t } = await taslak(k.metin)
          const { error } = await db.from('sosyal_yanit').insert({ platform: 'youtube', tur: 'yorum', olay_id: 'yt:' + k.id,
            hedef_id: k.id, gonderen_ad: k.ad || null, baglam: baslik[k.video] ? `Video: ${baslik[k.video]}` : null,
            mesaj: k.metin, kategori: kat, taslak: t, durum: t ? 'bekliyor' : 'yanitsiz' })
          if (!error) yeni++
        }
      }
    }
    await ayarYaz('YT_SON_TARAMA', new Date().toISOString())
    await ayarYaz('YT_SON_HATA', null)
    return { yeni }
  } catch (e) {
    await ayarYaz('YT_SON_HATA', String(e).slice(0, 300))
    return { hata: String(e).slice(0, 300) }
  }
}

async function youtubeGonder(hedef: string, metin: string) {
  const tok = await ytErisim()
  const r = await fetch(`${YT}/comments?part=snippet`, {
    method: 'POST', headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ snippet: { parentId: hedef, textOriginal: metin } }),
  })
  if (!r.ok) throw new Error(`YouTube ${r.status}: ${(await r.text()).slice(0, 300)}`)
}

async function baglantiDurumu() {
  return {
    youtube: {
      hazir: Boolean((await ayar('YT_CLIENT_ID')) && (await ayar('YT_CLIENT_SECRET'))),
      bagli: Boolean(await ayar('YT_REFRESH_TOKEN')),
      kanal: (await ayar('YT_KANAL_ADI')) ?? null,
      son_tarama: (await ayar('YT_SON_TARAMA')) ?? null,
      son_hata: (await ayar('YT_SON_HATA')) ?? null,
    },
    instagram: { bagli: Boolean((await ayar('IG_TOKEN')) && (await ayar('IG_APP_SECRET'))) },
  }
}

async function platformaGonder(k: { platform: string; tur: string; hedef_id: string }, metin: string) {
  if (k.platform === 'instagram') return instagramaGonder(k.tur, k.hedef_id, metin)
  if (k.platform === 'youtube') return youtubeGonder(k.hedef_id, metin)
  throw new Error(`${k.platform} henüz bağlı değil`)
}

async function gonder(id: number, metin: string | undefined, kim: string) {
  const { data: k } = await db.from('sosyal_yanit').select('*').eq('id', id).single()
  if (!k) return { ok: false, hata: 'Kayıt bulunamadı' }
  if (!['bekliyor', 'hata'].includes(k.durum)) return { ok: false, hata: 'Bu kayıt zaten işlenmiş' }
  const yazi = (metin ?? k.taslak ?? '').trim()
  if (!yazi) return { ok: false, hata: 'Boş yanıt gönderilemez' }
  try {
    if (!k.deneme) await platformaGonder(k, yazi)   // deneme kayıtları platforma gitmez
    await db.from('sosyal_yanit').update({ durum: 'gonderildi', gonderilen: yazi, hata: null,
      karar_zaman: new Date().toISOString(), karar_veren: kim }).eq('id', id)
    return { ok: true }
  } catch (e) {
    await db.from('sosyal_yanit').update({ durum: 'hata', hata: String(e).slice(0, 500) }).eq('id', id)
    return { ok: false, hata: String(e).slice(0, 200) }
  }
}

// ── Gelen olaylar (Meta) ──────────────────────────────────────────
async function kaydet(o: { tur: string; olay_id: string; hedef_id: string; gonderen_ad?: string; mesaj: string }) {
  const { kat, taslak: t } = await taslak(o.mesaj)
  // Aynı olay ikinci kez gelirse unique kısıt reddeder; sessizce geçilir.
  await db.from('sosyal_yanit').insert({ platform: 'instagram', ...o, kategori: kat, taslak: t,
    durum: t ? 'bekliyor' : 'yanitsiz' })
}

async function metaOlayi(v: any) {
  for (const giris of v.entry ?? []) {
    const ben = String(giris.id)
    for (const m of giris.messaging ?? []) {
      if (!m.message?.text || m.message.is_echo || String(m.sender?.id) === ben) continue
      await kaydet({ tur: 'dm', olay_id: m.message.mid, hedef_id: String(m.sender.id), mesaj: m.message.text })
    }
    for (const c of giris.changes ?? []) {
      const d = c.value ?? {}
      if (c.field !== 'comments' || !d.text || String(d.from?.id) === ben) continue
      await kaydet({ tur: 'yorum', olay_id: String(d.id), hedef_id: String(d.id), gonderen_ad: d.from?.username, mesaj: d.text })
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  const url = new URL(req.url)

  if (req.method === 'GET') {
    // Google OAuth dönüşü (panelden başlatılır; state ile doğrulanır)
    if (url.searchParams.has('state') && (url.searchParams.has('code') || url.searchParams.has('error'))) {
      let sonuc = 'youtube=bagli'
      try {
        if (url.searchParams.get('error')) throw new Error('İzin verilmedi')
        await ytDonus(url.searchParams.get('code')!, url.searchParams.get('state')!)
        await youtubeTara()
      } catch (e) {
        await ayarYaz('YT_SON_HATA', String(e).slice(0, 300))
        sonuc = 'youtube=hata'
      }
      return new Response(null, { status: 302, headers: { Location: SITE_SOSYAL.replace('#', `?${sonuc}#`) } })
    }
    // Kurulum yardımcısı (doğrulama anahtarıyla korunur): hangi anahtarlar yerinde, değerleri göstermeden
    if (url.searchParams.get('kur') === 'durum' && url.searchParams.get('anahtar') === (await ayar('IG_VERIFY_TOKEN'))) {
      const adlar = ['IG_APP_SECRET', 'IG_TOKEN', 'CF_ACCOUNT_ID', 'CF_AI_TOKEN']
      return json(Object.fromEntries(await Promise.all(adlar.map(async (a) => [a, Boolean(await ayar(a))]))))
    }
    // Meta webhook doğrulaması
    if (url.searchParams.get('hub.mode') === 'subscribe' &&
        url.searchParams.get('hub.verify_token') === (await ayar('IG_VERIFY_TOKEN'))) {
      return new Response(url.searchParams.get('hub.challenge') ?? '', { status: 200 })
    }
    return new Response('ok', { status: 200 })
  }

  const govde = await req.text()

  // Meta: imzalı gelir
  const imza = req.headers.get('x-hub-signature-256')
  if (imza) {
    if (!(await imzaDogru(govde, imza))) return json({ hata: 'imza' }, 401)
    await metaOlayi(JSON.parse(govde))
    return json({ ok: true })
  }

  // Zamanlanmış görev (cron): gizli başlıkla
  const cron = req.headers.get('x-cron-anahtar')
  if (cron) {
    if (cron !== (await ayar('CRON_ANAHTAR'))) return json({ hata: 'yetkisiz' }, 401)
    return json(await youtubeTara())
  }

  // Yönetim paneli
  const kim = await yonetici(req)
  if (!kim) return json({ hata: 'yetkisiz' }, 403)
  let v: any = {}
  try { v = JSON.parse(govde) } catch { /* boş */ }
  if (v.islem === 'gonder' && Number.isInteger(v.id)) {
    const s = await gonder(v.id, typeof v.metin === 'string' ? v.metin : undefined, kim)
    return json(s, s.ok ? 200 : 422)
  }
  if (v.islem === 'durum') return json(await baglantiDurumu())
  if (v.islem === 'youtube_baglan') {
    try { return json({ url: await ytBaglantiAdresi() }) } catch (e) { return json({ hata: String(e).replace(/^Error: /, '') }) }
  }
  if (v.islem === 'youtube_tara') return json(await youtubeTara())
  return json({ hata: 'bilinmeyen işlem' }, 400)
})
