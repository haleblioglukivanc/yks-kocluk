import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Uyari, Yukleniyor } from '../bilesenler/Ortak.jsx'
import AnaTepe from '../ortak/AnaTepe.jsx'
import { UcakCizimi } from '../ortak/KapiCizimleri.jsx'

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

function Yazisma({ kisi, profilId, hazirCevap = false }) {
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

  /* Balonlar gün gün ayrılır; "Bugün", "Dün" ya da tarih. */
  const gunEtiketi = (t) => {
    const d = new Date(t)
    const bugun = new Date()
    const dun = new Date(); dun.setDate(bugun.getDate() - 1)
    if (d.toDateString() === bugun.toDateString()) return 'Bugün'
    if (d.toDateString() === dun.toDateString()) return 'Dün'
    return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' }).format(d)
  }

  return (
    <div className="ms-yazisma">
      <div className="ms-balonlar">
        {mesajlar === null ? (
          <Yukleniyor />
        ) : mesajlar.length === 0 ? (
          <div className="gd-bos"><strong>Henüz mesaj yok.</strong><span>İlk mesajı sen yaz.</span></div>
        ) : (
          mesajlar.map((m, i) => {
            const ayrac = i === 0 || gunEtiketi(m.zaman) !== gunEtiketi(mesajlar[i - 1].zaman)
            return (
              <div key={m.id} className="ms-sira">
                {ayrac && <span className="ms-gun">{gunEtiketi(m.zaman)}</span>}
                <MesajBalonu
                  m={m}
                  acik={seciliMesaj === m.id}
                  onSec={() => setSeciliMesaj((x) => (x === m.id ? null : m.id))}
                  onBitti={() => { setSeciliMesaj(null); yukle() }}
                />
              </div>
            )
          })
        )}
        <div ref={dip} />
      </div>

      <Uyari>{hata}</Uyari>

      {hazirCevap && (
        <div className="ms-hazir" aria-label="Hazır cevaplar">
          {HAZIR.map((h) => (
            <button key={h} type="button" onClick={() => setMetin(h)}>{h}</button>
          ))}
        </div>
      )}
      <div className="ms-yaz">
        <textarea
          rows={1}
          value={metin}
          placeholder="Mesaj yaz…"
          aria-label="Mesaj"
          onChange={(e) => {
            setMetin(e.target.value)
            setHata('')
          }}
        />
        <button type="button" onClick={gonder} disabled={!metin.trim()} aria-label="Gönder">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" /></svg>
        </button>
      </div>
      <p className="ms-not">Kendi mesajına dokununca 24 saat içinde düzenleyip geri alabilirsin.</p>
    </div>
  )
}

/* Koçun sık yazdığı kısa cevaplar: tek dokunuşla yazma kutusuna düşer,
   gönderilmeden önce değiştirilebilir. */
const HAZIR = ['Harika, böyle devam', 'Takıldığın soruyu fotoğrafla at', 'Yarın konuşalım', 'Bugün tek bir konu yeter']

/* kisiId verilirse liste atlanır, doğrudan o kişinin yazışması açılır
   (koçun öğrenci kartındaki Mesaj düğmesi). Kutu herkesi — hiç yazışma
   olmayanları da — getirdiği için ilk mesaj burada yazılabilir. */
export default function Mesajlar({ profil, kisiId, onGeri, tepe = null }) {
  const [kutu, setKutu] = useState(null)
  const [secili, setSecili] = useState(null)
  const [hata, setHata] = useState('')
  const [arama, setArama] = useState('')
  const [suzgec, setSuzgec] = useState('tumu')

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

  const okunmamis = (kutu ?? []).reduce((a, k) => a + (k.okunmamis ?? 0), 0)
  const tekMuhatap = !kocMu && (kutu ?? []).length === 1
  const geri = () => {
    if (secili && !tekMuhatap && !(kisiId && onGeri)) { setSecili(null); yukle(); return }
    onGeri?.()
  }

  /* Liste: okunmamışlar üstte, sonra son yazışma. */
  const aranan = arama.trim().toLocaleLowerCase('tr')
  const liste = [...(kutu ?? [])]
    .filter((k) => (suzgec === 'tumu' || (suzgec === 'okunmamis' ? k.okunmamis > 0 : k.rol === 'veli')))
    .filter((k) => !aranan || (k.ad ?? '').toLocaleLowerCase('tr').includes(aranan))
    .sort((a, b) => (b.okunmamis > 0) - (a.okunmamis > 0) || new Date(b.sonZaman ?? 0) - new Date(a.sonZaman ?? 0))

  const ozet = secili
    ? `${ROL_ADI[secili.rol] ?? secili.rol}${secili.sonZaman ? ` · son mesaj ${gunYaz(secili.sonZaman)}` : ''}`
    : kutu === null ? ' ' : okunmamis ? `${okunmamis} okunmamış mesaj var.` : 'Okunmamış mesaj yok.'

  return (
    <div className="ana-sayfa ms">
      <AnaTepe
        selam={secili ? secili.ad : 'Mesajlar'}
        tarih={new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^(\d+ \S+) (\S+)$/, '$2, $1')}
        ozet={ozet}
        {...(tepe ?? {})}
        onGeri={tekMuhatap && !onGeri ? null : geri}
        kisa={Boolean(secili)}
        sagCizim={secili ? null : () => <UcakCizimi sayi={okunmamis} />}
      />
      <div className="ana-govde ana-govde--dar ms-govde">
        <Uyari>{hata}</Uyari>
        {secili ? (
          <Yazisma kisi={secili} profilId={profil.id} hazirCevap={kocMu} />
        ) : kutu === null ? (
          <Yukleniyor />
        ) : kutu.length === 0 ? (
          <div className="gd-bos"><strong>Henüz kimse yok.</strong><span>Koçun seni eklediğinde burada yazışabilirsiniz.</span></div>
        ) : (
          <>
            {kocMu && (
              <>
                <label className="on2-ara">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></svg>
                  <input type="search" value={arama} onChange={(e) => setArama(e.target.value)} placeholder="Kişi ara" aria-label="Kişi ara" />
                </label>
                <div className="on2-suz" role="group" aria-label="Süzgeç">
                  {[['tumu', 'Tümü', kutu.length], ['okunmamis', 'Okunmamış', kutu.filter((k) => k.okunmamis > 0).length], ['veli', 'Veliler', kutu.filter((k) => k.rol === 'veli').length]].map(([k, ad, n]) => (
                    <button key={k} type="button" aria-pressed={suzgec === k} onClick={() => setSuzgec(k)}>{ad}<span>{n}</span></button>
                  ))}
                </div>
              </>
            )}
            {liste.length === 0 ? (
              <div className="gd-bos"><strong>Eşleşen kişi yok.</strong><span>Aramayı ya da süzgeci değiştir.</span></div>
            ) : (
              <div className="ms-liste">
                {liste.map((k) => (
                  <button key={k.id} type="button" className={k.okunmamis > 0 ? 'ms-kisi ms-kisi--yeni' : 'ms-kisi'} onClick={() => setSecili(k)}>
                    <span className={k.rol === 'veli' ? 'ms-av ms-av--veli' : 'ms-av'}>
                      {(k.ad ?? '').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toLocaleUpperCase('tr')}
                    </span>
                    <span className="ms-yazi">
                      <span className="ms-ust">
                        <b>{k.ad}</b>
                        <span className="ms-rol">{ROL_ADI[k.rol] ?? k.rol}</span>
                        <span className="ms-zaman">{k.sonZaman ? gunYaz(k.sonZaman) : ''}</span>
                      </span>
                      <span className="ms-onizleme">
                        {k.sonMesaj ? `${k.benden ? 'Sen: ' : ''}${k.sonMesaj}` : 'Henüz yazışma yok. İlk mesajı sen yaz.'}
                      </span>
                    </span>
                    {k.okunmamis > 0 && <span className="ms-sayi">{k.okunmamis}</span>}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
