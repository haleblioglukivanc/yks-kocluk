import { useCallback, useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Alan, Bos, Dugme, Kart, Rozet, Uyari, Yukleniyor } from '../bilesenler/Ortak.jsx'

const ALAN_ADI = {
  sayisal: 'Sayısal',
  esit_agirlik: 'Eşit Ağırlık',
  sozel: 'Sözel',
  dil: 'Dil',
}

export default function KocPaneli() {
  const [ogrenciler, setOgrenciler] = useState(null)
  const [kataloglar, setKataloglar] = useState([])
  const [davetler, setDavetler] = useState([])
  const [hata, setHata] = useState('')
  const [formAcik, setFormAcik] = useState(false)

  const yukle = useCallback(async () => {
    const [o, k, d] = await Promise.all([
      supabase
        .from('ogrenciler')
        .select('id, alan, sinif, aktif, katalog_id, profiller!inner(ad_soyad), kataloglar(ad)')
        .order('kayit_tarihi', { ascending: false }),
      supabase
        .from('kataloglar')
        .select('id, ad, tur, seviye, alan')
        .is('koc_id', null)
        .order('sira'),
      supabase
        .from('davetler')
        .select('id, kod, rol, ad_soyad, kullanildi, son_gecerlilik')
        .is('kullanildi', null)
        .order('olusturuldu', { ascending: false })
        .limit(10),
    ])

    if (o.error) setHata(hataMetni(o.error))
    setOgrenciler(o.data ?? [])
    setKataloglar(k.data ?? [])
    setDavetler(d.data ?? [])
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
            {formAcik ? 'Kapat' : 'Öğrenci davet et'}
          </Dugme>
        }
      >
        {formAcik && (
          <DavetFormu
            kataloglar={kataloglar}
            onOlustu={() => {
              setFormAcik(false)
              yukle()
            }}
          />
        )}

        {ogrenciler === null ? (
          <Yukleniyor />
        ) : ogrenciler.length === 0 ? (
          <Bos
            baslik="Henüz öğrenciniz yok"
            aciklama="Bir davet kodu oluşturun ve öğrencinize gönderin. Kodu kullanarak kayıt olduğunda burada görünecek."
          />
        ) : (
          <ul className="liste">
            {ogrenciler.map((o) => (
              <li key={o.id} className="liste-satir">
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
              </li>
            ))}
          </ul>
        )}
      </Kart>

      {davetler.length > 0 && (
        <Kart baslik="Bekleyen davetler" altBaslik="Henüz kullanılmamış kodlar">
          <ul className="liste">
            {davetler.map((d) => (
              <li key={d.id} className="liste-satir">
                <div>
                  <span className="kod-rozet">{d.kod}</span>
                  <span className="liste-alt">
                    {d.ad_soyad ? `${d.ad_soyad} · ` : ''}
                    {d.rol === 'veli' ? 'Veli' : 'Öğrenci'} ·{' '}
                    {new Date(d.son_gecerlilik).toLocaleDateString('tr-TR')} tarihine kadar
                  </span>
                </div>
                <button
                  className="metin-dugme"
                  onClick={() => navigator.clipboard?.writeText(d.kod)}
                >
                  Kopyala
                </button>
              </li>
            ))}
          </ul>
        </Kart>
      )}
    </div>
  )
}

function DavetFormu({ kataloglar, onOlustu }) {
  const [adSoyad, setAdSoyad] = useState('')
  const [katalogId, setKatalogId] = useState('')
  const [sinif, setSinif] = useState('')
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState('')
  const [sonKod, setSonKod] = useState('')

  const secili = kataloglar.find((k) => String(k.id) === katalogId)

  async function olustur() {
    setHata('')
    setSonKod('')
    setBekliyor(true)
    try {
      const { data, error } = await supabase.rpc('davet_olustur', {
        p_rol: 'ogrenci',
        p_ad_soyad: adSoyad.trim() || null,
        p_katalog_id: katalogId ? Number(katalogId) : null,
        p_alan: secili?.alan ?? null,
        p_sinif: sinif ? Number(sinif) : (secili?.seviye ?? null),
      })
      if (error) throw error
      setSonKod(data.kod)
      setAdSoyad('')
      onOlustu?.()
    } catch (e) {
      setHata(hataMetni(e))
    } finally {
      setBekliyor(false)
    }
  }

  return (
    <div className="form-kutu">
      <Alan etiket="Öğrenci adı" ipucu="Kodu kimin için ürettiğinizi hatırlamanız için">
        <input
          value={adSoyad}
          onChange={(e) => setAdSoyad(e.target.value)}
          placeholder="Örn. Ayşe Yılmaz"
        />
      </Alan>

      <Alan etiket="Konu kataloğu" ipucu="Öğrencinin çalışacağı ders takımı">
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

      {sonKod ? (
        <div className="kod-sonuc">
          <p>Kod hazır. Öğrencinize gönderin:</p>
          <strong>{sonKod}</strong>
          <button className="metin-dugme" onClick={() => navigator.clipboard?.writeText(sonKod)}>
            Kopyala
          </button>
        </div>
      ) : (
        <Dugme onClick={olustur} bekliyor={bekliyor}>
          Davet kodu oluştur
        </Dugme>
      )}
    </div>
  )
}
