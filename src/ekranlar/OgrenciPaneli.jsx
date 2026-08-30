import { useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Bos, Kart, Uyari, Yukleniyor } from '../bilesenler/Ortak.jsx'
import ProgramIzgarasi from '../bilesenler/ProgramIzgarasi.jsx'
import OgrenciBasligi from '../bilesenler/OgrenciBasligi.jsx'
import { aksanStili } from '../lib/sekmeAksani.js'
import HedefNet from '../bilesenler/HedefNet.jsx'
import CalismaSayaci from '../bilesenler/CalismaSayaci.jsx'
import GunHedefleri from '../bilesenler/GunHedefleri.jsx'
import GunlukRutinler from '../bilesenler/GunlukRutinler.jsx'
import BugunCozulen from '../bilesenler/BugunCozulen.jsx'
import DenemePaneli from '../bilesenler/DenemePaneli.jsx'
import KonuHaritasi from './KonuHaritasi.jsx'
import Rozetlerim from './Rozetlerim.jsx'


export default function OgrenciPaneli({ profil, ogrenciId, vekaleten = false, onCik }) {
  /* Vekalet: koç öğrencinin panelini onun verisiyle açar. Kendi JWT'siyle
     kalır; yetkiyi RLS (private.ogrencim_mi) verir, yazılan satırlara
     islem_yapan damgası düşer. */
  const hedefId = ogrenciId ?? profil.id
  const [kayit, setKayit] = useState(null)
  const [denemeler, setDenemeler] = useState([])
  const [netDurumu, setNetDurumu] = useState(null)
  const [sekme, setSekme] = useState('bugun')
  const [hata, setHata] = useState('')
  const [ozet, setOzet] = useState(null)
  const [tazele, setTazele] = useState(0)
  const yenile = () => setTazele((n) => n + 1)

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
    })()
  }, [hedefId, tazele])

  if (hata) return <Uyari>{hata}</Uyari>
  if (!kayit) return <Yukleniyor />

  const sonNet = denemeler[0] ? Number(denemeler[0].toplam_net) : null
  const oncekiNet = denemeler[1] ? Number(denemeler[1].toplam_net) : null
  const fark = sonNet !== null && oncekiNet !== null ? sonNet - oncekiNet : null
  const hedefAlt =
    [kayit.hedef_universite, kayit.hedef_bolum].filter(Boolean).join(' · ') || undefined

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

      <div className="sekme-govde" style={aksanStili(sekme)}>
      <nav className="sekmeler sekmeler--genis">
        {[
          ['bugun', 'Bugün'],
          ['program', 'Program'],
          ['konular', 'Konular'],
          ['denemeler', 'Denemeler'],
        ].map(([k, e]) => (
          <button
            key={k}
            className={sekme === k ? 'sekme sekme--etkin' : 'sekme'}
            onClick={() => setSekme(k)}
          >
            {e}
          </button>
        ))}
      </nav>

      {sekme === 'bugun' ? (
        <>
          <CalismaSayaci ogrenciId={kayit.id} onKaydedildi={yenile} />
          <GunHedefleri gorevler={ozet?.gorevler} onDegisti={yenile} />
          <GunlukRutinler
            ogrenciId={kayit.id}
            rutinler={ozet?.rutinler}
            haftaBasi={ozet?.haftaBasi}
            bugun={ozet?.bugun}
            onDegisti={yenile}
          />
          {ozet?.bugun && (
            <BugunCozulen
              ogrenciId={kayit.id}
              katalogId={kayit.katalog_id}
              kayitlar={ozet?.bugunSoru}
              tarih={ozet.bugun}
              onDegisti={yenile}
            />
          )}
        </>
      ) : sekme === 'program' ? (
        <>
          <Kart baslik="Haftalık programım" altBaslik="Bitirdiğin bloğa dokun">
            <ProgramIzgarasi ogrenci={kayit} duzenlenebilir={false} />
          </Kart>
        </>
      ) : sekme === 'konular' ? (
        <KonuHaritasi profilId={kayit.id} />
      ) : sekme === 'rozetler' ? (
        <Rozetlerim ogrenciId={kayit.id} />
      ) : (
        <>
          {/* Hedef çubukları buraya taşındı: ayda bir, deneme girildikçe
              değişiyorlar. Her gün açılan ekranın tepesinde durmaları
              yanlıştı; ait oldukları yer denemelerin yanı. */}
          <Kart baslik="Hedefe göre durumum" altBaslik={hedefAlt}>
            <HedefNet tyt={kayit.hedef_tyt_net} ayt={kayit.hedef_ayt_net} durum={netDurumu} />
            {fark !== null && fark !== 0 && (
              <p className={`net-fark net-fark--${fark > 0 ? 'artis' : 'dusus'}`}>
                Son denemede {fark > 0 ? '▲' : '▼'} {Math.abs(fark).toFixed(2)} net
              </p>
            )}
          </Kart>
          <DenemePaneli ogrenciId={kayit.id} katalogId={kayit.katalog_id} duzenlenebilir />
        </>
      )}
      </div>
    </>
  )
}
