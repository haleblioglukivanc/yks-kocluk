import { Kart } from '../bilesenler/Ortak.jsx'
import { Kalem, KALEM_ADI } from '../bilesenler/Kalem.jsx'
import HedefNet from '../bilesenler/HedefNet.jsx'
import HaftalikIlham from '../bilesenler/HaftalikIlham.jsx'
import Rozetlerim from './Rozetlerim.jsx'

/**
 * "Ben" — bak katmanı. Bugün'de yapılacak işi gölgeleyen her şey burada:
 * Kâmil'in bilenme hikâyesi, plan tamamlama, seri, rozetler, hedefe göre
 * net, haftanın kitabı. Öğrenci istediğinde bakar; hiçbiri önüne itilmez.
 *
 * Yeni veri yok: ozet (ogrenci_bugun_ozeti), kayit ve netDurumu paneli
 * zaten çekiyor. Seri sayısı yalnız Rozetlerim'in Seri kartında —
 * aynı sayı iki yerde durmaz.
 */

function sureMetni(dk) {
  const saat = Math.floor(dk / 60)
  const kalan = dk % 60
  if (saat > 0) return kalan > 0 ? `${saat} sa ${kalan} dk` : `${saat} sa`
  return `${kalan} dk`
}

function bilenme(t) {
  if (!t || !t.hedefDk) {
    return { ruh: 'bekliyor', baslik: `${KALEM_ADI} haftayı izliyor`, alt: 'Haftalık çalışma hedefi tanımlı değil.' }
  }
  if (t.hedefTutuldu) {
    return {
      ruh: 'sevinc',
      baslik: `${KALEM_ADI} bu hafta bilendi`,
      alt: `Hedef ${sureMetni(t.hedefDk)} · ${sureMetni(t.buHaftaDk ?? 0)} çalıştın`,
    }
  }
  return {
    ruh: 'fikir',
    baslik: `${KALEM_ADI} ${sureMetni(t.kalanDk ?? 0)} sonra bilenir`,
    alt: `Haftalık hedef ${sureMetni(t.hedefDk)} · ${sureMetni(t.buHaftaDk ?? 0)} yapıldı`,
  }
}

export default function Ben({ kayit, ozet, netDurumu, denemeler }) {
  const b = bilenme(ozet?.kalemtiras)
  const tamamlama = ozet?.haftaTamamlamaYuzdesi ?? 0
  const bugunDk = ozet?.calismaDkBugun ?? 0

  const sonNet = denemeler?.[0] ? Number(denemeler[0].toplam_net) : null
  const oncekiNet = denemeler?.[1] ? Number(denemeler[1].toplam_net) : null
  const fark = sonNet !== null && oncekiNet !== null ? sonNet - oncekiNet : null
  const hedefAlt =
    [kayit?.hedef_universite, kayit?.hedef_bolum].filter(Boolean).join(' · ') || undefined

  return (
    <>
      <section className="hero-yuzey ob" aria-label={`${KALEM_ADI} ve haftanın durumu`}>
        <div className="ob-ust">
          <div className="ob-kalem">
            <span aria-hidden="true">
              <Kalem ruh={b.ruh} boyut={76} yipranma={ozet?.yipranma ?? 0} />
            </span>
          </div>
          <div className="ob-soz">
            <p className="ob-selam">Bu hafta</p>
            <p className="ob-mesaj">{b.baslik}</p>
            <p className="ob-alt">{b.alt}</p>
          </div>
        </div>
      </section>

      {/* Koç panelindeki KPI kartlarıyla aynı sınıf: sıcak dikkat, serin yolunda. */}
      <div className="kpi-satir">
        <div className={`kpi-kart ${tamamlama >= 60 ? 'kpi-kart--serin' : 'kpi-kart--sicak'}`}>
          <p className="kpi-etiket">Plan tamamlama</p>
          <p className="kpi-sayi">%{tamamlama}</p>
          <p className="kpi-alt">son 7 gün</p>
        </div>
        <div className="kpi-kart kpi-kart--serin">
          <p className="kpi-etiket">Bugün çalışma</p>
          <p className="kpi-sayi">{sureMetni(bugunDk)}</p>
          <p className="kpi-alt">sayaçla ölçülen</p>
        </div>
      </div>

      <Rozetlerim ogrenciId={kayit.id} />

      <Kart baslik="Hedefe göre durumum" altBaslik={hedefAlt}>
        <HedefNet tyt={kayit.hedef_tyt_net} ayt={kayit.hedef_ayt_net} durum={netDurumu} />
        {fark !== null && fark !== 0 && (
          <p className={`net-fark net-fark--${fark > 0 ? 'artis' : 'dusus'}`}>
            Son denemede {fark > 0 ? '▲' : '▼'} {Math.abs(fark).toFixed(2)} net
          </p>
        )}
      </Kart>

      <HaftalikIlham />
    </>
  )
}
