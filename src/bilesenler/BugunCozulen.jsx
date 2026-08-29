import { useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Bos, Kart, Uyari } from './Ortak.jsx'

/* Ders başına tek satır tutuluyor: aynı derse ikinci kez giren sayı eskisini
   eziyor. "Bugün 40 mı 55 mi çözdüm" tartışmasını doğurmayan tek yol bu. */

export default function BugunCozulen({ ogrenciId, katalogId, kayitlar, tarih, onDegisti }) {
  const [liste, setListe] = useState(kayitlar ?? [])
  const [dersler, setDersler] = useState([])
  const [acik, setAcik] = useState(false)
  const [form, setForm] = useState({ ders_id: '', dogru: '', yanlis: '', bos: '' })
  const [hata, setHata] = useState('')
  const [bekliyor, setBekliyor] = useState(false)

  useEffect(() => {
    setListe(kayitlar ?? [])
  }, [kayitlar])

  useEffect(() => {
    if (!katalogId) return
    supabase
      .from('dersler')
      .select('id, ad')
      .eq('katalog_id', katalogId)
      .order('sira')
      .then(({ data }) => setDersler(data ?? []))
  }, [katalogId])

  const toplam = liste.reduce((a, s) => a + (s.dogru + s.yanlis + s.bos), 0)

  function duzenlemeyeAl(s) {
    setForm({
      ders_id: String(s.ders_id),
      dogru: String(s.dogru),
      yanlis: String(s.yanlis),
      bos: String(s.bos),
    })
    setAcik(true)
  }

  async function kaydet() {
    const sayi = (v) => Math.max(0, Number(v) || 0)
    if (!form.ders_id) {
      setHata('Önce ders seç.')
      return
    }
    const satir = {
      ogrenci_id: ogrenciId,
      tarih,
      ders_id: Number(form.ders_id),
      dogru: sayi(form.dogru),
      yanlis: sayi(form.yanlis),
      bos: sayi(form.bos),
      guncellendi: new Date().toISOString(),
    }
    if (satir.dogru + satir.yanlis + satir.bos === 0) {
      setHata('En az bir soru gir.')
      return
    }

    setBekliyor(true)
    const { error } = await supabase
      .from('soru_kayitlari')
      .upsert(satir, { onConflict: 'ogrenci_id,tarih,ders_id' })
    setBekliyor(false)
    if (error) {
      setHata(hataMetni(error))
      return
    }
    setHata('')
    setForm({ ders_id: '', dogru: '', yanlis: '', bos: '' })
    setAcik(false)
    onDegisti?.()
  }

  async function sil(s) {
    const onceki = liste
    setListe((l) => l.filter((x) => x.ders_id !== s.ders_id))
    const { error } = await supabase
      .from('soru_kayitlari')
      .delete()
      .eq('ogrenci_id', ogrenciId)
      .eq('tarih', tarih)
      .eq('ders_id', s.ders_id)
    if (error) {
      setListe(onceki)
      setHata(hataMetni(error))
      return
    }
    onDegisti?.()
  }

  return (
    <Kart
      baslik="Bugün çözülen"
      eylem={
        <span className="cozulen-toplam">
          <strong>{toplam}</strong> soru
        </span>
      }
    >
      <Uyari>{hata}</Uyari>

      {liste.length === 0 ? (
        <Bos baslik="Bugün için kayıt yok" aciklama="Çözdüğün soruları ders ders ekle." />
      ) : (
        <ul className="liste cozulen-liste">
          {liste.map((s) => (
            <li key={s.ders_id} className="cozulen-satir">
              <button className="cozulen-ders" onClick={() => duzenlemeyeAl(s)}>
                {s.ders}
              </button>
              <span className="dny">
                <span className="dny-d">
                  <b>{s.dogru}</b>D
                </span>
                <span className="dny-y">
                  <b>{s.yanlis}</b>Y
                </span>
                <span className="dny-b">
                  <b>{s.bos}</b>B
                </span>
              </span>
              <button className="cozulen-sil" onClick={() => sil(s)} aria-label={`${s.ders} kaydını sil`}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {acik ? (
        <div className="cozulen-form">
          <select
            value={form.ders_id}
            onChange={(e) => setForm((f) => ({ ...f, ders_id: e.target.value }))}
            aria-label="Ders"
          >
            <option value="">Ders seç</option>
            {dersler.map((d) => (
              <option key={d.id} value={d.id}>
                {d.ad}
              </option>
            ))}
          </select>
          <div className="cozulen-sayilar">
            <label>
              <span>Doğru</span>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                max="999"
                value={form.dogru}
                onChange={(e) => setForm((f) => ({ ...f, dogru: e.target.value }))}
              />
            </label>
            <label>
              <span>Yanlış</span>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                max="999"
                value={form.yanlis}
                onChange={(e) => setForm((f) => ({ ...f, yanlis: e.target.value }))}
              />
            </label>
            <label>
              <span>Boş</span>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                max="999"
                value={form.bos}
                onChange={(e) => setForm((f) => ({ ...f, bos: e.target.value }))}
              />
            </label>
          </div>
          <div className="cozulen-eylem">
            <button className="dugme dugme--birincil" onClick={kaydet} disabled={bekliyor}>
              {bekliyor ? 'Bir saniye…' : 'Kaydet'}
            </button>
            <button className="metin-dugme" onClick={() => { setAcik(false); setHata('') }}>
              Vazgeç
            </button>
          </div>
        </div>
      ) : (
        <button className="dugme dugme--ikincil cozulen-ac" onClick={() => setAcik(true)}>
          + Soru kaydı ekle
        </button>
      )}
    </Kart>
  )
}
