import { useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Uyari, Yukleniyor } from '../bilesenler/Ortak.jsx'
import Bolum from '../ortak/Bolum.jsx'
import BosDurum from '../ortak/BosDurum.jsx'
import HaftalikIlham from '../bilesenler/HaftalikIlham.jsx'
import VeliBasligi from '../bilesenler/VeliBasligi.jsx'

const tarihYaz = (t) =>
  new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' }).format(new Date(t))

/* Haftanın ana kartı: koçun notu. Sayılar (uyum, süre, gidişat) artık
   başlıktaki cümlede; burada yalnız koçun kendi sözü ve yaklaşan deneme.
   Velinin gördüğü her şey koçun yayınladığı özetten gelir. */
function KocNotu({ o, birden, ilk }) {
  /* Kart değil bölüm; not beyaz yüzeyde (TASARIM-KURALLARI 1). Eskiden koyu
     bloğun kenarına yarı binen gölgeli karttı. */
  return (
    <Bolum
      cizgili={!ilk}
      baslik={birden ? `${o.ogrenciAdi} · koçun notu` : 'Koçun bu haftaki notu'}
    >
      <div className='veri-yuzey veli-not'>
        {o.yorum ? (
          <>
            <p className='veli-not-metin'>{o.yorum}</p>
            <p className='veli-not-imza'>
              {o.kocAdi ?? 'Koçun'} · {tarihYaz(o.hafta)} haftası
            </p>
          </>
        ) : (
          <p className='veli-not-bos'>Koç bu hafta için not yazmadı.</p>
        )}
        {o.yaklasanDeneme && (
          <p className='veli-not-deneme'>
            <span>Yaklaşan deneme</span>
            <b>{tarihYaz(o.yaklasanDeneme)}</b>
          </p>
        )}
      </div>
    </Bolum>
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
        <Bolum baslik='Koçun bu haftaki notu'>
          <Yukleniyor satir={3} />
        </Bolum>
      ) : ozetler.length === 0 ? (
        /* Not yoksa da bölüm yerinde kalır: veli neyi beklediğini bilsin. */
        <Bolum baslik='Koçun bu haftaki notu'>
          <div className='veri-yuzey veli-not'>
            <p className='veli-not-bos'>Koç bu haftanın özetini henüz yayınlamadı. Yayınlanınca burada görünecek.</p>
          </div>
        </Bolum>
      ) : (
        ozetler.map((o, i) => <KocNotu key={o.ogrenciId} o={o} ilk={i === 0} birden={ozetler.length > 1} />)
      )}

      <Bolum cizgili baslik='Takip ettiğim öğrenciler' sayi={cocuklar?.length || null}>
        {cocuklar === null ? (
          <Yukleniyor />
        ) : cocuklar.length === 0 ? (
          <BosDurum metin='Bağlı öğrenci yok. Koçtan aldığınız davet kodu bir öğrenciye bağlanmamış olabilir.' />
        ) : (
          <ul className='liste'>
            {cocuklar.map((c) => {
              const ad = c.ogrenciler?.profiller?.ad_soyad ?? 'İsimsiz'
              return (
                <li key={c.ogrenci_id} className='liste-satir veli-cocuk'>
                  <span className='veli-cocuk-av' aria-hidden='true'>
                    {ad.split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toLocaleUpperCase('tr-TR')}
                  </span>
                  <div>
                    <span className='liste-ad'>{ad}</span>
                    <span className='liste-alt'>
                      {[
                        c.ogrenciler?.sinif ? (c.ogrenciler.sinif === 13 ? 'Mezun' : `${c.ogrenciler.sinif}. sınıf`) : null,
                        c.ogrenciler?.kataloglar?.ad,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Bolum>

      {/* Haftanın kitabı ve sözü en sonda: veri gelmeden yer kaplamıyor,
          üstte dururken gelince listeyi aşağı itiyordu. */}
      {cocuklar !== null && (
        <Bolum cizgili baslik='Bu hafta'>
          <HaftalikIlham />
        </Bolum>
      )}
    </div>
  )
}
