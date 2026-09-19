import Sayan from './Sayan.jsx'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { Avatar } from './Fotograf.jsx'
import { sebepCumlesi } from './OgrenciSatiri.jsx'
import UstBlok from '../ortak/UstBlok.jsx'
import UyariSatiri from '../ortak/UyariSatiri.jsx'
import { AltSayfa, Dugme, Uyari } from './Ortak.jsx'
import { temasMetni } from '../lib/temas.js'
import { hataMetni } from '../lib/supabase.js'

const ALAN_ADI = { sayisal: 'Sayısal', esit_agirlik: 'Eşit Ağırlık', sozel: 'Sözel', dil: 'Dil' }
const RISK_ADI = { iyi: 'Yolunda', izle: 'İzle', acil: 'Önce bu' }

const kapaliSinifi = (koc, aktif) => (koc && !aktif ? ' kimlik-kart--kapali' : '')

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
  onGeri,
  onMesaj,
  onGozuyle,
  onProfil,
  onEk,
  children,
}) {
  /* Aynı kart, iki farklı okuyucu. Görsel dil ortak; içerik değil.
     Öğrenci kendi kartında erişim anahtarını, düzenleme çarkını ve risk
     seviyesini görmez: ilk ikisi koçun yetkisi, üçüncüsü koçun öğrenci
     hakkındaki değerlendirmesi. "Acil" etiketini öğrenciye göstermek
     yardımcı olmaz. */
  const kocGorunumu = rol === 'koc'
  const [ek, setEk] = useState(null)
  const [temas, setTemas] = useState(null)
  const [gorusmeAcik, setGorusmeAcik] = useState(false)
  const aktif = ogrenci.aktif

  /* Koçun son teması; liste satırıyla aynı cümle. "Görüştük" sonrası
     yeniden okunur. */
  const temasYukle = useCallback(async () => {
    if (!kocGorunumu) return
    const { data } = await supabase.rpc('koc_temas_durumlari')
    setTemas((data ?? []).find((t) => t.ogrenci_id === ogrenci.id) ?? null)
  }, [kocGorunumu, ogrenci.id])

  useEffect(() => {
    temasYukle()
  }, [temasYukle])

  useEffect(() => {
    let iptal = false
    ;(async () => {
      const [r, s, v] = await Promise.all([
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

  /* Kart eskiden yarım ekran yiyordu: büyük avatar, 2.3rem'lik yüzde,
     tam genişlik amber düğme, ayrıca sağ üstte risk çipi ve altında aynı
     şeyi söyleyen uyarı satırı. Şimdi üç satır: kimlik, tek satır ölçüm,
     durum + eylem. Geri düğmesi de kartın içine alındı; üstünde ayrı bir
     "← Öğrenci listesi" satırı duruyordu. */
  return (
      <UstBlok
        sinif={`kimlik-kart kk-sade${kapaliSinifi(kocGorunumu, aktif)}`}
        etiket={ad}
        sekmeli={Boolean(children)}
      >
        <div className="kk-ust">
          {onGeri && (
            <button className="kk-geri" onClick={onGeri} aria-label="Öğrenci listesine dön">
              <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor"
                   strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}
          {/* Koç isme dokununca öğrencinin profil sayfası açılır (iletişim,
              veli, bilgiler, ödeme, hesap). Eski "Kayıt" sekmesinin yeri. */}
          {kocGorunumu && onProfil ? (
            <button
              type="button"
              className="kk-kimlik-dugme"
              onClick={onProfil}
              aria-label={`${ad} profilini aç`}
            >
              <Avatar yol={ogrenci.profiller?.fotograf_yolu} ad={ad} boyut="orta" />
              <span className="kk-kimlik">
                <span className="kk-ad">{ad}</span>
                <span className="kk-alt-satir">
                  {cipler.join(' · ') || '—'}
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
                       strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </span>
              </span>
            </button>
          ) : (
            <>
              <Avatar yol={ogrenci.profiller?.fotograf_yolu} ad={ad} boyut="orta" />
              <div className="kk-kimlik">
                <h2 className="kk-ad">{ad}</h2>
                <p className="kk-alt-satir">{cipler.join(' · ') || '—'}</p>
              </div>
            </>
          )}
          {kocGorunumu && (
            <button
              className="kk-ikon kk-goz"
              onClick={() => onGozuyle?.(ogrenci.id)}
              aria-label="Panelini aç (vekaleten)"
              title="Panelini aç"
            >
              <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor"
                   strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          )}
        </div>

        {/* Haftalık hedef, seri ve son net tek satırda. */}
        <p className="kk-durum">
          <span className="kk-hero-sayi">{yuzde != null ? <Sayan on="%" deger={yuzde} /> : '—'}</span>
          <span className="kk-hero-ad">
            haftalık hedef{kalan > 0 ? ` · ${kalan} gün` : ' · son gün'}
            {' · '}{ek?.seri ?? 0} gün seri
            {' · '}son net {gosterilenNet != null ? Number(gosterilenNet).toFixed(2) : '—'}
            {netFarki != null && netFarki !== 0 && (
              <i className={`kk-fark kk-fark--${netFarki > 0 ? 'artis' : 'dusus'}`}>
                {netFarki > 0 ? '▲' : '▼'} {Math.abs(netFarki).toFixed(2)}
              </i>
            )}
          </span>
        </p>

        {/* Risk çipi ile uyarı cümlesi aynı şeyi söylüyordu; tek satır oldu.
            Eylem düğmesi de bu satırın sağında: kendi satırını yemiyor. */}
        {kocGorunumu && (
          <div className="kk-son-satir">
            {/* Kural 7: durum hapın içinde değil, nokta + düz metin. */}
            {!aktif ? (
              <UyariSatiri durum="kapali">Uygulama erişimi kapalı</UyariSatiri>
            ) : riskSeviyesi ? (
              <UyariSatiri durum={riskSeviyesi}>
                {uyariVar && uyari
                  ? `${riskSeviyesi === 'acil' ? '' : `${RISK_ADI[riskSeviyesi] ?? riskSeviyesi} · `}${uyari}`
                  : (RISK_ADI[riskSeviyesi] ?? riskSeviyesi)}
                {temasMetni(temas) ? <span className={`kk-temas kk-temas--${temas.durum}`}>{temasMetni(temas)}</span> : null}
              </UyariSatiri>
            ) : (
              <span />
            )}

            <button
              className="kk-ikon kk-gorustuk"
              onClick={() => setGorusmeAcik(true)}
              aria-label="Görüştük: telefon ya da yüz yüze görüşmeyi kaydet"
              title="Görüştük"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
                   strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
              </svg>
            </button>
            <button className="kk-ana-eylem" onClick={() => onMesaj?.(ogrenci.id)}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
                   strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
              Mesaj
            </button>
          </div>
        )}
        {gorusmeAcik && (
          <GorusmeKaydi
            ogrenciId={ogrenci.id}
            ad={ad}
            onKapat={() => setGorusmeAcik(false)}
            onKaydedildi={() => {
              setGorusmeAcik(false)
              temasYukle()
            }}
          />
        )}
        {/* Sekmeler bloğun alt kenarına oturur (kural 3–4). */}
        {children}
      </UstBlok>
  )
}

/* "Görüştük": telefon ya da yüz yüze konuşma. Sistem telefonu bilemez;
   koç tek dokunuşla işaretler, isterse bir satır not düşer. Kayıt
   mesajla aynı temas kaydına girer: öğrenci listede sönükleşir, Bugün'deki
   mesaj kartı kapanır, toplu mesaj ona gitmez. */
function GorusmeKaydi({ ogrenciId, ad, onKapat, onKaydedildi }) {
  const [tur, setTur] = useState('telefon')
  const [not, setNot] = useState('')
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState('')

  async function kaydet() {
    setBekliyor(true)
    setHata('')
    const { error } = await supabase.rpc('koc_gorustum', { p_ogrenci: ogrenciId, p_tur: tur, p_not: not })
    setBekliyor(false)
    if (error) {
      setHata(hataMetni(error))
      return
    }
    onKaydedildi()
  }

  return (
    <AltSayfa
      baslik="Görüştük"
      altBaslik={`${ad.split(' ')[0]} ile konuştuğunu kaydet`}
      onKapat={onKapat}
      dugmeler={
        <Dugme bekliyor={bekliyor} onClick={kaydet}>
          Kaydet
        </Dugme>
      }
    >
      <Uyari>{hata}</Uyari>
      <div className="gorusme-tur" role="radiogroup" aria-label="Görüşme türü">
        {[['telefon', 'Telefonda'], ['yuz_yuze', 'Yüz yüze']].map(([k, etiket]) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={tur === k}
            className={`tur-cip${tur === k ? ' tur-cip--etkin' : ''}`}
            onClick={() => setTur(k)}
          >
            {etiket}
          </button>
        ))}
      </div>
      <textarea
        className="kuyruk-alan"
        rows={2}
        maxLength={300}
        value={not}
        onChange={(e) => setNot(e.target.value)}
        placeholder="İstersen kısa bir not (ör. hastaymış, pazartesi başlıyor)"
        aria-label="Görüşme notu"
      />
    </AltSayfa>
  )
}
