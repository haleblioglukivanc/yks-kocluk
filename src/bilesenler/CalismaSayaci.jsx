import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { Kart, Uyari } from './Ortak.jsx'

const DEPO = 'kalem_sayac'
const SURELER = [25, 45, 50]

/* Sayaç setInterval'ın kaç kez çalıştığını saymaz, zaman damgasından hesaplar.
   Telefon ekranı kapanınca tarayıcı interval'ı yavaşlatır; damga bundan etkilenmez. */
function kalanMs(d) {
  if (!d) return 0
  const akan = d.calisiyor ? Date.now() - d.baslangic : 0
  return Math.max(0, d.hedefDk * 60000 - (d.biriken + akan))
}

const oku = () => {
  try {
    return JSON.parse(localStorage.getItem(DEPO)) || null
  } catch {
    return null
  }
}

const yaz = (d) => {
  try {
    if (d) localStorage.setItem(DEPO, JSON.stringify(d))
    else localStorage.removeItem(DEPO)
  } catch {
    /* özel modda depolama kapalı olabilir, sayaç yine çalışır */
  }
}

const bicim = (ms) => {
  const t = Math.ceil(ms / 1000)
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

export default function CalismaSayaci({ ogrenciId, onKaydedildi }) {
  const [durum, setDurum] = useState(oku)
  const [, tetikle] = useState(0)
  const [uyari, setUyari] = useState('')

  useEffect(() => {
    if (!durum?.calisiyor) return
    const t = setInterval(() => tetikle((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [durum?.calisiyor])

  useEffect(() => {
    if (!durum?.calisiyor || !('wakeLock' in navigator)) return
    let iptal = false
    let kilit = null
    navigator.wakeLock
      .request('screen')
      .then((k) => {
        if (iptal) k.release()
        else kilit = k
      })
      .catch(() => {})
    return () => {
      iptal = true
      kilit?.release?.()
    }
  }, [durum?.calisiyor])

  const bitir = useCallback(
    async (d) => {
      const gecenMs = d.biriken + (d.calisiyor ? Date.now() - d.baslangic : 0)
      const dk = Math.round(gecenMs / 60000)
      setDurum(null)
      yaz(null)

      if (dk < 1) {
        setUyari('Bir dakikadan kısa sürdü, bunu saymadım. Bir dahakine biraz daha kal.')
        return
      }
      const { error } = await supabase.from('calisma_oturumlari').insert({
        ogrenci_id: ogrenciId,
        sure_dk: dk,
        baslangic: new Date(Date.now() - gecenMs).toISOString(),
      })
      if (error) {
        setUyari('Süre kaydedilemedi. Bağlantıyı kontrol edip bir daha dene, emeğin boşa gitmesin.')
        return
      }
      setUyari('')
      onKaydedildi?.(dk)
    },
    [ogrenciId, onKaydedildi],
  )

  useEffect(() => {
    if (durum?.calisiyor && kalanMs(durum) === 0) bitir(durum)
  }, [durum, bitir])

  if (!durum) {
    return (
      <Kart baslik='Çalışma sayacı' altBaslik='Süreyi seç, başla. Ekranı kapatsan da sayar.'>
        <div className='sayac-dugmeler'>
          {SURELER.map((dk) => (
            <button
              key={dk}
              className='dugme dugme--ikincil'
              onClick={() => {
                setUyari('')
                const d = { hedefDk: dk, baslangic: Date.now(), biriken: 0, calisiyor: true }
                setDurum(d)
                yaz(d)
              }}
            >
              {dk} dk
            </button>
          ))}
        </div>
        <Uyari tur='bilgi'>{uyari}</Uyari>
      </Kart>
    )
  }

  const kalan = kalanMs(durum)
  const oran = 1 - kalan / (durum.hedefDk * 60000)
  const C = 2 * Math.PI * 52

  return (
    <Kart baslik='Çalışma sayacı'>
      <div className='sayac-halka'>
        <svg viewBox='0 0 120 120' width='150' height='150' role='img'
             aria-label={`Kalan süre ${bicim(kalan)}`}>
          <circle cx='60' cy='60' r='52' fill='none' stroke='#e6eef8' strokeWidth='8' />
          <circle cx='60' cy='60' r='52' fill='none' stroke='#e2571f' strokeWidth='8'
                  strokeLinecap='round' strokeDasharray={C}
                  strokeDashoffset={C * (1 - oran)} transform='rotate(-90 60 60)' />
          <text x='60' y='67' textAnchor='middle' fontSize='23' fill='currentColor'>
            {bicim(kalan)}
          </text>
        </svg>
      </div>

      <div className='sayac-dugmeler'>
        {durum.calisiyor ? (
          <button className='dugme dugme--ikincil'
                  onClick={() => {
                    const d = { ...durum, biriken: durum.biriken + (Date.now() - durum.baslangic), calisiyor: false }
                    setDurum(d)
                    yaz(d)
                  }}>
            Duraklat
          </button>
        ) : (
          <button className='dugme dugme--ikincil'
                  onClick={() => {
                    const d = { ...durum, baslangic: Date.now(), calisiyor: true }
                    setDurum(d)
                    yaz(d)
                  }}>
            Devam et
          </button>
        )}
        <button className='dugme dugme--birincil' onClick={() => bitir(durum)}>
          Bitir ve kaydet
        </button>
      </div>
      {!durum.calisiyor && <p className='kart-alt'>Duraklattın. Süre işlemiyor.</p>}
    </Kart>
  )
}
