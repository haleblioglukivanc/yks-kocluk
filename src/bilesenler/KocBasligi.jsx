import { useCallback, useEffect, useState } from 'react'
import { Kalem, KALEM_ADI } from './Kalem.jsx'
import { kalemiCalistir, kalemiKapat } from '../lib/kalemMotoru.js'
import { maskotuDevral } from '../lib/maskotNobeti.js'

/**
 * Koç panelinin başlığı.
 *
 * Öğrenci panelindekiyle aynı koyu yüzeyi paylaşıyor: üç ana ekran da
 * artık aynı şekilde açılıyor.
 *
 * KPI kartları bilerek bunun altında ve açık zeminde kaldı. Onlar renkle
 * bilgi taşıyor (sıcak dikkat ister, soğuk iyi gidiyor); koyu zemine
 * alsaydık hangisinin dikkat istediği anlaşılmazdı.
 */

/* Kâmil'in kural motorundan gelen sözü yoksa günün manşetini kendimiz
   kuruyoruz. Sıra önemli: önce dikkat isteyen şey, sonra iyi haber. */
function varsayilanSoz(ozet) {
  if (!ozet) return { ruh: 'bekliyor', mesaj: 'Güne bakıyorum.' }

  const riskli = ozet.riskliOgrenciler ?? []
  const sessiz = riskli.filter((o) => (o.gunGecti ?? 0) >= 3 || o.hicBaslamadi)
  const net = ozet.sinifNetDegisimi

  if (sessiz.length > 0) {
    const ilk = sessiz[0]?.ad?.split(' ')[0]
    return {
      ruh: 'dusunuyor',
      mesaj:
        sessiz.length === 1
          ? `${ilk} üç gündür görünmüyor. Kısa bir mesaj işe yarayabilir.`
          : `${sessiz.length} öğrenci üç gündür sessiz.${ilk ? ` ${ilk}'den başlamak iyi olabilir.` : ''}`,
    }
  }
  if ((ozet.bekleyenVeliOzeti ?? 0) > 0) {
    return {
      ruh: 'fikir',
      mesaj: `${ozet.bekleyenVeliOzeti} veli özeti yorum bekliyor.`,
    }
  }
  if (net != null && Number(net) > 0) {
    return {
      ruh: 'sevinc',
      mesaj: `Sınıf ortalaması geçen haftaya göre ${Number(net).toFixed(1)} net yükseldi.`,
    }
  }
  if ((ozet.buHaftaGirilenDeneme ?? 0) > 0) {
    return {
      ruh: 'bekliyor',
      mesaj: `Bu hafta ${ozet.buHaftaGirilenDeneme} deneme girildi.`,
    }
  }
  return { ruh: 'bekliyor', mesaj: 'Bugün dikkat isteyen bir şey görünmüyor.' }
}

export default function KocBasligi({ profil, ozet, onGit }) {
  /* Bekleyen özet / okunmamış kısayolları zile taşındı (Bildirimler). */
  const [olay, setOlay] = useState(null)

  const yukle = useCallback(async () => {
    if (!profil?.id || !ozet) return
    const olaylar = await kalemiCalistir({
      profilId: profil.id,
      rol: 'koc',
      ad: profil.ad_soyad,
      veri: ozet,
    })
    setOlay(olaylar[0] ?? null)
  }, [profil?.id, profil?.ad_soyad, ozet])

  useEffect(() => {
    yukle()
  }, [yukle])

  // Kâmil başlıkta: köşedeki kopya kenara çekilsin.
  useEffect(() => maskotuDevral(), [])

  const soz = olay ? { ruh: olay.ruh, mesaj: olay.mesaj } : varsayilanSoz(ozet)

  function kapat() {
    kalemiKapat(olay)
    setOlay(null)
  }

  return (
    <section className="hero-yuzey ob" aria-label={`${KALEM_ADI} ve günün özeti`}>
      <div className="ob-ust">
        <div className="ob-kalem" aria-hidden="true">
          <Kalem ruh={soz.ruh} boyut={76} />
        </div>

        <div className="ob-soz">
          <p className="ob-mesaj" role="status" aria-live="polite">
            {soz.mesaj}
          </p>
          {olay && (
            <div className="ob-dugmeler">
              {olay.eylem?.yol && onGit && (
                <button
                  className="ob-basla"
                  onClick={() => {
                    kapat()
                    onGit(olay.eylem.yol)
                  }}
                >
                  {olay.eylem.etiket}
                </button>
              )}
              <button className="ob-tamam" onClick={kapat}>
                Tamam
              </button>
            </div>
          )}
        </div>
      </div>

    </section>
  )
}
