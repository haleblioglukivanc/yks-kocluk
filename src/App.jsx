import { useEffect, useState } from 'react'

const ADIMLAR = [
  { kod: 'A', ad: 'Depo', not: 'Supabase — Frankfurt' },
  { kod: 'B', ad: 'Kaynak', not: 'GitHub deposu' },
  { kod: 'C', ad: 'Yayın', not: 'Cloudflare Workers' },
  { kod: 'D', ad: 'Şema', not: 'Tablolar ve RLS' },
]

// İlk üçü tamam, dördüncüsü sırada.
const TAMAMLANAN = 3

export default function App() {
  const [dolan, setDolan] = useState(0)

  useEffect(() => {
    const azHareket = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (azHareket) {
      setDolan(TAMAMLANAN)
      return
    }
    const zamanlayicilar = []
    for (let i = 1; i <= TAMAMLANAN; i++) {
      zamanlayicilar.push(setTimeout(() => setDolan(i), 260 * i + 200))
    }
    return () => zamanlayicilar.forEach(clearTimeout)
  }, [])

  return (
    <main className="sayfa">
      <header className="baslik">
        <p className="eyebrow">Kurulum durumu</p>
        <h1>
          YKS <span className="ince">Koçluk</span>
        </h1>
        <p className="ozet">
          Tek koç, çok öğrenci. Program, deneme takibi ve konu ilerlemesi tek yerde.
        </p>
      </header>

      <section className="form" aria-label="Kurulum adımları">
        {ADIMLAR.map((adim, i) => {
          const doldu = i < dolan
          return (
            <div className={`satir${doldu ? ' satir--doldu' : ''}`} key={adim.kod}>
              <span className="kod">{adim.kod}</span>
              <span className={`kabarcik${doldu ? ' kabarcik--doldu' : ''}`} aria-hidden="true" />
              <span className="ad">{adim.ad}</span>
              <span className="not">{adim.not}</span>
              <span className="durum">{doldu ? 'tamam' : 'sırada'}</span>
            </div>
          )
        })}
      </section>

      <footer className="alt">
        <span className="sayac">
          {dolan}/{ADIMLAR.length}
        </span>
        <span>Bu sayfa yayın hattının çalıştığını gösterir. Uygulama henüz kurulmadı.</span>
      </footer>
    </main>
  )
}
