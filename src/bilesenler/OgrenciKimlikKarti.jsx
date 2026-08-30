import { useCallback, useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Avatar } from './Fotograf.jsx'

const ALAN_ADI = { sayisal: 'Sayısal', esit_agirlik: 'Eşit Ağırlık', sozel: 'Sözel', dil: 'Dil' }
const RISK_ADI = { iyi: 'Yolunda', izle: 'İzlemede', acil: 'Acil' }

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
  duzenleAcik,
  onDuzenle,
  onDegisti,
  sekme,
  onSekme,
}) {
  /* Aynı kart, iki farklı okuyucu. Görsel dil ortak; içerik değil.
     Öğrenci kendi kartında erişim anahtarını, düzenleme çarkını ve risk
     seviyesini görmez: ilk ikisi koçun yetkisi, üçüncüsü koçun öğrenci
     hakkındaki değerlendirmesi. "Acil" etiketini öğrenciye göstermek
     yardımcı olmaz. */
  const kocGorunumu = rol === 'koc'
  const [ek, setEk] = useState(null)
  const [aktif, setAktif] = useState(ogrenci.aktif)
  const [kaydediyor, setKaydediyor] = useState(false)
  const [hata, setHata] = useState('')

  useEffect(() => setAktif(ogrenci.aktif), [ogrenci.aktif])

  useEffect(() => {
    let iptal = false
    ;(async () => {
      const [r, s, rz, v] = await Promise.all([
        kocGorunumu
          ? supabase
              .from('ogrenci_risk')
              .select('risk_seviyesi, tamamlama_yuzdesi, gecikmis_gorev, gun_gecti, hic_baslamadi')
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
        setEk({
          risk: r.data,
          seri: seriDuzelt(s.data),
          rozet: rz.count ?? 0,
          veli: v.count ?? 0,
        })
      }
    })()
    return () => {
      iptal = true
    }
  }, [ogrenci.id, kocGorunumu])

  const erisimDegistir = useCallback(
    async (yeni) => {
      if (!yeni && !window.confirm('Öğrencinin uygulama erişimi durdurulsun mu? Verileri silinmez.')) {
        return
      }
      setAktif(yeni) // iyimser: anahtar anında tepki versin
      setKaydediyor(true)
      setHata('')
      const { error } = await supabase.from('ogrenciler').update({ aktif: yeni }).eq('id', ogrenci.id)
      setKaydediyor(false)
      if (error) {
        setAktif(!yeni)
        setHata(hataMetni(error))
        return
      }
      await onDegisti?.()
    },
    [ogrenci.id, onDegisti],
  )

  const ad = ogrenci.profiller?.ad_soyad ?? 'İsimsiz'
  const telefon = ogrenci.profiller?.telefon

  const cipler = [
    ogrenci.sinif ? (ogrenci.sinif === 13 ? 'Mezun' : `${ogrenci.sinif}. sınıf`) : null,
    ogrenci.alan ? ALAN_ADI[ogrenci.alan] : null,
  ].filter(Boolean)

  /* Hedef çubukları: hangi hedef girilmişse o çıkar. Mezun ve 12. sınıfta
     AYT en az TYT kadar belirleyici; tek çubuk göstermek bilgi saklıyordu. */
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
        // En iyi net çubuk üstünde ince bir çentik: sayı yazmadan tavanı gösteriyor.
        enIyiOran:
          enIyi != null && enIyi > (son ?? 0) && hedef > 0
            ? Math.min(100, (enIyi / hedef) * 100)
            : null,
        kalan: son != null ? hedef - son : null,
      }
    })

  const gosterilenNet =
    netDurumu?.tyt?.son_net ?? netDurumu?.ayt?.son_net ?? null
  const gecikmis = Number(ek?.risk?.gecikmis_gorev ?? 0)
  const riskSeviyesi = ek?.risk?.risk_seviyesi ?? null

  return (
    <>
      <div className={`kimlik-kart${kocGorunumu && !aktif ? ' kimlik-kart--kapali' : ''}`}>
        <div className="kk-ust">
          <Avatar yol={ogrenci.profiller?.fotograf_yolu} ad={ad} boyut="buyuk" />

          <div className="kk-kimlik">
            <h2 className="kk-ad">{ad}</h2>
            <div className="kk-cipler">
              {cipler.map((c) => (
                <span key={c} className="kk-cip">
                  {c}
                </span>
              ))}
              {kocGorunumu && riskSeviyesi && (
                <span className={`kk-cip kk-risk kk-risk--${riskSeviyesi}`}>
                  <i className="kk-nokta" aria-hidden="true" />
                  {RISK_ADI[riskSeviyesi] ?? riskSeviyesi}
                </span>
              )}
            </div>
          </div>

          {kocGorunumu && (
          <div className="kk-eylem">
            <label className="anahtar" title={aktif ? 'Uygulama erişimi açık' : 'Uygulama erişimi kapalı'}>
              <input
                type="checkbox"
                checked={aktif}
                disabled={kaydediyor}
                onChange={(e) => erisimDegistir(e.target.checked)}
                aria-label="Uygulama erişimi"
              />
              <span className="anahtar-kizak" />
            </label>

            <div className="kk-ikonlar">
              {telefon && (
                <a className="kk-ikon" href={`tel:${telefon.replace(/\s/g, '')}`} aria-label={`${ad} — ara`}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
                       strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.8a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.8 2.1Z" />
                  </svg>
                </a>
              )}
              <button
                className={`kk-ikon${duzenleAcik ? ' kk-ikon--etkin' : ''}`}
                onClick={onDuzenle}
                aria-label={duzenleAcik ? 'Düzenlemeyi kapat' : 'Öğrenciyi düzenle'}
                aria-pressed={duzenleAcik}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
                     strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.5.6.87 1.13.91H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
                </svg>
              </button>
            </div>
          </div>
          )}
        </div>

        {ogrenci.hedef_universite || ogrenci.hedef_bolum ? (
          <p className="kk-varis">
            {[ogrenci.hedef_universite, ogrenci.hedef_bolum].filter(Boolean).join(' · ')}
          </p>
        ) : null}

        {hedefler.map((h) => (
          <div className="kk-hedef" key={h.ad}>
            <div className="kk-hedef-satir">
              <span className="kk-hedef-etiket">
                {h.ad} hedefi · {h.son != null ? h.son.toFixed(2) : '—'} / {h.hedef.toFixed(2)}
              </span>
              <span className="kk-hedef-deger">
                {h.kalan == null
                  ? 'deneme yok'
                  : h.kalan <= 0
                    ? 'hedefe ulaştı'
                    : `${h.kalan.toFixed(2)} net kaldı`}
              </span>
            </div>
            <div
              className="kk-cubuk"
              role="img"
              aria-label={`${h.ad} hedefine %${Math.round(h.oran)} ulaşıldı`}
            >
              <span style={{ width: `${h.oran}%` }} />
              {h.enIyiOran != null && (
                <i className="kk-eniyi" style={{ left: `${h.enIyiOran}%` }} aria-hidden="true" />
              )}
            </div>
          </div>
        ))}

        {kocGorunumu && gecikmis > 0 && (
          <p className="kk-gecikme">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
                 strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7.5v5M12 16.2v.2" />
            </svg>
            {gecikmis} görev gecikti
          </p>
        )}

        {onSekme && (
          /* Gezinme kısayolları. Sağ üstteki ikonlardan bilerek ayrı:
             oradakiler kaydı değiştiriyor, buradakiler ekran açıyor. */
          <div className="kk-kisayol">
            <button
              className={`kk-yol${sekme === 'rozetler' ? ' kk-yol--etkin' : ''}`}
              onClick={() => onSekme('rozetler')}
              aria-pressed={sekme === 'rozetler'}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
                   strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="9" r="5.5" />
                <path d="m8.5 13.8-1.4 6.4 4.9-2.6 4.9 2.6-1.4-6.4" />
              </svg>
              <span className="kk-yol-sayi">{ek?.rozet ?? '—'}</span>
              <span className="kk-yol-ad">Rozet</span>
            </button>

            {kocGorunumu && (
            <button
              className={`kk-yol${sekme === 'veli' ? ' kk-yol--etkin' : ''}`}
              onClick={() => onSekme('veli')}
              aria-pressed={sekme === 'veli'}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
                   strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M16 20v-1.6a3.4 3.4 0 0 0-3.4-3.4H6.4A3.4 3.4 0 0 0 3 18.4V20" />
                <circle cx="9.5" cy="7.5" r="3.4" />
                <path d="M17 4.2a3.4 3.4 0 0 1 0 6.6M21 20v-1.6a3.4 3.4 0 0 0-2.6-3.3" />
              </svg>
              <span className="kk-yol-sayi">{ek?.veli ?? '—'}</span>
              <span className="kk-yol-ad">Veli</span>
            </button>
            )}
          </div>
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
      </div>

      {hata && <p className="uyari uyari--hata">{hata}</p>}

      <div className="kk-kutular">
        {kocGorunumu ? (
          <Kutu
            renk="var(--marka-yesil-acik)"
            deger={ek?.risk?.tamamlama_yuzdesi != null ? `%${ek.risk.tamamlama_yuzdesi}` : '—'}
            ad="Tamamlama"
            cizim={<path d="M20 6 9 17l-5-5" />}
          />
        ) : (
          /* Öğrenciye tamamlama yüzdesi yerine bugün çalıştığı süre:
             geçmişin özeti değil, bugün etki edebileceği sayı. */
          <Kutu
            renk="var(--marka-yesil-acik)"
            deger={ozet?.calismaDkBugun ? `${ozet.calismaDkBugun}dk` : '0dk'}
            ad="Bugün"
            cizim={<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 1.8" /></>}
          />
        )}
        <Kutu
          renk="var(--fosfor)"
          deger={kocGorunumu ? (ek ? ek.seri : '—') : (ozet?.guncelSeri ?? 0)}
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
    </>
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
