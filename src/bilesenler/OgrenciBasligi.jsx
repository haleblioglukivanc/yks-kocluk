import { useCallback, useEffect, useState } from 'react'
import { Kalem, KALEM_ADI } from './Kalem.jsx'
import { kalemiCalistir, kalemiKapat } from '../lib/kalemMotoru.js'

/**
 * Öğrenci panelinin başlığı.
 *
 * Neden kimlik kartı değil: koçun karta ihtiyacı var çünkü on iki öğrenci
 * arasında hangisine baktığını bilmesi gerekiyor. Öğrenci kendi ekranında
 * kim olduğunu zaten biliyor; orada kart ayna oluyor, alet değil.
 *
 * Bunun yerine ekranın tepesi tek bir soruyu cevaplıyor: şimdi ne yapmalıyım.
 * Cümleyi Kâmil kuruyor. Kural motorunun söyleyecek bir sözü varsa o
 * öncelikli; yoksa sıradaki iş yazılıyor.
 *
 * Kâmil burada olduğu için köşedeki kopyası öğrenci rolünde gizleniyor:
 * bir ekranda iki maskot olmaz.
 */

const TUR_ADI = {
  konu_anlatimi: 'Konu anlatımı',
  soru_cozumu: 'Soru çözümü',
  tekrar: 'Tekrar',
  deneme: 'Deneme',
  okuma: 'Okuma',
  diger: 'Çalışma',
}

function selamlama(saat) {
  if (saat < 6) return 'İyi geceler'
  if (saat < 12) return 'Günaydın'
  if (saat < 18) return 'İyi günler'
  return 'İyi akşamlar'
}

/** Bugünün ilk bitmemiş görevi. Sıra zaten durum + id'ye göre geliyor. */
function siradakiIs(ozet) {
  return (ozet?.gorevler ?? []).find((g) => g.durum !== 'tamamlandi') ?? null
}

/* Kâmil'in kendi cümlesi yoksa sıradaki işi söyler. Ses tonu kuralları
   kural motorundakiyle aynı: suçlama yok, ünlem yok, kıyas yok. */
function varsayilanSoz(ozet, saat) {
  if (!ozet) return { ruh: 'bekliyor', mesaj: 'Bugüne bakıyorum.' }

  const toplam = ozet.bugunToplamGorev ?? 0
  const biten = ozet.bugunTamamlanan ?? 0
  const is = siradakiIs(ozet)

  if (ozet.yeniRozetAdi) {
    return { ruh: 'kutlama', mesaj: `${ozet.yeniRozetAdi} rozetini aldın. Bunu hak ettin.` }
  }
  if (toplam > 0 && biten === toplam) {
    return { ruh: 'sevinc', mesaj: 'Bugünün hepsi bitti. Gerisi senin zamanın.' }
  }
  if (toplam === 0) {
    return {
      ruh: 'bekliyor',
      mesaj: 'Bugün için plan yok. İstersen konularından birine kendin çalış.',
    }
  }
  if (saat >= 23 || saat < 5) {
    return { ruh: 'uyku', mesaj: 'Geç oldu. Yarın taze başlamak daha çok iş görür.' }
  }

  const parcalar = [is?.ders, is?.konu].filter(Boolean).join(' · ')
  const baslik = is?.baslik || parcalar || TUR_ADI[is?.tur] || 'Çalışma'
  const adet =
    is?.hedef_adet && is.hedef_adet > 0
      ? ` — ${Math.max(0, is.hedef_adet - (is.yapilan_adet ?? 0))} soru kaldı`
      : ''

  return { ruh: 'fikir', mesaj: `Sırada ${baslik}${adet}.` }
}

export default function OgrenciBasligi({ profil, ozet, onBugun }) {
  const [olay, setOlay] = useState(null)

  const yukle = useCallback(async () => {
    if (!profil?.id || !ozet) return
    const olaylar = await kalemiCalistir({
      profilId: profil.id,
      rol: 'ogrenci',
      ad: profil.ad_soyad,
      veri: ozet,
    })
    setOlay(olaylar[0] ?? null)
  }, [profil?.id, profil?.ad_soyad, ozet])

  useEffect(() => {
    yukle()
  }, [yukle])

  const saat = new Date().getHours()
  const varsayilan = varsayilanSoz(ozet, saat)
  const soz = olay ? { ruh: olay.ruh, mesaj: olay.mesaj } : varsayilan

  const ad = (profil?.ad_soyad ?? '').trim().split(/\s+/)[0] || ''
  const toplam = ozet?.bugunToplamGorev ?? 0
  const biten = ozet?.bugunTamamlanan ?? 0
  const gecikmis = ozet?.gecikmisGorev ?? 0
  const is = siradakiIs(ozet)

  function kapat() {
    kalemiKapat(olay)
    setOlay(null)
  }

  return (
    <section className="ob" aria-label={`${KALEM_ADI} ve bugünün durumu`}>
      <div className="ob-ust">
        <div className="ob-kalem" aria-hidden="true">
          <Kalem ruh={soz.ruh} boyut={76} yipranma={ozet?.yipranma ?? 0} />
        </div>

        <div className="ob-soz">
          <p className="ob-selam">
            {selamlama(saat)}
            {ad ? `, ${ad}` : ''}
          </p>
          <p className="ob-mesaj" role="status" aria-live="polite">
            {soz.mesaj}
          </p>

          <div className="ob-dugmeler">
            {is && (
              <button className="ob-basla" onClick={onBugun}>
                Başla
              </button>
            )}
            {olay && (
              <button className="ob-tamam" onClick={kapat}>
                Tamam
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="ob-olcum">
        <span>
          <strong>
            {biten}/{toplam}
          </strong>{' '}
          blok
        </span>
        <span aria-hidden="true">·</span>
        <span>
          <strong>{ozet?.calismaDkBugun ?? 0}</strong> dk bugün
        </span>
        <span aria-hidden="true">·</span>
        <span>
          <strong>{ozet?.guncelSeri ?? 0}</strong> gün seri
        </span>
      </div>

      {gecikmis > 0 && (
        <p className="ob-gecikme">
          {gecikmis} görev geçmiş günlerden kaldı. Bir tanesiyle başlamak yeter.
        </p>
      )}
    </section>
  )
}
