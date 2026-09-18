/**
 * Durum/uyarı satırı (kural 7): renkli nokta + düz metin. Rozet ya da hap
 * içinde saklanmaz. durum: acil | izle | iyi | notr | kapali
 */
export default function UyariSatiri({ durum = 'notr', children }) {
  return (
    <p className={`uyari-satiri uyari-satiri--${durum}`}>
      <i className="uyari-satiri-nokta" aria-hidden="true" />
      <span>{children}</span>
    </p>
  )
}
