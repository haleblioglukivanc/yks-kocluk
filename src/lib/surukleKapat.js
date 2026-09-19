import { useCallback, useRef } from 'react'

/* Alt sayfayı aşağı sürükleyerek kapatma (iOS alt sayfası gibi).
 *
 * - Tutamak/başlıktan ya da içerik en üstteyken gövdeden aşağı çekince
 *   sayfa parmağı takip eder.
 * - Yüksekliğin dörtte biri geçilirse ya da hızlıca aşağı fırlatılırsa
 *   kapanır; az çekilirse yerine yaylanır.
 * - İçerik aşağı kaydırılmışsa önce normal kaydırma çalışır; sayfa ancak
 *   en üste gelince sürüklenir. Yukarı hareket hiç sürükleme başlatmaz.
 * - Yalnız dokunmatikte çalışır; geniş ekranda sayfa ortada pencere
 *   olduğu için (yerlesim.css) orada devre dışı.
 *
 * Kullanım: const ref = useSurukleKapat(onKapat); <div ref={ref} ...> */

const ESIK_ORAN = 0.25
const ESIK_HIZ = 0.5 // px/ms
const BASLAMA_PX = 6

function kaydirici(hedef, sayfa) {
  let el = hedef
  while (el && el !== sayfa) {
    if (el.scrollHeight > el.clientHeight + 1) {
      const oy = getComputedStyle(el).overflowY
      if (oy === 'auto' || oy === 'scroll') return el
    }
    el = el.parentElement
  }
  return null
}

export function useSurukleKapat(onKapat) {
  const kapatRef = useRef(onKapat)
  kapatRef.current = onKapat
  const sokRef = useRef(null)

  // Geri çağırmalı ref: sayfa sonradan açılsa da (koşullu çizim) bağlanır.
  return useCallback((sayfa) => {
    sokRef.current?.()
    sokRef.current = null
    if (!sayfa) return
    let d = null

    const genis = () => window.matchMedia('(min-width: 64rem)').matches

    function basla(e) {
      if (e.touches.length !== 1 || genis()) { d = null; return }
      const hedef = e.target
      if (hedef.closest('textarea, input[type="range"], select')) { d = null; return }
      d = {
        y0: e.touches[0].clientY,
        t0: performance.now(),
        son: e.touches[0].clientY,
        sonT: performance.now(),
        kay: kaydirici(hedef, sayfa),
        suruk: false,
        iptal: false,
      }
    }

    function hareket(e) {
      if (!d || d.iptal) return
      const y = e.touches[0].clientY
      const dy = y - d.y0
      if (!d.suruk) {
        if (dy < -BASLAMA_PX) { d.iptal = true; return }
        if (dy > BASLAMA_PX) {
          if (d.kay && d.kay.scrollTop > 0) { d.iptal = true; return }
          d.suruk = true
          d.y0 = y // sıçramasın
          sayfa.style.transition = 'none'
          document.activeElement?.blur?.()
        } else return
      }
      e.preventDefault()
      const kay = Math.max(0, y - d.y0)
      sayfa.style.translate = `0 ${kay}px`
      d.hiz = (y - d.son) / Math.max(1, performance.now() - d.sonT)
      d.son = y
      d.sonT = performance.now()
    }

    function bitir() {
      if (!d || !d.suruk) { d = null; return }
      const kay = Math.max(0, d.son - d.y0)
      const kapansin = kay > sayfa.offsetHeight * ESIK_ORAN || (d.hiz ?? 0) > ESIK_HIZ
      d = null
      if (kapansin) {
        sayfa.style.transition = 'translate 180ms ease-in'
        sayfa.style.translate = '0 100%'
        setTimeout(() => kapatRef.current?.(), 170)
      } else {
        sayfa.style.transition = 'translate 220ms cubic-bezier(0.2, 0.8, 0.2, 1)'
        sayfa.style.translate = ''
      }
    }

    sayfa.addEventListener('touchstart', basla, { passive: true })
    sayfa.addEventListener('touchmove', hareket, { passive: false })
    sayfa.addEventListener('touchend', bitir)
    sayfa.addEventListener('touchcancel', bitir)
    sokRef.current = () => {
      sayfa.removeEventListener('touchstart', basla)
      sayfa.removeEventListener('touchmove', hareket)
      sayfa.removeEventListener('touchend', bitir)
      sayfa.removeEventListener('touchcancel', bitir)
    }
  }, [])
}
