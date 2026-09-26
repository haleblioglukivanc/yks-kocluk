import { useEffect, useState } from 'react'
import { SINAVLAR, kalanSure } from '../lib/sinav.js'

const tarihYaz = (d) => d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' })
const iki = (n) => String(n).padStart(2, '0')

/* Sınava kalan süre + "şu an hangi dönemdesin". Aşama metinleri site.js'te.
   Çizelge sınava kalan son bir yılı gösterir; imleç bugünü işaretler. */
export default function SinavSayaci({ sayac, onRandevu, onHesapla }) {
  const [sinav, setSinav] = useState(() => {
    try { return localStorage.getItem('sayac-sinav') === 'LGS' ? 'LGS' : 'YKS' } catch { return 'YKS' }
  })
  const [simdi, setSimdi] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setSimdi(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const sec = (s) => {
    setSinav(s)
    try { localStorage.setItem('sayac-sinav', s) } catch { /* gizli sekme */ }
  }

  const s = SINAVLAR[sinav]
  const k = kalanSure(s.tarih, simdi)
  const asamalar = sayac[sinav]
  const aktif = asamalar.findLastIndex((a) => k.gun <= a.gun)
  const asama = asamalar[Math.max(0, aktif)]

  // Çizelge: son 365 gün; her aşama başladığı günden bir sonrakine kadar
  const YIL = 365
  const dilimler = asamalar.map((a, i) => {
    const bas = Math.min(a.gun, YIL)
    const son = asamalar[i + 1]?.gun ?? 0
    return { ...a, en: ((bas - son) / YIL) * 100 }
  })
  const imlec = Math.max(0, Math.min(100, ((YIL - Math.min(k.gun, YIL)) / YIL) * 100))

  return (
    <section id="sayac" className="t-kap t-bolum t-sayac" aria-labelledby="sayac-baslik">
      <div className="t-sayac-ust">
        <div>
          <p className="t-etiket">{sayac.etiket}</p>
          <div className="t-sayac-sekme" role="tablist" aria-label="Sınav">
            {Object.keys(SINAVLAR).map((ad) => (
              <button key={ad} type="button" role="tab" aria-selected={ad === sinav} className={ad === sinav ? 'secili' : ''} onClick={() => sec(ad)}>{ad}</button>
            ))}
          </div>
        </div>
        <p className="t-sayac-tarih">
          {s.not} · {tarihYaz(s.tarih)}
          {!s.kesin && <span className="t-sayac-tahmini"> · tahmini, ÖSYM/MEB açıklayınca güncellenir</span>}
        </p>
      </div>

      <h2 id="sayac-baslik" className="t-sayac-sayi" aria-live="off">
        <span className="t-sayac-gun"><b>{k.gun}</b> gün</span>
        <span className="t-sayac-saat" aria-hidden="true">{iki(k.saat)}:{iki(k.dakika)}:<i>{iki(k.saniye)}</i></span>
        <span className="t-gizli">{s.ad} sınavına {k.gun} gün kaldı</span>
      </h2>

      <div className="t-cizelge" aria-hidden="true">
        {dilimler.map((d, i) => (
          <span key={d.ad} className={'t-cizelge-dilim' + (i === aktif ? ' aktif' : '')} style={{ flexBasis: `${d.en}%` }}>
            <small>{d.ad}</small>
          </span>
        ))}
        <i className="t-cizelge-imlec" style={{ left: `${imlec}%` }}><em>bugün</em></i>
      </div>

      <div className="t-asama">
        <div className="t-asama-metin">
          <p className="t-asama-ad">Şu an: <b>{asama.ad}</b> dönemi</p>
          <p>{asama.metin}</p>
        </div>
        <ul className="t-asama-odak">
          {asama.odak.map((o) => <li key={o}>{o}</li>)}
        </ul>
        <div className="t-asama-eylem">
          <a href="/net-hesapla" onClick={onHesapla} className="t-dugme t-dugme--ana">Netini hesapla</a>
          <a href="/randevu" onClick={onRandevu} className="t-asama-bag">Bu dönemi birlikte planlayalım →</a>
        </div>
      </div>
    </section>
  )
}
