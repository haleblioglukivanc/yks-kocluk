import { useCallback, useEffect, useState } from 'react'
import { Kalem, KALEM_ADI } from './Kalem.jsx'
import { kalemiCalistir, kalemiKapat } from '../lib/kalemMotoru.js'
import { maskotuDevral } from '../lib/maskotNobeti.js'
import { bicimle, kalanMs, useSayac, useSayacTiki } from '../lib/sayac.jsx'

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

export default function OgrenciBasligi({ profil, ogrenciId, ozet, sekme, onSekme, vekaleten = false, kocMesaji = null, onGit }) {
  const [olay, setOlay] = useState(null)

  const yukle = useCallback(async () => {
    if (!profil?.id || !ozet) return
    /* Vekalette Kâmil'in olay kaydı tutulmaz: kalem_olaylari politikası
       profil_id = auth.uid() olduğu için motor koçun kendi maskot
       satırlarına yazardı. Kâmil konuşmaya devam eder (varsayilanSoz),
       sadece kayıt tutmaz. */
    if (vekaleten) {
      setOlay(null)
      return
    }
    const olaylar = await kalemiCalistir({
      profilId: profil.id,
      rol: 'ogrenci',
      ad: profil.ad_soyad,
      veri: ozet,
    })
    setOlay(olaylar[0] ?? null)
  }, [profil?.id, profil?.ad_soyad, ozet, vekaleten])

  useEffect(() => {
    yukle()
  }, [yukle])

  /* Kâmil burada görünüyor: nöbeti devral ki köşedeki kopya kenara çekilsin.
     Devir yapılmazsa iki Kâmil aynı anda konuşur ve günlük mesaj limiti
     tek girişte tükenir. */
  useEffect(() => maskotuDevral(), [])

  /* Ölçüm satırı (blok/dk/seri), kalemtıraş metni ve rozet kısayolu
     Ben sekmesine taşındı: başlık yalnız "şimdi ne yapmalıyım" der.
     Sayaç rozeti sadece sayaç çalışırken görünür; boştayken kart zaten
     hemen altta. */
  const sayac = useSayac()
  const sayacDurumu = sayac?.durum ?? null
  useSayacTiki(!!sayacDurumu?.calisiyor)

  const saat = new Date().getHours()
  const varsayilan = varsayilanSoz(ozet, saat)
  /* Kim konuşuyor: koçun okunmamış mesajı varsa koç; yoksa kural motoru;
     o da yoksa günün varsayılan cümlesi. Geçmişten kalan görevler ayrı bir
     kutu değil, cümlenin devamı. */
  const kocKonusuyor = Boolean(kocMesaji)
  let soz = olay ? { ruh: olay.ruh, mesaj: olay.mesaj } : varsayilan
  if (kocKonusuyor) soz = { ruh: 'anlatiyor', mesaj: kocMesaji.mesaj.icerik }
  else if (!olay && (ozet?.gecikmisGorev ?? 0) > 0)
    soz = { ...soz, mesaj: `${soz.mesaj} Geçmiş günlerden ${ozet.gecikmisGorev} görev kaldı; bir tanesiyle başlamak yeter.` }


  function kapat() {
    if (!vekaleten) kalemiKapat(olay)
    setOlay(null)
  }

  /* Selam satırı: ad ve tarih. Öğrenci kim olduğunu biliyor ama ekranın
     tepesi "bugün" demeli; tarih o işi görüyor. Zemin koyu: sıcak amber
     denendi, üstteki koyu şeritle iki parça görünüyordu ve yazılar
     okunmuyordu. Sıcaklık tarih rengine ve Kâmil'e kaldı. Sınava kalan gün burada
     değil — sınav tarihi henüz kayıtta yok, uydurmuyoruz. */
  const ilkAd = (profil?.ad_soyad ?? '').trim().split(/\s+/)[0] || ''
  const tarih = new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <section className="hero-yuzey ob" aria-label={`${KALEM_ADI} ve bugünün durumu`}>
      <div className="ob-selam-satir">
        <h1 className="ob-selam-ad">{ilkAd ? `Merhaba ${ilkAd}` : 'Merhaba'}</h1>
        <p className="ob-tarih">{tarih}</p>
      </div>
      <div className="ob-ust">
        <div className="ob-kalem">
          <span aria-hidden="true">
            <Kalem ruh={soz.ruh} boyut={76} yipranma={ozet?.yipranma ?? 0} />
          </span>
        </div>

        <div className="ob-soz">
          {kocKonusuyor && <p className="ob-kim">Koçundan</p>}
          <p className="ob-mesaj" role="status" aria-live="polite">
            {soz.mesaj}
          </p>

          {/* Genel Başla düğmesi kalktı: sıradaki iş hemen alttaki kartta ve
              düğmesi orada. Ekranda tek birincil düğme olur. Kâmil'in
              kural motorundan gelen kendi eylemi varsa o burada kalır. */}
          <div className="ob-dugmeler">
            {kocKonusuyor && (
              <>
                <button className="ob-basla" disabled={kocMesaji.kapaniyor} onClick={kocMesaji.okudum}>
                  Okudum
                </button>
                <button className="ob-tamam" onClick={() => onGit?.('/mesajlar')}>
                  Cevap yaz
                </button>
              </>
            )}
            {!kocKonusuyor && olay?.eylem?.sekme && onSekme && (
              <button
                className="ob-basla"
                onClick={() => {
                  kapat()
                  onSekme(olay.eylem.sekme)
                }}
              >
                {olay.eylem.etiket}
              </button>
            )}
            {!kocKonusuyor && olay && (
              <button className="ob-tamam" onClick={kapat}>
                Tamam
              </button>
            )}
          </div>
        </div>
      </div>

      {sayacDurumu && (
        <div className="kk-kisayol kk-kisayol--sade">
          <button
            className={`kk-yol kk-yol--canli${sayacDurumu.calisiyor ? '' : ' kk-yol--durakli'}`}
            onClick={() => onSekme('bugun')}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
                 strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="8.5" />
              <path d="M12 7.5V12l3 1.8" />
            </svg>
            <span className="kk-yol-sayi">{bicimle(kalanMs(sayacDurumu))}</span>
            <span className="kk-yol-ad">{sayacDurumu.calisiyor ? 'Çalışıyor' : 'Duraklı'}</span>
          </button>
        </div>
      )}

    </section>
  )
}
