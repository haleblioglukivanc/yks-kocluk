import { useMevsim, useAzHareket } from '../lib/mevsim.js'

/* Mevsim sahnesi (22 Eylül 2026, Bekir: "mevsim yalnız üst barda
   duruyor; brifte uygulama komple bir sahnenin içinde yaşıyordu").
   Sayfanın arkasında sabit duran katman: gökten zemine akan renk,
   ekranın dibinde soluk bir ufuk ve bütün ekrana yayılan birkaç
   parçacık (yaprak, kar, çiçek yaprağı, ışık). İçerik bunun üstünde
   yarı saydam kâğıtlarda durur; kaydırdıkça sahne yerinde kalır.
   Hareket azaltma tercihinde parçacıklar hiç çizilmez. */

/* [sol %, süre sn, gecikme sn, boy px, sürüklenme px] */
const PARCACIK = [
  [6, 19, -3, 12, 40], [18, 24, -14, 9, -30], [31, 21, -8, 11, 50], [44, 27, -20, 8, -40],
  [57, 22, -5, 12, 30], [69, 26, -17, 9, -50], [81, 20, -11, 11, 35], [92, 25, -2, 8, -25],
]

export function MevsimIsareti({ mevsim, boyut = 18 }) {
  const ortak = { width: boyut, height: boyut, viewBox: '0 0 24 24', 'aria-hidden': true }
  if (mevsim === 'kis')
    return (
      <svg {...ortak} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5" />
      </svg>
    )
  if (mevsim === 'yaz')
    return (
      <svg {...ortak} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="12" cy="12" r="4.2" fill="currentColor" fillOpacity=".25" />
        <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" />
      </svg>
    )
  if (mevsim === 'ilkbahar')
    return (
      <svg {...ortak} fill="currentColor">
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse key={a} cx="12" cy="7" rx="3.2" ry="4.4" opacity=".75" transform={`rotate(${a} 12 12)`} />
        ))}
        <circle cx="12" cy="12" r="2.2" fill="#fff" />
      </svg>
    )
  return (
    <svg {...ortak} fill="currentColor">
      <path d="M19.5 4.5C11 4.5 5 8.5 5 15c0 1.7.5 3 1.2 4 .6-3.6 3-6.8 7.3-8.6-3.4 2.4-5.5 5.3-6.1 8.9 1 .4 2 .6 3.1.6 6.3 0 9-6.6 9-15.4z" />
    </svg>
  )
}

/* Tepenin sağ üst köşesinden sarkan mevsim dalı. Manzaranın kendisi
   dar ekranda ortadan kırpıldığı için dal ayrı çizilir. */
export function MevsimDali({ mevsim }) {
  const az = useAzHareket()
  const salin = az ? '' : ' sahne-dal--salin'
  if (mevsim === 'kis')
    return (
      <svg className={`sahne-dal${salin}`} viewBox="0 0 200 160" aria-hidden="true">
        <path d="M205 12 C 160 20 120 36 70 70" stroke="#5a4034" strokeWidth="5" fill="none" strokeLinecap="round" />
        {[[170, 22], [140, 32], [112, 46], [88, 60]].map(([x, y], i) => (
          <g key={x}>
            <path d={`M${x} ${y} l -18 ${26 - i * 2} l 36 0 z`} fill="#3f5b57" />
            <path d={`M${x} ${y} l -9 ${13 - i} l 18 0 z`} fill="#fff" />
          </g>
        ))}
        <circle cx="96" cy="92" r="6" fill="#c8952e" opacity=".85" />
      </svg>
    )
  if (mevsim === 'yaz')
    return (
      <svg className={`sahne-dal${salin}`} viewBox="0 0 200 160" aria-hidden="true">
        <path d="M210 -4 C 170 30 140 60 120 110" stroke="#6b8f5c" strokeWidth="4" fill="none" strokeLinecap="round" />
        {[[180, 22, -30], [160, 44, -48], [142, 68, -62], [128, 92, -75]].map(([x, y, a]) => (
          <ellipse key={x} cx={x - 26} cy={y + 6} rx="30" ry="7" fill="#7fa86b" transform={`rotate(${a} ${x} ${y})`} />
        ))}
      </svg>
    )
  const renkler = mevsim === 'ilkbahar' ? ['#f2bcc6', '#f7d4da', '#e8a3b1'] : ['#d8742c', '#e4a43c', '#c8572a']
  const cicek = mevsim === 'ilkbahar'
  return (
    <svg className={`sahne-dal${salin}`} viewBox="0 0 200 160" aria-hidden="true">
      <path d="M210 8 C 170 14 130 30 96 58 M150 22 C 140 40 138 56 142 74 M118 40 C 104 52 96 66 94 84" stroke="#6b3d29" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      {[[176, 12], [160, 30], [132, 30], [146, 58], [140, 78], [110, 48], [98, 70], [92, 90], [120, 20], [84, 58]].map(([x, y], i) =>
        cicek ? (
          <circle key={`${x}${y}`} cx={x} cy={y} r={8 - (i % 3)} fill={renkler[i % 3]} />
        ) : (
          <ellipse key={`${x}${y}`} cx={x} cy={y} rx="9" ry="5" fill={renkler[i % 3]} transform={`rotate(${(i * 47) % 180} ${x} ${y})`} />
        ),
      )}
    </svg>
  )
}

export default function MevsimSahnesi() {
  const mevsim = useMevsim()
  const az = useAzHareket()
  return (
    <div className="sahne" data-mevsim={mevsim} aria-hidden="true">
      <svg className="sahne-ufuk" viewBox="0 0 1440 200" preserveAspectRatio="none">
        <path d="M0 110 C 220 60 420 90 640 80 C 860 70 1040 40 1240 70 C 1340 84 1400 80 1440 76 L1440 200 L0 200 Z" fill="var(--m-ufuk-1)" />
        <path d="M0 150 C 260 118 480 146 720 138 C 960 130 1180 156 1440 136 L1440 200 L0 200 Z" fill="var(--m-ufuk-2)" />
      </svg>
      {!az && (
        <div className="sahne-parcaciklar">
          {PARCACIK.map(([sol, sure, gec, boy, kay], i) => (
            <i
              key={i}
              className={`sahne-p sahne-p--${mevsim}${i % 2 ? ' sahne-p--ikinci' : ''}`}
              style={{ left: `${sol}%`, width: boy, height: mevsim === 'sonbahar' ? boy * 0.62 : boy, animationDuration: `${sure}s`, animationDelay: `${gec}s`, '--kay': `${kay}px` }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
