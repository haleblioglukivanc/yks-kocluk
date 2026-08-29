import { useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Alan, Dugme, Uyari } from './Ortak.jsx'
import { gunAnahtari } from './ProgramIzgarasi.jsx'

/* Denemeyi koç da öğrenci de girebiliyor; ikisi de aynı formu görüyor.
   Sonuç satırları denemeyle birlikte yazılamazsa deneme geri siliniyor,
   yarım kayıt kalmıyor. */

export default function DenemeFormu({ ogrenciId, katalogId, onEklendi }) {
  const [tarih, setTarih] = useState(gunAnahtari(new Date()))
  const [tur, setTur] = useState('tyt')
  const [yayin, setYayin] = useState('')
  const [dersler, setDersler] = useState([])
  const [sonuc, setSonuc] = useState({})
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState('')

  useEffect(() => {
    if (!katalogId) return
    supabase
      .from('dersler')
      .select('id, ad, kapsam')
      .eq('katalog_id', katalogId)
      .order('sira')
      .then(({ data }) => setDersler(data ?? []))
  }, [katalogId])

  const uygun = dersler.filter(
    (d) => d.kapsam === 'tyt_ayt' || d.kapsam === tur || tur === 'brans',
  )

  function yaz(dersId, alan, deger) {
    setSonuc((o) => ({ ...o, [dersId]: { ...(o[dersId] ?? {}), [alan]: deger } }))
  }

  const toplamNet = uygun.reduce((t, d) => {
    const s = sonuc[d.id] ?? {}
    const dg = Number(s.dogru ?? 0)
    const yn = Number(s.yanlis ?? 0)
    return t + (dg - yn / 4)
  }, 0)

  async function kaydet() {
    setHata('')
    const girilen = uygun.filter((d) => {
      const s = sonuc[d.id] ?? {}
      return s.dogru || s.yanlis || s.bos
    })
    if (girilen.length === 0) {
      setHata('En az bir ders için sonuç girin.')
      return
    }

    setBekliyor(true)
    try {
      const { data: deneme, error: dHata } = await supabase
        .from('denemeler')
        .insert({
          ogrenci_id: ogrenciId,
          /* koc_id bilerek gönderilmiyor: öğrenci kendi koçunun kimliğini
             bilmek zorunda değil, tetikleyici kayıttan dolduruyor. */
          tarih,
          tur,
          yayin: yayin.trim() || null,
        })
        .select('id')
        .single()
      if (dHata) throw dHata

      const satirlar = girilen.map((d) => ({
        deneme_id: deneme.id,
        ders_id: d.id,
        dogru: Number(sonuc[d.id]?.dogru ?? 0),
        yanlis: Number(sonuc[d.id]?.yanlis ?? 0),
        bos: Number(sonuc[d.id]?.bos ?? 0),
      }))
      const { error: sHata } = await supabase.from('deneme_sonuclari').insert(satirlar)
      if (sHata) {
        await supabase.from('denemeler').delete().eq('id', deneme.id)
        throw sHata
      }

      onEklendi()
    } catch (e) {
      setHata(hataMetni(e))
    } finally {
      setBekliyor(false)
    }
  }

  return (
    <div className="form-kutu">
      <div className="ucul">
        <Alan etiket="Tarih">
          <input type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} />
        </Alan>
        <Alan etiket="Tür">
          <select value={tur} onChange={(e) => setTur(e.target.value)}>
            <option value="tyt">TYT</option>
            <option value="ayt">AYT</option>
            <option value="brans">Branş</option>
          </select>
        </Alan>
        <Alan etiket="Yayın">
          <input value={yayin} onChange={(e) => setYayin(e.target.value)} placeholder="İsteğe bağlı" />
        </Alan>
      </div>

      {uygun.length === 0 ? (
        <Uyari tur="bilgi">
          Katalog atanmamış ya da seçilen türde ders yok.
        </Uyari>
      ) : (
        <div className="sonuc-tablo">
          <div className="sonuc-basi">
            <span>Ders</span>
            <span>Doğru</span>
            <span>Yanlış</span>
            <span>Boş</span>
            <span>Net</span>
          </div>
          {uygun.map((d) => {
            const s = sonuc[d.id] ?? {}
            const net = Number(s.dogru ?? 0) - Number(s.yanlis ?? 0) / 4
            return (
              <div key={d.id} className="sonuc-satir">
                <span className="sonuc-ders">{d.ad}</span>
                {['dogru', 'yanlis', 'bos'].map((alan) => (
                  <input
                    key={alan}
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={s[alan] ?? ''}
                    onChange={(e) => yaz(d.id, alan, e.target.value)}
                    placeholder="0"
                  />
                ))}
                <span className="sonuc-net">{net ? net.toFixed(2) : '—'}</span>
              </div>
            )
          })}
          <div className="sonuc-toplam">
            <span>Toplam net</span>
            <strong>{toplamNet.toFixed(2)}</strong>
          </div>
        </div>
      )}

      <Uyari>{hata}</Uyari>
      <Dugme onClick={kaydet} bekliyor={bekliyor} disabled={uygun.length === 0}>
        Denemeyi kaydet
      </Dugme>
    </div>
  )
}
