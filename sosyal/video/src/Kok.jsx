import { Composition } from 'remotion'
import { Carsamba, SURE } from './Carsamba.jsx'
import { Gunluk, GUNLUK_SURE, ORNEK } from './Gunluk.jsx'

// 9:16 dikey, 30 kare/sn. Reels, Shorts ve TikTok aynı dosyayı kullanır.
export const Kok = () => (<>
  <Composition id="Carsamba" component={Carsamba}
    durationInFrames={SURE} fps={30} width={1080} height={1920} />
  {/* Takvimdeki bir gün: --props ile { gun, govde, muzik } verilir (sosyal/gunluk.py) */}
  <Composition id="Gunluk" component={Gunluk} defaultProps={ORNEK}
    durationInFrames={GUNLUK_SURE} fps={30} width={1080} height={1920} />
</>)
