import { useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Bos, Kart, Rozet, Uyari, Yukleniyor } from '../bilesenler/Ortak.jsx'
import HaftalikIlham from '../bilesenler/HaftalikIlham.jsx'
import VeliBasligi from '../bilesenler/VeliBasligi.jsx'

const tarihYaz = (t) =>
  new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' }).format(new Date(t))

/* Haftanın ana kartı: koçun notu. Sayılar (uyum, süre, gidişat) artık
   başlıktaki cümlede; burada yalnız koçun kendi sözü ve yaklaşan deneme.
   Velinin gördüğü her şey koçun yayınladığı özetten gelir. */
function KocNotu({ o, birden }) {
  return (
    <Kart
      kaldirilmis
      baslik={birden ? `${o.ogrenciAdi} · koçun notu` : 'Koçun bu haftaki notu'}
      altBaslik={`${tarihYaz(o.hafta)} haftası`}
    >
      {o.yorum ? (
        <blockquote className="veli-yorum">
          {o.yorum}
          <cite>{o.kocAdi ?? 'koçundan'}</cite>
        </blockquote>
      ) : (
        <p className="kart-alt">Koç bu hafta için not yazmadı.</p>
      )}
      {o.yaklasanDeneme && (
        <p className="veli-deneme">
          <span>Yaklaşan deneme</span>
          <Rozet ton="notr">{tarihYaz(o.yaklasanDeneme)}</Rozet>
        </p>
      )}
    </Kart>
  )
}

export default function VeliPaneli({ profil }) {
  const [cocuklar, setCocuklar] = useState(null)
  const [ozetler, setOzetler] = useState([])
  const [hata, setHata] = useState('')

  useEffect(() => {
    ;(async () => {
      const { data, error } = await supabase
        .from('veli_ogrenci')
        .select('ogrenci_id, iliski, ogrenciler(sinif, alan, profiller!ogrenciler_id_fkey(ad_soyad), kataloglar(ad))')
      if (error) setHata(hataMetni(error))
      setCocuklar(data ?? [])

      const { data: oz } = await supabase.rpc('veli_ozetim')
      setOzetler(oz ?? [])
    })()
  }, [])

  const ilkCocuk = cocuklar?.[0]?.ogrenciler?.profiller?.ad_soyad?.split(' ')[0]

  return (
    <div className="panel">
      <VeliBasligi ozet={ozetler[0]} cocukAdi={ilkCocuk} profil={profil} />
      <Uyari>{hata}</Uyari>

      {ozetler.map((o) => (
        <KocNotu key={o.ogrenciId} o={o} birden={ozetler.length > 1} />
      ))}

      <HaftalikIlham />

      <Kart duz baslik="Takip ettiğim öğrenciler">
        {cocuklar === null ? (
          <Yukleniyor />
        ) : cocuklar.length === 0 ? (
          <Bos
            baslik="Bağlı öğrenci yok"
            aciklama="Koçtan aldığınız davet kodu bir öğrenciye bağlanmamış olabilir."
          />
        ) : (
          <ul className="liste">
            {cocuklar.map((c) => (
              <li key={c.ogrenci_id} className="liste-satir">
                <div>
                  <span className="liste-ad">
                    {c.ogrenciler?.profiller?.ad_soyad ?? 'İsimsiz'}
                  </span>
                  <span className="liste-alt">
                    {[
                      c.ogrenciler?.sinif ? `${c.ogrenciler.sinif}. sınıf` : null,
                      c.ogrenciler?.kataloglar?.ad,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Kart>
    </div>
  )
}
