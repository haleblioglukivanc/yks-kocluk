import { useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Bos, Kart, Rozet, Uyari, Yukleniyor } from '../bilesenler/Ortak.jsx'
import { Avatar } from '../bilesenler/Fotograf.jsx'
import ProgramIzgarasi from '../bilesenler/ProgramIzgarasi.jsx'
import HedefNet from '../bilesenler/HedefNet.jsx'
import CalismaSayaci from '../bilesenler/CalismaSayaci.jsx'
import GunHedefleri from '../bilesenler/GunHedefleri.jsx'
import GunlukRutinler from '../bilesenler/GunlukRutinler.jsx'
import BugunCozulen from '../bilesenler/BugunCozulen.jsx'
import DenemePaneli from '../bilesenler/DenemePaneli.jsx'
import KonuHaritasi from './KonuHaritasi.jsx'
import Rozetlerim from './Rozetlerim.jsx'

const ALAN_ADI = { sayisal: 'Sayısal', esit_agirlik: 'Eşit Ağırlık', sozel: 'Sözel', dil: 'Dil' }

export default function OgrenciPaneli({ profil }) {
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
        .maybeSingle()
      if (error) {
        setHata(hataMetni(error))
        return
      }
      setKayit(o)

      const { data: d } = await supabase
        .from('deneme_ozet')
        .select('id, tarih, tur, yayin, toplam_net')
        .order('tarih', { ascending: false })
        .limit(8)
      setDenemeler(d ?? [])

      const { data: nd } = await supabase
        .from('ogrenci_net_durumu')
        .select('tur, son_net, en_yuksek_net')
      setNetDurumu(Object.fromEntries((nd ?? []).map((x) => [x.tur, x])))

      const { data: bugun } = await supabase.rpc('ogrenci_bugun_ozeti')
      // Kâmil artık uygulama kabuğunda, köşede duruyor; burada sadece veri
      if (bugun) setOzet(bugun)
    })()
  }, [profil.id, profil.ad_soyad, tazele])

  if (hata) return <Uyari>{hata}</Uyari>
  if (!kayit) return <Yukleniyor />

  const ad = kayit.profiller?.ad_soyad ?? profil.ad_soyad
  const sonNet = denemeler[0] ? Number(denemeler[0].toplam_net) : null
  const oncekiNet = denemeler[1] ? Number(denemeler[1].toplam_net) : null
  const fark = sonNet !== null && oncekiNet !== null ? sonNet - oncekiNet : null

  return (
    <>

      <Kart>
        <div className="kimlik">
          <Avatar yol={kayit.profiller?.fotograf_yolu} ad={ad} boyut="buyuk" />
          <div className="kimlik-metin">
            <h2 className="kimlik-ad">{ad}</h2>
            <p className="kimlik-alt">
              {[
                kayit.sinif ? (kayit.sinif === 13 ? 'Mezun' : `${kayit.sinif}. sınıf`) : null,
                kayit.alan ? ALAN_ADI[kayit.alan] : null,
                kayit.kataloglar?.ad,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
            {(kayit.hedef_universite || kayit.hedef_bolum) && (
              <p className="kimlik-hedef">
                Hedef: {[kayit.hedef_universite, kayit.hedef_bolum].filter(Boolean).join(' · ')}
              </p>
            )}
            <HedefNet
              tyt={kayit.hedef_tyt_net}
              ayt={kayit.hedef_ayt_net}
              durum={netDurumu}
            />
            {ozet && (
              <p className={`kimlik-seri${ozet.guncelSeri ? '' : ' kimlik-seri--sifir'}`}>
                {ozet.guncelSeri ?? 0} günlük seri
                {ozet.calismaDkBugun ? ` · bugün ${ozet.calismaDkBugun} dk` : ''}
              </p>
            )}
          </div>
          {sonNet !== null && (
            <div className="son-net">
              <strong>{sonNet.toFixed(2)}</strong>
              <span>son net</span>
              {fark !== null && fark !== 0 && (
                <Rozet ton="notr">
                  {fark > 0 ? '▲' : '▼'} {Math.abs(fark).toFixed(2)}
                </Rozet>
              )}
            </div>
          )}
        </div>
      </Kart>

      <nav className="sekmeler sekmeler--genis">
        {[
          ['bugun', 'Bugün'],
          ['program', 'Program'],
          ['konular', 'Konularım'],
          ['rozetler', 'Rozetlerim'],
          ['denemeler', 'Denemelerim'],
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
        <DenemePaneli ogrenciId={kayit.id} katalogId={kayit.katalog_id} duzenlenebilir />
      )}
    </>
  )
}
