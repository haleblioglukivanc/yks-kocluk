import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { Alan, Yukleniyor } from './Ortak.jsx'

/**
 * Göreve kaynak iliştirme.
 *
 * Önceki sürüm ders için üç öneri kartı açıyor, altına "tümü" düğmesi
 * koyuyor, üstüne de sıralamanın gerekçesini yazıyordu. Kütüphane 240+
 * kaynağa çıkınca bu bölüm görev formunun en kalabalık yeri oldu: koç
 * her görev açışında ekranlar boyu kart geçiyordu.
 *
 * Artık tek yol var: ara ve seç (Eylül 2026). Varsayılanda yalnızca
 * arama kutusu duruyor, liste yazdıkça geliyor ve her kaynak tek satır
 * — öğrenci tarafındaki kaynak listesiyle aynı sadelikte.
 *
 * Satırda kitap adının yanında yayınevi de var: kütüphanede "TYT Fizik
 * Soru Bankası" adında üç ayrı kitap var, ayırt eden tek şey yayınevi.
 *
 * Öneri sıralaması ve gerekçe cümleleri kaldırıldı; kartların sırasını
 * açıklıyorlardı, sıra kalkınca açıklayacak bir şey kalmadı.
 * Seçim her zaman koçun: hiçbir kaynak baştan işaretli gelmiyor.
 */

/** Aramada Türkçe büyük/küçük harf farkı sonucu bozmasın. */
const sadeles = (m) => (m ?? '').toLocaleLowerCase('tr-TR').trim()

const SONUC_SINIRI = 25

export default function KaynakSecici({
  ogrenciId,
  dersId,
  konuId,
  secili,
  onSec,
  aralik,
  onAralik,
  onKutuphaneyeGit,
}) {
  const [liste, setListe] = useState(null)
  const [arama, setArama] = useState('')

  useEffect(() => {
    if (!ogrenciId || !dersId) {
      setListe(null)
      return
    }
    let iptal = false
    setListe(null)

    supabase
      .rpc('kaynak_onerileri', {
        p_ogrenci: ogrenciId,
        p_ders_id: Number(dersId),
        p_konu_id: konuId ? Number(konuId) : null,
      })
      .then(({ data }) => {
        if (!iptal) setListe(data ?? [])
      })

    return () => {
      iptal = true
    }
  }, [ogrenciId, dersId, konuId])

  /* Ders değişince arama sıfırlanıyor: koç yeni derse baktığında
     eski aramanın sonuçlarıyla karşılaşmasın. */
  useEffect(() => {
    setArama('')
  }, [dersId])

  const suzulmus = useMemo(() => {
    const q = sadeles(arama)
    if (!q) return []
    return (liste ?? []).filter(
      (k) =>
        sadeles(k.ad).includes(q) ||
        sadeles(k.yayinevi).includes(q) ||
        sadeles(k.ders_ad).includes(q),
    )
  }, [liste, arama])

  if (!dersId) return null
  if (liste === null) return <Yukleniyor metin="Kaynaklara bakıyorum" satir={2} />

  const araniyor = Boolean(arama.trim())

  /* Arama temizlenince seçili kaynak da ekrandan kaybolmasın: koç
     kitabı seçtikten sonra aralığı yazacak, satır orada durmalı. */
  const seciliKaynak = secili
    ? (liste.find((k) => String(k.id) === String(secili)) ?? null)
    : null

  const gosterilen = araniyor
    ? suzulmus.slice(0, SONUC_SINIRI)
    : seciliKaynak
      ? [seciliKaynak]
      : []

  const satir = (k) => {
    const isaretli = String(secili ?? '') === String(k.id)
    return (
      <div key={k.id}>
        <label className="kaynak-satir">
          <input
            type="radio"
            name="kaynak-secimi"
            checked={isaretli}
            onChange={() => onSec(isaretli ? null : k.id)}
          />
          <span className="kaynak-satir-isaret" aria-hidden="true" />
          <span className="kaynak-satir-ad">{k.ad}</span>
          {k.yayinevi && <span className="kaynak-satir-alt">{k.yayinevi}</span>}
        </label>

        {isaretli && (
          <div className="kaynak-aralik">
            <Alan etiket="Aralık" ipucu="Öğrenci bu satırı görevin altında görecek">
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
  }

  return (
    <div className="kaynak-secici">
      <input
        type="search"
        className="kaynak-ara"
        value={arama}
        onChange={(e) => setArama(e.target.value)}
        placeholder={`Kaynak ara — ${liste.length} kaynak`}
        aria-label="Kaynaklarda ara"
      />

      {liste.length === 0 ? (
        <p className="kaynak-oneri kaynak-oneri--sessiz">
          Kütüphane boş. Bir kaynak eklersen buraya düşer.
        </p>
      ) : (
        gosterilen.length > 0 && (
          <div className="kaynak-liste">{gosterilen.map(satir)}</div>
        )
      )}

      {araniyor && suzulmus.length === 0 && liste.length > 0 && (
        <p className="kaynak-oneri kaynak-oneri--sessiz">
          Aradığın adla eşleşen kaynak yok. Kütüphanede olmayan bir kitabı
          aşağıdan ekleyebilirsin.
        </p>
      )}

      {araniyor && suzulmus.length > SONUC_SINIRI && (
        <p className="kaynak-oneri kaynak-oneri--sessiz">
          İlk {SONUC_SINIRI} sonuç gösteriliyor; aramayı daraltırsan kalanlar da gelir.
        </p>
      )}

      {onKutuphaneyeGit && (
        <button type="button" className="metin-dugme" onClick={onKutuphaneyeGit}>
          Kütüphanede yok — kaynak ekle
        </button>
      )}
    </div>
  )
}
