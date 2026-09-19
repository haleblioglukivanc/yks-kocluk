// Kurgu tipleri. Seri içeriği belirler, kurgu sahneyi. Her kurgunun 0. karesi eksiksiz kapaktır.
import { AbsoluteFill } from 'remotion'
import { BASLIK, GOVDE, EL, P, G, GEN, SON, SATIR, KAPANIS, yay, ara, gel, elCemberi, elCizgisi, punto } from './ortak.js'
import { Cizim, CIZIM } from './Cizimler.jsx'

// ── Ortak parçalar ───────────────────────────────────────────────
export function Ust({ gun, z, stil }) {
  const ek = gun.ders ? ` · ${gun.ders}` : gun.kitle === 'veli' ? ' · veliler için' : ''
  return <div style={{ fontFamily: GOVDE, fontWeight: 600, fontSize: 30, letterSpacing: '.14em', textTransform: 'uppercase',
    color: z.etiket, ...stil }}>{gun.seri}{ek}</div>
}

export function Baslik({ metin, boyut, renk, stil }) {
  return <div style={{ fontFamily: BASLIK, fontWeight: 800, fontSize: boyut, lineHeight: 1.0, letterSpacing: '-0.035em',
    color: renk, textWrap: 'balance', ...stil }}>{metin}</div>
}

export function Logo({ boyut = 56, renk, vurgu = P.amber }) {
  return <svg viewBox="0 -8 145 116" height={boyut} width={(boyut * 145) / 116} fill="none" strokeWidth={16} strokeLinecap="round">
    {['M8 0V100', 'M10.4 50L72 0', 'M10.4 50L72 100', 'M72 50H137', 'M137 0V100'].map((d) => <path key={d} d={d} stroke={renk} />)}
    <path d="M72 0V100" stroke={vurgu} />
  </svg>
}

export function Kunye({ f, z }) {
  return <div style={{ position: 'absolute', left: G.sol, right: G.sag, top: SON - 56, display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', opacity: 1 - ara(f, KAPANIS - 10, KAPANIS), fontFamily: GOVDE, fontWeight: 600, fontSize: 30, color: z.yazi }}>
    <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}><Logo boyut={40} renk={z.yazi} />Kıvanç Hoca</span>
    <span style={{ color: z.soluk }}>@khkocluk</span>
  </div>
}

// Gövde satırları tek tek, aynı yerde: her satır bir öncekinin yerini alır, ekranda hep tek fikir durur.
export function Yuva({ f, govde, z, boyut = 54, stil }) {
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
    <Ust gun={gun} z={z} stil={{ position: 'absolute', left: G.sol, top: G.ust }} />
    <div style={{ position: 'absolute', right: G.sag + 10, top: G.ust + 70,
      transform: `translate(${govdeGeldi * 40}px, ${-govdeGeldi * 40}px) scale(${1 - govdeGeldi * 0.28})`, transformOrigin: 'right top' }}>
      <Cizim ad={s.cizim} f={f} gen={cg} zemin={z} />
    </div>
    <div style={{ position: 'absolute', left: G.sol, width: GEN - 40, top: 880 - govdeGeldi * 170 }}>
      <Baslik metin={gun.kanca} boyut={punto(gun.kanca, 104)} renk={z.yazi} />
    </div>
    <Yuva f={f} govde={govde} z={z} stil={{ position: 'absolute', left: G.sol, width: GEN - 20, top: 1150 }} />
  </AbsoluteFill>
}

// ── B · Dev tipografi ────────────────────────────────────────────
export function DevTipo({ f, gun, govde, z, s }) {
  const liste = yay(f, SATIR[0] - 15)
  return <AbsoluteFill>
    <Ust gun={gun} z={z} stil={{ position: 'absolute', left: G.sol, top: G.ust }} />
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
    <div style={{ position: 'absolute', left: G.sol, width: GEN, top: 980, display: 'flex', flexDirection: 'column', gap: 40 }}>
      {govde.map((t, i) => {
        const p = yay(f, SATIR[i]), tik = ara(f, SATIR[i] + 40, SATIR[i] + 58)
        return <div key={i} style={{ ...gel(p, 40), display: 'flex', gap: 30, alignItems: 'flex-start' }}>
          <svg width={64} height={64} viewBox="0 0 64 64" style={{ flex: 'none', marginTop: 2 }} fill="none" strokeLinecap="round" strokeLinejoin="round">
            <rect x="6" y="6" width="52" height="52" rx="12" stroke={tik > 0 ? P.amber : z.soluk} strokeWidth="6" />
            <path d="M18 34 l10 10 l20 -24" stroke={P.amber} strokeWidth="7" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - tik} />
          </svg>
          <div style={{ fontFamily: GOVDE, fontWeight: 600, fontSize: 46, lineHeight: 1.28, color: z.yazi }}>{t}</div>
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
  const ciz = ara(f, 110, 140)
  const kay = yay(f, SATIR[0] - 30, { damping: 20, stiffness: 90 })   // alt yarı yukarı kayar, gövdeye yer açar
  const sinir = 960 - kay * 260
  const pill = (t, r) => <span style={{ fontFamily: GOVDE, fontWeight: 600, fontSize: 28, letterSpacing: '.12em', background: P.murekkep,
    color: r, padding: '10px 22px', borderRadius: 999 }}>{t}</span>
  return <AbsoluteFill style={{ background: ust.bg }}>
    <Ust gun={gun} z={ust} stil={{ position: 'absolute', left: G.sol, top: G.ust }} />
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
        <Baslik metin={hukum} boyut={punto(hukum, 96)} renk={P.murekkep} />
      </div>
      <Yuva f={f} govde={govde} z={alt} boyut={46} stil={{ position: 'absolute', left: G.sol, width: GEN - 20, top: 440 }} />
    </div>
  </AbsoluteFill>
}

// ── D · Harita / veri ────────────────────────────────────────────
export function Harita({ f, gun, govde, z }) {
  const yol = 'M40 330 C140 300 150 200 250 220 S380 330 470 250 S560 80 660 70'
  const ilerle = ara(f, 60, 130)
  const etiket = yay(f, 40)
  return <AbsoluteFill>
    <Ust gun={gun} z={z} stil={{ position: 'absolute', left: G.sol, top: G.ust }} />
    <div style={{ position: 'absolute', left: G.sol, width: GEN, top: G.ust + 70 }}>
      <Baslik metin={gun.kanca} boyut={punto(gun.kanca, 108)} renk={z.yazi} />
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
    <Yuva f={f} govde={govde} z={z} boyut={48} stil={{ position: 'absolute', left: G.sol, width: GEN - 20, top: 1230 }} />
  </AbsoluteFill>
}

// ── E · Masa üstü: yapışkan notlar ───────────────────────────────
export function Masa({ f, gun, govde, z, s }) {
  const notlar = [
    { r: P.seftali, x: 0, y: 0, a: -4 }, { r: P.nane, x: 150, y: 235, a: 3.5 }, { r: P.limon, x: 20, y: 470, a: -2 },
  ]
  const cizGit = yay(f, SATIR[0] - 20)
  return <AbsoluteFill>
    <Ust gun={gun} z={z} stil={{ position: 'absolute', left: G.sol, top: G.ust }} />
    <div style={{ position: 'absolute', left: G.sol, width: GEN, top: G.ust + 70 }}>
      <Baslik metin={gun.kanca.replace(/^[^:]+:\s*/, '')} boyut={96} renk={z.yazi} />
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
    <Ust gun={gun} z={z} stil={{ position: 'absolute', left: G.sol, top: G.ust }} />
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

// ── Kapanış: dairesel perdeyle zemin değişir ─────────────────────
export function Kapanis({ f, gun, z }) {
  const ac = ara(f, KAPANIS, KAPANIS + 22)
  if (!ac) return null
  const k = z.koyu ? { bg: P.krem, yazi: P.murekkep, soluk: '#4a5570' } : { bg: P.murekkep, yazi: P.krem, soluk: '#cfd6e6' }
  const a = yay(f, KAPANIS + 14), b = yay(f, KAPANIS + 30), c = yay(f, KAPANIS + 48)
  const alti = ara(f, KAPANIS + 55, KAPANIS + 80)
  return <AbsoluteFill style={{ background: k.bg, clipPath: `circle(${ac * 150}% at 85% 88%)` }}>
    <div style={{ position: 'absolute', left: G.sol, width: GEN, top: 470 }}>
      <div style={{ ...gel(a, 40), fontFamily: GOVDE, fontWeight: 600, fontSize: 30, letterSpacing: '.14em', color: P.amber }}>
        {gun.soru ? 'YORUMLARA YAZ' : 'HER GÜN BİR VİDEO'}</div>
      <Baslik metin={gun.soru ? 'Senin sıran.' : 'Yarın yine buradayız.'} boyut={132} renk={k.yazi} stil={{ ...gel(b, 50), marginTop: 20 }} />
      {gun.soru && <div style={{ ...gel(c, 40), position: 'relative', marginTop: 50, fontFamily: EL, fontSize: 76, lineHeight: 1.1, color: k.yazi }}>
        {gun.soru}
        <svg width={GEN} height={40} viewBox={`0 0 ${GEN} 40`} style={{ display: 'block', marginTop: 8, overflow: 'visible' }}>
          <path d={elCizgisi(0, 20, GEN * 0.7, 6, 3)} stroke={P.amber} strokeWidth={10} fill="none" strokeLinecap="round"
            pathLength={1} strokeDasharray={1} strokeDashoffset={1 - alti} />
        </svg>
      </div>}
      {gun.yks_kalan != null && <div style={{ ...gel(c, 40), display: 'inline-block', marginTop: 50, fontFamily: GOVDE, fontWeight: 600,
        fontSize: 32, color: k.yazi, border: `4px solid ${P.amber}`, borderRadius: 999, padding: '12px 28px' }}>YKS'ye {gun.yks_kalan} gün</div>}
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
