// Günlük video, yeni sahne sistemi. Takvim satırı (gun) + gövde + sahne yönü (kurgu, zemin, çizim).
// Sahne yönü sosyal/takvim/sahne.json'dan gelir; yoksa seriye göre varsayılan seçilir.
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from 'remotion'
import { ZEMIN, P } from './ortak.js'
import { Susler } from './Cizimler.jsx'
import { Metafor, DevTipo, Bolunmus, Harita, Masa, Yazisma, Kunye, Kapanis } from './Kurgular.jsx'

// Kurguya göre içeriğin kapladığı alanlar [x1, y1, x2, y2]: süsler buralara düşmez
const ORTAK = [[130, 240, 910, 300], [130, 1420, 910, 1500]]
const DOLU = {
  metafor: [...ORTAK, [360, 300, 930, 860], [130, 700, 910, 1440]],
  dev: [...ORTAK, [130, 300, 910, 400], [90, 400, 780, 1000], [130, 960, 910, 1440]],
  harita: [...ORTAK, [130, 300, 910, 650], [100, 540, 940, 1150], [110, 1060, 910, 1440]],
  masa: [...ORTAK, [130, 300, 910, 580], [130, 600, 920, 1420]],
  yazisma: [...ORTAK, [150, 310, 930, 1390]],
}

const KURGU = { metafor: Metafor, dev: DevTipo, bolunmus: Bolunmus, harita: Harita, masa: Masa, yazisma: Yazisma }

export function Sahne({ gun, govde, muzik, sahne }) {
  const f = useCurrentFrame()
  const s = sahne || { kurgu: 'metafor', zemin: 'krem', cizim: 'pil' }
  const z = ZEMIN[s.zemin] || ZEMIN.krem
  const K = KURGU[s.kurgu] || Metafor
  return <AbsoluteFill style={{ background: z.bg }}>
    {s.kurgu !== 'bolunmus' && <Susler f={f} tarih={gun.tarih} dolu={DOLU[s.kurgu] || []}
      renk={z.koyu ? P.krem : P.murekkep} vurgu={z.koyu ? P.amber : z.etiket} />}
    <K f={f} gun={gun} govde={govde} z={z} s={s} />
    <Kunye f={f} z={s.kurgu === 'bolunmus' ? ZEMIN.nane : z} />
    <Kapanis f={f} gun={gun} z={s.kurgu === 'bolunmus' ? ZEMIN.nane : z} />
    {muzik && <Audio src={staticFile(muzik)} />}
  </AbsoluteFill>
}
