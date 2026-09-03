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

/* sadeceSeri: öğrenci kendi Yol'unda yalnız seriyi görür. Rozet ızgarası
   koçun öğrenci detayında kalır; kazanım öğrenciye simge olarak değil,
   koçun karar kuyruğundan tebrik mesajı olarak gider. */
export default function Rozetlerim({ ogrenciId, sadeceSeri = false }) {
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
        supabase.rpc('seri_durumu', { p_ogrenci_id: ogrenciId }),
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

  /* Seri sayısını sunucu hesaplar (seri_durumu): haftada bir boş gün hakkı
     var, istemcinin bunu bilmesi gerekmiyor. */
  const sd = veri.seri ?? {}
  const seri = sd.etkin ?? 0
  const enUzun = sd.enUzun ?? 0
  const hakVar = sd.dondurmaHakki !== false
  const sonSans = Boolean(sd.bugunSonSans)

  return (
    <>
      <Kart baslik="Seri" altBaslik="Her gün bir şey yapıldığında sürüyor. Haftada bir boş gün serbest.">
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
          <p className="kart-alt">Seri durmuş. Bugün yapılan tek bir şey yenisini başlatır.</p>
        )}
        {seri > 0 && sonSans && (
          <p className="kart-alt">Dün boş geçti, bu haftanın hakkı kullanıldı. Seri bugün yapılan bir şeyle sürer.</p>
        )}
        {seri > 0 && !sonSans && (
          <p className="kart-alt">
            {hakVar ? 'Bu hafta bir boş gün hakkın var, seri bozulmaz.' : 'Bu haftanın boş gün hakkı kullanıldı. Bir sonraki Pazartesi yenilenir.'}
          </p>
        )}
      </Kart>

      {!sadeceSeri && (
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
      )}
    </>
  )
}
