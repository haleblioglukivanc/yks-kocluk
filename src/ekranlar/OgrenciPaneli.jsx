import { useEffect, useRef, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { kutlamaKontrol } from '../lib/kutlama.js'
import KutlamaKatmani from '../bilesenler/KutlamaKatmani.jsx'
import { Uyari, Yukleniyor } from '../bilesenler/Ortak.jsx'
import HaftaSeridi from '../bilesenler/HaftaSeridi.jsx'
import OgrenciBasligi from '../bilesenler/OgrenciBasligi.jsx'
import { aksanStili } from '../lib/sekmeAksani.js'
import SiradakiKart from '../bilesenler/SiradakiKart.jsx'
import { SayacSaglayici } from '../lib/sayac.jsx'
import GunuKapat from '../bilesenler/GunuKapat.jsx'
import Ben from './Ben.jsx'
import DenemePaneli from '../bilesenler/DenemePaneli.jsx'
import KonuHaritasi from './KonuHaritasi.jsx'


/* Sekme iki türlü yönetilir: öğrenci kendi hesabında alt gezinmeden
   gelir (App yolu sekmeye çevirir, `sekme`/`onSekme` verir); vekalette
   koçun alt çubuğu kendi işine ait olduğu için sekmeler burada, panelin
   içinde çizilir. İki yol da aynı gövdeyi kullanır. */
const SEKMELER = [
  ['bugun', 'Bugün'],
  ['konular', 'Konular'],
  ['denemeler', 'Denemeler'],
  ['ben', 'Ben'],
]

/* Kural motoru eski sekme adlarıyla yönlendirebilir; hepsi bir yere gider. */
const SEKME_ESLE = { program: 'bugun', rozetler: 'ben' }

export default function OgrenciPaneli({
  profil,
  ogrenciId,
  vekaleten = false,
  onCik,
  sekme: disSekme,
  onSekme: disOnSekme,
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
  const [tazele, setTazele] = useState(0)
  const [kutlamalar, setKutlamalar] = useState([])
  const [kapatAcik, setKapatAcik] = useState(false)

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

      const { data: d } = await supabase
        .from('deneme_ozet')
        .select('id, tarih, tur, yayin, toplam_net')
        .eq('ogrenci_id', hedefId)
        .order('tarih', { ascending: false })
        .limit(8)
      setDenemeler(d ?? [])

      const { data: nd } = await supabase
        .from('ogrenci_net_durumu')
        .select('tur, son_net, en_yuksek_net')
        .eq('ogrenci_id', hedefId)
      setNetDurumu(Object.fromEntries((nd ?? []).map((x) => [x.tur, x])))

      const { data: bugun } = await supabase.rpc('ogrenci_bugun_ozeti', {
        p_ogrenci_id: hedefId,
      })
      // Kâmil artık uygulama kabuğunda, köşede duruyor; burada sadece veri
      if (bugun) setOzet(bugun)

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
      {vekaleten && (
        <div className="gozuyle-serit gozuyle-serit--vekalet">
          <strong>{kayit.profiller?.ad_soyad} adına işlem yapıyorsun</strong>
          <span>
            Yaptığın her şey öğrencinin verisine yazılır ve senin adınla kaydedilir.
          </span>
          <button className="metin-dugme vekalet-cik" onClick={onCik}>
            Vekaletten çık
          </button>
        </div>
      )}

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
      />
      )}

      <div className="sekme-govde" style={aksanStili()}>
      {!kontrollu && (
      <nav className="sekmeler sekmeler--genis">
        {SEKMELER.map(([k, e]) => (
          <button
            key={k}
            className={sekme === k ? 'sekme sekme--etkin' : 'sekme'}
            onClick={() => setSekme(k)}
          >
            {e}
          </button>
        ))}
      </nav>
      )}

      {sekme === 'bugun' ? (
        <>
          <SiradakiKart gorevler={ozet?.gorevler} onDegisti={yenile} saltOkunur={vekaleten} />
          <HaftaSeridi
            ogrenciId={kayit.id}
            haftaBasi={ozet?.haftaBasi}
            bugun={ozet?.bugun}
            bugunGorevler={ozet?.gorevler}
            onDegisti={yenile}
            saltOkunur={vekaleten}
          />
          {/* Rutin ve çözülen soru Günü kapat akışında; burada yalnız kapı. */}
          {ozet?.bugun && (
            <button
              className={`gunu-kapat-dugme${ozet.gunKapandi ? ' gunu-kapat-dugme--kapali' : ''}`}
              onClick={() => setKapatAcik(true)}
            >
              {ozet.gunKapandi ? (
                <>
                  <strong>Gün kapandı ✓</strong>
                  <span>Rutin ya da soru düzeltmek için dokun</span>
                </>
              ) : (
                <>
                  <strong>Günü kapat</strong>
                  <span>Rutinler · çözülen soru · Kâmil'in özeti</span>
                </>
              )}
            </button>
          )}
        </>
      ) : sekme === 'konular' ? (
        <KonuHaritasi profilId={kayit.id} />
      ) : sekme === 'ben' ? (
        <Ben kayit={kayit} ozet={ozet} netDurumu={netDurumu} denemeler={denemeler} />
      ) : (
        <DenemePaneli ogrenciId={kayit.id} katalogId={kayit.katalog_id} duzenlenebilir />
      )}
      </div>
      </SayacSaglayici>

      <GunuKapat
        acik={kapatAcik}
        onKapat={() => setKapatAcik(false)}
        ogrenciId={kayit.id}
        katalogId={kayit.katalog_id}
        ozet={ozet}
        onDegisti={yenile}
        saltOkunur={vekaleten}
      />

      <KutlamaKatmani kutlamalar={kutlamalar} kapandi={() => setKutlamalar([])} />
    </>
  )
}
