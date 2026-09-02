import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { Avatar } from './Fotograf.jsx'
import { sebepCumlesi } from './OgrenciSatiri.jsx'

const ALAN_ADI = { sayisal: 'Sayısal', esit_agirlik: 'Eşit Ağırlık', sozel: 'Sözel', dil: 'Dil' }
const RISK_ADI = { iyi: 'Yolunda', izle: 'İzle', acil: 'Önce bu' }

/** Haftanın kalan günü; hedef yüzdesinin yanına "3 gün kaldı" için. */
function kalanGun() {
  const g = new Date().getDay() // 0 Paz
  return g === 0 ? 0 : 7 - g
}

/** Tabloda tutulan seri yalnızca aktivite oldukça güncelleniyor.
 *  Son aktiflik dünden eskiyse seri kopmuştur; okurken düzeltiyoruz. */
function seriDuzelt(satir) {
  const bugun = new Date()
  bugun.setHours(0, 0, 0, 0)
  const sonAktif = satir?.son_aktif_gun ? new Date(satir.son_aktif_gun) : null
  const kopmus = !sonAktif || (bugun - sonAktif) / 864e5 > 1
  return kopmus ? 0 : (satir?.guncel_seri ?? 0)
}

/**
 * Öğrenci detayının tepesindeki kimlik kartı.
 *
 * Tasarım kararı: durum bir yazı değil, kartın kendi görünümü.
 * Erişim kapatıldığında kart soluklaşır ve altında bir şerit belirir;
 * ayrıca "Durum: Pasif" satırı yazmıyoruz.
 */
export default function OgrenciKimlikKarti({
  ogrenci,
  netDurumu,
  rol = 'koc',
  ozet,
  netFarki,
  onMesaj,
  onGozuyle,
  onEk,
}) {
  /* Aynı kart, iki farklı okuyucu. Görsel dil ortak; içerik değil.
     Öğrenci kendi kartında erişim anahtarını, düzenleme çarkını ve risk
     seviyesini görmez: ilk ikisi koçun yetkisi, üçüncüsü koçun öğrenci
     hakkındaki değerlendirmesi. "Acil" etiketini öğrenciye göstermek
     yardımcı olmaz. */
  const kocGorunumu = rol === 'koc'
  const [ek, setEk] = useState(null)
  const aktif = ogrenci.aktif

  useEffect(() => {
    let iptal = false
    ;(async () => {
      const [r, s, rz, v] = await Promise.all([
        kocGorunumu
          ? supabase
              .from('ogrenci_risk')
              .select('risk_seviyesi, tamamlama_yuzdesi, gecikmis_gorev, gun_gecti, hic_baslamadi, net_farki, guncel_seri, haftalik_gorev, dun_tam, eksik_ust_uste')
              .eq('ogrenci_id', ogrenci.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        supabase
          .from('seriler')
          .select('guncel_seri, son_aktif_gun')
          .eq('ogrenci_id', ogrenci.id)
          .maybeSingle(),
        // Kısayolların yanındaki sayılar: basmadan da bilgi versinler.
        supabase
          .from('ogrenci_rozet')
          .select('rozet_id', { count: 'exact', head: true })
          .eq('ogrenci_id', ogrenci.id),
        kocGorunumu
          ? supabase
              .from('veli_ogrenci')
              .select('veli_id', { count: 'exact', head: true })
              .eq('ogrenci_id', ogrenci.id)
          : Promise.resolve({ count: 0 }),
      ])
      if (!iptal) {
        const yeni = {
          risk: r.data,
          seri: seriDuzelt(s.data),
          rozet: rz.count ?? 0,
          veli: v.count ?? 0,
        }
        setEk(yeni)
        /* Ölçümler ayrı bileşende; aynı veriyi ikinci kez çekmesin. */
        onEk?.(yeni)
      }
    })()
    return () => {
      iptal = true
    }
  }, [ogrenci.id, kocGorunumu]) // eslint-disable-line react-hooks/exhaustive-deps

  const ad = ogrenci.profiller?.ad_soyad ?? 'İsimsiz'

  const cipler = [
    ogrenci.sinif ? (ogrenci.sinif === 13 ? 'Mezun' : `${ogrenci.sinif}. sınıf`) : null,
    ogrenci.alan ? ALAN_ADI[ogrenci.alan] : null,
  ].filter(Boolean)

  const gosterilenNet =
    netDurumu?.tyt?.son_net ?? netDurumu?.ayt?.son_net ?? null
  const riskSeviyesi = ek?.risk?.risk_seviyesi ?? null
  const yuzde = ek?.risk?.tamamlama_yuzdesi
  const kalan = kalanGun()

  /* Uyarı cümlesi liste satırındakiyle aynı üretici: koç listede ne
     okuduysa detayda da onu görür. Sorun yoksa satır hiç çizilmez. */
  const uyari = ek?.risk ? sebepCumlesi(ek.risk) : null
  const uyariVar =
    ek?.risk &&
    (ek.risk.hic_baslamadi || ek.risk.gun_gecti >= 2 || ek.risk.gecikmis_gorev > 0 ||
      ek.risk.eksik_ust_uste >= 2 || Number(ek.risk.net_farki ?? 0) <= -5)

  return (
      <div className={`hero-yuzey kimlik-kart kk-sade${kocGorunumu && !aktif ? ' kimlik-kart--kapali' : ''}`}>
        <div className="kk-ust">
          <Avatar yol={ogrenci.profiller?.fotograf_yolu} ad={ad} boyut="buyuk" />
          <div className="kk-kimlik">
            <h2 className="kk-ad">{ad}</h2>
            <p className="kk-alt-satir">{cipler.join(' · ') || '—'}</p>
          </div>
          {kocGorunumu && riskSeviyesi && (
            <span className={`kk-cip kk-risk kk-risk--${riskSeviyesi}`}>
              <i className="kk-nokta" aria-hidden="true" />
              {RISK_ADI[riskSeviyesi] ?? riskSeviyesi}
            </span>
          )}
        </div>

        {/* Tek sayı: haftalık hedef. Ölçümlerin gerisi Program sekmesinde. */}
        <div className="kk-hero">
          <span className="kk-hero-sayi">{yuzde != null ? `%${yuzde}` : '—'}</span>
          <span className="kk-hero-ad">
            haftalık hedef{kalan > 0 ? ` · ${kalan} gün kaldı` : ' · haftanın son günü'}
          </span>
        </div>

        {kocGorunumu && aktif && uyariVar && (
          <p className="kk-uyari">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
                 strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7.5v5M12 16.2v.2" />
            </svg>
            {uyari}
          </p>
        )}

        {kocGorunumu && !aktif && (
          <p className="kk-kapali">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
                 strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <rect x="4" y="11" width="16" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            Uygulama erişimi kapalı
          </p>
        )}

        {kocGorunumu && (
          <div className="kk-eylem-satir">
            <button className="kk-ana-eylem" onClick={() => onMesaj?.(ogrenci.id)}>
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor"
                   strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
              Mesaj gönder
            </button>

            <button
              className="kk-ikon kk-goz"
              onClick={() => onGozuyle?.(ogrenci.id)}
              aria-label="Panelini aç (vekaleten)"
              title="Panelini aç"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
                   strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </div>
        )}
      </div>
  )
}

/**
 * Kartın altındaki ölçümler: hedef üniversite, TYT/AYT hedef çubukları
 * ve üç kutu. Kimlik kartından ayrıldı; Program sekmesinin tepesinde
 * durur. Kartın üstünde "ne yapmalıyım", burada "nasıl gidiyor".
 */
export function KimlikOlcumleri({ ogrenci, netDurumu, netFarki, seri, tamamlama, rozet, onRozetler }) {
  const hedefler = [
    { ad: 'TYT', hedef: ogrenci.hedef_tyt_net, d: netDurumu?.tyt },
    { ad: 'AYT', hedef: ogrenci.hedef_ayt_net, d: netDurumu?.ayt },
  ]
    .filter((h) => h.hedef != null)
    .map((h) => {
      const hedef = Number(h.hedef)
      const son = h.d?.son_net != null ? Number(h.d.son_net) : null
      const enIyi = h.d?.en_yuksek_net != null ? Number(h.d.en_yuksek_net) : null
      return {
        ad: h.ad,
        hedef,
        son,
        oran: son != null && hedef > 0 ? Math.min(100, Math.max(0, (son / hedef) * 100)) : 0,
        enIyiOran:
          enIyi != null && enIyi > (son ?? 0) && hedef > 0
            ? Math.min(100, (enIyi / hedef) * 100)
            : null,
        kalan: son != null ? hedef - son : null,
      }
    })
  const gosterilenNet =
    netDurumu?.tyt?.son_net ?? netDurumu?.ayt?.son_net ?? null

  return (
    <section className="kart olcumler">
      {ogrenci.hedef_universite || ogrenci.hedef_bolum ? (
        <p className="olcum-varis">
          {[ogrenci.hedef_universite, ogrenci.hedef_bolum].filter(Boolean).join(' · ')}
        </p>
      ) : null}

      <div className="kk-kutular">
        <Kutu
          renk="var(--marka-yesil-acik)"
          deger={tamamlama != null ? `%${tamamlama}` : '—'}
          ad="Tamamlama"
          cizim={<path d="M20 6 9 17l-5-5" />}
        />
        <Kutu
          renk="var(--fosfor)"
          deger={seri ?? '—'}
          ad="Gün seri"
          cizim={<path d="M12 3c1.5 3.5-1 5-1 7a3 3 0 0 0 6 0c0-1-.4-2-1-2.7 2.5 1.4 4 3.9 4 6.7a8 8 0 1 1-13.3-6C8.4 6.4 10.6 4.6 12 3Z" />}
        />
        <Kutu
          renk="var(--dolgu)"
          deger={gosterilenNet != null ? Number(gosterilenNet).toFixed(2) : '—'}
          ad="Son net"
          fark={netFarki}
          cizim={<path d="m3 17 5-6 4 4 5-7 4 5" />}
        />
      </div>

      {onRozetler && (
        <button className="olcum-rozet" onClick={onRozetler}>
          <span>{rozet != null ? `${rozet} rozet` : 'Rozetler'}</span>
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
               strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>
      )}

      {hedefler.map((h) => (
        <div className="olcum-hedef" key={h.ad}>
          <div className="olcum-hedef-satir">
            <span className="olcum-hedef-etiket">
              {h.ad} hedefi · {h.son != null ? h.son.toFixed(2) : '—'} / {h.hedef.toFixed(2)}
            </span>
            <span className="olcum-hedef-deger">
              {h.kalan == null ? 'deneme yok' : h.kalan <= 0 ? 'hedefe ulaştı' : `${h.kalan.toFixed(2)} net kaldı`}
            </span>
          </div>
          <div className="olcum-cubuk" role="img" aria-label={`${h.ad} hedefine %${Math.round(h.oran)} ulaşıldı`}>
            <span style={{ width: `${h.oran}%` }} />
            {h.enIyiOran != null && (
              <i className="olcum-eniyi" style={{ left: `${h.enIyiOran}%` }} aria-hidden="true" />
            )}
          </div>
        </div>
      ))}
    </section>
  )
}

function Kutu({ renk, deger, ad, cizim, fark }) {
  /* Bir önceki denemeye göre değişim. Sıfırsa yazmıyoruz: "±0.00"
     bilgi vermeden yer kaplıyor. */
  const yon = fark == null || fark === 0 ? null : fark > 0 ? 'artis' : 'dusus'
  return (
    <div className="kk-kutu">
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke={renk}
           strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {cizim}
      </svg>
      <span className="kk-kutu-deger">{deger}</span>
      <span className="kk-kutu-ad">
        {ad}
        {yon && (
          <span className={`kk-fark kk-fark--${yon}`}>
            {yon === 'artis' ? '▲' : '▼'} {Math.abs(fark).toFixed(2)}
          </span>
        )}
      </span>
    </div>
  )
}
