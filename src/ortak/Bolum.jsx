/**
 * Bölüm kalıbı (kural 8): başlık satırı (solda başlık, sağda yazı eylemi),
 * bir satır açıklama, içerik. Bölümleri çizgi ya da boşluk ayırır, kutu değil.
 * cizgili: üstünde ince ayırıcı çizgi.
 * sag: başlığın sağına serbest içerik (seçim şeridi gibi); eylem yazı düğmesidir.
 */
export default function Bolum({ baslik, sayi, aciklama, eylem, onEylem, sag = null, cizgili = false, sinif = '', children }) {
  return (
    <section className={`bolum${cizgili ? ' bolum--cizgili' : ''}${sinif ? ` ${sinif}` : ''}`}>
      <header className="bolum-basi">
        <h3 className="bolum-baslik">
          {baslik}
          {sayi != null && <span className="bolum-sayi">{sayi}</span>}
        </h3>
        {sag}
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
