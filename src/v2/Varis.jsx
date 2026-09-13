import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { dersleriGrupla, grupToplami } from '../lib/dersGruplari.js'

/**
 * Varış — günü kapattıktan sonra açılan ekran.
 *
 * Harita bir gezinme aracı değil: rotayı koç çiziyor, öğrencinin seçeceği
 * bir yön yok. O yüzden harita burada bir varış ödülü. Gün kapanınca
 * kendiliğinden açılır, bugün dokunulan yer canlanır, altta son yedi gün
 * durur. Sayı, rozet, seri yok; yalnızca sicil.
 *
 * Ders plakaları izometrik: üst yüz + kalınlık. Parlaklık o dersteki
 * ilerleme oranı — dokunulmamış ders sönük durur. Gerçek 3B yok, gerek de
 * yok; derinlik iki dörtgenle kuruluyor.
 */

/* Ders renkleri harita okunurluğunun tamamı: renk artık "ders" demek.
   Katalogdaki ders koduna göre eşleşir, bilinmeyen ders nötr kalır. */
const DERS_RENGI = {
  matematik: '#4c8dff',
  geometri: '#4c8dff',
  fizik: '#a46bff',
  kimya: '#2fb3a8',
  biyoloji: '#5bb552',
  turkce: '#d96ba0',
  edebiyat: '#d96ba0',
  tarih: '#8391b0',
  cografya: '#8391b0',
  felsefe: '#8391b0',
  din: '#8391b0',
  ingilizce: '#e0925a',
}
const NOTR = '#7a8296'

const rengi = (kod = '') => {
  const a = kod.toLocaleLowerCase('tr-TR')
  for (const [k, r] of Object.entries(DERS_RENGI)) if (a.includes(k)) return r
  return NOTR
}

const koyu = (hex, f) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgb(${Math.round((n >> 16) * f)},${Math.round(((n >> 8) & 255) * f)},${Math.round((n & 255) * f)})`
}

const GUN_KISA = ['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct']

export default function Varis({ ogrenciId, ozet, onKapat }) {
  const [gruplar, setGruplar] = useState(null)
  const [gunler, setGunler] = useState([])
  const [geldi, setGeldi] = useState(false)

  useEffect(() => {
    let iptal = false
    ;(async () => {
      const { data } = await supabase.rpc('konu_ozetim', { p_ogrenci_id: ogrenciId ?? null })
      if (iptal) return
      setGruplar(dersleriGrupla(data ?? []))

      /* Son yedi gün: kapanan günler. Seri değil, sicil — arka arkaya
         olması gerekmiyor, sayısı da yazılmıyor. */
      const bugun = new Date()
      const bas = new Date(bugun)
      bas.setDate(bas.getDate() - 6)
      const iso = (t) => t.toISOString().slice(0, 10)
      const { data: k } = await supabase
        .from('gun_kapanis')
        .select('tarih, tam')
        .eq('ogrenci_id', ogrenciId)
        .gte('tarih', iso(bas))
      if (iptal) return
      const kapanan = new Set((k ?? []).filter((x) => x.tam).map((x) => x.tarih))
      const liste = []
      for (let i = 6; i >= 0; i -= 1) {
        const t = new Date(bugun)
        t.setDate(t.getDate() - i)
        liste.push({ ad: GUN_KISA[t.getDay()], dolu: kapanan.has(iso(t)), bugun: i === 0 })
      }
      setGunler(liste)
    })()
    return () => { iptal = true }
  }, [ogrenciId])

  useEffect(() => {
    const z = setTimeout(() => setGeldi(true), 60)
    return () => clearTimeout(z)
  }, [])

  /* Bugün tamamlanan görevlerden bir konu adı: mesajın öznesi o. */
  const bugunkuKonu = (ozet?.gorevler ?? []).find((g) => g.durum === 'tamamlandi' && g.konu)?.konu
  const mesaj = bugunkuKonu
    ? `${bugunkuKonu} bugün canlandı.`
    : 'Bugün haritada iz kalmadı. Yarın tek blok yeter.'

  const W = 112
  const H = 50
  const D = 11
  const gorunen = (gruplar ?? []).slice(0, 6)
  const yukseklik = 60 + gorunen.length * 62

  return (
    <>
      <div className="v2-harita">
        <div className="v2-yildiz" aria-hidden="true" />
        <svg viewBox={`0 0 342 ${yukseklik}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Ders haritan">
          <defs>
            <filter id="v2-isik" x="-70%" y="-70%" width="240%" height="240%">
              <feGaussianBlur stdDeviation="8" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {gorunen.map((g, i) => {
            const t = grupToplami(g, ['toplam', 'tamamlandi', 'calisiliyor', 'tekrar'])
            const oran = t.toplam ? t.tamamlandi / t.toplam : 0
            const renk = rengi(g.kod)
            const x = i % 2 === 0 ? 100 : 240
            const y = 56 + i * 62
            const ustNokta = [[x, y - H / 2], [x + W / 2, y], [x, y + H / 2], [x - W / 2, y]]
            const yanNokta = [
              [x - W / 2, y], [x, y + H / 2], [x + W / 2, y],
              [x + W / 2, y + D], [x, y + H / 2 + D], [x - W / 2, y + D],
            ]
            const yol = (p) => `M${p.map((n) => n.join(' ')).join(' L')} Z`
            return (
              <g key={g.kod}>
                <path d={yol(yanNokta)} fill={koyu(renk, 0.32)} />
                <path
                  d={yol(ustNokta)}
                  fill={koyu(renk, 0.28 + oran * 0.72)}
                  stroke={`rgba(255,255,255,${0.1 + oran * 0.26})`}
                  strokeWidth="1.1"
                  strokeLinejoin="round"
                  filter={oran > 0.6 ? 'url(#v2-isik)' : undefined}
                />
                <text
                  x={x} y={y - H / 2 - 11} textAnchor="middle" fill="#e8ecf7"
                  fontFamily="'Bricolage Grotesque', sans-serif" fontWeight="700" fontSize="13"
                >
                  {g.ad}
                </text>
                <text
                  x={x} y={y - H / 2 - 1} textAnchor="middle" fill="#7e8aa8"
                  fontFamily="'JetBrains Mono', monospace" fontSize="9.5"
                >
                  {t.tamamlandi}/{t.toplam}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <div className="v2-varis-alt">
        <p className={`v2-varis-mesaj${geldi ? ' gel' : ''}`}>{mesaj}</p>

        <div className={`v2-gunler${geldi ? ' gel' : ''}`} aria-label="Son yedi gün">
          {gunler.map((g, i) => (
            <span
              key={i}
              className={`v2-gun${g.bugun ? ' v2-gun--bugun' : g.dolu ? ' v2-gun--dolu' : ''}`}
            >
              {g.ad}
            </span>
          ))}
          {gunler.length > 0 && <span className="v2-gunler-et">son yedi gün</span>}
        </div>

        <button className={`v2-varis-kapat${geldi ? ' gel' : ''}`} onClick={onKapat}>
          Kapat
        </button>
      </div>
    </>
  )
}
