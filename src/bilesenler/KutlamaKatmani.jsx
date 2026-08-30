import { useCallback, useEffect, useState } from 'react'
import Kalem, { KALEM_ADI } from './Kalem.jsx'
import Konfeti from './Konfeti.jsx'

/* Kutlama katmanı — ortak bileşen.
   Öğrenci paneli, vekaleten açılan panel ve ileride eklenecek başka
   ekranlar hep bunu kullanır; kutlama görünümü tek yerden değişsin.

   Birden fazla kutlama aynı anda gelirse (gün tamam + yeni rozet) sırayla
   gösterilir, hepsi bir anda üst üste binmez. */

export default function KutlamaKatmani({ kutlamalar = [], kapandi }) {
  const [sira, setSira] = useState(0)
  const aktif = kutlamalar[sira]

  useEffect(() => {
    setSira(0)
  }, [kutlamalar])

  const ilerle = useCallback(() => {
    if (sira + 1 < kutlamalar.length) setSira(sira + 1)
    else kapandi?.()
  }, [sira, kutlamalar.length, kapandi])

  useEffect(() => {
    if (!aktif) return
    const kacis = (e) => {
      if (e.key === 'Escape') ilerle()
    }
    window.addEventListener('keydown', kacis)
    return () => window.removeEventListener('keydown', kacis)
  }, [aktif, ilerle])

  if (!aktif) return null

  const buyuk = aktif.seviye >= 3

  return (
    <div
      className="kutlama-katman"
      role="dialog"
      aria-modal="true"
      aria-label={aktif.baslik}
      onClick={ilerle}
    >
      <Konfeti yogunluk={aktif.seviye ?? 2} sure={buyuk ? 3400 : 2600} />

      <div className="kutlama-kart" onClick={(e) => e.stopPropagation()}>
        <div className="kutlama-kalem">
          <Kalem ruh={aktif.ruh || 'kutlama'} boyut={buyuk ? 150 : 130} />
        </div>

        <p className="kutlama-ad">{KALEM_ADI}</p>
        <h2 className="kutlama-baslik">{aktif.baslik}</h2>
        <p className="kutlama-mesaj" aria-live="polite">
          {aktif.mesaj}
        </p>

        {aktif.tur !== 'seri_kilometre' && aktif.seri > 0 && (
          <p className="kutlama-seri">{aktif.seri} günlük seri sürüyor</p>
        )}

        <button type="button" className="dugme dugme--birincil kutlama-buton" onClick={ilerle}>
          {sira + 1 < kutlamalar.length ? 'Sonraki' : 'Devam et'}
        </button>
      </div>
    </div>
  )
}
