import {
  FAZ_ADI,
  SEVIYE_ADI,
  baglantiEskimis,
  kaynakAdresi,
} from '../lib/kaynak.js'

/**
 * Kaynak kartı — tek bileşen, üç yer.
 *
 * Kütüphane listesi, göreve kaynak seçme ekranı ve ileride öğrencinin
 * gördüğü kaynak satırı aynı kartı kullanır. Buradaki bir düzenleme
 * hepsine birden yansısın diye ayrı ayrı yazılmadı.
 *
 * `secilebilir` verildiğinde kart bir radyo düğmesine sarılır; görsel
 * yapı aynı kalır, yalnızca solunda seçim işareti belirir.
 */

/* Satır, kart değil (TASARIM-KURALLARI 1, 7): ad, altında düz açıklama
   satırı. Etiketler çerçeveli hap değil; seviye kendi renginde yazı,
   uyarılar kırmızı yazı. Emoji ikon kalktı. Kütüphane, göreve kaynak
   seçme ve öğrenci tarafı aynı satırı kullanır. */
function KaynakKarti({ kaynak, soluk = false, eylem, etiket }) {
  const eskimis = baglantiEskimis(kaynak)
  const adres = kaynakAdresi(kaynak)
  const alt = [kaynak.yayinevi, etiket, FAZ_ADI[kaynak.faz] ?? kaynak.faz].filter(Boolean)

  return (
    <article className={soluk ? 'kaynak kaynak--soluk' : 'kaynak'}>
      <div className="kaynak-govde">
        <p className="kaynak-ad">
          {adres ? (
            <a href={adres} target="_blank" rel="noreferrer noopener">
              {kaynak.ad}
            </a>
          ) : (
            kaynak.ad
          )}
        </p>
        <p className="kaynak-alt">
          {alt.join(' · ')}
          {/* Seviye bilinmiyorsa hiç yazılmıyor: uydurulmuş etiket yanıltır. */}
          {kaynak.seviye != null && (
            <>
              {alt.length ? ' · ' : ''}
              <b className={`kaynak-sv kaynak-sv--${kaynak.seviye}`}>{SEVIYE_ADI[kaynak.seviye]}</b>
            </>
          )}
          {kaynak.telif === 'resmi' && <> · <span className="kaynak-resmi">Resmî kaynak</span></>}
          {eskimis && <> · <span className="kaynak-uyari">Bağlantıyı kontrol et</span></>}
        </p>
      </div>

      {eylem && <div className="kaynak-eylem">{eylem}</div>}
    </article>
  )
}

export default KaynakKarti
