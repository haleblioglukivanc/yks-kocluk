import { useCallback, useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Alan, Bos, Dugme, Kart, Rozet, Uyari, Yukleniyor } from '../bilesenler/Ortak.jsx'
import { Avatar } from '../bilesenler/Fotograf.jsx'
import { kullaniciOlustur } from '../lib/hesap.js'

const ALAN_ADI = {
  sayisal: 'Sayısal',
  esit_agirlik: 'Eşit Ağırlık',
  sozel: 'Sözel',
  dil: 'Dil',
}

export default function Ogrencilerim({ onOgrenciAc }) {
  const [ogrenciler, setOgrenciler] = useState(null)
  const [kataloglar, setKataloglar] = useState([])
  const [hata, setHata] = useState('')
  const [formAcik, setFormAcik] = useState(false)

  const yukle = useCallback(async () => {
    const [o, k] = await Promise.all([
      supabase
        .from('ogrenciler')
        .select('id, alan, sinif, aktif, katalog_id, profiller!ogrenciler_id_fkey(ad_soyad, fotograf_yolu), kataloglar(ad)')
        .order('kayit_tarihi', { ascending: false }),
      supabase
        .from('kataloglar')
        .select('id, ad, tur, seviye, alan')
        .is('koc_id', null)
        .order('sira'),
    ])
    if (o.error) setHata(hataMetni(o.error))
    setOgrenciler(o.data ?? [])
    setKataloglar(k.data ?? [])
  }, [])

  useEffect(() => {
    yukle()
  }, [yukle])

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
          <ul className="liste">
            {ogrenciler.map((o) => (
              <li key={o.id}>
                <button
                  className={`ogrenci-satir${o.aktif ? '' : ' ogrenci-satir--pasif'}`}
                  onClick={() => onOgrenciAc(o.id)}
                >
                  <Avatar yol={o.profiller?.fotograf_yolu} ad={o.profiller?.ad_soyad} />
                  <div>
                    <span className="liste-ad">{o.profiller?.ad_soyad ?? 'İsimsiz'}</span>
                    <span className="liste-alt">
                      {[
                        o.sinif ? (o.sinif === 13 ? 'Mezun' : `${o.sinif}. sınıf`) : null,
                        o.alan ? ALAN_ADI[o.alan] : null,
                        o.kataloglar?.ad,
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'Bilgi girilmemiş'}
                    </span>
                  </div>
                  {!o.aktif && <Rozet ton="sonuk">Pasif</Rozet>}
                  <span className="ok" aria-hidden="true">›</span>
                </button>
              </li>
            ))}
          </ul>
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
