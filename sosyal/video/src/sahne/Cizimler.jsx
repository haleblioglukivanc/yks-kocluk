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

// Arka planda süzülen küçük artı ve noktalar (mokaptaki gibi, yazıyla yarışmaz)
const SUS = [[0.84, 0.13, 'arti'], [0.1, 0.36, 'nokta'], [0.9, 0.58, 'nokta'], [0.14, 0.72, 'arti'], [0.78, 0.8, 'arti']]
export function Susler({ f, renk: r }) {
  return <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: 'absolute', inset: 0 }}>
    {SUS.map(([x, y, t], i) => {
      const X = x * 1080 + Math.sin(f / 40 + i) * 12, Y = y * 1920 + Math.cos(f / 50 + i * 2) * 16
      return t === 'arti'
        ? <path key={i} d={`M${X - 14} ${Y} h28 M${X} ${Y - 14} v28`} stroke={r} strokeWidth={5} strokeLinecap="round" opacity={0.55} />
        : <circle key={i} cx={X} cy={Y} r={7} fill={r} opacity={0.4} />
    })}
  </svg>
}
