import { useCallback, useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Alan, AltSayfa, Bos, Dugme, Kart, Uyari, Yukleniyor } from '../bilesenler/Ortak.jsx'
import OgrenciSatiri from '../bilesenler/OgrenciSatiri.jsx'
import TopluDurtme from '../bilesenler/TopluDurtme.jsx'
import { kullaniciOlustur } from '../lib/hesap.js'


/* Liste bir kayıt defteri değil, günün iş kuyruğu. Üç kademe:
   önce dokunulacaklar, izlenecekler, kapalı hesaplar. Eski "Riskli"
   süzgeci 10 öğrencinin 9'unu geçiriyordu, yani hiçbir şey elemiyordu. */
const GRUPLAR = [
  ['acil', 'Önce bunlar', 'a'],
  ['izle', 'İzle', 'i'],
  ['iyi', 'Yolunda', 'y'],
]

function grubu(o) {
  if (!o.aktif) return 'pasif'
  return o.risk?.risk_seviyesi ?? 'izle'
}

export default function Ogrencilerim({ onOgrenciAc, onGit }) {
  const [ogrenciler, setOgrenciler] = useState(null)
  const [riskler, setRiskler] = useState({})
  const [nabizlar, setNabizlar] = useState({})
  const [kataloglar, setKataloglar] = useState([])
  const [hata, setHata] = useState('')
  const [formAcik, setFormAcik] = useState(false)
  const [pasifAcik, setPasifAcik] = useState(false)
  const [arama, setArama] = useState('')
  const [durtmeAcik, setDurtmeAcik] = useState(false)

  const yukle = useCallback(async () => {
    const [o, r, n, k] = await Promise.all([
      supabase
        .from('ogrenciler')
        .select('id, alan, sinif, aktif, katalog_id, profiller!ogrenciler_id_fkey(ad_soyad, fotograf_yolu), kataloglar(ad)')
        .order('kayit_tarihi', { ascending: false }),
      supabase
        .from('ogrenci_risk')
        .select('ogrenci_id, risk_seviyesi, risk_ham, tamamlama_yuzdesi, gun_gecti, hic_baslamadi, gecikmis_gorev, sessiz_gun, net_farki, guncel_seri, haftalik_gorev, dun_tam, eksik_ust_uste'),
      supabase.rpc('ogrenci_nabiz'),
      supabase
        .from('kataloglar')
        .select('id, ad, tur, seviye, alan')
        .is('koc_id', null)
        .order('sira'),
    ])
    if (o.error) setHata(hataMetni(o.error))
    setOgrenciler(o.data ?? [])
    setRiskler(Object.fromEntries((r.data ?? []).map((x) => [x.ogrenci_id, x])))
    setNabizlar(Object.fromEntries((n.data ?? []).map((x) => [x.ogrenci_id, x.nabiz])))
    setKataloglar(k.data ?? [])
  }, [])

  useEffect(() => {
    yukle()
  }, [yukle])

  /* risk_ham kırpılmamış skor. Eski risk_skoru 100'de tavan yaptığı için
     en kritik dört öğrenci aynı değerde toplanıp sıra rastgele kalıyordu. */
  const sirali = (ogrenciler ?? [])
    .map((o) => ({ ...o, risk: riskler[o.id] ?? null }))
    .sort((a, b) => {
      if (a.aktif !== b.aktif) return a.aktif ? -1 : 1
      const f = (b.risk?.risk_ham ?? -1) - (a.risk?.risk_ham ?? -1)
      if (f !== 0) return f
      return (b.risk?.gecikmis_gorev ?? 0) - (a.risk?.gecikmis_gorev ?? 0)
    })

  const kova = { acil: [], izle: [], iyi: [], pasif: [] }
  sirali.forEach((o) => kova[grubu(o)].push(o))

  /* Arama isim üzerinde; harf yazıldığı anda gruplar kalkar, düz liste
     kalır. Boş bırakılınca gruplu görünüm geri gelir. */
  const aranan = arama.trim().toLocaleLowerCase('tr')
  const bulunan = aranan
    ? sirali.filter((o) =>
        (o.profiller?.ad_soyad ?? '').toLocaleLowerCase('tr').includes(aranan),
      )
    : null
  /* Toplu mesajın hedefi "önce bunlar" kademesi; koçun sabah dokunduğu grup. */
  const durtmeHedefi = kova.acil

  const satirCiz = (o) => (
    <OgrenciSatiri
      key={o.id}
      ogrenci={o}
      risk={o.risk}
      nabiz={nabizlar[o.id]}
      onAc={onOgrenciAc}
    />
  )

  return (
    <div className="panel">
      <Uyari>{hata}</Uyari>

      <Kart
        baslik="Öğrenciler"
        altBaslik={ogrenciler ? `${ogrenciler.length} öğrenci` : undefined}
        eylem={
          <button className="ikon-dugme" onClick={() => setFormAcik(true)} aria-label="Öğrenci ekle" title="Öğrenci ekle">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
                 strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        }
      >
        {formAcik && (
          <AltSayfa
            baslik="Öğrenci ekle"
            onKapat={() => setFormAcik(false)}
            dugmeler={<Dugme tur="ikincil" onClick={() => setFormAcik(false)}>Kapat</Dugme>}
          >
            <OgrenciFormu kataloglar={kataloglar} onEklendi={yukle} />
          </AltSayfa>
        )}

        {ogrenciler === null ? (
          <Yukleniyor />
        ) : ogrenciler.length === 0 ? (
          <Bos
            baslik="Henüz öğrenciniz yok"
            aciklama="Öğrenci ekleyin. Sistem geçici bir şifre üretir; öğrenci o şifreyle giriş yapıp kendi şifresini belirler."
          />
        ) : (
          <>
            <label className="arama-kutu">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
                   strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
              </svg>
              <input
                type="search"
                value={arama}
                onChange={(e) => setArama(e.target.value)}
                placeholder="İsim ara"
                aria-label="Öğrenci ara"
              />
            </label>

            {/* Toplu mesaj kendi başına bir ekran değil: her zaman ekranda
                görünen kümeye gidiyor, hedefi belirsiz kalmasın. */}
            {!bulunan && durtmeHedefi.length > 1 && !durtmeAcik && (
              <button className="durtme-serit" onClick={() => setDurtmeAcik(true)}>
                <span aria-hidden="true">✎</span>
                <span>Önce bunlar listesindeki {durtmeHedefi.length} öğrenciye toplu mesaj</span>
              </button>
            )}
            {durtmeAcik && durtmeHedefi.length > 0 && (
              <TopluDurtme
                ogrenciler={durtmeHedefi}
                onKapat={() => setDurtmeAcik(false)}
              />
            )}

            {bulunan ? (
              bulunan.length === 0 ? (
                <Bos baslik="Eşleşen öğrenci yok" />
              ) : (
                <ul className="liste liste--kartli">{bulunan.map(satirCiz)}</ul>
              )
            ) : (
              <>
                {GRUPLAR.map(([anahtar, ad, ton]) =>
                  kova[anahtar].length === 0 ? null : (
                    <section key={anahtar} className="ogr-grup">
                      <h3 className="ogr-grup-baslik">
                        <span className={`ogr-grup-serit ogr-grup-serit--${ton}`} aria-hidden="true" />
                        {ad}
                        <span className="ogr-grup-sayi">{kova[anahtar].length}</span>
                      </h3>
                      <ul className="liste liste--kartli">{kova[anahtar].map(satirCiz)}</ul>
                    </section>
                  ),
                )}

                {kova.pasif.length > 0 && (
                  <section className="ogr-grup">
                    <button
                      className="ogr-grup-baslik ogr-grup-baslik--dugme"
                      onClick={() => setPasifAcik((v) => !v)}
                      aria-expanded={pasifAcik}
                    >
                      <span className="ogr-grup-serit ogr-grup-serit--p" aria-hidden="true" />
                      Pasif
                      <span className="ogr-grup-sayi">
                        {kova.pasif.length} {pasifAcik ? '⌃' : '⌄'}
                      </span>
                    </button>
                    {pasifAcik && (
                      <ul className="liste liste--kartli">{kova.pasif.map(satirCiz)}</ul>
                    )}
                  </section>
                )}
              </>
            )}
          </>
        )}
      </Kart>
    </div>
  )
}

function OgrenciFormu({ kataloglar, onEklendi }) {
  const [adSoyad, setAdSoyad] = useState('')
  const [eposta, setEposta] = useState('')
  const [katalogId, setKatalogId] = useState('')
  const [sinif, setSinif] = useState('')
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState('')
  const [sonuc, setSonuc] = useState(null)

  const secili = kataloglar.find((k) => String(k.id) === katalogId)

  async function ekle() {
    setHata('')
    setSonuc(null)
    setBekliyor(true)
    try {
      const d = await kullaniciOlustur({
        rol: 'ogrenci',
        ad_soyad: adSoyad.trim(),
        eposta: eposta.trim(),
        katalog_id: katalogId ? Number(katalogId) : null,
        alan: secili?.alan ?? null,
        sinif: sinif ? Number(sinif) : (secili?.seviye ?? null),
      })
      setSonuc(d)
      setAdSoyad('')
      setEposta('')
      await onEklendi()
    } catch (e) {
      setHata(hataMetni(e))
    } finally {
      setBekliyor(false)
    }
  }

  if (sonuc) {
    return (
      <div className="form-kutu">
        <div className="kod-sonuc">
          <p>
            <strong className="satir-ad">{sonuc.ad_soyad}</strong> için hesap açıldı.
            Aşağıdaki bilgileri öğrenciye iletin.
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
          <p className="uyari-not">
            Bu şifre bir daha gösterilmez. Öğrenci ilk girişte kendi şifresini belirleyecek.
          </p>
        </div>
        <Dugme tur="ikincil" onClick={() => setSonuc(null)}>
          Bir öğrenci daha ekle
        </Dugme>
      </div>
    )
  }

  return (
    <div className="form-kutu">
      <Alan etiket="Ad soyad">
        <input
          value={adSoyad}
          onChange={(e) => setAdSoyad(e.target.value)}
          placeholder="Örn. Ayşe Yılmaz"
        />
      </Alan>

      <Alan etiket="E-posta" ipucu="Öğrenci bu adresle giriş yapacak">
        <input
          type="email"
          value={eposta}
          onChange={(e) => setEposta(e.target.value)}
          placeholder="ogrenci@eposta.com"
        />
      </Alan>

      <Alan etiket="Konu kataloğu">
        <select value={katalogId} onChange={(e) => setKatalogId(e.target.value)}>
          <option value="">Sonra seçilsin</option>
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
          <option value="8">8. sınıf</option>
          <option value="9">9. sınıf</option>
          <option value="10">10. sınıf</option>
          <option value="11">11. sınıf</option>
          <option value="12">12. sınıf</option>
          <option value="13">Mezun</option>
        </select>
      </Alan>

      <Uyari>{hata}</Uyari>

      <Dugme onClick={ekle} bekliyor={bekliyor}>
        Hesabı oluştur
      </Dugme>
    </div>
  )
}


/** Sınıf ortalaması net trendi. Kütüphane yerine elle çizilmiş SVG:
 *  tek bağımlılık daha az, çizginin rengi ve dolgusu tam kontrolde. */
