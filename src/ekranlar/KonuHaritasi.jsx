import { useCallback, useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Bos, Kart, Uyari, Yukleniyor } from '../bilesenler/Ortak.jsx'
import KonuYolu from '../bilesenler/KonuYolu.jsx'

/* 300'den fazla konu var. Hepsini birden çekmek hem yavaş hem okunmaz olurdu:
   dersler özet gelir, konular ders açıldığında yüklenir. */

function Cubuk({ toplam, tamamlandi, calisiliyor, tekrar }) {
  const y = (n) => (toplam ? (n / toplam) * 100 : 0)
  return (
    <div
      className='konu-cubuk'
      role='img'
      aria-label={`${toplam} konudan ${tamamlandi} bitti, ${calisiliyor} çalışılıyor, ${tekrar} tekrar gerekiyor`}
    >
      <div className='konu-cubuk--bitti' style={{ width: `${y(tamamlandi)}%` }} />
      <div className='konu-cubuk--calisiliyor' style={{ width: `${y(calisiliyor)}%` }} />
      <div className='konu-cubuk--tekrar' style={{ width: `${y(tekrar)}%` }} />
    </div>
  )
}

export default function KonuHaritasi({ profilId }) {
  const [dersler, setDersler] = useState(null)
  const [acik, setAcik] = useState(null)
  const [hata, setHata] = useState('')

  const ozetiYukle = useCallback(async () => {
    const { data, error } = await supabase.rpc('konu_ozetim')
    if (error) {
      setHata(hataMetni(error))
      return
    }
    setDersler(data ?? [])
  }, [])

  useEffect(() => {
    ozetiYukle()
  }, [ozetiYukle])

  /* Ders açılınca konu yolu (KonuYolu) kendi verisini konu_yolu RPC'sinden
     çeker; burada yalnızca özet tutulur. Aynı bileşen koç ekranında da var. */
  function dersAc(dersId) {
    setAcik((a) => (a === dersId ? null : dersId))
  }

  if (dersler === null) return <Yukleniyor />

  return (
    <>
      <Uyari>{hata}</Uyari>
      {dersler.length === 0 ? (
        <Kart baslik='Konu haritası'>
          <Bos baslik='Katalog atanmamış' aciklama='Koçun sana bir konu kataloğu tanımlamalı.' />
        </Kart>
      ) : (
        <Kart baslik='Konu haritası' altBaslik='Dersi aç, yoldaki durağa dokun'>
          {dersler.map((d) => (
            <div key={d.dersId} className='ders-blok'>
              <button className='ders-basi' onClick={() => dersAc(d.dersId)} aria-expanded={acik === d.dersId}>
                <div>
                  <span className='liste-ad'>{d.ders}</span>
                  <span className='liste-alt'>
                    {String(d.kapsam).toUpperCase().replace('_', '/')} · {d.tamamlandi}/{d.toplam} bitti
                    {d.tamamlandi > 0 && ` · ${d.onayli ?? 0} koç onaylı`}
                  </span>
                </div>
                <span className='ok' aria-hidden='true'>{acik === d.dersId ? '−' : '+'}</span>
              </button>

              <Cubuk toplam={d.toplam} tamamlandi={d.tamamlandi} calisiliyor={d.calisiliyor} tekrar={d.tekrar} />

              {acik === d.dersId && (
                <KonuYolu ogrenciId={profilId} dersId={d.dersId} rol="ogrenci" onDegisti={ozetiYukle} />
              )}
            </div>
          ))}
        </Kart>
      )}
    </>
  )
}
