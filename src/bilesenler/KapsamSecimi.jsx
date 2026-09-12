import { dersKapsamAdi } from '../lib/dersGruplari.js'

/**
 * Kapsam şeridi — ders grubunun hangi yüzüne yazılacağı.
 *
 * Konu seçilince kapsam zaten belli: konu TYT'ninse görev TYT'ye yazılır.
 * Konu seçilmeyen işlerde (rutinler, "Matematik soru çözümü") böyle bir
 * ipucu yok; o zaman grubun ilk kapsamına yazmak raporu yanıltıyordu —
 * AYT rutini TYT tarafında görünüyordu.
 *
 * Şerit yalnızca gerçekten seçim varken çiziliyor: tek kapsamlı derste
 * (Türkçe, ya da kataloğu tyt_ayt tek satır olan dersler) hiç görünmez.
 */
export default function KapsamSecimi({ grup, deger, onSec, etiket = 'Kapsam' }) {
  if (!grup || grup.dersler.length < 2) return null

  const secili = String(deger ?? grup.dersler[0].id)

  return (
    <div className="alan">
      <span className="alan-etiket">{etiket}</span>
      <div className="kapsam-secim" role="group" aria-label={etiket}>
        {grup.dersler.map((d) => {
          const bu = String(d.id) === secili
          return (
            <button
              key={d.id}
              type="button"
              className={`kapsam-kutu${bu ? ' kapsam-kutu--secili' : ''}`}
              aria-pressed={bu}
              onClick={() => onSec(String(d.id))}
            >
              {dersKapsamAdi(d)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
