import { useEffect, useState } from 'react'
import { useOturum } from './lib/oturum.js'
import { Yukleniyor } from './bilesenler/Ortak.jsx'
import Tanitim from './ekranlar/Tanitim.jsx'
import Giris from './ekranlar/Giris.jsx'
import KocPaneli from './ekranlar/KocPaneli.jsx'
import OgrenciDetay from './ekranlar/OgrenciDetay.jsx'
import OgrenciPaneli from './ekranlar/OgrenciPaneli.jsx'
import VeliPaneli from './ekranlar/VeliPaneli.jsx'
import VeliOzetKuyrugu from './ekranlar/VeliOzetKuyrugu.jsx'
import Mesajlar from './ekranlar/Mesajlar.jsx'
import Ogrencilerim from './ekranlar/Ogrencilerim.jsx'
import KonuIsiHaritasi from './ekranlar/KonuIsiHaritasi.jsx'
import KalemKosede from './bilesenler/KalemKosede.jsx'

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

  /* Koyu tema gövdeye de yazılır. Sadece .uygulama üzerinde olduğunda,
     sayfa yatayda taştığı anda taşan şeridi body'nin kâğıt zemini
     boyuyor ve sağda beyaz bir bant kalıyordu. */
  const panelAcik = durum === 'hazir' && Boolean(profil)
  useEffect(() => {
    if (panelAcik) document.body.dataset.tema = 'panel'
    else delete document.body.dataset.tema
    return () => {
      delete document.body.dataset.tema
    }
  }, [panelAcik])

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

  // Rolüne göre gezinme. Yol tanınmıyorsa kendi ana ekranına döner.
  const baglantilar = kocMu
    ? [
        ['/', 'Panel'],
        ['/ogrenciler', 'Öğrenciler'],
        ['/konular', 'Konular'],
        ['/veli-ozetleri', 'Veli'],
        ['/mesajlar', 'Mesajlar'],
      ]
    : [['/', profil.rol === 'veli' ? 'Bu hafta' : 'Panelim'], ['/mesajlar', 'Mesajlar']]

  function icerik() {
    if (yol === '/mesajlar') return <Mesajlar profil={profil} />
    if (kocMu && yol === '/konular') return <KonuIsiHaritasi />
    if (kocMu && yol === '/ogrenciler')
      return <Ogrencilerim onOgrenciAc={(id) => git(`/ogrenci/${id}`)} />
    if (kocMu && yol === '/veli-ozetleri') return <VeliOzetKuyrugu />
    if (kocMu && ogrenciId) return <OgrenciDetay ogrenciId={ogrenciId} onGeri={() => git('/ogrenciler')} />
    if (kocMu) return <KocPaneli onOgrenciAc={(id) => git(`/ogrenci/${id}`)} />
    if (profil.rol === 'veli') return <VeliPaneli />
    return <OgrenciPaneli profil={profil} />
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
          {/* Hangi derlemeye baktığımızı görebilmek için. Önbellek sorunlarını
              tahmin etmek yerine ölçmeyi sağlıyor. */}
          <span className="derleme-damgasi">sürüm {__DERLEME__}</span>
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
        <div className="panel">{icerik()}</div>
      </main>

      <nav className="alt-gezinme" aria-label="Ana gezinme">
        {baglantilar.map(([hedef, ad]) => {
          const etkin =
            hedef === '/ogrenciler'
              ? yol === '/ogrenciler' || yol.startsWith('/ogrenci/')
              : yol === hedef
          return (
            <button
              key={hedef}
              className={etkin ? 'alt-bag alt-bag--etkin' : 'alt-bag'}
              aria-current={etkin ? 'page' : undefined}
              onClick={() => git(hedef)}
            >
              {ad}
            </button>
          )
        })}
      </nav>

      <KalemKosede profil={profil} />
    </div>
  )
}
