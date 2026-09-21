import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Uyari, Yukleniyor } from './Ortak.jsx'
import DenemeFormu from './DenemeFormu.jsx'
import { NetCizgisi, DenemeHatalari } from './DenemePaneli.jsx'
import { TekrarBlogu } from './HataDefteri.jsx'

/* Öğrencinin Denemeler sayfası v2 (22 Eylül 2026, Bekir'in onayladığı mokap).
   Öğrenci gösterge okumaz: her blok durumunu düz bir cümleyle anlatır.
   Dört blok: Deneme ekle · Son denemen · Tekrar etmen gerekenler · Bütün
   denemelerin. Aynı bilgi bir kez yazılır; sayılar Türkçe virgülle.
   Koçun öğrenci ekranı eski DenemePaneli'ni kullanmaya devam eder. */

const TUR_ADI = { tyt: 'TYT', ayt: 'AYT', ydt: 'YDT', brans: 'Branş' }
export const netYaz = (n) => {
  const v = Math.round(Number(n) * 100) / 100
  return String(v).replace('.', ',')
}
const tarihYaz = (t) => new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })

export default function OgrenciDenemeleri({ ogrenciId, katalogId, hedefTyt = null, hedefAyt = null, duzenlenebilir = true, ekleTetik = 0, koc = false, onHedefEkle = null }) {
  /* Koçun öğrenci ekranında aynı bloklar, üçüncü kişiyle (22 Eylül 2026). */
  const K = (ogr, kocMetni) => (koc ? kocMetni : ogr)
  const [veri, setVeri] = useState(null)
  const [hata, setHata] = useState('')
  const [formAcik, setFormAcik] = useState(false)
  const [acikDers, setAcikDers] = useState(null)
  const [acikDeneme, setAcikDeneme] = useState(null)
  const [tur, setTur] = useState(null)
  const formRef = useRef(null)

  const yukle = useCallback(async () => {
    const { data, error } = await supabase.rpc('deneme_paneli', { p_ogrenci: ogrenciId, p_limit: 12 })
    if (error) { setHata(hataMetni(error)); setVeri({ denemeler: [], zayif: [] }); return }
    setHata('')
    setVeri(data ?? { denemeler: [], zayif: [] })
  }, [ogrenciId])
  useEffect(() => { yukle() }, [yukle])

  /* Tepedeki "Deneme ekle" düğmesi formu açar ve oraya kaydırır. */
  useEffect(() => {
    if (!ekleTetik) return
    setFormAcik(true)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }, [ekleTetik])

  async function sil(id) {
    if (!window.confirm('Bu deneme silinsin mi? Netleri ve hata konuları da gider.')) return
    const { error } = await supabase.from('denemeler').delete().eq('id', id)
    if (error) setHata(hataMetni(error))
    else { setAcikDeneme(null); yukle() }
  }

  if (veri === null) return <Yukleniyor />
  const denemeler = veri.denemeler ?? []
  const zayif = veri.zayif ?? []

  const form = formAcik && (
    <div ref={formRef} className="odn-form">
      <DenemeFormu ogrenciId={ogrenciId} katalogId={katalogId} onEklendi={() => { setFormAcik(false); yukle() }} />
      <button type="button" className="odn-vazgec" onClick={() => setFormAcik(false)}>Vazgeç</button>
    </div>
  )

  if (denemeler.length === 0) {
    return (
      <>
        <Uyari>{hata}</Uyari>
        {form}
        <section className="kp-bolum">
          <div className="kp-bolum-bas"><h2>{K('Son denemen', 'Son denemesi')}</h2></div>
          <div className="kp-kart odn-bos">{K('Henüz deneme eklemedin. İlk denemeni ekleyince netin burada görünür; ikinci denemeden sonra da nasıl ilerlediğini görürsün.', 'Henüz deneme girilmedi. İlk deneme girilince neti burada görünür.')}</div>
        </section>
        <TekrarBlogu ogrenciId={ogrenciId} katalogId={katalogId} zayif={zayif} duzenlenebilir={duzenlenebilir && !koc} koc={koc} />
      </>
    )
  }

  const son = denemeler[0]
  const onceki = denemeler.find((d, i) => i > 0 && d.tur === son.tur) ?? null
  const fark = onceki ? Number(son.toplamNet) - Number(onceki.toplamNet) : null
  const oncekiDers = (ad) => onceki?.dersler?.find((x) => x.ders === ad) ?? null
  const ilerleyen = (son.dersler ?? [])
    .map((d) => ({ ad: d.ders, f: oncekiDers(d.ders) ? Number(d.net) - Number(oncekiDers(d.ders).net) : 0 }))
    .filter((x) => x.f > 0).sort((a, b) => b.f - a.f).slice(0, 2).map((x) => x.ad)
  const hedefNet = son.tur === 'tyt' ? hedefTyt : son.tur === 'ayt' ? hedefAyt : null
  const acikD = (son.dersler ?? []).find((d) => d.ders === acikDers)
  const acikOnceki = acikD ? oncekiDers(acikD.ders) : null

  const turler = [...new Set(denemeler.map((d) => d.tur))]
  const seciliTur = tur ?? son.tur
  const seri = denemeler.filter((d) => d.tur === seciliTur).slice().reverse().map((d) => ({ ...d, net: Number(d.toplamNet) }))

  return (
    <>
      <Uyari>{hata}</Uyari>
      {form}

      {/* 1. Son denemen */}
      <section className="kp-bolum">
        <div className="kp-bolum-bas"><h2>{K('Son denemen', 'Son denemesi')}</h2></div>
        <div className="kp-kart odn-son">
          <div className="odn-son-ust">
            <span className="odn-buyuk">{netYaz(son.toplamNet)}<small>net</small></span>
            <span className="odn-kim">{son.ad || `${TUR_ADI[son.tur] ?? son.tur} denemesi`}<br />{tarihYaz(son.tarih)}{son.yayin ? ` · ${son.yayin}` : ''}</span>
          </div>
          <p className="odn-cumle">
            {fark == null
              ? K('Bu ilk denemen. Bir sonrakini ekleyince ne kadar ilerlediğini burada göreceksin.', 'Bu ilk denemesi. Bir sonraki girilince ne kadar ilerlediği burada görünecek.')
              : fark > 0
                ? <>{K('Bir önceki denemenden', 'Bir önceki denemesinden')} <b className="odn-iyi">{netYaz(fark)} net fazla</b>.{ilerleyen.length ? ` En çok ${ilerleyen.join(' ve ')}'${ilerleyen.length > 1 ? 'te' : 'de'} ${K('ilerledin', 'ilerledi')}.` : ''}</>
                : fark < 0
                  ? <>{K('Bir önceki denemenden', 'Bir önceki denemesinden')} <b className="odn-kotu">{netYaz(Math.abs(fark))} net az</b>. {K('Tek bir deneme her şeyi söylemez; aşağıdaki tekrarlara bak.', 'Aşağıda hangi konularda kaçırdığı var.')}</>
                  : K('Bir önceki denemenle aynı net. Tekrarlarını yapmaya devam et.', 'Bir önceki denemesiyle aynı net.')}
          </p>
          {(son.dersler ?? []).length > 0 ? (
            <>
              <div className="odn-dersler">
                {son.dersler.map((d) => (
                  <button key={d.ders} type="button" className="odn-ders" aria-expanded={acikDers === d.ders} onClick={() => setAcikDers(acikDers === d.ders ? null : d.ders)}>
                    <span>{d.ders}</span><b>{netYaz(d.net)}</b>
                  </button>
                ))}
              </div>
              {acikD ? (
                <p className="odn-ders-acik">
                  {acikD.ders}: {acikD.dogru} doğru, {acikD.yanlis} yanlış, {acikD.bos} boş → {netYaz(acikD.net)} net.
                  {acikOnceki ? (Number(acikD.net) - Number(acikOnceki.net) > 0 ? ` Bir önceki denemeden ${netYaz(Number(acikD.net) - Number(acikOnceki.net))} net fazla.` : Number(acikD.net) - Number(acikOnceki.net) < 0 ? ` Bir önceki denemeden ${netYaz(Number(acikOnceki.net) - Number(acikD.net))} net az.` : ' Bir önceki denemeyle aynı.') : ''}
                </p>
              ) : (
                <span className="odn-ipucu">{K('Bir derse dokun, doğru–yanlış–boş sayını gör.', 'Bir derse dokun, doğru–yanlış–boş sayısını gör.')}</span>
              )}
            </>
          ) : (
            <span className="odn-ipucu">Bu denemede yalnız toplam net var. Bir dahakine ders ders girersen hangi derste ilerlediğini görürsün.</span>
          )}
          <div className="odn-hedef">
            {hedefNet && Number(hedefNet) > 0 ? (
              <>
                <p>
                  {Number(son.toplamNet) >= Number(hedefNet)
                    ? <>{K('Hedefin', 'Hedefi')} <b>{netYaz(hedefNet)} net</b>; {K('onu geçtin. Koçunla yeni bir hedef konuşabilirsin.', 'geçti. Yeni bir hedef konuşma zamanı.')}</>
                    : <>{K('Hedefin', 'Hedefi')} <b>{netYaz(hedefNet)} net</b>. Ona <b>{netYaz(Number(hedefNet) - Number(son.toplamNet))} net</b> kaldı.</>}
                </p>
                <div className="odn-cubuk"><s style={{ width: `${Math.min(100, (Number(son.toplamNet) / Number(hedefNet)) * 100)}%` }} /></div>
              </>
            ) : (
              koc ? (
              <p className="odn-soluk">Henüz hedef neti yok. {onHedefEkle && <button type="button" className="odn-hedef-ekle" onClick={onHedefEkle}>Hedef ekle ›</button>}</p>
            ) : (
              <p className="odn-soluk">Henüz bir hedef netin yok. Koçunla konuşup bir hedef koyun; o zaman burada ona ne kadar yaklaştığını görürsün.</p>
            )
            )}
          </div>
        </div>
      </section>

      {/* 2. Tekrar etmen gerekenler */}
      <TekrarBlogu ogrenciId={ogrenciId} katalogId={katalogId} zayif={zayif} duzenlenebilir={duzenlenebilir && !koc} koc={koc} />

      {/* 3. Bütün denemelerin */}
      <section className="kp-bolum">
        <div className="kp-bolum-bas">
          <h2>{K('Bütün denemelerin', 'Bütün denemeleri')}</h2>
          {turler.length > 1 && (
            <div className="ana-anahtar" role="group" aria-label="Deneme türü">
              {turler.map((t) => <button key={t} type="button" aria-pressed={t === seciliTur} onClick={() => setTur(t)}>{TUR_ADI[t] ?? t}</button>)}
            </div>
          )}
        </div>
        <p className="tb-aciklama">{K('Netin her denemede nasıl değişti.', 'Neti her denemede nasıl değişti.')}</p>
        <div className="kp-kart odn-gecmis">
          {seri.length >= 2 && <div className="odn-grafik"><NetCizgisi seri={seri} hedef={hedefNet && Number(hedefNet) > 0 ? Number(hedefNet) : null} /></div>}
          {denemeler.filter((d) => d.tur === seciliTur).map((d) => (
            <div key={d.id} className="odn-satir">
              <button type="button" className="odn-dn" aria-expanded={acikDeneme === d.id} onClick={() => setAcikDeneme(acikDeneme === d.id ? null : d.id)}>
                <span><b>{d.ad || `${TUR_ADI[d.tur] ?? d.tur} denemesi`}</b><small>{tarihYaz(d.tarih)}{d.yayin ? ` · ${d.yayin}` : ''}</small></span>
                <em>{netYaz(d.toplamNet)}</em>
              </button>
              {acikDeneme === d.id && (
                <div className="odn-dn-acik">
                  <p>
                    {d.toplamDogru} doğru, {d.toplamYanlis} yanlış, {d.toplamBos} boş. Her 4 yanlış 1 doğruyu götürdüğü için netin {netYaz(d.toplamNet)}.
                  </p>
                  {duzenlenebilir && (
                    <>
                      <DenemeHatalari deneme={d} katalogId={katalogId} onDegisti={yukle} />
                      <button type="button" className="odn-sil" onClick={() => sil(d.id)}>Bu denemeyi sil</button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
