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
  const [ozetler, setOzetler] = useState(null)
  const [hata, setHata] = useState('')

  useEffect(() => {
    ;(async () => {
      /* İki sorgu paralel. Sırayla giderken koçun notu en son geliyor,
         listenin üstüne eklenip sayfayı itiyordu. */
      const [{ data, error }, { data: oz }] = await Promise.all([
        supabase
          .from('veli_ogrenci')
          .select('ogrenci_id, iliski, ogrenciler(sinif, alan, profiller!ogrenciler_id_fkey(ad_soyad), kataloglar(ad))'),
        supabase.rpc('veli_ozetim'),
      ])
      if (error) setHata(hataMetni(error))
      setCocuklar(data ?? [])
      setOzetler(oz ?? [])
    })()
  }, [])

  const ilkCocuk = cocuklar?.[0]?.ogrenciler?.profiller?.ad_soyad?.split(' ')[0]

  return (
    <div className="panel">
      <VeliBasligi ozet={ozetler?.[0]} cocukAdi={ilkCocuk} profil={profil} />
      <Uyari>{hata}</Uyari>

      {ozetler === null ? (
        /* Koçun notu gelene kadar yeri tutulur. */
        <Kart kaldirilmis>
          <Yukleniyor satir={3} />
        </Kart>
      ) : (
        ozetler.length === 0 ? (
          /* Not yoksa da kart yerinde kalır: veli neyi beklediğini bilsin,
             iskelet kaybolup sayfa yukarı zıplamasın. */
          <Kart kaldirilmis baslik="Koçun bu haftaki notu">
            <p className="kart-alt">Koç bu haftanın özetini henüz yayınlamadı. Yayınlanınca burada görünecek.</p>
          </Kart>
        ) : (
          ozetler.map((o) => <KocNotu key={o.ogrenciId} o={o} birden={ozetler.length > 1} />)
        )
      )}

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

      {/* Haftanın kitabı ve sözü en sonda: veri gelmeden yer kaplamıyor,
          üstte dururken gelince listeyi aşağı itiyordu. */}
      {cocuklar !== null && <HaftalikIlham />}
    </div>
  )
}
