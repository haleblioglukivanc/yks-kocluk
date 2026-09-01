import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { KaynakSecimi } from './KaynakKarti.jsx'
import { Alan, Yukleniyor } from './Ortak.jsx'
import { SEVIYE_ADI } from '../lib/kaynak.js'
import { KALEM_ADI } from './Kalem.jsx'

/**
 * Göreve kaynak iliştirme.
 *
 * Motor iki eksenden çalışıyor ve ikisi farklı güçte:
 *
 *  - FAZ: `konu_ilerleme` her öğrencide dolu, bu yüzden sıralamayı
 *    güvenle belirliyor. Konusu bitmemiş öğrencide denemeler geri
 *    plana düşüyor.
 *  - SEVİYE: net verisi çoğu öğrenci–ders çiftinde üç denemeden az.
 *    Yetersizse öneri yapılmıyor ve bu açıkça yazılıyor. Sessizce
 *    tahmin etmektense susmak doğru; veri biriktikçe kendi açılır.
 */

const DURUM_SOZU = {
  baslanmadi: 'bu konuya henüz başlamamış',
  calisiliyor: 'bu konuyu çalışıyor, henüz bitirmemiş',
  tekrar_gerekli: 'bu konuyu tekrar etmesi gerekiyor',
  tamamlandi: 'bu konuyu bitirmiş',
}

const DURUM_GEREKCE = {
  baslanmadi: 'Anlatım ve fasikülleri öne aldım.',
  calisiliyor: 'Soru bankası ve fasikülleri öne aldım.',
  tekrar_gerekli: 'Anlatım ve fasikülleri öne aldım.',
  tamamlandi: 'Deneme ve ölçme kaynaklarını öne aldım.',
}

export default function KaynakSecici({
  ogrenciId,
  ogrenciAdi,
  dersId,
  konuId,
  secili,
  onSec,
  aralik,
  onAralik,
  onKutuphaneyeGit,
}) {
  const [liste, setListe] = useState(null)
  const [baglam, setBaglam] = useState(null)

  useEffect(() => {
    if (!ogrenciId || !dersId) {
      setListe(null)
      setBaglam(null)
      return
    }
    let iptal = false
    setListe(null)

    const konu = konuId ? Number(konuId) : null
    Promise.all([
      supabase.rpc('kaynak_onerileri', {
        p_ogrenci: ogrenciId,
        p_ders_id: Number(dersId),
        p_konu_id: konu,
      }),
      supabase.rpc('kaynak_baglami', {
        p_ogrenci: ogrenciId,
        p_ders_id: Number(dersId),
        p_konu_id: konu,
      }),
    ]).then(([oneri, ctx]) => {
      if (iptal) return
      setListe(oneri.data ?? [])
      setBaglam(ctx.data ?? null)
    })

    return () => {
      iptal = true
    }
  }, [ogrenciId, dersId, konuId])

  if (!dersId) return null
  if (liste === null) return <Yukleniyor metin="Kaynaklara bakıyorum" satir={2} />

  const ad = (ogrenciAdi ?? '').trim().split(/\s+/)[0] || 'Öğrenci'
  const durum = baglam?.konu_durumu ?? 'baslanmadi'
  const seviye = baglam?.seviye_onerisi ?? null

  return (
    <div className="kaynak-secici">
      {konuId && liste.length > 0 && (
        <p className="kaynak-oneri">
          <span className="kaynak-oneri-simge" aria-hidden="true">
            ✏️
          </span>
          <span>
            {ad} {DURUM_SOZU[durum]}. {DURUM_GEREKCE[durum]}
          </span>
        </p>
      )}

      {liste.length > 0 &&
        (seviye ? (
          <p className="kaynak-oneri kaynak-oneri--sessiz">
            Son denemelere göre <strong>{SEVIYE_ADI[seviye]}</strong> seviyesi uygun görünüyor.
            İstersen başka bir seviye seç.
          </p>
        ) : (
          <p className="kaynak-oneri kaynak-oneri--sessiz">
            Seviye önerisi yok: {ad} için bu derste yeterli deneme kaydı bulunmuyor.
            Kaynağı kendin seçmen gerekiyor.
          </p>
        ))}

      {liste.length === 0 ? (
        <p className="kaynak-oneri kaynak-oneri--sessiz">
          Bu derse ait kaynak yok. {KALEM_ADI} boş listeyi sevmiyor — kütüphaneye bir kaynak
          eklersen buraya düşer.
        </p>
      ) : (
        <div className="kaynak-liste">
          {liste.map((k, i) => {
            const oncekiOnde = i > 0 && !liste[i - 1].geri_planda
            return (
              <div key={k.id}>
                {k.geri_planda && oncekiOnde && (
                  <p className="kaynak-ayrac">
                    {durum === 'tamamlandi'
                      ? 'Konusu bittiği için aşağıdakiler geri planda'
                      : 'Konusu bitmediği için aşağıdakiler geri planda'}
                  </p>
                )}
                <KaynakSecimi
                  kaynak={k}
                  secili={String(secili ?? '') === String(k.id)}
                  soluk={k.geri_planda}
                  onSec={(secilen) => onSec(secilen.id === secili ? null : secilen.id)}
                />
                {String(secili ?? '') === String(k.id) && (
                  <div className="kaynak-aralik">
                    <Alan
                      etiket="Aralık"
                      ipucu="Öğrenci bu satırı görevin altında görecek"
                    >
                      <input
                        type="text"
                        maxLength={80}
                        value={aralik}
                        onChange={(e) => onAralik(e.target.value)}
                        placeholder="Örn. Sayfa 112-124"
                      />
                    </Alan>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {onKutuphaneyeGit && (
        <button type="button" className="metin-dugme" onClick={onKutuphaneyeGit}>
          Kütüphanede yok — kaynak ekle
        </button>
      )}
    </div>
  )
}
