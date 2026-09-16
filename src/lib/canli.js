/**
 * Hareket yardımcıları. Kural: hareket geri bildirim ya da ilerleme anlatır;
 * amaçsız hareket yok. Hepsi prefers-reduced-motion'a saygılı.
 */
import { useEffect, useState } from 'react'

export const azHareket = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* Cümle yazılarak akar (22ms/harf). Metin değişince baştan. Az-hareket
   tercihinde tek seferde gelir. */
export function useYazarak(metin, hizMs = 22) {
  const [gorunen, setGorunen] = useState(azHareket() ? metin : '')
  useEffect(() => {
    if (!metin) { setGorunen(''); return }
    if (azHareket()) { setGorunen(metin); return }
    let i = 0
    setGorunen('')
    const t = setInterval(() => {
      i += 1
      setGorunen(metin.slice(0, i))
      if (i >= metin.length) clearInterval(t)
    }, hizMs)
    return () => clearInterval(t)
  }, [metin, hizMs])
  return gorunen
}

/* Sayı sayarak gelir (600ms, ease-out). Az-hareket tercihinde doğrudan. */
export function useSayarak(hedef, sureMs = 600) {
  const [deger, setDeger] = useState(azHareket() ? hedef : 0)
  useEffect(() => {
    if (hedef == null || Number.isNaN(hedef)) { setDeger(hedef); return }
    if (azHareket()) { setDeger(hedef); return }
    const bas = performance.now()
    const ilk = 0
    let id
    const adim = (t) => {
      const u = Math.min(1, (t - bas) / sureMs)
      const e = 1 - Math.pow(1 - u, 3)
      setDeger(ilk + (hedef - ilk) * e)
      if (u < 1) id = requestAnimationFrame(adim)
    }
    id = requestAnimationFrame(adim)
    return () => cancelAnimationFrame(id)
  }, [hedef, sureMs])
  return deger
}

/* Çizbi'ye kutlama sinyali: görev bitince başlıktaki Çizbi sallanır.
   Bileşenler birbirini tanımaz; pencere olayı yeter. */
const KUTLAMA_OLAYI = 'cizbi:kutla'
export function cizbiKutlasin() {
  window.dispatchEvent(new Event(KUTLAMA_OLAYI))
}
export function useCizbiKutlama(sureMs = 900) {
  const [sallaniyor, setSallaniyor] = useState(false)
  useEffect(() => {
    let t
    const din = () => {
      if (azHareket()) return
      setSallaniyor(false)
      requestAnimationFrame(() => setSallaniyor(true))
      clearTimeout(t)
      t = setTimeout(() => setSallaniyor(false), sureMs)
    }
    window.addEventListener(KUTLAMA_OLAYI, din)
    return () => { window.removeEventListener(KUTLAMA_OLAYI, din); clearTimeout(t) }
  }, [sureMs])
  return sallaniyor
}
