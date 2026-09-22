import { Kalem } from './bilesenler/Kalem.jsx'
import { useEffect, useState, useLayoutEffect } from 'react'
import { flushSync } from 'react-dom'
import { supabase } from './lib/supabase.js'
import { useOturum } from './lib/oturum.js'
import { Yukleniyor } from './bilesenler/Ortak.jsx'
import Tanitim from './ekranlar/Tanitim.jsx'
import Randevu from './ekranlar/Randevu.jsx'
import Giris from './ekranlar/Giris.jsx'
import KocAnaSayfa, { YapilacaklarEkrani, OgrencilerimEkrani } from './ekranlar/KocAnaSayfa.jsx'
import { useMevsim } from './lib/mevsim.js'
import MevsimSahnesi from './ortak/MevsimSahnesi.jsx'
import OgrenciDetay from './ekranlar/OgrenciDetay.jsx'
import Baglantilar from './ekranlar/Baglantilar.jsx'
import SifreDegistir from './ekranlar/SifreDegistir.jsx'
import OgrenciPaneli from './ekranlar/OgrenciPaneli.jsx'
import VeliPaneli from './ekranlar/VeliPaneli.jsx'
import Mesajlar from './ekranlar/Mesajlar.jsx'
import KonuOncelik from './ekranlar/KonuOncelik.jsx'
import Kaynaklar from './ekranlar/Kaynaklar.jsx'
import KalemKosede from './bilesenler/KalemKosede.jsx'
import UstCubuk from './bilesenler/UstCubuk.jsx'
import BaglantiSeridi from './bilesenler/BaglantiSeridi.jsx'
import { useGenisEkran } from './lib/genislik.js'
import HesapYapragi from './bilesenler/HesapYapragi.jsx'
import KocProfili from './ekranlar/KocProfili.jsx'
import { BasvurularSayfasi, SosyalSayfasi, IlhamSayfasi, KutuphaneSayfasi, OdemelerSayfasi, KvkkSayfasi, SistemSayfasi } from './ekranlar/YonetimParcalari.jsx'
import AnaTepe from './ortak/AnaTepe.jsx'
import Bildirimler from './ekranlar/Bildirimler.jsx'
import KurulumDaveti from './pwa/KurulumDaveti.jsx'
import { durumCubugu, kuruluMu } from './pwa/pwa.js'
import BildirimDaveti from './pwa/BildirimDaveti.jsx'
import { bildirimKaydiniTazele, cihaziHesaptanAyir, ikonRakami } from './pwa/bildirim.js'

/* Öğrencinin alt çubuğu ile panel sekmeleri aynı şey; yol ↔ sekme. */
const OGRENCI_SEKME = { '/': 'bugun', '/yol': 'konular', '/denemeler': 'denemeler' }
const SEKME_YOLU = Object.fromEntries(Object.entries(OGRENCI_SEKME).map(([y, s]) => [s, y]))

/* Site kökte yayınlanıyor ama yollar yine de tabana göre okunuyor.
   Mutlak yazıldığı dönemde alt dizinde çalışırken `git('/mesajlar')`
   adres çubuğunu sitenin dışına taşıyordu: sayfa açık kaldığı sürece
   görünmüyor, yenilendiği anda 404. Aynı nedenle '/' ile karşılaştıran
   her yer sessizce yanlış cevap veriyordu (Panel sekmesi hiç etkin
   görünmüyordu, panelde iki Çizbi birden çıkıyordu). Alan adı alınıp
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

  /* Geçmişe kayıt eklemeden adresi değiştirir (geri tuşu eski adrese dönmesin). */
  const degistir = (hedef) => {
    window.history.replaceState({}, '', TABAN + hedef)
    setYol(hedef)
  }

  return [yol, git, degistir]
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
  /* Yönetim: yalnızca geniş ekranda ve yalnızca yöneticide görünür. */
  '/yonetim': (
    <>
      <path d="M12 3.5 4.5 6.8v5c0 4.2 3 7.6 7.5 8.7 4.5-1.1 7.5-4.5 7.5-8.7v-5z" />
      <path d="m9.2 12.2 2 2 3.6-3.9" />
    </>
  ),
  '/konular': (
    <>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H9l1.6 2H18a1.5 1.5 0 0 1 1.5 1.5V9" />
      <path d="M4 9h16l-1.4 9.2a1.5 1.5 0 0 1-1.5 1.3H6.9a1.5 1.5 0 0 1-1.5-1.3z" />
      <path d="m10 13.7 1.6 1.6 3-3.2" />
    </>
  ),
  /* Öğrenci çubuğu. Yol = konu haritası + yolda biriktirdiklerin. */
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
  /* Geniş ekranda (≥64rem) koç iki sütun görür: solda akış, sağda liste ya
     da seçilen öğrenci. Aynı bileşenler, yalnız yerleşim; dar ekranda tek
     sütun ve ayrı ekranlar. Kanca koşulsuz, en üstte. */
  const genis = useGenisEkran()
  /* Mevsim: kök etikete data-mevsim yazar; renkler mevsim.css'ten gelir. */
  useMevsim()
  const { durum, profil, kullanici, cikisYap, kurtarma, kurtarmaBitti, yenile: profiliYenile } = useOturum()
  const [sifreErtelendi, setSifreErtelendi] = useState(() => {
    try { return sessionStorage.getItem('sifre-ertelendi') === '1' } catch { return false }
  })
  const [hesapAcik, setHesapAcik] = useState(false)
  const [bekleyenKarar, setBekleyenKarar] = useState(0)
  const [yol, git, degistir] = useYol()

  /* Her sayfanın canonical'ı kendi adresi. index.html tek dosya olduğu için
     statik etiket hep ana sayfayı gösteriyordu; arama motoru /giris ve
     /randevu'yu ana sayfanın kopyası sanıyordu. */
  useEffect(() => {
    const etiket = document.querySelector('link[rel="canonical"]')
    if (etiket) etiket.setAttribute('href', `https://khkocluk.com${yol}`)
  }, [yol])
  const [okunmamisMesaj, setOkunmamisMesaj] = useState(0)

  /* Koyu tema gövdeye de yazılır. Sadece .uygulama üzerinde olduğunda,
     sayfa yatayda taştığı anda taşan şeridi body'nin kâğıt zemini
     boyuyor ve sağda beyaz bir bant kalıyordu. */
  const panelAcik = durum === 'hazir' && Boolean(profil)

  /* Gece modu kaldırıldı (14 Eylül 2026): tek tema var. Her UI değişikliği
     iki temada birden doğrulanmak zorundaydı, pratikte doğrulanmıyordu ve
     cihazı karanlıkta olan öğrenci test edilmemiş bir ekrana düşüyordu. */
  useEffect(() => {
    if (panelAcik) {
      document.body.dataset.tema = 'panel'
    } else {
      delete document.body.dataset.tema
    }
    return () => { delete document.body.dataset.tema }
  }, [panelAcik])

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
    /* Zil iki kaynağı birden sayıyor: okunmamış mesajlar ve bildirim
       kuyruğundaki okunmamış kayıtlar. İkincisi eskiden yalnızca push
       olarak gidiyordu, uygulama içinde hiç görünmüyordu. */
    const say = async () => {
      const [mesaj, bildirim] = await Promise.all([
        supabase
          .from('mesajlar')
          .select('id', { count: 'exact', head: true })
          .eq('alici_id', kullaniciId)
          .eq('okundu_mu', false),
        supabase
          .from('bildirim_kuyrugu')
          .select('id', { count: 'exact', head: true })
          .eq('alici_id', kullaniciId)
          .eq('okundu_mu', false),
      ])
      if (iptal) return
      const toplam = (mesaj.count ?? 0) + (bildirim.count ?? 0)
      setOkunmamisMesaj(toplam)
      // Ana ekran ikonundaki rakam uygulamadaki rozetle aynı (bildirim-gonder de aynı hesabı yapar)
      ikonRakami(toplam)
    }

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

  /* Zildeki sayı: okunmamış mesaj + koçta karar kuyruğu. Bildirimler
     ekranındaki listeyle aynı kaynaklar; sayı ile liste birbirini tutar. */
  const kocRol = profil?.rol === 'koc'
  /* Koçta /bildirimler artık yok: eski bağlantılar ve bildirim tıklamaları
     Yapılacaklar'a düşer (22 Eylül 2026). */
  useEffect(() => {
    if (kocRol && yol === '/bildirimler') git('/yapilacaklar')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kocRol, yol])
  useEffect(() => {
    if (!kullaniciId || !kocRol) {
      setBekleyenKarar(0)
      return
    }
    let iptal = false
    supabase.rpc('koc_karar_kuyrugu', { p_limit: 99 }).then(({ data }) => {
      if (!iptal) setBekleyenKarar((data ?? []).length)
    })
    return () => { iptal = true }
  }, [kullaniciId, kocRol, yol])

  /* Öğrencinin dünyası sıcak: tema.css body[data-rol] ile paleti değiştirir.
     Koç vekaleten (/gozuyle/) girince de aynı ekranı görür. Erken
     dönüşlerin üstünde duruyor; hook sırası bozulmasın. */
  const ogrenciDunyasi = profil?.rol === 'ogrenci' || yol.startsWith('/gozuyle/')
  /* useLayoutEffect: boyamadan önce çalışır. useEffect ile ilk kare
     data-rol'süz boyanıyor, masaüstünde üst şerit ve içerik bir kez
     zıplıyordu (her sayfada CLS ~0.03). */
  useLayoutEffect(() => {
    if (ogrenciDunyasi) document.body.dataset.rol = 'ogrenci'
    else if (profil) document.body.dataset.rol = 'koc'
    else delete document.body.dataset.rol
    return () => { delete document.body.dataset.rol }
  }, [ogrenciDunyasi, Boolean(profil)])

  /* Bildirim izni olan cihaz her girişte bu hesaba bağlanır (aynı telefonda
     hesap değiştiyse bildirimler yeni hesaba gelsin). */
  const profilId = profil?.id ?? null
  useEffect(() => {
    if (!profilId) return
    bildirimKaydiniTazele()
    const one = () => { if (document.visibilityState === 'visible') bildirimKaydiniTazele() }
    document.addEventListener('visibilitychange', one)
    return () => document.removeEventListener('visibilitychange', one)
  }, [profilId])

  /* Giriş yapılınca adres /giris'te kalmasın: uygulama ana ekranı '/'.
     Kurulu uygulama /giris'ten açılıyor (manifest start_url). */
  const girisli = durum === 'hazir' && Boolean(profil)
  useEffect(() => {
    if (girisli && yol === '/giris') degistir('/')
  }, [girisli, yol])

  /* Durum çubuğu (telefonda saat/pil şeridi, kurulu uygulamada pencere
     başlığı) ekranın tepesiyle aynı renkte: öğrencide koyu amber, koç ve
     velide lacivert. Renk tema.css'te rolün --tepe-ust'u; data-rol yukarıda
     yazıldığı için bu efekt ondan sonra gelmeli. Panel dışında (tanıtım,
     giriş) --durum-cubugu. */
  useLayoutEffect(() => {
    const oku = (el, ad) => getComputedStyle(el).getPropertyValue(ad).trim()
    durumCubugu(panelAcik ? oku(document.body, '--tepe-ust') : oku(document.documentElement, '--durum-cubugu'))
  }, [panelAcik, ogrenciDunyasi])

  if (durum === 'yukleniyor') {
    return (
      <div className="giris-sayfa">
        <Yukleniyor sade />
      </div>
    )
  }

  // Giriş yapılmamış: tanıtım veya giriş
  if (durum === 'cikis') {
    /* Ana ekrandan açılan uygulama tanıtım sayfası göstermez: girişe
       gider, geri düğmesi olmaz. Randevu formu yine açılabilir. */
    if (kuruluMu() && yol !== '/randevu') return <Giris />
    if (yol === '/giris') return <Giris onGeri={() => git('/')} />
    if (yol === '/randevu') return <Randevu onGeri={() => git('/')} />
    return <Tanitim onGiris={() => git('/giris')} onRandevu={() => git('/randevu')} />
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
              await cihaziHesaptanAyir()
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

  /* Rol ne olduğun, yöneticilik ayrı bir yetki: bir koç aynı zamanda
     yönetici olabilir, koç olmayan biri de yalnızca yönetici olabilir. */
  const kocMu = profil.rol === 'koc'
  const yoneticiMi = profil.yonetici === true

  /* Panel ekranları Çizbi'yi başlıkta gösteriyor; köşedeki kopya orada
     fazlalık olurdu. Bir ekranda iki maskot olmaz. */
  const ogrenciId = yol.startsWith('/ogrenci/') ? yol.slice('/ogrenci/'.length) : null
  /* Göz: koç öğrencinin kendi arayüzüne girer. Yol öğrencininkiyle birebir
     aynı üç parçaya ayrılıyor (/gozuyle/:id, .../yol, .../denemeler) ki
     kabuk — alt çubuk, koyu tepe, Çizbi'nin yeri — öğrencide ne yapıyorsa
     burada da aynısını yapsın. Panelin içinde ayrı bir sekme şeridi yok. */
  const gozuyleParca = yol.startsWith('/gozuyle/') ? yol.slice('/gozuyle/'.length).split('/') : null
  const gozuyleId = gozuyleParca?.[0] || null
  const gozuyleSekme = gozuyleId
    ? (OGRENCI_SEKME[`/${gozuyleParca[1] ?? ''}`] ?? 'bugun')
    : null
  const gozuyleYolu = (k) => {
    const alt = SEKME_YOLU[k] ?? '/'
    return `/gozuyle/${gozuyleId}${alt === '/' ? '' : alt}`
  }
  /* Yonetim ekraninda Çizbi hic cikmiyor: orasi motivasyon degil isletme
     ekrani. Kosedeki kopya da Sistem kartinin ustune biniyordu. */
  /* Öğrencide Bugün başlıkta Çizbi taşır; Yol'da harita kendi
     Çizbi'sini çizer. Denemeler'de başlık yok, köşedeki kopya kalır. */
  const ogrenciYolu = OGRENCI_SEKME[yol]
  /* Tanınmayan her yol ana ekrana düşer (giriş sonrası '/giris' gibi).
     Ana ekran kararı da aynı kurala uymalı; yoksa başlık kart kalıyordu. */
  const TANINAN = ['/sifre', '/baglantilar', '/mesajlar', '/mesajlar/', '/bildirimler', '/konular', '/kaynaklar', '/ogrenciler', '/gozuyle/', '/yonetim', '/ogrenci/', '/yapilacaklar', '/ogrencilerim', '/profil', '/yol', '/denemeler', '/basvurular', '/sosyal', '/ilham', '/kutuphane', '/odemeler', '/kvkk', '/sistem']
  const anaEkranda = yol === '/' || !TANINAN.some((t) => (t.endsWith('/') ? yol.startsWith(t) : yol === t))

  const yonetimdeMi = yoneticiMi && yol === '/yonetim'
  const basliktaKalemVar =
    (anaEkranda && kocMu) ||
    (profil.rol === 'ogrenci' && (anaEkranda || yol === '/yol')) ||
    (profil.rol === 'veli' && anaEkranda) ||
    /* Vekalette köşe Çizbi'si hiç yok: giriş yapan koç olduğu için koçun
       cümlelerini söylüyor ve olay kaydını koçun satırına yazıyordu. */
    Boolean(gozuyleId) ||
    yol === '/yonetim'

  /* Çizbi'nin köşeden gelen sözleri ekrana bağlı; yolun ilk parçası ekran adı. */
  const ekranAdi = gozuyleId
    ? gozuyleSekme
    : anaEkranda ? 'bugun' : yol === '/yol' ? 'konular' : yol.split('/')[1] || 'bugun'

  /* Bugün ekranında koyu başlık üst şeritle birleşip tepeye yapışır. */
  const koyuTepe =
    yol === '/sifre' ||
    (anaEkranda && (kocMu || profil.rol === 'ogrenci' || profil.rol === 'veli')) ||
    /* Öğrenci detayı telefonda da koyu tepeyle açılır: üst blok header'a
       bitişik tek parça (TASARIM-KURALLARI 3). */
    (kocMu && (yol === '/baglantilar' || yol === '/kaynaklar' || yol === '/yonetim' || yol === '/sifre' || Boolean(ogrenciId))) ||
    (profil.rol === 'ogrenci' && (yol === '/denemeler' || yol === '/yol')) ||
    Boolean(gozuyleId)

  // Rolüne göre gezinme. Yol tanınmıyorsa kendi ana ekranına döner.
  /* Mesajlar artık alt çubukta değil: bildirim taşıyan tek yer başlığın
     sağ köşesi. Alt çubuk yalnızca ana bölümleri gezmek için. */
  /* Üçüncü değer ikon anahtarı: gözle bakarken yollar /gozuyle/... olduğu
     için ikon tablosunun anahtarıyla yol artık aynı şey değil. */
  const baglantilar = gozuyleId
    ? [
        /* Öğrencinin çubuğunun aynısı. Koçun kendi sekmeleri burada
           görünmez: gözle bakarken ekran baştan sona öğrencinin ekranı. */
        [gozuyleYolu('bugun'), 'Bugün', '/'],
        [gozuyleYolu('konular'), 'Yol', '/yol'],
        [gozuyleYolu('denemeler'), 'Denemeler', '/denemeler'],
      ]
    : kocMu
    ? [
        /* Üç sekme: her gün girilen üç yer. Konular, Kaynaklar ve veli
           özetleri ikinci seviyede: Bugün'deki kısayollar ve Rapor > Araçlar. */
        ['/', 'Bugün', '/'],
        ['/ogrencilerim', 'Öğrenciler', '/ogrencilerim'],
        ['/raporlar', 'Rapor', '/raporlar'],
        /* Yönetim yalnızca geniş ekranda: telefonda dördüncü sekme çubuğu
           ağırlaştırır ve yönetim işi zaten masa başı işi. */
        ...(yoneticiMi && genis ? [['/yonetim', 'Yönetim', '/yonetim']] : []),
      ]
    : profil.rol === 'ogrenci'
      ? [
          ['/', 'Bugün', '/'],
          ['/yol', 'Yol', '/yol'],
          ['/denemeler', 'Denemeler', '/denemeler'],
        ]
      : [['/', 'Bu hafta', '/']]

  /* Tek sekmelik bir çubuk gezinme değil, süs olur. Velide alt çubuk
     hiç çizilmiyor; ekranı da o kadar uzatıyor. */
  /* Alt menü ve yan çubuk kalktı (21 Eylül 2026, Bekir): her rolün tek
     ana sayfası var, diğer ekranlara oradan ve geri düğmesiyle gidilir. */
  const gezinmeVar = false && baglantilar.length > 1
  /* Ana sayfa kendi tepesini (manzara + zil + hesap) çizer; üst şerit
     orada gizlenir. Koç öğrencinin gözüyle bakarken şerit kalır: geri
     düğmesi orada. */
  const anaSayfada = (kocMu && Boolean(gozuyleId)) || (!gozuyleId && ((anaEkranda && (kocMu || profil.rol === 'ogrenci')) || (kocMu && (yol === '/yapilacaklar' || yol === '/ogrencilerim' || yol === '/ogrenciler' || yol === '/profil' || yol === '/sifre' || yol === '/konular' || yol === '/kaynaklar' || yol === '/baglantilar' || ['/basvurular', '/sosyal', '/ilham', '/kutuphane', '/odemeler', '/kvkk', '/sistem', '/yonetim'].includes(yol) || Boolean(ogrenciId))) || ((kocMu || profil.rol === 'ogrenci') && (yol.startsWith('/mesajlar') || yol === '/bildirimler' || yol === '/profil')) || (profil.rol === 'ogrenci' && (yol === '/yol' || yol === '/denemeler'))))
  const basHarf = (profil.ad_soyad ?? '').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toLocaleUpperCase('tr')
  /* Koçta Bildirimler ekranı kalktı (22 Eylül 2026, Bekir "A"): aynı mesaj
     üç yerden çıkıyordu. Zil doğrudan Yapılacaklar'ı açar ve rozeti oradaki
     iş sayısıdır (posta kutusuyla aynı sayı); okunmamış mesajlar için zilin
     yanında ayrı bir mesaj düğmesi var. Öğrencide gelen kutusu aynen. */
  const kocMesajDugmesi = kocMu ? (
    <button type="button" className="ana-yuvarlak" onClick={() => git('/mesajlar')} aria-label={okunmamisMesaj > 0 ? `Mesajlar, ${okunmamisMesaj} okunmamış` : 'Mesajlar'} title="Mesajlar">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z" /></svg>
      {okunmamisMesaj > 0 && <span className="ana-rozet">{okunmamisMesaj > 9 ? '9+' : okunmamisMesaj}</span>}
    </button>
  ) : null
  const anaTepe = {
    rozet: kocMu ? bekleyenKarar : okunmamisMesaj,
    gelenKutusu: profil.rol === 'ogrenci',
    onZil: () => git(kocMu ? '/yapilacaklar' : '/bildirimler'),
    zilEtiket: kocMu ? 'Yapılacaklar' : 'Bildirimler',
    ekDugme: kocMesajDugmesi,
    /* Koçta köşedeki KH düğmesi yok (22 Eylül 2026, Bekir): profil ana
       ekrandaki fotoğraf çerçevesinden ve selamdan açılır. */
    onHesap: kocMu || profil.rol === 'ogrenci' ? undefined : () => setHesapAcik(true),
    onProfil: () => git('/profil'),
    fotoYolu: profil.fotograf_yolu ?? null,
    hesapHarf: basHarf,
  }
  /* Menü yokken her alt ekrandan ana sayfaya dönüş üst şeritteki geri
     düğmesinden. Gözle bakarken önce öğrencinin ana sayfası, oradan detay. */
  const geriHedef = gozuyleId
    ? (gozuyleSekme === 'bugun' ? `/ogrenci/${gozuyleId}` : gozuyleYolu('bugun'))
    : anaEkranda ? null : '/'
  const bildirimlerdeMi = yol === '/bildirimler'

  function icerik() {
    /* "Şifremi unuttum" bağlantısıyla gelen: önce yeni şifresini belirler.
       Mevcut şifre sorulmaz (bilmiyor); bağlantı kimliğini zaten doğruladı. */
    if (kurtarma && !gozuyleId)
      return (
        <SifreDegistir
          kurtarma
          onBitti={() => { kurtarmaBitti(); window.location.assign('/') }}
        />
      )
    /* Geçici şifreyle açılan (ya da sıfırlanan) hesap: önce kendi şifresini
       belirlemesi önerilir. "Sonra" bu oturum boyunca sormaz. */
    if (profil.sifre_degistirmeli && !sifreErtelendi && !gozuyleId)
      return (
        <SifreDegistir
          ilk
          onSonra={() => {
            try { sessionStorage.setItem('sifre-ertelendi', '1') } catch { /* gizli sekme */ }
            setSifreErtelendi(true)
          }}
          onBitti={() => window.location.assign('/')}
        />
      )
    /* Koçun profilinden açılan ara sıra sayfalar (22 Eylül 2026): ortak sahneli
       tepe, geri profile döner; içerik aynı, eski koyu başlıklar gizli. */
    const kocAltSayfa = (baslik, ozet, icerik) => (
      <div className="ana-sayfa">
        <AnaTepe selam={baslik} tarih={new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^(\d+ \S+) (\S+)$/, '$2, $1')} ozet={ozet} {...anaTepe} onGeri={() => git('/profil')} />
        <div className="ana-govde ana-govde--dar od-govde eski-ic">{icerik}</div>
      </div>
    )
    if (kocMu && yol === '/sifre') return kocAltSayfa('Şifremi değiştir', 'Yeni şifren en az 8 karakter olsun.', <SifreDegistir onBitti={() => git('/profil')} />)
    if (yol === '/sifre') return <SifreDegistir onBitti={() => git('/')} />
    if (yol === '/mesajlar') return <Mesajlar key="kutu" profil={profil} tepe={anaTepe} onGeri={() => git('/')} />
    /* Doğrudan bir kişinin yazışması (öğrenci kartındaki Mesaj düğmesi).
       Geri, geldiği yere döner; adres doğrudan açıldıysa kutuya düşer. */
    if (yol.startsWith('/mesajlar/'))
      return (
        <Mesajlar
          key={yol}
          profil={profil}
          kisiId={yol.slice('/mesajlar/'.length)}
          tepe={anaTepe}
          onGeri={() => (window.history.state ? window.history.back() : git('/mesajlar'))}
        />
      )
    if (yol === '/bildirimler' && kocMu) return null // yönlendirme yukarıdaki etkide
    if (yol === '/bildirimler') return <Bildirimler profil={profil} onGit={git} tepe={{ ...anaTepe, onGeri: () => git('/') }} />
    if (kocMu && yol === '/konular')
      return kocAltSayfa('Konu öncelikleri', 'Hangi konular önce çalışılsın.', <KonuOncelik onOgrenciAc={(id) => git(`/ogrenci/${id}`)} onGit={git} />)
    if (kocMu && yol === '/kaynaklar') return kocAltSayfa('Kaynaklar', 'Kitaplar, bağlantılar ve kendi hazırladıkların.', <Kaynaklar profil={profil} />)
    if (kocMu && yol === '/baglantilar') return kocAltSayfa('Telegram bağlantısı', 'Öğrencilerinle telefonundan da yazış.', <Baglantilar />)
    /* Eski öğrenci listesi kalktı (22 Eylül 2026): /ogrenciler, yeni
       Öğrencilerim ekranına gider. */
    if (kocMu && gozuyleId)
      return (
        <OgrenciPaneli
          profil={profil}
          ogrenciId={gozuyleId}
          vekaleten
          sekme={gozuyleSekme}
          onSekme={(k) => git(gozuyleYolu(k))}
          onGit={git}
          /* Vekalet (22 Eylül 2026): öğrencinin sahneli ekranı aynen; koyu
             üst şerit ve "Yönetime dön" yok. Geri → öğrencinin koç ekranı,
             zil → o öğrenciyle yazışma. */
          tepe={{
            onGeri: () => git(gozuyleSekme === 'bugun' ? `/ogrenci/${gozuyleId}` : gozuyleYolu('bugun')),
            gelenKutusu: true,
            rozet: 0,
            onZil: () => git(`/mesajlar/${gozuyleId}`),
          }}
        />
      )
    /* Yönetim paneli kalktı (22 Eylül 2026): parçaları profildeki satırlardan
       açılan sayfalarda; teknik kayıtlar yalnız /sistem'de. Eski /yonetim
       bağlantıları (acil e-postadaki #sosyal) doğru sayfaya düşer. */
    if (kocMu && yol === '/basvurular') return kocAltSayfa('Başvurular', 'Tanıtım sitesinden gelen öğrenci adayları.', <BasvurularSayfasi />)
    if (kocMu && yol === '/sosyal') return kocAltSayfa('Sosyal mesajlar', 'Instagram ve YouTube; onayın olmadan hiçbir yanıt gitmez.', <SosyalSayfasi />)
    if (kocMu && yol === '/ilham') return kocAltSayfa('Haftanın kitabı ve sözü', 'Öğrencilere gidecek 12 haftalık plan.', <IlhamSayfasi />)
    if (kocMu && yol === '/kutuphane') return kocAltSayfa('Kütüphane', 'Kurum geneli konu kataloğu ve içerik.', <KutuphaneSayfasi onGit={git} />)
    if (kocMu && yol === '/odemeler') return kocAltSayfa('Ödemeler', 'Bu ayın tahsilatı ve gecikenler.', <OdemelerSayfasi onOgrenciAc={(id) => git(`/ogrenci/${id}`)} />)
    if (kocMu && yol === '/kvkk') return kocAltSayfa('KVKK ve izinler', 'Veli iletişim izinleri ve kişisel veri talepleri.', <KvkkSayfasi />)
    if (yoneticiMi && (yol === '/sistem' || yol === '/yonetim')) {
      if (yol === '/yonetim' && typeof window !== 'undefined' && /#(sosyal|iletisim)/.test(window.location.hash)) return kocAltSayfa('Sosyal mesajlar', 'Instagram ve YouTube; onayın olmadan hiçbir yanıt gitmez.', <SosyalSayfasi />)
      return kocAltSayfa('Sistem', 'Teknik kayıtlar. Menüde yok; yalnız bu adresten açılır.', <SistemSayfasi />)
    }
    if (kocMu && ogrenciId)
      return (
        <OgrenciDetay
          ogrenciId={ogrenciId}
          onGeri={() => git('/ogrencilerim')}
          onMesaj={(id) => git(id ? `/mesajlar/${id}` : '/mesajlar')}
          onGozuyle={(id) => git(`/gozuyle/${id}`)}
          tepe={anaTepe}
        />
      )
    if ((kocMu || profil.rol === 'ogrenci') && yol === '/profil')
      return (
        <KocProfili
          profil={profil}
          eposta={kullanici?.email}
          tepe={{ ...anaTepe, onGeri: () => git('/') }}
          yonetimdeMi={yonetimdeMi}
          onSapka={(sapka) => git(sapka === 'yonetici' ? '/yonetim' : '/')}
          onCikis={async () => {
            await cihaziHesaptanAyir()
            await cikisYap()
            git('/')
          }}
          onGit={git}
          onYenile={profiliYenile}
        />
      )
    if (kocMu && yol === '/yapilacaklar') return <YapilacaklarEkrani onOgrenciAc={(id) => git(`/ogrenci/${id}`)} tepe={{ ...anaTepe, onZil: undefined, onGeri: () => git('/') }} />
    if (kocMu && (yol === '/ogrencilerim' || yol === '/ogrenciler')) return <OgrencilerimEkrani onOgrenciAc={(id) => git(`/ogrenci/${id}`)} onMesaj={(id) => git(`/mesajlar/${id}`)} tepe={{ ...anaTepe, onGeri: () => git('/') }} />
    if (kocMu)
      return <KocAnaSayfa profil={profil} onGit={git} tepe={anaTepe} />
    if (profil.rol === 'veli') return <VeliPaneli profil={profil} />
    return (
      <OgrenciPaneli
        profil={profil}
        sekme={ogrenciYolu ?? 'bugun'}
        onSekme={(k) => git(SEKME_YOLU[k] ?? '/')}
        onGit={git}
        tepe={anaTepe}
      />
    )
  }

  return (
    <div
      className={[
        'uygulama',
        gezinmeVar ? '' : 'uygulama--gezinmesiz',
        koyuTepe && !anaSayfada ? 'uygulama--koyu-tepe' : '',
        anaSayfada ? 'uygulama--ana' : '',
      ].filter(Boolean).join(' ')}
    >
      {/* Sayfanın arkasındaki sabit mevsim sahnesi: renk, ufuk, parçacıklar. */}
      <MevsimSahnesi />
      {/* Tepe: koyu şerit. Bugün ekranlarında altındaki koyu başlıkla
          birleşir; diğer ekranlarda tek başına kalır. */}
      <header className="ust-serit">
        <UstCubuk
          profil={profil}
          /* Vekalette tepe öğrencinin tepesi: Çizbi yüzlü gelen kutusu,
             koçun zili ve karar sayısı yok. Dokununca o öğrenciyle
             yazışma açılır — öğrencinin gelen kutusunun koçtaki karşılığı. */
          rozet={gozuyleId || bildirimlerdeMi ? 0 : kocMu ? bekleyenKarar : okunmamisMesaj}
          zilEtkin={bildirimlerdeMi}
          gelenKutusu={profil.rol === 'ogrenci' || Boolean(gozuyleId)}
          hesapGizli={Boolean(gozuyleId)}
          hesapEtkin={hesapAcik}
          onGeri={geriHedef ? () => git(geriHedef) : null}
          onLogo={() => git(gozuyleId ? gozuyleYolu('bugun') : '/')}
          onZil={() => git(gozuyleId ? `/mesajlar/${gozuyleId}` : bildirimlerdeMi ? '/' : kocMu ? '/yapilacaklar' : '/bildirimler')}
          onHesap={() => (kocMu || profil.rol === 'ogrenci' ? git('/profil') : setHesapAcik(true))}
        />
      </header>

      <BaglantiSeridi />

      <main>
        <div className="panel">{icerik()}</div>
      </main>

      {gezinmeVar && (
      <nav className="alt-gezinme" aria-label="Ana gezinme">
        {baglantilar.map(([hedef, ad, ikonAnahtar]) => {
          const etkin = gozuyleId
            ? yol === hedef
            : hedef === '/ogrenciler'
              ? yol === '/ogrenciler' ||
                yol.startsWith('/ogrenci/') ||
                yol.startsWith('/gozuyle/')
              : hedef === '/raporlar'
                ? ['/raporlar', '/konular', '/kaynaklar'].includes(yol)
                : hedef === '/' ? anaEkranda : yol === hedef
          return (
            <button
              key={hedef}
              className={etkin ? 'alt-bag alt-bag--etkin' : 'alt-bag'}
              aria-current={etkin ? 'page' : undefined}
              onClick={() => git(hedef)}
            >
              <span className="alt-bag-ikon">
                <svg {...ikonOzellik} width={22} height={22}>
                  {GEZINME_IKONU[ikonAnahtar ?? hedef]}
                </svg>
              </span>
              <span className="alt-bag-ad">{ad}</span>
              {/* Koç daha tıklamadan nerede iş olduğunu görsün: Bugün'ün
                  yanında bekleyen karar sayısı. */}
              {hedef === '/' && kocMu && !gozuyleId && bekleyenKarar > 0 && (
                <span className="alt-bag-rozet">{bekleyenKarar}</span>
              )}
            </button>
          )
        })}
        {kocMu && genis && !gozuyleId && (
          <div className="yan-not" aria-live="polite">
            <span className="yan-not-cizbi" aria-hidden="true"><Kalem ruh="fikir" boyut={34} /></span>
            <span>{bekleyenKarar > 0 ? `${bekleyenKarar} karar bekliyor. Bir bir gidelim.` : 'Kuyruk boş. Bugün rahat.'}</span>
          </div>
        )}
      </nav>
      )}

      {/* Çizbi panel ekranlarında başlığın kendisi olduğu için köşedeki
          kopyası yalnızca orada gizleniyor. Diğer ekranlarda başlık yok,
          Çizbi köşede kalmalı. */}
      {!basliktaKalemVar && <KalemKosede profil={profil} ekran={ekranAdi} />}

      <HesapYapragi
        acik={hesapAcik}
        onKapat={() => setHesapAcik(false)}
        profil={profil}
        eposta={kullanici?.email}
        yonetimdeMi={yonetimdeMi}
        onSapka={(s) => git(s === 'yonetici' ? '/yonetim' : '/')}
        onCikis={async () => {
          setHesapAcik(false)
          await cihaziHesaptanAyir()
          await cikisYap()
          git('/')
        }}
        onGit={git}
      />

      <KurulumDaveti />
      <BildirimDaveti rol={profil?.rol} />
    </div>
  )
}
