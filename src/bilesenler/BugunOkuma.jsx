import { useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Kart, Uyari } from './Ortak.jsx'

/* Günü tamamla'nın 2. adımında, çözülen sorunun altında tek bir sayı:
   bugün kaç sayfa okudun. Kıvanç'ın Excel'indeki günlük sayfa takviminin
   karşılığı (19 Eylül 2026). Boş bırakılabilir; girilen ilk gün kitaba
   başlama günü sayılır. Kaydedince Bugün'deki kitap kutusu ilerler. */
export default function BugunOkuma({ ogrenciId, tarih, saltOkunur = false }) {
  const [kitap, setKitap] = useState(null)
  const [deger, setDeger] = useState('')
  const [kayitli, setKayitli] = useState(null)
  const [okunan, setOkunan] = useState(0)
  const [hata, setHata] = useState('')
  const [bekliyor, setBekliyor] = useState(false)

  useEffect(() => {
    let iptal = false
    Promise.all([
      supabase.rpc('haftalik_ilham', { p_ogrenci: ogrenciId }),
      supabase.rpc('ogrenci_okuma_ozeti', { p_ogrenci: ogrenciId }),
    ]).then(([ilham, ozet]) => {
      if (iptal) return
      const k = ilham.data?.[0]
      if (!k?.kitap_id) return
      setKitap({ id: k.kitap_id, ad: k.kitap_ad, sayfa: k.kitap_sayfa })
      const s = ozet.data?.simdiki
      if (s && s.kitap_id === k.kitap_id) {
        setOkunan(s.okunan ?? 0)
        if (s.bugun) {
          setDeger(String(s.bugun))
          setKayitli(s.bugun)
        }
      }
    })
    return () => {
      iptal = true
    }
  }, [ogrenciId])

  if (!kitap) return null

  async function kaydet() {
    const sayi = Math.max(0, Math.min(500, Math.round(Number(deger) || 0)))
    if (sayi === (kayitli ?? 0)) return
    setBekliyor(true)
    const { data, error } = await supabase.rpc('ogrenci_sayfa_kaydet', {
      p_kitap_id: kitap.id,
      p_tarih: tarih,
      p_sayfa: sayi,
    })
    setBekliyor(false)
    if (error) {
      setHata(hataMetni(error))
      return
    }
    setHata('')
    setKayitli(sayi)
    setDeger(sayi ? String(sayi) : '')
    setOkunan(data?.okunan ?? okunan)
    window.dispatchEvent(new CustomEvent('okuma-degisti'))
  }

  return (
    <Kart baslik="Bugün kaç sayfa okudun?">
      <Uyari>{hata}</Uyari>
      <div className="okuma-giris">
        {saltOkunur ? (
          <strong className="okuma-sayi">{kayitli ?? 0}</strong>
        ) : (
          <input
            className="okuma-sayi"
            type="number"
            inputMode="numeric"
            min={0}
            max={500}
            step={1}
            placeholder="0"
            value={deger}
            onChange={(e) => setDeger(e.target.value)}
            onBlur={kaydet}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            aria-label={`${kitap.ad} için bugün okunan sayfa`}
          />
        )}
        <span className="okuma-kitap">
          <i>{kitap.ad}</i>
          <small>
            {kitap.sayfa ? `${okunan}/${kitap.sayfa} sayfa` : `${okunan} sayfa`}
            {bekliyor ? ' · kaydediliyor…' : kayitli ? ' · kaydedildi' : saltOkunur ? '' : ' · boş bırakabilirsin'}
          </small>
        </span>
      </div>
    </Kart>
  )
}
