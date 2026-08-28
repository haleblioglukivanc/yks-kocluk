import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const KOVA = 'ogrenci-foto'

/** Gizli kovadaki fotoğraf için imzalı bağlantı üretir. */
export function useFotograf(yol) {
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

export function FotografYukle({ ogrenciId, mevcutYol, ad, onDegisti }) {
  const girdi = useRef(null)
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState('')

  async function sec(dosya) {
    if (!dosya) return
    setHata('')

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(dosya.type)) {
      setHata('Yalnızca JPG, PNG veya WEBP yükleyebilirsiniz.')
      return
    }
    if (dosya.size > 3 * 1024 * 1024) {
      setHata('Dosya 3 MB’den küçük olmalı.')
      return
    }

    setBekliyor(true)
    try {
      const uzanti = dosya.type === 'image/png' ? 'png' : dosya.type === 'image/webp' ? 'webp' : 'jpg'
      const yol = `${ogrenciId}/portre-${Date.now()}.${uzanti}`

      const { error: yHata } = await supabase.storage
        .from(KOVA)
        .upload(yol, dosya, { cacheControl: '3600', upsert: false })
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
          accept="image/jpeg,image/png,image/webp"
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
