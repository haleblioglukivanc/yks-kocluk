import { useAzHareket } from '../lib/mevsim.js'

/* Koç ana ekranında gezinme sahnenin içinde (22 Eylül 2026, Bekir'in
   onayladığı mokap): patikanın solunda "Öğrenciler" tabelası, sağında
   Yapılacaklar posta kutusu. İş varken kutunun kırmızı bayrağı kalkık,
   yoksa iner. Nesneler her mevsim aynı; üstlerindeki kar, çiçek, yaprak
   mevsime göre değişir. Ön plan zemini tam genişlik, nesneler ortada. */

const HALKA = { acil: '#BE2847', izle: '#8F5A00', iyi: '#2D7A4E' }

function Suslemeler({ mevsim }) {
  if (mevsim === 'kis')
    return (
      <>
        {/* tabela ve kutunun üstünde kar */}
        <path d="M70 124 q6 -6 14 -4 q10 -5 22 -1 q14 -4 28 1 q14 -4 26 2 q8 -1 12 4 z" fill="#FFFFFF" />
        <path d="M286 118 q8 -7 20 -5 q12 -5 26 -1 q10 -2 16 4 z" fill="#FFFFFF" />
        <ellipse cx="82" cy="196" rx="20" ry="4" fill="#FFFFFF" />
        <ellipse cx="310" cy="196" rx="18" ry="4" fill="#FFFFFF" />
      </>
    )
  if (mevsim === 'ilkbahar')
    return (
      <>
        {[[66, 192, '#F2A7B5'], [74, 196, '#FFFFFF'], [92, 193, '#F6D36B'], [298, 194, '#F2A7B5'], [318, 192, '#FFFFFF'], [326, 196, '#F2A7B5']].map(([x, y, r]) => (
          <g key={`${x}${y}`}>
            <line x1={x} y1={y} x2={x} y2={y + 6} stroke="#6E8C4F" strokeWidth="1.5" />
            <circle cx={x} cy={y} r="3.4" fill={r} />
          </g>
        ))}
      </>
    )
  if (mevsim === 'yaz')
    return (
      <>
        {[[62, 196], [98, 194], [300, 196], [330, 194]].map(([x, y]) => (
          <path key={x} d={`M${x} ${y} q-3 -9 -6 -12 M${x} ${y} q0 -10 1 -14 M${x} ${y} q3 -8 7 -11`} stroke="#7FA86B" strokeWidth="2" fill="none" strokeLinecap="round" />
        ))}
      </>
    )
  return (
    <>
      {[[64, 196, '#D8742C', 20], [80, 198, '#E4A43C', -30], [98, 195, '#C8572A', 50], [296, 197, '#E4A43C', 10], [322, 195, '#D8742C', -40]].map(([x, y, r, a]) => (
        <ellipse key={`${x}${y}`} cx={x} cy={y} rx="6" ry="3" fill={r} transform={`rotate(${a} ${x} ${y})`} />
      ))}
    </>
  )
}

export default function SahneKapilari({ mevsim, ogrenciler = [], ogrenciEtiket, isSayisi = 0, acilVar = false, onOgrenciler, onYapilacaklar }) {
  const az = useAzHareket()
  const asili = ogrenciler.slice(0, 3)
  const fazla = ogrenciler.length - asili.length
  return (
    <div className="sk">
      <svg className="sk-zemin" viewBox="0 0 1440 140" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 26 C 260 6 520 30 760 20 C 1000 10 1240 30 1440 18 L1440 140 L0 140 Z" fill="var(--m-on-zemin)" />
      </svg>
      <div className="sk-nesneler">
        <svg viewBox="0 0 400 210" aria-hidden="true">
          {/* patika */}
          <path d="M205 210 C 200 180 240 160 226 138 C 214 120 196 116 204 96" fill="none" stroke="var(--m-patika)" strokeWidth="22" strokeLinecap="round" />
          <path d="M205 210 C 200 180 240 160 226 138 C 214 120 196 116 204 96" fill="none" stroke="var(--m-patika-2)" strokeWidth="9" strokeLinecap="round" strokeDasharray="2 14" />

          {/* Öğrenciler tabelası */}
          <rect x="79" y="112" width="7" height="92" rx="2" fill="#6B3D29" />
          <path d="M70 124 H170 L184 140 L170 156 H70 Z" fill="#8C5B45" stroke="#6B3D29" strokeWidth="2" />
          <text x="124" y="145" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="14" fontWeight="600" fill="#FFF6EC">Öğrenciler</text>
          {asili.map((o, i) => {
            const x = 96 + i * 26
            return (
              <g key={o.bas + i}>
                <line x1={x} y1="156" x2={x} y2="164" stroke="#6B3D29" strokeWidth="1.5" />
                <circle cx={x} cy="175" r="10.5" fill="#F4DDCC" stroke={HALKA[o.durum] ?? '#6F625A'} strokeWidth="2.6" />
                <text x={x} y="178.5" textAnchor="middle" fontFamily="Manrope, sans-serif" fontSize="8" fontWeight="800" fill="#2A211D">{o.bas}</text>
              </g>
            )
          })}
          {fazla > 0 && (
            <text x={96 + 3 * 26} y="179" textAnchor="middle" fontFamily="Manrope, sans-serif" fontSize="10" fontWeight="800" fill="#FFF6EC">+{fazla}</text>
          )}

          {/* Yapılacaklar posta kutusu */}
          <rect x="306" y="150" width="7" height="54" rx="2" fill="#6B3D29" />
          <path d="M290 136 C290 122 300 118 310 118 H334 C344 118 350 126 350 136 V158 H290 Z" fill="#2E4B5A" />
          <path d="M290 136 C290 122 300 118 310 118 H314 C304 118 298 124 298 136 V158 H290 Z" fill="#253E4A" />
          <rect x="288" y="156" width="64" height="5" rx="2" fill="#253E4A" />
          {isSayisi > 0 && <rect x="300" y="128" width="26" height="4" rx="1" fill="#FFF6EC" transform="rotate(-8 300 128)" />}
          <g transform="translate(348 126)">
            <g className={isSayisi > 0 && !az ? 'sk-bayrak' : ''} style={isSayisi > 0 ? undefined : { transform: 'rotate(90deg)', transformOrigin: '1.5px 24px' }}>
              <rect x="0" y="0" width="3" height="24" fill="#6B3D29" />
              <path d="M3 0 H20 V11 H3 Z" fill={isSayisi > 0 ? '#BE2847' : '#8C9CB2'} />
            </g>
          </g>
          {isSayisi > 0 && (
            <g>
              <circle cx="294" cy="120" r="11.5" fill={acilVar ? '#BE2847' : '#2A211D'} stroke="#FFF6EC" strokeWidth="2.5" />
              <text x="294" y="124.5" textAnchor="middle" fontFamily="Manrope, sans-serif" fontSize="12" fontWeight="800" fill="#FFFFFF">{isSayisi > 9 ? '9+' : isSayisi}</text>
            </g>
          )}
          <Suslemeler mevsim={mevsim} />
        </svg>

        <button type="button" className="sk-kapi sk-kapi--sol" onClick={onOgrenciler} aria-label={`Öğrencilerim: ${ogrenciEtiket}`}>
          <span className="sk-etiket">{ogrenciEtiket}<span className="sk-ok" aria-hidden="true">›</span></span>
        </button>
        <button type="button" className="sk-kapi sk-kapi--sag" onClick={onYapilacaklar} aria-label={isSayisi ? `Yapılacaklar: ${isSayisi} iş` : 'Yapılacaklar: iş yok'}>
          <span className="sk-etiket">{acilVar && <i />}{isSayisi ? 'Yapılacaklar' : 'İş yok'}<span className="sk-ok" aria-hidden="true">›</span></span>
        </button>
      </div>
    </div>
  )
}
