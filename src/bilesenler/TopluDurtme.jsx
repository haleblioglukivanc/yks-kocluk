import { useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Dugme, Uyari } from './Ortak.jsx'

/* Toplu gönderim ayrı bir "duyuru" nesnesi değil: herkese normal, birebir
   mesaj gidiyor. Öğrenci toplu gönderildiğini görmüyor, çünkü toplu
   görünen mesaj koçun en değerli sinyalini — kişisel ilgiyi — ucuzlatır.
   {ad} yer tutucusu her mesajda kendi adıyla değişiyor. */

const SABLONLAR = [
  ['Sessizlik', '{ad}, bu hafta senden pek ses çıkmadı. Takıldığın bir yer mi var, yoksa program mı ağır geldi? Kısaca yaz, birlikte ayarlayalım.'],
  ['Biriken görev', '{ad}, biriken görevler var. Hepsini bugün bitirmeni beklemiyorum; bir tanesini seç ve sadece onu bitir. Gerisini yarın konuşuruz.'],
  ['Kısa yoklama', '{ad}, uzun zamandır haber alamadım. İyi misin? Tek kelime yazsan yeter.'],
]

const EN_AZ = 10

function adiniAl(o) {
  return o.profiller?.ad_soyad ?? o.ad_soyad ?? 'Merhaba'
}

/** "Ayşe Yılmaz" → "Ayşe". Mesajın içinde tam ad resmî duruyor. */
function ilkAd(o) {
  return adiniAl(o).trim().split(/\s+/)[0]
}

export default function TopluDurtme({ ogrenciler, onKapat, onGonderildi }) {
  const [metin, setMetin] = useState('')
  const [disarida, setDisarida] = useState(() => new Set())
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState('')
  const [sonuc, setSonuc] = useState(0)

  const alicilar = ogrenciler.filter((o) => !disarida.has(o.id))
  const yetersiz = metin.trim().length < EN_AZ

  function cikar(id) {
    setDisarida((s) => new Set(s).add(id))
  }

  async function gonder() {
    setHata('')
    setBekliyor(true)
    try {
      const { data: oturum, error: oturumHata } = await supabase.auth.getUser()
      if (oturumHata) throw oturumHata
      const gonderenId = oturum?.user?.id
      if (!gonderenId) throw new Error('Oturum bulunamadı.')

      const satirlar = alicilar.map((o) => ({
        gonderen_id: gonderenId,
        alici_id: o.id,
        icerik: metin.trim().replaceAll('{ad}', ilkAd(o)),
      }))

      const { error } = await supabase.from('mesajlar').insert(satirlar)
      if (error) throw error

      setSonuc(satirlar.length)
      onGonderildi?.(satirlar.length)
    } catch (e) {
      setHata(hataMetni(e))
    } finally {
      setBekliyor(false)
    }
  }

  if (sonuc > 0) {
    return (
      <div className="durtme-kutu">
        <p className="durtme-sonuc">
          {sonuc} öğrenciye mesaj gönderildi. Her biri kendi adıyla, birebir
          mesaj olarak gitti.
        </p>
        <Dugme tur="ikincil" onClick={onKapat}>
          Kapat
        </Dugme>
      </div>
    )
  }

  return (
    <div className="durtme-kutu">
      <div className="durtme-baslik">
        <strong>{alicilar.length} öğrenciye mesaj</strong>
        <button className="metin-dugme" onClick={onKapat}>
          Vazgeç
        </button>
      </div>

      <div className="durtme-sablonlar">
        {SABLONLAR.map(([ad, govde]) => (
          <button key={ad} className="durtme-sablon" onClick={() => setMetin(govde)}>
            {ad}
          </button>
        ))}
      </div>

      <textarea
        className="durtme-metin"
        rows={4}
        value={metin}
        onChange={(e) => setMetin(e.target.value)}
        placeholder="Mesajınızı yazın. {ad} yazdığınız yere öğrencinin adı gelir."
      />
      <p className="durtme-ipucu">
        <code>{'{ad}'}</code> her mesajda öğrencinin kendi adıyla değişir.
      </p>

      <div className="durtme-alicilar">
        {alicilar.map((o) => (
          <button
            key={o.id}
            className="durtme-alici"
            onClick={() => cikar(o.id)}
            title="Listeden çıkar"
          >
            {ilkAd(o)} <span aria-hidden="true">×</span>
          </button>
        ))}
      </div>

      <Uyari>{hata}</Uyari>

      <Dugme onClick={gonder} bekliyor={bekliyor} disabled={yetersiz || alicilar.length === 0}>
        {alicilar.length} kişiye gönder
      </Dugme>
      {yetersiz && (
        <p className="durtme-ipucu">
          En az {EN_AZ} karakter yazın — tek kelimelik mesaj öğrenciye bir şey anlatmıyor.
        </p>
      )}
    </div>
  )
}
