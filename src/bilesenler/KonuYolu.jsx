import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Uyari, Yukleniyor } from '../bilesenler/Ortak.jsx'
import { Kalem, KALEM_ADI } from './Kalem.jsx'
import './KonuYolu.css'

/* Konu yolu — bir dersin konuları bölge → durak olarak, kıvrımlı bir yol
   üstünde. Öğrenci ekranında da koç ekranında da bu bileşen kullanılır;
   fark yalnızca eylemler (öğrenci "bitirdim" der, koç onaylar).

   Yol durumları sunucuda hesaplanır (konu_yolu RPC): onayli, bekliyor,
   tekrar, simdi, planli, sirada. Burada sadece çizilir.

   Bilinçli kararlar: kilit ikonu yok (ileri konular soluk, ceza değil ufuk);
   yeşil yalnızca "onaylandı" demek; puan/rozet yok, tek kutlama anı koç onayı. */

const ETIKET = {
  onayli: 'onaylandı',
  bekliyor: 'koç onayı bekliyor',
  tekrar: 'tekrar gerekiyor',
  simdi: 'şu an burada',
  planli: 'planda',
  sirada: 'sırada',
}

const ILERLEME_ADI = {
  baslanmadi: 'Başlanmadı',
  calisiliyor: 'Çalışılıyor',
  tamamlandi: 'Bitti',
  tekrar_gerekli: 'Tekrar',
}

const X = [24, 50, 76] // zikzak konumları (%)

function tarihKisa(t) {
  if (!t) return '—'
  return new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
}

/* Kâmil'in söylediği cümle. Öğrenciye "sen", koça "öğrenci" diye konuşur. */
function soz(rol, durak, bolge, olay) {
  const ben = rol === 'ogrenci'
  if (olay === 'bolge') return ben
    ? <><b>{bolge}</b> bölgesi bitti. Buraya bir daha dönmene gerek yok.</>
    : <><b>{bolge}</b> bölgesi tamamlandı.</>
  if (olay === 'onay') return ben
    ? <><b>{durak.ad}</b> onaylandı. Bir durak daha geride kaldı.</>
    : <><b>{durak.ad}</b> onaylandı, öğrenci haritasında yeşile döndü.</>
  if (olay === 'bitti') return ben
    ? <><b>{durak.ad}</b> bitti mi? Süper. Koçun bakınca durak yeşile döner.</>
    : <><b>{durak.ad}</b> bitti olarak işaretlendi.</>
  if (olay === 'hata') return ben
    ? <>Denemelerde <b>{durak.ad}</b> {durak.hata_adet} kez takılmış. {durak.yol === 'onayli' ? 'Onaylı olsa da bir tur daha bakmak iyi olur.' : 'Sırası gelince buraya biraz fazla zaman ayıralım.'}</>
    : <><b>{durak.ad}</b> konusunda {durak.hata_adet} deneme hatası var. {durak.yol === 'onayli' ? 'Tekrar işaretlemek isteyebilirsin.' : 'Plan yaparken göz önünde bulundur.'}</>
  if (!durak) return ben
    ? 'Bu derste açık bir konu yok. Koçunla bir sonraki durağı seçin.'
    : 'Bu derste şu an çalışılan konu yok.'
  switch (durak.yol) {
    case 'simdi':
      return ben
        ? <>Şu an <b>{durak.ad}</b>'dayız. Bugün biraz ilerlemek yeter, gerisi yarın.</>
        : <>Öğrenci şu an <b>{durak.ad}</b> konusunda.</>
    case 'bekliyor':
      return ben
        ? <><b>{durak.ad}</b> için koçun bakmasını bekliyoruz. Bu arada ben de nefes alıyorum.</>
        : <><b>{durak.ad}</b> kontrol bekliyor.</>
    case 'tekrar':
      return ben
        ? <><b>{durak.ad}</b> bir tur daha istiyor. Olur böyle şeyler.</>
        : <><b>{durak.ad}</b> tekrar isteniyor.</>
    case 'planli':
      return ben
        ? <><b>{durak.ad}</b> planda ama sırası gelmedi.</>
        : <><b>{durak.ad}</b> planlanmış, henüz başlanmadı.</>
    case 'onayli':
      return <><b>{durak.ad}</b> onaylandı.</>
    default:
      return ben
        ? <><b>{durak.ad}</b> daha ileride. Yol oraya da çıkacak, acele yok.</>
        : <><b>{durak.ad}</b> henüz sırada.</>
  }
}

export default function KonuYolu({ ogrenciId, dersId, rol = 'ogrenci', onDegisti }) {
  const [yol, setYol] = useState(null)
  const [hata, setHata] = useState('')
  const [secili, setSecili] = useState(null)
  const [balon, setBalon] = useState({ olay: null, durak: null, bolge: null })
  const [ruh, setRuh] = useState('bekliyor')
  const [patlayan, setPatlayan] = useState(null)
  const haritaRef = useRef(null)
  const [cizgi, setCizgi] = useState({ soluk: '', renkli: '', kamil: null, w: 0, h: 0 })

  const yukle = useCallback(async () => {
    const { data, error } = await supabase.rpc('konu_yolu', { p_ogrenci_id: ogrenciId, p_ders_id: dersId })
    if (error) {
      setHata(hataMetni(error))
      return
    }
    setYol(data)
  }, [ogrenciId, dersId])

  useEffect(() => {
    yukle()
  }, [yukle])

  const duraklar = yol ? yol.bolgeler.flatMap((b) => b.duraklar.map((d) => ({ ...d, bolge: b.ad }))) : []
  const simdiki =
    duraklar.find((d) => d.yol === 'simdi') ??
    duraklar.find((d) => d.yol === 'bekliyor') ??
    duraklar.find((d) => d.yol !== 'onayli')

  /* Yol çizgisi: durak düğmelerinin gerçek konumlarından ölçülür.
     Bölge başlıkları araya girdiği için yükseklik sabit değil. */
  useLayoutEffect(() => {
    const kok = haritaRef.current
    if (!kok || !duraklar.length) return
    const olc = () => {
      const h = kok.getBoundingClientRect()
      const pts = duraklar.map((d, i) => {
        const el = kok.querySelector(`[data-konu="${d.id}"] .yol-nokta`)
        if (!el) return null
        const r = el.getBoundingClientRect()
        return { x: r.left - h.left + r.width / 2, y: r.top - h.top + r.height / 2, d, i }
      }).filter(Boolean)
      let soluk = ''
      let renkli = ''
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i]
        const b = pts[i + 1]
        const my = (a.y + b.y) / 2
        const seg = `M${a.x} ${a.y} C${a.x} ${my} ${b.x} ${my} ${b.x} ${b.y} `
        const gecildi = a.d.yol === 'onayli' && ['onayli', 'bekliyor', 'simdi', 'tekrar'].includes(b.d.yol)
        if (gecildi) renkli += seg
        else soluk += seg
      }
      const k = simdiki ? pts.find((p) => p.d.id === simdiki.id) : null
      setCizgi({
        soluk,
        renkli,
        w: h.width,
        h: h.height,
        kamil: k ? { x: k.x + (k.x > h.width / 2 ? -66 : 30), y: k.y - 50 } : null,
      })
    }
    olc()
    const ro = new ResizeObserver(olc)
    ro.observe(kok)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yol])

  useEffect(() => {
    if (!yol) return
    /* Açılışta: çalışılan konu varsa onu anlat; yoksa denemelerde en çok
       takılınan durağı göster. Deneme verisi böylece haritaya bağlanıyor. */
    const enCokHata = [...duraklar].filter((d) => (d.hata_adet ?? 0) >= 2).sort((a, b) => b.hata_adet - a.hata_adet)[0]
    if (!duraklar.some((d) => d.yol === 'simdi') && enCokHata) {
      setBalon({ olay: 'hata', durak: enCokHata, bolge: null })
      setRuh('dusunuyor')
    } else {
      setBalon({ olay: null, durak: simdiki, bolge: null })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yol])

  function ac(d) {
    setSecili(d)
    const hataVar = (d.hata_adet ?? 0) >= 2
    setBalon({ olay: hataVar ? 'hata' : null, durak: d, bolge: null })
    setRuh(hataVar ? 'dusunuyor' : d.yol === 'onayli' ? 'sevinc' : d.yol === 'tekrar' ? 'endise' : 'bekliyor')
  }

  function kapat() {
    setSecili(null)
    setBalon({ olay: null, durak: simdiki, bolge: null })
    setRuh('bekliyor')
  }

  /* Bir durağın ilerleme durumunu yazar. Onay bayrağı tetikleyicide korunur:
     öğrenci onay veremez, durum "bitti"den çıkarsa onay düşer. */
  async function yaz(d, alan) {
    setHata('')
    const { error } = await supabase
      .from('konu_ilerleme')
      .upsert({ ogrenci_id: ogrenciId, konu_id: d.id, ...alan }, { onConflict: 'ogrenci_id,konu_id' })
    if (error) {
      setHata(hataMetni(error))
      return false
    }
    await yukle()
    onDegisti?.()
    return true
  }

  async function bitirdim(d) {
    if (await yaz(d, { durum: 'tamamlandi' })) {
      setSecili(null)
      setPatlayan(d.id)
      setRuh('sevinc')
      setBalon({ olay: 'bitti', durak: d, bolge: null })
    }
  }

  async function basladim(d) {
    if (await yaz(d, { durum: 'calisiliyor' })) setSecili(null)
  }

  async function onayla(d, onay) {
    if (await yaz(d, { durum: 'tamamlandi', koc_onayi: onay })) {
      setSecili(null)
      if (!onay) return
      setPatlayan(d.id)
      setRuh('kutlama')
      const b = yol.bolgeler.find((x) => x.ad === d.bolge)
      const bolgeBitiyor = b && b.duraklar.every((x) => x.id === d.id || x.yol === 'onayli')
      setBalon({ olay: bolgeBitiyor ? 'bolge' : 'onay', durak: d, bolge: d.bolge })
    }
  }

  async function durumSec(d, durum) {
    if (await yaz(d, { durum })) setSecili(null)
  }

  useEffect(() => {
    if (!patlayan) return
    const t = setTimeout(() => setPatlayan(null), 700)
    return () => clearTimeout(t)
  }, [patlayan])

  if (hata && !yol) return <Uyari>{hata}</Uyari>
  if (!yol) return <Yukleniyor sade />

  const koc = rol === 'koc'

  return (
    <div className="konu-yolu">
      <Uyari>{hata}</Uyari>

      <div className="yol-ozet">
        <span><strong>{yol.onayli}</strong> / {yol.toplam} durak</span>
        <span>{yol.bolgeler.filter((b) => b.tamam).length} / {yol.bolgeler.length} bölge</span>
      </div>
      <div className="yol-cubuk"><i style={{ width: `${yol.toplam ? (yol.onayli / yol.toplam) * 100 : 0}%` }} /></div>

      <div className="yol-harita" ref={haritaRef}>
        <svg className="yol-cizgi" viewBox={`0 0 ${cizgi.w || 1} ${cizgi.h || 1}`} preserveAspectRatio="none" aria-hidden="true">
          <path d={cizgi.soluk} className="yol-cizgi--soluk" />
          <path d={cizgi.renkli} className="yol-cizgi--gecildi" />
        </svg>

        {cizgi.kamil && (
          <div className="yol-kamil" style={{ left: cizgi.kamil.x, top: cizgi.kamil.y }} aria-hidden="true">
            <Kalem ruh={ruh} boyut={56} />
          </div>
        )}

        {yol.bolgeler.map((b) => (
          <section key={b.ad} className="yol-bolge">
            <h4 className="yol-bolge-ad">
              {b.ad}
              {b.tamam && <span className="yol-bolge-rozet">bölge tamam</span>}
            </h4>
            {b.duraklar.map((d) => {
              const i = duraklar.findIndex((x) => x.id === d.id)
              return (
                <div key={d.id} className="yol-durak" data-konu={d.id} data-yol={d.yol}>
                  <button
                    type="button"
                    style={{ left: `${X[i % 3]}%` }}
                    onClick={() => ac({ ...d, bolge: b.ad })}
                    aria-label={`${d.ad}, ${ETIKET[d.yol]}${(d.hata_adet ?? 0) >= 2 ? `, denemelerde ${d.hata_adet} hata` : ''}`}
                  >
                    <span className="yol-nokta-sar">
                      <span className={`yol-nokta${patlayan === d.id ? ' yol-nokta--pat' : ''}`}>
                        {d.yol === 'onayli' ? '✓' : i + 1}
                      </span>
                      {d.yol === 'bekliyor' && <span className="yol-nabiz" />}
                      {(d.hata_adet ?? 0) >= 2 && (
                        <span className="yol-hata" title={`Denemelerde ${d.hata_adet} hata`}>{d.hata_adet}</span>
                      )}
                    </span>
                    <span className="yol-ad">{d.ad}</span>
                  </button>
                </div>
              )
            })}
          </section>
        ))}
      </div>

      <div className="yol-balon">
        <div className="yol-balon-kamil"><Kalem ruh={ruh} boyut={40} /></div>
        <p><span className="yol-balon-ad">{KALEM_ADI}</span>{soz(rol, balon.durak, balon.bolge, balon.olay)}</p>
      </div>

      {secili && (
        <>
          <div className="yol-perde" onClick={kapat} />
          <section className="yol-sayfa" role="dialog" aria-modal="true" aria-label={secili.ad}>
            <div className="yol-tutamac" />
            <h3>{secili.ad}</h3>
            <div className={`yol-durum yol-durum--${secili.yol}`}>● {ETIKET[secili.yol]}</div>
            <dl className="yol-satirlar">
              <div><dt>Bölge</dt><dd>{secili.bolge}</dd></div>
              <div><dt>Planlanan tarih</dt><dd>{tarihKisa(secili.plan_tarihi)}</dd></div>
              <div><dt>Çözülen soru</dt><dd>{secili.soru_adet || '—'}</dd></div>
              <div><dt>Çalışma süresi</dt><dd>{secili.calisma_dk ? `${secili.calisma_dk} dk` : '—'}</dd></div>
              <div><dt>Denemede hata</dt><dd>{secili.hata_adet || '—'}</dd></div>
              {secili.onay_tarihi && <div><dt>Onay</dt><dd>{tarihKisa(secili.onay_tarihi)}</dd></div>}
            </dl>

            {koc ? (
              <div className="yol-eylem yol-eylem--koc">
                <select value={secili.durum} onChange={(e) => durumSec(secili, e.target.value)} aria-label="Durum">
                  {Object.entries(ILERLEME_ADI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                {secili.durum === 'tamamlandi' && (
                  secili.koc_onayi
                    ? <button type="button" className="yol-dugme" onClick={() => onayla(secili, false)}>Onayı geri al</button>
                    : <button type="button" className="yol-dugme yol-dugme--yesil" onClick={() => onayla(secili, true)}>Kontrol ettim, onayla</button>
                )}
              </div>
            ) : (
              <div className="yol-eylem">
                {secili.yol === 'simdi' || secili.yol === 'tekrar' ? (
                  <>
                    <button type="button" className="yol-dugme" onClick={kapat}>Devam ediyorum</button>
                    <button type="button" className="yol-dugme yol-dugme--birincil" onClick={() => bitirdim(secili)}>Konuyu bitirdim</button>
                  </>
                ) : secili.yol === 'bekliyor' ? (
                  <>
                    <button type="button" className="yol-dugme" disabled>Onay bekliyor</button>
                    <button type="button" className="yol-dugme" onClick={() => basladim(secili)}>Geri al, devam edeyim</button>
                  </>
                ) : secili.yol === 'onayli' ? (
                  <button type="button" className="yol-dugme" onClick={() => durumSec(secili, 'tekrar_gerekli')}>Tekrar çalışacağım</button>
                ) : (
                  <>
                    <button type="button" className="yol-dugme" onClick={kapat}>Tamam</button>
                    <button type="button" className="yol-dugme yol-dugme--birincil" onClick={() => basladim(secili)}>Başladım</button>
                  </>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
