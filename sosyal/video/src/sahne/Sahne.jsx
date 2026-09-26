// Günlük video, yeni sahne sistemi. Takvim satırı (gun) + gövde + sahne yönü (kurgu, zemin, çizim).
// Sahne yönü sosyal/takvim/sahne.json'dan gelir; yoksa seriye göre varsayılan seçilir.
// Seslendirmeli günde (ses + zaman, sosyal/ses.py) Kıvanç'ın sesi parça parça yerleşir, müzik konuşurken kısılır.
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion'
import { ZEMIN, P, zamanAyarla } from './ortak.js'
import { Susler } from './Cizimler.jsx'
import { Metafor, DevTipo, Bolunmus, Harita, Masa, Yazisma, Foto, Kunye, Kapanis } from './Kurgular.jsx'

// Kurguya göre içeriğin kapladığı alanlar [x1, y1, x2, y2]: süsler buralara düşmez
const ORTAK = [[130, 240, 910, 300], [130, 1420, 910, 1500]]
const DOLU = {
  metafor: [...ORTAK, [360, 300, 930, 860], [130, 700, 910, 1440]],  // üst sol boşluk ve kenarlar serbest
  dev: [...ORTAK, [130, 300, 910, 400], [90, 400, 780, 1000], [130, 960, 910, 1440]],
  harita: [...ORTAK, [130, 300, 910, 650], [100, 540, 940, 1150], [110, 1060, 910, 1440]],
  masa: [...ORTAK, [130, 300, 910, 580], [130, 600, 920, 1420]],
  yazisma: [...ORTAK, [150, 310, 930, 1390]],
}

const KURGU = { metafor: Metafor, dev: DevTipo, bolunmus: Bolunmus, harita: Harita, masa: Masa, yazisma: Yazisma, foto: Foto }

// Müzik: ses yokken 0.5, Kıvanç konuşurken 0.13; sonda 1.5 sn'de söner
function muzikSesi(f, zaman) {
  const sure = zaman?.sure ?? 600
  const son = interpolate(f, [sure - 45, sure - 1], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  if (!zaman?.klip) return 0.5 * son
  let konusma = 0
  for (const k of zaman.klip) {
    const b = k.from, e = k.from + (k.kesBit - k.kesBas)
    konusma = Math.max(konusma, interpolate(f, [b - 8, b, e, e + 12], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }))
  }
  return (0.5 - 0.37 * konusma) * son
}

export function Sahne({ gun, govde, muzik, sahne, ses, zaman }) {
  zamanAyarla(zaman)
  const f = useCurrentFrame()
  const s = sahne || { kurgu: 'metafor', zemin: 'krem', cizim: 'pil' }
  const z = ZEMIN[s.zemin] || ZEMIN.krem
  const K = KURGU[s.kurgu] || Metafor
  const kz = s.kurgu === 'bolunmus' ? ZEMIN.nane : s.kurgu === 'foto' ? ZEMIN.murekkep : z
  return <AbsoluteFill style={{ background: z.bg }}>
    {s.kurgu !== 'bolunmus' && s.kurgu !== 'foto' && <Susler f={f} tarih={gun.tarih} dolu={DOLU[s.kurgu] || []}
      renk={z.koyu ? P.krem : P.murekkep} vurgu={z.koyu ? P.amber : z.etiket} />}
    <K f={f} gun={gun} govde={govde} z={z} s={s} zaman={zaman} />
    <Kunye f={f} z={kz} />
    <Kapanis f={f} gun={gun} s={s} z={kz} />
    {muzik && <Audio src={staticFile(muzik)} loop volume={(k) => muzikSesi(k, zaman)} />}
    {ses && zaman?.klip?.map((k, i) => <Sequence key={i} from={k.from} durationInFrames={k.kesBit - k.kesBas} layout="none">
      <Audio src={staticFile(ses)} trimBefore={k.kesBas} trimAfter={k.kesBit} />
    </Sequence>)}
  </AbsoluteFill>
}
