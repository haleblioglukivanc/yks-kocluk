import { useEffect, useId, useRef } from 'react'
import { useAzHareket } from '../lib/mevsim.js'

/* Tepedeki mevsim manzarası. Elle çizilmiş katmanlı SVG: gökyüzü, uzak
   tepeler, yakın plan, parçacıklar. Kutusunu doldurur (xMidYMax slice),
   dar ekranda ortası kalır. Hareketler hissedilir ama dikkat çekmez;
   hareket azaltma tercihinde hepsi kapanır ve manzara durağan çizilir. */


export default function Manzara({ mevsim = 'sonbahar' }) {
  const az = useAzHareket()
  const kutu = useRef(null)
  /* Tepe ekrandan çıkınca (aşağı kaydırıldığında) ya da sekme arka
     plandayken bütün SVG hareketleri durur; işlemci boşuna çalışmasın. */
  useEffect(() => {
    const el = kutu.current
    if (!el || az) return
    let gorunur = true
    const uygula = () => {
      const svg = el.querySelector('svg')
      if (!svg?.pauseAnimations) return
      if (gorunur && document.visibilityState === 'visible') svg.unpauseAnimations()
      else svg.pauseAnimations()
    }
    const io = new IntersectionObserver(([g]) => { gorunur = g.isIntersecting; uygula() })
    io.observe(el)
    document.addEventListener('visibilitychange', uygula)
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', uygula) }
  }, [az, mevsim])
  const id = useId().replace(/:/g, '')
  /* Hareket öğeleri: az hareket tercihinde hiç çizilmez. */
  const Kay = (p) => (az ? null : <animateTransform attributeName="transform" repeatCount="indefinite" {...p} />)
  const Oyna = (p) => (az ? null : <animate repeatCount="indefinite" {...p} />)
  const svg = (icerik) => (
    <svg viewBox="0 0 1440 320" preserveAspectRatio="xMidYMax slice" width="100%" height="100%" style={{ display: 'block' }} aria-hidden="true">
      {icerik}
    </svg>
  )
  const gok = (ust, alt) => (
    <>
      <defs>
        <linearGradient id={`gok${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={ust} />
          <stop offset="1" stopColor={alt} />
        </linearGradient>
      </defs>
      <rect width="1440" height="320" fill={`url(#gok${id})`} />
    </>
  )
  const bulut = (renk, sure = '46s') => (
    <g opacity="0.85">
      <Kay type="translate" values="0 0;36 0;0 0" dur={sure} />
      <ellipse cx="300" cy="70" rx="70" ry="15" fill={renk} />
      <ellipse cx="340" cy="60" rx="40" ry="13" fill={renk} />
      <ellipse cx="780" cy="52" rx="56" ry="12" fill={renk} />
    </g>
  )
  const UZAK = 'M0 200 C 180 150 320 172 480 160 C 640 148 760 118 920 140 C 1080 162 1240 128 1440 150 L1440 320 L0 320 Z'
  const ORTA = 'M0 236 C 200 204 360 218 520 206 C 700 194 820 226 1000 212 C 1180 198 1300 218 1440 206 L1440 320 L0 320 Z'
  const YAKIN = 'M0 282 C 240 262 420 286 620 279 C 820 271 1040 292 1240 277 C 1330 271 1400 275 1440 273 L1440 320 L0 320 Z'

  /* Ağaç: gövde + taç. Salınım isteğe bağlı. */
  const agac = (x, taban, taç, rx, ry, sal) => (
    <g key={`${x}-${taban}`}>
      {sal && <Kay type="rotate" values={`-1.2 ${x} ${taban};1.2 ${x} ${taban};-1.2 ${x} ${taban}`} dur={sal} />}
      <rect x={x - 3} y={taban - ry - 10} width="6" height={ry + 10} fill="#6B3D29" />
      <ellipse cx={x} cy={taban - ry - 18} rx={rx} ry={ry} fill={taç} />
    </g>
  )
  const YAPRAK = 'M0 0 C 4 -6 10 -6 13 0 C 10 6 4 6 0 0 Z'
  const dusen = (d, renk, x, sure, bas) => (
    <path key={`${x}-${bas}`} d={d} fill={renk} opacity={az ? 0 : 1}>
      <Kay type="translate" values={`${x} -20;${x + 40} 150;${x + 12} 330`} dur={sure} begin={bas} />
      <Kay type="rotate" values="0;180;360" dur={sure} begin={bas} additive="sum" />
    </path>
  )

  let icerik = null
  if (mevsim === 'sonbahar') {
    icerik = svg(
      <>
        {gok('#F3CDA3', '#FBF1E6')}
        <circle cx="1010" cy="92" r="46" fill="#F2AE6C" opacity="0.5" />
        {bulut('#FFF6EC')}
        <path d={UZAK} fill="#E0B597" />
        <path d={ORTA} fill="#C7825D" />
        <path d="M380 262 C 520 249 900 249 1080 262 C 900 275 520 275 380 262 Z" fill="#A8C1C7" />
        <path d="M470 261 L 640 261 M 760 264 L 930 264" stroke="#D8E5E8" strokeWidth="2" strokeLinecap="round" />
        <path d={YAKIN} fill="#8D5236" />
        {agac(480, 282, '#D8742C', 26, 34, '7s')}
        {agac(528, 282, '#E4A43C', 19, 25)}
        {agac(952, 280, '#C8572A', 27, 35, '8s')}
        {agac(1000, 280, '#E4A43C', 19, 24)}
        {agac(230, 284, '#E4A43C', 24, 31)}
        {agac(1210, 280, '#D8742C', 25, 32)}
        {agac(1260, 280, '#C8572A', 18, 23)}
        {dusen(YAPRAK, '#D8742C', 560, '12s', '-2s')}
        {dusen(YAPRAK, '#E4A43C', 820, '14s', '-8s')}
        {dusen(YAPRAK, '#C8572A', 700, '11s', '-5s')}
        {dusen(YAPRAK, '#D8742C', 1080, '15s', '-11s')}
      </>,
    )
  } else if (mevsim === 'kis') {
    const cam = (x, t, renk, sal) => (
      <g key={x}>
        {sal && <Kay type="rotate" values={`-1 ${x} ${t};1 ${x} ${t};-1 ${x} ${t}`} dur={sal} />}
        <polygon points={`${x},${t - 78} ${x + 20},${t - 34} ${x - 20},${t - 34}`} fill={renk} />
        <polygon points={`${x},${t - 56} ${x + 28},${t - 8} ${x - 28},${t - 8}`} fill={renk} />
        <polygon points={`${x},${t - 78} ${x + 8},${t - 60} ${x - 8},${t - 60}`} fill="#FFFFFF" />
        <rect x={x - 3} y={t - 8} width="6" height="8" fill="#5A4034" />
      </g>
    )
    const kar = [80, 190, 300, 410, 520, 610, 690, 760, 840, 930, 1020, 1110, 1200, 1290, 1370]
    icerik = svg(
      <>
        {gok('#C5D5EA', '#EFF4F9')}
        {bulut('#F5F8FC', '50s')}
        <polygon points="0,212 160,122 260,170 420,90 560,180 700,110 860,190 1000,100 1160,175 1300,120 1440,190 1440,320 0,320" fill="#A9BBD3" />
        <polygon points="420,90 446,110 430,106 418,114 404,106 394,110" fill="#FFFFFF" />
        <polygon points="700,110 724,128 710,124 698,131 686,124 676,128" fill="#FFFFFF" />
        <polygon points="1000,100 1026,120 1011,116 998,124 985,116 974,120" fill="#FFFFFF" />
        <polygon points="160,122 182,140 168,137 158,144 146,137 138,140" fill="#FFFFFF" />
        <path d="M0 238 C 260 205 520 226 760 218 C 1000 210 1240 232 1440 216 L1440 320 L0 320 Z" fill="#DCE5F0" />
        <path d="M0 262 C 280 236 520 256 760 250 C 1000 244 1240 262 1440 250 L1440 320 L0 320 Z" fill="#F9FBFE" />
        {cam(300, 256, '#3F5B57')}
        {cam(342, 250, '#4A6863', '6s')}
        {cam(560, 254, '#3F5B57')}
        {cam(1080, 250, '#3F5B57', '7s')}
        {cam(1124, 254, '#4A6863')}
        {cam(1250, 250, '#3F5B57')}
        <circle cx="830" cy="232" r="30" fill="#F2B84B" opacity="0.16" />
        <rect x="772" y="212" width="84" height="42" fill="#8C5B45" />
        <rect x="838" y="182" width="10" height="22" fill="#6E4636" />
        <polygon points="760,215 814,180 868,215" fill="#FFFFFF" stroke="#CFD9E6" strokeWidth="2" />
        <rect x="790" y="228" width="16" height="26" fill="#5E3B2C" />
        <rect x="820" y="224" width="20" height="16" rx="2" fill="#F2B84B">
          <Oyna attributeName="opacity" values="0.75;1;0.75" dur="4s" />
        </rect>
        {!az && [0, -2, -4].map((b, i) => (
          <circle key={b} cx="843" cy="174" r={[7, 9, 6][i]} fill="#FFFFFF" opacity="0.7">
            <Kay type="translate" values="0 0;14 -60" dur="6s" begin={`${b}s`} />
            <Oyna attributeName="opacity" values="0.7;0" dur="6s" begin={`${b}s`} />
          </circle>
        ))}
        {!az && kar.map((x, i) => (
          <circle key={x} cx={x} cy="0" r={2 + (i % 3) * 0.5} fill="#FFFFFF">
            <Kay type="translate" values={`0 -20;${(i % 2 ? -1 : 1) * (8 + (i % 4) * 3)} 340`} dur={`${10 + (i % 6)}s`} begin={`-${(i * 7) % 12}s`} />
          </circle>
        ))}
      </>,
    )
  } else if (mevsim === 'ilkbahar') {
    const cicekAgac = (x, t, a, b, sal) => (
      <g key={x}>
        {sal && <Kay type="rotate" values={`-1 ${x} ${t};1 ${x} ${t};-1 ${x} ${t}`} dur={sal} />}
        <rect x={x - 3} y={t - 44} width="6" height="44" fill="#7A5A45" />
        <circle cx={x} cy={t - 56} r="30" fill={a} />
        <circle cx={x + 22} cy={t - 42} r="20" fill={b} />
        <circle cx={x - 22} cy={t - 40} r="18" fill={b} />
        <circle cx={x - 8} cy={t - 66} r="3" fill="#FFFFFF" />
        <circle cx={x + 12} cy={t - 54} r="3" fill="#FFFFFF" />
      </g>
    )
    const cicek = [[420, 296, '#F2A7B5'], [452, 304, '#FFFFFF'], [590, 298, '#F6D36B'], [640, 306, '#F2A7B5'], [700, 300, '#FFFFFF'], [760, 296, '#F2A7B5'], [820, 304, '#F6D36B'], [880, 298, '#FFFFFF'], [930, 306, '#F2A7B5'], [1080, 300, '#FFFFFF'], [1140, 306, '#F2A7B5'], [300, 304, '#F6D36B']]
    icerik = svg(
      <>
        {gok('#CDE4EE', '#F4F7EC')}
        <circle cx="1040" cy="86" r="44" fill="#F6E09A" opacity="0.7" />
        {bulut('#FFFFFF', '44s')}
        <path d={UZAK} fill="#C2D8B0" />
        <path d={ORTA} fill="#9CC089" />
        <path d={YAKIN} fill="#7EA66B" />
        {cicekAgac(500, 278, '#F2BCC6', '#F7D4DA', '7s')}
        {cicekAgac(1000, 274, '#F7D4DA', '#F2BCC6')}
        {cicekAgac(250, 280, '#F2BCC6', '#F7D4DA')}
        {cicek.map(([x, y, r]) => <circle key={`${x}${y}`} cx={x} cy={y} r="3" fill={r} />)}
        {!az && [[620, '13s', '-3s'], [860, '15s', '-9s'], [740, '12s', '-6s']].map(([x, s, b]) => (
          <ellipse key={x} cx="0" cy="0" rx="4.5" ry="2.6" fill="#F4B9C3">
            <Kay type="translate" values={`${x} -10;${x + 60} 150;${x + 30} 330`} dur={s} begin={b} />
          </ellipse>
        ))}
      </>,
    )
  } else {
    icerik = svg(
      <>
        {gok('#9AD2E7', '#EAF6F2')}
        <circle cx="1010" cy="86" r="72" fill="#F8C95E" opacity="0.18" />
        <circle cx="1010" cy="86" r="48" fill="#F8C95E">
          <Oyna attributeName="r" values="46;51;46" dur="7s" />
        </circle>
        {bulut('#FFFFFF', '44s')}
        <g fill="none" stroke="#2C4A55" strokeWidth="2" strokeLinecap="round">
          <Kay type="translate" values="0 0;120 -10;240 0" dur="30s" />
          <path d="M600 112 q 7 -7 14 0 q 7 -7 14 0" />
          <path d="M634 98 q 5 -5 10 0 q 5 -5 10 0" />
        </g>
        <path d="M0 206 C 120 168 260 176 400 206 L400 320 L0 320 Z" fill="#8DBBA8" />
        <path d="M1020 206 C 1150 160 1320 166 1440 188 L1440 320 L1020 320 Z" fill="#8DBBA8" />
        <rect x="0" y="206" width="1440" height="114" fill="#3C98B1" />
        <rect x="0" y="206" width="1440" height="9" fill="#79BFCF" />
        <g fill="none" stroke="#BFE3EA" strokeWidth="2" strokeLinecap="round">
          <Kay type="translate" values="0 0;-48 0;0 0" dur="9s" />
          {[[460, 230], [900, 236], [600, 262], [1080, 252], [300, 248], [780, 272]].map(([x, y]) => (
            <path key={x} d={`M${x} ${y} q 12 -6 24 0 t 24 0`} />
          ))}
        </g>
        <g>
          <Kay type="rotate" values="-2.5 725 252;2.5 725 252;-2.5 725 252" dur="5s" />
          <path d="M690 244 L760 244 L748 256 L702 256 Z" fill="#1B4C5C" />
          <path d="M724 242 L724 180 L758 240 Z" fill="#FFFFFF" />
          <path d="M720 242 L720 196 L698 240 Z" fill="#F4E6CE" />
        </g>
        <path d="M0 290 C 300 275 600 296 900 286 C 1150 278 1320 291 1440 285 L1440 320 L0 320 Z" fill="#F1DCAE" />
      </>,
    )
  }

  return <div className="manzara" ref={kutu}>{icerik}</div>
}
