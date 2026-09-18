import { useLayoutEffect, useRef, useState } from 'react'
import {
  AbsoluteFill, Img, continueRender, delayRender, interpolate, spring,
  staticFile, useCurrentFrame, useVideoConfig,
} from 'remotion'
import { loadFont as baslikFontu } from '@remotion/google-fonts/BricolageGrotesque'
import { loadFont as govdeFontu } from '@remotion/google-fonts/Karla'
import { loadFont as monoFontu } from '@remotion/google-fonts/JetBrainsMono'
// Senaryo sitedekiyle aynı kaynaktan gelir: metin değişirse video da değişir.
import { gunler, mesajlar, ogrenci } from '../../../src/icerik/hafta.js'
import { R } from './renk.js'

const ALT = { subsets: ['latin', 'latin-ext'] }
const FONTLAR = [
  baslikFontu('normal', { weights: ['700', '800'], ...ALT }),
  govdeFontu('normal', { weights: ['400', '600'], ...ALT }),
  monoFontu('normal', { weights: ['400', '500'], ...ALT }),
]
const [BASLIK, GOVDE, MONO] = FONTLAR.map((x) => x.fontFamily)

export const SURE = 600 // 20 sn

// ── Zaman çizelgesi (kare) ───────────────────────────────────────
const MESAJ_KARE = [36, 88, 150, 205, 300, 336] // her mesajın geldiği kare
const YAZIYOR = { 1: 66, 3: 185, 5: 318 }        // koç mesajından önce "yazıyor"
const SILINDI = 370   // paragraf haftadan silinir
const TASINDI = 410   // gazlar + manyetizma perşembeye kayar
const BITTI = 455     // perşembe: ikisi de biter
const KAPANIS = 500   // kapanış kartı

const YAZILAR = [
  [0, 'Çarşamba 21:40.\nÜç iş kaldı.'],
  [SILINDI, 'Paragraf silindi.\nCuma zaten var.'],
  [TASINDI, 'Gazlar 20 soruya indi.\nİkisi perşembeye.'],
  [BITTI, 'Perşembe: iki iş,\nikisi de bitti.'],
]

const yay = (f, bas, cfg = { damping: 18, stiffness: 120 }) =>
  spring({ frame: f - bas, fps: 30, config: cfg })

// ── Hafta sahnesi ───────────────────────────────────────────────
const SABIT = [
  { g: 0, tipler: ['bitti', 'bitti', 'bitti'] },
  { g: 1, tipler: ['bitti', 'kaldi', 'bitti'] },
  { g: 4, tipler: ['bitti', 'bitti', 'bitti'] },
  { g: 5, tipler: ['bitti', 'bitti'] },
  { g: 6, tipler: ['bitti'] },
]
const KUTU = 46, SATIR = 60

function Kutu({ x, y, tip, olcek = 1, saydam = 1, nabiz = 0 }) {
  const kaldi = tip === 'kaldi'
  return (
    <div style={{
      position: 'absolute', left: x, top: y, width: KUTU, height: KUTU,
      marginLeft: -KUTU / 2, borderRadius: 10, boxSizing: 'border-box',
      transform: `scale(${olcek})`, opacity: saydam,
      background: kaldi ? `rgb(226 90 90 / ${0.22 + 0.28 * nabiz})` : R.turuncu,
      border: kaldi ? `4px solid ${R.mercan}` : 'none',
      boxShadow: nabiz ? `0 0 0 ${8 * nabiz}px rgb(226 90 90 / .16)` : 'none',
    }} />
  )
}

function Hafta({ f }) {
  const genislik = 936, sutun = genislik / 7
  const x = (g) => (g + 0.5) * sutun
  const uyari = f < TASINDI
  const nabiz = f > MESAJ_KARE[0] && f < TASINDI ? (Math.sin((f / 30) * Math.PI * 1.8) + 1) / 2 : 0
  const kayma = yay(f, TASINDI, { damping: 16, stiffness: 90 })
  const bitis = interpolate(f, [BITTI, BITTI + 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const silinme = yay(f, SILINDI, { damping: 20, stiffness: 160 })
  const giris = (i) => yay(f, 6 + i * 2)
  const isler = [
    { s: 0, g: 2 + kayma },
    { s: 1, g: 2 + kayma },
  ]
  return (
    <div style={{
      position: 'relative', background: R.lacivert2, border: `2px solid ${R.kenar}`,
      borderRadius: 36, padding: '30px 36px 34px',
    }}>
      <div style={{ fontFamily: MONO, fontSize: 24, letterSpacing: '.08em', color: R.acikMavi, textTransform: 'uppercase' }}>
        {ogrenci.ad} · {ogrenci.hafta}
      </div>
      <div style={{ position: 'relative', width: genislik, height: 250, marginTop: 26 }}>
        <div style={{
          position: 'absolute', left: 2 * sutun, width: sutun, top: -12, bottom: -8, borderRadius: 18,
          background: `rgb(226 90 90 / ${uyari ? 0.14 : 0.14 * (1 - kayma)})`,
        }} />
        {gunler.map((g, i) => (
          <div key={g.kisa} style={{
            position: 'absolute', left: x(i), top: 0, transform: 'translateX(-50%)',
            fontFamily: MONO, fontSize: 26, letterSpacing: '.04em',
            color: i === 2 && uyari ? R.mercan : R.acikMavi, opacity: i === 2 && uyari ? 1 : 0.75,
          }}>{g.kisa}</div>
        ))}
        {SABIT.flatMap(({ g, tipler }) => tipler.map((t, s) => (
          <Kutu key={`${g}${s}`} x={x(g)} y={52 + s * SATIR} tip={t} olcek={giris(g + s)} />
        )))}
        {isler.map((is, n) => (
          <div key={n}>
            {/* kalan hâli söner, bitmiş hâli yanar: renk geçişi iki katmanla */}
            <Kutu x={x(is.g)} y={52 + is.s * SATIR} tip="kaldi" olcek={giris(2 + is.s)} nabiz={nabiz} saydam={1 - bitis} />
            <Kutu x={x(is.g)} y={52 + is.s * SATIR} tip="bitti" olcek={1 + 0.25 * Math.sin(bitis * Math.PI)} saydam={bitis} />
          </div>
        ))}
        <Kutu x={x(2)} y={52 + 2 * SATIR} tip="kaldi" nabiz={nabiz}
          olcek={giris(4) * (1 - 0.7 * silinme)} saydam={1 - silinme} />
      </div>
    </div>
  )
}

// ── Yazışma ─────────────────────────────────────────────────────
const PENCERE = 700 // mesaj alanının yüksekliği

function Sohbet({ f }) {
  const kaplar = useRef([])
  const sutun = useRef(null)
  // Fontlar yüklenirken kompozisyon henüz yerleşmemiş olabilir (genişlik 0).
  // Ölçüm gerçek genişlikle yapılana kadar kare çekimi bekletilir.
  const [tik, setTik] = useState(0)
  const [bekle] = useState(() => ({ id: delayRender('sohbet ölçümü'), bitti: false }))
  // Kaydırma her karede o anki yerleşimden ölçülür ve doğrudan DOM'a yazılır
  // (ekran görüntüsü efektten sonra alınır). Son görünen şeyin —mesaj ya da
  // "yazıyor"— altı pencerenin altına oturur; olaylar arası yayla geçer.
  useLayoutEffect(() => {
    if (!sutun.current.offsetWidth) { const z = setTimeout(() => setTik((x) => x + 1), 30); return () => clearTimeout(z) }
    const o = kaplar.current.map((el) => ({ ust: el.offsetTop, alt: el.offsetTop + el.offsetHeight }))
    const hedef = (t) => {
      const gorunen = MESAJ_KARE.filter((k) => t >= k).length - 1
      const yaziyor = YAZIYOR[gorunen + 1] !== undefined && t >= YAZIYOR[gorunen + 1]
      const alt = yaziyor ? o[gorunen + 1].ust + 96 : gorunen >= 0 ? o[gorunen].alt : 0
      return Math.max(0, alt - PENCERE + 8)
    }
    const olaylar = [...MESAJ_KARE, ...Object.values(YAZIYOR)].sort((x, y) => x - y).filter((k) => k <= f)
    const son = olaylar.at(-1) ?? 0
    const once = hedef(son - 1), simdi = hedef(f)
    const kaydir = once + (simdi - once) * yay(f, son, { damping: 22, stiffness: 140 })
    sutun.current.style.transform = `translateY(${-kaydir}px)`
    if (!bekle.bitti) { bekle.bitti = true; continueRender(bekle.id) }
  })
  const karart = interpolate(f, [SILINDI - 10, SILINDI + 20], [1, 0.45], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  return (
    <div style={{
      background: R.lacivert2, border: `2px solid ${R.kenar}`, borderRadius: 36,
      padding: '26px 32px 0', opacity: karart,
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', paddingBottom: 20,
        borderBottom: `2px solid ${R.kenar}`, fontFamily: MONO, fontSize: 24, color: R.soluk,
      }}>
        <span>{ogrenci.ad} ↔ Koç</span><span>Çar · 16 Eki</span>
      </div>
      <div style={{ height: PENCERE, overflow: 'hidden', position: 'relative' }}>
        <div ref={sutun} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 22, paddingTop: 24 }}>
          {mesajlar.map((m, i) => {
            const koc = m.kim === 'koc'
            const p = yay(f, MESAJ_KARE[i], { damping: 16, stiffness: 150 })
            const yaziyor = YAZIYOR[i] !== undefined && f >= YAZIYOR[i] && f < MESAJ_KARE[i]
            return (
              <div key={i} ref={(el) => { kaplar.current[i] = el }} style={{
                position: 'relative', alignSelf: koc ? 'flex-end' : 'flex-start', width: '84%',
                display: 'flex', flexDirection: 'column', alignItems: koc ? 'flex-end' : 'flex-start', gap: 8,
              }}>
                <div style={{
                  opacity: p, transform: `translateY(${(1 - p) * 24}px)`,
                  padding: '20px 26px', fontFamily: GOVDE, fontSize: 36, lineHeight: 1.38,
                  color: R.beyaz, background: koc ? R.mercan : R.balon,
                  borderRadius: koc ? '28px 28px 8px 28px' : '28px 28px 28px 8px',
                }}>{m.metin}</div>
                <span style={{ opacity: p, fontFamily: MONO, fontSize: 22, color: R.soluk, padding: '0 8px' }}>
                  {m.saat}{koc ? ' · koç' : ''}
                </span>
                {yaziyor && <Yaziyor f={f - YAZIYOR[i]} />}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Yaziyor({ f }) {
  const p = yay(f, 0, { damping: 14, stiffness: 180 })
  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, display: 'flex', gap: 10, padding: '28px 30px',
      background: R.mercan, borderRadius: '28px 28px 8px 28px', transform: `scale(${p})`, transformOrigin: 'right top',
    }}>
      {[0, 1, 2].map((n) => {
        const t = ((f - n * 5) % 33) / 33
        const zip = Math.max(0, Math.sin(t * Math.PI * 2))
        return <i key={n} style={{ width: 13, height: 13, borderRadius: 7, background: R.beyaz, opacity: 0.45 + 0.55 * zip, transform: `translateY(${-6 * zip}px)` }} />
      })}
    </div>
  )
}

// ── Başlık yazısı (değişen tek satır anlatım) ───────────────────
function Anlatim({ f }) {
  const [bas, metin] = YAZILAR.filter(([k]) => f >= k).at(-1)
  const p = yay(f, bas, { damping: 18, stiffness: 130 })
  return (
    <div style={{ height: 190, position: 'relative' }}>
      <div key={bas} style={{
        whiteSpace: 'pre-line', fontFamily: BASLIK, fontWeight: 800, fontSize: 76, lineHeight: 1.08,
        letterSpacing: '-0.025em', color: R.beyaz, opacity: p, transform: `translateY(${(1 - p) * 30}px)`,
      }}>{metin}</div>
    </div>
  )
}

// ── Kapanış ─────────────────────────────────────────────────────
function Kapanis({ f }) {
  const perde = interpolate(f, [KAPANIS, KAPANIS + 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  if (perde === 0) return null
  const s1 = yay(f, KAPANIS + 10), s2 = yay(f, KAPANIS + 34), s3 = yay(f, KAPANIS + 60)
  const satir = (p) => ({ opacity: p, transform: `translateY(${(1 - p) * 40}px)` })
  return (
    <AbsoluteFill style={{
      background: `color-mix(in srgb, ${R.lacivert} ${Math.round(perde * 100)}%, transparent)`,
      padding: '0 90px', justifyContent: 'center',
    }}>
      <div style={{ fontFamily: BASLIK, fontWeight: 800, fontSize: 118, lineHeight: 1.02, letterSpacing: '-0.035em', color: R.beyaz }}>
        <div style={satir(s1)}>Kötü gün olur.</div>
        <div style={{ ...satir(s2), color: R.turuncuA, marginTop: 14 }}>Kötü hafta olmasın.</div>
      </div>
      <div style={{ ...satir(s3), display: 'flex', alignItems: 'center', gap: 28, marginTop: 110 }}>
        <Img src={staticFile('logo-kh.svg')} style={{ height: 76 }} />
        <div>
          <div style={{ fontFamily: BASLIK, fontWeight: 800, fontSize: 44, letterSpacing: '-0.02em', color: R.beyaz }}>Kıvanç Hoca ile koçluk</div>
          <div style={{ fontFamily: MONO, fontSize: 28, color: R.acikMavi, marginTop: 6 }}>khkocluk.com</div>
        </div>
      </div>
    </AbsoluteFill>
  )
}

// ── Kompozisyon ─────────────────────────────────────────────────
export function Carsamba() {
  const f = useCurrentFrame()
  const { durationInFrames } = useVideoConfig()
  const giris = interpolate(f, [0, 12], [0, 1], { extrapolateRight: 'clamp' })
  return (
    <AbsoluteFill style={{
      background: `radial-gradient(900px 700px at 85% 8%, color-mix(in srgb, ${R.mavi} 38%, transparent), transparent 65%),
                   radial-gradient(700px 600px at 0% 100%, color-mix(in srgb, ${R.turuncu} 16%, transparent), transparent 60%), ${R.lacivert}`,
    }}>
      {/* Reels/TikTok arayüzü üstte ~200px, altta ~320px kapatır; içerik aradaki alanda. */}
      <div style={{ position: 'absolute', left: 72, right: 72, top: 170, opacity: giris }}>
        <div style={{ fontFamily: MONO, fontSize: 28, letterSpacing: '.14em', color: R.turuncuA, textTransform: 'uppercase', marginBottom: 22 }}>
          ● Aynı hafta · çarşamba
        </div>
        <Anlatim f={f} />
        <div style={{ height: 34 }} />
        <Hafta f={f} />
        <div style={{ height: 30 }} />
        <Sohbet f={f} />
      </div>
      <Kapanis f={f} />
      {/* döngüye yumuşak dönüş: son 6 kare kararır */}
      <AbsoluteFill style={{ background: R.lacivert, opacity: interpolate(f, [durationInFrames - 6, durationInFrames], [0, 0.6], { extrapolateLeft: 'clamp' }) }} />
    </AbsoluteFill>
  )
}
