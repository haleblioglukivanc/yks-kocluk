/**
 * Rapor ekranlarının koyu tepesi: başlık, dönem, yarım daire gösterge.
 *
 * Tek bileşen iki yerde: koçun Rapor sekmesi (sınıfın plan tamamlaması)
 * ve öğrencinin Denemeler sekmesi (hedefe göre net). Bugün ekranı sıcak
 * ve "yap" der; rapor koyu ve "bak" der. Aynı bileşen olduğu için
 * göstergeye dokunan bir düzeltme ikisinde de aynı anda geçer.
 *
 * yuzde null ise gösterge boş çizilir ve deger yerine tire konur; veri
 * yokken sıfır göstermek yanlış bilgi verir.
 */

const YARICAP = 50
const YAY = Math.PI * YARICAP // yarım çevre

function Gosterge({ yuzde, deger, etiket }) {
  const oran = yuzde == null ? 0 : Math.max(0, Math.min(100, yuzde)) / 100
  return (
    <div className="rt-gosterge" role="img" aria-label={`${etiket} ${deger}`}>
      <svg viewBox="0 0 120 66" width="120" height="66">
        <path d="M10 60 A50 50 0 0 1 110 60" fill="none" stroke="rgba(255,255,255,0.14)"
              strokeWidth="10" strokeLinecap="round" />
        {oran > 0 && (
          <path d="M10 60 A50 50 0 0 1 110 60" fill="none" stroke="var(--marka-koyu-amber)"
                strokeWidth="10" strokeLinecap="round"
                strokeDasharray={YAY} strokeDashoffset={YAY * (1 - oran)} />
        )}
      </svg>
      <strong className="rt-deger">{deger}</strong>
    </div>
  )
}

export default function RaporTepesi({
  baslik,
  altBaslik,
  yuzde,
  deger,
  etiket,
  detay,
  durum,       // 'iyi' | 'dikkat' | null
  durumMetni,
  children,
}) {
  return (
    <section className="hero-yuzey rt" aria-label={baslik}>
      <h1 className="rt-baslik">{baslik}</h1>
      {altBaslik && <p className="rt-alt">{altBaslik}</p>}

      <div className="rt-kutu">
        <div className="rt-metin">
          <span className="rt-etiket">{etiket}</span>
          {detay && <span className="rt-detay">{detay}</span>}
          {durum && durumMetni && (
            <span className={`rt-durum rt-durum--${durum}`}>{durumMetni}</span>
          )}
        </div>
        <Gosterge yuzde={yuzde} deger={deger} etiket={etiket} />
      </div>

      {children}
    </section>
  )
}
