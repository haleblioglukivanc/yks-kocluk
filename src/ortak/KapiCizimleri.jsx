import { useAzHareket } from '../lib/mevsim.js'

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

export function TabelaCizimi({ mevsim, ogrenciler = [], zemin = true, yazi = null }) {
  const asili = ogrenciler.slice(0, 3)
  const fazla = ogrenciler.length - asili.length
  return (
    <svg className="kapi-cizim" viewBox="0 0 150 84" aria-hidden="true">
      {zemin && <Zemin mevsim={mevsim} />}
      <rect x="22" y="6" width="6" height="70" rx="2" fill="#6B3D29" />
      <path d="M12 12 H104 L116 26 L104 40 H12 Z" fill="#8C5B45" stroke="#6B3D29" strokeWidth="2" />
      {mevsim === 'kis' && <path d="M12 12 q6 -5 14 -3 q12 -4 24 0 q14 -4 28 0 q14 -3 26 3 z" fill="#FFFFFF" />}
      <text x="62" y="30.5" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="12.5" fontWeight="600" fill="#FFF6EC">
        {yazi ?? `${ogrenciler.length} öğrenci`}
      </text>
      {asili.map((o, i) => {
        const x = asili.length === 1 ? 66 : 42 + i * 24
        return (
          <g key={o.bas + i}>
            <line x1={x} y1="40" x2={x} y2="47" stroke="#6B3D29" strokeWidth="1.4" />
            <circle cx={x} cy="57" r="10" fill="#F4DDCC" stroke={HALKA[o.durum] ?? '#6F625A'} strokeWidth="2.6" />
            <text x={x} y="60.3" textAnchor="middle" fontFamily="Manrope, sans-serif" fontSize="7.5" fontWeight="800" fill="#2A211D">{o.bas}</text>
          </g>
        )
      })}
      {fazla > 0 && (
        <text x={42 + 3 * 24 - 4} y="60.5" fontFamily="Manrope, sans-serif" fontSize="10" fontWeight="800" fill="var(--m-soluk)">+{fazla}</text>
      )}
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
export function PortreCizimi({ mevsim, foto = null, bas = '', durum = null, idEk = 'p' }) {
  const kirp = `portre-${idEk}`
  const halka = HALKA[durum] ?? '#6F625A'
  return (
    <svg className="kapi-cizim" viewBox="0 0 120 112" aria-hidden="true">
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
        <image href={foto} x="45" y="33" width="54" height="54" preserveAspectRatio="xMidYMid slice" clipPath={`url(#${kirp})`} />
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
    </svg>
  )
}
