import { useCallback, useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Alan, Bos, Dugme, Kart, Uyari, Yukleniyor } from '../bilesenler/Ortak.jsx'
import OgrenciSatiri from '../bilesenler/OgrenciSatiri.jsx'
import TopluDurtme from '../bilesenler/TopluDurtme.jsx'
import { kullaniciOlustur } from '../lib/hesap.js'


/* Liste bir kayıt defteri değil, günün iş kuyruğu. Üç kademe:
   önce dokunulacaklar, izlenecekler, kapalı hesaplar. Eski "Riskli"
   süzgeci 10 öğrencinin 9'unu geçiriyordu, yani hiçbir şey elemiyordu. */
const GRUPLAR = [
  ['acil', 'Önce bunlar', 'a'],
  ['izle', 'İzlemede', 'i'],
  ['iyi', 'Yolunda', 'y'],
]

function grubu(o) {
  if (!o.aktif) return 'pasif'
  return o.risk?.risk_seviyesi ?? 'izle'
}

/* Üstteki özet kartları sadece sayı göstermek yerine süzgeç. Sayıyı görüp
   "peki bu altı kişi kim" diye sorduğunda cevabı tek dokunuşta veriyor. */
const OZETLER = [
  {
    anahtar: 'acil',
    etiket: 'bugün dokun',
    uyari: true,
    sec: (o) => o.aktif && o.risk?.risk_seviyesi === 'acil',
  },
  {
    anahtar: 'gecikmis',
    etiket: 'gecikmiş görev',
    topla: (o) => o.risk?.gecikmis_gorev ?? 0,
    sec: (o) => o.aktif && (o.risk?.gecikmis_gorev ?? 0) > 0,
  },
  {
    anahtar: 'sessiz',
    etiket: '2+ gün sessiz',
    sec: (o) => o.aktif && !o.risk?.hic_baslamadi && (o.risk?.gun_gecti ?? 0) >= 2,
  },
  {
    anahtar: 'yeni',
    etiket: 'hiç başlamadı',
    sec: (o) => o.aktif && !!o.risk?.hic_baslamadi,
  },
]

export default function Ogrencilerim({ onOgrenciAc, onGozuyle, onGit }) {
  const [ogrenciler, setOgrenciler] = useState(null)
  const [riskler, setRiskler] = useState({})
  const [nabizlar, setNabizlar] = useState({})
  const [kataloglar, setKataloglar] = useState([])
  const [hata, setHata] = useState('')
  const [formAcik, setFormAcik] = useState(false)
  const [pasifAcik, setPasifAcik] = useState(false)
  const [suzgec, setSuzgec] = useState(null)
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

  const seciliOzet = OZETLER.find((z) => z.anahtar === suzgec) ?? null
  const suzulmus = seciliOzet ? sirali.filter(seciliOzet.sec) : []
  /* Toplu mesajın hedefi her zaman ekranda görünen küme. Süzgeç yoksa
     "önce bunlar" kademesi; koçun sabah dokunduğu grup zaten o. */
  const durtmeHedefi = seciliOzet ? suzulmus : kova.acil

  const satirCiz = (o) => (
    <OgrenciSatiri
      key={o.id}
      ogrenci={o}
      risk={o.risk}
      nabiz={nabizlar[o.id]}
      onAc={onOgrenciAc}
      onGozuyle={onGozuyle}
      onMesaj={() => onGit?.('/mesajlar')}
    />
  )

  return (
    <div className="panel">
      <Uyari>{hata}</Uyari>

      <Kart
        baslik="Öğrencilerim"
        altBaslik={ogrenciler ? `${ogrenciler.length} öğrenci · risk sırasına göre` : undefined}
        eylem={
          <Dugme tur="ikincil" onClick={() => setFormAcik((v) => !v)}>
            {formAcik ? 'Kapat' : 'Öğrenci ekle'}
          </Dugme>
        }
      >
        {formAcik && <OgrenciFormu kataloglar={kataloglar} onEklendi={yukle} />}

        {ogrenciler === null ? (
          <Yukleniyor />
        ) : ogrenciler.length === 0 ? (
          <Bos
            baslik="Henüz öğrenciniz yok"
            aciklama="Öğrenci ekleyin. Sistem geçici bir şifre üretir; öğrenci o şifreyle giriş yapıp kendi şifresini belirler."
          />
        ) : (
          <>
            {/* Listeye girmeden günün özeti. Her kart aynı zamanda süzgeç. */}
            <div className="gun-nabzi" role="group" aria-label="Günün özeti ve süzgeçler">
              {OZETLER.map((z) => {
                const kume = sirali.filter(z.sec)
                const sayi = z.topla
                  ? kume.reduce((t, o) => t + z.topla(o), 0)
                  : kume.length
                const etkin = suzgec === z.anahtar
                return (
                  <button
                    key={z.anahtar}
                    className={
                      'gn-hucre' +
                      (z.uyari && sayi > 0 ? ' gn-hucre--uyari' : '') +
                      (etkin ? ' gn-hucre--etkin' : '')
                    }
                    aria-pressed={etkin}
                    disabled={kume.length === 0}
                    onClick={() => {
                      setSuzgec(etkin ? null : z.anahtar)
                      setDurtmeAcik(false)
                    }}
                  >
                    <span className="gn-sayi">{sayi}</span>
                    <span className="gn-etiket">{z.etiket}</span>
                  </button>
                )
              })}
            </div>

            {/* Toplu mesaj kendi başına bir ekran değil: her zaman ekranda
                görünen kümeye gidiyor, hedefi belirsiz kalmasın. */}
            {durtmeHedefi.length > 1 && !durtmeAcik && (
              <button className="durtme-serit" onClick={() => setDurtmeAcik(true)}>
                <span aria-hidden="true">✎</span>
                <span>
                  {seciliOzet
                    ? `Bu ${durtmeHedefi.length} öğrenciye`
                    : `Önce bunlar listesindeki ${durtmeHedefi.length} öğrenciye`}{' '}
                  toplu mesaj
                </span>
              </button>
            )}
            {durtmeAcik && durtmeHedefi.length > 0 && (
              <TopluDurtme
                ogrenciler={durtmeHedefi}
                onKapat={() => setDurtmeAcik(false)}
              />
            )}

            {seciliOzet ? (
              <section className="ogr-grup">
                <div className="ogr-grup-baslik">
                  <span className="ogr-grup-serit ogr-grup-serit--a" aria-hidden="true" />
                  {seciliOzet.etiket}
                  <button className="suzgec-kaldir" onClick={() => setSuzgec(null)}>
                    Süzgeci kaldır
                  </button>
                </div>
                {suzulmus.length === 0 ? (
                  <Bos baslik="Bu süzgeçte kimse yok" aciklama="İyi haber sayılır." />
                ) : (
                  <ul className="liste liste--kartli">{suzulmus.map(satirCiz)}</ul>
                )}
              </section>
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
