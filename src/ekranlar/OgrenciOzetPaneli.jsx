import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { HaftaOzeti, OgrenciKapilari } from '../bilesenler/OgrenciDetayParcalari.jsx'
import ProgramIzgarasi from '../bilesenler/ProgramIzgarasi.jsx'
import { useFotograf } from '../bilesenler/Fotograf.jsx'
import { Yukleniyor } from '../bilesenler/Ortak.jsx'

/* Masaüstünde "listeden seç, yanda aç" (22 Eylül 2026, denetim 16, mokap
   onaylı): Öğrencilerim ve Yapılacaklar geniş ekranda iki sütun; sağda
   seçilen öğrencinin özeti. Künye + Bu hafta + kapılar + bu haftanın
   programı (salt okunur). Düzenleme ve alt sayfalar "Tam ekran aç" ile
   bugünkü detay sayfasında. Telefon ve tablette bu bileşen hiç çizilmez. */

const ALAN_ADI = { sayisal: 'Sayısal', esit_agirlik: 'Eşit Ağırlık', sozel: 'Sözel', dil: 'Dil' }
const DURUM = { acil: ['Önce bu', 'acil'], izle: ['İzle', 'izle'], iyi: ['Yolunda', 'iyi'] }

export default function OgrenciOzetPaneli({ ogrenciId, onAc, onMesaj, onGozuyle }) {
  const [ogrenci, setOgrenci] = useState(null)
  const [risk, setRisk] = useState(null)

  useEffect(() => {
    let iptal = false
    setOgrenci(null)
    Promise.all([
      supabase.from('ogrenciler')
        .select('id, koc_id, alan, sinif, katalog_id, aktif, hedef_tyt_net, hedef_ayt_net, profiller!ogrenciler_id_fkey(ad_soyad, fotograf_yolu)')
        .eq('id', ogrenciId).maybeSingle(),
      supabase.from('ogrenci_risk').select('risk_seviyesi, tamamlama_yuzdesi').eq('ogrenci_id', ogrenciId).maybeSingle(),
    ]).then(([o, r]) => {
      if (iptal) return
      setOgrenci(o.data ?? false)
      setRisk(r.data ?? null)
    })
    return () => { iptal = true }
  }, [ogrenciId])

  const foto = useFotograf(ogrenci?.profiller?.fotograf_yolu)
  if (ogrenci === null) return <div className="oz-panel"><Yukleniyor /></div>
  if (!ogrenci) return null

  const ad = ogrenci.profiller?.ad_soyad ?? 'İsimsiz'
  const bas = ad.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toLocaleUpperCase('tr')
  const [durumAd, durumTur] = DURUM[risk?.risk_seviyesi] ?? [null, null]
  const cipler = [ogrenci.sinif ? `${ogrenci.sinif}. sınıf` : null, ALAN_ADI[ogrenci.alan] ?? null, risk?.tamamlama_yuzdesi != null ? `son 7 gün %${Math.round(risk.tamamlama_yuzdesi)}` : null].filter(Boolean)

  return (
    <div className="oz-panel" key={ogrenciId}>
      <header className="oz-kunye">
        <span className={`oz-avatar${durumTur ? ` oz-avatar--${durumTur}` : ''}`}>
          {foto ? <img src={foto} alt="" /> : bas}
        </span>
        <div className="oz-kimlik">
          <h2>{ad}</h2>
          <p>
            {cipler.join(' · ')}
            {durumAd && <> · <b className={`oz-durum oz-durum--${durumTur}`}>{durumAd}</b></>}
          </p>
        </div>
        <div className="oz-eylem">
          {onGozuyle && (
            <button type="button" className="ana-yuvarlak" onClick={() => onGozuyle(ogrenci.id)} aria-label="Onun gözünden bak" title="Onun gözünden bak">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>
            </button>
          )}
          {onMesaj && (
            <button type="button" className="ana-yuvarlak" onClick={() => onMesaj(ogrenci.id)} aria-label="Mesaj yaz" title="Mesaj yaz">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z" /></svg>
            </button>
          )}
          <button type="button" className="oz-tam" onClick={() => onAc(ogrenci.id)}>Tam ekran aç ›</button>
        </div>
      </header>
      <div className="od-govde oz-govde">
        <HaftaOzeti ogrenciId={ogrenci.id} ad={ad} onDenemeler={() => onAc(ogrenci.id, 'denemeler')} onKonular={() => onAc(ogrenci.id, 'konular')} />
        <OgrenciKapilari ogrenciId={ogrenci.id} onDenemeler={() => onAc(ogrenci.id, 'denemeler')} onKonular={() => onAc(ogrenci.id, 'konular')} />
        <section className="prg-bolum">
          <ProgramIzgarasi ogrenci={ogrenci} duzenlenebilir={false} saltOkunur />
        </section>
      </div>
    </div>
  )
}
