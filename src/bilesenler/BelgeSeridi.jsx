import { useEffect, useState } from 'react'

/* Belgeler: küçük çerçeveler halinde yavaşça akan şerit.
   Üzerine gelince durur; tıklanınca belge büyük açılır (ok tuşlarıyla gezilir). */
export default function BelgeSeridi({ belgeler }) {
  const [acik, setAcik] = useState(null) // açık belgenin sırası
  const { baslik, aciklama, liste } = belgeler
  const azHareket = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const sira = azHareket ? liste : [...liste, ...liste] // sonsuz akış için iki kez

  useEffect(() => {
    if (acik === null) return
    const tus = (e) => {
      if (e.key === 'Escape') setAcik(null)
      if (e.key === 'ArrowRight') setAcik((i) => (i + 1) % liste.length)
      if (e.key === 'ArrowLeft') setAcik((i) => (i - 1 + liste.length) % liste.length)
    }
    window.addEventListener('keydown', tus)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', tus); document.body.style.overflow = '' }
  }, [acik, liste.length])

  const secili = acik === null ? null : liste[acik]

  return (
    <section id="belgeler" className="t-bolum t-belgeler">
      <div className="t-kap t-bolum-bas">
        <div>
          <p className="t-etiket">Eğitim</p>
          <h2 className="t-baslik t-baslik--kucuk">{baslik}</h2>
        </div>
        <p className="t-bolum-bas-not">{aciklama}</p>
      </div>

      <div className={`t-belge-serit${azHareket ? ' t-belge-serit--sabit' : ''}`}>
        <div className="t-belge-akis" style={{ '--n': liste.length }}>
          {sira.map((b, i) => (
            <button
              key={i}
              type="button"
              className="t-belge"
              onClick={() => setAcik(i % liste.length)}
              aria-label={`${b.ad} — büyüt`}
              aria-hidden={i >= liste.length ? 'true' : undefined}
              tabIndex={i >= liste.length ? -1 : 0}
            >
              <span className="t-belge-cerceve">
                <img src={b.gorsel} alt="" loading="lazy" />
              </span>
              <span className="t-belge-alt">
                <b>{b.ad}</b>
                <small>{b.kurum} · {b.yil}</small>
              </span>
            </button>
          ))}
        </div>
      </div>

      {secili && (
        <div className="t-belge-perde" onClick={() => setAcik(null)} role="dialog" aria-modal="true" aria-label={secili.ad}>
          <button type="button" className="t-belge-kapat" onClick={() => setAcik(null)} aria-label="Kapat">×</button>
          <button type="button" className="t-belge-ok t-belge-ok--sol" onClick={(e) => { e.stopPropagation(); setAcik((acik - 1 + liste.length) % liste.length) }} aria-label="Önceki">‹</button>
          <figure className="t-belge-buyuk" onClick={(e) => e.stopPropagation()}>
            <img key={acik} src={secili.gorsel} alt={secili.ad} />
            <figcaption>
              <b>{secili.ad}</b>
              <span>{secili.kurum} · {secili.yil}</span>
              <small>{acik + 1} / {liste.length}</small>
            </figcaption>
          </figure>
          <button type="button" className="t-belge-ok t-belge-ok--sag" onClick={(e) => { e.stopPropagation(); setAcik((acik + 1) % liste.length) }} aria-label="Sonraki">›</button>
        </div>
      )}
    </section>
  )
}
