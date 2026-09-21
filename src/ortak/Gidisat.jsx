/* Gidişat: Bugün / 7 gün / 30 gün anahtarı ve tek kart dizisi.
   Koçta sınıfın toplamı, öğrencide kendi verisi; bileşen aynı.
   Veri dürüstlüğü: yetersiz dönemde sahte çizgi yok, kesik çizgili
   yer tutucu var; eksik gün sayısı kartın üstünde açıkça yazılır. */

export const DONEMLER = [
  ['bugun', 'Bugün'],
  ['hafta', '7 gün'],
  ['ay', '30 gün'],
]

function Cizgi({ seri }) {
  if (!seri || seri.length < 2) return null
  const en = Math.max(...seri)
  const az = Math.min(...seri)
  const ar = en - az || 1
  const n = seri.length
  const pts = seri.map((v, i) => [6 + (i * 92) / (n - 1), 30 - ((v - az) / ar) * 24])
  const son = pts[n - 1]
  return (
    <svg className="gd-cizgi" width="104" height="36" viewBox="0 0 104 36" aria-hidden="true">
      <polyline
        className="gd-cizgi-yol"
        points={pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')}
        fill="none"
        stroke="var(--m-vurgu)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={son[0]} cy={son[1]} r="3.5" fill="var(--m-vurgu)" />
    </svg>
  )
}

export default function Gidisat({ baslik = 'Gidişat', donem, onDonem, not, kartlar, bos, yukleniyor = false }) {
  return (
    <section className="ana-bolum gidisat" aria-label={baslik}>
      <div className="ana-bolum-bas">
        <h2>{baslik}</h2>
        <div className="ana-anahtar" role="group" aria-label="Dönem">
          {DONEMLER.map(([k, ad]) => (
            <button key={k} type="button" aria-pressed={donem === k} onClick={() => onDonem(k)}>
              {ad}
            </button>
          ))}
        </div>
      </div>
      {not && <p className="ana-bolum-not">{not}</p>}
      {yukleniyor ? (
        <div className="gd-izgara" aria-busy="true">
          {[0, 1, 2, 3].map((i) => <div key={i} className="gd-kart gd-kart--bekle" />)}
        </div>
      ) : bos ? (
        <div className="gd-bos">
          <strong>{bos.baslik}</strong>
          <span>{bos.metin}</span>
        </div>
      ) : (
        <div className="gd-izgara">
          {kartlar.map((k) => (
            <div key={`${donem}-${k.etiket}`} className="gd-kart">
              <span className="gd-etiket">{k.etiket}</span>
              <div className="gd-deger-satir">
                <span className={k.sonuk ? 'gd-deger gd-deger--sonuk' : 'gd-deger'}>{k.deger}</span>
                <Cizgi seri={k.seri} />
              </div>
              {k.alt && <span className="gd-alt">{k.alt}</span>}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

/** "2 sa 40 dk" */
export const sureYaz = (dk = 0) => {
  const d = Math.round(dk)
  if (d <= 0) return '0 dk'
  const s = Math.floor(d / 60)
  const k = d % 60
  return [s ? `${s} sa` : '', k ? `${k} dk` : ''].filter(Boolean).join(' ')
}

/** "19 Ekim" */
export const gunAyYaz = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })
