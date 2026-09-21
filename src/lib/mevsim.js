import { useEffect, useState } from 'react'

/* Mevsim motoru (21 Eylül 2026, mevsimsel tasarım).
   Uygulama tek tasarım dilinde; mevsim yalnız atmosferi değiştirir:
   zemin, yüzey, mürekkep, vurgu ve tepedeki manzara. Durum renkleri
   (acil / dikkat / yolunda) ve ders renkleri mevsimden bağımsız.

   Mevsim tarihten gelir (meteorolojik: Mart–Mayıs ilkbahar, Haziran–
   Ağustos yaz, Eylül–Kasım sonbahar, Aralık–Şubat kış). Önizleme için
   adrese ?mevsim=kis yazılır; seçim bu cihazda saklanır, ?mevsim=otomatik
   ile silinir. */

export const MEVSIMLER = ['ilkbahar', 'yaz', 'sonbahar', 'kis']
export const MEVSIM_ADI = { ilkbahar: 'İlkbahar', yaz: 'Yaz', sonbahar: 'Sonbahar', kis: 'Kış' }
const ANAHTAR = 'mevsim-onizleme'

export function tarihtenMevsim(d = new Date()) {
  const ay = d.getMonth()
  if (ay >= 2 && ay <= 4) return 'ilkbahar'
  if (ay >= 5 && ay <= 7) return 'yaz'
  if (ay >= 8 && ay <= 10) return 'sonbahar'
  return 'kis'
}

function onizlemeOku() {
  try {
    const p = new URLSearchParams(window.location.search).get('mevsim')
    if (p === 'otomatik') {
      localStorage.removeItem(ANAHTAR)
      return null
    }
    if (MEVSIMLER.includes(p)) {
      localStorage.setItem(ANAHTAR, p)
      return p
    }
    const k = localStorage.getItem(ANAHTAR)
    return MEVSIMLER.includes(k) ? k : null
  } catch {
    return null
  }
}

export function gecerliMevsim() {
  return onizlemeOku() ?? tarihtenMevsim()
}

const dinleyiciler = new Set()

/** Önizleme seçimi (Yönetim ya da test için). null → tarihe dön. */
export function mevsimSec(m) {
  try {
    if (m && MEVSIMLER.includes(m)) localStorage.setItem(ANAHTAR, m)
    else localStorage.removeItem(ANAHTAR)
  } catch { /* gizli sekme */ }
  const yeni = gecerliMevsim()
  document.documentElement.dataset.mevsim = yeni
  dinleyiciler.forEach((f) => f(yeni))
}

/** Kök etikete data-mevsim yazar ve geçerli mevsimi döndürür. */
export function useMevsim() {
  const [mevsim, setMevsim] = useState(gecerliMevsim)
  useEffect(() => {
    document.documentElement.dataset.mevsim = mevsim
  }, [mevsim])
  useEffect(() => {
    dinleyiciler.add(setMevsim)
    return () => { dinleyiciler.delete(setMevsim) }
  }, [])
  return mevsim
}

/** Hareket azaltma tercihi: manzaradaki süs hareketleri bununla kapanır. */
export function useAzHareket() {
  const [az, setAz] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mq) return
    const f = () => setAz(mq.matches)
    mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [])
  return az
}
