import { useEffect, useState } from 'react'

// Kâmil — YKS koçluk platformunun maskotu (v2: mavi silgi, iri gözler).
export const KALEM_ADI = 'Kâmil';

export const RUHLAR = [
  'bekliyor', 'dusunuyor', 'sevinc', 'sasirdi',
  'uyku', 'endise', 'fikir', 'kutlama',
];

const RENK = {
  silgi: '#378ADD',
  silgiGolge: '#185FA5',
  halka: '#B4B2A9',
  govde: '#EF9F27',
  govdeGolge: '#BA7517',
  tahta: '#FAC775',
  uc: '#444441',
  cizgi: '#633806',
  bebek: '#26215C',
  yanak: '#E87BA4',
};

// Fikir bulunca başının yanından yukarı doğru yükselen baloncuklar.
// Beş tane, farklı boy ve gecikmeyle — düzensizlik canlı gösteriyor.
const BALONCUKLAR = [
  { cx: 152, cy: 128, r: 4,   gecikme: 0 },
  { cx: 166, cy: 122, r: 6,   gecikme: 0.55 },
  { cx: 148, cy: 116, r: 8,   gecikme: 1.1 },
  { cx: 163, cy: 110, r: 5,   gecikme: 1.65 },
  { cx: 155, cy: 104, r: 9.5, gecikme: 2.2 },
];

const BALON_STILI = `
@keyframes kalem-balon-yukselis {
  0%   { transform: translateY(0) scale(0.6); opacity: 0; }
  18%  { opacity: 0.95; }
  75%  { opacity: 0.65; }
  100% { transform: translateY(-92px) scale(1.15); opacity: 0; }
}
.kalem-baloncuk {
  animation: kalem-balon-yukselis 3.2s ease-out infinite;
  transform-origin: center;
  transform-box: fill-box;
}
@media (prefers-reduced-motion: reduce) {
  .kalem-baloncuk { animation: none; opacity: 0.8; }
}`;

function Baloncuklar() {
  return (
    <g fill='#85B7EB' stroke={RENK.silgi} strokeWidth='1.5'>
      <style>{BALON_STILI}</style>
      {BALONCUKLAR.map((b, n) => (
        <circle key={n} className='kalem-baloncuk' cx={b.cx} cy={b.cy} r={b.r}
                style={{ animationDelay: `${b.gecikme}s` }} />
      ))}
    </g>
  );
}

const IFADE = {
  bekliyor: {
    kas: ['M72 84 L92 84', 'M108 84 L128 84'],
    goz: 'acik', bebek: [0, 0],
    agiz: 'M86 146 Q100 161 114 146', dolu: false, yanak: 0.55, kol: 'asagi', ekstra: null,
  },
  dusunuyor: {
    kas: ['M72 79 L92 87', 'M108 84 L128 84'],
    goz: 'acik', bebek: [-4, -4],
    agiz: 'M85 150 Q92.5 142 100 150 T115 150', dolu: false, yanak: 0.45, kol: 'asagi',
    ekstra: (
      <g fill={RENK.halka}>
        <circle cx='150' cy='92' r='4' />
        <circle cx='160' cy='78' r='6.5' />
        <circle cx='173' cy='60' r='9.5' />
      </g>
    ),
  },
  sevinc: {
    kas: ['M70 76 Q82 70 94 76', 'M106 76 Q118 70 130 76'],
    goz: 'kapali', bebek: [0, 0],
    agiz: 'M83 142 Q100 168 117 142 Z', dolu: true, yanak: 0.9, kol: 'yukari', ekstra: null,
  },
  sasirdi: {
    kas: ['M69 72 Q82 65 95 72', 'M105 72 Q118 65 131 72'],
    goz: 'buyuk', bebek: [0, 0],
    agiz: 'M91 144 a9 11.5 0 1 0 18 0 a9 11.5 0 1 0 -18 0', dolu: true, yanak: 0.6, kol: 'yana', ekstra: null,
  },
  uyku: {
    kas: ['M72 88 L92 88', 'M108 88 L128 88'],
    goz: 'kapali', bebek: [0, 0],
    agiz: 'M90 149 Q100 158 110 149', dolu: false, yanak: 0.4, kol: 'asagi',
    ekstra: (
      <g fill='#888780'>
        <text x='146' y='86' fontSize='21'>z</text>
        <text x='161' y='64' fontSize='27'>z</text>
      </g>
    ),
  },
  endise: {
    kas: ['M72 79 L92 89', 'M108 89 L128 79'],
    goz: 'acik', bebek: [0, 3],
    agiz: 'M86 155 Q100 142 114 155', dolu: false, yanak: 0.35, kol: 'asagi', ekstra: null,
  },
  fikir: {
    kas: ['M69 71 Q82 64 95 71', 'M105 71 Q118 64 131 71'],
    goz: 'buyuk', bebek: [0, -2],
    agiz: 'M84 142 Q100 166 116 142 Z', dolu: true, yanak: 0.75, kol: 'yukari',
    ekstra: <Baloncuklar />,
  },
  kutlama: {
    kas: ['M70 74 Q82 68 94 74', 'M106 74 Q118 68 130 74'],
    goz: 'kapali', bebek: [0, 0],
    agiz: 'M81 141 Q100 170 119 141 Z', dolu: true, yanak: 0.95, kol: 'yukari',
    ekstra: (
      <g>
        <rect x='26' y='28' width='10' height='10' fill={RENK.yanak} transform='rotate(20 31 33)' />
        <rect x='166' y='44' width='10' height='10' fill='#1BAF7A' transform='rotate(-25 171 49)' />
        <rect x='38' y='72' width='9' height='9' fill={RENK.silgi} transform='rotate(40 42 76)' />
        <rect x='172' y='104' width='9' height='9' fill='#EDA100' transform='rotate(15 176 108)' />
      </g>
    ),
  },
};

// Kollar gövdenin sol yanından çıkar; sağ kol aynasıyla çizilir.
// Üç duruş: yanlarda sarkan, yukarı kalkan, iki yana açılan.
const KOL_YOL = {
  asagi:  (y) => `M64 ${y} Q43 ${y + 10} 37 ${y + 28}`,
  yukari: (y) => `M64 ${y} Q43 ${y - 14} 37 ${y - 34}`,
  yana:   (y) => `M64 ${y} Q45 ${y - 3} 32 ${y - 6}`,
};
const KOL_EL = {
  asagi:  (y) => [34, y + 32],
  yukari: (y) => [34, y - 38],
  yana:   (y) => [29, y - 7],
};

// Kalemin boyu çalışma saatiyle kısalır, ay başında açılıp uzar.
// yipranma: 0 (yepyeni) → 1 (kısalmış)
const govdeYuksekligi = (y = 0) => 132 - Math.min(Math.max(y, 0), 1) * 42;

export function Kalem({ ruh = 'bekliyor', boyut = 120, yipranma = 0 }) {
  const i = IFADE[ruh] ?? IFADE.bekliyor;
  const [kirpiyor, setKirpiyor] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (i.goz === 'kapali') return;
    const t = setInterval(() => {
      setKirpiyor(true);
      setTimeout(() => setKirpiyor(false), 130);
    }, 4200);
    return () => clearInterval(t);
  }, [i.goz]);

  const h = govdeYuksekligi(yipranma);
  const ucY = 45 + h;
  // Gövde kısalınca yüz de onunla birlikte küçülüp yukarı kayar,
  // yoksa ağız tahta uca taşıyor. yipranma=0'da bu dönüşüm birim.
  const olcek = h / 132;
  const yuzY = 45 + (h * 71) / 132;
  const yuzDonusum = `translate(100 ${yuzY.toFixed(2)}) scale(${olcek.toFixed(4)}) translate(-100 -116)`;
  const kol = i.kol ?? 'asagi';
  const kolY = 45 + h * 0.72;
  const [elX, elY] = KOL_EL[kol](kolY);
  const acik = i.goz !== 'kapali';
  const rx = i.goz === 'buyuk' ? 17.5 : 15;
  const ry = kirpiyor ? 2.5 : (i.goz === 'buyuk' ? 19.5 : 17);
  const [bx, by] = i.bebek;

  return (
    <svg viewBox='0 0 200 250' width={boyut} height={boyut * 1.25}
         role='img' aria-label={`${KALEM_ADI} ${ruh}`}>
      <rect x='64' y='10' width='72' height='28' rx='13' fill={RENK.silgi} />
      <rect x='64' y='10' width='12' height='28' rx='6' fill={RENK.silgiGolge} opacity='0.4' />
      <rect x='64' y='36' width='72' height='11' fill={RENK.halka} />
      <rect x='64' y='45' width='72' height={h} rx='7' fill={RENK.govde} />
      <rect x='64' y='45' width='11' height={h} fill={RENK.govdeGolge} opacity='0.32' />
      <polygon points={`64,${ucY} 136,${ucY} 100,${ucY + 51}`} fill={RENK.tahta} />
      <polygon points={`86,${ucY + 30} 114,${ucY + 30} 100,${ucY + 51}`} fill={RENK.uc} />

      <ellipse cx='72' cy={ucY + 44} rx='18' ry='9' fill={RENK.govdeGolge} />
      <ellipse cx='128' cy={ucY + 44} rx='18' ry='9' fill={RENK.govdeGolge} />

      {[false, true].map((sag) => (
        <g key={String(sag)} transform={sag ? 'translate(200 0) scale(-1 1)' : undefined}>
          <path d={KOL_YOL[kol](kolY)} stroke={RENK.govdeGolge}
                strokeWidth='9' strokeLinecap='round' fill='none' />
          <circle cx={elX} cy={elY} r='8.5' fill={RENK.govde}
                  stroke={RENK.govdeGolge} strokeWidth='2' />
        </g>
      ))}

      <g transform={yuzDonusum}>
        <ellipse cx='70' cy='140' rx='8' ry='5' fill={RENK.yanak} opacity={i.yanak} />
        <ellipse cx='130' cy='140' rx='8' ry='5' fill={RENK.yanak} opacity={i.yanak} />

        <path d={i.kas[0]} stroke={RENK.cizgi} strokeWidth='4' strokeLinecap='round' fill='none' />
        <path d={i.kas[1]} stroke={RENK.cizgi} strokeWidth='4' strokeLinecap='round' fill='none' />

        {acik ? (
          <g>
            <ellipse cx='82' cy='110' rx={rx} ry={ry} fill='#FFFFFF' stroke={RENK.cizgi} strokeWidth='2.5' />
            <ellipse cx='118' cy='110' rx={rx} ry={ry} fill='#FFFFFF' stroke={RENK.cizgi} strokeWidth='2.5' />
            {!kirpiyor && (
              <g>
                <circle cx={82 + bx} cy={110 + by} r='8.5' fill={RENK.bebek} />
                <circle cx={118 + bx} cy={110 + by} r='8.5' fill={RENK.bebek} />
                <circle cx={78 + bx} cy={105 + by} r='3.4' fill='#FFFFFF' />
                <circle cx={114 + bx} cy={105 + by} r='3.4' fill='#FFFFFF' />
              </g>
            )}
          </g>
        ) : (
          <g stroke={RENK.cizgi} strokeWidth='3.5' fill='none' strokeLinecap='round'>
            <path d='M69 110 Q82 98 95 110' />
            <path d='M105 110 Q118 98 131 110' />
          </g>
        )}

        <path d={i.agiz} stroke={RENK.cizgi} strokeWidth='3.6'
              fill={i.dolu ? RENK.cizgi : 'none'} strokeLinecap='round' />
      </g>
      {i.ekstra}
    </svg>
  );
}

export function KalemBalonu({ olay, onKapat, onEylem }) {
  if (!olay) return null
  return (
    <div className='kalem-balon' role='status' aria-live='polite'>
      <Kalem ruh={olay.ruh} boyut={54} yipranma={olay.yipranma ?? 0} />
      <div className='kalem-balon-govde'>
        <p className='kalem-ad'>{KALEM_ADI}</p>
        <p className='kalem-mesaj'>{olay.mesaj}</p>
        {olay.eylem && (
          <button className='metin-dugme' onClick={() => onEylem?.(olay.eylem)}>
            {olay.eylem.etiket}
          </button>
        )}
      </div>
      <button className='kalem-kapat' aria-label='Kapat' onClick={() => onKapat?.(olay)}>
        &times;
      </button>
    </div>
  )
}

export default Kalem
