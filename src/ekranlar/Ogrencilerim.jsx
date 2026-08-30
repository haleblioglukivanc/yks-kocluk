import { useCallback, useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Alan, Bos, Dugme, Kart, Uyari, Yukleniyor } from '../bilesenler/Ortak.jsx'
import { Avatar } from '../bilesenler/Fotograf.jsx'
import { kullaniciOlustur } from '../lib/hesap.js'


const RISK_RENK = { iyi: 'var(--marka-yesil-acik)', izle: 'var(--marka-amber)', acil: 'var(--marka-alev)' }

/** Satırın sağındaki tek satırlık durum. Üç sebebi birden yazmak listeyi
 *  okunmaz yapıyordu; en keskin olanı seçiyoruz. */
function sonDurum(r) {
  if (!r) return 'Veri yok'
  if (r.hic_baslamadi || r.gun_gecti == null) return 'Hiç başlamadı'
  if (r.gun_gecti === 0) return 'Bugün aktif'
  if (r.gun_gecti === 1) return 'Dün aktif'
  return `${r.gun_gecti} gün sessiz`
}

const SUZGECLER = [
  ['tumu', 'Tümü'],
  ['riskli', 'Riskli'],
  ['sessiz', 'Sessiz'],
  ['pasif', 'Pasif'],
]

export default function Ogrencilerim({ onOgrenciAc, onGozuyle }) {
  const [ogrenciler, setOgrenciler] = useState(null)
  const [riskler, setRiskler] = useState({})
  const [kataloglar, setKataloglar] = useState([])
  const [suzgec, setSuzgec] = useState('tumu')
  const [hata, setHata] = useState('')
  const [formAcik, setFormAcik] = useState(false)

  const yukle = useCallback(async () => {
    const [o, r, k] = await Promise.all([
      supabase
        .from('ogrenciler')
        .select('id, alan, sinif, aktif, katalog_id, profiller!ogrenciler_id_fkey(ad_soyad, fotograf_yolu), kataloglar(ad)')
        .order('kayit_tarihi', { ascending: false }),
      supabase
        .from('ogrenci_risk')
        .select('ogrenci_id, risk_seviyesi, risk_skoru, tamamlama_yuzdesi, gun_gecti, hic_baslamadi'),
      supabase
        .from('kataloglar')
        .select('id, ad, tur, seviye, alan')
        .is('koc_id', null)
        .order('sira'),
    ])
    if (o.error) setHata(hataMetni(o.error))
    setOgrenciler(o.data ?? [])
    setRiskler(Object.fromEntries((r.data ?? []).map((x) => [x.ogrenci_id, x])))
    setKataloglar(k.data ?? [])
  }, [])

  useEffect(() => {
    yukle()
  }, [yukle])

  /* Pasifler en alta, kalanlar risk skoruna göre: koçun önce bakması
     gereken öğrenci listenin başında olsun. */
  const sirali = (ogrenciler ?? [])
    .map((o) => ({ ...o, risk: riskler[o.id] ?? null }))
    .sort((a, b) => {
      if (a.aktif !== b.aktif) return a.aktif ? -1 : 1
      return (b.risk?.risk_skoru ?? -1) - (a.risk?.risk_skoru ?? -1)
    })

  const sayilar = {
    tumu: sirali.length,
    riskli: sirali.filter((o) => o.aktif && o.risk && o.risk.risk_seviyesi !== 'iyi').length,
    sessiz: sirali.filter((o) => o.aktif && (o.risk?.hic_baslamadi || (o.risk?.gun_gecti ?? 0) >= 3)).length,
    pasif: sirali.filter((o) => !o.aktif).length,
  }

  const gorunen = sirali.filter((o) => {
    if (suzgec === 'riskli') return o.aktif && o.risk && o.risk.risk_seviyesi !== 'iyi'
    if (suzgec === 'sessiz') return o.aktif && (o.risk?.hic_baslamadi || (o.risk?.gun_gecti ?? 0) >= 3)
    if (suzgec === 'pasif') return !o.aktif
    return true
  })

  return (
    <div className="panel">
      <Uyari>{hata}</Uyari>

      <Kart
        baslik="Öğrencilerim"
        altBaslik={ogrenciler ? `${ogrenciler.length} kayıtlı öğrenci` : undefined}
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
            <div className="suzgecler" role="tablist" aria-label="Öğrenci süzgeci">
              {SUZGECLER.map(([anahtar, ad]) => (
                <button
                  key={anahtar}
                  role="tab"
                  aria-selected={suzgec === anahtar}
                  className={`suzgec${suzgec === anahtar ? ' suzgec--etkin' : ''}`}
                  onClick={() => setSuzgec(anahtar)}
                >
                  {ad} <span className="suzgec-sayi">{sayilar[anahtar]}</span>
                </button>
              ))}
            </div>

            {gorunen.length === 0 ? (
              <Bos baslik="Bu süzgeçte kimse yok" aciklama="İyi haber sayılır." />
            ) : (
              <ul className="liste liste--kartli">
                {gorunen.map((o) => {
                  const yuzde = o.aktif ? (o.risk?.tamamlama_yuzdesi ?? 0) : 0
                  const renk = o.aktif ? (RISK_RENK[o.risk?.risk_seviyesi] ?? 'var(--cizgi-2)') : 'var(--soluk)'
                  return (
                    <li key={o.id} className="ogrenci-sarmal">
                      <button
                        className={`ogrenci-kutu${o.aktif ? '' : ' ogrenci-kutu--pasif'}`}
                        style={{ '--serit': renk }}
                        onClick={() => onOgrenciAc(o.id)}
                      >
                        <Avatar yol={o.profiller?.fotograf_yolu} ad={o.profiller?.ad_soyad} />
                        <div className="ok-orta">
                          <span className="liste-ad">{o.profiller?.ad_soyad ?? 'İsimsiz'}</span>
                          <span className="ok-cubuk" aria-hidden="true">
                            <i style={{ width: `${yuzde}%` }} />
                          </span>
                        </div>
                        <div className="ok-sag">
                          <span className="ok-yuzde">{o.aktif ? `%${yuzde}` : '—'}</span>
                          <span className="ok-durum">
                            {o.aktif ? sonDurum(o.risk) : 'Erişim kapalı'}
                          </span>
                        </div>
                      </button>
                      <button
                        className="goz-dugme"
                        onClick={() => onGozuyle(o.id)}
                        aria-label={`${o.profiller?.ad_soyad ?? 'Öğrenci'} gözüyle gör`}
                        title="Öğrenci gözüyle gör"
                      >
                        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"
                             fill="none" stroke="currentColor" strokeWidth="1.8"
                             strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1.5 12S5 5.5 12 5.5 22.5 12 22.5 12 19 18.5 12 18.5 1.5 12 1.5 12Z" />
                          <circle cx="12" cy="12" r="3.2" />
                        </svg>
                      </button>
                    </li>
                  )
                })}
              </ul>
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
