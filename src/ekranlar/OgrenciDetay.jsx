import { useCallback, useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Alan, Bos, Dugme, Kart, Uyari, Yukleniyor } from '../bilesenler/Ortak.jsx'
import KaynakSecici from '../bilesenler/KaynakSecici.jsx'
import { FotografYukle } from '../bilesenler/Fotograf.jsx'
import ProgramIzgarasi, { PERIYOTLAR } from '../bilesenler/ProgramIzgarasi.jsx'
import DenemePaneli from '../bilesenler/DenemePaneli.jsx'
import OgrenciKimlikKarti, { KimlikOlcumleri } from '../bilesenler/OgrenciKimlikKarti.jsx'
import KonuYolu from '../bilesenler/KonuYolu.jsx'
import { aksanStili } from '../lib/sekmeAksani.js'
import { kullaniciOlustur } from '../lib/hesap.js'
import Rozetlerim from './Rozetlerim.jsx'

const ALAN_ADI = { sayisal: 'Sayısal', esit_agirlik: 'Eşit Ağırlık', sozel: 'Sözel', dil: 'Dil' }
const TUR_ADI = {
  konu_anlatimi: 'Konu anlatımı',
  soru_cozumu: 'Soru çözümü',
  tekrar: 'Tekrar',
  deneme: 'Deneme',
  okuma: 'Okuma',
  diger: 'Diğer',
}
const DURUM_ADI = { bekliyor: 'Bekliyor', devam: 'Devam ediyor', tamamlandi: 'Tamamlandı', atlandi: 'Atlandı' }
export default function OgrenciDetay({ ogrenciId, onGeri, onMesaj, onGozuyle }) {
  const [ogrenci, setOgrenci] = useState(null)
  const [netDurumu, setNetDurumu] = useState(null)
  const [kataloglar, setKataloglar] = useState([])
  const [sekme, setSekme] = useState('program')
  const [duzenle, setDuzenle] = useState(false)
  const [ek, setEk] = useState(null)
  const [hata, setHata] = useState('')

  const yukle = useCallback(async () => {
    const { data, error } = await supabase
      .from('ogrenciler')
      .select(
        'id, koc_id, alan, sinif, katalog_id, aktif, hedef_universite, hedef_bolum, hedef_tyt_net, hedef_ayt_net, kayit_tarihi, profiller!ogrenciler_id_fkey(ad_soyad, telefon, fotograf_yolu), kataloglar(id, ad)',
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
      <button className="metin-dugme geri" onClick={onGeri}>
        ← Öğrenci listesi
      </button>

      <OgrenciKimlikKarti
        ogrenci={ogrenci}
        netDurumu={netDurumu}
        duzenleAcik={duzenle}
        onDuzenle={() => setDuzenle((v) => !v)}
        onDegisti={yukle}
        sekme={sekme}
        onSekme={setSekme}
        onMesaj={onMesaj}
        onGozuyle={onGozuyle}
        onEk={setEk}
      />

      {duzenle && (
        <Kart>
          <BilgiFormu
            ogrenci={ogrenci}
            kataloglar={kataloglar}
            onKaydedildi={async () => {
              setDuzenle(false)
              await yukle()
            }}
          />
        </Kart>
      )}

      <div className="sekme-govde" style={aksanStili()}>
      <nav className="sekmeler sekmeler--genis">
        {[
          ['program', 'Program'],
          ['denemeler', 'Denemeler'],
          ['konular', 'Konular'],
          ['notlar', 'Notlar'],
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
          <KimlikOlcumleri
            ogrenci={ogrenci}
            netDurumu={netDurumu}
            seri={ek?.seri}
            tamamlama={ek?.risk?.tamamlama_yuzdesi}
          />
          <Program ogrenci={ogrenci} />
        </>
      )}
      {sekme === 'denemeler' && <Denemeler ogrenci={ogrenci} />}
      {sekme === 'konular' && <Konular ogrenci={ogrenci} />}
      {sekme === 'rozetler' && <Rozetlerim ogrenciId={ogrenci.id} />}
      {sekme === 'notlar' && <Notlar ogrenci={ogrenci} />}
      {sekme === 'veli' && <Veliler ogrenci={ogrenci} />}
      </div>
    </div>
  )
}

/* ─────────────────────────── Bilgi düzenleme ─────────────────────────── */

function BilgiFormu({ ogrenci, kataloglar, onKaydedildi }) {
  const [ad, setAd] = useState(ogrenci.profiller?.ad_soyad ?? '')
  const [telefon, setTelefon] = useState(ogrenci.profiller?.telefon ?? '')
  const [katalogId, setKatalogId] = useState(ogrenci.katalog_id ? String(ogrenci.katalog_id) : '')
  const [sinif, setSinif] = useState(ogrenci.sinif ? String(ogrenci.sinif) : '')
  const [alan, setAlan] = useState(ogrenci.alan ?? '')
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

/* ─────────────────────────── Program ─────────────────────────── */

function Program({ ogrenci }) {
  const [secim, setSecim] = useState(null) // { blok, tarih, periyot }
  const [tazele, setTazele] = useState(0)

  return (
    <Kart baslik="Haftalık program" altBaslik="Zaman dilimine göre">
      {/* Form ızgaranın altında değil, dokunulan hücrenin altında açılıyor.
          Yerleşimi ortak bileşen yönetiyor; öğrenci paneli de aynı yeri kullanır. */}
      <ProgramIzgarasi
        key={tazele}
        ogrenci={ogrenci}
        duzenlenebilir
        onHucreSec={(blok, tarih, periyot) => setSecim({ blok, tarih, periyot })}
        onRutinEkle={(gunler) => setSecim({ rutinGunler: gunler })}
        acikSecim={secim}
        panel={
          secim ? (
            <HucreDuzenle
              ogrenci={ogrenci}
              secim={secim}
              onKapat={() => setSecim(null)}
              onDegisti={() => {
                setSecim(null)
                setTazele((t) => t + 1)
              }}
            />
          ) : null
        }
      />
    </Kart>
  )
}

/** Bir hücreye ders atar ya da mevcut bloğu düzenler/siler. */
function HucreDuzenle({ ogrenci, secim, onKapat, onDegisti }) {
  const { blok, tarih, periyot, rutinGunler } = secim

  if (rutinGunler) {
    return (
      <div className="hucre-panel">
        <header className="hucre-basi">
          <div>
            <span className="hucre-gun">Rutin ekle</span>
            <span className="hucre-saat">Seçtiğin günlere aynı görev yazılır</span>
          </div>
          <button className="metin-dugme" onClick={onKapat}>Kapat</button>
        </header>
        <RutinFormu ogrenci={ogrenci} gunler={rutinGunler} onEklendi={onDegisti} />
      </div>
    )
  }

  const gun = new Date(tarih).toLocaleDateString('tr-TR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
  const saat = periyot ? PERIYOTLAR[periyot - 1] : 'Gün boyu'

  async function sil() {
    await supabase.from('gorevler').delete().eq('id', blok.id)
    onDegisti()
  }

  return (
    <div className="hucre-panel">
      <header className="hucre-basi">
        <div>
          <span className="hucre-gun">{gun}</span>
          <span className="hucre-saat">{saat}</span>
        </div>
        <button className="metin-dugme" onClick={onKapat}>Kapat</button>
      </header>

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
    </div>
  )
}


/* Adet girilmesi anlamlı olan türler. Konu anlatımına "30 soru" demek tuhaf. */
const ADETLI = new Set(['soru_cozumu', 'okuma', 'tekrar'])

/** Boş bir hücreye ders atar. Ders seçilince o dersin konuları yüklenir. */
function GorevFormu({ ogrenci, tarih, periyot, onEklendi }) {
  const [dersler, setDersler] = useState([])
  const [konular, setKonular] = useState([])
  const [dersId, setDersId] = useState('')
  const [konuId, setKonuId] = useState('')
  const [tur, setTur] = useState('konu_anlatimi')
  const [kaynakId, setKaynakId] = useState(null)
  const [kaynakAralik, setKaynakAralik] = useState('')
  const [hedef, setHedef] = useState('')
  const [aciklama, setAciklama] = useState('')
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState('')

  useEffect(() => {
    if (!ogrenci.katalog_id) return
    supabase
      .from('dersler')
      .select('id, ad, sira')
      .eq('katalog_id', ogrenci.katalog_id)
      .order('sira')
      .then(({ data }) => setDersler(data ?? []))
  }, [ogrenci.katalog_id])

  useEffect(() => {
    if (!dersId) {
      setKonular([])
      return
    }
    supabase
      .from('konular')
      .select('id, ad, sira')
      .eq('ders_id', dersId)
      .order('sira')
      .then(({ data }) => setKonular(data ?? []))
  }, [dersId])

  async function ekle() {
    if (!dersId) {
      setHata('Önce bir ders seç.')
      return
    }
    setBekliyor(true)
    setHata('')

    const ders = dersler.find((d) => String(d.id) === dersId)
    const konu = konular.find((k) => String(k.id) === konuId)
    const baslik = konu ? `${TUR_ADI[tur]} — ${konu.ad}` : `${ders?.ad ?? ''} ${TUR_ADI[tur].toLowerCase()}`

    const { error } = await supabase.from('gorevler').insert({
      ogrenci_id: ogrenci.id,
      koc_id: ogrenci.koc_id,
      tarih,
      periyot: periyot ?? null,
      ders_id: Number(dersId),
      konu_id: konuId ? Number(konuId) : null,
      tur,
      baslik,
      hedef_adet: ADETLI.has(tur) && hedef ? Number(hedef) : null,
      aciklama: aciklama.trim() || null,
      kaynak_id: kaynakId,
      kaynak_aralik: kaynakId && kaynakAralik.trim() ? kaynakAralik.trim() : null,
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
          value={dersId}
          onChange={(e) => {
            setDersId(e.target.value)
            setKonuId('')
          }}
        >
          <option value="">Ders seç</option>
          {dersler.map((d) => (
            <option key={d.id} value={d.id}>{d.ad}</option>
          ))}
        </select>
      </Alan>

      <Alan etiket="Konu" ipucu="İstersen boş bırak">
        <select value={konuId} onChange={(e) => setKonuId(e.target.value)} disabled={!konular.length}>
          <option value="">{konular.length ? 'Konu seç' : 'Önce ders seç'}</option>
          {konular.map((k) => (
            <option key={k.id} value={k.id}>{k.ad}</option>
          ))}
        </select>
      </Alan>

      <Alan etiket="Tür">
        <select value={tur} onChange={(e) => setTur(e.target.value)}>
          {Object.entries(TUR_ADI).map(([k, ad]) => (
            <option key={k} value={k}>{ad}</option>
          ))}
        </select>
      </Alan>

      {/* Kaynak, tür ve konu seçildikten sonra soruluyor: motorun
          sıralama yapabilmesi için ikisine de ihtiyacı var. */}
      <KaynakSecici
        ogrenciId={ogrenci.id}
        ogrenciAdi={ogrenci.profiller?.ad_soyad}
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

      {ADETLI.has(tur) && (
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

      <Alan etiket="Not" ipucu="Öğrenci bu notu görevin altında görür">
        <textarea
          rows={2}
          value={aciklama}
          onChange={(e) => setAciklama(e.target.value)}
          placeholder="Örn. Önce çıkmış soruları çöz, sonra deneme kitabına geç."
        />
      </Alan>

      <Uyari>{hata}</Uyari>

      <Dugme onClick={ekle} bekliyor={bekliyor}>
        Bloğa ekle
      </Dugme>
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
  const [acikDers, setAcikDers] = useState(null)

  useEffect(() => {
    if (!ogrenci.katalog_id) {
      setDersler([])
      return
    }
    supabase
      .from('dersler')
      .select('id, ad, kapsam, konular(count)')
      .eq('katalog_id', ogrenci.katalog_id)
      .order('sira')
      .then(({ data }) => setDersler(data ?? []))
  }, [ogrenci.katalog_id])

  if (dersler === null) return <Kart baslik="Konular"><Yukleniyor /></Kart>

  /* Öğrencinin gördüğü yolun aynısı; fark eylemler: koç durum seçer ve onaylar.
     Onay verilince öğrencinin haritasında durak yeşile döner. */
  return (
    <Kart baslik="Konu yolu" altBaslik={ogrenci.kataloglar?.ad}>
      {dersler.length === 0 ? (
        <Bos baslik="Katalog atanmamış" aciklama="Bilgileri düzenleyip bir katalog seçin." />
      ) : (
        <ul className="ders-liste">
          {dersler.map((d) => (
            <li key={d.id}>
              <button className="ders-satir" onClick={() => setAcikDers((a) => (a === d.id ? null : d.id))} aria-expanded={acikDers === d.id}>
                <span className="liste-ad">{d.ad}</span>
                <span className="liste-alt">{d.kapsam.replace('_', '+').toUpperCase()}</span>
                <span className="sayi">{d.konular?.[0]?.count ?? 0} konu</span>
              </button>
              {acikDers === d.id && <KonuYolu ogrenciId={ogrenci.id} dersId={d.id} rol="koc" />}
            </li>
          ))}
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
          {[blok.dersler?.ad, blok.konular?.ad, TUR_ADI[blok.tur],
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
  const [tur, setTur] = useState('soru_cozumu')
  const [hedef, setHedef] = useState('20')
  const [aciklama, setAciklama] = useState('')
  const [secili, setSecili] = useState(() => gunler.map(() => true))
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState('')

  useEffect(() => {
    if (!ogrenci.katalog_id) return
    supabase
      .from('dersler')
      .select('id, ad, sira')
      .eq('katalog_id', ogrenci.katalog_id)
      .order('sira')
      .then(({ data }) => setDersler(data ?? []))
  }, [ogrenci.katalog_id])

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

    const ders = dersler.find((d) => String(d.id) === dersId)
    const { error } = await supabase.from('gorevler').insert(
      secilenGunler.map((tarih) => ({
        ogrenci_id: ogrenci.id,
        koc_id: ogrenci.koc_id,
        tarih,
        periyot: null,
        ders_id: Number(dersId),
        tur,
        baslik: ders?.ad ?? 'Rutin',
        hedef_adet: ADETLI.has(tur) && hedef ? Number(hedef) : null,
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
        <select value={dersId} onChange={(e) => setDersId(e.target.value)}>
          <option value="">Ders seç</option>
          {dersler.map((d) => (
            <option key={d.id} value={d.id}>{d.ad}</option>
          ))}
        </select>
      </Alan>

      <Alan etiket="Tür">
        <select value={tur} onChange={(e) => setTur(e.target.value)}>
          {Object.entries(TUR_ADI).map(([k, ad]) => (
            <option key={k} value={k}>{ad}</option>
          ))}
        </select>
      </Alan>

      {ADETLI.has(tur) && (
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
