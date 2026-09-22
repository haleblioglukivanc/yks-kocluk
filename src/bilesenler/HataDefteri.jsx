import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase, hataMetni } from '../lib/supabase.js'
import { dersGorunumu } from '../lib/dersGorunum.js'
import EylemDugmesi from '../ortak/EylemDugmesi.jsx'
import './HataDefteri.css'

/* Hata defteri (20 Eylül 2026, Bekir mokabı onayladı).
   Soru bazlı yanlış kaydı: fotoğraf + neden + güven + doğru şık.
   Tekrar 1-3-7-14-28 gün, üst üste iki doğru = öğrenildi (sunucuda:
   hata_tekrar_cevapla). Üç ekran mokaptaki gibi tam sayfa açılır:
   Defter → Yanlışı ekle, Defter → Tekrar. Giriş: Denemeler sekmesindeki
   satır, deneme kaydındaki "Yanlışlar nereden geldi?" adımı ve Günü
   tamamla'daki soru kaydı. */

const KOVA = 'hata-foto'
const NEDENLER = [
  { id: 'bilgi', ad: 'Konuyu bilmiyordum', kisa: 'Konu eksiği', alt: 'formül, kural, tanım' },
  { id: 'dikkat', ad: 'Dikkatsizlik', kisa: 'Dikkatsizlik', alt: 'yanlış okudum, işlem' },
  { id: 'yontem', ad: 'Yanlış yol seçtim', kisa: 'Yanlış yol', alt: 'biliyordum, uygulayamadım' },
  { id: 'sure', ad: 'Süre yetmedi', kisa: 'Süre yetmedi', alt: 'yetişemedim, salladım' },
]
const NEDEN_AD = Object.fromEntries(NEDENLER.map((n) => [n.id, n.kisa]))
const SIKLAR = ['A', 'B', 'C', 'D', 'E']

function yerelGun(t = new Date()) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(t)
  return p // YYYY-MM-DD
}
function gunFarki(tarih) {
  const a = new Date(`${yerelGun()}T00:00:00`)
  const b = new Date(`${tarih}T00:00:00`)
  return Math.round((b - a) / 86400000)
}
function sonrakiMetni(tarih) {
  const f = gunFarki(tarih)
  if (f <= 0) return 'bugün'
  if (f === 1) return 'yarın'
  return `${f} gün`
}

/* Telefon fotoğrafı 3–10 MB: uzun kenar 1600px JPEG'e iner (~150–300 KB). */
async function fotoKucult(dosya) {
  const adres = URL.createObjectURL(dosya)
  try {
    const resim = await new Promise((coz, reddet) => {
      const r = new Image()
      r.onload = () => coz(r)
      r.onerror = () => reddet(new Error('Bu fotoğraf açılamadı. JPG ya da PNG deneyin.'))
      r.src = adres
    })
    const oran = Math.min(1, 1600 / Math.max(resim.naturalWidth, resim.naturalHeight))
    const tuval = document.createElement('canvas')
    tuval.width = Math.round(resim.naturalWidth * oran)
    tuval.height = Math.round(resim.naturalHeight * oran)
    tuval.getContext('2d').drawImage(resim, 0, 0, tuval.width, tuval.height)
    const blob = await new Promise((coz) => tuval.toBlob(coz, 'image/jpeg', 0.82))
    if (!blob) throw new Error('Fotoğraf hazırlanamadı.')
    return blob
  } finally {
    URL.revokeObjectURL(adres)
  }
}

function useImzaliAdres(yol) {
  const [adres, setAdres] = useState(null)
  useEffect(() => {
    let iptal = false
    setAdres(null)
    if (!yol) return
    supabase.storage.from(KOVA).createSignedUrl(yol, 3600).then(({ data }) => {
      if (!iptal) setAdres(data?.signedUrl ?? null)
    })
    return () => { iptal = true }
  }, [yol])
  return adres
}

/* Mokaptaki tam sayfa: body'ye portal, kâğıt zemin, koyu tepe. */
function TamSayfa({ etiket, onGeri, geriIkon = 'geri', baslik, alt, tepeEk, children, alti }) {
  useEffect(() => {
    const onceki = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = onceki }
  }, [])
  return createPortal(
    <div className="hd-sayfa" role="dialog" aria-modal="true" aria-label={etiket ?? baslik}>
      <header className="hd-tepe">
        <div className="hd-tepe-satir">
          <button type="button" className="hd-geri" onClick={onGeri} aria-label={geriIkon === 'kapat' ? 'Kapat' : 'Geri'}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              {geriIkon === 'kapat' ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M15 18l-6-6 6-6" />}
            </svg>
          </button>
          <h1 className="hd-baslik">{baslik}</h1>
        </div>
        {alt && <p className="hd-tepe-alt">{alt}</p>}
        {tepeEk}
      </header>
      <div className="hd-govde">{children}</div>
      {alti && <div className="hd-alti">{alti}</div>}
    </div>,
    document.body,
  )
}

/* ───────────── Veri ───────────── */

export function useDefter(ogrenciId) {
  const [liste, setListe] = useState(null)
  const [hata, setHata] = useState('')
  const yukle = useCallback(async () => {
    if (!ogrenciId) return
    const { data, error } = await supabase
      .from('hata_defteri')
      .select('id, ders_id, konu_id, kaynak, foto_yolu, not_metni, neden, guven, dogru_sik, sonraki_tekrar, ust_uste_dogru, ogrenildi, olusturuldu, dersler(ad), konular(ad)')
      .eq('ogrenci_id', ogrenciId)
      .order('olusturuldu', { ascending: false })
      .limit(500)
    if (error) setHata(hataMetni(error))
    else setListe(data ?? [])
  }, [ogrenciId])
  useEffect(() => { yukle() }, [yukle])
  return { liste, hata, yukle }
}

export function bekleyenler(liste) {
  const bugun = yerelGun()
  return (liste ?? [])
    .filter((h) => !h.ogrenildi && h.sonraki_tekrar <= bugun)
    .sort((a, b) => (a.sonraki_tekrar < b.sonraki_tekrar ? -1 : 1))
}

/* ───────────── Denemeler sekmesindeki giriş satırı ───────────── */

export default function HataDefteri({ ogrenciId, katalogId, duzenlenebilir = true }) {
  const { liste, yukle } = useDefter(ogrenciId)
  const [ekran, setEkran] = useState(null) // 'defter' | 'ekle' | 'tekrar'
  const bekleyen = useMemo(() => bekleyenler(liste), [liste])
  const acik = (liste ?? []).filter((h) => !h.ogrenildi).length

  if (!liste) return null
  return (
    <>
      <button type="button" className="hd-giris" onClick={() => setEkran('defter')}>
        <span className="hd-giris-yazi">
          <strong>Hata defteri</strong>
          <span>
            {liste.length === 0
              ? 'Yanlış yaptığın soruları buraya ekle, doğru zamanda karşına çıksın'
              : bekleyen.length > 0
                ? `Bugün ${bekleyen.length} soru seni bekliyor`
                : `Defterde ${acik} soru · bugün tekrar yok`}
          </span>
        </span>
        {bekleyen.length > 0 && <span className="hd-giris-sayi">{bekleyen.length}</span>}
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
      </button>

      {ekran === 'defter' && (
        <DefterSayfasi
          liste={liste}
          duzenlenebilir={duzenlenebilir}
          onGeri={() => setEkran(null)}
          onEkle={() => setEkran('ekle')}
          onTekrar={() => setEkran('tekrar')}
        />
      )}
      {ekran === 'ekle' && (
        <YanlisEkle
          ogrenciId={ogrenciId}
          katalogId={katalogId}
          onGeri={() => setEkran('defter')}
          onEklendi={() => { yukle(); setEkran('defter') }}
        />
      )}
      {ekran === 'tekrar' && (
        <TekrarSayfasi
          sorular={bekleyen}
          onBitti={() => { yukle(); setEkran('defter') }}
        />
      )}
    </>
  )
}

/* Deneme adımı ve Günü tamamla için yalnız "ekle" kapısı. */
export function HataEkleDugmesi({ ogrenciId, katalogId, denemeId = null, dersler = null, onEklendi, metin = '+ Soruyu hata defterine ekle' }) {
  const [acik, setAcik] = useState(false)
  return (
    <>
      <EylemDugmesi onClick={() => setAcik(true)}>{metin}</EylemDugmesi>
      {acik && (
        <YanlisEkle
          ogrenciId={ogrenciId}
          katalogId={katalogId}
          denemeId={denemeId}
          dersFiltre={dersler}
          onGeri={() => setAcik(false)}
          onEklendi={() => { setAcik(false); onEklendi?.() }}
        />
      )}
    </>
  )
}

/* ───────────── 2 · Hata defteri ───────────── */

function DefterSayfasi({ liste, duzenlenebilir, onGeri, onEkle, onTekrar }) {
  const bekleyen = bekleyenler(liste)
  const ogrenilen = liste.filter((h) => h.ogrenildi).length
  const dakika = Math.max(1, bekleyen.length * 2)

  const otuzGun = new Date(Date.now() - 30 * 86400000).toISOString()
  const son30 = liste.filter((h) => h.olusturuldu >= otuzGun)
  const dagilim = NEDENLER.map((n) => ({ ...n, sayi: son30.filter((h) => h.neden === n.id).length }))
    .filter((n) => n.sayi > 0)
    .sort((a, b) => b.sayi - a.sayi)
  const enCok = dagilim[0]?.sayi ?? 1

  const sirali = [...liste].sort((a, b) => {
    if (!!a.ogrenildi !== !!b.ogrenildi) return a.ogrenildi ? 1 : -1
    return a.sonraki_tekrar < b.sonraki_tekrar ? -1 : 1
  })
  const [hepsi, setHepsi] = useState(false)
  const gorunen = hepsi ? sirali : sirali.slice(0, 8)

  return (
    <TamSayfa
      etiket="Hata defteri"
      baslik="Hata defteri"
      onGeri={onGeri}
      alt={liste.length ? `Defterde ${liste.length} soru · ${ogrenilen} tanesini öğrendin` : 'Henüz soru yok'}
      tepeEk={
        <>
          {duzenlenebilir && (
            <button type="button" className="hd-tepe-ekle" onClick={onEkle} aria-label="Yanlış ekle">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            </button>
          )}
          {bekleyen.length > 0 && (
            <div className="hd-bugun">
              <div>
                <span className="hd-bugun-sayi">{bekleyen.length} soru</span>
                <span className="hd-bugun-alt">bugün seni bekliyor · ~{dakika} dk</span>
              </div>
              {duzenlenebilir && (
                <button type="button" className="hd-altin-hap" onClick={onTekrar}>Tekrara başla</button>
              )}
            </div>
          )}
        </>
      }
    >
      {liste.length === 0 ? (
        <div className="hd-bos">
          <p>Denemede ya da soru çözerken yanlış yaptığın bir soruyu ekle; doğru zamanda yeniden karşına çıkar.</p>
          {duzenlenebilir && <EylemDugmesi onClick={onEkle}>+ Yanlış ekle</EylemDugmesi>}
        </div>
      ) : (
        <>
          {dagilim.length > 0 && (
            <section className="hd-bolum">
              <h2 className="hd-bolum-baslik">Neden yanlış yapıyorsun?</h2>
              <p className="hd-bolum-alt">Son 30 gün, {son30.length} yanlış</p>
              <div className="hd-yuzey hd-dagilim">
                {dagilim.map((n) => (
                  <div key={n.id} className="hd-dagilim-satir">
                    <span>{n.kisa}</span>
                    <span className="hd-cubuk"><span style={{ width: `${Math.round((n.sayi / enCok) * 100)}%` }} /></span>
                    <b>{n.sayi}</b>
                  </div>
                ))}
              </div>
              {dagilim[0].sayi >= 2 && (
                <p className="hd-not"><span className="hd-nokta" aria-hidden="true" />En sık: {dagilim[0].kisa.toLocaleLowerCase('tr-TR')}. {IPUCU[dagilim[0].id]}</p>
              )}
            </section>
          )}

          <section className="hd-bolum">
            <h2 className="hd-bolum-baslik">Defterdeki sorular</h2>
            <div className="hd-yuzey hd-liste">
              {gorunen.map((h) => {
                const renk = dersGorunumu(h.dersler?.ad).renk
                const durum = h.ogrenildi ? 'öğrendin' : sonrakiMetni(h.sonraki_tekrar)
                return (
                  <div key={h.id} className="hd-satir">
                    <span className="hd-serit" style={{ background: renk }} />
                    <span className="hd-satir-yazi">
                      <b>{[h.dersler?.ad, h.konular?.ad].filter(Boolean).join(' · ') || 'Ders seçilmemiş'}</b>
                      <span>
                        {h.ogrenildi
                          ? '2 kez üst üste doğru'
                          : `${NEDEN_AD[h.neden]}${h.guven ? ` · ${h.guven === 'emin' ? 'emindim' : 'tahmin'}` : ''}`}
                      </span>
                    </span>
                    <span className={`hd-durum${h.ogrenildi ? ' hd-durum--iyi' : durum === 'bugün' ? ' hd-durum--bugun' : ''}`}>{durum}</span>
                  </div>
                )
              })}
            </div>
            {sirali.length > 8 && (
              <div className="hd-tumu">
                <EylemDugmesi onClick={() => setHepsi((x) => !x)}>{hepsi ? 'Kısalt' : `Tümü (${sirali.length})`}</EylemDugmesi>
              </div>
            )}
          </section>
        </>
      )}
    </TamSayfa>
  )
}

const IPUCU = {
  dikkat: 'Soru kökünü sonuna kadar oku, verilenlerin altını çiz.',
  bilgi: 'Bu konular haftalık tekrar planına da düşüyor.',
  yontem: 'Çözümü bitince "başka yolla da olur muydu?" diye bir kez sor.',
  sure: 'Takıldığın soruyu işaretle, turun sonunda dön.',
}

/* ───────────── 1 · Yanlışı ekle ───────────── */

function YanlisEkle({ ogrenciId, katalogId, denemeId = null, dersFiltre = null, onGeri, onEklendi }) {
  const [dersler, setDersler] = useState([])
  const [dersId, setDersId] = useState('')
  const [konuId, setKonuId] = useState('')
  const [foto, setFoto] = useState(null) // { blob, onizleme }
  const [neden, setNeden] = useState(null)
  const [guven, setGuven] = useState(null)
  const [sik, setSik] = useState(null)
  const [notMetni, setNotMetni] = useState('')
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState('')
  const girdi = useRef(null)

  const filtreAnahtari = dersFiltre?.join(',') ?? ''
  useEffect(() => {
    const filtre = filtreAnahtari ? filtreAnahtari.split(',').map(Number) : null
    let q = supabase.from('dersler').select('id, ad, sira, konular(id, ad, sira)').order('sira')
    if (katalogId) q = q.eq('katalog_id', katalogId)
    q.then(({ data }) => {
      let d = (data ?? []).map((x) => ({ ...x, konular: [...(x.konular ?? [])].sort((a, b) => a.sira - b.sira) }))
      if (filtre?.length) d = d.filter((x) => filtre.includes(x.id))
      setDersler(d)
      if (d.length === 1) setDersId(String(d[0].id))
    })
  }, [katalogId, filtreAnahtari])

  useEffect(() => () => { if (foto?.onizleme) URL.revokeObjectURL(foto.onizleme) }, [foto])

  const ders = dersler.find((d) => String(d.id) === String(dersId))
  const hazir = !!neden && (!!foto || notMetni.trim().length > 0 || !!konuId)

  async function fotoSec(e) {
    const dosya = e.target.files?.[0]
    e.target.value = ''
    if (!dosya) return
    setHata('')
    try {
      const blob = await fotoKucult(dosya)
      setFoto({ blob, onizleme: URL.createObjectURL(blob) })
    } catch (err) {
      setHata(err.message)
    }
  }

  async function kaydet() {
    setBekliyor(true)
    setHata('')
    try {
      let foto_yolu = null
      if (foto) {
        foto_yolu = `${ogrenciId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
        const { error } = await supabase.storage.from(KOVA).upload(foto_yolu, foto.blob, { contentType: 'image/jpeg' })
        if (error) throw error
      }
      const { error } = await supabase.from('hata_defteri').insert({
        ogrenci_id: ogrenciId,
        ders_id: dersId ? Number(dersId) : null,
        konu_id: konuId ? Number(konuId) : null,
        deneme_id: denemeId,
        kaynak: denemeId ? 'deneme' : 'soru',
        foto_yolu,
        not_metni: notMetni.trim() || null,
        neden,
        guven,
        dogru_sik: sik,
      })
      if (error) {
        if (foto_yolu) await supabase.storage.from(KOVA).remove([foto_yolu])
        throw error
      }
      onEklendi()
    } catch (err) {
      setHata(hataMetni(err))
      setBekliyor(false)
    }
  }

  let bilgi = 'Nedenini seç; gerisini defter planlar.'
  if (neden) {
    if (guven === 'emin') bilgi = 'Emin olup yanlış yaptığın sorular en hızlı düzelir ama geri gelebilir. Bu soru yarın tekrar karşına çıkacak.'
    else if (neden === 'bilgi' && konuId) bilgi = 'Konu eksiği: bu konunun tekrarı haftalık planına da düşer. Soru yarın gelecek.'
    else if (neden === 'sure') bilgi = 'Süre sorunu: soru yarın gelecek, bu kez saatine bakarak çöz.'
    else bilgi = 'Soru 1, 3, 7, 14 ve 28 gün sonra gelir. Üst üste iki kez doğru yaparsan defterden çıkar.'
  }

  return (
    <TamSayfa
      etiket="Yanlışı deftere ekle"
      baslik="Yanlışı deftere ekle"
      alt={denemeId ? 'Deneme yanlışı' : 'Soru çözümü'}
      onGeri={onGeri}
      alti={
        <>
          {hata && <p className="hd-hata" role="alert">{hata}</p>}
          <p className="hd-not"><span className="hd-nokta" aria-hidden="true" />{bilgi}</p>
          <button type="button" className="hd-koyu-hap" disabled={!hazir || bekliyor} onClick={kaydet}>
            {bekliyor ? 'Ekleniyor…' : 'Deftere ekle'}
          </button>
        </>
      }
    >
      <input ref={girdi} type="file" accept="image/*" capture="environment" hidden onChange={fotoSec} />
      <div className="hd-yuzey hd-foto">
        {foto ? (
          <img src={foto.onizleme} alt="Sorunun fotoğrafı" />
        ) : (
          <span className="hd-foto-bos">Sorunun fotoğrafını çek; tekrarda karşına bu gelir.</span>
        )}
        <button type="button" className="hd-foto-dugme" onClick={() => girdi.current?.click()} aria-label={foto ? 'Fotoğrafı yeniden çek' : 'Fotoğraf çek'}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
        </button>
      </div>

      <div className="hd-secimler">
        <label className="hd-secim">
          <span>Ders</span>
          <select value={dersId} onChange={(e) => { setDersId(e.target.value); setKonuId('') }}>
            <option value="">Seç</option>
            {dersler.map((d) => <option key={d.id} value={d.id}>{d.ad}</option>)}
          </select>
        </label>
        <label className="hd-secim">
          <span>Konu</span>
          <select value={konuId} onChange={(e) => setKonuId(e.target.value)} disabled={!ders}>
            <option value="">{ders ? 'Seç' : 'Önce ders'}</option>
            {(ders?.konular ?? []).map((k) => <option key={k.id} value={k.id}>{k.ad}</option>)}
          </select>
        </label>
      </div>

      <fieldset className="hd-grup">
        <legend>Neden yanlış yaptın?</legend>
        <div className="hd-izgara">
          {NEDENLER.map((n) => (
            <button key={n.id} type="button" aria-pressed={neden === n.id} className={`hd-kutu${neden === n.id ? ' hd-secili' : ''}`} onClick={() => setNeden(n.id)}>
              <b>{n.ad}</b>
              <span>{n.alt}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="hd-grup">
        <legend>Çözerken ne kadar emindin?</legend>
        <div className="hd-izgara">
          {[['emin', 'Emindim'], ['tahmin', 'Tahmin ettim']].map(([id, ad]) => (
            <button key={id} type="button" aria-pressed={guven === id} className={`hd-hap${guven === id ? ' hd-secili' : ''}`} onClick={() => setGuven(guven === id ? null : id)}>{ad}</button>
          ))}
        </div>
      </fieldset>

      <fieldset className="hd-grup">
        <legend>Doğru cevap</legend>
        <div className="hd-siklar">
          {SIKLAR.map((s) => (
            <button key={s} type="button" aria-pressed={sik === s} aria-label={`Şık ${s}`} className={`hd-sik${sik === s ? ' hd-sik--secili' : ''}`} onClick={() => setSik(sik === s ? null : s)}>{s}</button>
          ))}
        </div>
      </fieldset>

      <label className="hd-grup hd-not-alani">
        <span className="hd-legend">Kendine not <em>isteğe bağlı</em></span>
        <textarea rows={2} maxLength={500} value={notMetni} onChange={(e) => setNotMetni(e.target.value)} placeholder="Örn. f″ ile kontrol etmeyi unuttum" />
      </label>
    </TamSayfa>
  )
}

/* ───────────── 3 · Tekrar ───────────── */

function TekrarSayfasi({ sorular, onBitti }) {
  const [liste] = useState(sorular) // oturum boyunca sabit
  const [sira, setSira] = useState(0)
  const [secim, setSecim] = useState(null)
  const [sonuc, setSonuc] = useState(null)
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState('')
  const h = liste[sira]
  const foto = useImzaliAdres(h?.foto_yolu)

  if (!h) {
    return (
      <TamSayfa baslik="Tekrar" geriIkon="kapat" onGeri={onBitti}>
        <div className="hd-bos"><p>Bugünlük tekrar bitti.</p></div>
      </TamSayfa>
    )
  }

  async function gonder(dogruBeyan = null) {
    setBekliyor(true)
    setHata('')
    const { data, error } = await supabase.rpc('hata_tekrar_cevapla', {
      p_id: h.id,
      p_secilen: h.dogru_sik ? secim : null,
      p_dogru: h.dogru_sik ? null : dogruBeyan,
    })
    setBekliyor(false)
    if (error) setHata(hataMetni(error))
    else setSonuc(data)
  }

  function sonraki() {
    if (sira + 1 >= liste.length) return onBitti()
    setSira(sira + 1)
    setSecim(null)
    setSonuc(null)
  }

  const renk = dersGorunumu(h.dersler?.ad).renk
  const gecen = -gunFarki(h.olusturuldu.slice(0, 10))
  const sonMetin = sonuc
    ? sonuc.dogru
      ? sonuc.ogrenildi
        ? 'Üst üste ikinci doğru: bu soru defterden çıktı.'
        : `Bir sonraki tekrar ${sonrakiMetni(sonuc.sonraki) === 'yarın' ? 'yarın' : `${sonrakiMetni(sonuc.sonraki)} sonra`}. Orada da doğru yaparsan defterden çıkar.`
      : `${h.not_metni ? `Notun: ${h.not_metni}. ` : ''}Bu soru yarın yine gelecek.`
    : null

  return (
    <TamSayfa
      etiket="Tekrar"
      baslik={`Tekrar · ${sira + 1} / ${liste.length}`}
      geriIkon="kapat"
      onGeri={onBitti}
      tepeEk={
        <div className="hd-ilerleme" style={{ gridTemplateColumns: `repeat(${liste.length}, minmax(0, 1fr))` }}>
          {liste.map((x, i) => <span key={x.id} className={i < sira + (sonuc ? 1 : 0) ? 'dolu' : ''} />)}
        </div>
      }
      alti={
        <>
          {hata && <p className="hd-hata" role="alert">{hata}</p>}
          {sonuc && (
            <div className="hd-sonuc">
              <b className={sonuc.dogru ? 'hd-iyi' : 'hd-izle'}>{sonuc.dogru ? 'Doğru.' : sonuc.dogru_sik ? `Doğrusu ${sonuc.dogru_sik}.` : 'Yine yanlış.'}</b>
              <span>{sonMetin}</span>
            </div>
          )}
          {sonuc ? (
            <button type="button" className="hd-koyu-hap" onClick={sonraki}>{sira + 1 >= liste.length ? 'Bitir' : 'Sıradaki soru'}</button>
          ) : h.dogru_sik ? (
            <button type="button" className="hd-koyu-hap" disabled={!secim || bekliyor} onClick={() => gonder()}>Kontrol et</button>
          ) : (
            <div className="hd-izgara">
              <button type="button" className="hd-hap" disabled={bekliyor} onClick={() => gonder(false)}>Yine yanlış</button>
              <button type="button" className="hd-koyu-hap" disabled={bekliyor} onClick={() => gonder(true)}>Doğru yaptım</button>
            </div>
          )}
        </>
      }
    >
      <p className="hd-baglam">
        <span className="hd-serit hd-serit--kisa" style={{ background: renk }} />
        <span><b>{[h.dersler?.ad, h.konular?.ad].filter(Boolean).join(' · ') || 'Soru'}</b> · {gecen <= 0 ? 'bugün' : `${gecen} gün önce`} eklemiştin</span>
      </p>
      <div className="hd-yuzey hd-soru">
        {h.foto_yolu ? (
          foto ? <img src={foto} alt="Soru" /> : <span className="hd-foto-bos">Fotoğraf yükleniyor…</span>
        ) : (
          <span>{h.not_metni || 'Bu sorunun fotoğrafı yok.'}</span>
        )}
      </div>
      <p className="hd-yonerge">Cevaba bakmadan yeniden çöz{h.dogru_sik ? ', sonra seç.' : ', sonra dürüstçe işaretle.'}</p>
      {h.dogru_sik && (
        <div className="hd-siklar">
          {SIKLAR.map((s) => {
            let sinif = 'hd-sik'
            if (!sonuc && secim === s) sinif += ' hd-sik--secili'
            if (sonuc && s === sonuc.dogru_sik) sinif += ' hd-sik--dogru'
            if (sonuc && s === secim && s !== sonuc.dogru_sik) sinif += ' hd-sik--yanlis'
            return (
              <button key={s} type="button" disabled={!!sonuc} aria-pressed={secim === s} aria-label={`Şık ${s}`} className={sinif} onClick={() => setSecim(s)}>{s}</button>
            )
          })}
        </div>
      )}
    </TamSayfa>
  )
}


/* ───────────── Denemeler v2: "Tekrar etmen gerekenler" (22 Eylül 2026) ─────────────
   Hata defteri ile denemelerde hata çıkan konular tek blokta; öğrenciye
   cümleyle anlatılır. Tekrar zamanı gelen sorular "Çöz" ile açılır. */
const NEDEN_CUMLE = { bilgi: 'konuyu tam bilmediğini', dikkat: 'dikkatsizlik yaptığını', yontem: 'yöntemi karıştırdığını', sure: 'süreye yetişemediğini' }

function kacGunSonra(t) {
  const a = new Date(`${yerelGun()}T00:00:00`)
  const b = new Date(`${t}T00:00:00`)
  return Math.round((b - a) / 86400000)
}

export function TekrarBlogu({ ogrenciId, katalogId, zayif = [], duzenlenebilir = true, koc = false }) {
  const { liste, yukle } = useDefter(ogrenciId)
  const [ekran, setEkran] = useState(null)
  const bekleyen = useMemo(() => bekleyenler(liste), [liste])
  if (!liste) return null
  const acik = liste.filter((h) => !h.ogrenildi)
  const siradaki = [...acik].sort((a, b) => (a.sonraki_tekrar < b.sonraki_tekrar ? -1 : 1))[0]
  const konuAdi = (h) => h?.konular?.ad ?? h?.dersler?.ad ?? 'bir soru'

  let kutu
  if (bekleyen.length > 0) {
    kutu = (
      <div className="tb-kutu tb-kutu--simdi">
        <span className="tb-sayi">{bekleyen.length}</span>
        <div><b>Bugün {bekleyen.length} soruyu yeniden çözme zamanı</b>{[...new Set(bekleyen.map(konuAdi))].slice(0, 3).join(', ')}.</div>
        {!koc && <button type="button" onClick={() => setEkran('tekrar')}>Çöz</button>}
      </div>
    )
  } else if (siradaki) {
    const g = kacGunSonra(siradaki.sonraki_tekrar)
    kutu = (
      <div className="tb-kutu">
        <span className="tb-sayi">✓</span>
        <div><b>Bugün tekrar yok</b>{g === 1 ? 'Yarın' : `${g} gün sonra`} {konuAdi(siradaki)} sorusunu yeniden {koc ? 'çözecek' : 'çözeceksin'}.</div>
      </div>
    )
  } else {
    kutu = (
      <div className="tb-kutu">
        <div><b>{koc ? 'Defteri boş' : 'Defterin boş'}</b>{koc ? 'Yanlış yaptığı soruları eklediğinde burada görünür.' : 'Yanlış yaptığın bir soruyu ekle; unutmaman için doğru zamanda karşına çıkar.'}</div>
      </div>
    )
  }

  const notu = (konu) => acik.find((h) => h.konular?.ad === konu)
  return (
    <>
      <section className="kp-bolum">
        <div className="kp-bolum-bas"><h2>{koc ? 'Tekrar etmesi gerekenler' : 'Tekrar etmen gerekenler'}</h2></div>
        <p className="tb-aciklama">{koc ? 'Yanlış yaptığı sorular aralıklarla karşısına çıkar.' : 'Yanlış yaptığın sorular unutulmasın diye aralıklarla karşına çıkar.'}</p>
        <div className="kp-kart tb">
          {kutu}
          {zayif.slice(0, 4).map((z) => {
            const h = notu(z.konu)
            return (
              <div key={z.konuId} className="tb-konu">
                <div>
                  <b>{z.konu}</b>
                  <span>
                    Denemelerde {z.hata} soru {koc ? 'kaçırdı' : 'kaçırdın'}.
                    {h?.not_metni ? ` Defterine "${h.not_metni}" diye not ${koc ? 'düşmüş' : 'düşmüşsün'}.` : h?.neden && !koc ? ` Defterine ${NEDEN_CUMLE[h.neden] ?? 'bir not'} yazmışsın.` : ''}
                  </span>
                </div>
              </div>
            )
          })}
          <div className="tb-eylem">
            {duzenlenebilir && <button type="button" onClick={() => setEkran('ekle')}>+ Yanlış yaptığın bir soruyu ekle</button>}
            {liste.length > 0 && <button type="button" className="tb-ikincil" onClick={() => setEkran('defter')}>Defterin tamamı · {acik.length}</button>}
          </div>
        </div>
      </section>
      {ekran === 'defter' && (
        <DefterSayfasi liste={liste} duzenlenebilir={duzenlenebilir} onGeri={() => setEkran(null)} onEkle={() => setEkran('ekle')} onTekrar={() => setEkran('tekrar')} />
      )}
      {ekran === 'ekle' && (
        <YanlisEkle ogrenciId={ogrenciId} katalogId={katalogId} onGeri={() => setEkran(null)} onEklendi={() => { yukle(); setEkran(null) }} />
      )}
      {ekran === 'tekrar' && (
        <TekrarSayfasi sorular={bekleyen} onBitti={() => { yukle(); setEkran(null) }} />
      )}
    </>
  )
}

/* ───────────── Tekrar hatırlatması (22 Eylül 2026) ─────────────
   Tekrar zamanı gelen sorular öğrencinin gününe düşer: Programım'da
   günün işlerinin arasında ayrı bir satır ve Günü tamamla'da son
   hatırlatma. Görev değildir: koçun iş sayılarını ve günün yüzdesini
   etkilemez. Soru yoksa hiçbir şey çizmez. */
export function TekrarSatiri({ ogrenciId, kisa = false }) {
  const { liste, yukle } = useDefter(ogrenciId)
  const [acik, setAcik] = useState(false)
  const bekleyen = useMemo(() => bekleyenler(liste), [liste])
  if (!liste || bekleyen.length === 0) return null
  const konular = [...new Set(bekleyen.map((h) => h.konular?.ad ?? h.dersler?.ad).filter(Boolean))].slice(0, 2).join(', ')
  const dk = Math.max(2, bekleyen.length * 2)
  return (
    <>
      <div className={kisa ? 'tk-satir tk-satir--kisa' : 'tk-satir'}>
        <span className="tk-ikon" aria-hidden="true">↻</span>
        <span className="tk-yazi">
          {kisa ? (
            <><b>Bugünün {bekleyen.length} tekrarı kaldı.</b> Şimdi {dk} dakikada çözmek ister misin?</>
          ) : (
            <><b>Tekrar zamanı · {bekleyen.length} soru</b>{konours(konular)} · ~{dk} dk</>
          )}
        </span>
        <button type="button" onClick={() => setAcik(true)}>Çöz</button>
      </div>
      {acik && <TekrarSayfasi sorular={bekleyen} onBitti={() => { setAcik(false); yukle() }} />}
    </>
  )
}
const konours = (k) => (k ? ` (${k})` : '')

/* Koç için: öğrencinin zamanı geçmiş ama çözülmemiş tekrarları. */
export function GecikenTekrarNotu({ ogrenciId }) {
  const { liste } = useDefter(ogrenciId)
  if (!liste) return null
  const bugun = yerelGun()
  const geciken = liste.filter((h) => !h.ogrenildi && h.sonraki_tekrar < bugun)
  if (geciken.length === 0) return null
  return (
    <p className="tk-koc-not">
      Hata defterinde zamanı geçmiş <b>{geciken.length} tekrar</b> var; öğrenci bunları çözmemiş.
    </p>
  )
}
