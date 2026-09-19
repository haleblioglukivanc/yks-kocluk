import { useYazarak, useCizbiKutlama } from '../lib/canli.js'
import { useCallback, useEffect, useState } from 'react'
import AcilGorusme from './AcilGorusme.jsx'
import { Kalem, KALEM_ADI } from './Kalem.jsx'
import { kalemiCalistir, kalemiKapat } from '../lib/kalemMotoru.js'
import { kuralMesaji } from '../lib/kalem-kurallari.js'
import { maskotuDevral } from '../lib/maskotNobeti.js'
import { bicimle, kalanMs, useSayac, useSayacTiki, varsayilanDk } from '../lib/sayac.jsx'
import { dersGorunumu } from '../lib/dersGorunum.js'
import { GOREV_TUR_OGRENCI } from '../lib/gorevTuru.js'

/**
 * Öğrenci panelinin başlığı.
 *
 * Neden kimlik kartı değil: koçun karta ihtiyacı var çünkü on iki öğrenci
 * arasında hangisine baktığını bilmesi gerekiyor. Öğrenci kendi ekranında
 * kim olduğunu zaten biliyor; orada kart ayna oluyor, alet değil.
 *
 * Bunun yerine ekranın tepesi tek bir soruyu cevaplıyor: şimdi ne yapmalıyım.
 * Cümleyi Çizbi kuruyor. Kural motorunun söyleyecek bir sözü varsa o
 * öncelikli; yoksa sıradaki iş yazılıyor.
 *
 * Çizbi burada olduğu için köşedeki kopyası öğrenci rolünde gizleniyor:
 * bir ekranda iki maskot olmaz.
 */


/** Bugünün ilk bitmemiş görevi. Sıra zaten durum + id'ye göre geliyor. */
function siradakiIs(ozet) {
  return (ozet?.gorevler ?? []).find((g) => g.durum !== 'tamamlandi') ?? null
}

/* Günün ilerlemesi: tepede ders renkli şerit ve Çizbi'nin şeritteki yeri.
   Her iş kendi dersinin renginde bir parça, genişliği süresi kadar. */
function ilerlemeHesapla(gorevler) {
  const isler = (gorevler ?? []).filter((g) => g.tur !== 'gorusme')
  const biten = isler.filter((g) => g.durum === 'tamamlandi').length
  const ilkBekleyen = isler.find((g) => g.durum !== 'tamamlandi')
  const toplamDk = isler.reduce((t, g) => t + varsayilanDk(g.tur), 0)
  const kalanDk = isler.filter((g) => g.durum !== 'tamamlandi').reduce((t, g) => t + varsayilanDk(g.tur), 0)
  const sa = Math.floor(kalanDk / 60)
  const dk = kalanDk % 60
  return {
    isler,
    biten,
    ilkBekleyenId: ilkBekleyen?.id ?? null,
    oran: toplamDk ? (toplamDk - kalanDk) / toplamDk : 0,
    kalanMetni: kalanDk === 0 ? '' : `kalan yaklaşık ${sa ? `${sa} sa` : ''}${sa && dk ? ' ' : ''}${dk ? `${dk} dk` : ''}`,
  }
}

/* Çizbi'nin kendi cümlesi yoksa sıradaki işi söyler. Ses tonu kuralları
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
  const baslik = is?.baslik || parcalar || GOREV_TUR_OGRENCI[is?.tur] || 'Çalışma'
  const adet =
    is?.hedef_adet && is.hedef_adet > 0
      ? ` — ${Math.max(0, is.hedef_adet - (is.yapilan_adet ?? 0))} soru kaldı`
      : ''

  return { ruh: 'fikir', mesaj: `Sırada ${baslik}${adet}.` }
}

export default function OgrenciBasligi({ profil, ogrenciId, ozet, sekme, onSekme, vekaleten = false, kocMesaji = null, onGit }) {
  const [olay, setOlay] = useState(null)
  /* Balonu öğrenci açıp kapattıysa onun tercihi; yoksa kendiliğinden. */
  const [balonTercih, setBalonTercih] = useState(null)
  /* Cümle üç adımda değişiyordu: önce varsayılan, sonra veri gelince
     güncellenmiş varsayılan, sonra motorun cümlesi. Konuşurken yazının
     altından kayması kötü; motor cevap verene kadar hiçbir şey
     yazmıyoruz. Kısa bir boşluk, üç kez değişen bir cümleden iyidir. */
  const [hazir, setHazir] = useState(false)
  /* Motor yalnızca gün değiştiğinde çalışıyor. Her tikte yeniden
     çalıştırılınca mesaj birkaç kez değişiyordu: bir an varsayılan
     cümle, bir an kuralın cümlesi, sonra tekrar. Cümlenin güncel
     kalması için motoru tekrar çağırmak gerekmiyor; metin aşağıda o
     anki veriyle yeniden yazılıyor. */
  const ozetGunu = ozet?.bugun ?? null

  const yukle = useCallback(async () => {
    if (!profil?.id || !ozet) return
    /* Vekalette Çizbi'nin olay kaydı tutulmaz: kalem_olaylari politikası
       profil_id = auth.uid() olduğu için motor koçun kendi maskot
       satırlarına yazardı. Çizbi konuşmaya devam eder (varsayilanSoz),
       sadece kayıt tutmaz. */
    if (vekaleten) {
      setOlay(null)
      setHazir(true)
      return
    }
    const olaylar = await kalemiCalistir({
      profilId: profil.id,
      rol: 'ogrenci',
      ad: profil.ad_soyad,
      veri: ozet,
    })
    /* Sonuç boşsa eldeki mesaj korunuyor: null'a düşürmek ekranı bir an
       varsayılan cümleye çeviriyordu. */
    if (olaylar[0]) setOlay(olaylar[0])
    setHazir(true)
  }, [profil?.id, profil?.ad_soyad, ozetGunu, vekaleten])

  useEffect(() => {
    yukle()
  }, [yukle])

  /* Çizbi burada görünüyor: nöbeti devral ki köşedeki kopya kenara çekilsin.
     Devir yapılmazsa iki Çizbi aynı anda konuşur ve günlük mesaj limiti
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
  const tazeMetin = olay
    ? kuralMesaji(
        olay.kod,
        { rol: 'ogrenci', ad: profil?.ad_soyad, ekran: 'bugun', saat, ogrenci: ozet },
        olay.mesaj,
      )
    : null
  /* tazeMetin null ise kural artık geçerli değil: günün varsayılan
     cümlesine düşülüyor, o cümle zaten o anki veriden yazılıyor. */
  let soz = olay && tazeMetin ? { ruh: olay.ruh, mesaj: tazeMetin } : varsayilan
  if (kocKonusuyor) soz = { ruh: 'anlatiyor', mesaj: kocMesaji.mesaj.icerik }
  /* Geçmişten kalan iş cümlesi kalktı (19 Eylül 2026): hafta şeridindeki
     amber noktalar bunu zaten söylüyor. Çizbi ekranda olanı tekrar etmez. */


  function kapat() {
    if (!vekaleten) kalemiKapat(olay)
    setOlay(null)
  }

  /* Selam satırı: ad ve tarih. Öğrenci kim olduğunu biliyor ama ekranın
     tepesi "bugün" demeli; tarih o işi görüyor. Zemin koyu: sıcak amber
     denendi, üstteki koyu şeritle iki parça görünüyordu ve yazılar
     okunmuyordu. Sıcaklık tarih rengine ve Çizbi'ye kaldı. Sınava kalan gün burada
     değil — sınav tarihi henüz kayıtta yok, uydurmuyoruz. */
  const ilkAd = (profil?.ad_soyad ?? '').trim().split(/\s+/)[0] || ''
  const tarih = new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })

  const metin = kocKonusuyor || hazir ? soz.mesaj : ''
  const yazilan = useYazarak(metin)
  const sallaniyor = useCizbiKutlama()

  /* Sade tepe (B, 19 Eylül 2026): bugünün ilerlemesinin tek yeri burası.
     Çizbi şeridin üstünde, iş bittikçe ilerler; cümlesi küçük balonda. */
  const ilerleme = ilerlemeHesapla(ozet?.gorevler)
  const planVar = ilerleme.isler.length > 0
  /* Balon yalnız ekranda olmayan bir şey varsa kendiliğinden açılır: koçun
     mesajı ya da kural motorunun gözlemi. "Sırada X" kartta, geçmişten kalan
     iş hafta şeridinde yazıyor; onlar için Çizbi sessizce şeritte yürür. */
  const kendiliginden = kocKonusuyor || Boolean(olay)
  const balonAcik = balonTercih ?? kendiliginden

  function balonuKapat() {
    if (olay && !kocKonusuyor) kapat()
    setBalonTercih(false)
  }

  return (
    <section className="hero-yuzey ob ob--sade" aria-label={`${KALEM_ADI} ve bugünün durumu`}>
      <div className="obs-ust">
        <div className="obs-baslik">
          <h1 className="obs-sayi">
            {planVar ? `${ilerleme.biten} / ${ilerleme.isler.length} bitti` : ilkAd ? `Merhaba ${ilkAd}` : 'Merhaba'}
          </h1>
          <p className="obs-kalan">{planVar ? ilerleme.kalanMetni || 'Bugünün hepsi bitti' : tarih}</p>
        </div>
        {/* Acil görüşme sağ üst köşede. Vekalette görünür ama salt okunur. */}
        <div className="ob-acil-kose">
          <AcilGorusme ogrenciId={profil?.id} saltOkunur={vekaleten} />
        </div>
      </div>

      <div className="obs-pist" style={{ '--yol': ilerleme.oran }}>
        <button
          type="button"
          className="obs-cizbi"
          onClick={() => setBalonTercih(!balonAcik)}
          aria-expanded={balonAcik}
          aria-label={`${KALEM_ADI} ne diyor`}
        >
          <span aria-hidden="true" className={sallaniyor ? 'ob-kalem-gir ob-kalem-salla' : 'ob-kalem-gir'}>
            <Kalem ruh={soz.ruh} boyut={34} yipranma={ozet?.yipranma ?? 0} />
          </span>
        </button>
        {planVar && (
          <div className="ob-ilerleme-serit" aria-hidden="true">
            {ilerleme.isler.map((g) => (
              <span
                key={g.id}
                className={
                  g.durum === 'tamamlandi' ? 'ob-parca ob-parca--bitti'
                    : g.id === ilerleme.ilkBekleyenId ? 'ob-parca ob-parca--simdi' : 'ob-parca'
                }
                style={{ flexGrow: varsayilanDk(g.tur), '--ders-renk': dersGorunumu(g.ders).renk }}
              />
            ))}
          </div>
        )}
      </div>

      {balonAcik && (
        <div className="obs-balon">
          <div className={metin ? 'ob-soz ob-soz--dolu' : 'ob-soz'}>
            {kocKonusuyor && <p className="ob-kim">Koçundan</p>}
            <p className="ob-mesaj" role="status" aria-live="polite" aria-label={metin}>
              {yazilan}
            </p>
            {/* Çizbi'nin kural motorundan gelen eylemi ve koçun mesajı için
                düğmeler balonun içinde. */}
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
            </div>
          </div>
          <button type="button" className="obs-kapat" onClick={balonuKapat} aria-label="Kapat">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
      )}

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
