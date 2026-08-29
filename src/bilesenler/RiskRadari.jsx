import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { Bos, Kart, Rozet, Yukleniyor } from './Ortak.jsx'

/** Bir öğrencinin neden listede olduğunu tek cümleyle söyler.
 *  Üç sebebi birden yazmak listeyi okunmaz yapıyordu. */
function neden(o) {
  if (o.hic_baslamadi || o.gun_gecti == null) return 'Henüz hiç başlamadı'
  if (o.gun_gecti >= 3) return `${o.gun_gecti} gündür sessiz`
  if ((o.gecikmis_gorev ?? 0) >= 3) return `${o.gecikmis_gorev} görev bekliyor`
  if (Number(o.net_farki ?? 0) <= -4) return 'Son denemede net düştü'
  return `Tamamlama %${o.tamamlama_yuzdesi ?? 0}`
}

const bas = (ad = '') =>
  ad.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('')

export default function RiskRadari({ onOgrenciAc }) {
  const [satirlar, setSatirlar] = useState(null)

  const yukle = useCallback(async () => {
    const { data } = await supabase
      .from('ogrenci_risk')
      .select('ogrenci_id, ad_soyad, risk_skoru, risk_seviyesi, gun_gecti, hic_baslamadi, tamamlama_yuzdesi, gecikmis_gorev, net_farki')
      .order('risk_skoru', { ascending: false })
      .limit(8)
    setSatirlar(data ?? [])
  }, [])

  useEffect(() => {
    yukle()
  }, [yukle])

  const dikkat = (satirlar ?? []).filter((o) => o.risk_seviyesi !== 'iyi')

  return (
    <Kart baslik='Bugün kime bakmalı' altBaslik='Sessizlik, geciken görev ve net düşüşüne göre'>
      {satirlar === null ? (
        <Yukleniyor />
      ) : dikkat.length === 0 ? (
        <Bos
          baslik='Kimse risk listesinde değil'
          aciklama='İyi giden bir öğrenciye kısa bir not yazmak için iyi bir gün.'
        />
      ) : (
        <ul className='liste'>
          {dikkat.map((o) => (
            <li key={o.ogrenci_id}>
              <button className='ogrenci-satir' onClick={() => onOgrenciAc(o.ogrenci_id)}>
                <span className={`risk-bas risk-bas--${o.risk_seviyesi}`}>{bas(o.ad_soyad)}</span>
                <div>
                  <span className='liste-ad'>{o.ad_soyad}</span>
                  <span className='liste-alt'>{neden(o)}</span>
                </div>
                <Rozet ton={o.risk_seviyesi === 'acil' ? 'uyari' : 'notr'}>
                  {o.risk_seviyesi === 'acil' ? 'acil' : 'izle'}
                </Rozet>
                <span className='ok' aria-hidden='true'>›</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Kart>
  )
}
