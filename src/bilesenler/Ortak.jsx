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

/* Yükleme göstergesi tek yerde tanımlı; buradaki değişiklik onu kullanan
   bütün ekranlara aynı anda yansıyor. "Yükleniyor…" yazısı ekranı boş
   bırakıyordu — iskelet, gelecek içeriğin şeklini şimdiden gösterdiği
   için aynı sürede daha hızlı hissettiriyor ve içerik gelince sayfa
   zıplamıyor. `sade` yalnızca tam ekran bekleme kutularında: orada
   iskelet, olmayan bir kartı vaat etmiş olurdu. */
export function Yukleniyor({ metin = 'Yükleniyor', satir = 3, sade = false }) {
  if (sade) return <p className="yukleniyor">{metin}…</p>
  return (
    <div className="iskelet" role="status" aria-busy="true">
      <p className="gorsel-gizli">{metin}…</p>
      {Array.from({ length: satir }, (_, i) => (
        <span key={i} className="iskelet-satir" aria-hidden="true" />
      ))}
    </div>
  )
}

export function Rozet({ children, ton = 'notr' }) {
  return <span className={`rozet rozet--${ton}`}>{children}</span>
}
