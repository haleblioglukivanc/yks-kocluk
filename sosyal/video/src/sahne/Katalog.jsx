// Çizim kütüphanesinin tamamını tek karede gösterir (kontrol için): npx remotion still Katalog
import { AbsoluteFill } from 'remotion'
import { CIZIM, Cizim } from './Cizimler.jsx'
import { ZEMIN, GOVDE } from './ortak.js'

export function Katalog() {
  const adlar = Object.keys(CIZIM)
  return <AbsoluteFill style={{ background: ZEMIN.krem.bg, padding: 40, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 30 }}>
    {adlar.map((a) => <div key={a} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div style={{ height: 230, display: 'flex', alignItems: 'center' }}><Cizim ad={a} f={0} gen={250} zemin={ZEMIN.krem} suz={false} /></div>
      <div style={{ fontFamily: GOVDE, fontSize: 24, color: '#4a5570' }}>{a}</div>
    </div>)}
  </AbsoluteFill>
}
