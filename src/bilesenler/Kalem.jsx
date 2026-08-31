import { useEffect, useState } from 'react'

// Kâmil — YKS koçluk platformunun maskotu (v2: mavi silgi, iri gözler).
export const KALEM_ADI = 'Kâmil';

export const RUHLAR = [
  'bekliyor', 'dusunuyor', 'sevinc', 'sasirdi',
  'uyku', 'endise', 'fikir', 'kutlama',
  'isaret', 'anlatiyor',
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
    agiz: 'M86 146 Q100 161 114 146', dolu: false, yanak: 0.55, hareket: 'kalem-salinim 2.8s ease-in-out infinite', kol: 'asagi', ekstra: null,
  },
  dusunuyor: {
    kas: ['M72 79 L92 87', 'M108 84 L128 84'],
    goz: 'acik', bebek: [-4, -4],
    agiz: 'M85 150 Q92.5 142 100 150 T115 150', dolu: false, yanak: 0.45, hareket: 'kalem-yalpa 3.6s ease-in-out infinite', kol: 'asagi',
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
    agiz: 'M83 142 Q100 168 117 142 Z', dolu: true, yanak: 0.9, hareket: 'kalem-zipla 1.7s ease-in-out infinite', kol: 'yukari', ekstra: null,
  },
  sasirdi: {
    kas: ['M69 72 Q82 65 95 72', 'M105 72 Q118 65 131 72'],
    goz: 'buyuk', bebek: [0, 0],
    agiz: 'M91 144 a9 11.5 0 1 0 18 0 a9 11.5 0 1 0 -18 0', dolu: true, yanak: 0.6, hareket: 'kalem-irkil 2.6s ease-in-out infinite', kol: 'yana', ekstra: null,
  },
  uyku: {
    kas: ['M72 88 L92 88', 'M108 88 L128 88'],
    goz: 'kapali', bebek: [0, 0],
    agiz: 'M90 149 Q100 158 110 149', dolu: false, yanak: 0.4, hareket: 'kalem-nefes 4s ease-in-out infinite', kol: 'asagi',
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
    agiz: 'M86 155 Q100 142 114 155', dolu: false, yanak: 0.35, hareket: 'kalem-tedirgin 3s ease-in-out infinite', kol: 'asagi', ekstra: null,
  },
  fikir: {
    kas: ['M69 71 Q82 64 95 71', 'M105 71 Q118 64 131 71'],
    goz: 'buyuk', bebek: [0, -2],
    agiz: 'M84 142 Q100 166 116 142 Z', dolu: true, yanak: 0.75, hareket: 'kalem-canlan 1.9s ease-in-out infinite', kol: 'yukari',
    ekstra: <Baloncuklar />,
  },
  kutlama: {
    kas: ['M70 74 Q82 68 94 74', 'M106 74 Q118 68 130 74'],
    goz: 'kapali', bebek: [0, 0],
    agiz: 'M81 141 Q100 170 119 141 Z', dolu: true, yanak: 0.95, hareket: 'kalem-zipla 1.25s ease-in-out infinite', kol: 'yukari',
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

// Lottie tarzı belirgin hareketler: her ruhun kendi ritmi var.
// Hepsi transform üzerinden, tek bir stil bloğunda toplanıyor.
// İki ifade daha: haritada durağı gösteren (kol asimetrik, bakış o yöne)
// ve anlatan (kaşlar kalkık, ağız konuşur gibi, bir el havada).
IFADE.isaret = {
  kas: ['M72 80 L92 82', 'M108 82 L128 80'],
  goz: 'acik', bebek: [-5, 1],
  agiz: 'M87 146 Q100 158 113 146', dolu: false, yanak: 0.55,
  hareket: 'kalem-salinim 2.8s ease-in-out infinite',
  kol: { sol: 'isaret', sag: 'asagi' }, ekstra: null,
};
IFADE.anlatiyor = {
  kas: ['M70 74 Q82 68 94 74', 'M106 74 Q118 68 130 74'],
  goz: 'acik', bebek: [0, 2],
  agiz: 'M88 142 Q100 157 112 142 Q100 151 88 142 Z', dolu: true, yanak: 0.7,
  hareket: 'kalem-canlan 2.4s ease-in-out infinite',
  kol: { sol: 'asagi', sag: 'yana' }, ekstra: null,
};

const HAREKET_STILI = `
@keyframes kalem-salinim {
  0%,100% { transform: translateY(0) scaleY(1) scaleX(1); }
  50%     { transform: translateY(-7px) scaleY(1.03) scaleX(0.982); }
}
@keyframes kalem-yalpa {
  0%,100% { transform: rotate(-4deg) translateY(0); }
  50%     { transform: rotate(4deg) translateY(-5px); }
}
@keyframes kalem-zipla {
  0%,100% { transform: translateY(0) scaleY(1) scaleX(1); }
  12%     { transform: translateY(0) scaleY(0.9) scaleX(1.08); }
  34%     { transform: translateY(-14px) scaleY(1.1) scaleX(0.93); }
  56%     { transform: translateY(0) scaleY(0.93) scaleX(1.06); }
  74%     { transform: translateY(-7px) scaleY(1.02) scaleX(0.98); }
}
@keyframes kalem-irkil {
  0%,58%,100% { transform: translateY(0) scale(1); }
  64%         { transform: translateY(-9px) scale(1.05); }
  73%         { transform: translateY(0) scale(0.96); }
  82%         { transform: translateY(-4px) scale(1.02); }
}
@keyframes kalem-nefes {
  0%,100% { transform: translateY(0) scaleY(1) scaleX(1); }
  50%     { transform: translateY(-4px) scaleY(1.05) scaleX(0.965); }
}
@keyframes kalem-tedirgin {
  0%,70%,100%   { transform: translateX(0) rotate(0deg); }
  74%,82%,90%   { transform: translateX(-3px) rotate(-1.5deg); }
  78%,86%       { transform: translateX(3px) rotate(1.5deg); }
}
@keyframes kalem-canlan {
  0%,100% { transform: translateY(0) scale(1); }
  50%     { transform: translateY(-8px) scale(1.035); }
}
@keyframes kalem-kol-salla {
  0%,100% { transform: rotate(-7deg); }
  50%     { transform: rotate(7deg); }
}
.kalem-govde { transform-box: fill-box; transform-origin: 50% 97%; }
.kalem-kol   { animation: kalem-kol-salla 2.8s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .kalem-govde, .kalem-kol { animation: none !important; }
}`;

// Kollar gövdenin sol yanından çıkar; sağ kol aynasıyla çizilir.
// Üç duruş: yanlarda sarkan, yukarı kalkan, iki yana açılan.
const KOL_YOL = {
  asagi:  (y) => `M64 ${y} Q43 ${y + 10} 37 ${y + 28}`,
  yukari: (y) => `M64 ${y} Q43 ${y - 14} 37 ${y - 34}`,
  yana:   (y) => `M64 ${y} Q45 ${y - 3} 32 ${y - 6}`,
  isaret: (y) => `M64 ${y} Q40 ${y - 4} 16 ${y - 10}`,
};
const KOL_EL = {
  asagi:  (y) => [34, y + 32],
  yukari: (y) => [34, y - 38],
  yana:   (y) => [29, y - 7],
  isaret: (y) => [13, y - 11],
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
  const yuzY = 45 + (h * 69) / 132;
  const yuzDonusum = `translate(100 ${yuzY.toFixed(2)}) scale(${olcek.toFixed(4)}) translate(-100 -114)`;
  // kol: tek dize (iki kol aynı) ya da { sol, sag } (asimetrik, örn. işaret)
  const kollar = typeof i.kol === 'object' && i.kol
    ? [i.kol.sol ?? 'asagi', i.kol.sag ?? 'asagi']
    : [i.kol ?? 'asagi', i.kol ?? 'asagi'];
  const kolY = 45 + h * 0.72;
  const acik = i.goz !== 'kapali';
  const rx = i.goz === 'buyuk' ? 22.5 : 19;
  const ry = kirpiyor ? 3 : (i.goz === 'buyuk' ? 24 : 21);
  const [bx, by] = i.bebek;

  return (
    <svg viewBox='12 -6 176 238' width={boyut} height={boyut * 1.352}
         role='img' aria-label={`${KALEM_ADI} ${ruh}`}>
      <style>{HAREKET_STILI}</style>
      <g className='kalem-govde' style={{ animation: i.hareket }}>
      <rect x='64' y='10' width='72' height='28' rx='13' fill={RENK.silgi} />
      <rect x='64' y='10' width='12' height='28' rx='6' fill={RENK.silgiGolge} opacity='0.4' />
      <rect x='64' y='36' width='72' height='11' fill={RENK.halka} />
      <rect x='64' y='45' width='72' height={h} rx='7' fill={RENK.govde} />
      <rect x='64' y='45' width='11' height={h} fill={RENK.govdeGolge} opacity='0.32' />
      <polygon points={`64,${ucY} 136,${ucY} 100,${ucY + 51}`} fill={RENK.tahta} />
      <polygon points={`86,${ucY + 30} 114,${ucY + 30} 100,${ucY + 51}`} fill={RENK.uc} />

      <ellipse cx='72' cy={ucY + 44} rx='18' ry='9' fill={RENK.govdeGolge} />
      <ellipse cx='128' cy={ucY + 44} rx='18' ry='9' fill={RENK.govdeGolge} />

      {[false, true].map((sag) => {
        const k = kollar[sag ? 1 : 0];
        const [elX, elY] = KOL_EL[k](kolY);
        return (
          <g key={String(sag)} transform={sag ? 'translate(200 0) scale(-1 1)' : undefined}>
            <g className={k === 'isaret' ? undefined : 'kalem-kol'}
               style={{ transformBox: 'view-box', transformOrigin: `64px ${kolY}px` }}>
              <path d={KOL_YOL[k](kolY)} stroke={RENK.govdeGolge}
                    strokeWidth='10' strokeLinecap='round' fill='none' />
              <circle cx={elX} cy={elY} r='9.5' fill={RENK.govde}
                      stroke={RENK.govdeGolge} strokeWidth='2' />
            </g>
          </g>
        );
      })}

      <g transform={yuzDonusum}>
        <ellipse cx='70' cy='140' rx='8' ry='5' fill={RENK.yanak} opacity={i.yanak} />
        <ellipse cx='130' cy='140' rx='8' ry='5' fill={RENK.yanak} opacity={i.yanak} />

        <g transform='translate(0 -8)'>
          <path d={i.kas[0]} stroke={RENK.cizgi} strokeWidth='4.5' strokeLinecap='round' fill='none' />
          <path d={i.kas[1]} stroke={RENK.cizgi} strokeWidth='4.5' strokeLinecap='round' fill='none' />
        </g>

        {acik ? (
          <g>
            <ellipse cx='80' cy='112' rx={rx} ry={ry} fill='#FFFFFF' stroke={RENK.cizgi} strokeWidth='3' />
            <ellipse cx='120' cy='112' rx={rx} ry={ry} fill='#FFFFFF' stroke={RENK.cizgi} strokeWidth='3' />
            {!kirpiyor && (
              <g>
                <circle cx={80 + bx} cy={112 + by} r='11' fill={RENK.bebek} />
                <circle cx={120 + bx} cy={112 + by} r='11' fill={RENK.bebek} />
                <circle cx={75 + bx} cy={106 + by} r='4.4' fill='#FFFFFF' />
                <circle cx={115 + bx} cy={106 + by} r='4.4' fill='#FFFFFF' />
              </g>
            )}
          </g>
        ) : (
          <g stroke={RENK.cizgi} strokeWidth='4' fill='none' strokeLinecap='round'>
            <path d='M62 113 Q80 95 98 113' />
            <path d='M102 113 Q120 95 138 113' />
          </g>
        )}

        <path d={i.agiz} stroke={RENK.cizgi} strokeWidth='3.6'
              fill={i.dolu ? RENK.cizgi : 'none'} strokeLinecap='round' />
      </g>
      {i.ekstra}
      </g>
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
