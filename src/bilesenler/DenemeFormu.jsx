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
  /* Anket yanlış işaretlemeden ÖNCE çıkıyor: deneme biter bitmez sorulursa
     his taze, sonraya bırakılırsa hiç doldurulmuyor. */
  const [anketGecti, setAnketGecti] = useState(false)

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
    /* İkinci dokunuşta aynı satırlar tekrar gelirse hata yerine üstüne yazılır. */
    const { error } = await supabase
      .from('deneme_hatalari')
      .upsert(satirlar, { onConflict: 'deneme_id,konu_id' })
    setBekliyor(false)
    if (error) {
      setHata(hataMetni(error))
      return
    }
    onEklendi()
  }

  /* Analiz taslağı (dağılım + öneriler) artık veritabanı tetikleyicisiyle
     sonuçlar ve hata konuları yazıldığı anda üretilir; tarayıcıdan çağrı yok.
     Bulgu metnini modele yazdırma işi 'analiz-bulgusu' cron'unda. */

  if (kayitli && !anketGecti) {
    return (
      <AnketAdimi
        denemeId={kayitli.id}
        dersler={uygun}
        onBitti={() => setAnketGecti(true)}
      />
    )
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
      <KarneYukle
        ogrenciId={ogrenciId}
        onOkundu={(c) => {
          /* Model türü her seferinde okuyamıyor ve okuyamayınca "branş"
             diyor; dokuz dersli bir karne branş denemesi olamaz. Tek ders
             varsa branş bilgisine güveniliyor, yoksa formdaki seçim kalıyor. */
          const dersSayisi = (c.dersler ?? []).length
          if (c.tur === 'tyt' || c.tur === 'ayt' || (c.tur === 'brans' && dersSayisi === 1)) {
            setTur(c.tur)
          }
          if (c.tarih) setTarih(c.tarih)
          if (c.yayin) setYayin(c.yayin)
          const yeni = {}
          for (const d of c.dersler ?? []) {
            if (!d.dersId) continue
            yeni[d.dersId] = {
              dogru: d.dogru ?? '',
              yanlis: d.yanlis ?? '',
              bos: d.bos ?? '',
            }
          }
          setSonuc((o) => ({ ...o, ...yeni }))
        }}
      />

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

/* Karne okuma. Model hiçbir şey kaydetmiyor: okuduğunu forma yazıyor, kaydı
   yine insan yapıyor. Eşleşmeyen ders satırı sessizce düşmüyor, altta
   "bunları bulamadım" diye gösteriliyor ki elle girilebilsin. */

const UZANTI = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'application/pdf': 'pdf',
}

function KarneYukle({ ogrenciId, onOkundu }) {
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState('')
  const [ozet, setOzet] = useState(null)

  async function sec(e) {
    const dosya = e.target.files?.[0]
    e.target.value = ''
    if (!dosya) return
    const uzanti = UZANTI[dosya.type]
    if (!uzanti) {
      setHata('Yalnızca fotoğraf ya da PDF yükleyebilirsin.')
      return
    }
    if (dosya.size > 10 * 1024 * 1024) {
      setHata('Dosya 10 MB’tan büyük olmasın.')
      return
    }

    setHata('')
    setOzet(null)
    setBekliyor(true)
    try {
      const yol = `${ogrenciId}/${Date.now()}.${uzanti}`
      const { error: yHata } = await supabase.storage
        .from('deneme-karne')
        .upload(yol, dosya, { contentType: dosya.type })
      if (yHata) throw yHata

      const { data: satir, error: kHata } = await supabase
        .from('karne_yuklemeleri')
        .insert({ ogrenci_id: ogrenciId, dosya_yolu: yol, mime: dosya.type })
        .select('id')
        .single()
      if (kHata) throw kHata

      const { data, error: fHata } = await supabase.functions.invoke('karne-oku', {
        body: { yukleme_id: satir.id },
      })
      if (fHata) throw fHata
      if (data?.hata) throw new Error(data.hata)

      const cikti = data?.cikti
      const satirlar = cikti?.dersler ?? []
      if (satirlar.length === 0) throw new Error('Karnede ders satırı bulunamadı.')

      onOkundu(cikti)
      setOzet({
        bulunan: satirlar.filter((d) => d.dersId).length,
        eslesmeyen: satirlar.filter((d) => !d.dersId).map((d) => d.karnedeki ?? d.ders),
      })
    } catch (e) {
      setHata(hataMetni(e))
    } finally {
      setBekliyor(false)
    }
  }

  return (
    <div className="karne-yukle">
      <label className="karne-dugme">
        <input type="file" accept="image/*,application/pdf" onChange={sec} disabled={bekliyor} />
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
             strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2L8 5h8l1.5 2h2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" />
          <circle cx="12" cy="13" r="3.2" />
        </svg>
        <span>{bekliyor ? 'Karne okunuyor…' : 'Karnenin fotoğrafını yükle'}</span>
      </label>
      <p className="kart-alt">
        Ders ders doğru, yanlış ve boş sayılarını aşağıdaki forma yazar; kaydetmez.
        Sayıları kontrol edip sen kaydedersin.
      </p>
      {ozet ? (
        <Uyari tur="bilgi">
          {ozet.bulunan} ders okundu.
          {ozet.eslesmeyen.length > 0
            ? ` Şu satırları eşleştiremedim, elle gir: ${ozet.eslesmeyen.join(', ')}.`
            : ''}
        </Uyari>
      ) : null}
      <Uyari>{hata}</Uyari>
    </div>
  )
}

/* Deneme sonrası kısa anket. Üç ölçek ve bir ders seçimi — dört ölçek +
   ders, deneme çıkışında yorgun bir öğrenci için uzun form oluyor ve uzun
   form hiç doldurulmuyor. Enerji alanı veritabanında duruyor, gerekirse
   eklenir.

   Ruh haline ilişkin veri KVKK'da özel nitelikli. Üç kural: hiçbir soru
   zorunlu değil, anket atlanabilir, ve bu cevaplar veliye giden haftalık
   özete girmiyor. */

const OLCEKLER = [
  ['zaman', 'Süre yetti mi?', 'Hiç yetmedi', 'Rahat yetti'],
  ['odak', 'Odaklanabildin mi?', 'Dağıldım', 'Tamamen'],
  ['kaygi', 'Kaygın ne düzeydeydi?', 'Sakindim', 'Çok gergin'],
]

function AnketAdimi({ denemeId, dersler, onBitti }) {
  /* Deneme kaydedilince Çizbi köşeden "hangi bölüm zorladı?" diye soruyor
     ve balon tam bu formun üstüne düşüyordu. Anket açıkken köşedeki Çizbi
     susuyor — zaten aynı soruyu daha iyi bir biçimde burada soruyoruz. */
  useEffect(() => {
    document.body.dataset.anket = '1'
    return () => {
      delete document.body.dataset.anket
    }
  }, [])

  const [cevap, setCevap] = useState({})
  const [ders, setDers] = useState('')
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState('')

  async function kaydet() {
    const dolu = OLCEKLER.some(([k]) => cevap[k]) || ders
    if (!dolu) {
      onBitti()
      return
    }
    setBekliyor(true)
    setHata('')
    const { error } = await supabase.from('deneme_anketi').upsert(
      {
        /* ogrenci_id gönderilmiyor: tetikleyici denemeden okuyor, böylece
           istemci başkasının adına anket yazamıyor. */
        deneme_id: denemeId,
        zaman: cevap.zaman ?? null,
        odak: cevap.odak ?? null,
        kaygi: cevap.kaygi ?? null,
        zorlanan_ders_id: ders ? Number(ders) : null,
      },
      { onConflict: 'deneme_id' },
    )
    setBekliyor(false)
    if (error) {
      setHata(hataMetni(error))
      return
    }
    onBitti()
  }

  return (
    <div className="form-kutu">
      <p className="hata-adim-baslik">Deneme kaydedildi. Nasıl geçti?</p>
      <p className="kart-alt">
        Üç soru, hepsi isteğe bağlı. Bu cevapları yalnızca koçun görür, velin görmez.
      </p>

      {OLCEKLER.map(([anahtar, soru, sol, sag]) => (
        <div key={anahtar} className="anket-olcek">
          <p className="anket-soru">{soru}</p>
          <div className="anket-secenekler" role="group" aria-label={soru}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className={cevap[anahtar] === n ? 'anket-cip anket-cip--secili' : 'anket-cip'}
                aria-pressed={cevap[anahtar] === n}
                onClick={() =>
                  setCevap((o) => ({ ...o, [anahtar]: o[anahtar] === n ? undefined : n }))
                }
              >
                {n}
              </button>
            ))}
          </div>
          <div className="anket-uclar">
            <span>{sol}</span>
            <span>{sag}</span>
          </div>
        </div>
      ))}

      <Alan etiket="En çok hangi derste zorlandın?">
        <select value={ders} onChange={(e) => setDers(e.target.value)}>
          <option value="">Seçme</option>
          {dersler.map((d) => (
            <option key={d.id} value={d.id}>{d.ad}</option>
          ))}
        </select>
      </Alan>

      <Uyari>{hata}</Uyari>
      <div className="hata-adim-dugmeler">
        <button type="button" className="metin-dugme" onClick={onBitti} disabled={bekliyor}>
          Şimdi değil
        </button>
        <Dugme onClick={kaydet} bekliyor={bekliyor}>Kaydet ve yanlışlara geç</Dugme>
      </div>
    </div>
  )
}
