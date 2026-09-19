import { useEffect, useState, useSyncExternalStore } from 'react'
import { abone, istemVar, kur, kuruluMu, ortam } from './pwa.js'

/* "Ana ekrana ekle" daveti.

   Kurulumun yolu her cihazda farklı; şerit bulunduğu ortama göre ya tek
   tuşla kurar ya da ne yapılacağını tek cümleyle söyler (ortam: pwa.js).

   Kendiliğinden bir kez çıkar, kapatan bir daha kendiliğinden görmez.
   Hesap yaprağındaki "Uygulamayı yükle" satırı şeridi her zaman yeniden
   açar (kurulumuGoster). */

const ANAHTAR = 'kurulum-daveti-kapatildi'
const GOSTER_OLAYI = 'kurulum-goster'

const TARIF = {
  istem: 'Uygulama gibi açılır, adres çubuğu olmaz.',
  ios: 'Paylaş simgesine (kare ve yukarı ok) bas, listeden "Ana Ekrana Ekle"yi seç.',
  'ios-diger': 'Bu sayfayı Safari\'de aç, sonra Paylaş → "Ana Ekrana Ekle".',
  'uygulama-ici': 'Bir uygulamanın içinden açtın. Menüden "Tarayıcıda aç"ı seç, sonra ana ekrana ekle.',
  'mac-safari': 'Üst menüden Dosya → "Dock\'a Ekle"yi seç.',
  android: 'Tarayıcı menüsünden (⋮) "Uygulamayı yükle" ya da "Ana ekrana ekle"yi seç.',
  masaustu: 'Adres çubuğunun sağındaki "Yükle" simgesine bas.',
}

/* Tarayıcı izin vermeden de kendiliğinden tarif gösterilecek ortamlar.
   Android ve masaüstünde izin birazdan gelebilir; orada beklenir. */
const KENDILIGINDEN = ['ios', 'ios-diger', 'uygulama-ici', 'mac-safari']
const GECIKME = 8000

/** Hesap yaprağından: daveti (kapatılmış olsa da) aç. */
export const kurulumuGoster = () => window.dispatchEvent(new Event(GOSTER_OLAYI))

/** Bu cihazda kurulum mümkün mü, zaten kurulu mu. Değişince yeniden çizer. */
export function useKurulum() {
  const istem = useSyncExternalStore(abone, istemVar)
  const kurulu = useSyncExternalStore(abone, kuruluMu)
  const yer = kurulu ? 'kurulu' : ortam()
  return { yer, istem, kurulabilir: yer !== 'kurulu' && yer !== 'yok' }
}

const kapatilmisMi = () => {
  try {
    return window.localStorage.getItem(ANAHTAR) === '1'
  } catch {
    return false
  }
}

export default function KurulumDaveti() {
  const { yer, istem, kurulabilir } = useKurulum()
  const [acik, setAcik] = useState(false)

  // Elle açma: hesap yaprağından
  useEffect(() => {
    const ac = () => setAcik(true)
    window.addEventListener(GOSTER_OLAYI, ac)
    return () => window.removeEventListener(GOSTER_OLAYI, ac)
  }, [])

  // Kendiliğinden açılma: bir kez, kapatılmadıysa
  useEffect(() => {
    if (!kurulabilir || kapatilmisMi()) return
    if (istem) {
      setAcik(true)
      return
    }
    if (!KENDILIGINDEN.includes(yer)) return
    // Sayfa açılırken çıkan davet reklam gibi okunuyor; biraz bekle.
    const z = window.setTimeout(() => setAcik(true), GECIKME)
    return () => window.clearTimeout(z)
  }, [kurulabilir, istem, yer])

  if (!acik || !kurulabilir) return null

  const kapat = () => {
    setAcik(false)
    try {
      window.localStorage.setItem(ANAHTAR, '1')
    } catch {
      /* Kaydedilemezse davet sonraki açılışta yine çıkar; kabul edilebilir. */
    }
  }

  const ekle = async () => {
    await kur()
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
        <p className="kurulum-alt">{TARIF[istem ? 'istem' : yer]}</p>
      </div>

      {istem && (
        <button className="dugme dugme--birincil kurulum-ekle" onClick={ekle}>
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
