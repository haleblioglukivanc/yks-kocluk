import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { Kart } from './Ortak.jsx'
import { Avatar } from './Fotograf.jsx'

/**
 * "Bugün girenler": karar kuyruğu boşken ekran boş kalmasın diye.
 * Bugün uygulamaya girip bir şey yapan öğrenciler, en yeniden eskiye.
 * Sayı ya da çubuk yok; kim ve ne zaman.
 */
export default function BugunCalisanlar({ onOgrenciAc }) {
  const [liste, setListe] = useState(null)

  useEffect(() => {
    let iptal = false
    const gunBasi = new Date()
    gunBasi.setHours(0, 0, 0, 0)
    ;(async () => {
      const { data: riskler } = await supabase
        .from('ogrenci_risk')
        .select('ogrenci_id, ad_soyad, son_aktiflik, tamamlama_yuzdesi')
        .gte('son_aktiflik', gunBasi.toISOString())
        .order('son_aktiflik', { ascending: false })
        .limit(8)
      const idler = (riskler ?? []).map((r) => r.ogrenci_id)
      let fotolar = {}
      if (idler.length) {
        const { data: p } = await supabase.from('profiller').select('id, fotograf_yolu').in('id', idler)
        fotolar = Object.fromEntries((p ?? []).map((x) => [x.id, x.fotograf_yolu]))
      }
      if (!iptal) setListe((riskler ?? []).map((r) => ({ ...r, fotograf_yolu: fotolar[r.ogrenci_id] })))
    })()
    return () => { iptal = true }
  }, [])

  if (!liste || liste.length === 0) return null

  return (
    <Kart duz baslik="Bugün girenler" eylem={<span className="kart-alt">{liste.length} öğrenci</span>}>
      <ul className="sirada-liste">
        {liste.map((o) => (
          <li key={o.ogrenci_id}>
            <button className="sirada-satir sirada-satir--dokun" onClick={() => onOgrenciAc?.(o.ogrenci_id)}>
              <Avatar yol={o.fotograf_yolu} ad={o.ad_soyad} boyut="kucuk" />
              <span className="sirada-ad">{o.ad_soyad}</span>
              <span className="sirada-zaman">{saatYaz(o.son_aktiflik)}</span>
            </button>
          </li>
        ))}
      </ul>
    </Kart>
  )
}

function saatYaz(iso) {
  return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}
