import { useCallback, useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Bos, Kart, Uyari, Yukleniyor } from '../bilesenler/Ortak.jsx'

/* Bir öğrencinin takıldığı konu ile sınıfın yarısının takıldığı konu
   farklı şeylerdir: ilki bireysel plan, ikincisi ortak etüt demek.
   Bu ekran ikincisini görünür kılar. */

export default function KonuIsiHaritasi() {
  const [veri, setVeri] = useState(null)
  const [dersId, setDersId] = useState('')
  const [acik, setAcik] = useState(null)
  const [hata, setHata] = useState('')

  const yukle = useCallback(async () => {
    const { data, error } = await supabase.rpc('konu_isi_haritasi', {
      p_limit: 25,
      p_ders_id: dersId ? Number(dersId) : null,
    })
    if (error) {
      setHata(hataMetni(error))
      return
    }
    setVeri(data)
  }, [dersId])

  useEffect(() => {
    yukle()
  }, [yukle])

  if (hata) {
    return (
      <Kart baslik="Açılmadı">
        <Uyari>{hata}</Uyari>
      </Kart>
    )
  }

  if (!veri) return <Yukleniyor />

  const konular = veri.konular ?? []
  const dersler = veri.dersler ?? []
  const enYuksek = Math.max(1, ...konular.map((k) => k.zayif))

  return (
    <Kart
      baslik="Zorlanılan konular"
      altBaslik="Kaç öğrencinin tekrara ihtiyacı var"
      eylem={
        dersler.length > 1 ? (
          <select
            value={dersId}
            onChange={(e) => setDersId(e.target.value)}
            aria-label="Derse göre süz"
            className="isi-suzgec"
          >
            <option value="">Tüm dersler</option>
            {dersler.map((d) => (
              <option key={d.id} value={d.id}>{d.ad}</option>
            ))}
          </select>
        ) : null
      }
    >
      {konular.length === 0 ? (
        <Bos
          baslik="Henüz veri yok"
          aciklama="Öğrenciler konu haritalarını işaretledikçe burası dolacak."
        />
      ) : (
        <ul className="liste">
          {konular.map((k) => (
            <li key={k.konuId} className="isi-satir">
              <button
                className="isi-dugme"
                onClick={() => setAcik(acik === k.konuId ? null : k.konuId)}
                aria-expanded={acik === k.konuId}
              >
                <span className="isi-ad">
                  <span className="liste-ad">{k.konu}</span>
                  <span className="liste-alt">{[k.ders, k.unite].filter(Boolean).join(' · ')}</span>
                </span>
                <span className="isi-cubuk" aria-hidden="true">
                  <span style={{ width: `${(k.zayif / enYuksek) * 100}%` }} />
                </span>
                <span className="isi-sayi">{k.zayif}</span>
              </button>

              {acik === k.konuId && (
                <div className="isi-detay">
                  <p className="isi-kim">
                    {(k.zayifOgrenciler ?? []).join(', ') || 'İsim bulunamadı'}
                  </p>
                  <p className="kart-alt">
                    {k.tamamlandi} tamamladı · {k.calisiliyor} çalışıyor · {k.ogrenci} öğrencide kayıt var
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Kart>
  )
}
