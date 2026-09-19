import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

/* Yol'un sonunda okunan kitaplar: kaç sayfa, kaç günde, kaç yıldız.
   Excel'deki "okunan kitap / okunan sayfa" sayaçlarının karşılığı.
   Henüz bitmiş kitap yoksa hiç yer kaplamaz. */
export default function Okuduklarim({ ogrenciId }) {
  const [veri, setVeri] = useState(null)
  useEffect(() => {
    const yukle = () =>
      supabase.rpc('ogrenci_okuma_ozeti', { p_ogrenci: ogrenciId }).then(({ data }) => setVeri(data ?? null))
    yukle()
    window.addEventListener('okuma-degisti', yukle)
    return () => window.removeEventListener('okuma-degisti', yukle)
  }, [ogrenciId])

  const liste = veri?.okunanlar ?? []
  if (liste.length === 0) return null

  return (
    <section className="veri-yuzey okuduklarim" aria-label="Okuduklarım">
      <p className="hi-etiket">
        Okuduklarım · {veri.toplam_kitap} kitap · {veri.toplam_sayfa} sayfa
      </p>
      <ul className="okuduklarim-liste">
        {liste.map((k) => (
          <li key={k.kitap_id}>
            <span className="okuduklarim-em" aria-hidden="true">{k.emoji}</span>
            <span>
              <span className="okuduklarim-ad">{k.ad}</span>
              <small>
                {k.sayfa ? `${k.sayfa} sayfa · ` : ''}
                {k.gun} günde
                {k.puan ? (
                  <span className="okuduklarim-puan" aria-label={`${k.puan} yıldız`}>
                    {' · '}
                    {'★'.repeat(k.puan)}
                    <span className="okuduklarim-bos">{'★'.repeat(5 - k.puan)}</span>
                  </span>
                ) : null}
              </small>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
