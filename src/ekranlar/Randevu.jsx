import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { site } from '../icerik/site.js'
import { MarkaIsareti } from '../bilesenler/Marka.jsx'
import '../tanitim.css'
import '../randevu.css'

/* Tanışma başvurusu. Kayıt basvuru_gonder RPC'siyle gider; tabloya
   ziyaretçinin doğrudan erişimi yok. Başvuru Kıvanç'a Telegram ve
   e-postayla bildirilir (veritabanı tetikleyicisi). */

const ZAMANLAR = [
  ['hafta_ici_gunduz', 'Hafta içi gündüz'],
  ['hafta_ici_aksam', 'Hafta içi akşam'],
  ['hafta_sonu', 'Hafta sonu'],
]
const SINIFLAR = { YKS: ['9', '10', '11', '12', 'mezun'], LGS: ['5', '6', '7', '8'] }
const HATALAR = {
  telefon_gecersiz: 'Telefon numarasını 05XX XXX XX XX biçiminde yazın.',
  ad_gecersiz: 'Ad soyad en az 2 harf olmalı.',
  sinif_gecersiz: 'Sınav ve sınıfı kontrol edin.',
  kvkk_onayi_gerekli: 'Devam etmek için onay kutusunu işaretleyin.',
  cok_yogun: 'Şu an çok fazla başvuru var. Birkaç dakika sonra deneyin ya da WhatsApp’tan yazın.',
}

function telefonBicimle(ham) {
  let d = ham.replace(/\D/g, '')
  if (d.startsWith('90')) d = d.slice(2)
  if (d && !d.startsWith('0')) d = '0' + d
  d = d.slice(0, 11)
  return [d.slice(0, 4), d.slice(4, 7), d.slice(7, 9), d.slice(9, 11)].filter(Boolean).join(' ')
}

function Secenek({ secili, onClick, children }) {
  return (
    <button type="button" className={`r-cip${secili ? ' r-cip--secili' : ''}`} aria-pressed={secili} onClick={onClick}>
      {children}
    </button>
  )
}

export default function Randevu({ onGeri }) {
  const { koc, iletisim } = site
  const [f, setF] = useState({ ad: '', tel: '', dolduran: 'veli', sinav: 'YKS', sinif: '12', zaman: 'hafta_ici_aksam', not: '', kvkk: false, web: '' })
  const [hatalar, setHatalar] = useState({})
  const [genelHata, setGenelHata] = useState(null)
  const [gonderiliyor, setGonderiliyor] = useState(false)
  const [bitti, setBitti] = useState(false)
  const baslik = useRef(null)

  useEffect(() => { document.title = `Tanışma görüşmesi · ${koc.ad}` }, [koc.ad])
  useEffect(() => { if (bitti) baslik.current?.focus() }, [bitti])

  const degis = (alan, deger) => {
    setF((o) => ({ ...o, [alan]: deger }))
    setHatalar((h) => ({ ...h, [alan]: undefined }))
    setGenelHata(null)
  }
  const sinavSec = (s) => {
    setF((o) => ({ ...o, sinav: s, sinif: SINIFLAR[s].includes(o.sinif) ? o.sinif : SINIFLAR[s][SINIFLAR[s].length - 1] }))
  }

  const whatsapp = (() => {
    let no = (iletisim.whatsapp || '').replace(/\D/g, '')
    if (!no) return null
    if (no.startsWith('0')) no = '9' + no
    return `https://wa.me/${no}?text=${encodeURIComponent(iletisim.whatsappMesaj || '')}`
  })()

  async function gonder(e) {
    e.preventDefault()
    const h = {}
    if (f.ad.trim().length < 2) h.ad = 'Adınızı ve soyadınızı yazın.'
    if (!/^05\d{9}$/.test(f.tel.replace(/\D/g, ''))) h.tel = HATALAR.telefon_gecersiz
    if (!f.kvkk) h.kvkk = HATALAR.kvkk_onayi_gerekli
    setHatalar(h)
    if (Object.keys(h).length) return

    setGonderiliyor(true)
    const { error } = await supabase.rpc('basvuru_gonder', {
      p: { ad_soyad: f.ad.trim(), telefon: f.tel, dolduran: f.dolduran, sinav: f.sinav, sinif: f.sinif, arama_zamani: f.zaman, not: f.not, kvkk: f.kvkk, web: f.web },
    })
    setGonderiliyor(false)
    if (error) {
      const anahtar = Object.keys(HATALAR).find((k) => error.message?.includes(k))
      setGenelHata(anahtar ? HATALAR[anahtar] : 'Başvuru gönderilemedi. Bağlantınızı kontrol edip tekrar deneyin ya da WhatsApp’tan yazın.')
      return
    }
    setBitti(true)
    window.scrollTo(0, 0)
  }

  const zamanMetni = ZAMANLAR.find(([k]) => k === f.zaman)?.[1].toLowerCase()
  const hitap = f.ad.trim().split(/\s+/)[0]

  return (
    <div className="tanitim basvuru-sayfa">
      <header className="t-ust">
        <div className="t-kap t-ust-ic">
          <a href="/" className="t-marka r-marka" onClick={(e) => { e.preventDefault(); onGeri() }}>
            <span className="t-marka-kilit">
              <MarkaIsareti yukseklik={22} sinif="t-marka-isaret" />
              <span className="t-marka-ad">{koc.ad}</span>
            </span>
            <span className="t-marka-alt">YKS · LGS koçu</span>
          </a>
        </div>
      </header>

      <main className="t-kap r-kap">
        {bitti ? (
          <section className="r-bitti">
            <span className="r-bitti-ikon" aria-hidden="true">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h4l2 5l-2.5 1.5a11 11 0 0 0 5 5l1.5 -2.5l5 2v4a2 2 0 0 1 -2 2a16 16 0 0 1 -15 -15a2 2 0 0 1 2 -2" /><path d="M15 7a2 2 0 0 1 2 2" /><path d="M15 3a6 6 0 0 1 6 6" /></svg>
            </span>
            <h1 tabIndex={-1} ref={baslik}>Teşekkürler{hitap ? `, ${hitap}` : ''}</h1>
            <p>Başvurunuz ulaştı. {koc.ad} en geç 24 saat içinde, {zamanMetni} sizi arayacak.</p>
            <div className="r-bitti-eylem">
              {whatsapp && <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="t-dugme t-dugme--acik-cizgi">Beklemek istemezseniz WhatsApp’tan yazın</a>}
              <a href="/" className="r-geri" onClick={(e) => { e.preventDefault(); onGeri() }}>Ana sayfaya dön</a>
            </div>
          </section>
        ) : (
          <form className="r-form" onSubmit={gonder} noValidate>
            <p className="r-ust-etiket">Ücretsiz tanışma</p>
            <h1>Sizi arayalım</h1>
            <p className="r-giris">Formu doldurun, {koc.ad} 24 saat içinde arasın. Görüşme 30 dakika sürer ve ücretsizdir.</p>

            <label className="r-alan">
              <span>Ad soyad</span>
              <input type="text" autoComplete="name" value={f.ad} onChange={(e) => degis('ad', e.target.value)} aria-invalid={!!hatalar.ad} maxLength={80} />
              {hatalar.ad && <em className="r-hata">{hatalar.ad}</em>}
            </label>

            <label className="r-alan">
              <span>Telefon</span>
              <input type="tel" inputMode="numeric" autoComplete="tel" placeholder="05__ ___ __ __" value={f.tel} onChange={(e) => degis('tel', telefonBicimle(e.target.value))} aria-invalid={!!hatalar.tel} />
              {hatalar.tel && <em className="r-hata">{hatalar.tel}</em>}
            </label>

            <fieldset className="r-alan">
              <legend>Formu dolduran</legend>
              <div className="r-cipler r-cipler--esit">
                <Secenek secili={f.dolduran === 'veli'} onClick={() => degis('dolduran', 'veli')}>Veli</Secenek>
                <Secenek secili={f.dolduran === 'ogrenci'} onClick={() => degis('dolduran', 'ogrenci')}>Öğrenci</Secenek>
              </div>
            </fieldset>

            <div className="r-ikili">
              <fieldset className="r-alan">
                <legend>Sınav</legend>
                <div className="r-cipler r-cipler--esit">
                  {['YKS', 'LGS'].map((s) => <Secenek key={s} secili={f.sinav === s} onClick={() => sinavSec(s)}>{s}</Secenek>)}
                </div>
              </fieldset>
              <label className="r-alan">
                <span>Sınıf</span>
                <select value={f.sinif} onChange={(e) => degis('sinif', e.target.value)}>
                  {SINIFLAR[f.sinav].map((s) => <option key={s} value={s}>{s === 'mezun' ? 'Mezun' : `${s}. sınıf`}</option>)}
                </select>
              </label>
            </div>

            <fieldset className="r-alan">
              <legend>Ne zaman arayalım?</legend>
              <div className="r-cipler">
                {ZAMANLAR.map(([k, ad]) => <Secenek key={k} secili={f.zaman === k} onClick={() => degis('zaman', k)}>{ad}</Secenek>)}
              </div>
            </fieldset>

            <label className="r-alan">
              <span>Not <small>(isteğe bağlı)</small></span>
              <textarea rows={3} maxLength={500} value={f.not} onChange={(e) => degis('not', e.target.value)} placeholder="Matematikte takıldık, deneme netleri düşüyor." />
            </label>

            {/* Tuzak alan: ekranda ve ekran okuyucuda görünmez */}
            <input type="text" name="web" className="r-tuzak" tabIndex={-1} autoComplete="off" aria-hidden="true" value={f.web} onChange={(e) => degis('web', e.target.value)} />

            <label className="r-onay">
              <input type="checkbox" checked={f.kvkk} onChange={(e) => degis('kvkk', e.target.checked)} aria-invalid={!!hatalar.kvkk} />
              <span>Bilgilerimin tanışma görüşmesi için kullanılmasını onaylıyorum.</span>
            </label>
            {hatalar.kvkk && <em className="r-hata">{hatalar.kvkk}</em>}

            <details className="r-aydinlatma">
              <summary>Aydınlatma metni</summary>
              <p>
                Bu formdaki bilgiler (ad soyad, telefon, sınav ve sınıf bilgisi, aranma zamanı ve notunuz) veri
                sorumlusu {koc.ad} tarafından yalnızca sizinle tanışma görüşmesi yapmak amacıyla, 6698 sayılı
                KVKK’nın 5/2-c maddesi (bir sözleşmenin kurulmasıyla doğrudan ilgili olması) kapsamında işlenir.
              </p>
              <p>
                Bilgiler üçüncü kişilerle paylaşılmaz; yalnızca sitenin barındırıldığı veritabanı hizmetinde
                saklanır ve görüşme sonucunda koçluk başlamazsa en geç 6 ay içinde silinir. KVKK’nın 11. maddesindeki
                haklarınızı kullanmak için {iletisim.eposta} adresine yazabilirsiniz.
              </p>
            </details>

            {f.dolduran === 'ogrenci' && <p className="r-not">Tanışma görüşmesini velinizle birlikte yapıyoruz.</p>}
            {genelHata && <p className="r-hata r-hata--genel" role="alert">{genelHata}</p>}

            <button type="submit" className="t-dugme t-dugme--ana r-gonder" disabled={gonderiliyor}>
              {gonderiliyor ? 'Gönderiliyor…' : 'Beni arayın'}
            </button>
          </form>
        )}
      </main>
    </div>
  )
}
