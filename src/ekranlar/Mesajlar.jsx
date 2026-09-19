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

/* Gönderen kendi mesajını 24 saat içinde düzenleyebilir ya da geri alabilir
   (Bekir, 19 Eylül 2026). Balona dokununca altında iki eylem açılır. Geri
   alınan mesajın yerinde iz kalır ("Bu mesaj geri alındı"): koç–öğrenci
   arasında iz bırakmadan silmek güveni zedeler. Karşı tarafa giden bildirim
   ve Telegram notu sunucuda (mesaj_geri_al / mesaj_duzenle). */
const DUZENLEME_SURESI = 24 * 60 * 60 * 1000

function MesajBalonu({ m, acik, onSec, onBitti }) {
  const [duzenliyor, setDuzenliyor] = useState(false)
  const [taslak, setTaslak] = useState(m.icerik)
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState('')

  const sinif = `balon ${m.benden ? 'balon--benden' : 'balon--ondan'}`

  if (m.geriAlindi) {
    return (
      <div className={`${sinif} balon--geri-alindi`}>
        <p className='balon-metin'>{m.benden ? 'Bu mesajı geri aldın' : 'Bu mesaj geri alındı'}</p>
        <span className='balon-saat'>{saatYaz(m.zaman)}</span>
      </div>
    )
  }

  const degistirilebilir = m.benden && Date.now() - new Date(m.zaman).getTime() < DUZENLEME_SURESI

  const cagir = async (islem) => {
    if (bekliyor) return
    setBekliyor(true)
    setHata('')
    const { error } = await islem()
    setBekliyor(false)
    if (error) {
      setHata(hataMetni(error))
      return
    }
    setDuzenliyor(false)
    onBitti()
  }

  if (duzenliyor) {
    return (
      <div className={`${sinif} balon--duzenle`}>
        <textarea
          rows={3}
          value={taslak}
          aria-label='Mesajı düzenle'
          onChange={(e) => setTaslak(e.target.value)}
          autoFocus
        />
        {hata && <p className='balon-hata'>{hata}</p>}
        <div className='balon-eylemler'>
          <button type='button' onClick={() => { setDuzenliyor(false); setTaslak(m.icerik) }}>Vazgeç</button>
          <button
            type='button'
            className='balon-eylem--ana'
            disabled={bekliyor || !taslak.trim()}
            onClick={() => cagir(() => supabase.rpc('mesaj_duzenle', { p_id: m.id, p_icerik: taslak }))}
          >
            {bekliyor ? 'Bir saniye…' : 'Kaydet'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`${sinif}${degistirilebilir ? ' balon--dokun' : ''}`}>
      {degistirilebilir ? (
        <button type='button' className='balon-dokun' onClick={onSec} aria-expanded={acik} aria-label='Mesaj seçenekleri'>
          <p className='balon-metin'>{m.icerik}</p>
          <span className='balon-saat'>{saatYaz(m.zaman)}{m.duzenlendi ? ' · düzenlendi' : ''}</span>
        </button>
      ) : (
        <>
          <p className='balon-metin'>{m.icerik}</p>
          <span className='balon-saat'>{saatYaz(m.zaman)}{m.duzenlendi ? ' · düzenlendi' : ''}</span>
        </>
      )}
      {acik && degistirilebilir && (
        <>
          {hata && <p className='balon-hata'>{hata}</p>}
          <div className='balon-eylemler'>
            <button type='button' onClick={() => { setTaslak(m.icerik); setDuzenliyor(true) }}>Düzenle</button>
            <button
              type='button'
              disabled={bekliyor}
              onClick={() => cagir(() => supabase.rpc('mesaj_geri_al', { p_id: m.id }))}
            >
              {bekliyor ? 'Bir saniye…' : 'Geri al'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function Yazisma({ kisi, profilId, onGeri, tekMuhatap, geriEtiketi = 'Mesajlar' }) {
  const [mesajlar, setMesajlar] = useState(null)
  const [metin, setMetin] = useState('')
  const [hata, setHata] = useState('')
  const [seciliMesaj, setSeciliMesaj] = useState(null)
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
      // INSERT: yeni mesaj; UPDATE: karşı taraf düzenledi ya da geri aldı
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mesajlar' }, (olay) => {
        const m = olay.new ?? {}
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
            {geriEtiketi}
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
            <MesajBalonu
              key={m.id}
              m={m}
              acik={seciliMesaj === m.id}
              onSec={() => setSeciliMesaj((s) => (s === m.id ? null : m.id))}
              onBitti={() => { setSeciliMesaj(null); yukle() }}
            />
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

/* kisiId verilirse liste atlanır, doğrudan o kişinin yazışması açılır
   (koçun öğrenci kartındaki Mesaj düğmesi). Kutu herkesi — hiç yazışma
   olmayanları da — getirdiği için ilk mesaj burada yazılabilir. */
export default function Mesajlar({ profil, kisiId, onGeri }) {
  const [kutu, setKutu] = useState(null)
  const [secili, setSecili] = useState(null)
  const [hata, setHata] = useState('')

  const kocMu = profil.rol === 'koc'

  const yukle = useCallback(async () => {
    const { data, error } = await supabase.rpc('mesaj_kutum')
    if (error) {
      setHata(hataMetni(error))
      return
    }
    setKutu(data ?? [])
    if (kisiId) {
      const hedef = (data ?? []).find((k) => k.id === kisiId)
      if (hedef) {
        setSecili(hedef)
        return
      }
    }
    // Öğrenci ve velinin tek muhatabı var, liste göstermek gereksiz tıklama olurdu
    if (!kocMu && (data ?? []).length === 1) setSecili(data[0])
  }, [kocMu, kisiId])

  useEffect(() => {
    yukle()
  }, [yukle])

  if (secili) {
    return (
      <Yazisma
        kisi={secili}
        profilId={profil.id}
        tekMuhatap={!kocMu}
        geriEtiketi={kisiId && onGeri ? 'Geri' : 'Mesajlar'}
        onGeri={() => {
          if (kisiId && onGeri) return onGeri()
          setSecili(null)
          yukle()
        }}
      />
    )
  }

  // Doğrudan yazışma istenmişken liste bir an görünüp kaybolmasın
  if (kisiId && kutu === null) return <Kart baslik='Mesajlar'><Yukleniyor /></Kart>

  return (
    <Kart baslik='Mesajlar'>
      <Uyari>{hata}</Uyari>
      {kutu === null ? (
        <Yukleniyor />
      ) : kutu.length === 0 ? (
        <Bos baslik='Henüz kimse yok' aciklama='Koçun seni eklediğinde burada yazışabilirsiniz.' />
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
