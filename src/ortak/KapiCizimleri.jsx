import { useId } from 'react'
import { useAzHareket } from '../lib/mevsim.js'
import { useFotograf } from '../bilesenler/Fotograf.jsx'

/* Koç kapı kartlarının çizimleri (22 Eylül 2026, Bekir: "tabela ve kutu
   çok tatlıydı, kartlara koyalım"). Kartın üst kısmında küçük bir mevsim
   zemini; üstünde Öğrenciler tabelası ya da Yapılacaklar posta kutusu.
   Zeminin süsü mevsime göre: kar, çiçek, ot, yaprak. */

const HALKA = { acil: '#BE2847', izle: '#8F5A00', iyi: '#2D7A4E' }

function Zemin({ mevsim }) {
  const susler =
    mevsim === 'kis'
      ? [[18, '#FFFFFF'], [44, '#FFFFFF'], [104, '#FFFFFF'], [132, '#FFFFFF']].map(([x, r]) => <ellipse key={x} cx={x} cy="76" rx="9" ry="2.5" fill={r} />)
      : mevsim === 'ilkbahar'
        ? [[16, '#F2A7B5'], [30, '#FFFFFF'], [110, '#F6D36B'], [128, '#F2A7B5'], [138, '#FFFFFF']].map(([x, r]) => (
            <g key={x}><line x1={x} y1="74" x2={x} y2="79" stroke="#6E8C4F" strokeWidth="1.2" /><circle cx={x} cy="73" r="2.6" fill={r} /></g>
          ))
        : mevsim === 'yaz'
          ? [18, 36, 112, 134].map((x) => <path key={x} d={`M${x} 79 q-2 -6 -4 -8 M${x} 79 q0 -7 1 -9 M${x} 79 q2 -5 5 -7`} stroke="#7FA86B" strokeWidth="1.6" fill="none" strokeLinecap="round" />)
          : [[16, '#D8742C', 20], [30, '#E4A43C', -30], [112, '#C8572A', 40], [132, '#E4A43C', -10]].map(([x, r, a]) => (
              <ellipse key={x} cx={x} cy="76" rx="4.5" ry="2.3" fill={r} transform={`rotate(${a} ${x} 76)`} />
            ))
  return (
    <>
      <path d="M0 74 C 40 69 100 71 150 70 L150 84 L0 84 Z" fill="var(--m-on-zemin)" />
      {susler}
    </>
  )
}

/* Tabelaya asılı tek öğrenci: fotoğrafı varsa o, yoksa baş harfleri. */
function AsiliBas({ x, o }) {
  const foto = useFotograf(o.yol)
  const id = useId().replace(/:/g, '')
  return (
    <g>
      <line x1={x} y1="40" x2={x} y2="47" stroke="#6B3D29" strokeWidth="1.4" />
      <circle cx={x} cy="57" r="10" fill="#F4DDCC" />
      {foto ? (
        <>
          <clipPath id={`as${id}`}><circle cx={x} cy="57" r="10" /></clipPath>
          <image className="portre-foto" href={foto} x={x - 10} y="47" width="20" height="20" preserveAspectRatio="xMidYMid slice" clipPath={`url(#as${id})`} />
        </>
      ) : (
        <text x={x} y="60.3" textAnchor="middle" fontFamily="Manrope, sans-serif" fontSize="7.5" fontWeight="800" fill="#2A211D">{o.bas}</text>
      )}
      <circle cx={x} cy="57" r="10" fill="none" stroke={HALKA[o.durum] ?? '#6F625A'} strokeWidth="2.6" />
    </g>
  )
}

export function TabelaCizimi({ mevsim, ogrenciler = [], zemin = true, yazi = null, canli = false }) {
  const asili = ogrenciler.slice(0, 3)
  const fazla = ogrenciler.length - asili.length
  return (
    <svg className="kapi-cizim" viewBox="0 0 150 84" aria-hidden="true" style={canli ? { overflow: 'visible' } : undefined}>
      {zemin && <Zemin mevsim={mevsim} />}
      <rect x="22" y="6" width="6" height="70" rx="2" fill="#6B3D29" />
      <path d="M12 12 H104 L116 26 L104 40 H12 Z" fill="#8C5B45" stroke="#6B3D29" strokeWidth="2" />
      {mevsim === 'kis' && <path d="M12 12 q6 -5 14 -3 q12 -4 24 0 q14 -4 28 0 q14 -3 26 3 z" fill="#FFFFFF" />}
      <text x="62" y="30.5" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="12.5" fontWeight="600" fill="#FFF6EC">
        {yazi ?? `${ogrenciler.length} öğrenci`}
      </text>
      {asili.map((o, i) => (
        <AsiliBas key={o.bas + i} x={asili.length === 1 ? 66 : 42 + i * 24} o={o} />
      ))}
      {fazla > 0 && (
        <text x={42 + 3 * 24 - 4} y="60.5" fontFamily="Manrope, sans-serif" fontSize="10" fontWeight="800" fill="var(--m-soluk)">+{fazla}</text>
      )}
      {canli && <TabelaCanlisi mevsim={mevsim} x={88} y={12} olcek={0.6} />}
    </svg>
  )
}

export function PostaKutusuCizimi({ mevsim, sayi = 0, acil = false, zemin = true }) {
  const az = useAzHareket()
  return (
    <svg className="kapi-cizim" viewBox="0 0 150 84" aria-hidden="true">
      {zemin && <Zemin mevsim={mevsim} />}
      <rect x="52" y="36" width="7" height="40" rx="2" fill="#6B3D29" />
      <path d="M34 22 C34 10 43 6 52 6 H76 C86 6 92 13 92 22 V42 H34 Z" fill="#2E4B5A" />
      <path d="M34 22 C34 10 43 6 52 6 H56 C47 6 41 12 41 22 V42 H34 Z" fill="#253E4A" />
      <rect x="32" y="40" width="62" height="5" rx="2" fill="#253E4A" />
      {mevsim === 'kis' && <path d="M36 12 q8 -8 20 -6 q12 -5 24 -1 q9 -1 12 6 q-28 -3 -56 1 z" fill="#FFFFFF" />}
      {sayi > 0 && <rect x="44" y="16" width="26" height="4" rx="1" fill="#FFF6EC" transform="rotate(-8 44 16)" />}
      <g transform="translate(90 12)">
        <g
          className={sayi > 0 && !az ? 'sk-bayrak' : ''}
          style={sayi > 0 ? undefined : { transform: 'rotate(90deg)', transformOrigin: '1.5px 24px' }}
        >
          <rect x="0" y="0" width="3" height="24" fill="#6B3D29" />
          <path d="M3 0 H19 V10 H3 Z" fill={sayi > 0 ? '#BE2847' : '#8C9CB2'} />
        </g>
      </g>
      {sayi > 0 && (
        <g>
          <circle cx="36" cy="8" r="10.5" fill={acil ? '#BE2847' : '#2A211D'} stroke="var(--m-yuzey)" strokeWidth="2.5" />
          <text x="36" y="12" textAnchor="middle" fontFamily="Manrope, sans-serif" fontSize="11" fontWeight="800" fill="#FFFFFF">{sayi > 9 ? '9+' : sayi}</text>
        </g>
      )}
    </svg>
  )
}

/* Öğrenci detayında tabelanın yerinde: direğe asılı yuvarlak çerçevede
   öğrencinin fotoğrafı (yoksa baş harfleri). Çerçevenin kenarı risk
   renginde; üstü/dibi mevsime göre süslü (22 Eylül 2026, Bekir). */
export function PortreCizimi({ mevsim, foto = null, bas = '', durum = null, idEk = 'p', canli = true }) {
  const kirp = `portre-${idEk}`
  const halka = durum ? (HALKA[durum] ?? '#6F625A') : 'var(--m-vurgu)'
  return (
    <svg className="kapi-cizim portre-cizim" viewBox="0 0 120 112" aria-hidden="true" style={{ overflow: 'visible' }}>
      <defs>
        <clipPath id={kirp}><circle cx="72" cy="60" r="27" /></clipPath>
      </defs>
      {/* direk ve kol */}
      <rect x="16" y="8" width="6" height="100" rx="2" fill="#6B3D29" />
      <rect x="16" y="12" width="64" height="5" rx="2" fill="#6B3D29" />
      <line x1="72" y1="17" x2="72" y2="28" stroke="#6B3D29" strokeWidth="1.6" />
      {/* çerçeve */}
      <circle cx="72" cy="60" r="33" fill="#8C5B45" />
      <circle cx="72" cy="60" r="30" fill="#F4DDCC" stroke={halka} strokeWidth="3.5" />
      {foto ? (
        <image className="portre-foto" href={foto} x="45" y="33" width="54" height="54" preserveAspectRatio="xMidYMid slice" clipPath={`url(#${kirp})`} />
      ) : (
        <text x="72" y="67" textAnchor="middle" fontFamily="Manrope, sans-serif" fontSize="19" fontWeight="800" fill="#2A211D">{bas}</text>
      )}
      {mevsim === 'kis' && (
        <>
          <path d="M14 12 q10 -7 24 -4 q14 -5 28 0 q10 -2 16 4 z" fill="#FFFFFF" />
          <path d="M46 36 q10 -12 26 -12 q16 0 26 12 q-26 -6 -52 0 z" fill="#FFFFFF" />
          <ellipse cx="20" cy="108" rx="12" ry="3" fill="#FFFFFF" />
        </>
      )}
      {mevsim === 'sonbahar' && [[10, 107, '#D8742C', 20], [26, 108, '#E4A43C', -30], [34, 106, '#C8572A', 50]].map(([x, y, r, a]) => (
        <ellipse key={x} cx={x} cy={y} rx="5" ry="2.5" fill={r} transform={`rotate(${a} ${x} ${y})`} />
      ))}
      {mevsim === 'ilkbahar' && [[10, 104, '#F2A7B5'], [28, 105, '#FFFFFF'], [34, 102, '#F6D36B']].map(([x, y, r]) => (
        <g key={x}><line x1={x} y1={y} x2={x} y2={y + 6} stroke="#6E8C4F" strokeWidth="1.2" /><circle cx={x} cy={y} r="2.8" fill={r} /></g>
      ))}
      {mevsim === 'yaz' && [10, 30].map((x) => (
        <path key={x} d={`M${x} 110 q-2 -7 -5 -9 M${x} 110 q0 -8 1 -10 M${x} 110 q3 -6 6 -8`} stroke="#7FA86B" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      ))}
      {canli && <TabelaCanlisi mevsim={mevsim} x={30} y={12} olcek={0.8} />}
    </svg>
  )
}

/* Mesajlar: gökyüzünde süzülen kâğıt uçak; üstünde okunmamış sayısı. */
export function UcakCizimi({ sayi = 0 }) {
  return (
    <svg className="kapi-cizim ucak-cizim" viewBox="0 0 110 60" aria-hidden="true">
      <g className="ucak-suzul">
        <path d="M4 44 C 24 48 38 38 44 32" fill="none" stroke="#FFF6EC" strokeWidth="2" strokeDasharray="3 5" strokeLinecap="round" />
        <path d="M44 32 L90 12 L64 48 L58 36 Z" fill="#FFFDF9" stroke="#8C5B45" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M58 36 L90 12 L66 34 Z" fill="#F4DDCC" stroke="#8C5B45" strokeWidth="1.2" strokeLinejoin="round" />
        {sayi > 0 && (
          <g>
            <circle cx="92" cy="9" r="9" fill="var(--m-vurgu)" stroke="#FFFDF9" strokeWidth="2" />
            <text x="92" y="12.5" textAnchor="middle" fontFamily="Manrope, sans-serif" fontSize="10" fontWeight="800" fill="#fff">{sayi > 9 ? '9+' : sayi}</text>
          </g>
        )}
      </g>
    </svg>
  )
}

/* Bildirimler: direğin kolundan sarkan çan; bekleyen varsa hafifçe sallanır. */
export function CanCizimi({ mevsim, sayi = 0 }) {
  return (
    <svg className="kapi-cizim can-cizim" viewBox="0 0 120 112" aria-hidden="true">
      <rect x="16" y="8" width="6" height="100" rx="2" fill="#6B3D29" />
      <rect x="16" y="12" width="64" height="5" rx="2" fill="#6B3D29" />
      <g className={sayi > 0 ? 'can-salla' : ''}>
        <line x1="70" y1="17" x2="70" y2="30" stroke="#6B3D29" strokeWidth="1.6" />
        <path d="M52 70 C52 48 58 32 70 32 C82 32 88 48 88 70 Z" fill="#E4A43C" stroke="#8F5A00" strokeWidth="2" strokeLinejoin="round" />
        <rect x="48" y="68" width="44" height="6" rx="3" fill="#C98A2A" />
        <circle cx="70" cy="80" r="5" fill="#8F5A00" />
        <path d="M60 44 C 62 38 66 36 70 36" fill="none" stroke="#FFF1C9" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      {sayi > 0 && (
        <g>
          <circle cx="96" cy="36" r="10" fill="#BE2847" stroke="#FFFDF9" strokeWidth="2.5" />
          <text x="96" y="40" textAnchor="middle" fontFamily="Manrope, sans-serif" fontSize="11" fontWeight="800" fill="#fff">{sayi > 9 ? '9+' : sayi}</text>
        </g>
      )}
      {mevsim === 'kis' && <><path d="M14 12 q10 -7 24 -4 q14 -5 28 0 q10 -2 16 4 z" fill="#FFFFFF" /><path d="M56 44 q6 -12 14 -12 q8 0 14 12 q-14 -5 -28 0 z" fill="#FFFFFF" /></>}
      {mevsim === 'sonbahar' && [[10, 107, '#D8742C', 20], [26, 108, '#E4A43C', -30]].map(([x, y, r, a]) => <ellipse key={x} cx={x} cy={y} rx="5" ry="2.5" fill={r} transform={`rotate(${a} ${x} ${y})`} />)}
      {mevsim === 'ilkbahar' && [[10, 104, '#F2A7B5'], [28, 105, '#FFFFFF']].map(([x, y, r]) => <g key={x}><line x1={x} y1={y} x2={x} y2={y + 6} stroke="#6E8C4F" strokeWidth="1.2" /><circle cx={x} cy={y} r="2.8" fill={r} /></g>)}
      {mevsim === 'yaz' && [10, 30].map((x) => <path key={x} d={`M${x} 110 q-2 -7 -5 -9 M${x} 110 q0 -8 1 -10 M${x} 110 q3 -6 6 -8`} stroke="#7FA86B" strokeWidth="1.6" fill="none" strokeLinecap="round" />)}
    </svg>
  )
}

/* Fotoğraf yolundan çerçeve: kişinin kendi portresi (ana ekranlarda). */
export function KisiPortresi({ mevsim, yol, bas, durum = null, idEk = 'kisi' }) {
  const foto = useFotograf(yol)
  return <PortreCizimi mevsim={mevsim} foto={foto} bas={bas} durum={durum} idEk={idEk} />
}

/* Öğrencinin Yol kapısı: zirvesinde bayrak olan dağ patikası; öğrenci
   patikada, bitirdiği konuların oranı kadar yukarıda. */
export function YolCizimi({ mevsim, oran = 0, seri = 0, zemin = true }) {
  const t = Math.max(0, Math.min(1, oran))
  // patika üzerinde kabaca konum (alttan zirveye)
  const noktalar = [[62, 72], [76, 62], [74, 52], [88, 44], [94, 32], [96, 20]]
  const i = t * (noktalar.length - 1)
  const a = noktalar[Math.floor(i)]
  const b = noktalar[Math.min(noktalar.length - 1, Math.floor(i) + 1)]
  const f = i - Math.floor(i)
  const x = a[0] + (b[0] - a[0]) * f
  const y = a[1] + (b[1] - a[1]) * f
  return (
    <svg className="kapi-cizim" viewBox="0 0 150 84" aria-hidden="true">
      {zemin && <Zemin mevsim={mevsim} />}
      <path d="M44 72 L96 18 L150 72 Z" fill="var(--m-on-zemin)" opacity=".55" />
      {mevsim === 'kis' && <path d="M84 30 L96 18 L108 30 Q 102 27 96 30 Q 90 27 84 30 Z" fill="#FFFFFF" />}
      <path d="M62 72 C 80 62 70 52 88 44 C 100 38 92 30 96 20" fill="none" stroke="#FFF6EC" strokeWidth="4" strokeLinecap="round" strokeDasharray="2 7" />
      <line x1="96" y1="20" x2="96" y2="4" stroke="#6B3D29" strokeWidth="2" />
      <path className="yol-bayrak" d="M96 4 L112 9 L96 14 Z" fill="#BE2847" />
      <circle className="yol-ben" cx={x} cy={y} r="6" fill="#F4DDCC" stroke="var(--m-vurgu)" strokeWidth="2.5" />
      {seri > 0 && (
        <g transform="translate(2 4)">
          <rect width="58" height="18" rx="9" fill="#FFF6EC" stroke="#E4A43C" strokeWidth="1.5" />
          <text x="29" y="12.5" textAnchor="middle" fontFamily="Manrope, sans-serif" fontSize="9.5" fontWeight="800" fill="#8F5A00">{seri} gün üst üste</text>
        </g>
      )}
    </svg>
  )
}

/* Denemeler kapısı: şövalede kara tahta, üstünde son denemelerin net çizgisi. */
export function DenemeCizimi({ mevsim, netler = [], zemin = true }) {
  const son = netler.slice(-4)
  let cizgi = null
  if (son.length >= 2) {
    const en = Math.max(...son), az = Math.min(...son)
    const pay = en - az || 1
    cizgi = son.map((n, i) => `${54 + (i * 46) / (son.length - 1)},${46 - ((n - az) / pay) * 22}`).join(' ')
  }
  const sonNokta = cizgi ? cizgi.split(' ').pop().split(',').map(Number) : null
  return (
    <svg className="kapi-cizim" viewBox="0 0 150 84" aria-hidden="true">
      {zemin && <Zemin mevsim={mevsim} />}
      <line x1="50" y1="74" x2="62" y2="18" stroke="#6B3D29" strokeWidth="3" />
      <line x1="104" y1="74" x2="92" y2="18" stroke="#6B3D29" strokeWidth="3" />
      <rect x="44" y="12" width="66" height="44" rx="4" fill="#2F4A3E" stroke="#6B3D29" strokeWidth="3" />
      {mevsim === 'kis' && <path d="M42 12 q8 -6 18 -4 q14 -4 28 0 q12 -3 24 4 z" fill="#FFFFFF" />}
      {cizgi ? (
        <>
          <polyline className="deneme-tebesir" points={cizgi} fill="none" stroke="#FFF6EC" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" pathLength="100" />
          <circle cx={sonNokta[0]} cy={sonNokta[1]} r="3.5" fill="#F6D36B" />
        </>
      ) : (
        <text x="77" y="38" textAnchor="middle" fontFamily="Manrope, sans-serif" fontSize="9" fontWeight="700" fill="#FFF6EC" opacity=".8">ilk deneme?</text>
      )}
      <rect x="60" y="56" width="34" height="4" rx="2" fill="#6B3D29" />
    </svg>
  )
}

/* ───────────── Tabeladaki canlılar (22 Eylül 2026, mokap onaylı) ─────────────
   Mevsime göre tabelanın çubuğuna konan küçük bir canlı: ilkbaharda kelebek,
   yazın serçe, sonbaharda sincap, kışın kızılgerdan. (x, y) çubuğun üstünde
   canlının ayağının bastığı nokta; olcek çizimin boyu. Bir tur ~35 sn; ekran
   açılınca başlar. Hareket azaltılmışsa canlı çubukta hareketsiz durur.
   Ayrıntı ve ince ayar notları: docs/TABELA-CANLILARI.md */
export function TabelaCanlisi({ mevsim, x, y, olcek = 1 }) {
  const donus = `translate(${x} ${y}) scale(${olcek})`
  if (mevsim === 'ilkbahar') return (
    <g transform={donus} aria-hidden="true">
      <g className="tc tc-kelebek">
        <g transform="translate(4 -14)">
          <ellipse className="tc-kanat" cx="-6" cy="-2" rx="7" ry="9" fill="#F28FB0" />
          <ellipse className="tc-kanat" cx="-5" cy="7" rx="5" ry="5" fill="#F6B8CC" />
          <ellipse className="tc-kanat tc-kanat--sag" cx="6" cy="-2" rx="7" ry="9" fill="#F28FB0" />
          <ellipse className="tc-kanat tc-kanat--sag" cx="5" cy="7" rx="5" ry="5" fill="#F6B8CC" />
          <rect x="-1.2" y="-8" width="2.4" height="18" rx="1.2" fill="#3A2A22" />
          <path d="M-1 -8 q-4 -6 -6 -7 M1 -8 q4 -6 6 -7" stroke="#3A2A22" strokeWidth="1" fill="none" />
        </g>
      </g>
    </g>
  )
  if (mevsim === 'yaz') return (
    <g transform={donus} aria-hidden="true">
      <g className="tc tc-serce">
        <g transform="translate(0 -16)">
          <path d="M-14 4 L-24 0 L-14 -1 Z" fill="#6E4A2E" />
          <ellipse cx="-3" cy="2" rx="12" ry="9" fill="#9A6A43" />
          <ellipse cx="-2" cy="5" rx="8" ry="5" fill="#E9D8BE" />
          <path d="M-8 -1 q6 -5 12 1" stroke="#6E4A2E" strokeWidth="2" fill="none" />
          <g className="tc-serce-bas">
            <circle cx="8" cy="-6" r="7" fill="#9A6A43" />
            <path d="M5 -9 q4 -3 8 0" stroke="#6E4A2E" strokeWidth="2" fill="none" />
            <circle cx="10" cy="-7" r="1.4" fill="#1E1410" />
            <path d="M14 -6 L19 -5 L14 -3 Z" fill="#E4A43C" />
          </g>
          <path d="M-4 10 v5 M2 10 v5" stroke="#6E4A2E" strokeWidth="1.4" />
        </g>
      </g>
    </g>
  )
  if (mevsim === 'kis') return (
    <g transform={donus} aria-hidden="true">
      <g className="tc tc-gerdan">
        <g transform="translate(2 -18)">
          <g className="tc-gerdan-govde">
            <path d="M-14 4 L-22 8 L-14 8 Z" fill="#6D5A4B" />
            <circle cx="0" cy="2" r="12" fill="#7A6453" />
            <circle cx="3" cy="4" r="8" fill="#D9573A" />
            <circle cx="5" cy="-6" r="1.5" fill="#1E1410" />
            <path d="M10 -4 L15 -3 L10 -1.5 Z" fill="#3A2A22" />
            <path d="M-8 0 q4 -6 10 -4" stroke="#5E4C3F" strokeWidth="2" fill="none" />
          </g>
          <path d="M-3 13 v3 M3 13 v3" stroke="#5E4C3F" strokeWidth="1.3" />
        </g>
      </g>
      {[[-6, -6], [4, 4], [12, -2], [20, 6], [28, 0]].map(([kx, dx], i) => (
        <circle key={i} className="tc-kar" cx={kx} cy="2" r={1.6 + (i % 2)} fill="#FFFFFF" style={{ '--tc-x': `${dx}px`, animationDelay: `${i * 0.08}s` }} />
      ))}
    </g>
  )
  return (
    <g transform={donus} aria-hidden="true">
      <g className="tc tc-sincap">
        <g transform="translate(-2 -20)">
          <path className="tc-kuyruk" d="M-8 10 C -26 8 -30 -12 -18 -20 C -10 -24 -6 -14 -12 -10 C -18 -6 -14 4 -4 6 Z" fill="#B8642E" />
          <ellipse cx="0" cy="8" rx="9" ry="11" fill="#C9763A" />
          <ellipse cx="2" cy="11" rx="5" ry="6" fill="#F0D2A8" />
          <circle cx="6" cy="-4" r="7" fill="#C9763A" />
          <path d="M2 -10 l1 -6 l3 5 Z M8 -10 l2 -6 l2 6 Z" fill="#B8642E" />
          <circle cx="8" cy="-5" r="1.4" fill="#1E1410" />
          <circle cx="12.5" cy="-2" r="1" fill="#1E1410" />
          <g transform="translate(12 3)"><ellipse cx="0" cy="2" rx="3.2" ry="4" fill="#8A5A2B" /><path d="M-3.4 -0.5 q3.4 -3 6.8 0 z" fill="#5E3B1C" /></g>
        </g>
      </g>
      <path className="tc-yaprak" d="M30 -12 c3 -5 8 -5 10 0 c-2 5 -7 5 -10 0z" fill="#D8742C" />
    </g>
  )
}
