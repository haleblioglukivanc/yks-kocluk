import { useCallback, useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Kart, Uyari } from './Ortak.jsx'

/* Deneme analizi taslakları. Kural katmanı (deneme_analizi_hazirla) her denemeden
   sonra dağılımı ve önerileri hesaplar; Edge Function varsa bulgu metnini model
   yazar. Buradaki her şey koça dönüktür: öğrenci bilgi/dikkat/süre etiketini
   görmez, yalnız onaylanan görevleri ve Kâmil'in şablon cümlesini görür.
   Onaylanmadan öğrenciye hiçbir şey gitmez. */

const SEBEP = {
  bilgi: 'bilgi eksiği',
  dikkat: 'dikkat',
  sure: 'süre',
}

function neZaman(tarih) {
  if (!tarih) return ''
  const gun = Math.floor((Date.now() - new Date(tarih).getTime()) / 86400000)
  if (gun <= 0) return 'bugün'
  if (gun === 1) return 'dün'
  return `${gun} gün önce`
}

function Taslak({ t, onBitti, onOgrenciAc }) {
  const [secili, setSecili] = useState(() => t.oneriler.map((o, i) => (o.secili ? i : -1)).filter((i) => i >= 0))
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState('')

  function degistir(i) {
    setSecili((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]))
  }

  async function karar(k) {
    setBekliyor(true)
    setHata('')
    const { data, error } = await supabase.rpc('deneme_analizi_karar', {
      p_id: t.id,
      p_karar: k,
      p_secili: k === 'onayla' ? secili : [],
    })
    setBekliyor(false)
    if (error) {
      setHata(hataMetni(error))
      return
    }
    onBitti(t.id, k === 'onayla' ? data : null)
  }

  const d = t.dagilim ?? {}

  return (
    <li className="analiz-kart">
      <button className="analiz-ust" onClick={() => onOgrenciAc?.(t.ogrenci_id)} title="Öğrenciyi aç">
        <span className="liste-ad">{t.ogrenci}</span>
        <span className="liste-alt">
          {t.deneme} · {neZaman(t.tarih)}
        </span>
      </button>

      <p className="analiz-bulgu">{t.bulgu}</p>

      <div className="analiz-dagilim" aria-label="Hata dağılımı">
        {['bilgi', 'dikkat', 'sure'].map((k) => (
          <span key={k} className={`analiz-dilim analiz-dilim--${k}`}>
            <strong>{d[k] ?? 0}</strong>
            {SEBEP[k]}
          </span>
        ))}
      </div>

      {t.oneriler.length > 0 && (
        <>
          <p className="analiz-oneri-baslik">Önerilen görevler — seç ve ata</p>
          <ul className="analiz-oneriler">
            {t.oneriler.map((o, i) => (
              <li key={i}>
                <label className="analiz-oneri">
                  <input type="checkbox" checked={secili.includes(i)} onChange={() => degistir(i)} />
                  <span className="analiz-oneri-metin">
                    {o.baslik}
                    <small>
                      {o.ders} · {o.adet} yanlış · {SEBEP[o.sebep]}
                      {o.kaynak_ad ? ` · ${o.kaynak_ad}` : ''}
                    </small>
                  </span>
                  <span className="analiz-dk">{o.dk} dk</span>
                </label>
              </li>
            ))}
          </ul>
        </>
      )}

      <Uyari>{hata}</Uyari>
      <div className="analiz-eylemler">
        <button className="dugme dugme--ikincil" onClick={() => karar('sil')} disabled={bekliyor}>
          Sil
        </button>
        <button
          className="dugme dugme--birincil"
          onClick={() => karar('onayla')}
          disabled={bekliyor || secili.length === 0}
        >
          {bekliyor ? '…' : `Onayla · ${secili.length} görev ata`}
        </button>
      </div>
    </li>
  )
}

export default function AnalizKuyrugu({ onOgrenciAc }) {
  const [taslaklar, setTaslaklar] = useState(null)
  const [hata, setHata] = useState('')
  const [sonuc, setSonuc] = useState('')

  const yukle = useCallback(async () => {
    const { data, error } = await supabase.rpc('analiz_taslaklari', { p_limit: 20 })
    if (error) {
      setHata(hataMetni(error))
      setTaslaklar([])
      return
    }
    setTaslaklar(data ?? [])
  }, [])

  useEffect(() => {
    yukle()
  }, [yukle])

  function bitti(id, acilan) {
    setTaslaklar((l) => l.filter((x) => x.id !== id))
    setSonuc(acilan === null ? '' : acilan === 0 ? 'Görev açılmadı; seçilenler zaten açıktı.' : `${acilan} görev atandı, öğrenciye Kâmil söyleyecek.`)
  }

  /* Taslak yoksa kart hiç çizilmez: koçun Bugün ekranı sessiz kalır. */
  if (!taslaklar || (taslaklar.length === 0 && !sonuc && !hata)) return null

  return (
    <Kart
      baslik="Deneme analizi"
      altBaslik={taslaklar.length ? `${taslaklar.length} deneme yorumunu bekliyor` : 'Bekleyen analiz yok'}
    >
      <Uyari>{hata}</Uyari>
      {sonuc && <p className="analiz-sonuc">{sonuc}</p>}
      <ul className="analiz-liste">
        {taslaklar.map((t) => (
          <Taslak key={t.id} t={t} onBitti={bitti} onOgrenciAc={onOgrenciAc} />
        ))}
      </ul>
    </Kart>
  )
}
