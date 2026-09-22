import { HizliMesaj } from './OgrenciDetayParcalari.jsx'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import AnaTepe from '../ortak/AnaTepe.jsx'
import { PortreCizimi } from '../ortak/KapiCizimleri.jsx'
import { useFotograf } from './Fotograf.jsx'
import { AltSayfa, Dugme, Uyari } from './Ortak.jsx'
import { temasMetni } from '../lib/temas.js'
import { hataMetni } from '../lib/supabase.js'

const ALAN_ADI = { sayisal: 'Sayısal', esit_agirlik: 'Eşit Ağırlık', sozel: 'Sözel', dil: 'Dil' }
const RISK_ADI = { iyi: 'Yolunda', izle: 'İzle', acil: 'Önce bu' }

const kapaliSinifi = (koc, aktif) => (koc && !aktif ? ' kimlik-kart--kapali' : '')


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
  tepe = {},
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
  const [mesajAcik, setMesajAcik] = useState(false)
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

  const riskSeviyesi = ek?.risk?.risk_seviyesi ?? null
  const yuzde = ek?.risk?.tamamlama_yuzdesi


  /* Kart eskiden yarım ekran yiyordu: büyük avatar, 2.3rem'lik yüzde,
     tam genişlik amber düğme, ayrıca sağ üstte risk çipi ve altında aynı
     şeyi söyleyen uyarı satırı. Şimdi üç satır: kimlik, tek satır ölçüm,
     durum + eylem. Geri düğmesi de kartın içine alındı; üstünde ayrı bir
     "← Öğrenci listesi" satırı duruyordu. */
  /* Mevsimsel tasarım (22 Eylül 2026, Bekir'in onayladığı mokap): tepe
     diğer koç ekranlarıyla aynı sahne. Sağda ağaçların önünde öğrencinin
     tabelası; adın altında sınıf/alan (dokununca profil), durum etiketi.
     Altta tek satır eylem (Mesaj, Görüştük, gözüyle), üç ölçü şeridi ve
     bölüm anahtarı (children). */
  /* Durum etiketi tek kısa bilgi (22 Eylül 2026, Bekir): en önemlisi
     hangisiyse o. Uzun açıklama karar kartında ve listede duruyor. */
  const r = ek?.risk
  const temasBugun = temas?.zaman && new Date(temas.zaman).toDateString() === new Date().toDateString()
  const TEMAS_KISA = { atildi: 'Bugün mesaj attın', gorusuldu: 'Bugün görüştünüz', yanit: 'Mesajına yanıt verdi', hareket: 'Mesajdan sonra çalıştı' }
  let durumMetni = null
  let durumTuru = riskSeviyesi
  if (!aktif) { durumMetni = 'Erişim kapalı'; durumTuru = 'kapali' }
  else if (temasBugun && TEMAS_KISA[temas.durum]) { durumMetni = TEMAS_KISA[temas.durum]; durumTuru = 'temas' }
  else if (r?.hic_baslamadi) durumMetni = 'Hiç başlamadı'
  else if ((r?.gun_gecti ?? 0) >= 2) durumMetni = `${r.gun_gecti} gündür yok`
  else if ((r?.gecikmis_gorev ?? 0) > 0) durumMetni = `${r.gecikmis_gorev} iş gecikti`
  else if ((r?.eksik_ust_uste ?? 0) >= 2) durumMetni = `${r.eksik_ust_uste} gündür eksik`
  else if (Number(r?.net_farki ?? 0) <= -5) durumMetni = `Son deneme ${Math.round(Number(r.net_farki))} net`
  else if (riskSeviyesi) durumMetni = RISK_ADI[riskSeviyesi] === 'Önce bu' ? 'Dikkat' : RISK_ADI[riskSeviyesi]
  const foto = useFotograf(ogrenci.profiller?.fotograf_yolu)
  const basHarf = ad.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toLocaleUpperCase('tr')
  const bugunTarih = new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^(\d+ \S+) (\S+)$/, '$2, $1')

  return (
    <>
      <AnaTepe
        selam={ad}
        tarih={bugunTarih}
        {...tepe}
        onGeri={onGeri}
        onBaslik={kocGorunumu ? onProfil : null}
        altBaslik={[cipler.join(', '), yuzde != null ? `son 7 gün %${Math.round(yuzde)}` : null].filter(Boolean).join(' · ') || null}
        sagCizim={(mevsim) => (
          <button type="button" className="od-portre" onClick={kocGorunumu ? onProfil : undefined} aria-label={`${ad} profilini aç`}>
            <PortreCizimi mevsim={mevsim} foto={foto} bas={basHarf} durum={riskSeviyesi} idEk={ogrenci.id.slice(0, 8)} />
          </button>
        )}
        /* Eylemler durumun yanında küçük haplar (22 Eylül 2026, Bekir):
           telefon (Görüştük) kalktı; göz ve mesaj etiketin yanında; mesaj
           açılır pencerede yazılır. */
        durum={kocGorunumu && durumMetni ? <span className={`od-durum od-durum--${durumTuru}`}><i />{durumMetni}</span> : null}
        /* Göz ve mesaj üst satırda, zilin yanında (22 Eylül 2026, Bekir). */
        ekDugme={kocGorunumu ? (
          <>
            <button type="button" className="ana-yuvarlak" onClick={() => onGozuyle?.(ogrenci.id)} aria-label="Onun gözünden bak" title="Onun gözünden bak">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>
            </button>
            <button type="button" className="ana-yuvarlak" onClick={() => setMesajAcik(true)} aria-label="Mesaj yaz" title="Mesaj yaz">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z" /></svg>
            </button>
          </>
        ) : null}
      />
      {children && <div className="od-ust ana-govde ana-govde--dar">{children}</div>}
      {mesajAcik && (
        <HizliMesaj ogrenciId={ogrenci.id} ad={ad} onKapat={() => setMesajAcik(false)} onTumu={() => { setMesajAcik(false); onMesaj?.(ogrenci.id) }} />
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
    </>
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
