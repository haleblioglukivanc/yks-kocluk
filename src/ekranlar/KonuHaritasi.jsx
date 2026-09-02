import { useCallback, useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Bos, Kart, Uyari, Yukleniyor } from '../bilesenler/Ortak.jsx'
import KonuYolu from '../bilesenler/KonuYolu.jsx'

/* 300'den fazla konu var. Hepsini birden çekmek hem yavaş hem okunmaz olurdu:
   dersler özet gelir, konular ders açıldığında yüklenir. */

function Cubuk({ toplam, tamamlandi, onayli = 0, calisiliyor, tekrar }) {
  const bekliyor = Math.max(0, tamamlandi - onayli)
  const bos = Math.max(0, toplam - tamamlandi - calisiliyor - tekrar)
  const y = (n) => (toplam ? (n / toplam) * 100 : 0)
  const dokunuldu = tamamlandi + calisiliyor + tekrar > 0
  const parcalar = [
    ['onayli', onayli, 'onaylı'],
    ['bekliyor', bekliyor, 'onay bekliyor'],
    ['calisiliyor', calisiliyor, 'çalışılıyor'],
    ['tekrar', tekrar, 'tekrar'],
  ]
  return (
    <>
      <div
        className='konu-cubuk'
        role='img'
        aria-label={`${toplam} konudan ${onayli} koç onaylı, ${bekliyor} onay bekliyor, ${calisiliyor} çalışılıyor, ${tekrar} tekrar gerekiyor, ${bos} başlanmadı`}
      >
        {parcalar.map(([k, n]) => n > 0 && (
          <div key={k} className={`konu-cubuk--${k}`} style={{ width: `${y(n)}%` }} />
        ))}
      </div>
      <div className='konu-lejant' aria-hidden='true'>
        {dokunuldu ? (
          <>
            {parcalar.map(([k, n, ad]) => n > 0 && (
              <span key={k} className={`konu-lejant--${k}`}>{n} {ad}</span>
            ))}
            {bos > 0 && <span className='konu-lejant--bos'>{bos} başlanmadı</span>}
          </>
        ) : (
          <span className='konu-lejant--yok'>Henüz başlanmadı</span>
        )}
      </div>
    </>
  )
}

export default function KonuHaritasi({ profilId }) {
  const [dersler, setDersler] = useState(null)
  const [acik, setAcik] = useState(null)
  const [hata, setHata] = useState('')

  /* profilId hedef öğrenciyi söyler. Vekaletteyken oturum koçun olduğu için
     RPC'nin auth.uid()'e bakması yetmiyordu: kimin haritası açılacağını
     açıkça geçiyoruz. Yetkiyi RLS tutuyor. */
  const ozetiYukle = useCallback(async () => {
    const { data, error } = await supabase.rpc('konu_ozetim', {
      p_ogrenci_id: profilId ?? null,
    })
    if (error) {
      setHata(hataMetni(error))
      return
    }
    setDersler(data ?? [])
  }, [profilId])

  useEffect(() => {
    setDersler(null)
    setAcik(null)
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
          <Bos baslik='Yol henüz çizilmedi' aciklama='Koçun konu listeni tanımlayınca harita burada belirir.' />
        </Kart>
      ) : (
        <Kart baslik='Konu haritası' altBaslik='Dersi aç, yoldaki durağa dokun'>
          {dersler.map((d) => (
            <div key={d.dersId} className='ders-blok'>
              <button className='ders-basi' onClick={() => dersAc(d.dersId)} aria-expanded={acik === d.dersId}>
                <div>
                  <span className='liste-ad'>{d.ders}</span>
                  <span className='liste-alt'>
                    {String(d.kapsam).toUpperCase().replace('_', '/')} · {d.toplam} konu
                  </span>
                </div>
                <span className='ders-sayi' aria-hidden='true'>
                  {d.tamamlandi}/{d.toplam}
                  <svg viewBox='0 0 24 24'><path d='M6 9l6 6 6-6' /></svg>
                </span>
              </button>

              <Cubuk toplam={d.toplam} tamamlandi={d.tamamlandi} onayli={d.onayli} calisiliyor={d.calisiliyor} tekrar={d.tekrar} />

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
