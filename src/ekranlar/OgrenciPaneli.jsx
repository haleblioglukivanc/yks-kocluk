import { useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Bos, Kart, Uyari, Yukleniyor } from '../bilesenler/Ortak.jsx'

export default function OgrenciPaneli({ profil }) {
  const [kayit, setKayit] = useState(null)
  const [dersler, setDersler] = useState([])
  const [gorevler, setGorevler] = useState(null)
  const [hata, setHata] = useState('')

  useEffect(() => {
    ;(async () => {
      const { data: o, error } = await supabase
        .from('ogrenciler')
        .select('id, alan, sinif, katalog_id, kataloglar(ad, tur)')
        .maybeSingle()
      if (error) {
        setHata(hataMetni(error))
        return
      }
      setKayit(o)

      if (o?.katalog_id) {
        const { data: d } = await supabase
          .from('dersler')
          .select('id, ad, kapsam, konular(count)')
          .eq('katalog_id', o.katalog_id)
          .order('sira')
        setDersler(d ?? [])
      }

      const bugun = new Date().toLocaleDateString('sv-SE') // yerel saate göre YYYY-MM-DD
      const { data: g } = await supabase
        .from('gorevler')
        .select('id, baslik, tur, durum, hedef_adet, yapilan_adet')
        .eq('tarih', bugun)
        .order('id')
      setGorevler(g ?? [])
    })()
  }, [])

  return (
    <div className="panel">
      <Uyari>{hata}</Uyari>

      <Kart
        baslik="Bugün"
        altBaslik={new Date().toLocaleDateString('tr-TR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })}
      >
        {gorevler === null ? (
          <Yukleniyor />
        ) : gorevler.length === 0 ? (
          <Bos
            baslik="Bugün için görev yok"
            aciklama="Koçunuz program yazdığında burada görünecek."
          />
        ) : (
          <ul className="liste">
            {gorevler.map((g) => (
              <li key={g.id} className="liste-satir">
                <div>
                  <span className="liste-ad">{g.baslik}</span>
                  <span className="liste-alt">
                    {g.hedef_adet ? `${g.yapilan_adet}/${g.hedef_adet}` : g.durum}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Kart>

      <Kart
        baslik="Konu kataloğum"
        altBaslik={kayit?.kataloglar?.ad ?? 'Koçunuz henüz katalog atamadı'}
      >
        {dersler.length === 0 ? (
          <Bos baslik="Katalog atanmamış" aciklama="Koçunuzla iletişime geçin." />
        ) : (
          <ul className="liste">
            {dersler.map((d) => (
              <li key={d.id} className="liste-satir">
                <div>
                  <span className="liste-ad">{d.ad}</span>
                  <span className="liste-alt">{d.kapsam.replace('_', ' + ').toUpperCase()}</span>
                </div>
                <span className="sayi">{d.konular?.[0]?.count ?? 0} konu</span>
              </li>
            ))}
          </ul>
        )}
      </Kart>
    </div>
  )
}
