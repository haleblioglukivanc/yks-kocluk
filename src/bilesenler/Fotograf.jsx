import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const KOVA = 'ogrenci-foto'

/* İmzalı bağlantılar bir saat geçerli. Her açılışta yenisi üretilince
   adres değişiyor, telefon önbelleği kullanamıyor ve fotoğraf her seferinde
   yeniden, parça parça iniyordu (22 Eylül 2026, Bekir). Artık aynı yol için
   üretilen bağlantı 50 dakika hatırlanıyor; aynı istek iki kez gitmiyor. */
const BAGLANTI = new Map() // yol -> { adres, bitis } | Promise
const INMIS = new Set() // tamamen inmiş adresler

function baglantiAl(yol) {
  const kayit = BAGLANTI.get(yol)
  if (kayit instanceof Promise) return kayit
  if (kayit && kayit.bitis > Date.now()) return Promise.resolve(kayit.adres)
  const is = supabase.storage
    .from(KOVA)
    .createSignedUrl(yol, 3600)
    .then(({ data }) => {
      const adres = data?.signedUrl ?? null
      if (adres) BAGLANTI.set(yol, { adres, bitis: Date.now() + 50 * 60 * 1000 })
      else BAGLANTI.delete(yol)
      return adres
    })
    .catch(() => { BAGLANTI.delete(yol); return null })
  BAGLANTI.set(yol, is)
  return is
}

/** Fotoğrafın adresi; yalnız fotoğraf tamamen indikten sonra döner.
 *  O ana kadar ekranda baş harfler durur, yarım resim görünmez. */
export function useFotograf(yol) {
  const [adres, setAdres] = useState(() => {
    const k = yol && BAGLANTI.get(yol)
    return k && !(k instanceof Promise) && INMIS.has(k.adres) ? k.adres : null
  })

  useEffect(() => {
    let iptal = false
    if (!yol) {
      setAdres(null)
      return
    }
    baglantiAl(yol).then((a) => {
      if (iptal || !a) return
      if (INMIS.has(a)) { setAdres(a); return }
      const r = new Image()
      r.onload = () => { INMIS.add(a); if (!iptal) setAdres(a) }
      r.src = a
    })
    return () => {
      iptal = true
    }
  }, [yol])

  return adres
}

export function Avatar({ yol, ad, boyut = 'orta' }) {
  const adres = useFotograf(yol)
  const basHarf = (ad ?? '?')
    .split(' ')
    .filter(Boolean)
    .map((k) => k[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <span className={`avatar avatar--${boyut}`}>
      {adres ? <img src={adres} alt={ad ?? ''} /> : <span>{basHarf}</span>}
    </span>
  )
}

/* Telefondan gelen fotoğraf çoğu zaman 3–10 MB ve yatay/dikey. Yüklemeden
   önce tarayıcıda ortadan kare kırpılıp 320px JPEG'e indirilir (~20–30 KB,
   WhatsApp profil fotoğrafı gibi; ekranda en çok ~100px görünüyor):
   yükleme takılmaz, liste ve karar kartında avatar anında açılır. */
const KARE = 320

function resmiAc(dosya) {
  return new Promise((coz, reddet) => {
    const adres = URL.createObjectURL(dosya)
    const resim = new Image()
    resim.onload = () => { URL.revokeObjectURL(adres); coz(resim) }
    resim.onerror = () => { URL.revokeObjectURL(adres); reddet(new Error('Bu fotoğraf açılamadı. JPG ya da PNG deneyin.')) }
    resim.src = adres
  })
}


/** Seçilen bölgeyi (kaynak piksellerinde kare) KARE boyutunda JPEG'e çizer. */
async function bolgeyiKucult(resim, sx, sy, kenar) {
  const hedef = Math.min(KARE, Math.round(kenar))
  const tuval = document.createElement('canvas')
  tuval.width = hedef
  tuval.height = hedef
  const c = tuval.getContext('2d')
  c.imageSmoothingQuality = 'high'
  c.drawImage(resim, sx, sy, kenar, kenar, 0, 0, hedef, hedef)
  const blob = await new Promise((coz) => tuval.toBlob(coz, 'image/jpeg', 0.82))
  if (!blob) throw new Error('Fotoğraf hazırlanamadı.')
  return blob
}

/* WhatsApp'taki gibi kırpma (22 Eylül 2026, Bekir): fotoğraf yuvarlak
   pencerenin altında sürüklenir, iki parmakla ya da kaydırıcıyla büyütülür.
   Yalnız dairenin içi kaydedilir; kalabalık bir fotoğraftan tek yüz seçilebilir. */
function FotoKirpici({ resim, adres, onVazgec, onKullan }) {
  const PENCERE = Math.min(300, Math.round(window.innerWidth * 0.8))
  const g = resim.naturalWidth
  const y = resim.naturalHeight
  const taban = PENCERE / Math.min(g, y) // dairenin tamamını kaplayan en küçük ölçek
  const [zoom, setZoom] = useState(1)
  const [konum, setKonum] = useState(() => ({ x: (PENCERE - g * taban) / 2, y: (PENCERE - y * taban) / 2 }))
  const surukleme = useRef(null)
  const parmaklar = useRef(new Map())
  const [bekliyor, setBekliyor] = useState(false)

  const olcek = taban * zoom
  const sinirla = (k, z = zoom) => {
    const o = taban * z
    return {
      x: Math.min(0, Math.max(PENCERE - g * o, k.x)),
      y: Math.min(0, Math.max(PENCERE - y * o, k.y)),
    }
  }
  /* Büyütürken dairenin ortası sabit kalsın. */
  const zoomAyarla = (yeni) => {
    const z = Math.min(5, Math.max(1, yeni))
    const orta = PENCERE / 2
    setKonum((k) => sinirla({
      x: orta - ((orta - k.x) / (taban * zoom)) * taban * z,
      y: orta - ((orta - k.y) / (taban * zoom)) * taban * z,
    }, z))
    setZoom(z)
  }

  const bas = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    parmaklar.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (parmaklar.current.size === 1) surukleme.current = { x: e.clientX, y: e.clientY }
    else surukleme.current = null
  }
  const hareket = (e) => {
    if (!parmaklar.current.has(e.pointerId)) return
    const once = parmaklar.current.get(e.pointerId)
    if (parmaklar.current.size === 2) {
      const [a, b] = [...parmaklar.current.values()]
      const eskiMesafe = Math.hypot(a.x - b.x, a.y - b.y)
      parmaklar.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      const [c, d] = [...parmaklar.current.values()]
      const yeniMesafe = Math.hypot(c.x - d.x, c.y - d.y)
      if (eskiMesafe > 0) zoomAyarla(zoom * (yeniMesafe / eskiMesafe))
      return
    }
    parmaklar.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (!surukleme.current) return
    const dx = e.clientX - once.x
    const dy = e.clientY - once.y
    setKonum((k) => sinirla({ x: k.x + dx, y: k.y + dy }))
  }
  const birak = (e) => {
    parmaklar.current.delete(e.pointerId)
    surukleme.current = parmaklar.current.size === 1 ? [...parmaklar.current.values()][0] : null
  }

  async function kullan() {
    setBekliyor(true)
    try {
      const kenar = PENCERE / olcek
      const blob = await bolgeyiKucult(resim, -konum.x / olcek, -konum.y / olcek, kenar)
      await onKullan(blob)
    } finally {
      setBekliyor(false)
    }
  }

  return (
    <div className="kirp-arka" role="dialog" aria-modal="true" aria-label="Fotoğrafı kırp">
      <div className="kirp">
        <p className="kirp-baslik">Fotoğrafı ayarla</p>
        <p className="kirp-alt">Sürükleyerek yerleştir, iki parmakla ya da aşağıdan büyüt.</p>
        <div
          className="kirp-pencere"
          style={{ width: PENCERE, height: PENCERE }}
          onPointerDown={bas}
          onPointerMove={hareket}
          onPointerUp={birak}
          onPointerCancel={birak}
          onWheel={(e) => zoomAyarla(zoom * (e.deltaY < 0 ? 1.08 : 0.93))}
        >
          <img
            src={adres}
            alt=""
            draggable={false}
            style={{ width: g * olcek, height: y * olcek, transform: `translate(${konum.x}px, ${konum.y}px)` }}
          />
          <div className="kirp-maske" aria-hidden="true" />
        </div>
        <input
          className="kirp-zoom"
          type="range"
          min="1"
          max="5"
          step="0.01"
          value={zoom}
          onChange={(e) => zoomAyarla(Number(e.target.value))}
          aria-label="Büyüt"
        />
        <div className="kirp-eylem">
          <button type="button" className="kirp-vazgec" onClick={onVazgec} disabled={bekliyor}>Vazgeç</button>
          <button type="button" className="kirp-kullan" onClick={kullan} disabled={bekliyor}>{bekliyor ? 'Yükleniyor…' : 'Kullan'}</button>
        </div>
      </div>
    </div>
  )
}

export function FotografYukle({ ogrenciId, mevcutYol, ad, onDegisti }) {
  const girdi = useRef(null)
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState('')

  const [kirp, setKirp] = useState(null) // { resim, adres }

  async function sec(dosya) {
    if (!dosya) return
    setHata('')
    if (dosya.type && !dosya.type.startsWith('image/')) {
      setHata('Lütfen bir fotoğraf seçin.')
      return
    }
    try {
      const resim = await resmiAc(dosya)
      setKirp({ resim, adres: URL.createObjectURL(dosya) })
    } catch (e) {
      setHata(e.message ?? 'Fotoğraf açılamadı.')
    } finally {
      if (girdi.current) girdi.current.value = ''
    }
  }

  function kirpKapat() {
    if (kirp?.adres) URL.revokeObjectURL(kirp.adres)
    setKirp(null)
  }

  async function yukle(kucuk) {
    setBekliyor(true)
    setHata('')
    try {
      const yol = `${ogrenciId}/portre-${Date.now()}.jpg`
      const { error: yHata } = await supabase.storage
        .from(KOVA)
        .upload(yol, kucuk, { cacheControl: '3600', upsert: false, contentType: 'image/jpeg' })
      if (yHata) throw yHata

      const { error: pHata } = await supabase
        .from('profiller')
        .update({ fotograf_yolu: yol })
        .eq('id', ogrenciId)
      if (pHata) throw pHata

      // Eski dosyayı temizle; başarısız olsa da akışı durdurmaz.
      if (mevcutYol) await supabase.storage.from(KOVA).remove([mevcutYol])

      kirpKapat()
      await onDegisti?.(yol)
    } catch (e) {
      setHata(e.message ?? 'Fotoğraf yüklenemedi.')
      kirpKapat()
    } finally {
      setBekliyor(false)
    }
  }

  async function kaldir() {
    if (!mevcutYol) return
    setBekliyor(true)
    setHata('')
    try {
      await supabase.from('profiller').update({ fotograf_yolu: null }).eq('id', ogrenciId)
      await supabase.storage.from(KOVA).remove([mevcutYol])
      await onDegisti?.(null)
    } catch (e) {
      setHata(e.message ?? 'Kaldırılamadı.')
    } finally {
      setBekliyor(false)
    }
  }

  return (
    <div className="foto-yukle">
      <Avatar yol={mevcutYol} ad={ad} boyut="buyuk" />
      <div className="foto-eylem">
        <input
          ref={girdi}
          type="file"
          accept="image/*"
          onChange={(e) => sec(e.target.files?.[0])}
          hidden
        />
        <button className="metin-dugme" onClick={() => girdi.current?.click()} disabled={bekliyor}>
          {bekliyor ? 'Yükleniyor…' : mevcutYol ? 'Fotoğrafı değiştir' : 'Fotoğraf ekle'}
        </button>
        {mevcutYol && !bekliyor && (
          <button className="metin-dugme" onClick={kaldir}>
            Kaldır
          </button>
        )}
        {hata && <p className="foto-hata">{hata}</p>}
      </div>
      {kirp && <FotoKirpici resim={kirp.resim} adres={kirp.adres} onVazgec={kirpKapat} onKullan={yukle} />}
    </div>
  )
}
