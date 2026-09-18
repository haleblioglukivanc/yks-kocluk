/**
 * Ekranın koyu başı (TASARIM-KURALLARI.md, kural 3).
 *
 * Header'a bitişik tek parça blok. Kimlik, özet satırı, uyarı, birincil
 * eylem ve sekmeler hep bunun içinde durur; havada duran ayrı kart yok.
 * `sekmeli`: blok sekmelerle biter, altına dikiş kartı oturmaz.
 */
export default function UstBlok({ sinif = '', etiket, sekmeli = false, children }) {
  const siniflar = ['hero-yuzey', 'ust-blok', sekmeli ? 'ust-blok--sekmeli' : '', sinif]
    .filter(Boolean)
    .join(' ')
  return (
    <section className={siniflar} aria-label={etiket}>
      {children}
    </section>
  )
}
