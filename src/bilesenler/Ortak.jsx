export function Kart({ baslik, altBaslik, children, eylem }) {
  return (
    <section className="kart">
      {(baslik || eylem) && (
        <header className="kart-basi">
          <div>
            {baslik && <h2>{baslik}</h2>}
            {altBaslik && <p className="kart-alt">{altBaslik}</p>}
          </div>
          {eylem}
        </header>
      )}
      {children}
    </section>
  )
}

export function Alan({ etiket, ipucu, children }) {
  return (
    <label className="alan">
      <span className="alan-etiket">{etiket}</span>
      {children}
      {ipucu && <span className="alan-ipucu">{ipucu}</span>}
    </label>
  )
}

export function Dugme({ tur = 'birincil', bekliyor, children, ...kalan }) {
  return (
    <button className={`dugme dugme--${tur}`} disabled={bekliyor || kalan.disabled} {...kalan}>
      {bekliyor ? 'Bir saniye…' : children}
    </button>
  )
}

export function Uyari({ tur = 'hata', children }) {
  if (!children) return null
  return <p className={`uyari uyari--${tur}`}>{children}</p>
}

export function Bos({ baslik, aciklama, children }) {
  return (
    <div className="bos">
      <p className="bos-baslik">{baslik}</p>
      {aciklama && <p className="bos-aciklama">{aciklama}</p>}
      {children}
    </div>
  )
}

export function Yukleniyor({ metin = 'Yükleniyor' }) {
  return <p className="yukleniyor">{metin}…</p>
}

export function Rozet({ children, ton = 'notr' }) {
  return <span className={`rozet rozet--${ton}`}>{children}</span>
}
