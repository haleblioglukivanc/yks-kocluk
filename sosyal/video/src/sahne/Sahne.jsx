// Günlük video, yeni sahne sistemi. Takvim satırı (gun) + gövde + sahne yönü (kurgu, zemin, çizim).
// Sahne yönü sosyal/takvim/sahne.json'dan gelir; yoksa seriye göre varsayılan seçilir.
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from 'remotion'
import { ZEMIN, P } from './ortak.js'
import { Susler } from './Cizimler.jsx'
import { Metafor, DevTipo, Bolunmus, Harita, Masa, Yazisma, Kunye, Kapanis } from './Kurgular.jsx'

const KURGU = { metafor: Metafor, dev: DevTipo, bolunmus: Bolunmus, harita: Harita, masa: Masa, yazisma: Yazisma }

export function Sahne({ gun, govde, muzik, sahne }) {
  const f = useCurrentFrame()
  const s = sahne || { kurgu: 'metafor', zemin: 'krem', cizim: 'pil' }
  const z = ZEMIN[s.zemin] || ZEMIN.krem
  const K = KURGU[s.kurgu] || Metafor
  return <AbsoluteFill style={{ background: z.bg }}>
    {s.kurgu !== 'bolunmus' && <Susler f={f} renk={z.koyu ? P.krem : P.murekkep} />}
    <K f={f} gun={gun} govde={govde} z={z} s={s} />
    <Kunye f={f} z={s.kurgu === 'bolunmus' ? ZEMIN.nane : z} />
    <Kapanis f={f} gun={gun} z={s.kurgu === 'bolunmus' ? ZEMIN.nane : z} />
    {muzik && <Audio src={staticFile(muzik)} />}
  </AbsoluteFill>
}
