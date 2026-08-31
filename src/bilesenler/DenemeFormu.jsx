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
  /* Adım 2: deneme kaydedildikten sonra "yanlışlar nereden geldi?"
     Sadece yanlışı olan dersler sorulur; konular dokununca sayılır. */
  const [kayitli, setKayitli] = useState(null) // { id, dersler: [{id, ad, yanlis}] }
  const [konular, setKonular] = useState({}) // dersId -> [{id, ad}]
  const [isaret, setIsaret] = useState({}) // konuId -> adet

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
      setHata('En az bir dersin sonucunu gir, gerisi sonra da eklenebilir.')
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

      const yanlisli = satirlar
        .filter((s) => s.yanlis > 0)
        .map((s) => ({ id: s.ders_id, ad: uygun.find((d) => d.id === s.ders_id)?.ad ?? '', yanlis: s.yanlis }))
      if (yanlisli.length === 0) {
        onEklendi()
        return
      }
      const { data: kl } = await supabase
        .from('konular')
        .select('id, ad, ders_id')
        .in('ders_id', yanlisli.map((d) => d.id))
        .order('sira')
      const grup = {}
      for (const k of kl ?? []) (grup[k.ders_id] ??= []).push(k)
      setKonular(grup)
      setKayitli({ id: deneme.id, dersler: yanlisli })
    } catch (e) {
      setHata(hataMetni(e))
    } finally {
      setBekliyor(false)
    }
  }

  /* Dokun: +1. Dersin yanlış sayısına ulaşınca bir sonraki dokunuş sıfırlar. */
  function dokun(dersId, konuId) {
    const ust = kayitli.dersler.find((d) => d.id === dersId)?.yanlis ?? 1
    setIsaret((o) => {
      const simdi = o[konuId] ?? 0
      const yeni = simdi >= ust ? 0 : simdi + 1
      const kopya = { ...o }
      if (yeni === 0) delete kopya[konuId]
      else kopya[konuId] = yeni
      return kopya
    })
  }

  async function hatalariKaydet() {
    const satirlar = Object.entries(isaret).map(([konu_id, adet]) => ({
      deneme_id: kayitli.id,
      konu_id: Number(konu_id),
      adet,
    }))
    if (satirlar.length === 0) {
      onEklendi()
      return
    }
    setBekliyor(true)
    setHata('')
    const { error } = await supabase.from('deneme_hatalari').insert(satirlar)
    setBekliyor(false)
    if (error) {
      setHata(hataMetni(error))
      return
    }
    onEklendi()
  }

  if (kayitli) {
    const toplamIsaret = Object.values(isaret).reduce((t, n) => t + n, 0)
    return (
      <div className="form-kutu">
        <p className="hata-adim-baslik">Deneme kaydedildi. Yanlışlar nereden geldi?</p>
        <p className="kart-alt">
          Konuya dokundukça sayılır. Tam bilmiyorsan tahmin yeter; bu liste haritada “bir daha bak” işareti olur.
        </p>
        {kayitli.dersler.map((d) => {
          const dersIsaret = (konular[d.id] ?? []).reduce((t, k) => t + (isaret[k.id] ?? 0), 0)
          return (
            <div key={d.id} className="hata-ders">
              <div className="hata-ders-basi">
                <span className="liste-ad">{d.ad}</span>
                <span className="kart-alt">
                  {dersIsaret} / {d.yanlis} yanlış
                </span>
              </div>
              {(konular[d.id] ?? []).length === 0 ? (
                <p className="kart-alt">Bu dersin konu listesi henüz yok.</p>
              ) : (
                <div className="hata-cipler">
                  {konular[d.id].map((k) => {
                    const n = isaret[k.id] ?? 0
                    return (
                      <button
                        key={k.id}
                        type="button"
                        className={n ? 'hata-cip hata-cip--secili' : 'hata-cip'}
                        onClick={() => dokun(d.id, k.id)}
                        aria-pressed={n > 0}
                      >
                        {k.ad}
                        {n > 0 && <span className="hata-cip-sayi">{n}</span>}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
        <Uyari>{hata}</Uyari>
        <div className="hata-adim-dugmeler">
          <button type="button" className="metin-dugme" onClick={onEklendi} disabled={bekliyor}>
            Şimdi değil
          </button>
          <Dugme onClick={hatalariKaydet} bekliyor={bekliyor}>
            {toplamIsaret ? `${toplamIsaret} işareti kaydet` : 'Bitir'}
          </Dugme>
        </div>
      </div>
    )
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
          Bu türde ders listesi yok. Koçun konu listeni tanımlayınca burası dolar.
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
