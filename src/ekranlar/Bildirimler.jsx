import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { Yukleniyor, Bos } from '../bilesenler/Ortak.jsx'

/**
 * Bildirimler: kullanıcıdan bir şey bekleyen her olay tek listede.
 *
 * Koç için okunmamış mesajlar + karar kuyruğundaki kartlar (kaybolan
 * öğrenci, konu onayı, deneme analizi, veli özeti). Öğrenci ve veli için
 * şimdilik yalnız mesajlar; koç mesajı ve rozet gibi olaylar sonraki
 * adımda buraya eklenecek. Her satıra dokununca ilgili ekrana gidilir.
 */
const TIP = {
  risk: { etiket: 'Kaybolan öğrenci', durum: 'acil' },
  konu: { etiket: 'Konu onayı', durum: 'izle' },
  analiz: { etiket: 'Deneme analizi', durum: 'izle' },
  veli_ozet: { etiket: 'Veli özeti', durum: 'izle' },
  hedef: { etiket: 'Hedef ayarı', durum: 'notr' },
}

const ikon = {
  viewBox: '0 0 24 24',
  width: 18,
  height: 18,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}
const IKON = {
  mesaj: <path d="M4 5h16v11H9l-5 4z" />,
  risk: <><circle cx="12" cy="12" r="8" /><path d="M12 8v4M12 16h.01" /></>,
  konu: <path d="M5 12l4 4 10-10" />,
  analiz: <path d="M4 18l5-6 4 3 7-9" />,
  veli_ozet: <><rect x="5" y="4" width="14" height="16" rx="2" /><path d="M8 9h8M8 13h6" /></>,
  hedef: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /></>,
}

export default function Bildirimler({ profil, onGit }) {
  const [liste, setListe] = useState(null)
  const kocMu = profil.rol === 'koc' || profil.rol === 'yonetici'

  useEffect(() => {
    let iptal = false
    ;(async () => {
      const olaylar = []
      const { data: kutu } = await supabase.rpc('mesaj_kutum')
      for (const k of kutu ?? []) {
        if ((k.okunmamis ?? 0) > 0) {
          olaylar.push({
            id: `mesaj-${k.id}`,
            tip: 'mesaj',
            durum: 'eylem',
            baslik: `${k.ad} sana yazdı`,
            alt: k.sonMesaj || `${k.okunmamis} okunmamış mesaj`,
            zaman: k.sonZaman,
            yol: '/mesajlar',
          })
        }
      }
      if (kocMu) {
        const { data: kuyruk } = await supabase.rpc('koc_karar_kuyrugu', { p_limit: 20 })
        for (const kart of kuyruk ?? []) {
          const t = TIP[kart.tip] ?? { etiket: kart.tip, durum: 'notr' }
          olaylar.push({
            id: `karar-${kart.tip}-${kart.ogrenci_id}`,
            tip: kart.tip,
            durum: t.durum,
            baslik: `${kart.ad} · ${t.etiket}`,
            alt: kart.baglam || kart.oneri || '',
            zaman: null,
            yol: '/',
          })
        }
      }
      olaylar.sort((a, b) => (b.zaman ?? '') > (a.zaman ?? '') ? 1 : -1)
      if (!iptal) setListe(olaylar)
    })()
    return () => { iptal = true }
  }, [kocMu])

  return (
    <div className="panel">
      <div className="ekran-basi">
        <h1>Bildirimler</h1>
        {liste && liste.length > 0 && (
          <p className="ekran-basi-alt">Senden bir şey bekleyen {liste.length} olay var.</p>
        )}
      </div>
      {liste === null ? (
        <Yukleniyor />
      ) : liste.length === 0 ? (
        <Bos baslik="Bekleyen bir şey yok" aciklama="Yeni bir şey olursa Kâmil söyler." />
      ) : (
        <ul className="bildirim-liste">
          {liste.map((o) => (
            <li key={o.id}>
              <button type="button" className="bildirim" data-durum={o.durum} onClick={() => onGit(o.yol)}>
                <span className="bildirim-simge"><svg {...ikon}>{IKON[o.tip] ?? IKON.mesaj}</svg></span>
                <span className="bildirim-govde">
                  <strong>{o.baslik}</strong>
                  {o.alt && <span>{o.alt}</span>}
                </span>
                {o.zaman && <small>{zamanYaz(o.zaman)}</small>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function zamanYaz(iso) {
  const t = new Date(iso)
  const bugun = new Date()
  const ayniGun = t.toDateString() === bugun.toDateString()
  if (ayniGun) return t.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  const dun = new Date(bugun); dun.setDate(dun.getDate() - 1)
  if (t.toDateString() === dun.toDateString()) return 'Dün'
  return t.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
}
