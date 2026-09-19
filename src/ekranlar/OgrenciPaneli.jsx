import { useEffect, useRef, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { kutlamaKontrol } from '../lib/kutlama.js'
import KutlamaKatmani from '../bilesenler/KutlamaKatmani.jsx'
import { Uyari, Yukleniyor } from '../bilesenler/Ortak.jsx'
import HaftaSeridi from '../bilesenler/HaftaSeridi.jsx'
import OgrenciBasligi from '../bilesenler/OgrenciBasligi.jsx'
import { aksanStili } from '../lib/sekmeAksani.js'
import SiradakiKart from '../bilesenler/SiradakiKart.jsx'
import { GunGorusmesi } from '../bilesenler/AcilGorusme.jsx'
import { useKocMesaji } from '../bilesenler/KocMesaji.jsx'
import { SayacSaglayici } from '../lib/sayac.jsx'
import GunuKapat from '../bilesenler/GunuKapat.jsx'
import { Kart } from '../bilesenler/Ortak.jsx'
import HedefNet from '../bilesenler/HedefNet.jsx'
import RaporTepesi from '../bilesenler/RaporTepesi.jsx'
import SekmeTepesi from '../bilesenler/SekmeTepesi.jsx'
import HaftalikIlham from '../bilesenler/HaftalikIlham.jsx'
import Okuduklarim from '../bilesenler/Okuduklarim.jsx'
import OgrenciKaynaklari from '../bilesenler/OgrenciKaynaklari.jsx'
import Rozetlerim from './Rozetlerim.jsx'
import DenemePaneli from '../bilesenler/DenemePaneli.jsx'
import KonuHaritasi from './KonuHaritasi.jsx'
import UstBlok from '../ortak/UstBlok.jsx'
import Bolum from '../ortak/Bolum.jsx'


/* Sekme tek yoldan yönetilir: kabuktaki alt çubuk. Öğrenci kendi
   hesabında da, koç gözle bakarken de yol sekmeye çevrilip `sekme` /
   `onSekme` ile buraya geliyor. Panelin içinde ikinci bir sekme şeridi
   yok edildi: kabukta yapılan her gezinme değişikliği iki tarafta
   birden geçerli olsun diye tek gezinme bırakıldı. */

/* Kural motoru eski sekme adlarıyla yönlendirebilir; hepsi bir yere gider. */
/* Ben sekmesi kalktı: seri Yol'da, hedefe göre net Denemeler'de,
   haftanın sözü Bugün'ün sonunda. Eski adlar yine bir yere gider. */
/* "Cuma, 18 Eylül" — şeridin üstündeki gün başlığı. */
const gunBasligi = (t) =>
  t
    ? new Date(`${t}T00:00:00`).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })
        .replace(/^(\d+ \S+) (\S+)$/, '$2, $1')
    : 'Bugün'

const SEKME_ESLE = { program: 'bugun', rozetler: 'konular', ben: 'konular' }

export default function OgrenciPaneli({
  profil,
  ogrenciId,
  vekaleten = false,
  sekme: disSekme,
  onSekme: disOnSekme,
  onGit,
}) {
  /* Vekalet: koç öğrencinin panelini onun verisiyle açar. Kendi JWT'siyle
     kalır; yetkiyi RLS (private.ogrencim_mi) verir, yazılan satırlara
     islem_yapan damgası düşer. */
  const hedefId = ogrenciId ?? profil.id
  const [kayit, setKayit] = useState(null)
  const [denemeler, setDenemeler] = useState([])
  const [netDurumu, setNetDurumu] = useState(null)
  const [icSekme, setIcSekme] = useState('bugun')
  const kontrollu = typeof disOnSekme === 'function'
  const sekme = kontrollu ? (disSekme ?? 'bugun') : icSekme
  const setSekme = (k) => {
    const hedef = SEKME_ESLE[k] ?? k
    if (kontrollu) disOnSekme(hedef)
    else setIcSekme(hedef)
  }
  const [hata, setHata] = useState('')
  const [ozet, setOzet] = useState(null)
  const [ozetGeldi, setOzetGeldi] = useState(false)
  const [tazele, setTazele] = useState(0)
  const [kutlamalar, setKutlamalar] = useState([])
  const [kapatAcik, setKapatAcik] = useState(false)
  /* Gün kapandığında Yol'a geçilir ve bugün çalışılan ders açık gelir:
     günün sonunda öğrencinin göreceği şey, bugün nereyi geçtiği. */
  const [odakDers, setOdakDers] = useState(null)
  /* Hafta şeridi artık görev kartının başlığı: seçili gün burada tutuluyor,
     o günün listesi de şeritten buraya geliyor ve aynı karta besleniyor. */
  const [seciliGun, setSeciliGun] = useState(null)
  const [dersYuvasi, setDersYuvasi] = useState(null)
  const [gunVerisi, setGunVerisi] = useState(null)
  /* Koçun okunmamış mesajı başlıkta çıkar; vekalette koç kendi mesajını görmesin. */
  const kocMesaji = useKocMesaji(hedefId, !vekaleten)

  /* Kutlama, ilk açılışta değil yalnızca bir eylemden sonra bakılır.
     Bayrak yenile() ile kalkar, özet tazelendikten sonra tüketilir —
     böylece konfeti patladığında panel zaten güncel sayıyı gösteriyor. */
  const kutlamaBekliyor = useRef(false)
  const yenile = () => {
    kutlamaBekliyor.current = true
    setTazele((n) => n + 1)
  }

  useEffect(() => {
    ;(async () => {
      const { data: o, error } = await supabase
        .from('ogrenciler')
        .select(
          'id, koc_id, alan, sinif, katalog_id, hedef_universite, hedef_bolum, hedef_tyt_net, hedef_ayt_net, profiller!ogrenciler_id_fkey(ad_soyad, fotograf_yolu), kataloglar(ad)',
        )
        .eq('id', hedefId)
        .maybeSingle()
      if (error) {
        setHata(hataMetni(error))
        return
      }
      setKayit(o)

      /* Üç sorgu birbirinden bağımsız; paralel gidiyor. Sırayla giderken
         Bugün özeti en sona kalıyor, "Bugün için plan yok" görünüp sonra
         görevler ve hafta şeridi gelince kart büyüyordu. */
      const [{ data: d }, { data: nd }, { data: bugun }] = await Promise.all([
        supabase
          .from('deneme_ozet')
          .select('id, tarih, tur, yayin, toplam_net')
          .eq('ogrenci_id', hedefId)
          .order('tarih', { ascending: false })
          .limit(8),
        supabase
          .from('ogrenci_net_durumu')
          .select('tur, son_net, en_yuksek_net')
          .eq('ogrenci_id', hedefId),
        supabase.rpc('ogrenci_bugun_ozeti', { p_ogrenci_id: hedefId }),
      ])
      setDenemeler(d ?? [])
      setNetDurumu(Object.fromEntries((nd ?? []).map((x) => [x.tur, x])))
      // Çizbi artık uygulama kabuğunda, köşede duruyor; burada sadece veri
      if (bugun) setOzet(bugun)
      // Özet gelmese de iskelet takılı kalmasın; eski boş hal çizilir.
      setOzetGeldi(true)

      // Vekaletteyken çağırmıyoruz: RPC auth.uid()'e bakar, koç öğrenci
      // olmadığı için zaten boş dönerdi — boşuna gidip gelmesin.
      if (kutlamaBekliyor.current) {
        kutlamaBekliyor.current = false
        if (!vekaleten) {
          const yeni = await kutlamaKontrol()
          if (yeni.length) setKutlamalar(yeni)
        }
      }
    })()
  }, [hedefId, tazele, vekaleten])

  if (hata) return <Uyari>{hata}</Uyari>
  if (!kayit) return <Yukleniyor />


  return (
    <>
      <SayacSaglayici ogrenciId={kayit.id} onKaydedildi={yenile}>
      {sekme === 'bugun' && (
      <OgrenciBasligi
        profil={
          vekaleten
            ? { id: hedefId, rol: 'ogrenci', ad_soyad: kayit.profiller?.ad_soyad }
            : profil
        }
        ogrenciId={kayit.id}
        vekaleten={vekaleten}
        ozet={ozet}
        sekme={sekme}
        onSekme={setSekme}
        kocMesaji={kocMesaji}
        onGit={onGit}
        tarihMetni={gunBasligi(seciliGun ?? ozet?.bugun)}
      >
        {/* Plan B (19 Eylül 2026): hafta şeridi tepede, Merhaba'nın altında.
            Bugünün ilerlemesi de şeritteki bugün hücresinde. */}
        {ozetGeldi && (
          <HaftaSeridi
            ogrenciId={kayit.id}
            haftaBasi={ozet?.haftaBasi}
            bugun={ozet?.bugun}
            bugunGorevler={ozet?.gorevler}
            onDegisti={yenile}
            secili={seciliGun ?? ozet?.bugun ?? null}
            onSec={setSeciliGun}
            onListe={setGunVerisi}
          />
        )}
      </OgrenciBasligi>
      )}

      <div className="sekme-govde" style={aksanStili()}>
      {sekme === 'bugun' && !ozetGeldi ? (
        /* Bugün özeti gelene kadar Sıradaki kartı + Günü tamamla kadar yer.
           Boş liste gösterilirse öğrenci bir an "plan yok" okuyordu. */
        <Kart sinif='bugun-bekliyor'>
          <Yukleniyor satir={4} />
        </Kart>
      ) : sekme === 'bugun' ? (
        <>
          <GunGorusmesi gorevler={gunVerisi?.bugunMu === false ? gunVerisi.liste : ozet?.gorevler} />
          <SiradakiKart
            gorevler={gunVerisi?.bugunMu === false ? gunVerisi.liste : ozet?.gorevler}
            bugunMu={gunVerisi?.bugunMu !== false}
            gunAdi={gunVerisi?.bugunMu === false ? gunVerisi.ad : 'Bugünün hedefi'}
            onDegisti={gunVerisi?.bugunMu === false ? gunVerisi.yenile : yenile}
          />
          {/* Rutin ve çözülen soru Günü tamamla akışında; burada yalnız kapı.
              Gün gece kendiliğinden kapanır; bu düğme kaydı tam yapar. */}
          {ozet?.bugun && (
            <button
              /* Her zaman koyu, basılabilir olduğu belli (Bekir, 19 Eylül 2026). */
              className={`gunu-kapat-dugme${ozet.gunKapandi ? ' gunu-kapat-dugme--kapali' : ''}`}
              onClick={() => setKapatAcik(true)}
            >
              {ozet.gunKapandi ? (
                <>
                  <strong>Gün tamamlandı ✓</strong>
                  <span>Rutin ya da soru düzeltmek için dokun</span>
                </>
              ) : (
                <>
                  <strong>Günü tamamla</strong>
                  <span>Rutinler · çözülen soru · Çizbi'nin özeti</span>
                </>
              )}
            </button>
          )}
          {/* Rutinler Günü tamamla akışında; elindeki kitaplar onun altında,
              günün işi bittikten sonra bakılacak yerde. */}
          <OgrenciKaynaklari
            ogrenciId={kayit.id}
            rol="ogrenci"
            bugunDersler={[...new Set((ozet?.gorevler ?? []).map((g) => g.ders).filter(Boolean))]}
          />
          {/* Gün işle biter: en sonda söz, altında okuduğu kitap. Kitap
              "Bitirdim" deyene kadar burada sabit (Bekir, 19 Eylül 2026). */}
          <div className="veri-yuzey ogr-soz">
            <HaftalikIlham
              ogrenciId={kayit.id}
              bitirilebilir={!vekaleten && profil?.rol === 'ogrenci'}
            />
          </div>
        </>
      ) : sekme === 'konular' ? (
        <>
          {/* Başlık + ders sekmeleri tek koyu blok (TASARIM-KURALLARI 3–4). */}
          <UstBlok etiket="Yol" sekmeli sinif="rapor-tepe">
            <h1 className="rt-baslik">Yol</h1>
            <p className="rt-alt">Konu konu nerede olduğun</p>
            <div className="ob-sekme-yuvasi" ref={setDersYuvasi} />
          </UstBlok>
          <KonuHaritasi profilId={kayit.id} odakDers={odakDers} sekmeYuvasi={dersYuvasi} />
          {/* Yol uzun vadeli bakış: seri. Kitap Bugün'e taşındı. Rozetler koçta. */}
          <Rozetlerim ogrenciId={kayit.id} sadeceSeri />
          <Okuduklarim ogrenciId={kayit.id} />
        </>
      ) : (
        <>
          <HedefeGoreDurum kayit={kayit} netDurumu={netDurumu} denemeler={denemeler} />
          <DenemePaneli ogrenciId={kayit.id} katalogId={kayit.katalog_id} duzenlenebilir />
        </>
      )}
      </div>
      </SayacSaglayici>

      <GunuKapat
        acik={kapatAcik}
        onKapat={() => setKapatAcik(false)}
        onTamamlandi={() => {
          setKapatAcik(false)
          /* Bugün bitirilen işlerden konusu olan sonuncusu: patikada
             canlanacak durak onun dersinde. Konusu olan iş yoksa
             (yalnız deneme çözülmüş olabilir) Yol yine açılır, ders
             seçimi kendi kuralına düşer. */
          const bugunku = [...(ozet?.gorevler ?? [])]
            .filter((g) => g.durum === 'tamamlandi' && g.ders && g.konu)
            .pop()
          setOdakDers(bugunku?.ders ?? null)
          setSekme('konular')
        }}
        ogrenciId={kayit.id}
        katalogId={kayit.katalog_id}
        ozet={ozet}
        onDegisti={yenile}
      />

      <KutlamaKatmani kutlamalar={kutlamalar} kapandi={() => setKutlamalar([])} />
    </>
  )
}

/* Hedefe göre net durumu denemelerden doğar; yeri Denemeler'in başı.
   Eskiden Ben'deydi. Veri yeni değil: panel zaten çekiyor. */
function HedefeGoreDurum({ kayit, netDurumu, denemeler }) {
  const sonNet = denemeler?.[0] ? Number(denemeler[0].toplam_net) : null
  const oncekiNet = denemeler?.[1] ? Number(denemeler[1].toplam_net) : null
  const fark = sonNet !== null && oncekiNet !== null ? sonNet - oncekiNet : null
  const hedefAlt =
    [kayit?.hedef_universite, kayit?.hedef_bolum].filter(Boolean).join(' · ') || undefined
  /* Göstergede tek sayı: hedefi olan ilk sınav (TYT, yoksa AYT). Hedef
     yoksa gösterge boş kalır ve tepe bunu söyler; iki sınavın çubukları
     altta zaten ayrı ayrı duruyor. */
  const secim =
    kayit.hedef_tyt_net != null
      ? { ad: 'TYT', hedef: Number(kayit.hedef_tyt_net), son: netDurumu?.tyt?.son_net }
      : kayit.hedef_ayt_net != null
        ? { ad: 'AYT', hedef: Number(kayit.hedef_ayt_net), son: netDurumu?.ayt?.son_net }
        : null
  const son = secim?.son != null ? Number(secim.son) : null
  const yuzde = secim && son != null && secim.hedef > 0 ? Math.round((son / secim.hedef) * 100) : null
  const kalan = secim && son != null ? secim.hedef - son : null

  return (
    <RaporTepesi
      baslik="Denemelerim"
      altBaslik={hedefAlt}
      yuzde={yuzde}
      deger={yuzde == null ? '—' : `%${Math.min(100, yuzde)}`}
      etiket={secim ? `${secim.ad} hedefine göre` : 'Hedefe göre'}
      detay={
        !secim
          ? 'Net hedefin henüz belirlenmemiş; koçunla koyabilirsiniz.'
          : son == null
            ? `Hedef ${secim.hedef} net · ilk denemeyle başlar`
            : kalan > 0
              ? `Hedefe ${kalan.toFixed(1)} net kaldı`
              : 'Hedefin üstündesin'
      }
      durum={fark == null ? null : fark >= 0 ? 'iyi' : 'dikkat'}
      durumMetni={fark == null ? null : `Son denemede ${fark >= 0 ? '+' : '−'}${Math.abs(fark).toFixed(1)} net`}
    >
      <HedefNet tyt={kayit.hedef_tyt_net} ayt={kayit.hedef_ayt_net} durum={netDurumu} />
    </RaporTepesi>
  )
}
