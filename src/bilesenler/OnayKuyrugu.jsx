import { useCallback, useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Bos, Kart, Uyari, Yukleniyor } from './Ortak.jsx'

/* Öğrenci "bitti" dediğinde konu bitmiş sayılmıyor; koçun bakması gerekiyor.
   Bu kuyruk o bakışın yapılacak işler listesi: öğrenci detayına girmeden
   tek tek onaylanabiliyor. Onaylanan satır listeden düşüyor. */

function neZaman(iso) {
  if (!iso) return ''
  const gun = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (gun <= 0) return 'bugün'
  if (gun === 1) return 'dün'
  return `${gun} gün önce`
}

export default function OnayKuyrugu({ onOgrenciAc }) {
  const [satirlar, setSatirlar] = useState(null)
  const [hata, setHata] = useState('')
  const [islenen, setIslenen] = useState(null)

  const yukle = useCallback(async () => {
    const { data, error } = await supabase.rpc('onay_bekleyen_konular', { p_limit: 30 })
    if (error) {
      setHata(hataMetni(error))
      setSatirlar([])
      return
    }
    setSatirlar(data ?? [])
  }, [])

  useEffect(() => {
    yukle()
  }, [yukle])

  async function onayla(satir) {
    const anahtar = `${satir.ogrenciId}-${satir.konuId}`
    setIslenen(anahtar)
    setHata('')
    const { error } = await supabase
      .from('konu_ilerleme')
      .update({ koc_onayi: true })
      .eq('ogrenci_id', satir.ogrenciId)
      .eq('konu_id', satir.konuId)
    setIslenen(null)
    if (error) {
      setHata(hataMetni(error))
      return
    }
    setSatirlar((l) => l.filter((x) => `${x.ogrenciId}-${x.konuId}` !== anahtar))
  }

  if (satirlar === null) {
    return (
      <Kart baslik="Kontrol bekleyenler">
        <Yukleniyor />
      </Kart>
    )
  }

  return (
    <Kart
      baslik="Kontrol bekleyenler"
      altBaslik={
        satirlar.length
          ? `${satirlar.length} konu "bitti" işaretlendi, onayını bekliyor`
          : 'Öğrencilerin bitirdiği konuları burada onaylıyorsun'
      }
    >
      <Uyari>{hata}</Uyari>
      {satirlar.length === 0 ? (
        <Bos baslik="Kuyruk temiz" aciklama="Bekleyen kontrol yok." />
      ) : (
        <ul className="liste">
          {satirlar.map((s) => {
            const anahtar = `${s.ogrenciId}-${s.konuId}`
            return (
              <li key={anahtar} className="onay-satir">
                <button
                  className="onay-metin"
                  onClick={() => onOgrenciAc?.(s.ogrenciId)}
                  title="Öğrenciyi aç"
                >
                  <span className="liste-ad">{s.konu}</span>
                  <span className="liste-alt">
                    {s.ogrenci} · {s.ders} · {neZaman(s.bitirildi)}
                  </span>
                </button>
                <button
                  className="dugme dugme--ikincil onay-dugme"
                  onClick={() => onayla(s)}
                  disabled={islenen === anahtar}
                >
                  {islenen === anahtar ? '…' : 'Onayla'}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Kart>
  )
}
