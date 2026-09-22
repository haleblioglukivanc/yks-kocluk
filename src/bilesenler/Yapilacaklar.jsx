import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Avatar } from './Fotograf.jsx'
import { GorusmeKarti, PlanKarti, IlhamKarti, KuyrukKarti } from './KararKuyrugu.jsx'

/* Yapılacaklar v2 (22 Eylül 2026, Bekir'in onayladığı mokap).
   Dört bölüm: Önce bunlar (öğrenci bekliyor) · Bugün · Bu hafta (toplu
   onay) · İyi haberler (toplu). Her kart ne olacağını söyler; aynı türden
   işler tek kartta onaylanır; basit işlemler 5 saniye "Geri al" ile
   bekletilip sonra gönderilir. Karmaşık kartlar (görüşme kurma, haftalık
   plan, kitap-söz, deneme analizi…) eski kart bileşenleriyle açılır. */

const ACIL_TIP = new Set(['risk', 'gorusme', 'blok'])
const HAFTA_TIP = new Set(['veli_ozet', 'ilham', 'plan', 'konu_tekrar', 'hedef'])
const BEKLE_MS = 5000

const TUR = {
  risk: ['Zorlanıyor', 'acil'], gorusme: ['Konuşmak istiyor', 'acil'], blok: ['Ders saati', 'dikkat'],
  basvuru: ['Aday', 'yeni'], konu: ['Konu bitti', 'dikkat'], analiz: ['Deneme analizi', 'dikkat'],
  hafiflet: ['Hedef', 'dikkat'], odeme: ['Ödeme', 'dikkat'], konu_tekrar: ['Konu tekrarı', 'dikkat'],
  plan: ['Haftalık plan', 'dikkat'], hedef: ['Hedef', 'dikkat'],
}
const anahtar = (k) => `${k.tip}|${k.kaynak_id}`
const ilkAd = (ad) => String(ad ?? '').replace(/ velisi$/, '').split(' ')[0]
/* Türkçe ekler: Nisa'nın, Berçem'in; Roşin'i, Nisa'yı. */
const SESLI = 'aıoueiöüAIOUEİÖÜ'
function sonUnlu(ad) { for (let i = ad.length - 1; i >= 0; i--) if (SESLI.includes(ad[i])) return ad[i].toLocaleLowerCase('tr') ; return 'e' }
function uyum(ad) { const u = sonUnlu(ad); return 'aı'.includes(u) ? 'ı' : 'ei'.includes(u) ? 'i' : 'ou'.includes(u) ? 'u' : 'ü' }
const unluyleBiter = (ad) => SESLI.includes(ad.slice(-1))
const iyelik = (ad) => `${ad}'${unluyleBiter(ad) ? 'n' : ''}${uyum(ad)}n`
const belirtme = (ad) => `${ad}'${unluyleBiter(ad) ? 'y' : ''}${uyum(ad)}`
const telYaz = (t) => {
  const s = String(t ?? '').replace(/\D/g, '').replace(/^90/, '').replace(/^0/, '')
  return s.length === 10 ? `0${s.slice(0, 3)} ${s.slice(3, 6)} ${s.slice(6, 8)} ${s.slice(8)}` : t
}

async function kararVer(k, karar, metin = null) {
  const { error } = await supabase.rpc('koc_karar_ver', {
    p_tip: k.tip, p_kaynak_id: k.kaynak_id, p_karar: karar,
    p_metin: metin ?? k.deger ?? k.mesaj ?? null, p_secili: [],
  })
  return error
}

export default function Yapilacaklar({ onOgrenciAc, onSayi, ogrenciId = null, baslik = null, onAcikDegisti = null }) {
  const [kartlar, setKartlar] = useState(null)
  const [gizli, setGizli] = useState(() => new Set())
  const [acik, setAcik] = useState(null)
  const [hata, setHata] = useState('')
  const [toast, setToast] = useState(null)
  const bekleyen = useRef(null)
  const [ilkToplam, setIlkToplam] = useState(0)

  const yukle = useCallback(async () => {
    const { data, error } = await supabase.rpc('koc_karar_kuyrugu', { p_limit: 99 })
    if (error) { setHata(hataMetni(error)); setKartlar([]); return }
    /* Öğrencinin koç ekranında yalnız o öğrencinin işleri (22 Eylül 2026). */
    const liste = (data ?? []).filter((k) => !ogrenciId || k.ogrenci_id === ogrenciId)
    setKartlar(liste)
    setIlkToplam((t) => t || liste.length)
  }, [ogrenciId])
  useEffect(() => { yukle() }, [yukle])

  /* Bekleyen işlem: kartlar gizlenir, 5 sn sonra gönderilir; Geri al iptal eder. */
  const calistir = useCallback(async () => {
    const b = bekleyen.current
    if (!b) return
    bekleyen.current = null
    clearTimeout(b.zaman)
    setToast(null)
    const hatalar = []
    for (const is of b.isler) {
      const e = await kararVer(is.kart, is.karar, is.metin)
      if (e) hatalar.push(hataMetni(e))
    }
    if (hatalar.length) {
      setHata(hatalar[0])
      setGizli((g) => { const y = new Set(g); b.isler.forEach((i) => y.delete(anahtar(i.kart))); return y })
    }
  }, [])
  useEffect(() => () => { if (bekleyen.current) calistir() }, [calistir])

  function yap(isler, metin) {
    if (bekleyen.current) calistir()
    setGizli((g) => { const y = new Set(g); isler.forEach((i) => y.add(anahtar(i.kart))); return y })
    setAcik(null)
    const zaman = setTimeout(() => calistir(), BEKLE_MS)
    bekleyen.current = { isler, zaman }
    setToast(metin)
  }
  function geriAl() {
    const b = bekleyen.current
    if (!b) return
    clearTimeout(b.zaman)
    bekleyen.current = null
    setToast(null)
    setGizli((g) => { const y = new Set(g); b.isler.forEach((i) => y.delete(anahtar(i.kart))); return y })
  }
  /* Eski kart bileşenleri kendi işlemini hemen yapar; bitince gizlenir. */
  const karmasikBitti = (k) => () => { setGizli((g) => new Set(g).add(anahtar(k))); setAcik(null) }

  const gorunen = useMemo(() => (kartlar ?? []).filter((k) => !gizli.has(anahtar(k))), [kartlar, gizli])
  const kalan = gorunen.length
  useEffect(() => { onSayi?.(kalan, gorunen.filter((k) => k.segment === 'acil').length, gorunen[0]?.ad) }, [kalan, gorunen, onSayi])

  const once = gorunen.filter((k) => ACIL_TIP.has(k.tip) || k.segment === 'acil' || k.segment === 'pencere')
  const tebrik = gorunen.filter((k) => k.tip === 'tebrik')
  const hafta = gorunen.filter((k) => !once.includes(k) && k.tip !== 'tebrik' && (HAFTA_TIP.has(k.tip) || k.segment === 'hafta'))
  const bugun = gorunen.filter((k) => !once.includes(k) && !hafta.includes(k) && k.tip !== 'tebrik')
  const veliOzet = hafta.filter((k) => k.tip === 'veli_ozet')
  const haftaDiger = hafta.filter((k) => k.tip !== 'veli_ozet')
  const toplam = Math.max(ilkToplam, kalan)
  const biten = toplam - kalan
  const ilkAcik = acik ?? (once[0] ? anahtar(once[0]) : bugun[0] ? anahtar(bugun[0]) : null)
  /* Masaüstünde yan sütun açık kartın öğrencisini gösterir (22 Eylül 2026). */
  const acikKart = gorunen.find((k) => anahtar(k) === ilkAcik) ?? null
  useEffect(() => { onAcikDegisti?.(acikKart?.ogrenci_id ?? null) }, [acikKart?.ogrenci_id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (kartlar === null) return ogrenciId ? null : <div className="yp-bekle" aria-busy="true" />
  if (ogrenciId && kartlar.length === 0) return null


  /* Aynı öğrencinin başka işleri: "Roşin için 2 iş daha" */
  const digerleri = (k) => {
    if (!k.ogrenci_id) return []
    return gorunen.filter((x) => x !== k && (x.ogrenci_id === k.ogrenci_id || ilkAd(x.ad) === ilkAd(k.ad) && x.tip !== 'basvuru'))
  }

  /* Bir bölümdeki kapalı satırların hepsi aynı türdeyse tür hapı çizilmez:
     11 satırda 11 "Zorlanıyor" bilgi değil gürültüydü (22 Eylül 2026). Fark
     satırın alt yazısında zaten var. */
  const kartCiz = (k, _i, bolum) => {
    const acikMi = anahtar(k) === ilkAcik
    const tekTur = Array.isArray(bolum) && bolum.length > 1 && bolum.every((x) => x.tip === bolum[0].tip)
    if (!acikMi) return <KapaliSatir key={anahtar(k)} k={k} onAc={() => setAcik(anahtar(k))} hapsiz={tekTur} />
    const ortak = { kart: k, onOgrenciAc, onBitti: karmasikBitti(k), onHata: setHata }
    if (k.tip === 'gorusme') return <div key={anahtar(k)} className="yp-eski"><GorusmeKarti {...ortak} /></div>
    if (k.tip === 'plan') return <div key={anahtar(k)} className="yp-eski"><PlanKarti {...ortak} /></div>
    if (k.tip === 'ilham') return <div key={anahtar(k)} className="yp-eski"><IlhamKarti {...ortak} /></div>
    if (k.tip === 'risk') return <RiskKarti key={anahtar(k)} k={k} diger={digerleri(k)} onOgrenciAc={onOgrenciAc} yap={yap} />
    if (k.tip === 'basvuru') return <BasvuruKarti key={anahtar(k)} k={k} yap={yap} />
    return <div key={anahtar(k)} className="yp-eski"><KuyrukKarti {...ortak} /></div>
  }

  if (ogrenciId) {
    if (kalan === 0 && !toast) return null
    const hepsi = [...once, ...bugun, ...haftaDiger]
    return (
      <div className="yp yp--ogrenci">
        <h2 className="yp-bas">{baslik ?? 'Bekleyenler'} <small>{kalan}</small></h2>
        {hata && <p className="yp-hata" role="alert">{hata}</p>}
        {hepsi.map(kartCiz)}
        {veliOzet.length > 0 && (
          <TopluKart ikon="✉︎" baslik={`Veli özeti · ${veliOzet.length}`} alt="Onaylanınca WhatsApp'tan iletmen için hazırlanır." kartlar={veliOzet}
            satirAd={(k) => `${iyelik(ilkAd(k.ad))} velisi`} dugme={(n) => `Seçilen ${n} özeti onayla`}
            onOnay={(sec) => yap(sec.map((kart) => ({ kart, karar: 'onay' })), `${sec.length} özet onaylandı ✓`)} />
        )}
        {tebrik.length > 0 && (
          <TopluKart iyi ikon="★" baslik={`${tebrik.length} tebrik hazır`} alt="Fark ettiğini söylemek yeter." kartlar={tebrik}
            satirAd={(k) => String(k.baglam ?? '').split(' · ').pop()} dugme={(n) => `Seçilen ${n} tebriği gönder`}
            onOnay={(sec) => yap(sec.map((kart) => ({ kart, karar: 'onay' })), `${sec.length} tebrik gönderiliyor ✓`)} />
        )}
        {toast && createPortal(
          <div className="yp-geri yp-geri--acik" role="status" aria-live="polite">
            <span>{toast}</span>
            <button type="button" onClick={geriAl}>Geri al</button>
          </div>,
          document.body,
        )}
      </div>
    )
  }

  return (
    <div className="yp">
      {toplam > 0 && (
        <div className="pb-ilerleme" aria-label={`${toplam} işten ${biten} tanesi bitti`}>
          <span>{biten} / {toplam} bitti</span>
          <span className="pb-cubuk"><s style={{ width: `${(biten / toplam) * 100}%` }} /></span>
        </div>
      )}
      {hata && <p className="yp-hata" role="alert">{hata}</p>}

      {once.length > 0 && (
        <section className="yp-bolum" aria-label="Önce bunlar">
          <h2 className="yp-bas">Önce bunlar <small>öğrenci bekliyor</small></h2>
          {once.map(kartCiz)}
        </section>
      )}
      {bugun.length > 0 && (
        <section className="yp-bolum" aria-label="Bugün">
          <h2 className="yp-bas">Bugün <small>birkaç dakikalık</small></h2>
          {bugun.map(kartCiz)}
        </section>
      )}
      {(veliOzet.length > 0 || haftaDiger.length > 0) && (
        <section className="yp-bolum" aria-label="Bu hafta">
          <h2 className="yp-bas">Bu hafta <small>toplu onay</small></h2>
          {veliOzet.length > 0 && (
            <TopluKart
              ikon="✉︎"
              baslik={`Veli özetleri · ${veliOzet.length}`}
              alt="Onaylananlar aşağıdaki kutuya düşer; WhatsApp'tan sen iletirsin."
              kartlar={veliOzet}
              satirAd={(k) => `${iyelik(ilkAd(k.ad))} velisi`}
              dugme={(n) => `Seçilen ${n} özeti onayla`}
              onOnay={(sec) => yap(sec.map((kart) => ({ kart, karar: 'onay' })), `${sec.length} özet onaylandı ✓`)}
            />
          )}
          {haftaDiger.map(kartCiz)}
        </section>
      )}
      {tebrik.length > 0 && (
        <section className="yp-bolum" aria-label="İyi haberler">
          <h2 className="yp-bas">İyi haberler <small>tek dokunuşla</small></h2>
          <TopluKart
            iyi
            ikon="★"
            baslik={`${tebrik.length} tebrik hazır`}
            alt="Fark ettiğini söylemek yeter."
            kartlar={tebrik}
            satirAd={(k) => `${ilkAd(k.ad)} · ${String(k.baglam ?? '').split(' · ').pop()}`}
            dugme={(n) => `Seçilen ${n} tebriği gönder`}
            onOnay={(sec) => yap(sec.map((kart) => ({ kart, karar: 'onay' })), `${sec.length} tebrik gönderiliyor ✓`)}
          />
        </section>
      )}

      {kalan === 0 && (
        <div className="yp-bos"><b>Posta kutusu boş.</b>Bugünlük bu kadar. Yeni bir şey olunca burada olacak.</div>
      )}

      {/* Bildirim sayfanın en üstünde (portal): kartların giriş hareketi
          sabit konumu bozup ortada siyah bir leke bırakıyordu. */}
      {toast && createPortal(
        <div className="yp-geri yp-geri--acik" role="status" aria-live="polite">
          <span>{toast}</span>
          <button type="button" onClick={geriAl}>Geri al</button>
        </div>,
        document.body,
      )}
    </div>
  )
}

function KapaliSatir({ k, onAc, hapsiz = false }) {
  const [tur, ton] = TUR[k.tip] ?? [k.tip, 'dikkat']
  return (
    <button type="button" className="yp-kart yp-kapali" onClick={onAc}>
      <Avatar yol={k.fotograf_yolu} ad={k.ad} boyut="kucuk" />
      <span className="yp-kapali-yazi"><b>{k.ad}</b><small>{k.baglam}</small></span>
      {!hapsiz && <span className={`yp-tur yp-tur--${ton}`}>{tur}</span>}
    </button>
  )
}

function Kimlik({ k, onOgrenciAc }) {
  const [tur, ton] = TUR[k.tip] ?? [k.tip, 'dikkat']
  return (
    <div className="yp-kisi">
      <Avatar yol={k.fotograf_yolu} ad={k.ad} boyut="kucuk" />
      <button type="button" className="yp-kisi-yazi" onClick={() => k.ogrenci_id && onOgrenciAc?.(k.ogrenci_id)}>
        <b>{k.ad}</b><small>{k.baglam}</small>
      </button>
      <span className={`yp-tur yp-tur--${ton}`}>{tur}</span>
    </div>
  )
}

function RiskKarti({ k, diger, onOgrenciAc, yap }) {
  const [metin, setMetin] = useState(k.mesaj ?? '')
  const a = k.aksiyonlar ?? {}
  return (
    <section className="yp-kart yp-is">
      <Kimlik k={k} onOgrenciAc={onOgrenciAc} />
      {k.oneri && <p className="yp-neden">{k.oneri}</p>}
      {k.mesaj != null && (
        <>
          <textarea className="yp-mesaj" value={metin} onChange={(e) => setMetin(e.target.value)} rows={3} aria-label="Gidecek mesaj" />
          <span className="yp-ipucu">Mesaja dokunup değiştirebilirsin.</span>
        </>
      )}
      {diger.length > 0 && (
        <p className="yp-ayni">{ilkAd(k.ad)} için <b>{diger.length} iş daha</b> var: {[...new Set(diger.map((d) => (TUR[d.tip]?.[0] ?? (d.tip === 'tebrik' ? 'tebrik' : d.tip === 'veli_ozet' ? 'veli özeti' : d.tip)).toLocaleLowerCase('tr')))].join(', ')}. Aşağıda.</p>
      )}
      <button type="button" className="yp-birincil" onClick={() => yap([{ kart: k, karar: 'onay', metin }], 'Mesaj gönderiliyor ✓')}>{a.onay ?? 'Mesajı gönder'}</button>
      <div className="yp-ikincil">
        {a.sil && <button type="button" onClick={() => yap([{ kart: k, karar: 'sil' }], 'Görüşüldü olarak kaydediliyor ✓')}>Telefonda görüştüm</button>}
        {a.ertele && <button type="button" onClick={() => yap([{ kart: k, karar: 'ertele' }], 'Yarına ertelendi ✓')}>Yarına ertele</button>}
        {k.ogrenci_id && <button type="button" className="yp-sag" onClick={() => onOgrenciAc?.(k.ogrenci_id)}>{belirtme(ilkAd(k.ad))} aç ›</button>}
      </div>
    </section>
  )
}

function BasvuruKarti({ k, yap }) {
  const tel = k.deger || k.ek?.telefon
  return (
    <section className="yp-kart yp-is">
      <Kimlik k={k} />
      <p className="yp-neden">
        Tanıtım sitesinden başvurdu.{k.mesaj ? ` Notu: "${k.mesaj}"` : ''}
      </p>
      {tel && <a className="yp-birincil" href={`tel:${String(tel).startsWith('+') ? tel : `+90${String(tel).replace(/^0/, '')}`}`}>Ara · {telYaz(tel)}</a>}
      <div className="yp-ikincil">
        <button type="button" onClick={() => yap([{ kart: k, karar: 'onay' }], 'Arandı olarak kaydediliyor ✓')}>Aradım, kapat</button>
        <button type="button" onClick={() => yap([{ kart: k, karar: 'ertele' }], 'Yarın hatırlatılacak ✓')}>Yarın hatırlat</button>
      </div>
    </section>
  )
}

function TopluKart({ ikon, baslik, alt, kartlar, satirAd, dugme, onOnay, iyi = false }) {
  const [secim, setSecim] = useState(() => new Set(kartlar.map(anahtar)))
  const [okunan, setOkunan] = useState(null)
  useEffect(() => { setSecim(new Set(kartlar.map(anahtar))) }, [kartlar])
  const secilen = kartlar.filter((k) => secim.has(anahtar(k)))
  return (
    <section className={iyi ? 'yp-kart yp-toplu yp-toplu--iyi' : 'yp-kart yp-toplu'}>
      <div className="yp-toplu-bas"><span className="yp-ikon" aria-hidden="true">{ikon}</span><span><b>{baslik}</b><small>{alt}</small></span></div>
      {kartlar.map((k) => {
        const s = secim.has(anahtar(k))
        const ac = okunan === anahtar(k)
        return (
          <div key={anahtar(k)} className="yp-alt">
            <button type="button" className="yp-tik" aria-pressed={s} aria-label={`${satirAd(k)} seçili`} onClick={() => setSecim((x) => { const y = new Set(x); if (s) y.delete(anahtar(k)); else y.add(anahtar(k)); return y })}>{s ? '✓' : ''}</button>
            <button type="button" className="yp-alt-yazi" onClick={() => setOkunan(ac ? null : anahtar(k))}>
              {satirAd(k)}
              <small className={ac ? 'yp-tam' : ''}>{k.mesaj}</small>
            </button>
          </div>
        )
      })}
      <button type="button" className="yp-birincil" disabled={secilen.length === 0} onClick={() => onOnay(secilen)}>{dugme(secilen.length)}</button>
    </section>
  )
}
