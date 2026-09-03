import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { supabase } from './lib/supabase.js'
import { useOturum } from './lib/oturum.js'
import { Yukleniyor } from './bilesenler/Ortak.jsx'
import Tanitim from './ekranlar/Tanitim.jsx'
import Giris from './ekranlar/Giris.jsx'
import KocPaneli from './ekranlar/KocPaneli.jsx'
import YoneticiPaneli from './ekranlar/YoneticiPaneli.jsx'
import OgrenciDetay from './ekranlar/OgrenciDetay.jsx'
import OgrenciPaneli from './ekranlar/OgrenciPaneli.jsx'
import VeliPaneli from './ekranlar/VeliPaneli.jsx'
import Mesajlar from './ekranlar/Mesajlar.jsx'
import Ogrencilerim from './ekranlar/Ogrencilerim.jsx'
import KonuOncelik from './ekranlar/KonuOncelik.jsx'
import Raporlar from './ekranlar/Raporlar.jsx'
import Kaynaklar from './ekranlar/Kaynaklar.jsx'
import KalemKosede from './bilesenler/KalemKosede.jsx'
import KurulumDaveti from './bilesenler/KurulumDaveti.jsx'

/* Öğrencinin alt çubuğu ile panel sekmeleri aynı şey; yol ↔ sekme. */
const OGRENCI_SEKME = { '/': 'bugun', '/yol': 'konular', '/denemeler': 'denemeler', '/ben': 'ben' }
const SEKME_YOLU = Object.fromEntries(Object.entries(OGRENCI_SEKME).map(([y, s]) => [s, y]))

const ROL_ADI = { koc: 'Koç', ogrenci: 'Öğrenci', veli: 'Veli', yonetici: 'Yönetici' }

/* Site kökte yayınlanıyor ama yollar yine de tabana göre okunuyor.
   Mutlak yazıldığı dönemde alt dizinde çalışırken `git('/mesajlar')`
   adres çubuğunu sitenin dışına taşıyordu: sayfa açık kaldığı sürece
   görünmüyor, yenilendiği anda 404. Aynı nedenle '/' ile karşılaştıran
   her yer sessizce yanlış cevap veriyordu (Panel sekmesi hiç etkin
   görünmüyordu, panelde iki Kâmil birden çıkıyordu). Alan adı alınıp
   site bir gün alt dizine taşınırsa bu kod hazır.

   Çözüm: dışarıda tam adres, içeride her zaman '/' ile başlayan yol. */
const TABAN = import.meta.env.BASE_URL.replace(/\/+$/, '')

const icYol = () => {
  const tam = window.location.pathname
  const ic = TABAN && tam.startsWith(TABAN) ? tam.slice(TABAN.length) : tam
  return ic.startsWith('/') ? ic : `/${ic}`
}

/** Küçük yol yönetimi: /giris girişi, diğer her şey tanıtımı açar. */
function useYol() {
  const [yol, setYol] = useState(icYol)

  useEffect(() => {
    const geri = () => setYol(icYol())
    window.addEventListener('popstate', geri)
    return () => window.removeEventListener('popstate', geri)
  }, [])

  const git = (hedef) => {
    const uygula = () => {
      window.history.pushState({}, '', TABAN + hedef)
      setYol(hedef)
      window.scrollTo(0, 0)
    }

    /* Ekranlar arası geçiş. Tarayıcı desteklemiyorsa (Firefox) veya
       kullanıcı hareket azaltma istiyorsa eskisi gibi anında değişir —
       animasyon bir süs, gezinmenin çalışması ona bağlı olamaz.
       flushSync şart: React güncellemeyi geciktirirse tarayıcı eski
       ekranın fotoğrafını çeker ve geçiş boş kalır. */
    const azHareket =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    if (typeof document.startViewTransition !== 'function' || azHareket) {
      uygula()
      return
    }
    document.startViewTransition(() => flushSync(uygula))
  }

  return [yol, git]
}

/** Üst bardaki uygulama düğmeleri: ikon + isteğe bağlı bildirim rozeti. */
function UstDugme({ etiket, etkin, rozet, vurgulu, yonetim, onClick, children }) {
  const sinif = ['ust-dugme']
  if (yonetim) sinif.push('ust-dugme--yonetim')
  if (etkin) sinif.push('ust-dugme--etkin')
  if (vurgulu) sinif.push('ust-dugme--vurgulu')
  return (
    <button
      type="button"
      className={sinif.join(' ')}
      onClick={onClick}
      title={etiket}
      aria-label={rozet > 0 ? `${etiket}, ${rozet} okunmamış` : etiket}
      aria-current={etkin ? 'page' : undefined}
    >
      {children}
      {rozet > 0 && (
        <span className="ust-rozet" aria-hidden="true">
          {rozet > 9 ? '9+' : rozet}
        </span>
      )}
    </button>
  )
}

const ikonOzellik = {
  viewBox: '0 0 24 24',
  width: 20,
  height: 20,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

/* Alt gezinme ikonları. Üst bardaki düğmelerle aynı çizgi kalınlığı ve
   yuvarlak uçlar — iki çubuk aynı kalemden çıkmış görünsün. Anahtar yol
   olduğu için yeni sekme eklendiğinde ikonu da burada tanımlanır. */
const GEZINME_IKONU = {
  '/': (
    <>
      <path d="m3 10.5 9-7 9 7" />
      <path d="M5.5 9.4V20h13V9.4" />
      <path d="M9.75 20v-6h4.5v6" />
    </>
  ),
  '/ogrenciler': (
    <>
      <path d="M16.5 20v-1.5a3.5 3.5 0 0 0-3.5-3.5H6a3.5 3.5 0 0 0-3.5 3.5V20" />
      <circle cx="9.5" cy="7.5" r="3.5" />
      <path d="M21.5 20v-1.5a3.5 3.5 0 0 0-2.6-3.38" />
      <path d="M16 4.13a3.5 3.5 0 0 1 0 6.74" />
    </>
  ),
  '/konular': (
    <>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H9l1.6 2H18a1.5 1.5 0 0 1 1.5 1.5V9" />
      <path d="M4 9h16l-1.4 9.2a1.5 1.5 0 0 1-1.5 1.3H6.9a1.5 1.5 0 0 1-1.5-1.3z" />
      <path d="m10 13.7 1.6 1.6 3-3.2" />
    </>
  ),
  /* Öğrenci çubuğu. Yol = konu haritası, Ben = ilerleme. */
  '/yol': (
    <>
      <path d="M4 18c3-6 6-6 8 0s5 6 8 0" />
      <circle cx="4" cy="18" r="1.6" />
      <circle cx="20" cy="18" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
    </>
  ),
  '/denemeler': (
    <>
      <rect x="5" y="3.5" width="14" height="17" rx="2" />
      <path d="M9 8.5h6M9 12h6M9 15.5h3.5" />
    </>
  ),
  '/ben': (
    <>
      <circle cx="12" cy="8.5" r="3.8" />
      <path d="M4.5 20v-1.2A4.8 4.8 0 0 1 9.3 14h5.4a4.8 4.8 0 0 1 4.8 4.8V20" />
    </>
  ),
  '/raporlar': (
    <>
      <path d="M4 20h16" />
      <rect x="5.5" y="12" width="3.6" height="6" rx="1" />
      <rect x="10.2" y="8" width="3.6" height="10" rx="1" />
      <rect x="14.9" y="4.5" width="3.6" height="13.5" rx="1" />
    </>
  ),
}

export default function App() {
  const { durum, profil, cikisYap } = useOturum()
  const [yol, git] = useYol()
  const [okunmamisMesaj, setOkunmamisMesaj] = useState(0)

  /* Koyu tema gövdeye de yazılır. Sadece .uygulama üzerinde olduğunda,
     sayfa yatayda taştığı anda taşan şeridi body'nin kâğıt zemini
     boyuyor ve sağda beyaz bir bant kalıyordu. */
  const panelAcik = durum === 'hazir' && Boolean(profil)

  /* Gündüz/gece. Kullanıcı bir kere seçerse seçimi kalır; seçmediyse
     cihazın sistem tercihi geçerli. Tek yer body'ye yazıyor, CSS
     tarafında da tek blok okuyor. */
  const [mod, setMod] = useState(() => {
    try {
      const kayitli = localStorage.getItem('yks-mod')
      if (kayitli === 'gunduz' || kayitli === 'gece') return kayitli
    } catch { /* gizli sekmede localStorage kapalı olabilir */ }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'gece' : 'gunduz'
  })
  useEffect(() => {
    try { localStorage.setItem('yks-mod', mod) } catch { /* yok say */ }
  }, [mod])

  useEffect(() => {
    if (panelAcik) {
      document.body.dataset.tema = 'panel'
      document.body.dataset.mod = mod
    } else {
      delete document.body.dataset.tema
      delete document.body.dataset.mod
    }
    /* Telefonun durum çubuğu / tarayıcı şeridi de panelin rengini alsın.
       Beyaz şerit + koyu başlık birleşimi "web sayfası" hissi veriyordu. */
    const etiket = document.querySelector('meta[name="theme-color"]')
    const renk = !panelAcik ? '#ffffff' : mod === 'gece' ? '#0f1520' : '#ffffff'
    if (etiket) etiket.setAttribute('content', renk)
    return () => {
      delete document.body.dataset.tema
      delete document.body.dataset.mod
      if (etiket) etiket.setAttribute('content', '#ffffff')
    }
  }, [panelAcik, mod])

  /* Okunmamış mesaj sayısı. Rozet başlıkta durduğu için her ekranda
     görünür; bu yüzden hem gerçek zamanlı olay hem de yol değişimi ve
     sekmeye dönüş sayıyı tazeliyor. Tek kaynağa güvenmiyoruz: realtime
     bağlantısı düşerse rozet takılı kalmasın. */
  const kullaniciId = profil?.id ?? null
  useEffect(() => {
    if (!kullaniciId) {
      setOkunmamisMesaj(0)
      return
    }
    let iptal = false
    const say = () =>
      supabase
        .from('mesajlar')
        .select('id', { count: 'exact', head: true })
        .eq('alici_id', kullaniciId)
        .eq('okundu_mu', false)
        .then(({ count }) => {
          if (!iptal) setOkunmamisMesaj(count ?? 0)
        })

    say()

    const kanal = supabase
      .channel('mesaj-rozeti')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mesajlar' }, () => say())
      .subscribe()

    const geriDon = () => {
      if (document.visibilityState === 'visible') say()
    }
    document.addEventListener('visibilitychange', geriDon)

    return () => {
      iptal = true
      document.removeEventListener('visibilitychange', geriDon)
      supabase.removeChannel(kanal)
    }
  }, [kullaniciId, yol])

  if (durum === 'yukleniyor') {
    return (
      <div className="giris-sayfa">
        <Yukleniyor sade />
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
        <Yukleniyor sade metin="Profil hazırlanıyor" />
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

  /* Panel ekranları Kâmil'i başlıkta gösteriyor; köşedeki kopya orada
     fazlalık olurdu. Bir ekranda iki maskot olmaz. */
  const ogrenciId = yol.startsWith('/ogrenci/') ? yol.slice('/ogrenci/'.length) : null
  const gozuyleId = yol.startsWith('/gozuyle/') ? yol.slice('/gozuyle/'.length) : null
  /* Vekalette de öğrenci başlığı (dolayısıyla Kâmil) ekranda: köşedeki
     kopyası orada da gizlenmeli, yoksa iki maskot olur. */
  /* Yonetim ekraninda Kamil hic cikmiyor: orasi motivasyon degil isletme
     ekrani. Kosedeki kopya da Sistem kartinin ustune biniyordu. */
  /* Öğrencide Bugün ve Ben başlıkta Kâmil taşır; Yol'da harita kendi
     Kâmil'ini çizer. Denemeler'de başlık yok, köşedeki kopya kalır. */
  const ogrenciYolu = OGRENCI_SEKME[yol]
  const yonetimdeMi = profil.rol === 'yonetici' && yol === '/yonetim'
  const basliktaKalemVar =
    (yol === '/' && kocMu) ||
    (profil.rol === 'ogrenci' && ['/', '/ben', '/yol'].includes(yol)) ||
    Boolean(gozuyleId) ||
    yol === '/yonetim'

  // Rolüne göre gezinme. Yol tanınmıyorsa kendi ana ekranına döner.
  /* Mesajlar artık alt çubukta değil: bildirim taşıyan tek yer başlığın
     sağ köşesi. Alt çubuk yalnızca ana bölümleri gezmek için. */
  const baglantilar = kocMu
    ? [
        /* Üç sekme: her gün girilen üç yer. Konular, Kaynaklar ve veli
           özetleri ikinci seviyede: Bugün'deki kısayollar ve Rapor > Araçlar. */
        ['/', 'Bugün'],
        ['/ogrenciler', 'Öğrenciler'],
        ['/raporlar', 'Rapor'],
      ]
    : profil.rol === 'ogrenci'
      ? [
          ['/', 'Bugün'],
          ['/yol', 'Yol'],
          ['/denemeler', 'Denemeler'],
          ['/ben', 'Ben'],
        ]
      : [['/', 'Bu hafta']]

  /* Tek sekmelik bir çubuk gezinme değil, süs olur. Velide alt çubuk
     hiç çizilmiyor; ekranı da o kadar uzatıyor. */
  const gezinmeVar = baglantilar.length > 1
  const mesajlardaMi = yol === '/mesajlar'

  function icerik() {
    if (yol === '/mesajlar') return <Mesajlar profil={profil} />
    if (kocMu && yol === '/konular')
      return <KonuOncelik onOgrenciAc={(id) => git(`/ogrenci/${id}`)} onGit={git} />
    if (kocMu && yol === '/kaynaklar') return <Kaynaklar profil={profil} />
    if (kocMu && yol === '/ogrenciler')
      return (
        <Ogrencilerim
          onOgrenciAc={(id) => git(`/ogrenci/${id}`)}
          onGozuyle={(id) => git(`/gozuyle/${id}`)}
          onGit={git}
        />
      )
    if (kocMu && gozuyleId)
      return (
        <OgrenciPaneli
          profil={profil}
          ogrenciId={gozuyleId}
          vekaleten
          onCik={() => git('/ogrenciler')}
        />
      )
    if (profil.rol === 'yonetici' && yol === '/yonetim')
      return (
        <YoneticiPaneli
          profil={profil}
          onOgrenciAc={(id) => git(`/ogrenci/${id}`)}
          onGit={git}
        />
      )
    if (kocMu && yol === '/raporlar')
      return <Raporlar onOgrenciAc={(id) => git(`/ogrenci/${id}`)} onGit={git} />
    if (kocMu && ogrenciId)
      return (
        <OgrenciDetay
          ogrenciId={ogrenciId}
          onGeri={() => git('/ogrenciler')}
          onMesaj={() => git('/mesajlar')}
          onGozuyle={(id) => git(`/gozuyle/${id}`)}
        />
      )
    if (kocMu)
      return (
        <KocPaneli
          profil={profil}
          onOgrenciAc={(id) => git(`/ogrenci/${id}`)}
          onGit={git}
        />
      )
    if (profil.rol === 'veli') return <VeliPaneli />
    return (
      <OgrenciPaneli
        profil={profil}
        sekme={ogrenciYolu ?? 'bugun'}
        onSekme={(k) => git(SEKME_YOLU[k] ?? '/')}
        onGit={git}
      />
    )
  }

  return (
    <div className={gezinmeVar ? 'uygulama' : 'uygulama uygulama--gezinmesiz'}>
      <header className={yonetimdeMi ? 'ust-bar ust-bar--yonetim' : 'ust-bar'}>
        <div>
          <span className="marka">
            YKS <span className="ince">Koçluk</span>
          </span>
          <span className="ust-alt">
            {profil.ad_soyad} ·{' '}
            {profil.rol === 'yonetici' ? (
              yonetimdeMi ? (
                <span className="ust-alt--yonetim">Yönetici modu</span>
              ) : (
                'Koç modu'
              )
            ) : (
              ROL_ADI[profil.rol] ?? profil.rol
            )}
          </span>
          {/* Hangi derlemeye baktığımızı görebilmek için. Önbellek sorunlarını
              tahmin etmek yerine ölçmeyi sağlıyor. */}
          <span className="derleme-damgasi">sürüm {__DERLEME__}</span>
        </div>
        <div className="ust-eylemler">
          {/* Şapka geçişi: Kıvanç hem yönetici hem koç. Eski segmented seçici
              panelin üstünde 60px yiyordu; şimdi başlıktaki tek düğme. Düğmenin
              varlığı "yöneticisin" der, dolgusu hangi şapkanın takılı olduğunu.
              Koç rolünde çizilmez — tek seçenekli seçici bilgi taşımaz. */}
          {profil.rol === 'yonetici' && (
            <UstDugme
              etiket={yonetimdeMi ? 'Koç moduna dön' : 'Yönetici moduna geç'}
              etkin={yonetimdeMi}
              yonetim
              onClick={() => git(yonetimdeMi ? '/' : '/yonetim')}
            >
              <svg {...ikonOzellik}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </UstDugme>
          )}

          <UstDugme
            etiket={mod === 'gece' ? 'Gündüz moduna geç' : 'Gece moduna geç'}
            onClick={() => setMod((m) => (m === 'gece' ? 'gunduz' : 'gece'))}
          >
            {mod === 'gece' ? (
              <svg {...ikonOzellik}>
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </svg>
            ) : (
              <svg {...ikonOzellik}>
                <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
              </svg>
            )}
          </UstDugme>

          <UstDugme
            etiket={mesajlardaMi ? 'Mesajlardan çık' : 'Mesajlar'}
            etkin={mesajlardaMi}
            rozet={mesajlardaMi ? 0 : okunmamisMesaj}
            onClick={() => git(mesajlardaMi ? '/' : '/mesajlar')}
          >
            {mesajlardaMi ? (
              <svg {...ikonOzellik}>
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg {...ikonOzellik}>
                <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
            )}
          </UstDugme>

          <UstDugme
            etiket="Çıkış yap"
            onClick={async () => {
              await cikisYap()
              git('/')
            }}
          >
            <svg {...ikonOzellik}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="m16 17 5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
          </UstDugme>
        </div>
      </header>

      <main>
        <div className="panel">{icerik()}</div>
      </main>

      {gezinmeVar && (
      <nav className="alt-gezinme" aria-label="Ana gezinme">
        {baglantilar.map(([hedef, ad]) => {
          const etkin =
            hedef === '/ogrenciler'
              ? yol === '/ogrenciler' ||
                yol.startsWith('/ogrenci/') ||
                yol.startsWith('/gozuyle/')
              : hedef === '/raporlar'
                ? ['/raporlar', '/konular', '/kaynaklar'].includes(yol)
                : yol === hedef
          return (
            <button
              key={hedef}
              className={etkin ? 'alt-bag alt-bag--etkin' : 'alt-bag'}
              aria-current={etkin ? 'page' : undefined}
              onClick={() => git(hedef)}
            >
              <span className="alt-bag-ikon">
                <svg {...ikonOzellik} width={22} height={22}>
                  {GEZINME_IKONU[hedef]}
                </svg>
              </span>
              <span className="alt-bag-ad">{ad}</span>
            </button>
          )
        })}
      </nav>
      )}

      {/* Kâmil panel ekranlarında başlığın kendisi olduğu için köşedeki
          kopyası yalnızca orada gizleniyor. Diğer ekranlarda başlık yok,
          Kâmil köşede kalmalı. */}
      {!basliktaKalemVar && <KalemKosede profil={profil} />}

      <KurulumDaveti />
    </div>
  )
}
