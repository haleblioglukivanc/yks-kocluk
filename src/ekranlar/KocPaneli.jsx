import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import RiskRadari from '../bilesenler/RiskRadari.jsx'
import OnayKuyrugu from '../bilesenler/OnayKuyrugu.jsx'
import AnalizKuyrugu from '../bilesenler/AnalizKuyrugu.jsx'
import KocBasligi from '../bilesenler/KocBasligi.jsx'

/** Koçun günlük durum ekranı — yap katmanı. Öğrenci listesi ayrı sekmede;
 *  burası "bugün kime dokunmalıyım" sorusuna cevap verir: risk radarı ve
 *  onay kuyruğu. KPI, net grafiği ve haftalık ilham Raporlar'a taşındı;
 *  özet yalnız başlığın cümlesi için çekiliyor. */
export default function KocPaneli({ profil, onOgrenciAc, onGit }) {
  const [ozet, setOzet] = useState(null)

  useEffect(() => {
    let iptal = false
    supabase.rpc('koc_panel_ozeti').then(({ data }) => {
      if (!iptal && data) setOzet(data)
    })
    return () => {
      iptal = true
    }
  }, [])

  return (
    <div className="panel">
      <KocBasligi profil={profil} ozet={ozet} onGit={onGit} />
      <RiskRadari onOgrenciAc={onOgrenciAc} onGit={onGit} />
      <AnalizKuyrugu onOgrenciAc={onOgrenciAc} />
      <OnayKuyrugu onOgrenciAc={onOgrenciAc} />
    </div>
  )
}
