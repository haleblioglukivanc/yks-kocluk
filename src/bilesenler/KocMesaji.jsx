import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

/* Koçun karar kuyruğundan gönderdiği mesaj, öğrenci uygulamayı açtığı anda
   günün en üstünde karşısına çıkar. Mesaj kutusuna girmesini beklemiyoruz:
   geri dönmesi istenen öğrenci zaten kutuya bakmayan öğrenci. Okundu
   işaretlenince kart kapanır ve mesaj kutusunda kalmaya devam eder. */

export default function KocMesaji({ ogrenciId, onGit }) {
  const [mesaj, setMesaj] = useState(null)
  const [kapaniyor, setKapaniyor] = useState(false)

  const yukle = useCallback(async () => {
    if (!ogrenciId) return
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
  }, [ogrenciId])

  useEffect(() => {
    yukle()
  }, [yukle])

  if (!mesaj) return null

  async function okudum() {
    setKapaniyor(true)
    await supabase.from('mesajlar').update({ okundu_mu: true }).eq('id', mesaj.id)
    setMesaj(null)
  }

  return (
    <section className="koc-mesaji" data-durum="dikkat">
      <p className="koc-mesaji-etiket">Koçundan</p>
      <p className="koc-mesaji-metin">{mesaj.icerik}</p>
      <div className="koc-mesaji-dugmeler">
        <button className="dugme dugme--birincil" disabled={kapaniyor} onClick={okudum}>
          Okudum
        </button>
        <button className="dugme dugme--ikincil" onClick={() => onGit?.('/mesajlar')}>
          Cevap yaz
        </button>
      </div>
    </section>
  )
}
