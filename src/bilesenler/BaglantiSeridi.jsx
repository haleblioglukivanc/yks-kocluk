import { useEffect, useState } from 'react'

/**
 * Bağlantı koptuğunda üst şeridin hemen altına inen ince şerit.
 *
 * Telefonda bağlantı sık kopuyor (metro, asansör, kötü çeken sınıf).
 * Şerit yoksa öğrenci "Yükleniyor…" yazısına bakıp uygulamanın bozulduğunu
 * sanıyor. Şerit sabit değil, akışın içinde: içeriğin üstüne binmez, onu
 * bir satır aşağı iter. Bağlantı gelince iki saniye "geri geldi" der ve
 * kaybolur; sürekli duran bir bildirim kimseye bir şey söylemez.
 */
export default function BaglantiSeridi() {
  const [cevrimdisi, setCevrimdisi] = useState(
    typeof navigator !== 'undefined' && navigator.onLine === false,
  )
  const [geriGeldi, setGeriGeldi] = useState(false)

  useEffect(() => {
    let zamanlayici = null
    function koptu() {
      setGeriGeldi(false)
      setCevrimdisi(true)
    }
    function geldi() {
      setCevrimdisi(false)
      setGeriGeldi(true)
      clearTimeout(zamanlayici)
      zamanlayici = setTimeout(() => setGeriGeldi(false), 2400)
    }
    window.addEventListener('offline', koptu)
    window.addEventListener('online', geldi)
    return () => {
      window.removeEventListener('offline', koptu)
      window.removeEventListener('online', geldi)
      clearTimeout(zamanlayici)
    }
  }, [])

  if (!cevrimdisi && !geriGeldi) return null
  return (
    <div
      className="baglanti-serit"
      data-durum={cevrimdisi ? 'izle' : 'iyi'}
      role="status"
      aria-live="polite"
    >
      {cevrimdisi
        ? 'Bağlantı yok. Gördüklerin son yüklenen hâli; kaydetmek için bağlantı gerekiyor.'
        : 'Bağlantı geri geldi.'}
    </div>
  )
}
