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
import { kullaniciOlustur, kullaniciSil } from '../lib/hesap.js'
import { ADETLI_TURLER, GOREV_TUR_ADI } from '../lib/gorevTuru.js'
import { dersleriGrupla, dersKapsamAdi, kapsamEtiketi } from '../lib/dersGruplari.js'

const ALAN_ADI = { sayisal: 'Sayısal', esit_agirlik: 'Eşit Ağırlık', sozel: 'Sözel', dil: 'Dil' }
const DURUM_ADI = { bekliyor: 'Bekliyor', devam: 'Devam ediyor', tamamlandi: 'Tamamlandı', atlandi: 'Atlandı' }
export default function OgrenciDetay({ ogrenciId, onGeri, onMesaj, onGozuyle }) {
  const [ogrenci, setOgrenci] = useState(null)
  const [netDurumu, setNetDurumu] = useState(null)
  const [kataloglar, setKataloglar] = useState([])
  const [sekme, setSekme] = useState('program')
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

  useEffect(() => {
    yukle()
    supabase
      .from('kataloglar')
      .select('id, ad, alan, seviye')
      .is('koc_id', null)
      .order('sira')
      .then(({ data }) => setKataloglar(data ?? []))
  }, [yukle])

  if (hata) return <Uyari>{hata}</Uyari>
  if (!ogrenci) return <Yukleniyor />

  const ad = ogrenci.profiller?.ad_soyad ?? 'İsimsiz'

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
      />

      <div className="sekme-govde" style={aksanStili()}>
      <nav className="sekmeler sekmeler--genis">
        {[
          ['program', 'Program'],
          ['denemeler', 'Denemeler'],
          ['konular', 'Konular'],
          ['kayit', 'Kayıt'],
        ].map(([k, e]) => (
          <button
            key={k}
            className={sekme === k ? 'sekme sekme--etkin' : 'sekme'}
            onClick={() => setSekme(k)}
          >
            {e}
          </button>
        ))}
      </nav>

      {sekme === 'program' && (
        <>
          <KimlikOlcumleri ogrenci={ogrenci} netDurumu={netDurumu} />
          <Program ogrenci={ogrenci} />
          {/* Programın ve rutinlerin altında: bu öğrenciye hangi kitapları
              vermişim. Yeni görev yazarken elindekine bakmak için. */}
          <OgrenciKaynaklari ogrenciId={ogrenci.id} rol="koc" />
        </>
      )}
      {sekme === 'denemeler' && <Denemeler ogrenci={ogrenci} />}
      {sekme === 'konular' && <Konular ogrenci={ogrenci} />}
      {/* Kayıt: idari her şey tek yerde. Kimlik bilgileri (telefon dâhil,
          müşteri kartı gibi), düzenleme formu, veli bağları, koç notları. */}
      {sekme === 'kayit' && (
        <>
          <Kart
            baslik="Bilgiler"
            eylem={
              <Dugme tur="ikincil" onClick={() => setDuzenle((v) => !v)}>
                {duzenle ? 'Vazgeç' : 'Düzenle'}
              </Dugme>
            }
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
          </Kart>
          <Veliler ogrenci={ogrenci} />
          <Notlar ogrenci={ogrenci} />
          <TehlikeliBolge ogrenci={ogrenci} onSilindi={onGeri} />
        </>
      )}
      </div>
    </div>
  )
}

/* ─────────────────────────── Künye ─────────────────────────── */

function Kunye({ ogrenci }) {
  const telefon = ogrenci.profiller?.telefon
  const satirlar = [
    ['Telefon', telefon ? <a href={`tel:${telefon.replace(/\s/g, '')}`}>{telefon}</a> : '—'],
    ['Sınıf', ogrenci.sinif ? (ogrenci.sinif === 13 ? 'Mezun' : `${ogrenci.sinif}. sınıf`) : '—'],
    ['Alan', ogrenci.alan ? ALAN_ADI[ogrenci.alan] : '—'],
    ['Katalog', ogrenci.kataloglar?.ad ?? '—'],
    ['Hedef', [ogrenci.hedef_universite, ogrenci.hedef_bolum].filter(Boolean).join(' · ') || '—'],
    [
      'Hedef net',
      [ogrenci.hedef_tyt_net != null && `TYT ${Number(ogrenci.hedef_tyt_net)}`, ogrenci.hedef_ayt_net != null && `AYT ${Number(ogrenci.hedef_ayt_net)}`]
        .filter(Boolean)
        .join(' · ') || '—',
    ],
    ['Kayıt', ogrenci.kayit_tarihi ? new Date(ogrenci.kayit_tarihi).toLocaleDateString('tr-TR') : '—'],
    ['Uygulama erişimi', ogrenci.aktif ? 'Açık' : 'Kapalı'],
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
    <Kart baslik="Tehlikeli bölge" sinif="tehlike-kart">
      <p className="tehlike-not">
        Öğrenci koçluktan ayrıldıysa önce pasife almayı dene. Pasif öğrenci listede
        soluk durur, verisi korunur. Silmek geri alınamaz.
      </p>
      <button className="dugme dugme--tehlike" onClick={() => setAcik(true)}>
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
    </Kart>
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

  return (
    <>
      {blok ? (
        <BlokDuzenle blok={blok} onSil={sil} onDegisti={onDegisti} />
      ) : (
        <GorevFormu
          ogrenci={ogrenci}
          tarih={tarih}
          periyot={periyot}
          onEklendi={onDegisti}
        />
      )}
    </>
  )
}

/** Boş bir hücreye ders atar. Ders seçilince o ders grubunun bütün
 *  konuları (TYT + AYT) yüklenir. */
function GorevFormu({ ogrenci, tarih, periyot, onEklendi }) {
  const [dersler, setDersler] = useState([])
  const [konular, setKonular] = useState([])
  /* Seçim artık ders satırına değil ders grubuna bağlı: koç "Matematik"
     diyor, TYT/AYT ayrımını konu belirliyor. */
  const [grupKod, setGrupKod] = useState('')
  /* Konu seçilmeyen görevde kapsamı koç söylüyor. */
  const [kapsamDersId, setKapsamDersId] = useState('')
  const [konuId, setKonuId] = useState('')
  const [tur, setTur] = useState('konu_anlatimi')
  const [kaynakId, setKaynakId] = useState(null)
  const [kaynakAralik, setKaynakAralik] = useState('')
  const [hedef, setHedef] = useState('')
  const [aciklama, setAciklama] = useState('')
  /* Saat isteğe bağlı. Boş bırakılırsa gün eskisi gibi işler: görevler
     koçun sırasıyla, öğrenci istediğinden başlar. Bir göreve saat
     verildiği anda o gün saate bağlanır. */
  const [basSaat, setBasSaat] = useState('')
  const [bitSaat, setBitSaat] = useState('')
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState('')
  /* Form sekiz alandı ve hepsi her seferinde açıktı; oysa sıradan bir
     görev Ders + Konu + Tür ile yazılıyor. Gerisi kapalı başlıyor,
     ihtiyaç duyan açıyor. */
  const [ayrinti, setAyrinti] = useState(false)

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

    const { error } = await supabase.from('gorevler').insert({
      ogrenci_id: ogrenci.id,
      koc_id: ogrenci.koc_id,
      tarih,
      periyot: periyot ?? null,
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
    return (
      <Bos
        baslik="Katalog atanmamış"
        aciklama="Ders atayabilmek için önce öğrenciye bir konu kataloğu seçin."
      />
    )
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
        <span className="ayrinti-ok" aria-hidden="true">{ayrinti ? '▾' : '▸'}</span>
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
          Bloğa ekle
        </Dugme>
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

  if (dersler === null) return <Kart baslik="Konular"><Yukleniyor /></Kart>

  /* Katalogda TYT Matematik ve AYT Matematik iki ayrı satır. Ekranda tek
     ders: "Matematik" açılınca ikisinin konuları alt alta, kapsam
     başlıklarıyla ayrılmış geliyor. Konu listesi böylece bütün kalıyor. */
  const gruplar = dersleriGrupla(dersler)
  const konuSayisi = (d) => d.konular?.[0]?.count ?? 0

  /* Öğrencinin gördüğü yolun aynısı; fark eylemler: koç durum seçer ve onaylar.
     Onay verilince öğrencinin haritasında durak yeşile döner. */
  return (
    <Kart baslik="Konu yolu" altBaslik={ogrenci.kataloglar?.ad}>
      {gruplar.length === 0 ? (
        <Bos baslik="Katalog atanmamış" aciklama="Bilgileri düzenleyip bir katalog seçin." />
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
                      <KonuYolu ogrenciId={ogrenci.id} dersId={d.id} rol="koc" />
                    </div>
                  ))}
              </li>
            )
          })}
        </ul>
      )}
    </Kart>
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
    <Kart baslik="Notlar" altBaslik="Her notta kimin göreceğini sen seçersin">
      <div className="form-kutu">
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
        <Bos baslik="Henüz not yok" aciklama="İlk notu yukarıdan ekleyebilirsin." />
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
    </Kart>
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
function Veliler({ ogrenci }) {
  const [liste, setListe] = useState(null)
  const [formAcik, setFormAcik] = useState(false)
  const [adSoyad, setAdSoyad] = useState('')
  const [eposta, setEposta] = useState('')
  const [iliski, setIliski] = useState('anne')
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState('')
  const [sonuc, setSonuc] = useState(null)

  const yukle = useCallback(async () => {
    const { data, error } = await supabase
      .from('veli_ogrenci')
      .select('veli_id, iliski, profiller!veli_ogrenci_veli_id_fkey(ad_soyad)')
      .eq('ogrenci_id', ogrenci.id)
    if (error) setHata(hataMetni(error))
    setListe(data ?? [])
  }, [ogrenci.id])

  useEffect(() => {
    yukle()
  }, [yukle])

  async function ekle() {
    setHata('')
    setBekliyor(true)
    try {
      const d = await kullaniciOlustur({
        rol: 'veli',
        ad_soyad: adSoyad.trim(),
        eposta: eposta.trim(),
        ogrenci_id: ogrenci.id,
        iliski,
      })
      setSonuc(d)
      setAdSoyad('')
      setEposta('')
      await yukle()
    } catch (e) {
      setHata(hataMetni(e))
    } finally {
      setBekliyor(false)
    }
  }

  async function bagiKaldir(veliId) {
    const { error } = await supabase
      .from('veli_ogrenci')
      .delete()
      .eq('ogrenci_id', ogrenci.id)
      .eq('veli_id', veliId)
    if (error) setHata(hataMetni(error))
    else yukle()
  }

  return (
    <Kart
      baslik="Veli"
      altBaslik="Veli yalnızca senin yayınladığın haftalık özeti görür"
      eylem={
        <Dugme tur="ikincil" onClick={() => { setFormAcik((v) => !v); setSonuc(null) }}>
          {formAcik ? 'Kapat' : 'Veli ekle'}
        </Dugme>
      }
    >
      {formAcik && (sonuc ? (
        <div className="form-kutu">
          <div className="kod-sonuc">
            <p>
              <strong className="satir-ad">{sonuc.ad_soyad}</strong> için veli hesabı açıldı.
              Bilgileri veliye iletin.
            </p>
            <div className="sifre-kutu">
              <span className="sifre-etiket">E-posta</span>
              <code>{sonuc.eposta}</code>
              <span className="sifre-etiket">Geçici şifre</span>
              <code className="sifre">{sonuc.gecici_sifre}</code>
            </div>
            <button
              className="metin-dugme"
              onClick={() =>
                navigator.clipboard?.writeText(
                  `E-posta: ${sonuc.eposta}\nGeçici şifre: ${sonuc.gecici_sifre}`,
                )
              }
            >
              Kopyala
            </button>
            <p className="uyari-not">Bu şifre bir daha gösterilmez.</p>
          </div>
          <Dugme tur="ikincil" onClick={() => setSonuc(null)}>Bir veli daha ekle</Dugme>
        </div>
      ) : (
        <div className="form-kutu">
          <Alan etiket="Ad soyad">
            <input value={adSoyad} onChange={(e) => setAdSoyad(e.target.value)} placeholder="Örn. Ayşe Yılmaz" />
          </Alan>
          <Alan etiket="E-posta" ipucu="Veli bu adresle giriş yapacak">
            <input type="email" value={eposta} onChange={(e) => setEposta(e.target.value)} placeholder="veli@eposta.com" />
          </Alan>
          <Alan etiket="Yakınlık">
            <select value={iliski} onChange={(e) => setIliski(e.target.value)}>
              {ILISKI.map(([k, ad]) => (
                <option key={k} value={k}>{ad}</option>
              ))}
            </select>
          </Alan>
          <Uyari>{hata}</Uyari>
          <Dugme onClick={ekle} bekliyor={bekliyor}>Hesabı oluştur</Dugme>
        </div>
      ))}

      {!formAcik && <Uyari>{hata}</Uyari>}

      {liste === null ? (
        <Yukleniyor />
      ) : liste.length === 0 ? (
        <Bos
          baslik="Bağlı veli yok"
          aciklama="Veli eklerseniz haftalık özetleri onaylayarak paylaşabilirsiniz."
        />
      ) : (
        <ul className="liste">
          {liste.map((v) => (
            <li key={v.veli_id} className="liste-satir">
              <div>
                <span className="liste-ad">{v.profiller?.ad_soyad ?? 'İsimsiz'}</span>
                <span className="liste-alt">
                  {ILISKI.find(([k]) => k === v.iliski)?.[1] ?? v.iliski}
                </span>
              </div>
              <button className="metin-dugme" onClick={() => bagiKaldir(v.veli_id)}>Bağı kaldır</button>
            </li>
          ))}
        </ul>
      )}
    </Kart>
  )
}


/* ─────────────────────────── Seri ve rozet ─────────────────────────── */

/** Koçun tebrik fırsatını kaçırmaması için: seri ve son kazanılan rozet.
 *  Öğrenci bunları kendi panelinde görüyor, koç göremiyordu. */


/** Mevcut bloğun notunu düzenler. Not, öğrencinin görev altında
 *  gördüğü tek serbest metin: "önce çıkmış sorular" gibi yönlendirmeler. */
function BlokDuzenle({ blok, onSil, onDegisti }) {
  const [not, setNot] = useState(blok.aciklama ?? '')
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState('')
  const [kaydedildi, setKaydedildi] = useState(false)

  async function kaydet() {
    setBekliyor(true)
    setHata('')
    const { error } = await supabase
      .from('gorevler')
      .update({ aciklama: not.trim() || null })
      .eq('id', blok.id)
    setBekliyor(false)
    if (error) {
      setHata(hataMetni(error))
      return
    }
    setKaydedildi(true)
    onDegisti()
  }

  return (
    <div className="form-kutu">
      <div>
        <span className="liste-ad">{blok.baslik}</span>
        <span className="liste-alt">
          {[blok.dersler?.ad, blok.konular?.ad, GOREV_TUR_ADI[blok.tur],
            blok.hedef_adet ? `${blok.yapilan_adet}/${blok.hedef_adet}` : null]
            .filter(Boolean).join(' · ')}
        </span>
      </div>

      <Alan etiket="Not" ipucu="Öğrenci bu notu görevin altında görür">
        <textarea
          rows={3}
          value={not}
          onChange={(e) => {
            setNot(e.target.value)
            setKaydedildi(false)
          }}
          placeholder="Örn. Önce çıkmış soruları çöz."
        />
      </Alan>

      <Uyari>{hata}</Uyari>
      {kaydedildi && <Uyari tur="bilgi">Not kaydedildi.</Uyari>}

      <div className="ikili">
        <Dugme onClick={kaydet} bekliyor={bekliyor}>Notu kaydet</Dugme>
        <Dugme tur="ikincil" onClick={onSil}>Bloğu sil</Dugme>
      </div>
    </div>
  )
}


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
  /* Form sekiz alandı ve hepsi her seferinde açıktı; oysa sıradan bir
     görev Ders + Konu + Tür ile yazılıyor. Gerisi kapalı başlıyor,
     ihtiyaç duyan açıyor. */
  const [ayrinti, setAyrinti] = useState(false)

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
    return <Bos baslik="Katalog atanmamış" aciklama="Önce öğrenciye bir konu kataloğu seçin." />
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
