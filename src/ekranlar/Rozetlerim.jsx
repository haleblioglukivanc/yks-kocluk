import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { Kart, Yukleniyor } from '../bilesenler/Ortak.jsx'

/* Kazanılmamış rozetler de görünür: neyin peşinde olduğunu bilmek,
   sadece kazandıklarını görmekten daha çok motive ediyor. */

const IKON = {
  flag: '🚩', flame: '🔥', 'clipboard-check': '📋', 'trending-up': '📈',
  clock: '⏱', book: '📚', sunrise: '🌅', 'calendar-check': '🗓',
}

export default function Rozetlerim({ ozet }) {
  const [tumu, setTumu] = useState(null)

  useEffect(() => {
    supabase
      .from('rozetler')
      .select('id, kod, ad, aciklama, ikon')
      .order('id')
      .then(({ data }) => setTumu(data ?? []))
  }, [])

  if (!tumu) return <Yukleniyor />

  const kazanilan = new Map((ozet?.rozetler ?? []).map((r) => [r.ad, r.tarih]))
  const seri = ozet?.guncelSeri ?? 0
  const enUzun = ozet?.enUzunSeri ?? 0

  return (
    <>
      <Kart baslik="Serin" altBaslik="Her gün bir şey yaptığında sürüyor">
        <div className="seri-kutu">
          <div>
            <span className="seri-sayi">{seri}</span>
            <span className="kart-alt">günlük seri</span>
          </div>
          <div>
            <span className="seri-sayi seri-sayi--sonuk">{enUzun}</span>
            <span className="kart-alt">en uzun</span>
          </div>
        </div>
        {seri === 0 && (
          <p className="kart-alt">
            Bugün tek bir görev ya da kısa bir çalışma seriyi başlatmaya yeter.
          </p>
        )}
      </Kart>

      <Kart
        baslik="Rozetler"
        altBaslik={`${kazanilan.size}/${tumu.length} kazanıldı`}
      >
        <ul className="rozet-izgara">
          {tumu.map((r) => {
            const tarih = kazanilan.get(r.ad)
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
