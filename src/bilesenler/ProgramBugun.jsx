import { useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { gunEkle } from '../lib/hafta.js'
import { TekrarSatiri } from './HataDefteri.jsx'
import BugunOkuma from './BugunOkuma.jsx'
import BugunCozulen from './BugunCozulen.jsx'

/* Programım · Bugün (22 Eylül 2026, Bekir): günün tamamı tek sayfada.
   "Günü tamamla" penceresi kalktı; rutinler, tekrar, kitap, çözülen soru ve
   yaklaşan deneme burada, yapıldığı anda işaretlenir. */

/** Koçun verdiği her gün yapılacak alışkanlıklar; yalnız bugünün kutusu. */
export function BugunRutinler({ ogrenciId, rutinler = [], haftaBasi, bugun, onDegisti, saltOkunur = false }) {
  const [liste, setListe] = useState(rutinler)
  const [hata, setHata] = useState('')
  useEffect(() => { setListe(rutinler ?? []) }, [rutinler])
  const i = haftaBasi && bugun ? Math.round((new Date(`${bugun}T00:00:00`) - new Date(`${haftaBasi}T00:00:00`)) / 86400000) : -1
  if (!liste.length || i < 0) return null
  const biten = liste.filter((r) => r.gunler?.[i]).length

  async function isaretle(r) {
    if (saltOkunur) return
    const acik = Boolean(r.gunler?.[i])
    const onceki = liste
    setListe((l) => l.map((x) => (x.id === r.id ? { ...x, gunler: x.gunler.map((v, j) => (j === i ? !acik : v)) } : x)))
    const tarih = gunEkle(haftaBasi, i)
    const { error } = acik
      ? await supabase.from('rutin_kayit').delete().eq('rutin_id', r.id).eq('tarih', tarih)
      : await supabase.from('rutin_kayit').upsert({ rutin_id: r.id, ogrenci_id: ogrenciId, tarih }, { onConflict: 'rutin_id,tarih' })
    if (error) { setListe(onceki); setHata(hataMetni(error)); return }
    onDegisti?.()
  }

  return (
    <section className="pb-kart" aria-label="Her gün yaptıkların">
      <div className="pb-bas"><span>HER GÜN YAPTIKLARIN</span><span>{biten} / {liste.length}</span></div>
      {liste.map((r) => {
        const tik = Boolean(r.gunler?.[i])
        return (
          <button key={r.id} type="button" className="pb-is" aria-pressed={tik} onClick={() => isaretle(r)} disabled={saltOkunur}>
            <span className="pb-tik pb-tik--kare" aria-hidden="true">{tik ? '✓' : ''}</span>
            <span className="pb-ad">{r.ad}</span>
          </button>
        )
      })}
      {hata && <p className="pb-hata">{hata}</p>}
    </section>
  )
}

const GUN_ADI = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']

/** Unutma: tekrar, kitap, çözülen soru, yaklaşan deneme. */
export function BugunUnutma({ ogrenciId, katalogId, bugun, soruKayitlari, onDegisti, saltOkunur = false }) {
  const [soruAcik, setSoruAcik] = useState(false)
  const [deneme, setDeneme] = useState(null)
  useEffect(() => {
    if (!ogrenciId || !bugun) return
    let iptal = false
    supabase.from('gorevler').select('tarih, baslik').eq('ogrenci_id', ogrenciId).eq('tur', 'deneme')
      .gte('tarih', bugun).lte('tarih', gunEkle(bugun, 6)).order('tarih').limit(1)
      .then(({ data }) => { if (!iptal) setDeneme(data?.[0] ?? null) })
    return () => { iptal = true }
  }, [ogrenciId, bugun])
  const toplamSoru = (soruKayitlari ?? []).reduce((a, k) => a + (k.dogru ?? 0) + (k.yanlis ?? 0) + (k.bos ?? 0), 0)
  const denemeGunu = deneme ? (deneme.tarih === bugun ? 'Bugün' : GUN_ADI[new Date(`${deneme.tarih}T00:00:00`).getDay()]) : null

  return (
    <section className="pb-kart pb-unutma" aria-label="Unutma">
      <div className="pb-bas"><span>UNUTMA</span></div>
      {!saltOkunur && <TekrarSatiri ogrenciId={ogrenciId} />}
      <div className="pb-okuma"><BugunOkuma ogrenciId={ogrenciId} tarih={bugun} saltOkunur={saltOkunur} /></div>
      <button type="button" className="pb-is pb-soru" aria-expanded={soruAcik} onClick={() => setSoruAcik((a) => !a)}>
        <span className="pb-tik pb-tik--ikon" aria-hidden="true">✎</span>
        <span className="pb-ad">Bugün kaç soru çözdün?<small>Görevlerin dışında çözdüklerin · toplam {toplamSoru}</small></span>
        <em>{soruAcik ? 'Kapat' : 'Aç ›'}</em>
      </button>
      {soruAcik && (
        <div className="pb-soru-ac">
          <BugunCozulen ogrenciId={ogrenciId} katalogId={katalogId} kayitlar={soruKayitlari} tarih={bugun} onDegisti={onDegisti} saltOkunur={saltOkunur} />
        </div>
      )}
      {deneme && (
        <p className="pb-bilgi">{denemeGunu === 'Bugün' ? 'Bugün deneme günün.' : `${denemeGunu} deneme günün.`} {deneme.baslik ? `Koçun "${deneme.baslik}" planladı.` : ''}</p>
      )}
    </section>
  )
}
