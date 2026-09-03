import { createPortal } from 'react-dom'
/* `duz`: kenarı ve zemini olmayan, kâğıda doğrudan yazılmış kart.
   Bilgi gösteren yardımcı bloklar için; karar isteyen kartlar kaldırılmış kalır. */
export function Kart({ baslik, altBaslik, children, eylem, duz = false }) {
  return (
    <section className={duz ? "kart kart--duz" : "kart"}>
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
export function Yukleniyor({ metin = 'Geliyor', satir = 3, sade = false }) {
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

/** Alt sayfa (bottom sheet). body'ye portal ile takılır: hangi kartın
 *  içinden açılırsa açılsın overflow/filter/z-index katmanlarına takılmaz.
 *  Safari'de kart içinden position:fixed güvenilir değil. */
export function AltSayfa({ etiket, baslik, altBaslik, sinif = '', rol = 'dialog', onKapat, children, dugmeler }) {
  return createPortal(
    <div className="alt-sayfa-perde" onClick={onKapat} role="presentation">
      <div
        className={`alt-sayfa${sinif ? ` ${sinif}` : ''}`}
        role={rol}
        aria-modal={rol === 'dialog' ? 'true' : undefined}
        aria-label={etiket ?? baslik}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="alt-sayfa-tutamac" aria-hidden="true" />
        {baslik && (
          <header className="alt-sayfa-bas">
            <h2>{baslik}</h2>
            {altBaslik && <p className="alt-sayfa-alt">{altBaslik}</p>}
          </header>
        )}
        <div className="alt-sayfa-govde">{children}</div>
        {dugmeler && <div className="alt-sayfa-dugmeler">{dugmeler}</div>}
      </div>
    </div>,
    document.body,
  )
}
