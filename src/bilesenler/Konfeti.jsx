import { useEffect, useRef } from 'react'

/* Konfeti — bağımlılıksız, canvas üzerinde.
   Renkler marka paletinden alınır; hareketi kısıtlayan kullanıcıda hiç
   çizilmez, kutlama kartı yine görünür. */

const RENKLER = ['#ffb454', '#ff7a45', '#6d9aff', '#2fa36b', '#ffc94a', '#e87ba4']

export default function Konfeti({ yogunluk = 2, sure = 2600, bitince }) {
  const tuval = useRef(null)
  const bitisRef = useRef(bitince)
  bitisRef.current = bitince

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const z = setTimeout(() => bitisRef.current?.(), 500)
      return () => clearTimeout(z)
    }

    const c = tuval.current
    if (!c) return
    const ctx = c.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const G = window.innerWidth
    const Y = window.innerHeight
    c.width = G * dpr
    c.height = Y * dpr
    c.style.width = `${G}px`
    c.style.height = `${Y}px`
    ctx.scale(dpr, dpr)

    // Düşük bellekli telefonlarda 160 parçacık takılıyor; eşiği ekran
    // genişliğine bağladık — dar ekranda daha az parça yeterince şenlikli.
    const taban = yogunluk >= 3 ? 140 : 85
    const adet = G < 420 ? Math.round(taban * 0.7) : taban

    const parcalar = Array.from({ length: adet }, () => ({
      x: G / 2 + (Math.random() - 0.5) * G * 0.5,
      y: Y * 0.42 + (Math.random() - 0.5) * 60,
      vx: (Math.random() - 0.5) * 11,
      vy: -Math.random() * 13 - 5,
      en: 5 + Math.random() * 6,
      boy: 8 + Math.random() * 8,
      aci: Math.random() * Math.PI,
      donme: (Math.random() - 0.5) * 0.3,
      renk: RENKLER[Math.floor(Math.random() * RENKLER.length)],
    }))

    let kare
    const basla = performance.now()

    const ciz = (simdi) => {
      const gecen = simdi - basla
      ctx.clearRect(0, 0, G, Y)
      const solma = Math.max(0, 1 - Math.max(0, gecen - sure * 0.6) / (sure * 0.4))

      for (const p of parcalar) {
        p.vy += 0.32
        p.vx *= 0.995
        p.x += p.vx
        p.y += p.vy
        p.aci += p.donme
        ctx.save()
        ctx.globalAlpha = solma
        ctx.translate(p.x, p.y)
        ctx.rotate(p.aci)
        ctx.fillStyle = p.renk
        ctx.fillRect(-p.en / 2, -p.boy / 2, p.en, p.boy)
        ctx.restore()
      }

      if (gecen < sure) {
        kare = requestAnimationFrame(ciz)
      } else {
        ctx.clearRect(0, 0, G, Y)
        bitisRef.current?.()
      }
    }

    kare = requestAnimationFrame(ciz)
    return () => cancelAnimationFrame(kare)
  }, [yogunluk, sure])

  return <canvas ref={tuval} className="konfeti-tuval" aria-hidden="true" />
}
