import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase.js'
import { useOturum } from './lib/oturum.js'
import { Yukleniyor } from './bilesenler/Ortak.jsx'
import Giris from './ekranlar/Giris.jsx'
import DavetKodu from './ekranlar/DavetKodu.jsx'
import KocPaneli from './ekranlar/KocPaneli.jsx'
import OgrenciPaneli from './ekranlar/OgrenciPaneli.jsx'
import VeliPaneli from './ekranlar/VeliPaneli.jsx'

const ROL_ADI = { koc: 'Koç', ogrenci: 'Öğrenci', veli: 'Veli', yonetici: 'Yönetici' }

export default function App() {
  const { durum, profil, yenile, cikisYap } = useOturum()
  const [bagli, setBagli] = useState(null) // öğrenci/veli bir koça bağlı mı

  useEffect(() => {
    if (durum !== 'hazir' || !profil) return
    if (profil.rol === 'koc' || profil.rol === 'yonetici') {
      setBagli(true)
      return
    }
    ;(async () => {
      const tablo = profil.rol === 'veli' ? 'veli_ogrenci' : 'ogrenciler'
      const { count } = await supabase.from(tablo).select('*', { count: 'exact', head: true })
      setBagli((count ?? 0) > 0)
    })()
  }, [durum, profil])

  if (durum === 'yukleniyor') {
    return (
      <div className="giris-sayfa">
        <Yukleniyor />
      </div>
    )
  }

  if (durum === 'cikis') return <Giris />

  if (!profil) {
    return (
      <div className="giris-sayfa">
        <Yukleniyor metin="Profil hazırlanıyor" />
      </div>
    )
  }

  if (bagli === null) {
    return (
      <div className="giris-sayfa">
        <Yukleniyor />
      </div>
    )
  }

  if (!bagli) {
    return (
      <DavetKodu
        profil={profil}
        onCikis={cikisYap}
        onBaglandi={async () => {
          await yenile()
          setBagli(true)
        }}
      />
    )
  }

  return (
    <div className="uygulama">
      <header className="ust-bar">
        <div>
          <span className="marka">
            YKS <span className="ince">Koçluk</span>
          </span>
          <span className="ust-alt">
            {profil.ad_soyad} · {ROL_ADI[profil.rol] ?? profil.rol}
          </span>
        </div>
        <button className="metin-dugme" onClick={cikisYap}>
          Çıkış
        </button>
      </header>

      <main>
        {profil.rol === 'koc' || profil.rol === 'yonetici' ? (
          <KocPaneli />
        ) : profil.rol === 'veli' ? (
          <VeliPaneli />
        ) : (
          <OgrenciPaneli profil={profil} />
        )}
      </main>
    </div>
  )
}
