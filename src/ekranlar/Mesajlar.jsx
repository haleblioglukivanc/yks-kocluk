import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Bos, Kart, Uyari, Yukleniyor } from '../bilesenler/Ortak.jsx'

const ROL_ADI = { koc: 'Koç', yonetici: 'Koç', ogrenci: 'Öğrenci', veli: 'Veli' }

const saatYaz = (t) =>
  new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(new Date(t))

const gunYaz = (t) => {
  const d = new Date(t)
  if (d.toDateString() === new Date().toDateString()) return saatYaz(t)
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' }).format(d)
}

function Yazisma({ kisi, profilId, onGeri, tekMuhatap }) {
  const [mesajlar, setMesajlar] = useState(null)
  const [metin, setMetin] = useState('')
  const [hata, setHata] = useState('')
  const dip = useRef(null)

  const yukle = useCallback(async () => {
    const { data, error } = await supabase.rpc('mesajlar_getir', { p_karsi: kisi.id })
    if (error) {
      setHata(hataMetni(error))
      return
    }
    setMesajlar(data ?? [])
  }, [kisi.id])

  useEffect(() => {
    yukle()
    supabase
      .from('mesajlar')
      .update({ okundu_mu: true })
      .eq('alici_id', profilId)
      .eq('gonderen_id', kisi.id)
      .eq('okundu_mu', false)
      .then(() => {})
  }, [yukle, kisi.id, profilId])

  // Karşı taraf yazınca anında düşsün
  useEffect(() => {
    const kanal = supabase
      .channel(`mesaj-${kisi.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mesajlar' }, (olay) => {
        const m = olay.new
        const bizeAit =
          (m.gonderen_id === kisi.id && m.alici_id === profilId) ||
          (m.gonderen_id === profilId && m.alici_id === kisi.id)
        if (bizeAit) yukle()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(kanal)
    }
  }, [kisi.id, profilId, yukle])

  useEffect(() => {
    dip.current?.scrollIntoView({ block: 'end' })
  }, [mesajlar])

  async function gonder() {
    const icerik = metin.trim()
    if (!icerik) return
    const { error } = await supabase
      .from('mesajlar')
      .insert({ gonderen_id: profilId, alici_id: kisi.id, icerik })
    if (error) {
      setHata(hataMetni(error))
      return
    }
    setMetin('')
    setHata('')
    await yukle()
  }

  return (
    <Kart
      baslik={kisi.ad}
      altBaslik={ROL_ADI[kisi.rol] ?? kisi.rol}
      eylem={
        tekMuhatap ? null : (
          <button className='metin-dugme' onClick={onGeri}>
            Mesajlar
          </button>
        )
      }
    >
      <div className='yazisma'>
        {mesajlar === null ? (
          <Yukleniyor />
        ) : mesajlar.length === 0 ? (
          <Bos baslik='Henüz mesaj yok' aciklama='İlkini sen yaz.' />
        ) : (
          mesajlar.map((m) => (
            <div key={m.id} className={`balon ${m.benden ? 'balon--benden' : 'balon--ondan'}`}>
              <p className='balon-metin'>{m.icerik}</p>
              <span className='balon-saat'>{saatYaz(m.zaman)}</span>
            </div>
          ))
        )}
        <div ref={dip} />
      </div>

      <Uyari>{hata}</Uyari>

      <div className='mesaj-yazma'>
        <textarea
          rows={2}
          value={metin}
          placeholder='Mesaj yaz…'
          aria-label='Mesaj'
          onChange={(e) => {
            setMetin(e.target.value)
            setHata('')
          }}
        />
        <button className='dugme dugme--birincil' onClick={gonder} disabled={!metin.trim()}>
          Gönder
        </button>
      </div>
    </Kart>
  )
}

export default function Mesajlar({ profil }) {
  const [kutu, setKutu] = useState(null)
  const [secili, setSecili] = useState(null)
  const [hata, setHata] = useState('')

  const kocMu = profil.rol === 'koc' || profil.rol === 'yonetici'

  const yukle = useCallback(async () => {
    const { data, error } = await supabase.rpc('mesaj_kutum')
    if (error) {
      setHata(hataMetni(error))
      return
    }
    setKutu(data ?? [])
    // Öğrenci ve velinin tek muhatabı var, liste göstermek gereksiz tıklama olurdu
    if (!kocMu && (data ?? []).length === 1) setSecili(data[0])
  }, [kocMu])

  useEffect(() => {
    yukle()
  }, [yukle])

  if (secili) {
    return (
      <Yazisma
        kisi={secili}
        profilId={profil.id}
        tekMuhatap={!kocMu}
        onGeri={() => {
          setSecili(null)
          yukle()
        }}
      />
    )
  }

  return (
    <Kart baslik='Mesajlar'>
      <Uyari>{hata}</Uyari>
      {kutu === null ? (
        <Yukleniyor />
      ) : kutu.length === 0 ? (
        <Bos baslik='Kimse yok' aciklama='Yazışabileceğin biri tanımlanmamış.' />
      ) : (
        <ul className='liste'>
          {kutu.map((k) => (
            <li key={k.id}>
              <button className='ogrenci-satir' onClick={() => setSecili(k)}>
                <div>
                  <span className='liste-ad'>
                    {k.ad}
                    {k.okunmamis > 0 && <span className='okunmamis'>{k.okunmamis}</span>}
                  </span>
                  <span className='liste-alt kutu-onizleme'>
                    {k.sonMesaj
                      ? `${k.benden ? 'Sen: ' : ''}${k.sonMesaj}`
                      : (ROL_ADI[k.rol] ?? k.rol)}
                  </span>
                </div>
                {k.sonZaman && <span className='kutu-zaman'>{gunYaz(k.sonZaman)}</span>}
                <span className='ok' aria-hidden='true'>›</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Kart>
  )
}
