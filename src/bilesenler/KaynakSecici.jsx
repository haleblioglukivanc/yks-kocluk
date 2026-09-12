import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { KaynakSecimi } from './KaynakKarti.jsx'
import { Alan, Yukleniyor } from './Ortak.jsx'
import { SEVIYE_ADI } from '../lib/kaynak.js'
import { KALEM_ADI } from './Kalem.jsx'
import { KAPSAM_ADI } from '../lib/dersGruplari.js'

/**
 * Göreve kaynak iliştirme.
 *
 * Önceki sürüm listeyi filtreliyordu: dersi veya konusu tutmayan kaynak
 * hiç görünmüyordu. Kütüphanede derse tek kaynak varsa koç tek satır
 * görüyor ve haklı olarak "kaynağı benim yerime seçmiş" diyordu.
 *
 * Artık filtre yok, sıralama var. Kütüphanenin tamamı adlarıyla burada;
 * öneri yalnızca hangisinin üste geleceğini söylüyor:
 *
 *  - FAZ: `konu_ilerleme` her öğrencide dolu, sıralamayı güvenle
 *    belirliyor. Konusu bitmemiş öğrencide denemeler geri plana düşüyor.
 *  - SEVİYE: net verisi çoğu öğrenci–ders çiftinde üç denemeden az.
 *    Yetersizse öneri yapılmıyor ve bu açıkça yazılıyor.
 *
 * Seçim her zaman koçun: hiçbir kaynak baştan işaretli gelmiyor.
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

const kapsamKisa = (k) =>
  k === 'tyt_ayt' ? 'TYT + AYT' : (KAPSAM_ADI[k] ?? String(k ?? '').toUpperCase())

/** Aramada Türkçe büyük/küçük harf farkı sonucu bozmasın. */
const sadeles = (m) => (m ?? '').toLocaleLowerCase('tr-TR').trim()

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
  const [arama, setArama] = useState('')
  const [tumunuAc, setTumunuAc] = useState(false)

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

  /* Ders değişince arama ve açık bölüm sıfırlanıyor: koç yeni derse
     baktığında liste tepeden başlasın. */
  useEffect(() => {
    setTumunuAc(false)
    setArama('')
  }, [dersId])

  const suzulmus = useMemo(() => {
    const q = sadeles(arama)
    if (!q) return liste ?? []
    return (liste ?? []).filter(
      (k) =>
        sadeles(k.ad).includes(q) ||
        sadeles(k.yayinevi).includes(q) ||
        sadeles(k.ders_ad).includes(q),
    )
  }, [liste, arama])

  if (!dersId) return null
  if (liste === null) return <Yukleniyor metin="Kaynaklara bakıyorum" satir={2} />

  const ad = (ogrenciAdi ?? '').trim().split(/\s+/)[0] || 'Öğrenci'
  const durum = baglam?.konu_durumu ?? 'baslanmadi'
  const seviye = baglam?.seviye_onerisi ?? null

  const dersinkiler = suzulmus.filter((k) => k.ilgili)
  const digerleri = suzulmus.filter((k) => !k.ilgili)
  const dersAdi = (liste.find((k) => k.ilgili) ?? {}).ders_ad ?? 'Bu ders'
  /* Arama yapılıyorsa alt bölüm kendiliğinden açılıyor: koç adıyla
     aradığı kaynağı kapalı bir başlığın altında kaybetmesin. */
  const digerAcik = tumunuAc || Boolean(arama.trim())

  const satir = (k) => (
    <div key={k.id}>
      <KaynakSecimi
        kaynak={k}
        secili={String(secili ?? '') === String(k.id)}
        soluk={k.geri_planda && !k.konuya_bagli}
        etiket={`${k.ders_ad} · ${kapsamKisa(k.kapsam)}`}
        onSec={(secilen) => onSec(secilen.id === secili ? null : secilen.id)}
      />
      {String(secili ?? '') === String(k.id) && (
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

  return (
    <div className="kaynak-secici">
      {konuId && dersinkiler.length > 0 && (
        <p className="kaynak-oneri">
          <span className="kaynak-oneri-simge" aria-hidden="true">
            ✏️
          </span>
          <span>
            {ad} {DURUM_SOZU[durum]}. {DURUM_GEREKCE[durum]} Seçim senin.
          </span>
        </p>
      )}

      {dersinkiler.length > 0 &&
        (seviye ? (
          <p className="kaynak-oneri kaynak-oneri--sessiz">
            Son denemelere göre <strong>{SEVIYE_ADI[seviye]}</strong> seviyesi uygun görünüyor.
            İstersen başka bir seviye seç.
          </p>
        ) : (
          <p className="kaynak-oneri kaynak-oneri--sessiz">
            Seviye önerisi yok: {ad} için bu derste yeterli deneme kaydı bulunmuyor.
          </p>
        ))}

      {liste.length > 6 && (
        <input
          type="search"
          className="kaynak-ara"
          value={arama}
          onChange={(e) => setArama(e.target.value)}
          placeholder="Kaynak adı veya yayınevi ara"
          aria-label="Kaynaklarda ara"
        />
      )}

      {liste.length === 0 ? (
        <p className="kaynak-oneri kaynak-oneri--sessiz">
          Kütüphane boş. {KALEM_ADI} boş listeyi sevmiyor — bir kaynak eklersen buraya düşer.
        </p>
      ) : (
        <div className="kaynak-liste">
          {dersinkiler.length > 0 ? (
            <>
              <p className="kaynak-ayrac">{dersAdi} kaynakları</p>
              {dersinkiler.map(satir)}
            </>
          ) : (
            <p className="kaynak-oneri kaynak-oneri--sessiz">
              Bu derse ait kaynak yok. Aşağıdan başka bir dersin kaynağını da seçebilirsin.
            </p>
          )}

          {digerleri.length > 0 && (
            <>
              <button
                type="button"
                className="kaynak-ayrac kaynak-ayrac--dugme"
                onClick={() => setTumunuAc((a) => !a)}
                aria-expanded={digerAcik}
              >
                <span>Kütüphanenin geri kalanı ({digerleri.length})</span>
                <span aria-hidden="true">{digerAcik ? '▾' : '▸'}</span>
              </button>
              {digerAcik && digerleri.map(satir)}
            </>
          )}

          {suzulmus.length === 0 && (
            <p className="kaynak-oneri kaynak-oneri--sessiz">
              Aradığın adla eşleşen kaynak yok.
            </p>
          )}
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
