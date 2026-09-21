import { useState } from 'react'
import { hataMetni } from '../lib/supabase.js'
import { Alan, Dugme, Uyari } from './Ortak.jsx'
import { kullaniciOlustur } from '../lib/hesap.js'

/* Öğrenci ekleme formu (eski Öğrenciler listesinden taşındı, 22 Eylül 2026).
   Öğrencilerim ekranındaki "Ekle" düğmesi açar. */
export function OgrenciFormu({ kataloglar, onEklendi }) {
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
