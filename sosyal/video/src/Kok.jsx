import { Composition } from 'remotion'
import { Carsamba, SURE } from './Carsamba.jsx'
import { Gunluk, GUNLUK_SURE, ORNEK } from './Gunluk.jsx'
import { Sahne } from './sahne/Sahne.jsx'
import { Katalog } from './sahne/Katalog.jsx'

// 9:16 dikey, 30 kare/sn. Reels, Shorts ve TikTok aynı dosyayı kullanır.
export const Kok = () => (<>
  <Composition id="Carsamba" component={Carsamba}
    durationInFrames={SURE} fps={30} width={1080} height={1920} />
  {/* Takvimdeki bir gün: --props ile { gun, govde, muzik } verilir (sosyal/gunluk.py) */}
  <Composition id="Gunluk" component={Gunluk} defaultProps={ORNEK}
    durationInFrames={GUNLUK_SURE} fps={30} width={1080} height={1920} />
  {/* Yeni sahne sistemi: --props ile { gun, govde, muzik, sahne } */}
  {/* Seslendirmeli günde süre sesten gelir (props.zaman.sure, sosyal/ses.py) */}
  <Composition id="Sahne" component={Sahne} defaultProps={{ ...ORNEK, sahne: { kurgu: 'dev', zemin: 'murekkep', sayi: '3', ek: 'iş.', ust: 'Bu hafta her şeyi yapmayacaksın.' } }}
    calculateMetadata={({ props }) => ({ durationInFrames: props.zaman?.sure ?? GUNLUK_SURE })}
    durationInFrames={GUNLUK_SURE} fps={30} width={1080} height={1920} />
  <Composition id="Katalog" component={Katalog} durationInFrames={1} fps={30} width={1920} height={2100} />
</>)
