import { useEffect, useState } from 'react'

const TABAN = import.meta.env.BASE_URL
const kucuk = (b) => `${TABAN}belgeler/${b.gorsel}-kucuk.jpg`
const buyuk = (b) => `${TABAN}belgeler/${b.gorsel}.jpg`

/* Toplam belge ve saat: Koç bölümünde ve alan başlıklarında kullanılır. */
export function belgeOzeti(belgeler, anahtar) {
  const alanlar = anahtar ? belgeler.alanlar.filter((a) => a.anahtar === anahtar) : belgeler.alanlar
  const liste = alanlar.flatMap((a) => a.liste)
  return { adet: liste.length, saat: liste.reduce((t, b) => t + (b.saat || 0), 0) }
}

const saatYaz = (n) => n.toLocaleString('tr-TR')

/* Belgeler alanlarına göre gruplanır; her alanın yanında o eğitimin koçluğa
   nasıl yansıdığı yazar. Tıklanan belge büyük açılır, oklarla bütün belgeler
   arasında gezilir. */
export default function Belgeler({ belgeler }) {
  const { baslik, aciklama, dogrulama, alanlar } = belgeler
  const hepsi = alanlar.flatMap((a) => a.liste.map((b) => ({ ...b, alan: a.ad })))
  const [acik, setAcik] = useState(null) // hepsi[] içindeki sıra
  const toplam = belgeOzeti(belgeler)

  useEffect(() => {
    if (acik === null) return
    const tus = (e) => {
      if (e.key === 'Escape') setAcik(null)
      if (e.key === 'ArrowRight') setAcik((i) => (i + 1) % hepsi.length)
      if (e.key === 'ArrowLeft') setAcik((i) => (i - 1 + hepsi.length) % hepsi.length)
    }
    window.addEventListener('keydown', tus)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', tus); document.body.style.overflow = '' }
  }, [acik, hepsi.length])

  const secili = acik === null ? null : hepsi[acik]
  let sira = 0

  return (
    <section id="belgeler" className="t-kap t-bolum t-belgeler">
      <div className="t-bolum-bas">
        <div>
          <p className="t-etiket">Eğitim · {toplam.adet} belge · {saatYaz(toplam.saat)} saat</p>
          <h2 className="t-baslik t-baslik--kucuk">{baslik}</h2>
        </div>
        <p className="t-bolum-bas-not">{aciklama}</p>
      </div>

      <div className="t-alanlar">
        {alanlar.map((a) => {
          const oz = belgeOzeti(belgeler, a.anahtar)
          return (
            <div key={a.anahtar} className="t-alan">
              <div className="t-alan-bas">
                <h3>{a.ad}</h3>
                <p className="t-alan-sayi">{oz.adet} belge · {saatYaz(oz.saat)} saat</p>
                <p className="t-alan-koclukta">{a.koclukta}</p>
              </div>
              <div className="t-alan-belgeler">
                {a.liste.map((b) => {
                  const i = sira++
                  return (
                    <button key={b.gorsel} type="button" className="t-belge" onClick={() => setAcik(i)} aria-label={`${b.ad} — büyüt`}>
                      <span className="t-belge-cerceve">
                        <img src={kucuk(b)} alt="" loading="lazy" width="560" height="396" />
                      </span>
                      <span className="t-belge-alt">
                        <b>{b.kisa || b.ad}</b>
                        <small>{b.kurum} · {b.yil}{b.saat ? ` · ${b.saat} saat` : ''}</small>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {dogrulama && <p className="t-belge-dogrulama">{dogrulama}</p>}

      {secili && (
        <div className="t-belge-perde" onClick={() => setAcik(null)} role="dialog" aria-modal="true" aria-label={secili.ad}>
          <button type="button" className="t-belge-kapat" onClick={() => setAcik(null)} aria-label="Kapat">×</button>
          <button type="button" className="t-belge-ok t-belge-ok--sol" onClick={(e) => { e.stopPropagation(); setAcik((acik - 1 + hepsi.length) % hepsi.length) }} aria-label="Önceki">‹</button>
          <figure className="t-belge-buyuk" onClick={(e) => e.stopPropagation()}>
            <img key={acik} src={buyuk(secili)} alt={secili.ad} />
            <figcaption>
              <b>{secili.ad}</b>
              <span>{secili.kurum} · {secili.yil}{secili.saat ? ` · ${secili.saat} saat` : ''}</span>
              <small>{secili.alan} · {acik + 1} / {hepsi.length}</small>
            </figcaption>
          </figure>
          <button type="button" className="t-belge-ok t-belge-ok--sag" onClick={(e) => { e.stopPropagation(); setAcik((acik + 1) % hepsi.length) }} aria-label="Sonraki">›</button>
        </div>
      )}
    </section>
  )
}
