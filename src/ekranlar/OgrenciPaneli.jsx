import { useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Bos, Kart, Rozet, Uyari, Yukleniyor } from '../bilesenler/Ortak.jsx'
import { Avatar } from '../bilesenler/Fotograf.jsx'
import ProgramIzgarasi from '../bilesenler/ProgramIzgarasi.jsx'

const ALAN_ADI = { sayisal: 'Sayısal', esit_agirlik: 'Eşit Ağırlık', sozel: 'Sözel', dil: 'Dil' }

export default function OgrenciPaneli({ profil }) {
  const [kayit, setKayit] = useState(null)
  const [denemeler, setDenemeler] = useState([])
  const [sekme, setSekme] = useState('program')
  const [hata, setHata] = useState('')

  useEffect(() => {
    ;(async () => {
      const { data: o, error } = await supabase
        .from('ogrenciler')
        .select(
          'id, koc_id, alan, sinif, katalog_id, hedef_universite, hedef_bolum, profiller!ogrenciler_id_fkey(ad_soyad, fotograf_yolu), kataloglar(ad)',
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
    })()
  }, [])

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
          ['program', 'Program'],
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

      {sekme === 'program' ? (
        <Kart baslik="Haftalık programım" altBaslik="Bitirdiğin bloğa dokun">
          <ProgramIzgarasi ogrenci={kayit} duzenlenebilir={false} />
        </Kart>
      ) : (
        <Kart baslik="Denemelerim" altBaslik={`Son ${denemeler.length} kayıt`}>
          {denemeler.length === 0 ? (
            <Bos baslik="Deneme kaydı yok" aciklama="Koçun deneme sonuçlarını girdiğinde burada görünecek." />
          ) : (
            <ul className="liste">
              {denemeler.map((d) => (
                <li key={d.id} className="liste-satir">
                  <div>
                    <span className="liste-ad">{d.tur.toUpperCase()}</span>
                    <span className="liste-alt">
                      {new Date(d.tarih).toLocaleDateString('tr-TR')}
                      {d.yayin ? ` · ${d.yayin}` : ''}
                    </span>
                  </div>
                  <div className="net-rozet">
                    <strong>{Number(d.toplam_net).toFixed(2)}</strong>
                    <span>net</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Kart>
      )}
    </>
  )
}
