import { useCallback, useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Alan, AltSayfa, Bos, Dugme, Kart, Uyari, Yukleniyor } from '../bilesenler/Ortak.jsx'
import KaynakSecici from '../bilesenler/KaynakSecici.jsx'
import KapsamSecimi from '../bilesenler/KapsamSecimi.jsx'
import OgrenciKaynaklari from '../bilesenler/OgrenciKaynaklari.jsx'
import { FotografYukle } from '../bilesenler/Fotograf.jsx'
import ProgramIzgarasi from '../bilesenler/ProgramIzgarasi.jsx'
import DenemePaneli from '../bilesenler/DenemePaneli.jsx'
import OgrenciKimlikKarti, { KimlikOlcumleri } from '../bilesenler/OgrenciKimlikKarti.jsx'
import KonuYolu from '../bilesenler/KonuYolu.jsx'
import { aksanStili } from '../lib/sekmeAksani.js'
import Sekmeler from '../ortak/Sekmeler.jsx'
import Bolum from '../ortak/Bolum.jsx'
import UstBlok from '../ortak/UstBlok.jsx'
import { Avatar } from '../bilesenler/Fotograf.jsx'
import BosDurum from '../ortak/BosDurum.jsx'
import KatalogSec, { OGRENCI_GUNCELLENDI } from '../bilesenler/KatalogSec.jsx'
import SifreSifirla from '../bilesenler/SifreSifirla.jsx'
import { kullaniciSil } from '../lib/hesap.js'
import { ADETLI_TURLER, GOREV_TUR_ADI } from '../lib/gorevTuru.js'
import { dersleriGrupla, dersKapsamAdi, kapsamEtiketi } from '../lib/dersGruplari.js'

const ALAN_ADI = { sayisal: 'Sayısal', esit_agirlik: 'Eşit Ağırlık', sozel: 'Sözel', dil: 'Dil' }
const DURUM_ADI = { bekliyor: 'Bekliyor', devam: 'Devam ediyor', tamamlandi: 'Tamamlandı', atlandi: 'Atlandı' }
export default function OgrenciDetay({ ogrenciId, onGeri, onMesaj, onGozuyle }) {
  const [ogrenci, setOgrenci] = useState(null)
  const [netDurumu, setNetDurumu] = useState(null)
  const [kataloglar, setKataloglar] = useState([])
  const [sekme, setSekme] = useState('program')
  const [profil, setProfil] = useState(false)
  const [duzenle, setDuzenle] = useState(false)
  const [hata, setHata] = useState('')

  const yukle = useCallback(async () => {
    const { data, error } = await supabase
      .from('ogrenciler')
      .select(
        'id, koc_id, alan, sinif, katalog_id, aktif, sinav_tarihi, hedef_universite, hedef_bolum, hedef_tyt_net, hedef_ayt_net, kayit_tarihi, profiller!ogrenciler_id_fkey(ad_soyad, telefon, fotograf_yolu), kataloglar(id, ad)',
      )
      .eq('id', ogrenciId)
      .maybeSingle()
    if (error) setHata(hataMetni(error))
    setOgrenci(data)

    const { data: nd } = await supabase
      .from('ogrenci_net_durumu')
      .select('tur, son_net, en_yuksek_net')
      .eq('ogrenci_id', ogrenciId)
    setNetDurumu(Object.fromEntries((nd ?? []).map((x) => [x.tur, x])))
  }, [ogrenciId])

  // Katalog boş durumdan seçilince öğrenciyi yeniden yükle (KatalogSec)
  useEffect(() => {
    const tazele = (e) => { if (e.detail === ogrenciId) yukle() }
    window.addEventListener(OGRENCI_GUNCELLENDI, tazele)
    return () => window.removeEventListener(OGRENCI_GUNCELLENDI, tazele)
  }, [ogrenciId, yukle])

  useEffect(() => {
    yukle()
    supabase
      .from('kataloglar')
      .select('id, ad, alan, seviye')
      .is('koc_id', null)
      .order('sira')
      .then(({ data }) => setKataloglar(data ?? []))
  }, [yukle])

  // Masaüstünde yan sütunda başka öğrenci seçilince bileşen yeniden
  // kurulmuyor; açık kalan profil/sekme önceki öğrenciden taşınmasın.
  useEffect(() => {
    setProfil(false)
    setDuzenle(false)
    setSekme('program')
  }, [ogrenciId])

  if (hata) return <Uyari>{hata}</Uyari>
  if (!ogrenci) return <Yukleniyor />

  const ad = ogrenci.profiller?.ad_soyad ?? 'İsimsiz'

  if (profil) {
    return (
      <ProfilSayfasi
        ogrenci={ogrenci}
        kataloglar={kataloglar}
        duzenle={duzenle}
        setDuzenle={setDuzenle}
        yukle={yukle}
        onKapat={() => { setProfil(false); setDuzenle(false) }}
        onSilindi={onGeri}
      />
    )
  }

  return (
    <div className="panel">
      {/* Geri artık kartın sol üstünde: tek satırlık "← Öğrenci listesi"
          bandı kaldırıldı. */}
      <OgrenciKimlikKarti
        ogrenci={ogrenci}
        netDurumu={netDurumu}
        onGeri={onGeri}
        onMesaj={onMesaj}
        onGozuyle={onGozuyle}
        onProfil={() => setProfil(true)}
      >
        {/* Sekmeler üst bloğun içinde, alt kenarda (TASARIM-KURALLARI 3–4).
            Eskiden bloğun altında dört ayrı kutu düğmeydi. */}
        <Sekmeler
          varyant="koyu"
          etiket="Öğrenci bölümleri"
          deger={sekme}
          onSec={setSekme}
          secenekler={[
            { k: 'program', ad: 'Program' },
            { k: 'denemeler', ad: 'Denemeler' },
            { k: 'konular', ad: 'Konular' },
          ]}
        />
      </OgrenciKimlikKarti>

      <div className="sekme-govde" style={aksanStili()}>
      {sekme === 'program' && (
        <>
          <KimlikOlcumleri ogrenci={ogrenci} netDurumu={netDurumu} />
          <Program ogrenci={ogrenci} />
          {/* Programın ve rutinlerin altında: bu öğrenciye hangi kitapları
              vermişim. Yeni görev yazarken elindekine bakmak için. */}
          <OgrenciKaynaklari ogrenciId={ogrenci.id} rol="koc" />
          {/* Notlar koçluğun kendisi, idari değil: öğrenciye bakarken
              yazılır. Bu yüzden profil sayfasına değil buraya alındı. */}
          <Notlar ogrenci={ogrenci} />
        </>
      )}
      {sekme === 'denemeler' && <Denemeler ogrenci={ogrenci} />}
      {sekme === 'konular' && <Konular ogrenci={ogrenci} />}
      </div>
    </div>
  )
}

/* ─────────────────────────── Profil sayfası ───────────────────────────
   Eski "Kayıt" sekmesi. Koç öğrencinin adına dokununca açılır. Yalnız
   ekranda başka yerde görünmeyenler yazılır: sınıf/alan kimlik kartında,
   hedef ve hedef netler Program'da; Düzenle formunda hepsi var. */

function ProfilSayfasi({ ogrenci, kataloglar, duzenle, setDuzenle, yukle, onKapat, onSilindi }) {
  const ad = ogrenci.profiller?.ad_soyad ?? 'İsimsiz'
  const kayit = ogrenci.kayit_tarihi
    ? new Date(ogrenci.kayit_tarihi).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null
  const altSatir = [kayit && `Kayıt ${kayit}`, ogrenci.aktif ? 'erişim açık' : 'erişim kapalı']
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="panel">
      <UstBlok sinif={`kimlik-kart kk-sade${ogrenci.aktif ? '' : ' kimlik-kart--kapali'}`} etiket={`${ad} profili`}>
        <div className="kk-ust">
          <button className="kk-geri" onClick={onKapat} aria-label="Öğrenci ekranına dön">
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor"
                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <Avatar yol={ogrenci.profiller?.fotograf_yolu} ad={ad} boyut="orta" />
          <div className="kk-kimlik">
            <h2 className="kk-ad">{ad}</h2>
            <p className="kk-alt-satir">{altSatir}</p>
          </div>
        </div>
      </UstBlok>

      <div className="sekme-govde profil-govde" style={aksanStili()}>
        <Bolum baslik="İletişim">
          <IletisimSatiri etiket="Öğrenci" telefon={ogrenci.profiller?.telefon} />
          <Veliler ogrenci={ogrenci} />
        </Bolum>

        <Bolum
          cizgili
          baslik="Bilgiler"
          eylem={duzenle ? 'Vazgeç' : 'Düzenle'}
          onEylem={() => setDuzenle((v) => !v)}
        >
          {duzenle ? (
            <BilgiFormu
              ogrenci={ogrenci}
              kataloglar={kataloglar}
              onKaydedildi={async () => {
                setDuzenle(false)
                await yukle()
              }}
            />
          ) : (
            <Kunye ogrenci={ogrenci} />
          )}
        </Bolum>
        <Odemeler ogrenci={ogrenci} />
        <Bolum
          cizgili
          baslik="Hesap"
          aciklama="Öğrenci ve veli şifrelerini girişteki “Şifremi unuttum”dan kendileri yenileyebilir. E-postasına ulaşamayan için buradan geçici şifre üret."
        >
          <HesapSatiri kisiId={ogrenci.id} ad={ad} tur="öğrenci" />
          <VeliHesaplari ogrenciId={ogrenci.id} />
        </Bolum>
        <TehlikeliBolge ogrenci={ogrenci} onSilindi={onSilindi} />
      </div>
    </div>
  )
}

/** 0532 123 45 67 → 905321234567 (wa.me biçimi) */
function waNumarasi(tel) {
  const r = String(tel ?? '').replace(/\D/g, '')
  if (!r) return null
  if (r.startsWith('90')) return r
  if (r.startsWith('0')) return `9${r}`
  return `90${r}`
}

function IletisimSatiri({ etiket, telefon, deger, sag = null }) {
  const wa = waNumarasi(telefon)
  return (
    <div className="iletisim-satir">
      <div className="iletisim-bilgi">
        <span className="iletisim-etiket">{etiket}</span>
        <span className={`iletisim-deger${telefon ? '' : ' iletisim-deger--bos'}`}>
          {deger ?? (telefon ? telYaz(telefon) : 'Telefon girilmemiş')}
        </span>
      </div>
      <div className="iletisim-eylem">
        {telefon && (
          <>
            <a className="iletisim-ikon" href={`tel:${String(telefon).replace(/\s/g, '')}`} aria-label={`${etiket} ara`}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"
                   strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z" />
              </svg>
            </a>
            {wa && (
              <a className="iletisim-ikon" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer"
                 aria-label={`${etiket} WhatsApp'tan yaz`}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"
                     strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.6L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5z" />
                </svg>
              </a>
            )}
          </>
        )}
        {sag}
      </div>
    </div>
  )
}

/* ─────────────────────────── Veli hesapları ───────────────────────────
   Veliler bölümü iletişim kaydı (telefon, izin); buradaki giriş yapan
   veli hesapları (veli_ogrenci). Her birine aynı sıfırlama bileşeni. */

function VeliHesaplari({ ogrenciId }) {
  const [liste, setListe] = useState([])
  useEffect(() => {
    let iptal = false
    supabase
      .from('veli_ogrenci')
      .select('veli_id, profiller:veli_id(ad_soyad)')
      .eq('ogrenci_id', ogrenciId)
      .then(({ data }) => { if (!iptal) setListe(data ?? []) })
    return () => { iptal = true }
  }, [ogrenciId])
  return liste.map((v) => (
    <HesapSatiri key={v.veli_id} kisiId={v.veli_id} ad={v.profiller?.ad_soyad ?? 'Veli'} tur="veli" />
  ))
}

function HesapSatiri({ kisiId, ad, tur }) {
  return (
    <div className="hesap-satir">
      <p className="liste-ad">{ad} <span className="hesap-tur">· {tur}</span></p>
      <SifreSifirla kisiId={kisiId} ad={ad} />
    </div>
  )
}

/* ─────────────────────────── Künye ─────────────────────────── */

function Kunye({ ogrenci }) {
  /* Telefon İletişim'de; sınıf/alan kimlik kartında; hedef ve hedef
     netler Program'da; erişim tepede. Burada yalnız geri kalanlar. */
  const satirlar = [
    ['Katalog', ogrenci.kataloglar?.ad ?? '—'],
    ['Kayıt tarihi', ogrenci.kayit_tarihi ? new Date(ogrenci.kayit_tarihi).toLocaleDateString('tr-TR') : '—'],
  ]
  return (
    <dl className="kunye">
      {satirlar.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  )
}

/* ─────────────────────────── Bilgi düzenleme ─────────────────────────── */

function BilgiFormu({ ogrenci, kataloglar, onKaydedildi }) {
  const [ad, setAd] = useState(ogrenci.profiller?.ad_soyad ?? '')
  const [telefon, setTelefon] = useState(ogrenci.profiller?.telefon ?? '')
  const [katalogId, setKatalogId] = useState(ogrenci.katalog_id ? String(ogrenci.katalog_id) : '')
  const [sinif, setSinif] = useState(ogrenci.sinif ? String(ogrenci.sinif) : '')
  const [alan, setAlan] = useState(ogrenci.alan ?? '')
  const [sinavTarihi, setSinavTarihi] = useState(ogrenci.sinav_tarihi ?? '')
  const [uni, setUni] = useState(ogrenci.hedef_universite ?? '')
  const [bolum, setBolum] = useState(ogrenci.hedef_bolum ?? '')
  const [tytNet, setTytNet] = useState(ogrenci.hedef_tyt_net ?? '')
  const [aytNet, setAytNet] = useState(ogrenci.hedef_ayt_net ?? '')
  const [aktif, setAktif] = useState(ogrenci.aktif)
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState('')

  async function kaydet() {
    setHata('')
    if (ad.trim().length < 2) {
      setHata('Ad soyad en az 2 karakter olmalı.')
      return
    }
    if (tytNet !== '' && (Number(tytNet) < 0 || Number(tytNet) > 120)) {
      setHata('Hedef TYT net 0 ile 120 arasında olmalı.')
      return
    }
    if (aytNet !== '' && (Number(aytNet) < 0 || Number(aytNet) > 80)) {
      setHata('Hedef AYT net 0 ile 80 arasında olmalı.')
      return
    }
    setBekliyor(true)
    try {
      const { error: pHata } = await supabase
        .from('profiller')
        .update({ ad_soyad: ad.trim(), telefon: telefon.trim() || null })
        .eq('id', ogrenci.id)
      if (pHata) throw pHata

      const { error: oHata } = await supabase
        .from('ogrenciler')
        .update({
          katalog_id: katalogId ? Number(katalogId) : null,
          sinif: sinif ? Number(sinif) : null,
          alan: alan || null,
          sinav_tarihi: sinavTarihi || null,
          hedef_universite: uni.trim() || null,
          hedef_bolum: bolum.trim() || null,
          hedef_tyt_net: tytNet === '' ? null : Number(tytNet),
          hedef_ayt_net: aytNet === '' ? null : Number(aytNet),
          aktif,
        })
        .eq('id', ogrenci.id)
      if (oHata) throw oHata

      await onKaydedildi()
    } catch (e) {
      setHata(hataMetni(e))
    } finally {
      setBekliyor(false)
    }
  }

  return (
    <div className="form-kutu">
      <FotografYukle
        ogrenciId={ogrenci.id}
        mevcutYol={ogrenci.profiller?.fotograf_yolu}
        ad={ad}
        onDegisti={onKaydedildi}
      />

      <Alan etiket="Ad soyad">
        <input value={ad} onChange={(e) => setAd(e.target.value)} />
      </Alan>
      <Alan etiket="Telefon" ipucu="İsteğe bağlı">
        <input value={telefon} onChange={(e) => setTelefon(e.target.value)} placeholder="05XX XXX XX XX" />
      </Alan>
      <Alan etiket="Konu kataloğu">
        <select value={katalogId} onChange={(e) => setKatalogId(e.target.value)}>
          <option value="">Seçilmedi</option>
          {kataloglar.map((k) => (
            <option key={k.id} value={k.id}>
              {k.ad}
            </option>
          ))}
        </select>
      </Alan>
      <Alan etiket="Sınıf">
        <select value={sinif} onChange={(e) => setSinif(e.target.value)}>
          <option value="">Belirtilmedi</option>
          {[8, 9, 10, 11, 12].map((s) => (
            <option key={s} value={s}>
              {s}. sınıf
            </option>
          ))}
          <option value="13">Mezun</option>
        </select>
      </Alan>
      <Alan etiket="Sınav tarihi" ipucu="Boş bırakılırsa sınıfa göre varsayılan kullanılır">
        <input type="date" value={sinavTarihi} onChange={(e) => setSinavTarihi(e.target.value)} />
      </Alan>
      <Alan etiket="Alan">
        <select value={alan} onChange={(e) => setAlan(e.target.value)}>
          <option value="">Belirtilmedi</option>
          {Object.entries(ALAN_ADI).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </Alan>
      <Alan etiket="Hedef üniversite">
        <input value={uni} onChange={(e) => setUni(e.target.value)} placeholder="İsteğe bağlı" />
      </Alan>
      <Alan etiket="Hedef bölüm">
        <input value={bolum} onChange={(e) => setBolum(e.target.value)} placeholder="İsteğe bağlı" />
      </Alan>

      <div className="ikili">
        <Alan etiket="Hedef TYT net" ipucu="0 – 120">
          <input type="number" min="0" max="120" step="0.25" inputMode="decimal"
                 value={tytNet} onChange={(e) => setTytNet(e.target.value)} placeholder="Örn. 105" />
        </Alan>
        <Alan etiket="Hedef AYT net" ipucu="0 – 80">
          <input type="number" min="0" max="80" step="0.25" inputMode="decimal"
                 value={aytNet} onChange={(e) => setAytNet(e.target.value)} placeholder="Örn. 62" />
        </Alan>
      </div>
      <label className="onay">
        <input type="checkbox" checked={aktif} onChange={(e) => setAktif(e.target.checked)} />
        <span>
          Aktif öğrenci
          <em>Pasife alınan öğrenci listede soluk görünür, verisi silinmez.</em>
        </span>
      </label>

      <Uyari>{hata}</Uyari>
      <Dugme onClick={kaydet} bekliyor={bekliyor}>
        Değişiklikleri kaydet
      </Dugme>
    </div>
  )
}

/* ─────────────────────── Tehlikeli bölge ─────────────────────── */

/* Pasife alma ile silme farklı işler: biri ayrılan öğrenciyi listeden
   çıkarır ve verisini saklar, diğeri kaydı tamamen yok eder. İkisi aynı
   forma konsaydı yanlışlıkla silme kaçınılmaz olurdu. Onay için ad
   yazdırılıyor: "Emin misiniz?" tıklama refleksiyle geçiliyor, isim
   yazmak geçmiyor. */
function TehlikeliBolge({ ogrenci, onSilindi }) {
  const [acik, setAcik] = useState(false)
  const [sayim, setSayim] = useState(null)
  const [yazilan, setYazilan] = useState('')
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState('')

  const ad = ogrenci.profiller?.ad_soyad ?? ''
  const eslesti = yazilan.trim().toLocaleLowerCase('tr') === ad.trim().toLocaleLowerCase('tr')

  /* Sayılar silmeden önce okunuyor: "142 görev gidecek" cümlesi,
     "tüm verisi gidecek"ten çok daha anlaşılır bir uyarı. */
  useEffect(() => {
    if (!acik) return
    let iptal = false
    const say = (tablo) =>
      supabase.from(tablo).select('id', { count: 'exact', head: true }).eq('ogrenci_id', ogrenci.id)
    Promise.all([say('gorevler'), say('denemeler'), say('konu_ilerleme')]).then(([g, d, k]) => {
      if (iptal) return
      setSayim({ gorev: g.count ?? 0, deneme: d.count ?? 0, ilerleme: k.count ?? 0 })
    })
    return () => {
      iptal = true
    }
  }, [acik, ogrenci.id])

  async function sil() {
    setHata('')
    setBekliyor(true)
    try {
      await kullaniciSil(ogrenci.id)
      onSilindi()
    } catch (e) {
      setHata(hataMetni(e))
      setBekliyor(false)
    }
  }

  function kapat() {
    setAcik(false)
    setYazilan('')
    setSayim(null)
    setHata('')
  }

  return (
    <Bolum cizgili baslik="Tehlikeli bölge" sinif="tehlike-bolum">
      <p className="bolum-aciklama">
        Öğrenci ayrıldıysa önce pasife almayı dene; verisi korunur. Silmek geri alınamaz.
      </p>
      <button className="tehlike-yazi-dugme" onClick={() => setAcik(true)}>
        Öğrenciyi kalıcı olarak sil
      </button>

      {acik && (
        <AltSayfa
          baslik={`${ad} kalıcı olarak silinsin mi?`}
          onKapat={kapat}
          dugmeler={
            <>
              <Dugme tur="ikincil" onClick={kapat}>
                Vazgeç
              </Dugme>
              <button
                className="dugme dugme--tehlike"
                onClick={sil}
                disabled={!eslesti || bekliyor}
              >
                {bekliyor ? 'Bir saniye…' : 'Sil'}
              </button>
            </>
          }
        >
          <div className="form-kutu">
            <div className="tehlike-dokum">
              <p>Bunlar da silinecek:</p>
              {sayim === null ? (
                <Yukleniyor satir={2} />
              ) : (
                <ul>
                  <li>{sayim.gorev} görev</li>
                  <li>{sayim.deneme} deneme ve analizleri</li>
                  <li>{sayim.ilerleme} konu ilerlemesi</li>
                  <li>Giriş hesabı ve yalnızca bu öğrenciye bağlı veli kaydı</li>
                </ul>
              )}
            </div>

            <Alan etiket="Onaylamak için öğrencinin adını yaz" ipucu={ad}>
              <input
                value={yazilan}
                onChange={(e) => setYazilan(e.target.value)}
                placeholder={ad}
                autoComplete="off"
              />
            </Alan>

            <Uyari>{hata}</Uyari>
          </div>
        </AltSayfa>
      )}
    </Bolum>
  )
}

/* ─────────────────────────── Program ─────────────────────────── */

function Program({ ogrenci }) {
  const [secim, setSecim] = useState(null) // { blok, tarih }
  const [tazele, setTazele] = useState(0)

  return (
    /* Eskiden ızgara bir "Haftalık program" kartının içindeydi: panel >
       sekme gövdesi > kart > gün paneli > görev satırı, beş çerçeve iç
       içe. Kart kaldırıldı; hafta şeridi ekranın kendisi. */
    <section className="prg-bolum">
      {/* Form, dokunulan günün listesinin hemen altında açılıyor.
          Yerleşimi ortak bileşen yönetiyor; öğrenci paneli de aynı yeri kullanır. */}
      <ProgramIzgarasi
        key={tazele}
        ogrenci={ogrenci}
        duzenlenebilir
        onHucreSec={(blok, tarih, periyot) => setSecim({ blok, tarih, periyot })}
        onRutinEkle={(gunler) => setSecim({ rutinGunler: gunler })}
        acikSecim={secim}
      />

      {/* Form eskiden gün kartının içinde, gri kutunun içinde açılıyordu:
          üç çerçeve iç içe, dar alan, üstünde liste. Artık alt sayfa
          olarak açılıyor — tam genişlik, arkadaki liste yerinde kalıyor. */}
      {secim && (
        <AltSayfa
          baslik={sayfaBasligi(secim)}
          altBaslik={sayfaAltBasligi(secim)}
          onKapat={() => setSecim(null)}
        >
          <HucreDuzenle
            ogrenci={ogrenci}
            secim={secim}
            onDegisti={() => {
              setSecim(null)
              setTazele((t) => t + 1)
            }}
          />
        </AltSayfa>
      )}
    </section>
  )
}

const gunUzun = (tarih) =>
  new Date(`${tarih}T00:00:00`).toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'long', weekday: 'long',
  })

const sayfaBasligi = (secim) =>
  secim.rutinGunler ? 'Tekrar eden iş' : gunUzun(secim.tarih)

const sayfaAltBasligi = (secim) =>
  secim.rutinGunler
    ? 'Seçtiğin günlere aynı görev yazılır'
    : secim.blok
      ? 'Bu işi düzenle'
      : 'Bu güne yeni iş'

/** Bir hücreye ders atar ya da mevcut bloğu düzenler/siler.
 *  Başlık ve kapatma alt sayfaya ait; burada yalnızca form var. */
function HucreDuzenle({ ogrenci, secim, onDegisti }) {
  const { blok, tarih, periyot, rutinGunler } = secim

  if (rutinGunler) {
    return <RutinFormu ogrenci={ogrenci} gunler={rutinGunler} onEklendi={onDegisti} />
  }

  async function sil() {
    await supabase.from('gorevler').delete().eq('id', blok.id)
    onDegisti()
  }

  /* Mevcut bir işe dokununca eskiden yalnızca not kutusu ve sil düğmesi
     açılıyordu: dersi, konusu, saati yanlış girilmişse işi silip baştan
     yazmak gerekiyordu. Artık aynı form, dolu hâliyle. */
  return (
    <GorevFormu
      ogrenci={ogrenci}
      tarih={tarih}
      periyot={periyot}
      blok={blok ?? null}
      onSil={blok ? sil : null}
      onEklendi={onDegisti}
    />
  )
}

/** Boş bir hücreye ders atar. Ders seçilince o ders grubunun bütün
 *  konuları (TYT + AYT) yüklenir. */
function GorevFormu({ ogrenci, tarih, periyot, blok = null, onSil, onEklendi }) {
  const duzenleme = Boolean(blok)
  const [dersler, setDersler] = useState([])
  const [konular, setKonular] = useState([])
  /* Seçim artık ders satırına değil ders grubuna bağlı: koç "Matematik"
     diyor, TYT/AYT ayrımını konu belirliyor. */
  const [grupKod, setGrupKod] = useState('')
  /* Konu seçilmeyen görevde kapsamı koç söylüyor. */
  const [kapsamDersId, setKapsamDersId] = useState('')
  const [konuId, setKonuId] = useState(blok?.konu_id ? String(blok.konu_id) : '')
  const [tur, setTur] = useState(blok?.tur ?? 'konu_anlatimi')
  const [kaynakId, setKaynakId] = useState(blok?.kaynak_id ?? null)
  const [kaynakAralik, setKaynakAralik] = useState(blok?.kaynak_aralik ?? '')
  const [hedef, setHedef] = useState(blok?.hedef_adet != null ? String(blok.hedef_adet) : '')
  const [aciklama, setAciklama] = useState(blok?.aciklama ?? '')
  /* Saat isteğe bağlı. Boş bırakılırsa gün eskisi gibi işler: görevler
     koçun sırasıyla, öğrenci istediğinden başlar. Bir göreve saat
     verildiği anda o gün saate bağlanır. */
  const [basSaat, setBasSaat] = useState((blok?.baslangic_saat ?? '').slice(0, 5))
  const [bitSaat, setBitSaat] = useState((blok?.bitis_saat ?? '').slice(0, 5))
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState('')
  /* Form sekiz alandı ve hepsi her seferinde açıktı; oysa sıradan bir
     görev Ders + Konu + Tür ile yazılıyor. Gerisi kapalı başlıyor,
     ihtiyaç duyan açıyor. */
  /* Düzenlemede ayrıntılar açık başlıyor: doldurulmuş bir alanın kapalı
     kutunun içinde saklanması koçu şaşırtır. */
  const [ayrinti, setAyrinti] = useState(
    Boolean(blok && (blok.kaynak_id || blok.hedef_adet != null || blok.baslangic_saat || blok.aciklama)),
  )

  useEffect(() => {
    if (!ogrenci.katalog_id) return
    supabase
      .from('dersler')
      .select('id, ad, sira, kapsam, ders_kod')
      .eq('katalog_id', ogrenci.katalog_id)
      .order('sira')
      .then(({ data }) => setDersler(data ?? []))
  }, [ogrenci.katalog_id])

  const gruplar = dersleriGrupla(dersler)

  /* Düzenlemede görev bir ders satırına bağlı; grubu o satırdan buluyoruz.
     Dersler yüklendikten sonra bir kez çalışır. */
  useEffect(() => {
    if (!duzenleme || grupKod || dersler.length === 0) return
    const kendi = dersler.find((d) => d.id === blok.ders_id)
    if (!kendi) return
    const g = dersleriGrupla(dersler).find((x) => x.dersler.some((d) => d.id === kendi.id))
    if (g) {
      setGrupKod(g.kod)
      setKapsamDersId(String(kendi.id))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duzenleme, dersler])

  const grup = gruplar.find((g) => g.kod === grupKod) ?? null
  const grupDersIdleri = (grup?.dersler ?? []).map((d) => d.id)

  /* Konular grubun bütün ders satırlarından çekiliyor: TYT ve AYT
     konuları tek listede, kapsam başlıklarıyla ayrılmış halde. */
  useEffect(() => {
    if (grupDersIdleri.length === 0) {
      setKonular([])
      return
    }
    supabase
      .from('konular')
      .select('id, ad, sira, ders_id')
      .in('ders_id', grupDersIdleri)
      .order('sira')
      .then(({ data }) => setKonular(data ?? []))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grupKod, dersler])

  /* Görev bir ders satırına yazılıyor: konu seçiliyse onun dersi,
     değilse grubun ilk kapsamı (TYT varsa TYT). */
  const secilenKonu = konular.find((k) => String(k.id) === konuId) ?? null
  const kapsamDersi =
    (grup?.dersler ?? []).find((d) => String(d.id) === kapsamDersId) ?? grup?.dersler[0] ?? null
  const dersId = secilenKonu
    ? String(secilenKonu.ders_id)
    : kapsamDersi
      ? String(kapsamDersi.id)
      : ''

  async function ekle() {
    if (!dersId) {
      setHata('Önce bir ders seç.')
      return
    }
    if (basSaat && bitSaat && bitSaat <= basSaat) {
      setHata('Bitiş saati başlangıçtan sonra olmalı.')
      return
    }
    if (bitSaat && !basSaat) {
      setHata('Bitiş saati verdiysen başlangıcı da yaz.')
      return
    }
    setBekliyor(true)
    setHata('')

    const konu = secilenKonu
    /* Konusuz görevde ders adının önüne kapsam yazılıyor: öğrenci
       "Matematik soru çözümü" değil "AYT Matematik soru çözümü" görsün. */
    const dersAdi =
      grup && grup.dersler.length > 1 && kapsamDersi
        ? `${dersKapsamAdi(kapsamDersi)} ${grup.ad}`
        : (grup?.ad ?? '')
    const baslik = konu
      ? `${GOREV_TUR_ADI[tur]} — ${konu.ad}`
      : `${dersAdi} ${GOREV_TUR_ADI[tur].toLowerCase()}`

    const govde = {
      ders_id: Number(dersId),
      konu_id: konuId ? Number(konuId) : null,
      tur,
      baslik,
      hedef_adet: ADETLI_TURLER.has(tur) && hedef ? Number(hedef) : null,
      aciklama: aciklama.trim() || null,
      kaynak_id: kaynakId,
      kaynak_aralik: kaynakId && kaynakAralik.trim() ? kaynakAralik.trim() : null,
      baslangic_saat: basSaat || null,
      bitis_saat: bitSaat || null,
    }

    const { error } = duzenleme
      ? await supabase.from('gorevler').update(govde).eq('id', blok.id)
      : await supabase.from('gorevler').insert({
          ...govde,
          ogrenci_id: ogrenci.id,
          koc_id: ogrenci.koc_id,
          tarih,
          periyot: periyot ?? null,
          durum: 'bekliyor',
        })

    setBekliyor(false)
    if (error) {
      setHata(hataMetni(error))
      return
    }
    onEklendi()
  }

  if (!ogrenci.katalog_id) {
    return <KatalogSec ogrenciId={ogrenci.id} />
  }

  return (
    <div className="form-kutu">
      <Alan etiket="Ders">
        <select
          value={grupKod}
          onChange={(e) => {
            setGrupKod(e.target.value)
            setKonuId('')
            setKapsamDersId('')
            setKaynakId(null)
          }}
        >
          <option value="">Ders seç</option>
          {gruplar.map((g) => (
            <option key={g.kod} value={g.kod}>{g.ad}</option>
          ))}
        </select>
      </Alan>

      <Alan
        etiket="Konu"
        ipucu={grup && grup.dersler.length > 1 ? `${kapsamEtiketi(grup)} tek listede` : 'İstersen boş bırak'}
      >
        <select
          value={konuId}
          onChange={(e) => {
            setKonuId(e.target.value)
            /* Konu kapsamı değiştirebiliyor (TYT ↔ AYT); kaynak listesi
               yenilendiği için eski seçim taşınmıyor. */
            setKaynakId(null)
            setKaynakAralik('')
          }}
          disabled={!konular.length}
        >
          <option value="">{konular.length ? 'Konu seç' : 'Önce ders seç'}</option>
          {(grup?.dersler ?? []).map((d) => {
            const kendi = konular.filter((k) => k.ders_id === d.id)
            if (kendi.length === 0) return null
            /* Tek kapsamlı derste başlık çizilmiyor: gereksiz katman. */
            /* Kapsam hem optgroup başlığında hem seçeneğin kendi
               metninde: TYT ve AYT'de aynı adlı konular var
               ("2. Dereceden Denklemler"), optgroup başlığı da her
               tarayıcıda aynı belirginlikte görünmüyor. */
            return grup.dersler.length === 1 ? (
              kendi.map((k) => (
                <option key={k.id} value={k.id}>{k.ad}</option>
              ))
            ) : (
              <optgroup key={d.id} label={dersKapsamAdi(d)}>
                {kendi.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.ad} · {dersKapsamAdi(d)}
                  </option>
                ))}
              </optgroup>
            )
          })}
        </select>
      </Alan>

      {/* Konu seçiliyse kapsam zaten konudan geliyor; şerit yalnızca
          konusuz görevde soruluyor. */}
      {!konuId && (
        <KapsamSecimi grup={grup} deger={kapsamDersId} onSec={(id) => {
          setKapsamDersId(id)
          setKaynakId(null)
        }} />
      )}

      <Alan etiket="Tür">
        <select value={tur} onChange={(e) => setTur(e.target.value)}>
          {Object.entries(GOREV_TUR_ADI).map(([k, ad]) => (
            <option key={k} value={k}>{ad}</option>
          ))}
        </select>
      </Alan>

      <button
        type="button"
        className="ayrinti-basi"
        onClick={() => setAyrinti((a) => !a)}
        aria-expanded={ayrinti}
      >
        <span className="ayrinti-ad">Ayrıntılar</span>
        <span className="ayrinti-ozet">
          {[
            kaynakId ? 'kaynak' : null,
            ADETLI_TURLER.has(tur) && hedef ? `${hedef} adet` : null,
            basSaat || null,
            aciklama.trim() ? 'not' : null,
          ]
            .filter(Boolean)
            .join(' · ') || 'kaynak, adet, saat, not'}
        </span>
        <span className={`ayrinti-ok${ayrinti ? ' ayrinti-ok--acik' : ''}`} aria-hidden="true">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
               strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>

      {ayrinti && <div className="ayrinti-govde">
        {/* Kaynak, tür ve konu seçildikten sonra soruluyor: motorun
            sıralama yapabilmesi için ikisine de ihtiyacı var. */}
        <KaynakSecici
          ogrenciId={ogrenci.id}
          dersId={dersId}
          konuId={konuId}
          secili={kaynakId}
          onSec={(id) => {
            setKaynakId(id)
            if (!id) setKaynakAralik('')
          }}
          aralik={kaynakAralik}
          onAralik={setKaynakAralik}
        />

        {ADETLI_TURLER.has(tur) && (
          <Alan etiket="Hedef adet">
            <input
              type="number"
              inputMode="numeric"
              min="1"
              max="500"
              value={hedef}
              onChange={(e) => setHedef(e.target.value)}
              placeholder="Örn. 30"
            />
          </Alan>
        )}

        {/* Saat verilirse gün blok düzenine geçer: görevler saate göre
            dizilir ve öğrenci sırayı değiştiremez. Boş bırakılırsa hiçbir
            şey değişmez. */}
        <div className="alan-ikili">
          <Alan etiket="Başlangıç saati" ipucu="İsteğe bağlı">
            <input type="time" value={basSaat} onChange={(e) => setBasSaat(e.target.value)} />
          </Alan>
          <Alan etiket="Bitiş saati">
            <input type="time" value={bitSaat} onChange={(e) => setBitSaat(e.target.value)} />
          </Alan>
        </div>

        <Alan etiket="Not" ipucu="Öğrenci bu notu görevin altında görür">
          <textarea
            rows={2}
            value={aciklama}
            onChange={(e) => setAciklama(e.target.value)}
            placeholder="Örn. Önce çıkmış soruları çöz, sonra deneme kitabına geç."
          />
        </Alan>
      </div>}

      <div className="form-alt">
        <Uyari>{hata}</Uyari>
        <Dugme onClick={ekle} bekliyor={bekliyor}>
          {duzenleme ? 'Değişikliği kaydet' : 'Ders ekle'}
        </Dugme>
        {onSil && (
          <Dugme tur="ikincil" onClick={onSil}>
            Dersi sil
          </Dugme>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────── Denemeler ─────────────────────────── */


function Denemeler({ ogrenci }) {
  /* Koç ve öğrenci artık aynı deneme ekranını görüyor; ikisi de
     deneme ekleyip hata konusu işaretleyebiliyor. */
  return (
    <DenemePaneli ogrenciId={ogrenci.id} katalogId={ogrenci.katalog_id} duzenlenebilir />
  )
}

/* ─────────────────────────── Konular ─────────────────────────── */

function Konular({ ogrenci }) {
  const [dersler, setDersler] = useState(null)
  const [acikGrup, setAcikGrup] = useState(null)

  useEffect(() => {
    if (!ogrenci.katalog_id) {
      setDersler([])
      return
    }
    supabase
      .from('dersler')
      .select('id, ad, kapsam, sira, ders_kod, konular(count)')
      .eq('katalog_id', ogrenci.katalog_id)
      .order('sira')
      .then(({ data }) => setDersler(data ?? []))
  }, [ogrenci.katalog_id])

  if (dersler === null) return <Bolum baslik="Konu yolu"><Yukleniyor /></Bolum>

  /* Katalogda TYT Matematik ve AYT Matematik iki ayrı satır. Ekranda tek
     ders: "Matematik" açılınca ikisinin konuları alt alta, kapsam
     başlıklarıyla ayrılmış geliyor. Konu listesi böylece bütün kalıyor. */
  const gruplar = dersleriGrupla(dersler)
  const konuSayisi = (d) => d.konular?.[0]?.count ?? 0

  /* Öğrencinin gördüğü yolun aynısı; fark eylemler: koç durum seçer ve onaylar.
     Onay verilince öğrencinin haritasında durak yeşile döner. */
  return (
    <Bolum baslik="Konu yolu" aciklama={ogrenci.kataloglar?.ad}>
      {gruplar.length === 0 ? (
        ogrenci.katalog_id
          ? <BosDurum metin="Bu katalogda henüz konu yok." />
          : <KatalogSec ogrenciId={ogrenci.id} />
      ) : (
        <ul className="ders-liste">
          {gruplar.map((g) => {
            const toplam = g.dersler.reduce((n, d) => n + konuSayisi(d), 0)
            const acik = acikGrup === g.kod
            return (
              <li key={g.kod}>
                <button
                  className="ders-satir"
                  onClick={() => setAcikGrup((a) => (a === g.kod ? null : g.kod))}
                  aria-expanded={acik}
                >
                  <span className="liste-ad">{g.ad}</span>
                  <span className="liste-alt">{kapsamEtiketi(g)}</span>
                  <span className="sayi">{toplam} konu</span>
                </button>
                {acik &&
                  g.dersler.map((d) => (
                    <div key={d.id} className="ders-kapsam">
                      {g.dersler.length > 1 && (
                        <p className="ders-kapsam-basi">
                          <span className="ders-kapsam-rozet">{dersKapsamAdi(d)}</span>
                          <span className="ders-kapsam-sayi">{konuSayisi(d)} konu</span>
                        </p>
                      )}
                      <KonuYolu ogrenciId={ogrenci.id} dersId={d.id} rol="koc" durakSayisi={konuSayisi(d)} />
                    </div>
                  ))}
              </li>
            )
          })}
        </ul>
      )}
    </Bolum>
  )
}


/* ─────────────────────────── Notlar ─────────────────────────── */

const GORUNURLUK = [
  ['sadece_koc', 'Sadece ben'],
  ['ogrenci', 'Öğrenci de görsün'],
  ['veli', 'Veli de görsün'],
]

const GORUNURLUK_ADI = Object.fromEntries(GORUNURLUK)

/** Koçun öğrenci hakkındaki notları. Her notta kimin göreceği ayrı seçilir;
 *  varsayılan "sadece ben", yani bilinçli seçmeden hiçbir not paylaşılmaz. */
function Notlar({ ogrenci }) {
  const [liste, setListe] = useState(null)
  const [metin, setMetin] = useState('')
  const [gorunurluk, setGorunurluk] = useState('sadece_koc')
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState('')

  const yukle = useCallback(async () => {
    const { data, error } = await supabase
      .from('koc_notlari')
      .select('id, icerik, gorunurluk, olusturuldu')
      .eq('ogrenci_id', ogrenci.id)
      .order('olusturuldu', { ascending: false })
    if (error) setHata(hataMetni(error))
    setListe(data ?? [])
  }, [ogrenci.id])

  useEffect(() => {
    yukle()
  }, [yukle])

  async function ekle() {
    const icerik = metin.trim()
    if (icerik.length < 3) {
      setHata('Not çok kısa.')
      return
    }
    setBekliyor(true)
    setHata('')
    const { error } = await supabase.from('koc_notlari').insert({
      ogrenci_id: ogrenci.id,
      koc_id: ogrenci.koc_id,
      icerik,
      gorunurluk,
    })
    setBekliyor(false)
    if (error) {
      setHata(hataMetni(error))
      return
    }
    setMetin('')
    setGorunurluk('sadece_koc')
    yukle()
  }

  async function sil(id) {
    const { error } = await supabase.from('koc_notlari').delete().eq('id', id)
    if (error) setHata(hataMetni(error))
    else yukle()
  }

  return (
    <Bolum cizgili baslik="Notlar" aciklama="Her notta kimin göreceğini sen seçersin.">
      <div className="form-kutu form-kutu--duz">
        <Alan etiket="Yeni not">
          <textarea
            rows={3}
            value={metin}
            placeholder="Kısa bir not…"
            onChange={(e) => {
              setMetin(e.target.value)
              setHata('')
            }}
          />
        </Alan>

        <Alan etiket="Kim görsün">
          <select value={gorunurluk} onChange={(e) => setGorunurluk(e.target.value)}>
            {GORUNURLUK.map(([k, ad]) => (
              <option key={k} value={k}>{ad}</option>
            ))}
          </select>
        </Alan>

        <Uyari>{hata}</Uyari>

        <Dugme onClick={ekle} bekliyor={bekliyor}>Notu kaydet</Dugme>
      </div>

      {liste === null ? (
        <Yukleniyor />
      ) : liste.length === 0 ? (
        <BosDurum metin="Henüz not yok." />
      ) : (
        <ul className="liste">
          {liste.map((n) => (
            <li key={n.id} className="liste-satir not-satir">
              <div>
                <span className="not-metin">{n.icerik}</span>
                <span className="liste-alt">
                  {new Date(n.olusturuldu).toLocaleDateString('tr-TR')} ·{' '}
                  {GORUNURLUK_ADI[n.gorunurluk] ?? n.gorunurluk}
                </span>
              </div>
              <button className="metin-dugme" onClick={() => sil(n.id)}>Sil</button>
            </li>
          ))}
        </ul>
      )}
    </Bolum>
  )
}

/* ─────────────────────────── Veli ─────────────────────────── */

const ILISKI = [
  ['anne', 'Anne'],
  ['baba', 'Baba'],
  ['vasi', 'Vasi'],
  ['diger', 'Diğer'],
]

/** Veli hesabı açar ve öğrenciye bağlar. Hesap açma service_role
 *  gerektirdiği için Edge Function üzerinden yapılır. */
/* Veli paneli yok — karar bu: veliler uygulamaya da e-postaya da bakmıyor,
   yalnızca gelen mesaja bakıyor. O yüzden velinin hesabı değil, telefonu ve
   KVKK onayı tutuluyor. Onay kanıtlanabilir olmalı: ne zaman, hangi metinle,
   hangi yolla alındığı kaydediliyor. */

/* +905321112233 okunmuyor; listede 0532 111 22 33 gösteriliyor. */
const telYaz = (t) =>
  /^\+90\d{10}$/.test(t ?? '')
    ? `0${t.slice(3, 6)} ${t.slice(6, 9)} ${t.slice(9, 11)} ${t.slice(11)}`
    : (t ?? '')

const IZIN_KANALI = [
  ['sozlesme', 'Koçluk sözleşmesinde'],
  ['kagit', 'Islak imzalı form'],
  ['koc_beyani', 'Sözlü — koç beyanı'],
]

function Veliler({ ogrenci }) {
  const [liste, setListe] = useState(null)
  const [formAcik, setFormAcik] = useState(false)
  const [adSoyad, setAdSoyad] = useState('')
  const [telefon, setTelefon] = useState('')
  const [iliski, setIliski] = useState('anne')
  const [izin, setIzin] = useState(true)
  const [kanal, setKanal] = useState('sozlesme')
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState('')

  const yukle = useCallback(async () => {
    const { data, error } = await supabase
      .from('veliler')
      .select('id, ad_soyad, telefon, iliski, sms_izni, izin_zamani, izin_kanali')
      .eq('ogrenci_id', ogrenci.id)
      .eq('aktif', true)
      .order('id')
    if (error) setHata(hataMetni(error))
    setListe(data ?? [])
  }, [ogrenci.id])

  useEffect(() => {
    yukle()
  }, [yukle])

  async function ekle() {
    setHata('')
    setBekliyor(true)
    const { error } = await supabase.rpc('veli_kaydet', {
      p_ogrenci: ogrenci.id,
      p_ad: adSoyad.trim(),
      p_telefon: telefon.trim(),
      p_iliski: iliski,
      p_sms_izni: izin,
      p_izin_kanali: izin ? kanal : null,
      p_izin_metni: izin
        ? 'Haftalık koçluk bilgilendirmesinin SMS ile gönderilmesine onay — sürüm 2026-09'
        : null,
    })
    setBekliyor(false)
    if (error) {
      setHata(hataMetni(error))
      return
    }
    setAdSoyad('')
    setTelefon('')
    setFormAcik(false)
    await yukle()
  }

  async function cikar(id) {
    const { error } = await supabase.from('veliler').update({ aktif: false }).eq('id', id)
    if (error) setHata(hataMetni(error))
    else yukle()
  }

  /* Profil sayfasında İletişim bölümünün içinde çizilir: kendi başlığı
     yok, her veli öğrencinin telefonuyla aynı satır düzeninde. */
  const ekleDugmesi = (
    <Dugme tur="ikincil" onClick={() => setFormAcik((v) => !v)}>
      {formAcik ? 'Kapat' : '+ Veli ekle'}
    </Dugme>
  )
  return (
    <>
      {liste === null ? (
        <Yukleniyor />
      ) : liste.length === 0 ? (
        <IletisimSatiri etiket="Veli" deger="Kayıtlı veli yok" sag={ekleDugmesi} />
      ) : (
        <>
          {liste.map((v) => (
            <IletisimSatiri
              key={v.id}
              etiket={`${ILISKI.find(([k]) => k === v.iliski)?.[1] ?? v.iliski} · ${v.ad_soyad}`}
              telefon={v.telefon}
              sag={
                <button type="button" className="metin-dugme" onClick={() => cikar(v.id)}>Çıkar</button>
              }
            />
          ))}
          {!formAcik && <div className="iletisim-ekle">{ekleDugmesi}</div>}
        </>
      )}

      {formAcik && (
        <div className="form-kutu form-kutu--duz">
          <Alan etiket="Ad soyad">
            <input value={adSoyad} onChange={(e) => setAdSoyad(e.target.value)} placeholder="Örn. Ayşe Yılmaz" />
          </Alan>
          <Alan etiket="Cep telefonu">
            <input
              type="tel"
              inputMode="tel"
              value={telefon}
              onChange={(e) => setTelefon(e.target.value)}
              placeholder="0532 000 00 00"
            />
          </Alan>
          <Alan etiket="Yakınlık">
            <select value={iliski} onChange={(e) => setIliski(e.target.value)}>
              {ILISKI.map(([k, ad]) => (
                <option key={k} value={k}>{ad}</option>
              ))}
            </select>
          </Alan>
          <label className="oteleme">
            <input type="checkbox" checked={izin} onChange={() => setIzin((v) => !v)} />
            <span>Veli, haftalık özetin kendisine iletilmesine onay verdi</span>
          </label>
          {izin ? (
            <Alan etiket="Onay nasıl alındı" ipucu="KVKK gereği kayda geçer">
              <select value={kanal} onChange={(e) => setKanal(e.target.value)}>
                {IZIN_KANALI.map(([k, ad]) => (
                  <option key={k} value={k}>{ad}</option>
                ))}
              </select>
            </Alan>
          ) : (
            <p className="kart-alt">Onay yoksa bu veliye özet iletilmez.</p>
          )}
          <Uyari>{hata}</Uyari>
          <div className="form-eylem">
            <Dugme onClick={ekle} bekliyor={bekliyor}>Veliyi kaydet</Dugme>
            <button type="button" className="metin-dugme" onClick={() => setFormAcik(false)}>Vazgeç</button>
          </div>
        </div>
      )}

      {!formAcik && <Uyari>{hata}</Uyari>}
    </>
  )
}


/* ─────────────────────────── Seri ve rozet ─────────────────────────── */

/** Koçun tebrik fırsatını kaçırmaması için: seri ve son kazanılan rozet.
 *  Öğrenci bunları kendi panelinde görüyor, koç göremiyordu. */


const GUN_ADI = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

/** Rutin: saate bağlı olmayan, birden çok güne aynı anda yazılan görev.
 *  Paragraf, problem, geometri gibi her gün tekrarlanan işler için. */
function RutinFormu({ ogrenci, gunler, onEklendi }) {
  const [dersler, setDersler] = useState([])
  const [dersId, setDersId] = useState('')
  const [kapsamDersId, setKapsamDersId] = useState('')
  const [tur, setTur] = useState('soru_cozumu')
  const [hedef, setHedef] = useState('20')
  const [aciklama, setAciklama] = useState('')
  const [secili, setSecili] = useState(() => gunler.map(() => true))
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState('')
  /* Rutin konuya ve bloğa bağlı değil: düzenleme formundaki
     "Ayrıntılar" katlanır kutusu buraya kopyalanmış ama burada
     kullanılmıyordu ve tanımsız bir değişkene bakıp çöküyordu. */

  useEffect(() => {
    if (!ogrenci.katalog_id) return
    supabase
      .from('dersler')
      .select('id, ad, sira, kapsam, ders_kod')
      .eq('katalog_id', ogrenci.katalog_id)
      .order('sira')
      .then(({ data }) => setDersler(data ?? []))
  }, [ogrenci.katalog_id])

  /* Rutin konuya bağlı değil, o yüzden kapsamı konudan çıkaramıyoruz:
     iki kapsamlı derslerde koç TYT mi AYT mi olduğunu kendisi söylüyor. */
  const gruplar = dersleriGrupla(dersler)
  const grup = gruplar.find((g) => g.kod === dersId) ?? null
  const kapsamDersi =
    (grup?.dersler ?? []).find((d) => String(d.id) === kapsamDersId) ?? grup?.dersler[0] ?? null

  const secilenGunler = gunler.filter((_, i) => secili[i])

  async function ekle() {
    if (!dersId) {
      setHata('Önce bir ders seç.')
      return
    }
    if (secilenGunler.length === 0) {
      setHata('En az bir gün seç.')
      return
    }
    setBekliyor(true)
    setHata('')

    const { error } = await supabase.from('gorevler').insert(
      secilenGunler.map((tarih) => ({
        ogrenci_id: ogrenci.id,
        koc_id: ogrenci.koc_id,
        tarih,
        periyot: null,
        ders_id: Number(kapsamDersi.id),
        tur,
        baslik:
          grup && grup.dersler.length > 1 && kapsamDersi
            ? `${dersKapsamAdi(kapsamDersi)} ${grup.ad}`
            : (grup?.ad ?? 'Rutin'),
        hedef_adet: ADETLI_TURLER.has(tur) && hedef ? Number(hedef) : null,
        aciklama: aciklama.trim() || null,
        durum: 'bekliyor',
      })),
    )

    setBekliyor(false)
    if (error) {
      setHata(hataMetni(error))
      return
    }
    onEklendi()
  }

  if (!ogrenci.katalog_id) {
    return <KatalogSec ogrenciId={ogrenci.id} />
  }

  return (
    <div className="form-kutu">
      <Alan etiket="Ders">
        <select
          value={dersId}
          onChange={(e) => {
            setDersId(e.target.value)
            setKapsamDersId('')
          }}
        >
          <option value="">Ders seç</option>
          {gruplar.map((g) => (
            <option key={g.kod} value={g.kod}>{g.ad}</option>
          ))}
        </select>
      </Alan>

      {/* Rutin konuya bağlı değil: TYT mi AYT mi olduğunu koç söylüyor,
          yoksa rapordaki ders kırılımı yanlış tarafa yazıyor. */}
      <KapsamSecimi grup={grup} deger={kapsamDersId} onSec={setKapsamDersId} />

      <Alan etiket="Tür">
        <select value={tur} onChange={(e) => setTur(e.target.value)}>
          {Object.entries(GOREV_TUR_ADI).map(([k, ad]) => (
            <option key={k} value={k}>{ad}</option>
          ))}
        </select>
      </Alan>

      {ADETLI_TURLER.has(tur) && (
        <Alan etiket="Günlük hedef">
          <input
            type="number"
            inputMode="numeric"
            min="1"
            max="500"
            value={hedef}
            onChange={(e) => setHedef(e.target.value)}
          />
        </Alan>
      )}

      <Alan etiket="Günler" ipucu={`${secilenGunler.length} gün seçili`}>
        <div className="gun-secim">
          {gunler.map((g, i) => (
            <button
              key={g}
              type="button"
              className={`gun-kutu${secili[i] ? ' gun-kutu--secili' : ''}`}
              aria-pressed={secili[i]}
              onClick={() =>
                setSecili((m) => m.map((v, j) => (j === i ? !v : v)))
              }
            >
              {GUN_ADI[i]}
            </button>
          ))}
        </div>
      </Alan>

      <Alan etiket="Not" ipucu="Öğrenci bu notu görevin altında görür">
        <textarea
          rows={2}
          value={aciklama}
          onChange={(e) => setAciklama(e.target.value)}
          placeholder="Örn. Her gün 20 paragraf, süre tutarak."
        />
      </Alan>

      <Uyari>{hata}</Uyari>

      <Dugme onClick={ekle} bekliyor={bekliyor}>
        {secilenGunler.length} güne ekle
      </Dugme>
    </div>
  )
}

/* Ödeme takibi. Ayrı bir muhasebe modülü kurulmadı: koç aylık tutarı ve ay
   sayısını giriyor, sistem taksitleri yazıyor, geciken taksit karar
   kuyruğuna düşüyor. Burası kaydın görüldüğü ve elle kapatıldığı yer. */

const TAKSIT_ETIKET = {
  odendi: 'Ödendi',
  gecikti: 'Gecikti',
  kismi: 'Kısmi',
  bekliyor: 'Bekliyor',
  iptal: 'İptal',
}

const tlYaz = (n) =>
  new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(Number(n ?? 0))

function Odemeler({ ogrenci }) {
  const [ozet, setOzet] = useState(null)
  const [formAcik, setFormAcik] = useState(false)
  const [tutar, setTutar] = useState('')
  const [ay, setAy] = useState('6')
  const [vade, setVade] = useState(() => new Date().toLocaleDateString('sv-SE'))
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState('')

  const yukle = useCallback(async () => {
    const { data, error } = await supabase.rpc('odeme_ozeti', { p_ogrenci: ogrenci.id })
    if (error) setHata(hataMetni(error))
    setOzet(data ?? {})
  }, [ogrenci.id])

  useEffect(() => {
    yukle()
  }, [yukle])

  async function kur() {
    setHata('')
    setBekliyor(true)
    const { error } = await supabase.rpc('sozlesme_kur', {
      p_ogrenci: ogrenci.id,
      p_baslik: 'Koçluk',
      p_ilk_vade: vade,
      p_ay_sayisi: Number(ay),
      p_aylik_tutar: Number(tutar),
    })
    setBekliyor(false)
    if (error) {
      setHata(hataMetni(error))
      return
    }
    setFormAcik(false)
    setTutar('')
    await yukle()
  }

  async function tahsil(id) {
    const { error } = await supabase.rpc('taksit_tahsil', { p_taksit_id: id })
    if (error) setHata(hataMetni(error))
    else yukle()
  }

  const taksitler = ozet?.taksitler ?? []

  return (
    <Bolum
      cizgili
      baslik="Ödeme"
      aciklama="Geciken taksit karar kuyruğuna düşer."
      eylem={formAcik ? 'Kapat' : '+ Plan kur'}
      onEylem={() => setFormAcik((v) => !v)}
    >
      {formAcik && (
        <div className="form-kutu form-kutu--duz">
          <div className="ucul">
            <Alan etiket="Aylık tutar">
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={tutar}
                onChange={(e) => setTutar(e.target.value)}
                placeholder="2500"
              />
            </Alan>
            <Alan etiket="Kaç ay">
              <input
                type="number"
                min="1"
                max="24"
                inputMode="numeric"
                value={ay}
                onChange={(e) => setAy(e.target.value)}
              />
            </Alan>
            <Alan etiket="İlk vade">
              <input type="date" value={vade} onChange={(e) => setVade(e.target.value)} />
            </Alan>
          </div>
          {tutar && ay ? (
            <p className="kart-alt">
              Toplam {tlYaz(Number(tutar) * Number(ay))} TL · {ay} taksit
            </p>
          ) : null}
          <Uyari>{hata}</Uyari>
          <Dugme onClick={kur} bekliyor={bekliyor} disabled={!tutar || !ay}>
            Planı kur
          </Dugme>
        </div>
      )}

      {!formAcik && <Uyari>{hata}</Uyari>}

      {ozet === null ? (
        <Yukleniyor />
      ) : taksitler.length === 0 ? (
        <BosDurum metin="Ödeme planı yok. Aylık tutarı ve ay sayısını girersen taksitleri sistem yazar." />
      ) : (
        <>
          <div className="odeme-sayilar">
            <span className="odeme-sayi">
              <strong>{tlYaz(ozet.odenen)}</strong>tahsil edilen
            </span>
            <span className="odeme-sayi">
              <strong>{tlYaz(Number(ozet.toplam ?? 0) - Number(ozet.odenen ?? 0))}</strong>kalan
            </span>
          </div>
          {Number(ozet.geciken ?? 0) > 0 ? (
            <p className="odeme-gecikme">
              {tlYaz(ozet.geciken)} TL geciken · {ozet.gecikenAdet} taksit
            </p>
          ) : null}
          <ul className="liste">
            {taksitler.map((t) => (
              <li key={t.id} className="liste-satir">
                <div>
                  <span className="liste-ad">
                    {new Date(`${t.vade}T00:00:00`).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'long',
                    })}{' '}
                    · {tlYaz(t.tutar)} TL
                  </span>
                  <span className="liste-alt" data-odeme={t.durum}>
                    {TAKSIT_ETIKET[t.durum] ?? t.durum}
                    {t.durum === 'kismi' ? ` · ${tlYaz(t.kalan)} TL kaldı` : ''}
                  </span>
                </div>
                {t.durum === 'odendi' || t.durum === 'iptal' ? null : (
                  <button className="metin-dugme" onClick={() => tahsil(t.id)}>
                    Tahsil ettim
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </Bolum>
  )
}
