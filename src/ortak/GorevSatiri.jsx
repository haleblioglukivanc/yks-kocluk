import { GOREV_DURUM_ANLAMI, GOREV_DURUM_ROZETI } from '../lib/gorevTuru.js'
import { dersGorunumu } from '../lib/dersGorunum.js'

/**
 * Görev satırı — tek dil (19 Eylül 2026, Bekir: "koçtaki liste harika,
 * öğrencinin Sırada'sı da aynı olsun").
 *
 * Solda ders renginde şerit, durum noktası, başlık, altında "Ders · Tür"
 * çipi (dersin soluk tonunda), sağda gri künye kutusu (saat / soru adedi)
 * ve ›. Satırın tamamı dokunulabilir.
 *
 * Koçun haftalık programı ve öğrencinin Bugün > Sırada listesi bunu
 * çiziyor; birinde yapılan düzeltme ötekinde unutulmasın.
 */
export default function GorevSatiri({
  ad,
  etiket,
  ders,
  durum = 'bekliyor',
  sag = [],
  acik = false,
  disabled = false,
  onClick,
  ariaLabel,
}) {
  const bitti = durum === 'tamamlandi'
  const kunye = sag.filter(Boolean)
  return (
    <button
      type="button"
      className={`gorev-satir prg-gorev${bitti ? ' gorev-satir--bitti' : ''}${acik ? ' prg-gorev--acik' : ''}`}
      data-durum={GOREV_DURUM_ANLAMI[durum] ?? 'notr'}
      style={{ '--ders-renk': dersGorunumu(ders).renk }}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      <span className="nokta" aria-hidden="true" />
      <span className="gorev-govde">
        <span className="gorev-baslik">{ad}</span>
        {etiket && <span className="gorev-etiket">{etiket}</span>}
        {GOREV_DURUM_ROZETI[durum] && (
          <span className="rozet gorev-durum">{GOREV_DURUM_ROZETI[durum]}</span>
        )}
      </span>
      {kunye.length > 0 && <span className="gorev-adet">{kunye.join(' · ')}</span>}
      <span className="prg-gorev-ok" aria-hidden="true">›</span>
    </button>
  )
}
