// Sosyal medya yanıt hattı.
//  • Meta (Instagram) webhook'u: yorum ve DM gelir → kategori → taslak → tabloya → Telegram'da onaya
//  • Telegram webhook'u: Kıvanç "Gönder / Atla" der ya da mesaja yanıt yazarak düzeltir → Instagram'a gider
// Kriz/istismar: sabit güvenli yanıt önerilir ve 🔔 ile hemen bildirilir; hiçbir şey onaysız gitmez.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { BILDIRIM, SABIT, SABLON, SISTEM, YANITSIZ, kategori } from './kurallar.ts'

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
  return ayarlar[k]
}

const json = (v: unknown, s = 200) => new Response(JSON.stringify(v), { status: s, headers: { 'Content-Type': 'application/json' } })

// ── Meta imza doğrulaması ─────────────────────────────────────────
async function imzaDogru(govde: string, imza: string | null) {
  const gizli = await ayar('IG_APP_SECRET')
  if (!gizli || !imza?.startsWith('sha256=')) return false
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(gizli), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const s = new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(govde)))
  const hex = [...s].map((b) => b.toString(16).padStart(2, '0')).join('')
  return hex === imza.slice(7)
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

// ── Telegram ──────────────────────────────────────────────────────
async function tg(yontem: string, veri: unknown) {
  const t = await ayar('TG_BOT_TOKEN')
  if (!t) return null
  const r = await fetch(`https://api.telegram.org/bot${t}/${yontem}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(veri) })
  return r.json()
}
const ETIKET: Record<string, string> = { kriz: '🔔 KRİZ', istismar: '🔔 İSTİSMAR', bilgi: 'bilgi', psikoloji: 'psikoloji',
  net: 'net', ders: 'ders', tesekkur: 'teşekkür', hakaret: 'spam/hakaret', diger: 'diğer' }

async function onayaGonder(k: { id: number; tur: string; gonderen_ad: string | null; mesaj: string; kategori: string; taslak: string | null }) {
  const sohbet = await ayar('TG_CHAT_ID')
  if (!sohbet) return
  const acil = BILDIRIM.has(k.kategori)
  const metin = `${acil ? '🔔🔔 HEMEN BAK\n' : ''}Instagram ${k.tur === 'dm' ? 'DM' : 'yorum'} · ${ETIKET[k.kategori]}` +
    `${k.gonderen_ad ? ' · @' + k.gonderen_ad : ''}\n\n“${k.mesaj}”\n\n` +
    (k.taslak ? `Taslak:\n${k.taslak}\n\nDüzeltmek için bu mesaja yanıt olarak kendi metnini yaz.` : 'Yanıt önerilmiyor (gizlemeyi düşün).')
  const tuslar = k.taslak ? [[{ text: '✅ Gönder', callback_data: `g:${k.id}` }, { text: '⏭ Atla', callback_data: `a:${k.id}` }]]
    : [[{ text: 'Tamam', callback_data: `a:${k.id}` }]]
  const r = await tg('sendMessage', { chat_id: sohbet, text: metin, reply_markup: { inline_keyboard: tuslar } })
  if (r?.result?.message_id) await db.from('sosyal_yanit').update({ tg_mesaj_id: r.result.message_id }).eq('id', k.id)
}

// ── Instagram'a gönder ────────────────────────────────────────────
async function instagramaGonder(tur: string, hedef: string, metin: string) {
  const token = await ayar('IG_TOKEN')
  if (!token) throw new Error('IG_TOKEN yok')
  const r = tur === 'dm'
    ? await fetch(`${IG}/me/messages`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient: { id: hedef }, message: { text: metin } }) })
    : await fetch(`${IG}/${hedef}/replies`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: metin }) })
  if (!r.ok) throw new Error(`Instagram ${r.status}: ${(await r.text()).slice(0, 300)}`)
}

async function gonderVeIsaretle(id: number, metin?: string) {
  const { data: k } = await db.from('sosyal_yanit').select('*').eq('id', id).single()
  if (!k || k.durum !== 'bekliyor') return 'Bu kayıt zaten işlenmiş.'
  const yazi = metin ?? k.taslak
  try {
    await instagramaGonder(k.tur, k.hedef_id, yazi)
    await db.from('sosyal_yanit').update({ durum: 'gonderildi', gonderilen: yazi }).eq('id', id)
    return '✅ Gönderildi'
  } catch (e) {
    await db.from('sosyal_yanit').update({ durum: 'hata', hata: String(e) }).eq('id', id)
    return '⚠️ Gönderilemedi: ' + String(e).slice(0, 120)
  }
}

// ── Gelen olaylar ─────────────────────────────────────────────────
async function kaydet(o: { tur: string; olay_id: string; hedef_id: string; gonderen_ad?: string; mesaj: string }) {
  const { kat, taslak: t } = await taslak(o.mesaj)
  const { data, error } = await db.from('sosyal_yanit').insert({ platform: 'instagram', ...o, kategori: kat, taslak: t,
    durum: t ? 'bekliyor' : 'yanitsiz' }).select().single()
  if (error) return  // aynı olay ikinci kez geldiyse (unique) sessizce geç
  await onayaGonder(data)
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

async function telegramOlayi(v: any) {
  const sohbet = await ayar('TG_CHAT_ID')
  if (v.callback_query) {
    const q = v.callback_query
    if (String(q.message?.chat?.id) !== String(sohbet)) return
    const [islem, id] = String(q.data).split(':')
    let sonuc = '⏭ Atlandı'
    if (islem === 'g') sonuc = await gonderVeIsaretle(Number(id))
    else await db.from('sosyal_yanit').update({ durum: 'atlandi' }).eq('id', Number(id)).eq('durum', 'bekliyor')
    await tg('answerCallbackQuery', { callback_query_id: q.id, text: sonuc })
    await tg('editMessageReplyMarkup', { chat_id: q.message.chat.id, message_id: q.message.message_id, reply_markup: { inline_keyboard: [] } })
    await tg('sendMessage', { chat_id: q.message.chat.id, text: sonuc, reply_to_message_id: q.message.message_id })
    return
  }
  const m = v.message
  if (!m) return
  if (m.text === '/start' || m.text === '/kimlik') {   // ilk kurulumda sohbet kimliğini öğrenmek için
    await tg('sendMessage', { chat_id: m.chat.id, text: `Bu sohbetin kimliği: ${m.chat.id}` })
    return
  }
  if (String(m.chat?.id) !== String(sohbet) || !m.reply_to_message || !m.text) return
  const { data: k } = await db.from('sosyal_yanit').select('id').eq('tg_mesaj_id', m.reply_to_message.message_id).single()
  if (!k) return
  const sonuc = await gonderVeIsaretle(k.id, m.text)
  await tg('sendMessage', { chat_id: m.chat.id, text: sonuc + ' (düzeltilmiş metin)', reply_to_message_id: m.message_id })
}

Deno.serve(async (req) => {
  const url = new URL(req.url)
  // Meta webhook doğrulaması
  if (req.method === 'GET') {
    if (url.searchParams.get('hub.mode') === 'subscribe' &&
        url.searchParams.get('hub.verify_token') === (await ayar('IG_VERIFY_TOKEN'))) {
      return new Response(url.searchParams.get('hub.challenge') ?? '', { status: 200 })
    }
    return new Response('ok', { status: 200 })
  }
  const govde = await req.text()
  // Telegram: gizli başlıkla gelir
  const tgGizli = req.headers.get('x-telegram-bot-api-secret-token')
  if (tgGizli) {
    if (tgGizli !== (await ayar('TG_SECRET'))) return json({ hata: 'yetkisiz' }, 401)
    await telegramOlayi(JSON.parse(govde))
    return json({ ok: true })
  }
  // Meta: imzalı gelir
  if (!(await imzaDogru(govde, req.headers.get('x-hub-signature-256')))) return json({ hata: 'imza' }, 401)
  await metaOlayi(JSON.parse(govde))
  return json({ ok: true })
})
