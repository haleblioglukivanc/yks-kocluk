import { useEffect, useState } from 'react'

/* "Ana ekrana ekle" daveti.

   Tarayıcı sekmesinden giren öğrenci uygulamayı bir site gibi kullanıyor:
   sekmeler arasında kayboluyor, adres çubuğu ekranı yiyor. İkona basarak
   giren öğrenci onu uygulama olarak kullanıyor. Aradaki tek fark bir kez
   gösterilen bu şerit.

   İki ayrı yol var, çünkü tarayıcılar aynı şeyi yapmıyor:
   - Chrome/Edge/Android `beforeinstallprompt` olayını veriyor, kurulumu
     biz başlatabiliyoruz.
   - iOS Safari böyle bir olay vermiyor; orada tek yapabileceğimiz nereye
     basacağını tarif etmek.

   Kapatan bir daha görmüyor. Bir öneriyi ikinci kez göstermek öneri
   olmaktan çıkarır. */

const ANAHTAR = 'kurulum-daveti-kapatildi'
const GECIKME = 8000

const kuruluMu = () =>
  window.matchMedia?.('(display-mode: standalone)').matches ||
  window.navigator.standalone === true

const iosMu = () =>
  /iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
  // iPadOS kendini masaüstü Safari gibi tanıtıyor
  (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1)

export default function KurulumDaveti() {
  const [olay, setOlay] = useState(null)
  const [gorunur, setGorunur] = useState(false)

  useEffect(() => {
    if (kuruluMu()) return
    let kapatildi = false
    try {
      kapatildi = window.localStorage.getItem(ANAHTAR) === '1'
    } catch {
      /* Gizli sekmede depolama kapalı olabilir; davet yine de gösterilir. */
    }
    if (kapatildi) return

    const yakala = (e) => {
      e.preventDefault()
      setOlay(e)
      setGorunur(true)
    }
    window.addEventListener('beforeinstallprompt', yakala)

    /* iOS'ta olay hiç gelmeyeceği için şeridi kendimiz açıyoruz. Hemen
       değil: sayfa daha açılırken çıkan davet reklam gibi okunuyor. */
    const zamanlayici = iosMu() ? window.setTimeout(() => setGorunur(true), GECIKME) : null

    const kuruldu = () => setGorunur(false)
    window.addEventListener('appinstalled', kuruldu)

    return () => {
      window.removeEventListener('beforeinstallprompt', yakala)
      window.removeEventListener('appinstalled', kuruldu)
      if (zamanlayici) window.clearTimeout(zamanlayici)
    }
  }, [])

  if (!gorunur) return null

  const kapat = () => {
    setGorunur(false)
    try {
      window.localStorage.setItem(ANAHTAR, '1')
    } catch {
      /* Kaydedilemezse davet bir sonraki açılışta yine çıkar; kabul edilebilir. */
    }
  }

  const kur = async () => {
    if (!olay) return
    olay.prompt()
    await olay.userChoice
    setOlay(null)
    kapat()
  }

  return (
    <div className="kurulum" role="dialog" aria-label="Uygulamayı ana ekrana ekle">
      <span className="kurulum-ikon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
             strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
          <path d="M12 8v6" />
          <path d="m9.5 11.5 2.5 2.5 2.5-2.5" />
        </svg>
      </span>

      <div className="kurulum-soz">
        <p className="kurulum-baslik">Ana ekrana ekle</p>
        <p className="kurulum-alt">
          {olay
            ? 'Uygulama gibi açılır, adres çubuğu olmaz.'
            : 'Paylaş düğmesine bas, "Ana Ekrana Ekle"yi seç.'}
        </p>
      </div>

      {olay && (
        <button className="dugme dugme--birincil kurulum-ekle" onClick={kur}>
          Ekle
        </button>
      )}

      <button className="kurulum-kapat" onClick={kapat} aria-label="Kapat">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
             strokeWidth="1.8" strokeLinecap="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
