// Seri ikonları: kendi çizimimiz (telif yok). Çizgiler kalemle çiziliyormuş gibi
// açılır, sonra hafifçe süzülür. 0. karede ikon tam çizili durur (kapak kuralı);
// çizim animasyonu 5. saniyede içerik gelirken bir kez daha oynar.
import { interpolate } from 'remotion'

const YOL = {
  plan: ['M7 4h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', 'M9 3h6v3H9z', 'M8.5 11l1.5 1.5 3-3', 'M8.5 16.5l1.5 1.5 3-3', 'M15 11h1.5', 'M15 16.5h1.5'],
  taktik: ['M9 18h6', 'M10 21h4', 'M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z', 'M12 7v3', 'M10.5 10h3'],
  aynihafta: ['M4 5h11a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H9l-4 3v-3H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z', 'M19 9h1a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-1v3l-4-3h-4', 'M6 9.5h7'],
  veli: ['M3 11l9-7 9 7', 'M5 10v10h14V10', 'M12 17.5l-2.6-2.5a1.7 1.7 0 0 1 2.6-2.2 1.7 1.7 0 0 1 2.6 2.2z'],
  efsane: ['M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13z', 'M15.5 15.5L21 21', 'M8 8.5l5 5', 'M13 8.5l-5 5'],
  deneme: ['M12 7a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'M10 3h4', 'M12 3v4', 'M12 14l3-2.5', 'M18.5 6.5l1.5-1.5'],
  pazar: ['M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z', 'M17 3v3', 'M15.5 4.5h3', 'M20.5 8v2', 'M19.5 9h2'],
  gundem: ['M4 10v4a1 1 0 0 0 1 1h2l5 4V5L7 9H5a1 1 0 0 0-1 1z', 'M16 9a4 4 0 0 1 0 6', 'M19 6a8 8 0 0 1 0 12'],
  ozel: ['M5 6h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z', 'M4 10h16', 'M8 4v4', 'M16 4v4', 'M12 12.5l1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6-1.9-1.8 2.6-.4z'],
}
export const IKON_ADI = { 'Haftanın Planı': 'plan', 'Ders Taktiği': 'taktik', 'Aynı Hafta': 'aynihafta', 'Veli Köşesi': 'veli',
  'Doğru Bilinen Yanlışlar': 'efsane', 'Deneme Günü': 'deneme', 'Sınav Psikolojisi': 'pazar', 'Özel Gün': 'ozel', 'Gündem': 'gundem' }

export function Ikon({ ad, f, boyut = 150, renk, vurgu }) {
  const yollar = YOL[ad] || YOL.ozel
  // 0. karede tam çizili; 150–190 arası yeniden çizilir; hep hafif süzülür
  const ciz = f < 150 ? 1 : interpolate(f, [150, 190], [0.15, 1], { extrapolateRight: 'clamp' })
  const suz = Math.sin(f / 22) * 6
  const don = Math.sin(f / 40) * 3
  return <svg viewBox="0 0 24 24" width={boyut} height={boyut} fill="none" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: `translateY(${suz}px) rotate(${don}deg)`, overflow: 'visible' }}>
    {yollar.map((d, i) => <path key={i} d={d} pathLength={1} stroke={i === yollar.length - 1 ? vurgu : renk}
      strokeWidth={1.6} strokeDasharray={1} strokeDashoffset={1 - Math.min(1, Math.max(0, ciz * yollar.length - i * 0.6))} />)}
  </svg>
}

// Arka planda yavaş süzülen küçük şekiller (daire, artı, halka). Hep aynı yerden
// başlar, böylece 0. kare de dolu görünür.
const SEKIL = [
  { x: 0.82, y: 0.12, t: 'halka', b: 70, h: 0.9 }, { x: 0.12, y: 0.30, t: 'arti', b: 34, h: 1.3 },
  { x: 0.88, y: 0.46, t: 'nokta', b: 18, h: 1.1 }, { x: 0.06, y: 0.72, t: 'halka', b: 44, h: 0.7 },
  { x: 0.74, y: 0.80, t: 'arti', b: 28, h: 1.2 }, { x: 0.40, y: 0.06, t: 'nokta', b: 14, h: 1.5 },
  { x: 0.55, y: 0.93, t: 'nokta', b: 22, h: 0.8 },
]
export function Susler({ f, renk, renk2 }) {
  return <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: 'absolute', inset: 0 }}>
    {SEKIL.map((s, i) => {
      const x = s.x * 1080 + Math.sin(f / (50 * s.h) + i) * 18, y = s.y * 1920 + Math.cos(f / (60 * s.h) + i) * 26
      const c = i % 2 ? renk : renk2, o = 0.22
      if (s.t === 'halka') return <circle key={i} cx={x} cy={y} r={s.b} stroke={c} strokeWidth={6} fill="none" opacity={o} />
      if (s.t === 'nokta') return <circle key={i} cx={x} cy={y} r={s.b / 2} fill={c} opacity={o + 0.1} />
      const r = (f * s.h * 0.6 + i * 40) % 360
      return <g key={i} transform={`translate(${x} ${y}) rotate(${r})`} opacity={o}>
        <path d={`M${-s.b} 0H${s.b}M0 ${-s.b}V${s.b}`} stroke={c} strokeWidth={7} strokeLinecap="round" /></g>
    })}
  </svg>
}

export function Logo({ boyut = 76, renk, vurgu }) {
  return <svg viewBox="0 -8 145 116" height={boyut} width={boyut * 145 / 116} fill="none" strokeWidth={16} strokeLinecap="round">
    {['M8 0V100', 'M10.4 50L72 0', 'M10.4 50L72 100', 'M72 50H137', 'M137 0V100'].map((d) => <path key={d} d={d} stroke={renk} />)}
    <path d="M72 0V100" stroke={vurgu} />
  </svg>
}
