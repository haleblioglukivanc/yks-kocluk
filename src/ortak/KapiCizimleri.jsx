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

export function TabelaCizimi({ mevsim, ogrenciler = [], zemin = true }) {
  const asili = ogrenciler.slice(0, 3)
  const fazla = ogrenciler.length - asili.length
  return (
    <svg className="kapi-cizim" viewBox="0 0 150 84" aria-hidden="true">
      {zemin && <Zemin mevsim={mevsim} />}
      <rect x="22" y="6" width="6" height="70" rx="2" fill="#6B3D29" />
      <path d="M12 12 H104 L116 26 L104 40 H12 Z" fill="#8C5B45" stroke="#6B3D29" strokeWidth="2" />
      {mevsim === 'kis' && <path d="M12 12 q6 -5 14 -3 q12 -4 24 0 q14 -4 28 0 q14 -3 26 3 z" fill="#FFFFFF" />}
      <text x="62" y="30.5" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="12.5" fontWeight="600" fill="#FFF6EC">
        {ogrenciler.length} öğrenci
      </text>
      {asili.map((o, i) => {
        const x = 42 + i * 24
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
