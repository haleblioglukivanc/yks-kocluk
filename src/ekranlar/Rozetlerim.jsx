import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { Kart, Yukleniyor } from '../bilesenler/Ortak.jsx'

/* Hem öğrenci kendi panelinde hem koç öğrenci detayında kullanıyor.
   Veriyi kendisi çekiyor: öğrenci kendi satırlarını, koç öğrencisininkini
   görüyor, ayrımı RLS yapıyor. */

const IKON = {
  flag: '🚩', flame: '🔥', 'clipboard-check': '📋', 'trending-up': '📈',
  clock: '⏱', book: '📚', sunrise: '🌅', 'calendar-check': '🗓',
}

export default function Rozetlerim({ ogrenciId }) {
  const [veri, setVeri] = useState(null)

  useEffect(() => {
    if (!ogrenciId) return
    let iptal = false
    ;(async () => {
      const [tumu, kazanilan, seri] = await Promise.all([
        supabase.from('rozetler').select('id, kod, ad, aciklama, ikon').order('id'),
        supabase
          .from('ogrenci_rozet')
          .select('rozet_id, kazanildi')
          .eq('ogrenci_id', ogrenciId),
        supabase
          .from('seriler')
          .select('guncel_seri, en_uzun_seri, son_aktif_gun')
          .eq('ogrenci_id', ogrenciId)
          .maybeSingle(),
      ])
      if (!iptal) {
        setVeri({
          tumu: tumu.data ?? [],
          kazanilan: new Map((kazanilan.data ?? []).map((r) => [r.rozet_id, r.kazanildi])),
          seri: seri.data,
        })
      }
    })()
    return () => {
      iptal = true
    }
  }, [ogrenciId])

  if (!veri) return <Yukleniyor />

  /* Tablodaki seri yalnızca aktivite oldukça güncelleniyor.
     Son aktiflik dünden eskiyse seri kopmuştur; okurken düzeltiyoruz. */
  const bugun = new Date()
  bugun.setHours(0, 0, 0, 0)
  const sonAktif = veri.seri?.son_aktif_gun ? new Date(veri.seri.son_aktif_gun) : null
  const kopmus = !sonAktif || (bugun - sonAktif) / 864e5 > 1
  const seri = kopmus ? 0 : (veri.seri?.guncel_seri ?? 0)
  const enUzun = veri.seri?.en_uzun_seri ?? 0

  return (
    <>
      <Kart baslik="Seri" altBaslik="Her gün bir şey yapıldığında sürüyor">
        <div className="seri-kutu">
          <div>
            <span className={`seri-sayi${seri ? '' : ' seri-sayi--sonuk'}`}>{seri}</span>
            <span className="kart-alt">günlük seri</span>
          </div>
          <div>
            <span className="seri-sayi seri-sayi--sonuk">{enUzun}</span>
            <span className="kart-alt">en uzun</span>
          </div>
        </div>
        {seri === 0 && enUzun > 0 && (
          <p className="kart-alt">Seri kopmuş. Bugün yapılan tek bir şey yeniden başlatır.</p>
        )}
      </Kart>

      <Kart baslik="Rozetler" altBaslik={`${veri.kazanilan.size}/${veri.tumu.length} kazanıldı`}>
        <ul className="rozet-izgara">
          {veri.tumu.map((r) => {
            const tarih = veri.kazanilan.get(r.id)
            return (
              <li key={r.id} className={`rozet-kart${tarih ? '' : ' rozet-kart--kilitli'}`}>
                <span className="rozet-ikon" aria-hidden="true">{IKON[r.ikon] ?? '⭐'}</span>
                <span className="rozet-ad">{r.ad}</span>
                <span className="rozet-aciklama">{r.aciklama}</span>
                {tarih && (
                  <span className="rozet-tarih">
                    {new Date(tarih).toLocaleDateString('tr-TR')}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      </Kart>
    </>
  )
}
