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

const BICIM_IKONU = {
  dosya: '📄',
  baglanti: '🔗',
  basili: '📕',
}

export function KaynakKarti({ kaynak, soluk = false, eylem }) {
  const eskimis = baglantiEskimis(kaynak)
  const adres = kaynakAdresi(kaynak)

  return (
    <article className={soluk ? 'kaynak kaynak--soluk' : 'kaynak'}>
      <span className="kaynak-ikon" aria-hidden="true">
        {BICIM_IKONU[kaynak.bicim] ?? '📄'}
      </span>

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

        {kaynak.yayinevi && <p className="kaynak-alt">{kaynak.yayinevi}</p>}

        <div className="kaynak-etiketler">
          <span className="kaynak-et kaynak-et--faz">{FAZ_ADI[kaynak.faz] ?? kaynak.faz}</span>

          {/* Seviye bilinmiyorsa hiç yazılmıyor. Boş alan boş kalsın,
              uydurulmuş bir etiket yanlış yönlendirir. */}
          {kaynak.seviye != null && (
            <span className={`kaynak-et kaynak-et--sv${kaynak.seviye}`}>
              {SEVIYE_ADI[kaynak.seviye]}
            </span>
          )}

          {kaynak.telif === 'resmi' && (
            <span className="kaynak-et kaynak-et--resmi">Resmî kaynak</span>
          )}

          {eskimis && (
            <span className="kaynak-et kaynak-et--uyari">Bağlantıyı kontrol et</span>
          )}
        </div>
      </div>

      {eylem && <div className="kaynak-eylem">{eylem}</div>}
    </article>
  )
}

export function KaynakSecimi({ kaynak, secili, onSec, soluk }) {
  return (
    <label className="kaynak-secim">
      <input
        type="radio"
        name="kaynak-secimi"
        checked={secili}
        onChange={() => onSec(kaynak)}
      />
      <span className="kaynak-isaret" aria-hidden="true" />
      <KaynakKarti kaynak={kaynak} soluk={soluk} />
    </label>
  )
}

export default KaynakKarti
