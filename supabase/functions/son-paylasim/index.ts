// Tanıtım sayfasındaki "Son paylaşım" kartı için kanalın en yeni videosu.
// YouTube'un herkese açık akışını okur: anahtar, izin, uygulama onayı yok.
// Yalnız herkese açık veri döndüğü için JWT doğrulaması kapalı (anonim ziyaretçi çağırır).
// Sonuç bir saat bellekte ve tarayıcı/CDN önbelleğinde tutulur.
// Video yoksa ya da akışa ulaşılamazsa { video: null } döner; kart gizlenir.

const KANAL = 'UCE5lZ1CG0-CqeRpaqlxa5-Q' // youtube.com/@khkocluk
const AKIS = `https://www.youtube.com/feeds/videos.xml?channel_id=${KANAL}`
const SURE = 60 * 60 * 1000

const BASLIK = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json; charset=utf-8',
}

let onbellek: { zaman: number; govde: string } | null = null

const coz = (s: string) =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")

function ilkVideo(xml: string) {
  const g = xml.match(/<entry>([\s\S]*?)<\/entry>/)
  if (!g) return null
  const e = g[1]
  const al = (re: RegExp) => e.match(re)?.[1] ?? ''
  const id = al(/<yt:videoId>([^<]+)<\/yt:videoId>/)
  if (!id) return null
  const baglanti = al(/<link rel="alternate" href="([^"]+)"/)
  return {
    id,
    baslik: coz(al(/<title>([^<]*)<\/title>/)),
    tarih: al(/<published>([^<]+)<\/published>/),
    adres: baglanti || `https://www.youtube.com/watch?v=${id}`,
    kisa: baglanti.includes('/shorts/'),
    kapak: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: BASLIK })

  if (!onbellek || Date.now() - onbellek.zaman > SURE) {
    try {
      const yanit = await fetch(AKIS, { headers: { 'User-Agent': 'Mozilla/5.0' } })
      if (yanit.ok) {
        onbellek = { zaman: Date.now(), govde: JSON.stringify({ video: ilkVideo(await yanit.text()) }) }
      }
    } catch (_) { /* eski önbellek varsa o kullanılır */ }
  }

  return new Response(onbellek?.govde ?? '{"video":null}', {
    headers: { ...BASLIK, 'Cache-Control': 'public, max-age=900' },
  })
})
