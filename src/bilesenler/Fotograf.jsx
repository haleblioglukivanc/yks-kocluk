import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const KOVA = 'ogrenci-foto'

/** Gizli kovadaki fotoğraf için imzalı bağlantı üretir. */
function useFotograf(yol) {
  const [adres, setAdres] = useState(null)

  useEffect(() => {
    let iptal = false
    if (!yol) {
      setAdres(null)
      return
    }
    supabase.storage
      .from(KOVA)
      .createSignedUrl(yol, 3600)
      .then(({ data }) => {
        if (!iptal) setAdres(data?.signedUrl ?? null)
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
   önce tarayıcıda ortadan kare kırpılıp 512px JPEG'e indirilir (~50–90 KB):
   yükleme takılmaz, liste ve karar kartında avatar anında açılır. */
const KARE = 512

function resmiAc(dosya) {
  return new Promise((coz, reddet) => {
    const adres = URL.createObjectURL(dosya)
    const resim = new Image()
    resim.onload = () => { URL.revokeObjectURL(adres); coz(resim) }
    resim.onerror = () => { URL.revokeObjectURL(adres); reddet(new Error('Bu fotoğraf açılamadı. JPG ya da PNG deneyin.')) }
    resim.src = adres
  })
}

async function kareKucult(dosya) {
  const resim = await resmiAc(dosya)
  const g = resim.naturalWidth, y = resim.naturalHeight
  const kenar = Math.min(g, y)
  const hedef = Math.min(KARE, kenar)
  const tuval = document.createElement('canvas')
  tuval.width = hedef
  tuval.height = hedef
  const c = tuval.getContext('2d')
  c.imageSmoothingQuality = 'high'
  c.drawImage(resim, (g - kenar) / 2, (y - kenar) / 2, kenar, kenar, 0, 0, hedef, hedef)
  const blob = await new Promise((coz) => tuval.toBlob(coz, 'image/jpeg', 0.85))
  if (!blob) throw new Error('Fotoğraf hazırlanamadı.')
  return blob
}

export function FotografYukle({ ogrenciId, mevcutYol, ad, onDegisti }) {
  const girdi = useRef(null)
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState('')

  async function sec(dosya) {
    if (!dosya) return
    setHata('')

    if (dosya.type && !dosya.type.startsWith('image/')) {
      setHata('Lütfen bir fotoğraf seçin.')
      return
    }

    setBekliyor(true)
    try {
      const kucuk = await kareKucult(dosya)
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

      await onDegisti?.(yol)
    } catch (e) {
      setHata(e.message ?? 'Fotoğraf yüklenemedi.')
    } finally {
      setBekliyor(false)
      if (girdi.current) girdi.current.value = ''
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
    </div>
  )
}
