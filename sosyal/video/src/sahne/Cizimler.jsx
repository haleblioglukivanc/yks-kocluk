// Metafor çizimleri — kendi çizimimiz (telif yok), tek dil:
// kalın mürekkep çizgi + arkasında biraz kaymış renk dolgusu (baskı kayması).
// Her parça: d = yol, kay = kaymış dolgu rengi, ic = yerinde dolgu rengi,
// cizgi: false = yalnız dolgu. Renkler P anahtarı ya da 'dolgu' (zeminin dolgu rengi).
import { P, ara } from './ortak.js'

export const CIZIM = {
  pil: { vb: '0 0 300 190', parca: [
    { d: 'M20 30 h180 a20 20 0 0 1 20 20 v90 a20 20 0 0 1 -20 20 h-180 a20 20 0 0 1 -20 -20 v-90 a20 20 0 0 1 20 -20 z', kay: 'dolgu' },
    { d: 'M220 72 h18 v46 h-18' },
    { d: 'M40 50 h26 a8 8 0 0 1 8 8 v74 a8 8 0 0 1 -8 8 h-26 a8 8 0 0 1 -8 -8 v-74 a8 8 0 0 1 8 -8 z', ic: 'seftali' },
    { d: 'M138 52 l-24 44 h30 l-24 44' },
    { d: 'M262 20 l10 -10 M270 38 h14 M258 6 v-4', w: 4 },
  ] },
  dugum: { vb: '0 0 320 150', parca: [
    { d: 'M110 75 m-62 0 a62 62 0 1 0 124 0 a62 62 0 1 0 -124 0', ic: 'seftali', cizgi: false },
    { d: 'M6 90 c30 0 40 -60 74 -60 c34 0 30 46 0 58 c-28 12 -46 -28 -18 -40 c28 -12 46 28 22 46 c-18 14 -40 -6 -24 -30 c22 -30 60 6 250 6' },
    { d: 'M290 54 l24 16 l-24 16' },
  ] },
  'buyutec-kitap': { vb: '0 0 320 240', parca: [
    { d: 'M24 62 q64 -26 132 10 v150 q-66 -32 -132 -8 z', kay: 'dolgu' },
    { d: 'M156 72 q66 -36 132 -10 v152 q-66 -24 -132 8 z', kay: 'dolgu' },
    { d: 'M50 100 q40 -10 80 6 M50 132 q40 -10 80 6 M50 164 q30 -8 60 2', w: 4 },
    { d: 'M182 100 q40 -16 80 -6', w: 4 },
    { d: 'M232 150 m-46 0 a46 46 0 1 0 92 0 a46 46 0 1 0 -92 0', ic: 'krem' },
    { d: 'M266 184 l40 40' },
    { d: 'M220 136 q0 -16 14 -16 q14 0 14 14 q0 10 -12 14 v10 M236 176 v1', w: 5 },
  ] },
  'kavanoz-yildiz': { vb: '0 0 260 300', parca: [
    { d: 'M70 70 h120 v22 h-120 z', ic: 'amber' },
    { d: 'M78 92 q-34 20 -34 70 v88 a26 26 0 0 0 26 26 h120 a26 26 0 0 0 26 -26 v-88 q0 -50 -34 -70', kay: 'dolgu' },
    { d: 'M130 170 l14 28 l30 4 l-22 21 l6 30 l-28 -15 l-28 15 l6 -30 l-22 -21 l30 -4 z', ic: 'amber' },
    { d: 'M214 30 v26 M201 43 h26 M36 40 v18 M27 49 h18', w: 4 },
  ] },
  'ev-kalp': { vb: '0 0 260 240', parca: [
    { d: 'M30 110 l100 -86 l100 86 v108 h-200 z', kay: 'dolgu' },
    { d: 'M130 180 c-40 -26 -52 -46 -40 -64 c10 -14 30 -12 40 4 c10 -16 30 -18 40 -4 c12 18 0 38 -40 64 z', ic: 'seftali' },
    { d: 'M186 64 v-34 h24 v54', w: 5 },
  ] },
  damla: { vb: '0 0 300 250', parca: [
    { d: 'M150 20 c-20 34 -32 50 -32 66 a32 32 0 0 0 64 0 c0 -16 -12 -32 -32 -66 z', ic: 'gok' },
    { d: 'M40 196 a110 34 0 1 0 220 0 a110 34 0 1 0 -220 0', kay: 'gok' },
    { d: 'M80 196 q16 -10 32 0 t32 0 M170 206 q16 -10 32 0 t32 0', w: 4 },
  ] },
}

const renk = (k, zemin) => (k === 'dolgu' ? zemin.dolgu : P[k] || k)

// bas > 0: o karede kalemle çizilir. bas = 0: ilk karede tam çizili durur (kapak kuralı).
export function Cizim({ ad, f, gen, zemin, bas = 0, kalem = 6, suz = true, style }) {
  const c = CIZIM[ad]
  if (!c) return null
  const [, , w, h] = c.vb.split(' ').map(Number)
  const n = c.parca.length
  const toplam = bas <= 0 ? 1 : ara(f, bas, bas + 36)
  const oynat = suz ? `translateY(${Math.sin(f / 26) * 8}px) rotate(${Math.sin(f / 44) * 1.2}deg)` : ''
  const mur = zemin.koyu ? P.krem : P.murekkep
  return <svg viewBox={c.vb} width={gen} height={(gen * h) / w} fill="none" strokeLinecap="round" strokeLinejoin="round"
    style={{ overflow: 'visible', transform: oynat, ...style }}>
    {c.parca.map((p, i) => {
      const q = Math.max(0, Math.min(1, toplam * n * 0.75 - i * 0.55))
      return <g key={i}>
        {p.kay && <path d={p.d} fill={renk(p.kay, zemin)} transform="translate(10 10)" opacity={q} />}
        {p.ic && <path d={p.d} fill={renk(p.ic, zemin)} opacity={q} />}
        {p.cizgi !== false && <path d={p.d} stroke={mur} strokeWidth={p.w ?? kalem} pathLength={1}
          strokeDasharray={1} strokeDashoffset={1 - q} />}
      </g>
    })}
  </svg>
}

// Arka plan süsleri: her gün farklı. Güne özel tohumla seçilir — kaç tane (bazı günler hiç),
// hangi iki şekil ailesi, nerede, hangi renkte. Yalnız içeriğin olmadığı boşluklara düşer,
// birbirine yaklaşmaz. Böylece hiçbir iki video aynı "süs kalıbından" çıkmış gibi durmaz.
const SEKIL = {
  arti: (x, y, b) => `M${x - b} ${y} h${2 * b} M${x} ${y - b} v${2 * b}`,
  carpi: (x, y, b) => `M${x - b * 0.7} ${y - b * 0.7} l${b * 1.4} ${b * 1.4} M${x + b * 0.7} ${y - b * 0.7} l${-b * 1.4} ${b * 1.4}`,
  kivilcim: (x, y, b) => `M${x} ${y - b} v${b * 0.6} M${x + b} ${y - b * 0.2} h${-b * 0.6} M${x - b * 0.8} ${y - b * 0.6} l${b * 0.45} ${b * 0.4}`,
  dalga: (x, y, b) => `M${x - b * 1.6} ${y} q${b * 0.4} ${-b * 0.7} ${b * 0.8} 0 t${b * 0.8} 0 t${b * 0.8} 0 t${b * 0.8} 0`,
  yay: (x, y, b) => `M${x - b} ${y + b * 0.4} q${b} ${-b * 1.4} ${b * 2} 0`,
  yildiz: (x, y, b) => `M${x} ${y - b} q${b * 0.15} ${b * 0.85} ${b} ${b} q${-b * 0.85} ${b * 0.15} ${-b} ${b} q${-b * 0.15} ${-b * 0.85} ${-b} ${-b} q${b * 0.85} ${-b * 0.15} ${b} ${-b} z`,
}
const AILE = Object.keys(SEKIL)

function tohumla(metin) {                    // metinden sabit sayı → aynı gün hep aynı süs
  let h = 2166136261
  for (const c of metin) h = Math.imul(h ^ c.codePointAt(0), 16777619)
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296 }
}

export function Susler({ f, tarih, dolu = [], renk: r, vurgu }) {
  const rnd = tohumla(tarih)
  if (rnd() < 0.18) return null                              // her beş günden biri süssüz
  const adet = 2 + Math.floor(rnd() * 4)                     // 2–5
  const aileler = [AILE[Math.floor(rnd() * AILE.length)], AILE[Math.floor(rnd() * AILE.length)]]
  const bos = (x, y) => !dolu.some(([x1, y1, x2, y2]) => x > x1 - 40 && x < x2 + 40 && y > y1 - 40 && y < y2 + 40)
  const nok = []
  for (let den = 0; den < 300 && nok.length < adet; den++) {
    const x = 50 + rnd() * 980, y = 150 + rnd() * 1330   // alt yazı alanına düşmesin, görünür kalsın
    if (bos(x, y) && nok.every((n) => Math.hypot(n.x - x, n.y - y) > 240)) {
      nok.push({ x, y, t: aileler[nok.length % 2], b: 11 + rnd() * 12, a: rnd() * 40 - 20, v: rnd() < 0.3, h: 0.6 + rnd() * 0.8 })
    }
  }
  return <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: 'absolute', inset: 0 }}>
    {nok.map((n, i) => {
      const x = n.x + Math.sin(f / (36 * n.h) + i) * 10, y = n.y + Math.cos(f / (48 * n.h) + i * 2) * 14
      const dolgulu = n.t === 'yildiz'
      return <path key={i} d={SEKIL[n.t](x, y, n.b)} transform={`rotate(${n.a + Math.sin(f / 60 + i) * 6} ${x} ${y})`}
        stroke={n.v ? vurgu : r} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round"
        fill={dolgulu ? (n.v ? vurgu : 'none') : 'none'} opacity={n.v ? 0.9 : 0.5} />
    })}
  </svg>
}
