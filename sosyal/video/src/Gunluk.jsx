// Günlük video: takvimdeki bir günün satırından 20 sn dikey video.
// Kural: 0. kare eksiksiz bir kapaktır (başlık + seri + görsel hazır durur).
import { AbsoluteFill, Audio, Img, interpolate, spring, staticFile, useCurrentFrame } from 'remotion'
import { loadFont as baslikFontu } from '@remotion/google-fonts/BricolageGrotesque'
import { loadFont as govdeFontu } from '@remotion/google-fonts/Karla'
import { loadFont as monoFontu } from '@remotion/google-fonts/JetBrainsMono'
import { R } from './renk.js'

const ALT = { subsets: ['latin', 'latin-ext'] }
const BASLIK = baslikFontu('normal', { weights: ['800'], ...ALT }).fontFamily
const GOVDE = govdeFontu('normal', { weights: ['400', '600'], ...ALT }).fontFamily
const MONO = monoFontu('normal', { weights: ['400', '500'], ...ALT }).fontFamily

export const GUNLUK_SURE = 600
const SATIR = [180, 270, 360]   // gövde satırlarının geldiği kareler (6, 9, 12 sn)
const KAPANIS = 450             // 15 sn

export const ORNEK = {
  gun: { tarih: '2026-09-21', seri: 'Haftanın Planı', ders: '', baslik: 'Haftayı üç işle başlat',
    kanca: 'Bu hafta her şeyi yapmayacaksın. Üç şeyi yapacaksın.', sablon: 'kart-liste',
    kitle: 'öğrenci', hassas: false, yks_kalan: 271, cta: 'Takip et, her gün bir tane.', muzik: true },
  govde: ['Pazartesi 20 iş yazınca cuma 5\'i biter.', 'Bu hafta sadece 3 iş seç. Hepsine gün ve saat ver.', 'Üçü de biterse, dördüncüyü o zaman ekle.'],
  muzik: 'muzik/plan.mp3',
}

const yay = (f, bas, cfg = { damping: 18, stiffness: 130 }) => (bas <= 0 ? 1 : spring({ frame: f - bas, fps: 30, config: cfg }))
const gel = (p, d = 30) => ({ opacity: p, transform: `translateY(${(1 - p) * d}px)` })

// Kanca uzunluğuna göre punto: kısa cümle büyük, uzun cümle sığsın
const punto = (t, taban = 96) => (t.length < 34 ? taban : t.length < 60 ? taban * 0.86 : taban * 0.74)

function Etiket({ gun }) {
  const ek = gun.ders ? ` · ${gun.ders}` : gun.kitle === 'veli' ? ' · veliler için' : ''
  return <div style={{ fontFamily: MONO, fontSize: 28, letterSpacing: '.14em', textTransform: 'uppercase', color: R.turuncuA }}>
    ● {gun.seri}{ek}</div>
}

function Kanca({ metin, boyut, renk = R.beyaz, stil }) {
  return <div style={{ fontFamily: BASLIK, fontWeight: 800, fontSize: boyut ?? punto(metin), lineHeight: 1.06,
    letterSpacing: '-0.03em', color: renk, marginTop: 26, textWrap: 'balance', ...stil }}>{metin}</div>
}

// ── Gövde düzenleri ──────────────────────────────────────────────
function Liste({ f, govde, numara = true }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
    {govde.map((s, i) => {
      const p = yay(f, SATIR[i])
      return <div key={i} style={{ ...gel(p, 40), display: 'flex', gap: 26, alignItems: 'center', background: R.lacivert2,
        border: `2px solid ${R.kenar}`, borderRadius: 30, padding: '28px 32px' }}>
        {numara && <div style={{ flex: '0 0 72px', height: 72, borderRadius: 36, background: R.turuncu, color: R.beyaz,
          fontFamily: BASLIK, fontWeight: 800, fontSize: 40, display: 'grid', placeItems: 'center' }}>{i + 1}</div>}
        <div style={{ fontFamily: GOVDE, fontWeight: 600, fontSize: 40, lineHeight: 1.3, color: R.beyaz }}>{s}</div>
      </div>
    })}
  </div>
}

function Adimlar({ f, govde }) {
  return <div style={{ position: 'relative', paddingLeft: 58 }}>
    <div style={{ position: 'absolute', left: 17, top: 20, bottom: 20, width: 4, background: R.kenar, borderRadius: 2, opacity: yay(f, SATIR[0]) }} />
    {govde.map((s, i) => {
      const p = yay(f, SATIR[i])
      return <div key={i} style={{ ...gel(p), position: 'relative', marginBottom: 34 }}>
        <div style={{ position: 'absolute', left: -52, top: 8, width: 26, height: 26, borderRadius: 13,
          background: p > 0.5 ? R.turuncu : R.lacivert2, border: `4px solid ${R.turuncu}` }} />
        <div style={{ fontFamily: MONO, fontSize: 26, color: R.acikMavi, letterSpacing: '.1em' }}>ADIM {i + 1}</div>
        <div style={{ fontFamily: GOVDE, fontWeight: 600, fontSize: 42, lineHeight: 1.28, color: R.beyaz, marginTop: 6 }}>{s}</div>
      </div>
    })}
  </div>
}

function Sohbet({ f, govde }) {
  const kim = ['koc', 'ogr', 'koc']
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
    {govde.map((s, i) => {
      const p = yay(f, SATIR[i], { damping: 16, stiffness: 150 }); const koc = kim[i] === 'koc'
      return <div key={i} style={{ ...gel(p, 24), alignSelf: koc ? 'flex-end' : 'flex-start', maxWidth: '86%',
        background: koc ? R.mercan : R.balon, color: R.beyaz, fontFamily: GOVDE, fontSize: 40, lineHeight: 1.36,
        padding: '22px 30px', borderRadius: koc ? '32px 32px 8px 32px' : '32px 32px 32px 8px' }}>{s}</div>
    })}
  </div>
}

function Not({ f, govde }) {
  const p0 = yay(f, SATIR[0])
  return <div style={{ ...gel(p0, 40), background: '#fbf6ec', borderRadius: 30, padding: '40px 44px', color: R.lacivert,
    boxShadow: '0 30px 60px rgb(0 0 0 / .35)', rotate: '-1.2deg' }}>
    <div style={{ fontFamily: MONO, fontSize: 26, letterSpacing: '.12em', color: R.turuncu }}>VELİYE NOT</div>
    {govde.map((s, i) => {
      const p = yay(f, SATIR[i])
      return <div key={i} style={{ ...gel(p, 20), fontFamily: GOVDE, fontWeight: 600, fontSize: 40, lineHeight: 1.32,
        marginTop: 22, paddingTop: i ? 22 : 0, borderTop: i ? '2px dashed #e0d6c2' : 'none' }}>{s}</div>
    })}
  </div>
}

function Sade({ f, govde, sakin }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
    {govde.map((s, i) => {
      const p = sakin ? interpolate(f, [SATIR[i], SATIR[i] + 24], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : yay(f, SATIR[i])
      return <div key={i} style={{ ...gel(p, sakin ? 0 : 24), fontFamily: GOVDE, fontSize: 44, lineHeight: 1.36,
        color: !sakin && i === govde.length - 1 ? R.turuncuA : R.acikMavi, fontWeight: !sakin && i === govde.length - 1 ? 600 : 400 }}>{s}</div>
    })}
  </div>
}

// ── Kapanış ──────────────────────────────────────────────────────
function Kapanis({ f, gun }) {
  const perde = interpolate(f, [KAPANIS, KAPANIS + 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  if (!perde) return null
  const a = yay(f, KAPANIS + 8), b = yay(f, KAPANIS + 30), c = yay(f, KAPANIS + 52)
  return <AbsoluteFill style={{ background: `color-mix(in srgb, ${R.lacivert} ${Math.round(perde * 100)}%, transparent)`,
    padding: '0 90px', justifyContent: 'center' }}>
    <div style={{ ...gel(a, 40), fontFamily: MONO, fontSize: 30, letterSpacing: '.14em', color: R.turuncuA, textTransform: 'uppercase' }}>
      {gun.seri}</div>
    <div style={{ ...gel(b, 40), fontFamily: BASLIK, fontWeight: 800, fontSize: 104, lineHeight: 1.02, letterSpacing: '-0.035em',
      color: R.beyaz, marginTop: 18 }}>Her gün<br />bir video.</div>
    {gun.yks_kalan != null && <div style={{ ...gel(b, 40), display: 'inline-block', alignSelf: 'flex-start', marginTop: 34,
      fontFamily: MONO, fontSize: 30, color: R.beyaz, border: `2px solid ${R.turuncu}`, borderRadius: 999, padding: '10px 24px' }}>
      YKS'ye {gun.yks_kalan} gün</div>}
    <div style={{ ...gel(c, 40), display: 'flex', alignItems: 'center', gap: 28, marginTop: 90 }}>
      <Img src={staticFile('logo-kh.svg')} style={{ height: 76 }} />
      <div>
        <div style={{ fontFamily: BASLIK, fontWeight: 800, fontSize: 44, color: R.beyaz }}>Kıvanç Hoca ile koçluk</div>
        <div style={{ fontFamily: MONO, fontSize: 28, color: R.acikMavi, marginTop: 6 }}>khkocluk.com</div>
      </div>
    </div>
  </AbsoluteFill>
}

// ── Kompozisyon ──────────────────────────────────────────────────
export function Gunluk({ gun, govde, muzik }) {
  const f = useCurrentFrame()
  const s = gun.sablon
  const hassas = gun.hassas || s === 'sade-kart'
  const efsane = s === 'efsane-gercek'
  const cizgi = efsane ? interpolate(f, [150, 175], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0
  const gercek = efsane ? yay(f, 172) : 0
  const yazisma = s === 'yazisma'
  // Efsane: tırnaklı kısım efsanedir; tırnak yoksa efsane başlıktır, kanca hükümdür.
  let mit = gun.kanca, hukum = ''
  if (efsane) {
    const m = gun.kanca.match(/^[‘'"“](.+?)[’'"”]\s*(.*)$/)
    if (m) { mit = `‘${m[1]}’`; hukum = m[2] } else { mit = `‘${gun.baslik}.’`; hukum = gun.kanca }
  }
  const ortada = s === 'tek-cumle' || hassas
  const ac = yay(f, ortada ? 165 : 150, { damping: 20, stiffness: 90 })   // 0 = kapak düzeni, 1 = içerik düzeni

  return (
    <AbsoluteFill style={{ background: hassas ? R.lacivert :
      `radial-gradient(900px 700px at 85% 8%, color-mix(in srgb, ${R.mavi} 38%, transparent), transparent 65%),
       radial-gradient(700px 600px at 0% 100%, color-mix(in srgb, ${R.turuncu} 16%, transparent), transparent 60%), ${R.lacivert}` }}>
      {/* Reels/TikTok arayüzü üstte ~200px, altta ~320px kapatır */}
      <div style={{ position: 'absolute', left: 80, right: 80, top: ortada ? 0 : 190, bottom: ortada ? 0 : 340,
        display: 'flex', flexDirection: 'column', justifyContent: ortada ? 'center' : 'flex-start' }}>
        <div style={{ transform: `translateY(${(1 - ac) * (ortada ? 190 : 380)}px) scale(${1 + 0.1 * (1 - ac)})`,
          transformOrigin: ortada ? 'center top' : 'left top', textAlign: ortada ? 'center' : 'left' }}>
        {!hassas && <Etiket gun={gun} />}
        {efsane && <div style={{ marginTop: 26, display: 'flex', gap: 14 }}>
          <span style={{ fontFamily: MONO, fontSize: 28, background: R.mercan, color: R.beyaz, padding: '8px 18px', borderRadius: 10 }}>EFSANE</span></div>}
        {yazisma
          ? <div style={{ marginTop: 30, alignSelf: 'flex-start', maxWidth: '92%', background: R.balon, color: R.beyaz,
              fontFamily: GOVDE, fontWeight: 600, fontSize: punto(gun.kanca, 62), lineHeight: 1.28, padding: '30px 36px',
              borderRadius: '36px 36px 36px 10px' }}>{gun.kanca}<div style={{ fontFamily: MONO, fontSize: 24, color: R.soluk, marginTop: 12 }}>öğrenci · 22:47</div></div>
          : <div style={{ position: 'relative' }}>
              <Kanca metin={mit} boyut={ortada ? punto(gun.kanca, 104) : undefined}
                renk={efsane ? `color-mix(in srgb, ${R.beyaz} ${100 - 45 * cizgi}%, transparent)` : R.beyaz}
                stil={{ ...(ortada ? { textAlign: 'center' } : {}),
                  ...(efsane ? { textDecorationLine: 'line-through', textDecorationThickness: 9,
                    textDecorationColor: `color-mix(in srgb, ${R.mercan} ${Math.round(cizgi * 100)}%, transparent)` } : {}) }} />
              {hukum && <div style={{ fontFamily: BASLIK, fontWeight: 800, fontSize: punto(hukum, 64), lineHeight: 1.12,
                letterSpacing: '-0.02em', color: R.turuncuA, marginTop: 22 }}>{hukum}</div>}
            </div>}
        </div>
        {efsane && <div style={{ ...gel(gercek), marginTop: 40 }}>
          <span style={{ fontFamily: MONO, fontSize: 28, background: R.turuncu, color: R.beyaz, padding: '8px 18px', borderRadius: 10 }}>GERÇEK</span></div>}
        <div style={{ marginTop: hassas ? 60 : efsane ? 30 : 64, textAlign: ortada ? 'center' : 'left' }}>
          {s === 'kart-liste' && <Liste f={f} govde={govde} />}
          {s === 'soru-cozum' && <Adimlar f={f} govde={govde} />}
          {yazisma && <Sohbet f={f} govde={govde} />}
          {s === 'kart-veli' && <Not f={f} govde={govde} />}
          {efsane && <Liste f={f} govde={govde} numara={false} />}
          {(s === 'tek-cumle' || hassas) && <Sade f={f} govde={govde} sakin={hassas} />}
        </div>
      </div>
      {!ortada && <div style={{ position: 'absolute', left: 80, right: 80, bottom: 380, opacity: 1 - ac,
        display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 28, color: R.acikMavi }}>
        <span>Her gün bir video</span><span>khkocluk.com</span></div>}
      {hassas
        ? <Img src={staticFile('logo-kh.svg')} style={{ position: 'absolute', bottom: 360, left: '50%', height: 60, marginLeft: -40, opacity: 0.7 }} />
        : <Kapanis f={f} gun={gun} />}
      {muzik && !hassas && <Audio src={staticFile(muzik)} />}
    </AbsoluteFill>
  )
}
