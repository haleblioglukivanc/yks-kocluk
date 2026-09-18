/**
 * Bölüm kalıbı (kural 8): başlık satırı (solda başlık, sağda yazı eylemi),
 * bir satır açıklama, içerik. Bölümleri çizgi ya da boşluk ayırır, kutu değil.
 * cizgili: üstünde ince ayırıcı çizgi.
 */
export default function Bolum({ baslik, sayi, aciklama, eylem, onEylem, cizgili = false, children }) {
  return (
    <section className={`bolum${cizgili ? ' bolum--cizgili' : ''}`}>
      <header className="bolum-basi">
        <h3 className="bolum-baslik">
          {baslik}
          {sayi != null && <span className="bolum-sayi">{sayi}</span>}
        </h3>
        {eylem && onEylem && (
          <button type="button" className="bolum-eylem" onClick={onEylem}>
            {eylem}
          </button>
        )}
      </header>
      {aciklama && <p className="bolum-aciklama">{aciklama}</p>}
      {children}
    </section>
  )
}
