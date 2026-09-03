import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

/* Koçun karar kuyruğundan gönderdiği mesaj, öğrenci uygulamayı açtığı anda
   koyu başlıkta Kâmil'in cümlesinin yerine çıkar: koç yazdıysa o gün koç
   konuşur. Mesaj kutusuna girmesini beklemiyoruz: geri dönmesi istenen
   öğrenci zaten kutuya bakmayan öğrenci. Okundu işaretlenince başlık
   Kâmil'e döner; mesaj kutuda kalmaya devam eder. */

export function useKocMesaji(ogrenciId, etkin = true) {
  const [mesaj, setMesaj] = useState(null)
  const [kapaniyor, setKapaniyor] = useState(false)

  const yukle = useCallback(async () => {
    if (!ogrenciId || !etkin) return
    const { data } = await supabase
      .from('mesajlar')
      .select('id, icerik, olusturuldu, gonderen_id')
      .eq('alici_id', ogrenciId)
      .eq('okundu_mu', false)
      .neq('gonderen_id', ogrenciId)
      .order('olusturuldu', { ascending: false })
      .limit(1)
      .maybeSingle()
    setMesaj(data ?? null)
  }, [ogrenciId, etkin])

  useEffect(() => {
    yukle()
  }, [yukle])

  const okudum = useCallback(async () => {
    if (!mesaj) return
    setKapaniyor(true)
    await supabase.from('mesajlar').update({ okundu_mu: true }).eq('id', mesaj.id)
    setMesaj(null)
    setKapaniyor(false)
  }, [mesaj])

  return mesaj ? { mesaj, okudum, kapaniyor } : null
}
