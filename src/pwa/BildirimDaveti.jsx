import { useEffect, useState } from 'react'
import { kuruluMu } from './pwa.js'
import { useBildirim } from './bildirim.js'

/* "Bildirimleri aç" daveti.

   Yalnız ana ekrandan açılmış uygulamada çıkar: tarayıcıdaki öğrenciye önce
   kurulum daveti gider (iPhone'da bildirim zaten ancak kurulumdan sonra
   çalışıyor). İki şerit hiçbir zaman üst üste gelmez.

   Bir kez çıkar, kapatan bir daha görmez; Hesap → Bildirimler her zaman
   açar. Metin rolüne göre: ne işe yarayacağını söyler, genel "izin ver"
   demez. Görünüm kurulum şeridiyle aynı (.kurulum). */

const ANAHTAR = 'bildirim-daveti-kapatildi'
const GECIKME = 3000

const METIN = {
  koc: 'Acil görüşme, ek süre isteği ya da mesaj gelince telefonuna düşsün.',
  ogrenci: 'Dersin başlamadan 15 dk önce ve koçun yazınca haber verelim.',
}

export default function BildirimDaveti({ rol }) {
  const { durum, mesgul, ac } = useBildirim()
  const [gorunur, setGorunur] = useState(false)

  useEffect(() => {
    if (!METIN[rol] || !kuruluMu() || durum !== 'kapali') return
    try {
      if (window.localStorage.getItem(ANAHTAR) === '1') return
    } catch {
      /* depolama kapalıysa yine göster */
    }
    const z = window.setTimeout(() => setGorunur(true), GECIKME)
    return () => window.clearTimeout(z)
  }, [rol, durum])

  if (!gorunur || durum !== 'kapali') return null

  const kapat = () => {
    setGorunur(false)
    try {
      window.localStorage.setItem(ANAHTAR, '1')
    } catch {
      /* kabul edilebilir */
    }
  }

  return (
    <div className="kurulum" role="dialog" aria-label="Bildirimleri aç">
      <span className="kurulum-ikon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
             strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      </span>

      <div className="kurulum-soz">
        <p className="kurulum-baslik">Bildirimleri aç</p>
        <p className="kurulum-alt">{METIN[rol]}</p>
      </div>

      <button
        className="dugme dugme--birincil kurulum-ekle"
        disabled={mesgul}
        onClick={async () => { await ac(); kapat() }}
      >
        Aç
      </button>

      <button className="kurulum-kapat" onClick={kapat} aria-label="Kapat">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
             strokeWidth="1.8" strokeLinecap="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
