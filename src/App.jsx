import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase.js'
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
import OgrenciGozuyle from './ekranlar/OgrenciGozuyle.jsx'
import KonuIsiHaritasi from './ekranlar/KonuIsiHaritasi.jsx'
import Raporlar from './ekranlar/Raporlar.jsx'
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
  const [bekleyenOzet, setBekleyenOzet] = useState(0)

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

  /* Koçun "Özetler"e girmeden is olup olmadigini bilmesi lazim. Yolu
     bagimliliga koyuyoruz: ekrandan cikinca sayi tazeleniyor. */
  const kocRolu = profil?.rol === 'koc' || profil?.rol === 'yonetici'
  useEffect(() => {
    if (!kocRolu) return
    let iptal = false
    supabase
      .from('veli_haftalik_ozet')
      .select('id', { count: 'exact', head: true })
      .eq('yayinlandi', false)
      .then(({ count }) => {
        if (!iptal) setBekleyenOzet(count ?? 0)
      })
    return () => {
      iptal = true
    }
  }, [kocRolu, yol])

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

  // Koç erişimi kapattıysa öğrenci panele hiç girmesin.
  if (profil.rol === 'ogrenci' && profil.erisim_acik === false) {
    return (
      <div className="giris-sayfa">
        <div className="giris-kutu erisim-kapali">
          <span className="erisim-kilit" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor"
                 strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="11" width="16" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
          </span>
          <h1>Erişimin şu an kapalı</h1>
          <p>
            Koçun hesabını geçici olarak durdurdu. Çalışmaların ve verilerin duruyor;
            erişim yeniden açıldığında kaldığın yerden devam edebilirsin.
          </p>
          <p className="erisim-alt">Ne zaman açılacağını öğrenmek için koçunla konuş.</p>
          <button
            className="dugme dugme--ikincil"
            onClick={async () => {
              await cikisYap()
              git('/')
            }}
          >
            Çıkış yap
          </button>
        </div>
      </div>
    )
  }

  const kocMu = profil.rol === 'koc' || profil.rol === 'yonetici'
  const ogrenciId = yol.startsWith('/ogrenci/') ? yol.slice('/ogrenci/'.length) : null
  const gozuyleId = yol.startsWith('/gozuyle/') ? yol.slice('/gozuyle/'.length) : null

  // Rolüne göre gezinme. Yol tanınmıyorsa kendi ana ekranına döner.
  const baglantilar = kocMu
    ? [
        ['/', 'Panel'],
        ['/ogrenciler', 'Öğrenciler'],
        ['/konular', 'Konular'],
        ['/veli-ozetleri', 'Özetler'],
        ['/raporlar', 'Rapor'],
        ['/mesajlar', 'Mesajlar'],
      ]
    : [['/', profil.rol === 'veli' ? 'Bu hafta' : 'Panelim'], ['/mesajlar', 'Mesajlar']]

  function icerik() {
    if (yol === '/mesajlar') return <Mesajlar profil={profil} />
    if (kocMu && yol === '/konular') return <KonuIsiHaritasi />
    if (kocMu && yol === '/ogrenciler')
      return (
        <Ogrencilerim
          onOgrenciAc={(id) => git(`/ogrenci/${id}`)}
          onGozuyle={(id) => git(`/gozuyle/${id}`)}
        />
      )
    if (kocMu && gozuyleId)
      return <OgrenciGozuyle ogrenciId={gozuyleId} onGeri={() => git('/ogrenciler')} />
    if (kocMu && yol === '/veli-ozetleri') return <VeliOzetKuyrugu />
    if (kocMu && yol === '/raporlar')
      return <Raporlar onOgrenciAc={(id) => git(`/ogrenci/${id}`)} />
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
              ? yol === '/ogrenciler' ||
                yol.startsWith('/ogrenci/') ||
                yol.startsWith('/gozuyle/')
              : yol === hedef
          return (
            <button
              key={hedef}
              className={etkin ? 'alt-bag alt-bag--etkin' : 'alt-bag'}
              aria-current={etkin ? 'page' : undefined}
              onClick={() => git(hedef)}
            >
              {ad}
              {hedef === '/veli-ozetleri' && bekleyenOzet > 0 && (
                <span className="alt-rozet" aria-label={`${bekleyenOzet} özet bekliyor`}>
                  {bekleyenOzet > 9 ? '9+' : bekleyenOzet}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Öğrenci panelinde Kâmil başlığın kendisi; köşedeki kopyası
          gizleniyor. Bir ekranda iki maskot olmaz. */}
      {profil.rol !== 'ogrenci' && <KalemKosede profil={profil} />}
    </div>
  )
}
