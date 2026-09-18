/**
 * Alt çizgili sekmeler (kural 4). Kutu düğme şeklinde sekme yok.
 * varyant: "koyu" (UstBlok içinde) | "acik" (zeminde).
 * secenekler: [{ k, ad, rozet? }]
 */
export default function Sekmeler({ secenekler, deger, onSec, varyant = 'acik', etiket = 'Bölümler' }) {
  return (
    <nav className={`alt-sekmeler alt-sekmeler--${varyant}`} aria-label={etiket}>
      {secenekler.map(({ k, ad, rozet }) => (
        <button
          key={k}
          type="button"
          className="alt-sekme"
          aria-current={deger === k ? 'page' : undefined}
          onClick={() => onSec(k)}
        >
          {ad}
          {rozet}
        </button>
      ))}
    </nav>
  )
}
