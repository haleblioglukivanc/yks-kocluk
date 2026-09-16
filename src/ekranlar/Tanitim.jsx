import { useEffect, useRef, useState } from 'react'
import { site } from '../icerik/site.js'
import { ogrenci, gunler, mesajlar, ilkeler, baslangic } from '../icerik/hafta.js'
import BelgeSeridi from '../bilesenler/BelgeSeridi.jsx'
import { MarkaIsareti } from '../bilesenler/Marka.jsx'
import '../tanitim.css'

/* Koç videoları: public/video/ altında, sessiz. Sırayla oynar, sonuncusu
   bitince başa döner; geçişte yumuşak solma olur. İlk video yüklenemezse
   lacivert zemin ve yer tutucu görünür; sayfa bozulmaz. */
const VIDEOLAR = [
  { src: '/video/seminer.mp4', konum: '72% center' }, // salon (aynalı): konuşmacı sağda
  { src: '/video/koc.mp4',     konum: '70% center' }, // masa: eller sağda
]

function Gunler() {
  const kap = useRef(null)
  const [aktif, setAktif] = useState(0)
  const dokunuldu = useRef(false)   // kullanıcı kendisi yatay kaydırdı mı?
  const animasyonda = useRef(false) // ipucu hareketi sürüyor mu?

  // Hangi gün görünüyor? (sekme vurgusu için)
  useEffect(() => {
    const el = kap.current
    if (!el) return
    const olc = () => {
      const kolonlar = Array.from(el.children)
      const sol = el.scrollLeft + parseFloat(getComputedStyle(el).paddingLeft || 0)
      let i = 0
      kolonlar.forEach((k, n) => { if (k.offsetLeft - sol <= 8) i = n })
      setAktif(i)
      if (!animasyonda.current) dokunuldu.current = true
    }
    el.addEventListener('scroll', olc, { passive: true })
    return () => el.removeEventListener('scroll', olc)
  }, [])

  // Bölüm ekrana ilk girdiğinde küçük bir "beni kaydır" hareketi (bir kez)
  useEffect(() => {
    const el = kap.current
    if (!el) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    let yapildi = false
    const go = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || yapildi) return
      yapildi = true; go.disconnect()
      if (el.scrollWidth - el.clientWidth < 40 || dokunuldu.current) return
      const bas = el.scrollLeft, mesafe = 88, sure = 1100
      const eskiSnap = el.style.scrollSnapType
      const bitir = () => { animasyonda.current = false; el.style.scrollSnapType = eskiSnap }
      const basla = () => {
        if (dokunuldu.current) return
        animasyonda.current = true
        el.style.scrollSnapType = 'none' // mıknatıs hizalama hareketi geri çekmesin
        const t0 = performance.now()
        const adim = (t) => {
          const k = Math.min(1, (t - t0) / sure)
          el.scrollLeft = bas + Math.sin(k * Math.PI) * mesafe
          if (k < 1) requestAnimationFrame(adim); else { el.scrollLeft = bas; setTimeout(bitir, 60) }
        }
        requestAnimationFrame(adim)
      }
      setTimeout(basla, 400)
    }, { threshold: 0.35 })
    go.observe(el)
    return () => go.disconnect()
  }, [])

  const git = (i) => {
    const el = kap.current; const k = el?.children[i]
    if (!el || !k) return
    dokunuldu.current = true
    el.scrollTo({ left: k.offsetLeft - parseFloat(getComputedStyle(el).paddingLeft || 0), behavior: 'smooth' })
  }

  return (
    <>
      <div className="t-gun-sekmeler" role="tablist" aria-label="Haftanın günleri">
        {gunler.map((g, i) => (
          <button key={g.ad} type="button" role="tab" aria-selected={i === aktif}
            className={'t-gun-sekme' + (i === aktif ? ' t-gun-sekme--aktif' : '')} onClick={() => git(i)}>
            {g.kisa}
          </button>
        ))}
      </div>
      <div className="t-gunler" ref={kap}>
        {gunler.map((g) => (
          <div key={g.ad} className="t-gun">
            <div className="t-gun-bas"><span className="t-gun-ad">{g.ad}</span><span className="t-gun-tarih">{g.tarih}</span></div>
            <div className="t-gorevler">{g.gorevler.map((t, i) => <Gorev key={i} t={t} />)}</div>
            <p className="t-koc-notu"><span>koç notu</span>{g.not}</p>
          </div>
        ))}
      </div>
    </>
  )
}

function KocVideosu() {
  const [var_, setVar] = useState(false)
  const [aktif, setAktif] = useState(0)
  const refs = useRef([])
  useEffect(() => {
    const vs = refs.current.filter(Boolean)
    if (vs.length !== VIDEOLAR.length) return
    const ac = () => { setVar(true); vs[0].play?.().catch(() => {}) }
    vs[0].addEventListener('loadeddata', ac)
    const bitisler = vs.map((v, i) => {
      const f = () => {
        const sonraki = (i + 1) % vs.length
        const s = vs[sonraki]
        try { s.currentTime = 0 } catch {}
        s.play?.().catch(() => {})
        setAktif(sonraki)
      }
      v.addEventListener('ended', f)
      return f
    })
    return () => {
      vs[0].removeEventListener('loadeddata', ac)
      vs.forEach((v, i) => v.removeEventListener('ended', bitisler[i]))
    }
  }, [])
  return (
    <>
      {VIDEOLAR.map((v, i) => (
        <video
          key={v.src}
          ref={el => { refs.current[i] = el }}
          src={v.src}
          className={'t-video' + (i === aktif ? '' : ' t-video--bekle')}
          style={{ objectPosition: v.konum }}
          autoPlay={i === 0}
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
        />
      ))}
      {!var_ && (
        <>
          <div className="t-video-zemin" aria-hidden="true" />
          <div className="t-video-not" aria-hidden="true">▶ Koç videosu buraya: public/video/seminer.mp4</div>
        </>
      )}
      <div className="t-perde" aria-hidden="true" />
    </>
  )
}

function Gorev({ t }) {
  if (t.durum === 'bitti') return (
    <div className="t-gorev t-gorev--bitti">
      <span className="t-kutu" />
      <span><span className="t-gorev-ders">{t.ders} <span className="t-gorev-adet">· {t.adet}</span></span><span className="t-gorev-konu">{t.konu}</span></span>
    </div>
  )
  if (t.durum === 'tasindi') return (
    <div className="t-gorev t-gorev--tasindi">
      <span className="t-kutu" />
      <span><span className="t-gorev-ders">{t.ders} <span className="t-gorev-adet">· {t.adet}</span></span><span className="t-gorev-konu">{t.konu} → perşembeye</span></span>
    </div>
  )
  if (t.durum === 'kaldi') return (
    <div className="t-gorev t-gorev--kaldi">
      <span className="t-kutu" />
      <span><span className="t-gorev-ders">{t.ders} <span className="t-gorev-adet">· {t.adet}</span></span><span className="t-gorev-konu">{t.konu}</span></span>
    </div>
  )
  return <div className="t-gorev t-gorev--bos">{t.ders} · {t.konu}</div>
}

function NetGrafigi({ netler }) {
  const G = 640, Y = 260, sol = 40, sag = 24, ust = 28, alt = 40
  const enAz = Math.floor((Math.min(...netler.map((d) => d.net)) - 5) / 5) * 5
  const enCok = Math.ceil((Math.max(...netler.map((d) => d.net)) + 5) / 5) * 5
  const x = (i) => sol + 16 + (i * (G - sol - sag - 32)) / (netler.length - 1)
  const y = (n) => ust + ((enCok - n) * (Y - ust - alt)) / (enCok - enAz)
  const noktalar = netler.map((d, i) => ({ ...d, cx: x(i), cy: y(d.net) }))
  const izgara = []
  for (let v = enAz; v <= enCok; v += 10) izgara.push(v)
  const son = noktalar[noktalar.length - 1]
  return (
    <svg viewBox={`0 0 ${G} ${Y}`} className="t-grafik" role="img" aria-label="Altı aylık TYT net gelişimi">
      {izgara.map((v) => (
        <g key={v}>
          <line x1={sol} x2={G} y1={y(v)} y2={y(v)} className="t-grafik-izgara" />
          <text x="0" y={y(v) + 4} className="t-grafik-yazi">{v}</text>
        </g>
      ))}
      <polyline points={noktalar.map((p) => `${p.cx},${p.cy}`).join(' ')} className="t-grafik-cizgi" />
      {noktalar.map((p) => (
        <g key={p.ay}>
          <circle cx={p.cx} cy={p.cy} r="5" className="t-grafik-nokta" />
          <text x={p.cx} y={p.cy - 14} className="t-grafik-deger" textAnchor="middle">{p.net}</text>
          <text x={p.cx} y="252" className="t-grafik-yazi" textAnchor="middle">{p.ay}</text>
        </g>
      ))}
      <circle cx={son.cx} cy={son.cy} r="7" className="t-grafik-son" />
    </svg>
  )
}

/* Kanal ikonları — tek yerde, hem kartlarda hem başka yerde kullanılabilir. */
const KANAL_IKON = {
  youtube: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23 12s0-3.8-.5-5.6a2.9 2.9 0 0 0-2-2C18.7 4 12 4 12 4s-6.7 0-8.5.4a2.9 2.9 0 0 0-2 2C1 8.2 1 12 1 12s0 3.8.5 5.6a2.9 2.9 0 0 0 2 2C5.3 20 12 20 12 20s6.7 0 8.5-.4a2.9 2.9 0 0 0 2-2C23 15.8 23 12 23 12ZM9.8 15.4V8.6l5.9 3.4-5.9 3.4Z" />
    </svg>
  ),
  instagram: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  ),
  tiktok: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.5 2h-3v13.2a2.9 2.9 0 1 1-2.4-2.9V9.2a6 6 0 1 0 5.4 6V8.9a7 7 0 0 0 4.1 1.3V7.1a4.1 4.1 0 0 1-4.1-4.1V2Z" />
    </svg>
  ),
}

const KANALLAR = [
  { anahtar: 'youtube', ad: 'YouTube', eylem: 'Kanala git' },
  { anahtar: 'instagram', ad: 'Instagram', eylem: 'Takip et' },
  { anahtar: 'tiktok', ad: 'TikTok', eylem: 'Takip et' },
]

/* Adres varsa tıklanabilir kart, yoksa soluk "yakında" kartı. Adresi
   site.js → iletisim bloğuna yazmak yeterli; başka yere dokunmaya gerek yok. */
function Kanallar({ kanallar, iletisim }) {
  const kullanici = (adres) => {
    const son = adres.replace(/\/+$/, '').split('/').pop()
    return son.startsWith('@') ? son : '@' + son
  }

  return (
    <section id="kanallar" className="t-kanal">
      <div className="t-kap">
        <div className="t-kanal-bas">
          <div>
            <p className="t-etiket t-etiket--acik"><i className="t-nokta" />{kanallar.etiket}</p>
            <h2 className="t-baslik">{kanallar.baslik}</h2>
          </div>
          <p className="t-kanal-giris">{kanallar.aciklama}</p>
        </div>

        <div className="t-kanal-izgara">
          {KANALLAR.map(({ anahtar, ad, eylem }) => {
            const adres = iletisim[anahtar]
            const metin = kanallar.metinler[anahtar]
            const ic = (
              <>
                <span className="t-kanal-ust">
                  <span className={`t-kanal-ikon t-kanal-ikon--${anahtar}`}>{KANAL_IKON[anahtar]}</span>
                  <span className="t-kanal-ad">
                    <b>{ad}</b>
                    {adres
                      ? <span>{kullanici(adres)}</span>
                      : <span className="t-kanal-rozet">yakında</span>}
                  </span>
                </span>
                <p className="t-kanal-metin">{metin}</p>
                {adres && <span className="t-kanal-eylem">{eylem} →</span>}
              </>
            )

            return adres ? (
              <a key={anahtar} className="t-kanal-kart" href={adres} target="_blank" rel="noopener noreferrer">{ic}</a>
            ) : (
              <div key={anahtar} className="t-kanal-kart t-kanal-kart--yakinda">{ic}</div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* WhatsApp: numara ve hazır mesaj site.js → iletisim'ten gelir. Numara boşsa
   null döner ve iki düğme de basılmaz. wa.me telefonda uygulamayı,
   masaüstünde WhatsApp Web'i açar. */
function whatsappAdresi({ whatsapp, whatsappMesaj }) {
  let no = (whatsapp || '').replace(/\D/g, '')
  if (!no) return null
  if (no.startsWith('0')) no = '9' + no
  if (no.length === 10) no = '90' + no
  return `https://wa.me/${no}${whatsappMesaj ? `?text=${encodeURIComponent(whatsappMesaj)}` : ''}`
}

function WhatsappIkon({ boyut = 20 }) {
  return (
    <svg width={boyut} height={boyut} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91A9.85 9.85 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.16.04-.31-.02-.43-.06-.13-.56-1.35-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.29Z"/>
    </svg>
  )
}

/* Telefonda ve tablette sayfanın köşesinde durur. Kahraman ekrandayken
   (orada zaten büyük düğme var) ve iletişim bölümüne gelince gizlenir. */
function YuzenWhatsapp({ adres }) {
  const [gorunur, setGorunur] = useState(false)
  useEffect(() => {
    const kahraman = document.querySelector('.t-kahraman')
    const cagri = document.getElementById('iletisim')
    if (!kahraman || !cagri || !('IntersectionObserver' in window)) { setGorunur(true); return }
    const durum = { kahraman: true, cagri: false }
    const gozcu = new IntersectionObserver((girdiler) => {
      for (const g of girdiler) durum[g.target === kahraman ? 'kahraman' : 'cagri'] = g.isIntersecting
      setGorunur(!durum.kahraman && !durum.cagri)
    })
    gozcu.observe(kahraman); gozcu.observe(cagri)
    return () => gozcu.disconnect()
  }, [])
  return (
    <a href={adres} target="_blank" rel="noopener noreferrer"
      className={`t-wa-yuzen${gorunur ? ' t-wa-yuzen--acik' : ''}`}
      aria-label="WhatsApp'tan yazın" tabIndex={gorunur ? 0 : -1} aria-hidden={!gorunur}>
      <WhatsappIkon boyut={22} />
      <span>Yaz</span>
    </a>
  )
}

export default function Tanitim({ onGiris, onRandevu }) {
  const { koc, sayilar, belgeler, kayan, vitrin, sorular, kanallar, iletisim } = site
  const netler = vitrin.maket.netler
  // Form sayfası uygulamanın içinde; tam sayfa yenilemeden aç
  const randevu = (e) => { e.preventDefault(); onRandevu?.() }
  const whatsapp = whatsappAdresi(iletisim)

  const hepsi = gunler.flatMap((g) => g.gorevler).filter((t) => t.durum !== 'bos')
  const say = (d) => hepsi.filter((t) => t.durum === d).length
  const ozet = { toplam: hepsi.length, bitti: say('bitti'), tasindi: say('tasindi'), kaldi: say('kaldi') }
  ozet.oran = Math.round((ozet.bitti / ozet.toplam) * 100)

  let enKotu = netler[1], enKucuk = Infinity
  for (let i = 1; i < netler.length; i++) {
    const a = netler[i].net - netler[i - 1].net
    if (a < enKucuk) { enKucuk = a; enKotu = netler[i] }
  }

  return (
    <div className="tanitim" id="tepe">
      <header className="t-ust">
        <div className="t-kap t-ust-ic">
          <div className="t-marka">
            <span className="t-marka-kilit">
              <MarkaIsareti yukseklik={22} sinif="t-marka-isaret" />
              <span className="t-marka-ad">{koc.ad}</span>
            </span>
            <span className="t-marka-alt">YKS · LGS koçu</span>
          </div>
          <nav className="t-nav">
            <a href="#iletisim" className="t-dugme t-dugme--ana t-dugme--kucuk">Ücretsiz tanışma</a>
            <button type="button" className="t-dugme t-dugme--cizgi t-dugme--kucuk" onClick={onGiris}>Giriş yap</button>
          </nav>
        </div>
      </header>

      <section className="t-kahraman">
        <KocVideosu />
        <div className="t-kap t-kahraman-ic">
          <div className="t-kahraman-metin">
            <h1>Program yazmak kolay. <span className="t-vurgu">Yürütmek</span> iş.</h1>
            <p className="t-kahraman-vaat">Haftalık program, konu takibi ve deneme analizi tek sistemde.</p>
            <p className="t-kahraman-alt">{koc.altVaat}</p>
            <div className="t-kahraman-eylem">
              <a href="/randevu" onClick={randevu} className="t-dugme t-dugme--ana t-dugme--buyuk">Tanışma görüşmesi ayarla</a>
            </div>
            <a href="#hafta" className="t-hafta-onizleme" aria-label="Örnek haftayı oku">
              <span className="t-mini-hafta" aria-hidden="true">
                {gunler.map((g) => (
                  <span key={g.ad}>
                    <b>{g.kisa}</b>
                    {g.gorevler.filter((t) => t.durum !== 'bos').map((t, i) => <u key={i} className={'t-mini-' + t.durum} />)}
                  </span>
                ))}
              </span>
              <span className="t-hafta-onizleme-metin">
                <small>Bir öğrencimin haftası</small>
                <strong>Örnek haftayı oku</strong>
              </span>
            </a>
          </div>
          <div className="t-sayilar">
            {sayilar.map((s) => (
              <div key={s.birim} className="t-sayi">
                <span className="t-sayi-deger">{s.sayi}<span className="t-sayi-arti">+</span></span>
                <span className="t-sayi-birim">{s.birim}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="t-ders-serit">
        <div className="t-kap t-ders-serit-ic">
          <span className="t-ders-serit-baslik">Takip edilen dersler</span>
          {kayan.dersler.map((d) => <span key={d}>{d}</span>)}
        </div>
      </div>

      <section className="t-kap t-hafta-bolum">
        <p className="t-etiket"><i className="t-nokta" />Bir öğrencimin gerçek haftası · {ogrenci.hafta}</p>
        <p className="t-giris-metin">Aşağıda kurgu bir öğrencinin bir haftası var: ne planlandı, ne bitti, ne kaldı ve ben ne yaptım. Reklam metni yerine bunu koydum, çünkü işim tam olarak bu.</p>

        <div id="hafta" className="t-hafta-bas">
          <div className="t-hafta-ogrenci">
            <span className="t-hafta-ad">{ogrenci.ad}</span>
            <span className="t-hafta-sinif">{ogrenci.sinif} · hedef {ogrenci.hedef}</span>
          </div>
          <div className="t-lejant">
            <span><i className="t-lejant-kutu t-lejant-kutu--bitti" />{ozet.bitti} bitti</span>
            <span><i className="t-lejant-kutu t-lejant-kutu--tasindi" />{ozet.tasindi} taşındı</span>
            <span><i className="t-lejant-kutu t-lejant-kutu--kaldi" />{ozet.kaldi} kaldı</span>
          </div>
        </div>

        <Gunler />

        <div className="t-ozet">
          <div><span className="t-ozet-sayi">{ozet.toplam}</span><span className="t-ozet-not">iş planlandı</span></div>
          <div><span className="t-ozet-sayi">{ozet.oran}%</span><span className="t-ozet-not">tamamlandı — okulda sınav haftası olmasına rağmen</span></div>
          <div><span className="t-ozet-sayi t-ozet-sayi--vurgu">+3,25</span><span className="t-ozet-not">net, cumartesi denemesinde</span></div>
          <div><span className="t-ozet-sayi">1</span><span className="t-ozet-not">müdahale — çarşamba gecesi, aşağıda</span></div>
        </div>
      </section>

      <section id="carsamba" className="t-koyu">
        <div className="t-kap t-koyu-ic">
          <div className="t-koyu-metin">
            <p className="t-etiket t-etiket--acik">Çarşamba · 21:40</p>
            <h2 className="t-baslik">Kötü gün olur. Kötü hafta olmasın.</h2>
            <p className="t-alt-metin t-alt-metin--acik">Sistemin yapamadığı şey bu. Bir uygulama "3 görev kaldı" der ve kırmızı yakar. Ben listeyi küçültürüm, çünkü perşembe yapılan iki iş, hiç yapılmayan beş işten iyidir.</p>
            <div className="t-ilkeler">
              {ilkeler.map((i) => (
                <div key={i.baslik} className="t-ilke"><span className="t-ilke-baslik">{i.baslik}</span><span className="t-ilke-metin">{i.metin}</span></div>
              ))}
            </div>
          </div>
          <div className="t-sohbet-yuva">
            <div className="t-sohbet">
              <div className="t-sohbet-bas"><span>{ogrenci.ad} ↔ Koç</span><span>Çar · 16 Eki</span></div>
              {mesajlar.map((m, i) => (
                <div key={i} className={`t-mesaj ${m.kim === 'koc' ? 't-mesaj--koc' : ''}`}>
                  <div className="t-balon">{m.metin}</div>
                  <span className="t-mesaj-saat">{m.saat}{m.kim === 'koc' ? ' · koç' : ''}</span>
                </div>
              ))}
            </div>
            <p className="t-sohbet-not">Kurgu bir yazışma. Gerçek öğrenci mesajları paylaşılmaz.</p>
          </div>
        </div>
      </section>

      <section id="net" className="t-kap t-bolum t-ikili t-ikili--alt">
        <div className="t-ikili-metin">
          <p className="t-etiket">Altı ay</p>
          <h2 className="t-baslik">Haftalar birikir.</h2>
          <p className="t-alt-metin">Yukarıdaki gibi 26 hafta. Netin sıçraması yok; sadece düşmeyen bir çizgi var. Denemede sıçrama arayan aile hayal kırıklığı yaşar, düşmeyen çizgi arayan aile üniversiteye gider.</p>
        </div>
        <div className="t-grafik-yuva">
          <NetGrafigi netler={netler} />
          <div className="t-grafik-alt">
            <span>TYT net · aylık ortalama</span>
            <span className="t-grafik-fark">+{netler[netler.length - 1].net - netler[0].net} net / 6 ay</span>
            <span>en kötü ay: {enKotu.ay} (düşüş yok)</span>
          </div>
        </div>
      </section>

      <section id="veli" className="t-kap t-bolum t-ikili">
        <div className="t-ikili-metin t-ikili-metin--sag">
          <p className="t-etiket">Veli</p>
          <h2 className="t-baslik">Pazar akşamı size gelen özet.</h2>
          <p className="t-alt-metin">Yandaki kart velinin gördüğü her şey. Günlük liste yok, mesajlar yok. "Bugün ne yaptın?" sorusunu sormanız gerekmesin diye var; sorunuz olursa muhatabınız benim, çocuğunuz değil.</p>
        </div>
        <div className="t-veli-kart">
          <div className="t-veli-bas"><span>Haftalık özet</span><span>{ogrenci.hafta}</span></div>
          <div className="t-veli-izgara">
            <div><span className="t-veli-sayi">{ozet.bitti}/{ozet.toplam}</span><span>iş tamamlandı</span></div>
            <div><span className="t-veli-sayi">84,5</span><span>TYT net (önceki 81,25)</span></div>
            <div><span className="t-veli-sayi">6/7</span><span>gün çalışıldı</span></div>
            <div><span className="t-veli-sayi">1</span><span>plan değişikliği</span></div>
          </div>
          <div className="t-veli-notu"><b>Koçun veliye notu</b>Sınav haftasında bir gün düştü, planı hafiflettim; cumartesi netine yansımadı. Gelecek hafta manyetizma ağırlıklı. Elif'e "aferin" deyin, "daha çok çalış" demeyin — çalıştı.</div>
          <p className="t-veli-dip">Bu özet gerçek panelde her pazar 20:00'de yayınlanır.</p>
        </div>
      </section>

      <section id="baslangic" className="t-kap t-bolum">
        <div className="t-bolum-bas">
          <div>
            <p className="t-etiket">Başlangıç</p>
            <h2 className="t-baslik">İlk hafta program yok.</h2>
          </div>
          <p className="t-bolum-bas-not">Tanımadığım öğrenciye program yazmam. Önce ne kadar çalışabildiğini görürüm, sonra ona göre yazarım.</p>
        </div>
        <ol className="t-adimlar">
          {baslangic.map((b, i) => (
            <li key={b.baslik} className="t-adim">
              <div className="t-adim-bas"><span className="t-adim-no">{String(i + 1).padStart(2, '0')}</span><span className="t-adim-sure">{b.sure}</span></div>
              <h3>{b.baslik}</h3>
              <p>{b.metin}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="kim" className="t-kap t-bolum t-kim">
        <img src={koc.portre} alt={koc.ad} className="t-portre" />
        <div className="t-kim-metin">
          <p className="t-etiket">Koç</p>
          <div className="t-biyografi">{koc.biyografi.map((p, i) => <p key={i}>{p}</p>)}</div>
          <div className="t-kim-dip">
            {sayilar.map((s) => <span key={s.birim}><b>{s.sayi}</b> {s.birim}</span>)}
            <a href="#belgeler">Belgeler →</a>
          </div>
        </div>
      </section>

      <BelgeSeridi belgeler={belgeler} />

      <section id="sorular" className="t-kap t-bolum">
        <h2 className="t-baslik t-baslik--kucuk">{sorular.baslik}</h2>
        <div className="t-sorular">
          {sorular.liste.map((q) => (
            <div key={q.soru} className="t-soru"><h3>{q.soru}</h3><p>{q.cevap}</p></div>
          ))}
        </div>
      </section>

      <Kanallar kanallar={kanallar} iletisim={iletisim} />

      <section id="iletisim" className="t-kap t-cagri">
        <div className="t-cagri-metin">
          <h2>Sizin haftanız nasıl geçiyor?</h2>
          <p>30 dakikalık tanışma görüşmesinde bunu konuşuruz. Ücretsiz; sonunda "size uygun değilim" de diyebilirim.</p>
        </div>
        <div className="t-cagri-eylem">
          {whatsapp && (
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="t-dugme t-dugme--wa">
              <WhatsappIkon /> WhatsApp'tan yazın
            </a>
          )}
          <a href="/randevu" onClick={randevu} className={`t-dugme ${whatsapp ? 't-dugme--acik-cizgi' : 't-dugme--ana'}`}>Tanışma görüşmesi iste</a>
        </div>
      </section>

      {whatsapp && <YuzenWhatsapp adres={whatsapp} />}

      <footer className="t-kap t-alt">
        <span>© {new Date().getFullYear()} {koc.ad}</span>
        <span className="t-alt-sosyal">
          {[['YouTube', iletisim.youtube], ['Instagram', iletisim.instagram], ['TikTok', iletisim.tiktok]]
            .filter(([, adres]) => adres)
            .map(([ad, adres]) => (
              <a key={ad} href={adres} target="_blank" rel="noopener noreferrer">{ad}</a>
            ))}
        </span>
        <span>Bu sayfadaki öğrenci ve yazışma kurgudur.</span>
      </footer>
    </div>
  )
}
