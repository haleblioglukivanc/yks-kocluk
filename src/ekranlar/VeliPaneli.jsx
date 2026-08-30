import { useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Bos, Kart, Rozet, Uyari, Yukleniyor } from '../bilesenler/Ortak.jsx'
import HaftalikIlham from '../bilesenler/HaftalikIlham.jsx'

const TREND = {
  yukseliyor: { yazi: 'Yükseliyor', ok: '↗' },
  sabit: { yazi: 'Sabit', ok: '→' },
  dusuyor: { yazi: 'Düşüyor', ok: '↘' },
}

const saatDakika = (dk = 0) => (dk >= 60 ? `${Math.floor(dk / 60)} sa ${dk % 60} dk` : `${dk} dk`)

const tarihYaz = (t) =>
  new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' }).format(new Date(t))

/* Velinin gördüğü sayılar yalnızca koçun yayınladığı özetten gelir.
   Ders bazlı netler, zayıf konular ve günlük görev detayı veliye gitmez. */
function HaftalikOzet({ o }) {
  const t = TREND[o.trend] ?? TREND.sabit
  return (
    <Kart baslik={o.ogrenciAdi} altBaslik={`${tarihYaz(o.hafta)} haftası`}>
      <div className='ozet-sayilar'>
        <div>
          <span className='kart-alt'>Planına uyum</span>
          <strong className='ozet-sayi'>%{o.devam ?? 0}</strong>
        </div>
        <div>
          <span className='kart-alt'>Çalışma süresi</span>
          <strong className='ozet-sayi'>{saatDakika(o.dakika)}</strong>
        </div>
        <div>
          <span className='kart-alt'>Gidişat</span>
          <strong className='ozet-sayi'>
            <span aria-hidden='true'>{t.ok}</span> {t.yazi}
          </strong>
        </div>
      </div>

      {o.yorum && (
        <blockquote className='veli-yorum'>
          {o.yorum}
          <cite>koçundan</cite>
        </blockquote>
      )}

      {o.yaklasanDeneme && (
        <p className='kart-alt'>
          Yaklaşan deneme: <strong>{tarihYaz(o.yaklasanDeneme)}</strong>
        </p>
      )}
    </Kart>
  )
}

export default function VeliPaneli() {
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

  return (
    <div className="panel">
      <Uyari>{hata}</Uyari>

      {ozetler.map((o) => (
        <HaftalikOzet key={o.ogrenciId} o={o} />
      ))}

      <HaftalikIlham />

      {ozetler.length === 0 && cocuklar !== null && cocuklar.length > 0 && (
        <Kart baslik="Bu hafta">
          <Bos
            baslik="Henüz özet yok"
            aciklama="Koç haftanın özetini hazırladığında burada görünecek."
          />
        </Kart>
      )}

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
