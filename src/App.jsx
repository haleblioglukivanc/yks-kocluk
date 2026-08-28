import { useOturum } from './lib/oturum.js'
import { Yukleniyor } from './bilesenler/Ortak.jsx'
import Giris from './ekranlar/Giris.jsx'
import KocPaneli from './ekranlar/KocPaneli.jsx'
import OgrenciPaneli from './ekranlar/OgrenciPaneli.jsx'
import VeliPaneli from './ekranlar/VeliPaneli.jsx'

const ROL_ADI = { koc: 'Koç', ogrenci: 'Öğrenci', veli: 'Veli', yonetici: 'Yönetici' }

export default function App() {
  const { durum, profil, cikisYap } = useOturum()

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

  const kocMu = profil.rol === 'koc' || profil.rol === 'yonetici'

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
        <div className="panel">
          {kocMu ? (
            <KocPaneli />
          ) : profil.rol === 'veli' ? (
            <VeliPaneli />
          ) : (
            <OgrenciPaneli profil={profil} />
          )}
        </div>
      </main>
    </div>
  )
}
