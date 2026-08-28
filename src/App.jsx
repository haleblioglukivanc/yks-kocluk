import { useEffect, useState } from 'react'
import { useOturum } from './lib/oturum.js'
import { Yukleniyor } from './bilesenler/Ortak.jsx'
import Tanitim from './ekranlar/Tanitim.jsx'
import Giris from './ekranlar/Giris.jsx'
import KocPaneli from './ekranlar/KocPaneli.jsx'
import OgrenciDetay from './ekranlar/OgrenciDetay.jsx'
import OgrenciPaneli from './ekranlar/OgrenciPaneli.jsx'
import VeliPaneli from './ekranlar/VeliPaneli.jsx'

const ROL_ADI = { koc: 'Koç', ogrenci: 'Öğrenci', veli: 'Veli', yonetici: 'Yönetici' }

/** Küçük yol yönetimi: /giris girişi, diğer her şey tanıtımı açar. */
function useYol() {
  const [yol, setYol] = useState(() => window.location.pathname)

  useEffect(() => {
    const geri = () => setYol(window.location.pathname)
    window.addEventListener('popstate', geri)
    return () => window.removeEventListener('popstate', geri)
  }, [])

  const git = (hedef) => {
    window.history.pushState({}, '', hedef)
    setYol(hedef)
    window.scrollTo(0, 0)
  }

  return [yol, git]
}

export default function App() {
  const { durum, profil, cikisYap } = useOturum()
  const [yol, git] = useYol()

  if (durum === 'yukleniyor') {
    return (
      <div className="giris-sayfa">
        <Yukleniyor />
      </div>
    )
  }

  // Giriş yapılmamış: tanıtım veya giriş
  if (durum === 'cikis') {
    return yol === '/giris' ? (
      <Giris onGeri={() => git('/')} />
    ) : (
      <Tanitim onGiris={() => git('/giris')} />
    )
  }

  if (!profil) {
    return (
      <div className="giris-sayfa">
        <Yukleniyor metin="Profil hazırlanıyor" />
      </div>
    )
  }

  const kocMu = profil.rol === 'koc' || profil.rol === 'yonetici'
  const ogrenciId = yol.startsWith('/ogrenci/') ? yol.slice('/ogrenci/'.length) : null

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
        <button
          className="metin-dugme"
          onClick={async () => {
            await cikisYap()
            git('/')
          }}
        >
          Çıkış
        </button>
      </header>

      <main>
        <div className="panel">
          {kocMu ? (
            ogrenciId ? (
              <OgrenciDetay ogrenciId={ogrenciId} onGeri={() => git('/')} />
            ) : (
              <KocPaneli onOgrenciAc={(id) => git(`/ogrenci/${id}`)} />
            )
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
