import { useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Bos, Kart, Uyari, Yukleniyor } from '../bilesenler/Ortak.jsx'

export default function VeliPaneli() {
  const [cocuklar, setCocuklar] = useState(null)
  const [hata, setHata] = useState('')

  useEffect(() => {
    ;(async () => {
      const { data, error } = await supabase
        .from('veli_ogrenci')
        .select('ogrenci_id, iliski, ogrenciler(sinif, alan, profiller!ogrenciler_id_fkey(ad_soyad), kataloglar(ad))')
      if (error) setHata(hataMetni(error))
      setCocuklar(data ?? [])
    })()
  }, [])

  return (
    <div className="panel">
      <Uyari>{hata}</Uyari>
      <Kart baslik="Takip ettiğim öğrenciler" altBaslik="Görüntüleme yetkiniz var, düzenleme yok">
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
