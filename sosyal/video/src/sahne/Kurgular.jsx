// Kurgu tipleri. Seri içeriği belirler, kurgu sahneyi. Her kurgunun 0. karesi eksiksiz kapaktır.
import { AbsoluteFill, Img, staticFile } from 'remotion'
import { BASLIK, GOVDE, EL, P, G, GEN, SON, SATIR, KAPANIS, SURE, ZEMIN, yay, ara, gel, elCemberi, elCizgisi, punto, tohumla } from './ortak.js'
import { Cizim, CIZIM } from './Cizimler.jsx'

// ── Ortak parçalar ───────────────────────────────────────────────
export function Ust({ gun, z, stil }) {
  const ek = gun.ders ? ` · ${gun.ders}` : gun.kitle === 'veli' ? ' · veliler için' : ''
  return <div style={{ fontFamily: GOVDE, fontWeight: 600, fontSize: 30, letterSpacing: '.14em', textTransform: 'uppercase',
    color: z.etiket, ...stil }}>{gun.seri}{ek}</div>
}

const sade = (k) => k.toLocaleLowerCase('tr').replace(/[^a-zçğıöşü0-9]/g, '')
export function Baslik({ metin, boyut, renk, stil, vurgu, f = 0, cizgi = P.amber }) {
  const cek = ara(f, 3, 24)
  let bulundu = false
  return <div style={{ fontFamily: BASLIK, fontWeight: 800, fontSize: boyut, lineHeight: 1.0, letterSpacing: '-0.035em',
    color: renk, textWrap: 'balance', ...stil }}>
    {metin.split(' ').map((k, i) => {
      const bu = !bulundu && vurgu && sade(k) === sade(vurgu)
      if (bu) bulundu = true
      return <span key={i}>{i ? ' ' : ''}{bu
        ? <span style={{ position: 'relative', display: 'inline-block' }}>{k}
            <svg viewBox="0 0 100 20" preserveAspectRatio="none" style={{ position: 'absolute', left: '-2%', width: '104%', bottom: '-0.2em',
              height: '0.28em', overflow: 'visible', opacity: cek > 0.02 ? 1 : 0, clipPath: `inset(-50% ${(1 - cek) * 100}% -50% -5%)` }}>
              <path d={elCizgisi(0, 10, 100, 4, 2)} stroke={cizgi} fill="none" strokeLinecap="round" vectorEffect="non-scaling-stroke"
                style={{ strokeWidth: boyut * 0.1 }} />
            </svg></span>
        : k}</span>
    })}
  </div>
}

export function Logo({ boyut = 56, renk, vurgu = P.amber }) {
  return <svg viewBox="0 -8 145 116" height={boyut} width={(boyut * 145) / 116} fill="none" strokeWidth={16} strokeLinecap="round">
    {['M8 0V100', 'M10.4 50L72 0', 'M10.4 50L72 100', 'M72 50H137', 'M137 0V100'].map((d) => <path key={d} d={d} stroke={renk} />)}
    <path d="M72 0V100" stroke={vurgu} />
  </svg>
}

export function Kunye({ f, z }) {
  return <div style={{ position: 'absolute', left: G.sol, top: SON - 50, opacity: 0.85 * (1 - ara(f, KAPANIS - 10, KAPANIS)) }}>
    <Logo boyut={42} renk={z.yazi} /></div>
}

// Gövde satırları tek tek, aynı yerde: her satır bir öncekinin yerini alır, ekranda hep tek fikir durur.
export function Yuva({ f, govde, z, boyut = 64, stil }) {
  return <div style={{ position: 'relative', ...stil }}>
    {govde.map((s, i) => {
      const gir = yay(f, SATIR[i]), cik = i < govde.length - 1 ? ara(f, SATIR[i + 1] - 8, SATIR[i + 1] + 6) : 0
      if (gir < 0.01 || cik > 0.99) return null
      return <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: 0, opacity: Math.min(1, gir * 1.4) * (1 - cik),
        transform: `translateY(${(1 - gir) * 34 - cik * 24}px)`, display: 'flex', gap: 24 }}>
        <div style={{ flex: '0 0 auto', fontFamily: EL, fontSize: boyut * 1.1, lineHeight: 1.05, color: z.koyu ? P.amber : z.etiket }}>{i + 1}</div>
        <div style={{ fontFamily: GOVDE, fontWeight: 600, fontSize: boyut, lineHeight: 1.3, color: z.yazi }}>{s}</div>
      </div>
    })}
  </div>
}

// ── A · Metafor çizimi ───────────────────────────────────────────
export function Metafor({ f, gun, govde, z, s }) {
  const [, , w, h] = CIZIM[s.cizim].vb.split(' ').map(Number)
  const cg = Math.min(s.cizimGen || 680, (520 * w) / h)
  const govdeGeldi = yay(f, SATIR[0] - 20)
  return <AbsoluteFill>
    <Ust gun={gun} z={z} stil={{ position: 'absolute', left: G.sol, top: G.ust + 30 }} />
    <div style={{ position: 'absolute', right: G.sag + 10, top: G.ust + 70,
      transform: `translate(${govdeGeldi * 40}px, ${-govdeGeldi * 40}px) scale(${1 - govdeGeldi * 0.28})`, transformOrigin: 'right top' }}>
      <Cizim ad={s.cizim} f={f} gen={cg} zemin={z} />
    </div>
    <div style={{ position: 'absolute', left: G.sol, width: GEN - 40, top: 880 - govdeGeldi * 170 }}>
      <Baslik metin={gun.kanca} boyut={punto(gun.kanca, 104)} renk={z.yazi} vurgu={s.vurgu} f={f} cizgi={z.koyu ? P.amber : z.vurguCizgi} />
    </div>
    <Yuva f={f} govde={govde} z={z} stil={{ position: 'absolute', left: G.sol, width: GEN - 20, top: 1130 }} />
  </AbsoluteFill>
}

// ── B · Dev tipografi ────────────────────────────────────────────
export function DevTipo({ f, gun, govde, z, s }) {
  const liste = yay(f, SATIR[0] - 15)
  return <AbsoluteFill>
    <Ust gun={gun} z={z} stil={{ position: 'absolute', left: G.sol, top: G.ust + 30 }} />
    <div style={{ position: 'absolute', left: G.sol, width: GEN, top: G.ust + 64, fontFamily: GOVDE, fontSize: 50, lineHeight: 1.25, color: z.soluk }}>{s.ust}</div>
    <div style={{ position: 'absolute', left: G.sol - 10, top: 470, transform: `scale(${1 - liste * 0.3})`, transformOrigin: 'left top' }}>
      <div style={{ fontFamily: BASLIK, fontWeight: 800, fontSize: 620, lineHeight: 0.82, letterSpacing: '-0.06em', color: z.yazi,
        transform: `rotate(${Math.sin(f / 30) * 1.2}deg)` }}>{s.sayi}</div>
      <svg width={520} height={620} viewBox="0 0 520 620" style={{ position: 'absolute', left: -40, top: -60, overflow: 'visible' }}>
        <path d={elCemberi(215, 300, 205, 250, 1.12, 2)} stroke={P.amber} strokeWidth={14} fill="none" strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', left: 430, top: 300, fontFamily: BASLIK, fontWeight: 800, fontSize: 170, color: z.yazi,
        letterSpacing: '-0.04em' }}>{s.ek}</div>
    </div>
    <div style={{ position: 'absolute', left: G.sol, width: GEN, top: 980, display: 'flex', flexDirection: 'column', gap: 34 }}>
      {govde.map((t, i) => {
        const p = yay(f, SATIR[i]), tik = ara(f, SATIR[i] + 40, SATIR[i] + 58)
        return <div key={i} style={{ ...gel(p, 40), display: 'flex', gap: 30, alignItems: 'flex-start' }}>
          <svg width={64} height={64} viewBox="0 0 64 64" style={{ flex: 'none', marginTop: 2 }} fill="none" strokeLinecap="round" strokeLinejoin="round">
            <rect x="6" y="6" width="52" height="52" rx="12" stroke={tik > 0 ? P.amber : z.soluk} strokeWidth="6" />
            <path d="M18 34 l10 10 l20 -24" stroke={P.amber} strokeWidth="7" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - tik} />
          </svg>
          <div style={{ fontFamily: GOVDE, fontWeight: 600, fontSize: 52, lineHeight: 1.26, color: z.yazi }}>{t}</div>
        </div>
      })}
    </div>
  </AbsoluteFill>
}

// ── C · İkiye bölünmüş (efsane / gerçek) ─────────────────────────
export function Bolunmus({ f, gun, govde, s }) {
  let mit = gun.kanca, hukum = ''
  const m = gun.kanca.match(/^[‘'"“](.+?)[’'"”]\s*(.*)$/)
  if (m) { mit = `‘${m[1]}’`; hukum = m[2] } else { mit = `‘${gun.baslik}.’`; hukum = gun.kanca }
  const ust = { bg: P.seftali, yazi: P.murekkep, soluk: '#5a2e1c', etiket: '#5a2e1c', koyu: false }
  const alt = { bg: P.nane, yazi: P.murekkep, soluk: '#1f4a3c', etiket: '#1f4a3c', koyu: false }
  const ciz = ara(f, 18, 48)
  const kay = yay(f, SATIR[0] - 30, { damping: 20, stiffness: 90 })   // alt yarı yukarı kayar, gövdeye yer açar
  const sinir = 960 - kay * 260
  const pill = (t, r) => <span style={{ fontFamily: GOVDE, fontWeight: 600, fontSize: 28, letterSpacing: '.12em', background: P.murekkep,
    color: r, padding: '10px 22px', borderRadius: 999 }}>{t}</span>
  return <AbsoluteFill style={{ background: ust.bg }}>
    <Ust gun={gun} z={ust} stil={{ position: 'absolute', left: G.sol, top: G.ust + 30 }} />
    <div style={{ position: 'absolute', right: G.sag - 40, top: G.ust + 40, opacity: 1 - kay * 0.9 }}>
      <Cizim ad="dugum" f={f} gen={340} zemin={ust} kalem={7} />
    </div>
    <div style={{ position: 'absolute', left: G.sol, top: 520 - kay * 150 }}>{pill('EFSANE', P.seftali)}</div>
    <div style={{ position: 'absolute', left: G.sol, width: GEN, top: 600 - kay * 150 }}>
      <Baslik metin={mit} boyut={104 - kay * 22} renk={P.murekkep} stil={{ opacity: 1 - ciz * 0.35 }} />
      <svg width={GEN} height={60} viewBox={`0 0 ${GEN} 60`} style={{ position: 'absolute', left: -10, top: 70 - kay * 14, overflow: 'visible' }}>
        <path d={elCizgisi(0, 30, GEN * 0.92, 8, 2)} stroke={P.murekkep} strokeWidth={13} fill="none" strokeLinecap="round"
          pathLength={1} strokeDasharray={1} strokeDashoffset={1 - ciz} />
      </svg>
    </div>
    <div style={{ position: 'absolute', left: 0, right: 0, top: sinir, bottom: 0, background: alt.bg }}>
      <svg width={1080} height={40} viewBox="0 0 1080 40" style={{ position: 'absolute', top: -20 }}>
        <path d={elCizgisi(-20, 20, 1100, 6, 4)} stroke={P.murekkep} strokeWidth={8} fill="none" />
      </svg>
      <div style={{ position: 'absolute', left: G.sol, top: 90 }}>{pill('GERÇEK', P.nane)}</div>
      <div style={{ position: 'absolute', left: G.sol, width: GEN, top: 170 }}>
        <Baslik metin={hukum} boyut={punto(hukum, 96)} renk={P.murekkep} vurgu={s.vurgu} f={f} cizgi={P.murekkep} />
      </div>
      <Yuva f={f} govde={govde} z={alt} boyut={56} stil={{ position: 'absolute', left: G.sol, width: GEN - 20, top: 430 }} />
    </div>
  </AbsoluteFill>
}

// ── D · Harita / veri ────────────────────────────────────────────
export function Harita({ f, gun, govde, z, s }) {
  const yol = 'M40 330 C140 300 150 200 250 220 S380 330 470 250 S560 80 660 70'
  const ilerle = ara(f, 8, 60)
  const etiket = yay(f, 28)
  return <AbsoluteFill>
    <Ust gun={gun} z={z} stil={{ position: 'absolute', left: G.sol, top: G.ust + 30 }} />
    <div style={{ position: 'absolute', left: G.sol, width: GEN, top: G.ust + 70 }}>
      <Baslik metin={gun.kanca} boyut={punto(gun.kanca, 108)} renk={z.yazi} vurgu={s.vurgu} f={f} cizgi={P.murekkep} />
    </div>
    <svg width={GEN + 40} height={440} viewBox="0 0 720 420" style={{ position: 'absolute', left: G.sol - 20, top: 660, overflow: 'visible' }}
      fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={yol} stroke={P.krem} strokeWidth={26} transform="translate(8 10)" />
      <path d={yol} stroke={P.murekkep} strokeWidth={8} strokeDasharray="4 26" />
      <path d={yol} stroke={P.murekkep} strokeWidth={9} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - ilerle * 0.2} />
      <circle cx={40} cy={330} r={24} fill={P.seftali} stroke={P.murekkep} strokeWidth={8} />
      <circle cx={250} cy={220} r={14} fill={P.krem} stroke={P.murekkep} strokeWidth={7} />
      <circle cx={470} cy={250} r={14} fill={P.krem} stroke={P.murekkep} strokeWidth={7} />
      <path d="M660 70 V-40 l60 20 l-60 20" stroke={P.murekkep} strokeWidth={8} fill={P.amber} />
      <circle cx={660} cy={70} r={12} fill={P.murekkep} />
      <text x={600} y={130} fontFamily={GOVDE} fontWeight={600} fontSize={30} fill={P.murekkep}>Hedef</text>
    </svg>
    <div style={{ position: 'absolute', left: G.sol - 10, top: 1080, transform: `rotate(-4deg) scale(${0.6 + etiket * 0.4})`,
      transformOrigin: 'left center', opacity: Math.min(1, etiket * 1.5), background: P.amber, border: `6px solid ${P.murekkep}`,
      borderRadius: 18, padding: '10px 28px', boxShadow: `10px 10px 0 ${P.murekkep}`, fontFamily: BASLIK, fontWeight: 800,
      fontSize: 50, color: P.murekkep }}>Buradasın</div>
    <Yuva f={f} govde={govde} z={z} boyut={58} stil={{ position: 'absolute', left: G.sol, width: GEN - 20, top: 1190 }} />
  </AbsoluteFill>
}

// ── E · Masa üstü: yapışkan notlar ───────────────────────────────
const bastanBuyuk = (t) => t.charAt(0).toLocaleUpperCase('tr') + t.slice(1)
export function Masa({ f, gun, govde, z, s }) {
  const kanca = bastanBuyuk(gun.kanca.replace(/^[^:]*veli[^:]*:\s*/i, ''))   // "8. sınıf velisi:" gibi hitap önekini at (etikette zaten var)
  const notlar = [
    { r: P.seftali, x: 0, y: 0, a: -4 }, { r: P.nane, x: 150, y: 235, a: 3.5 }, { r: P.limon, x: 20, y: 470, a: -2 },
  ]
  const cizGit = yay(f, SATIR[0] - 20)
  return <AbsoluteFill>
    <Ust gun={gun} z={z} stil={{ position: 'absolute', left: G.sol, top: G.ust + 30 }} />
    <div style={{ position: 'absolute', left: G.sol, width: GEN, top: G.ust + 70 }}>
      <Baslik metin={kanca} boyut={punto(kanca, 104)} renk={z.yazi} vurgu={s.vurgu} f={f} cizgi={P.amber} />
    </div>
    {s.cizim && <div style={{ position: 'absolute', right: G.sag, top: 760, opacity: 1 - cizGit, transform: `scale(${1 - cizGit * 0.2})` }}>
      <Cizim ad={s.cizim} f={f} gen={520} zemin={z} /></div>}
    <div style={{ position: 'absolute', left: G.sol, top: 640, width: GEN }}>
      {govde.map((t, i) => {
        const n = notlar[i % 3], p = yay(f, SATIR[i], { damping: 13, stiffness: 140 })
        if (p < 0.01) return null
        return <div key={i} style={{ position: 'absolute', left: n.x, top: n.y, width: 610, background: n.r, padding: '40px 40px 46px',
          transform: `translateY(${(1 - p) * -260}px) rotate(${n.a + (1 - p) * 8}deg) scale(${1.15 - p * 0.15})`, opacity: Math.min(1, p * 2),
          boxShadow: '14px 14px 0 rgba(26,34,51,.16)' }}>
          <div style={{ position: 'absolute', left: '44%', top: -16, width: 110, height: 34, background: 'rgba(255,255,255,.55)', transform: 'rotate(-3deg)' }} />
          <div style={{ fontFamily: EL, fontSize: 66, lineHeight: 1.08, color: P.murekkep }}>{t}</div>
        </div>
      })}
    </div>
  </AbsoluteFill>
}

// ── F · Yazışma: çizilmiş telefon ────────────────────────────────
export function Yazisma({ f, gun, govde, z }) {
  const kim = ['koc', 'ogr', 'koc']
  const X = G.sol + 40, Y = 330, W = GEN - 60, H = 1030
  const balon = (t, koc, p, k, buyuk) => <div key={k} style={{ ...gel(p, 30), alignSelf: koc ? 'flex-end' : 'flex-start', maxWidth: buyuk ? '94%' : '84%',
    background: koc ? P.murekkep : '#ffffff', color: koc ? P.krem : P.murekkep, border: `5px solid ${P.murekkep}`,
    fontFamily: buyuk ? BASLIK : GOVDE, fontWeight: buyuk ? 800 : 600, fontSize: buyuk ? 60 : 38, lineHeight: buyuk ? 1.08 : 1.3,
    letterSpacing: buyuk ? '-0.02em' : 0, padding: buyuk ? '30px 36px' : '20px 28px',
    borderRadius: koc ? '34px 34px 8px 34px' : '34px 34px 34px 8px' }}>{t}</div>
  return <AbsoluteFill>
    <Ust gun={gun} z={z} stil={{ position: 'absolute', left: G.sol, top: G.ust + 30 }} />
    <div style={{ position: 'absolute', left: X + 18, top: Y + 18, width: W, height: H, background: z.dolgu === P.krem ? P.nane : z.dolgu, borderRadius: 70 }} />
    <div style={{ position: 'absolute', left: X, top: Y, width: W, height: H, background: P.krem, border: `10px solid ${P.murekkep}`,
      borderRadius: 70, overflow: 'hidden', transform: `rotate(${Math.sin(f / 50) * 0.6}deg)` }}>
      <div style={{ height: 130, borderBottom: `5px solid ${P.murekkep}`, display: 'flex', alignItems: 'center', gap: 20, padding: '20px 40px 0' }}>
        <div style={{ width: 64, height: 64, borderRadius: 32, background: P.gok, border: `5px solid ${P.murekkep}` }} />
        <div>
          <div style={{ fontFamily: GOVDE, fontWeight: 600, fontSize: 32, color: P.murekkep }}>Öğrenci</div>
          <div style={{ fontFamily: GOVDE, fontSize: 24, color: '#4a5570' }}>22:47 · çevrimiçi</div>
        </div>
      </div>
      <div style={{ padding: '34px 30px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {balon(gun.kanca, false, 1, 'k', true)}
        {govde.map((t, i) => balon(t, kim[i] === 'koc', yay(f, SATIR[i], { damping: 15, stiffness: 160 }), i))}
        {f < SATIR[0] && <div style={{ alignSelf: 'flex-end', fontFamily: EL, fontSize: 44, color: '#4a5570' }}>yazıyor…</div>}
      </div>
    </div>
  </AbsoluteFill>
}

// ── Kapanış: günün renginde, günün çizimiyle; başlık dönüşümlü ─────
const KAPANIS_SOZ = ['Senin sıran.', 'Sen ne dersin?', 'Yorumlarda buluşalım.', 'Bir cümle yeter.', 'Sende nasıl?']
export function Kapanis({ f, gun, z, s }) {
  const ac = ara(f, KAPANIS, KAPANIS + 22)
  if (!ac) return null
  const rnd = tohumla(gun.tarih + 'kapanis')
  const aday = Object.keys(ZEMIN).filter((k) => ZEMIN[k].bg !== z.bg)
  const k = ZEMIN[aday[Math.floor(rnd() * aday.length)]]
  const soz = gun.soru ? KAPANIS_SOZ[Math.floor(rnd() * KAPANIS_SOZ.length)] : 'Yarın yine buradayız.'
  const koseler = ['85% 88%', '12% 90%', '88% 12%', '50% 100%']
  const kose = koseler[Math.floor(rnd() * koseler.length)]
  const a = yay(f, KAPANIS + 14), b = yay(f, KAPANIS + 30), c = yay(f, KAPANIS + 48), d = yay(f, KAPANIS + 24, { damping: 12, stiffness: 120 })
  const alti = ara(f, KAPANIS + 55, KAPANIS + 80)
  const cizgi = k.koyu ? P.amber : k.vurguCizgi
  return <AbsoluteFill style={{ background: k.bg, clipPath: `circle(${ac * 150}% at ${kose})` }}>
    {s && s.cizim && <div style={{ position: 'absolute', right: G.sag, top: G.ust + 20, transform: `scale(${d}) rotate(${(1 - d) * -20}deg)`,
      transformOrigin: 'center' }}><Cizim ad={s.cizim} f={f} gen={300} zemin={k} kalem={7} /></div>}
    <div style={{ position: 'absolute', left: G.sol, width: GEN, top: 560 }}>
      <div style={{ ...gel(a, 40), fontFamily: GOVDE, fontWeight: 600, fontSize: 30, letterSpacing: '.14em', color: k.etiket }}>
        {gun.soru ? 'YORUMLARA YAZ' : 'HER GÜN BİR VİDEO'}</div>
      <Baslik metin={soz} boyut={soz.length > 16 ? 112 : 132} renk={k.yazi} stil={{ ...gel(b, 50), marginTop: 20 }} />
      {gun.soru && <div style={{ ...gel(c, 40), position: 'relative', marginTop: 50, fontFamily: EL, fontSize: 80, lineHeight: 1.1, color: k.yazi }}>
        {gun.soru}
        <svg width={GEN} height={40} viewBox={`0 0 ${GEN} 40`} style={{ display: 'block', marginTop: 8, overflow: 'visible' }}>
          <path d={elCizgisi(0, 20, GEN * 0.7, 6, 3)} stroke={cizgi} strokeWidth={10} fill="none" strokeLinecap="round"
            pathLength={1} strokeDasharray={1} strokeDashoffset={1 - alti} />
        </svg>
      </div>}
      {gun.yks_kalan != null && <div style={{ ...gel(c, 40), display: 'inline-block', marginTop: 50, fontFamily: GOVDE, fontWeight: 600,
        fontSize: 32, color: k.yazi, border: `4px solid ${k.yazi}`, borderRadius: 999, padding: '12px 28px' }}>YKS'ye {gun.yks_kalan} gün</div>}
    </div>
    <div style={{ ...gel(c, 30), position: 'absolute', left: G.sol, top: SON - 130, display: 'flex', alignItems: 'center', gap: 26 }}>
      <Logo boyut={84} renk={k.yazi} />
      <div>
        <div style={{ fontFamily: BASLIK, fontWeight: 800, fontSize: 48, color: k.yazi, letterSpacing: '-0.02em' }}>Kıvanç Hoca ile koçluk</div>
        <div style={{ fontFamily: GOVDE, fontWeight: 600, fontSize: 30, color: k.soluk, marginTop: 4 }}>khkocluk.com</div>
      </div>
    </div>
  </AbsoluteFill>
}

// ── G · Fotoğraf: Higgsfield arka planı üstünde kurgulu anlatım ──────────────
// Görsel sosyal/video/public/arka/<çizim>.jpg (metinsiz, yüzsüz; sosyal/higgsfield.md).
// Tek fotoğraf, dört kadraj: her satırda kamera başka bir yere sıçrar (kesme + parlama), arada yavaşça yaklaşır.
// s.sahneler varsa (sosyal/gorsel.py) her satır kendi görseline keser: kanca 0, satırlar 1..n.
// Kanca 0. karede tam durur (kapak). Satırlar büyük, ortada; kelimeler sırayla patlar, okunan kelime amber.
const KADRAJ = [[1.1, 50, 50], [1.5, 38, 44], [1.72, 64, 54], [1.32, 50, 40]]   // ölçek, odak x%, odak y%

function Zerreler({ f, tarih }) {
  const rnd = tohumla(tarih + 'toz')
  return <AbsoluteFill style={{ mixBlendMode: 'screen' }}>
    {Array.from({ length: 22 }).map((_, i) => {
      const x = rnd() * 1080, y0 = rnd() * 1920, b = 4 + rnd() * 12, hiz = 0.5 + rnd() * 1.6, faz = rnd() * 6.28
      const y = (((y0 - f * hiz) % 1920) + 1920) % 1920
      return <div key={i} style={{ position: 'absolute', left: x + Math.sin(f / 40 + faz) * 26, top: y, width: b, height: b, borderRadius: b,
        background: P.limon, opacity: 0.1 + 0.22 * (0.5 + 0.5 * Math.sin(f / 18 + faz)), filter: `blur(${b > 10 ? 4 : 1.5}px)` }} />
    })}
  </AbsoluteFill>
}

export function Foto({ f, gun, govde, s, zaman }) {
  const sure = zaman?.sure ?? SURE
  const bol = SATIR.filter((t, i) => i < govde.length && f >= t).length          // 0 kanca, 1..n satırlar
  const bas = bol ? SATIR[bol - 1] : 0, yerel = f - bas
  const [olcek, ox, oy] = KADRAJ[bol % KADRAJ.length]
  const vurus = bol ? ara(yerel, 0, 9, 1, 0) : 0                                 // kesme anı: parlama + geri tepme
  const yak = olcek + yerel * 0.0011 + vurus * 0.07
  const kucuk = yay(f, SATIR[0] - 6, { damping: 16, stiffness: 170 })            // kanca yukarı toplanır
  const bolumler = [0, ...SATIR.slice(0, govde.length), KAPANIS]
  return <AbsoluteFill style={{ background: P.murekkep, overflow: 'hidden' }}>
    <Img src={staticFile(s.sahneler?.length ? s.sahneler[Math.min(bol, s.sahneler.length - 1)] : `arka/${s.foto}.jpg`)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
      transformOrigin: `${ox}% ${oy}%`, transform: `scale(${yak}) rotate(${Math.sin(f / 70) * 0.5}deg)`,
      filter: `brightness(${0.9 - kucuk * 0.1 + vurus * 0.35}) saturate(${1.15 + vurus * 0.4}) contrast(1.08)` }} />
    {/* ışık süpürmesi: sıcak bir bant çaprazdan ağır ağır geçer */}
    <AbsoluteFill style={{ mixBlendMode: 'screen', opacity: 0.5,
      background: `linear-gradient(115deg, transparent ${ara(f, 0, sure, -30, 90)}%, rgba(232,164,28,.38) ${ara(f, 0, sure, -8, 112)}%, transparent ${ara(f, 0, sure, 14, 134)}%)` }} />
    <Zerreler f={f} tarih={gun.tarih} />
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse 75% 60% at 50% 46%, transparent 35%, rgba(10,14,24,.78) 100%)' }} />
    <AbsoluteFill style={{ background: `linear-gradient(180deg, rgba(26,34,51,.9) 0%, rgba(26,34,51,.35) 26%, rgba(26,34,51,${0.05 + kucuk * 0.3}) 50%, rgba(26,34,51,.75) 80%, rgba(26,34,51,.95) 100%)` }} />
    <AbsoluteFill style={{ background: P.limon, opacity: vurus * 0.2, mixBlendMode: 'screen' }} />

    {/* hikâye çubuğu: kanca + her satır bir dilim, zamanla dolar */}
    <div style={{ position: 'absolute', left: G.sol, width: GEN, top: G.ust - 6, display: 'flex', gap: 10 }}>
      {bolumler.slice(0, -1).map((b, i) => <div key={i} style={{ flex: 1, height: 8, borderRadius: 8, background: 'rgba(244,239,230,.28)', overflow: 'hidden' }}>
        <div style={{ width: `${ara(f, b, bolumler[i + 1], 0, 100)}%`, height: '100%', background: P.amber, borderRadius: 8 }} /></div>)}
    </div>
    <Ust gun={gun} z={ZEMIN.murekkep} stil={{ position: 'absolute', left: G.sol, top: G.ust + 34 }} />

    {/* kanca: önce dev, satırlar başlayınca yukarıda küçülür */}
    <div style={{ position: 'absolute', left: G.sol, width: GEN, top: G.ust + 96 + (1 - kucuk) * 250,
      transform: `scale(${1.12 - kucuk * 0.52})`, transformOrigin: 'left top', opacity: 1 - kucuk * 0.22 }}>
      <Baslik metin={gun.kanca} boyut={punto(gun.kanca, 112)} renk={P.krem} vurgu={s.vurgu} f={f} cizgi={P.amber}
        stil={{ textShadow: '0 6px 40px rgba(0,0,0,.6)' }} />
    </div>

    {/* satırlar */}
    {govde.map((satir, i) => {
      const gir = yay(f, SATIR[i], { damping: 13, stiffness: 190 })
      const son = i < govde.length - 1 ? SATIR[i + 1] : KAPANIS
      const cik = ara(f, son - 7, son)
      if (gir < 0.01 || cik > 0.99) return null
      const t0 = zaman?.kelime?.[i + 1] || []
      const kelimeler = satir.split(/\s+/).filter(Boolean)
      const boyut = satir.length > 62 ? 78 : satir.length > 40 ? 90 : 104
      return <div key={i} style={{ position: 'absolute', left: G.sol, width: GEN, top: 760, opacity: 1 - cik,
        transform: `translateX(${-cik * 90}px) scale(${1 + cik * 0.06})` }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 16, transform: `scale(${gir})`, transformOrigin: 'left center',
          background: P.amber, color: P.murekkep, borderRadius: 999, padding: '10px 30px 10px 14px', fontFamily: GOVDE, fontWeight: 600, fontSize: 34 }}>
          <span style={{ display: 'inline-block', width: 58, height: 58, borderRadius: 58, background: P.murekkep, color: P.amber, fontFamily: BASLIK,
            fontWeight: 800, fontSize: 38, lineHeight: '58px', textAlign: 'center' }}>{i + 1}</span>
          <span style={{ letterSpacing: '.08em' }}>{i + 1} / {govde.length}</span>
        </div>
        <div style={{ marginTop: 34, fontFamily: BASLIK, fontWeight: 800, fontSize: boyut, lineHeight: 1.06, letterSpacing: '-0.03em',
          color: P.krem, textShadow: '0 6px 36px rgba(0,0,0,.7), 0 2px 4px rgba(0,0,0,.5)' }}>
          {kelimeler.map((k, j) => {
            const t = t0[j] ?? SATIR[i] + j * 5
            const p = yay(f, t, { damping: 11, stiffness: 240 })
            const sonraki = t0[j + 1] ?? t + 14
            const simdi = f >= t && f < sonraki
            return <span key={j}>{j ? ' ' : ''}<span style={{ display: 'inline-block', opacity: Math.min(1, p * 1.6),
              transform: `translateY(${(1 - p) * 46}px) scale(${0.7 + 0.3 * p}) rotate(${(1 - p) * -5}deg)`, transformOrigin: 'left bottom',
              color: simdi ? P.amber : P.krem }}>{k}</span></span>
          })}
        </div>
      </div>
    })}
  </AbsoluteFill>
}
