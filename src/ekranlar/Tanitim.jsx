import { useEffect, useRef, useState } from 'react'
import { site } from '../icerik/site.js'
import '../tanitim.css'

/* ═══════════════════════════════════════════════════════════════
   Yardımcılar
   ═══════════════════════════════════════════════════════════════ */

/** Az hareket tercihi açık mı? Tüm animasyonlar buna saygı duyar. */
function azHareketMi() {
  return typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Öğe ekrana girdiğinde bir kez true olur. */
function useGorunur(esik = 0.15) {
  const ref = useRef(null)
  const [gorundu, setGorundu] = useState(false)

  useEffect(() => {
    if (azHareketMi()) { setGorundu(true); return }
    const g = new IntersectionObserver(
      ([giris]) => { if (giris.isIntersecting) { setGorundu(true); g.disconnect() } },
      { threshold: esik, rootMargin: '0px 0px -8% 0px' },
    )
    if (ref.current) g.observe(ref.current)
    return () => g.disconnect()
  }, [esik])

  return [ref, gorundu]
}

/** Kaydırınca aşağıdan beliren sarmalayıcı. */
function Belir({ children, gecikme = 0, className = '', ...kalan }) {
  const [ref, gorundu] = useGorunur()
  return (
    <div
      ref={ref}
      className={`t-belir ${gorundu ? 't-belir--acik' : ''} ${className}`}
      style={{ transitionDelay: `${gecikme}ms` }}
      {...kalan}
    >
      {children}
    </div>
  )
}

/** "3.450" gibi bir sayıyı görünür olunca sayarak yazar. */
function SayanSayi({ metin }) {
  const [ref, gorundu] = useGorunur(0.4)
  const [deger, setDeger] = useState(metin)

  useEffect(() => {
    if (!gorundu) return
    const hedef = Number(metin.replace(/\./g, '').replace(',', '.'))
    if (!Number.isFinite(hedef) || azHareketMi()) { setDeger(metin); return }

    const sure = 1100
    const bas = performance.now()
    let kare

    const adim = (simdi) => {
      const o = Math.min(1, (simdi - bas) / sure)
      const yumusak = 1 - Math.pow(1 - o, 3)
      setDeger(Math.round(hedef * yumusak).toLocaleString('tr-TR'))
      if (o < 1) kare = requestAnimationFrame(adim)
      else setDeger(metin)
    }
    kare = requestAnimationFrame(adim)
    return () => cancelAnimationFrame(kare)
  }, [gorundu, metin])

  return <span ref={ref}>{deger}</span>
}

/** {kelime} işaretli kısmı fosforlu vurguya çevirir. */
function Vurgulu({ metin }) {
  return metin.split(/(\{[^}]+\})/g).map((p, i) =>
    p.startsWith('{')
      ? <span key={i} className="t-vurgu">{p.slice(1, -1)}</span>
      : <span key={i}>{p}</span>,
  )
}

/* ═══════════════════════════════════════════════════════════════
   Telefon maketi ve içindeki ekranlar
   ═══════════════════════════════════════════════════════════════ */

function Telefon({ baslik, tarih, egik = false, children }) {
  return (
    <div className={`t-telefon ${egik ? 't-telefon--egik' : ''}`} aria-hidden="true">
      <div className="t-telefon-ekran">
        <div className="t-telefon-cizgi" />
        <div className="t-ekran-basi">
          <h3>{baslik}</h3>
          <span className="t-ekran-tarih">{tarih}</span>
        </div>
        {children}
      </div>
    </div>
  )
}

function EkranGorev({ gorevler }) {
  const bitti = gorevler.filter((g) => g.bitti).length
  return (
    <>
      <ul className="t-gorevler">
        {gorevler.map((g, i) => (
          <li
            key={g.ad}
            className={`t-gorev ${g.bitti ? 't-gorev--bitti' : ''}`}
            style={{ animationDelay: `${i * 90}ms` }}
          >
            <span className="t-kutu" />
            <span className="t-gorev-ad">{g.ad}</span>
            <span className="t-gorev-adet">{g.adet}</span>
          </li>
        ))}
      </ul>
      <div className="t-ekran-alt">
        <span>Bugünün planı</span>
        <span><b>{bitti}/{gorevler.length}</b> tamam</span>
      </div>
    </>
  )
}

function EkranIlerleme({ ilerlemeler }) {
  return (
    <>
      <ul className="t-ilerlemeler">
        {ilerlemeler.map((d, i) => (
          <li key={d.ad}>
            <div className="t-ilerleme-ust">
              <span>{d.ad}</span>
              <em>{d.not}</em>
            </div>
            <div className="t-ray">
              <i style={{ '--oran': `${d.oran}%`, animationDelay: `${i * 120}ms` }} />
            </div>
          </li>
        ))}
      </ul>
      <div className="t-ekran-alt">
        <span>Bitirilen konu</span>
        <span><b>83</b> / 130</span>
      </div>
    </>
  )
}

function EkranNet({ netler }) {
  const G = 280, Y = 150
  const bos = { sol: 22, sag: 16, ust: 18, alt: 26 }
  const enAz = Math.min(...netler.map((d) => d.net)) - 8
  const enCok = Math.max(...netler.map((d) => d.net)) + 6

  const x = (i) => bos.sol + (i * (G - bos.sol - bos.sag)) / (netler.length - 1)
  const y = (n) => bos.ust + ((enCok - n) * (Y - bos.ust - bos.alt)) / (enCok - enAz)

  const yol = netler.map((d, i) => `${x(i)},${y(d.net)}`).join(' ')
  const alan = `${bos.sol},${Y - bos.alt} ${yol} ${x(netler.length - 1)},${Y - bos.alt}`
  const son = netler[netler.length - 1]

  return (
    <>
      <div className="t-mini-grafik">
        <svg viewBox={`0 0 ${G} ${Y}`}>
          <defs>
            <linearGradient id="tGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5b8cff" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#5b8cff" stopOpacity="0" />
            </linearGradient>
          </defs>

          {[0, 0.5, 1].map((o) => {
            const cy = bos.ust + o * (Y - bos.ust - bos.alt)
            return (
              <g key={o}>
                <line x1={bos.sol} y1={cy} x2={G - bos.sag} y2={cy} className="t-mg-eksen" />
                <text x={0} y={cy + 3} className="t-mg-yazi">
                  {Math.round(enAz + (enCok - enAz) * (1 - o))}
                </text>
              </g>
            )
          })}

          <polygon points={alan} className="t-mg-alan" />
          <polyline points={yol} className="t-mg-cizgi" />

          {netler.map((d, i) => (
            <g key={d.ay}>
              <circle
                cx={x(i)} cy={y(d.net)} r={i === netler.length - 1 ? 4 : 2.75}
                className={`t-mg-nokta ${i === netler.length - 1 ? 't-mg-nokta--son' : ''}`}
              />
              <text x={x(i)} y={Y - 8} className="t-mg-yazi" textAnchor="middle">{d.ay}</text>
            </g>
          ))}

          <text x={x(netler.length - 1)} y={y(son.net) - 11} className="t-mg-deger">{son.net}</text>
        </svg>
      </div>
      <div className="t-ekran-alt">
        <span>Nisan → Eylül</span>
        <span><b>+{son.net - netler[0].net}</b> net</span>
      </div>
    </>
  )
}

function EkranVeli({ veli }) {
  return (
    <>
      <div className="t-ozet-kart">
        {veli.satirlar.map((s) => (
          <div key={s.ad} className="t-ozet-satir">
            <span>{s.ad}</span>
            <b>{s.deger}</b>
          </div>
        ))}
      </div>
      <p className="t-ozet-not">{veli.not}</p>
      <div className="t-ekran-alt">
        <span>Veli erişimi</span>
        <span><b>Sadece görüntüleme</b></span>
      </div>
    </>
  )
}

/** Sekme anahtarına göre doğru ekranı basar. */
function Ekran({ anahtar, maket }) {
  if (anahtar === 'ilerleme') return <EkranIlerleme ilerlemeler={maket.ilerlemeler} />
  if (anahtar === 'net') return <EkranNet netler={maket.netler} />
  if (anahtar === 'veli') return <EkranVeli veli={maket.veli} />
  return <EkranGorev gorevler={maket.gorevler} />
}

/* ═══════════════════════════════════════════════════════════════
   Bölümler
   ═══════════════════════════════════════════════════════════════ */

function Ustluk({ ad, onGiris }) {
  const [yapisik, setYapisik] = useState(false)
  const [acik, setAcik] = useState(false)

  useEffect(() => {
    const bak = () => setYapisik(window.scrollY > 12)
    bak()
    window.addEventListener('scroll', bak, { passive: true })
    return () => window.removeEventListener('scroll', bak)
  }, [])

  const basHarf = ad.split(' ').map((k) => k[0]).join('').slice(0, 2)
  const baglar = [
    ['#sistem', 'Sistem'],
    ['#nasil', 'Süreç'],
    ['#videolar', 'Videolar'],
    ['#seminerler', 'Seminerler'],
    ['#belgeler', 'Belgeler'],
    ['#sorular', 'Sorular'],
  ]

  return (
    <header className={`t-ust ${yapisik ? 't-ust--yapisik' : ''}`}>
      <div className="t-kap">
        <div className="t-ust-ic">
          <a className="t-marka" href="#tepe">
            <span className="t-marka-im" aria-hidden="true">{basHarf}</span>
            <span>
              <span className="t-marka-ad">{ad}</span>
              <span className="t-marka-alt">YKS ve LGS koçluğu</span>
            </span>
          </a>

          <nav className="t-nav">
            {baglar.map(([adres, metin]) => <a key={adres} href={adres}>{metin}</a>)}
            <button className="t-dugme t-dugme--cizgi t-dugme--kucuk" onClick={onGiris}>Giriş yap</button>
            <a className="t-dugme t-dugme--ana t-dugme--kucuk" href="#iletisim">Ücretsiz tanışma</a>
          </nav>

          <button
            className="t-menu-dugme"
            aria-expanded={acik}
            aria-label={acik ? 'Menüyü kapat' : 'Menüyü aç'}
            onClick={() => setAcik((a) => !a)}
          >
            <span /><span /><span />
          </button>
        </div>

        {acik && (
          <nav className="t-cep-menu">
            {baglar.map(([adres, metin]) => (
              <a key={adres} href={adres} onClick={() => setAcik(false)}>{metin}</a>
            ))}
            <a href="#iletisim" onClick={() => setAcik(false)}>İletişim</a>
            <button onClick={() => { setAcik(false); onGiris() }}>Giriş yap</button>
          </nav>
        )}
      </div>
    </header>
  )
}

function VideoKart({ video }) {
  return (
    <article className="t-video">
      <div className="t-video-cerceve">
        {video.youtube ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.youtube}`}
            title={video.baslik}
            loading="lazy"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="t-video-bos">
            <span className="t-oynat" aria-hidden="true" />
            <span>Video henüz eklenmedi</span>
          </div>
        )}
        <span className="t-sure">{video.sure}</span>
      </div>
      <div className="t-video-govde">
        <span className="t-video-tur">{video.tur}</span>
        <h3>{video.baslik}</h3>
        <p>{video.ozet}</p>
        <div className="t-video-ayak">{video.tarih}</div>
      </div>
    </article>
  )
}

function SeminerKart({ seminer }) {
  return (
    <article className="t-seminer">
      <div className="t-seminer-gorsel">
        {seminer.gorsel
          ? <img src={seminer.gorsel} alt={seminer.baslik} loading="lazy" />
          : <span className="t-seminer-bos">Görsel henüz eklenmedi</span>}
      </div>
      <div className="t-seminer-govde">
        <h3>{seminer.baslik}</h3>
        <p className="t-seminer-yer">{seminer.yer}</p>
        <div className="t-seminer-bilgi">
          {seminer.etiketler.map((e) => <span className="t-cip" key={e}>{e}</span>)}
        </div>
      </div>
    </article>
  )
}

function YorumDongusu({ liste }) {
  const [i, setI] = useState(0)
  const [durdu, setDurdu] = useState(false)

  useEffect(() => {
    if (durdu || liste.length < 2 || azHareketMi()) return
    const z = setInterval(() => setI((v) => (v + 1) % liste.length), 6500)
    return () => clearInterval(z)
  }, [durdu, liste.length])

  const y = liste[i]
  const basHarf = y.kisi.replace(/[^A-ZÇĞİÖŞÜ]/g, '').slice(0, 2)

  return (
    <div
      className="t-dongu"
      onMouseEnter={() => setDurdu(true)}
      onMouseLeave={() => setDurdu(false)}
    >
      <blockquote key={i} className="t-dongu-yorum">
        <p>{y.metin}</p>
        <footer>
          <span className="t-yorum-im" aria-hidden="true">{basHarf}</span>
          <span>
            <span className="t-yorum-kisi">{y.kisi}</span>
            <span className="t-yorum-rol">{y.rol}</span>
          </span>
        </footer>
      </blockquote>

      <div className="t-dongu-kontrol">
        <button
          className="t-ok" aria-label="Önceki yorum"
          onClick={() => setI((v) => (v - 1 + liste.length) % liste.length)}
        >←</button>
        <div className="t-benekler">
          {liste.map((_, n) => (
            <button
              key={n}
              className={`t-benek ${n === i ? 't-benek--etkin' : ''}`}
              aria-label={`Yorum ${n + 1}`}
              onClick={() => setI(n)}
            />
          ))}
        </div>
        <button
          className="t-ok" aria-label="Sonraki yorum"
          onClick={() => setI((v) => (v + 1) % liste.length)}
        >→</button>
      </div>
    </div>
  )
}

function Soru({ soru, cevap }) {
  const [acik, setAcik] = useState(false)
  return (
    <div className={`t-sss ${acik ? 't-sss--acik' : ''}`}>
      <button className="t-sss-soru" aria-expanded={acik} onClick={() => setAcik((a) => !a)}>
        {soru}
        <span className="t-sss-isaret" aria-hidden="true" />
      </button>
      {acik && <p className="t-sss-cevap">{cevap}</p>}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Sayfa
   ═══════════════════════════════════════════════════════════════ */

export default function Tanitim({ onGiris }) {
  const {
    koc, sayilar, kayan, vitrin, yaklasim, videolar, seminerler,
    belgeler, nasil, kimler, yorumlar, sorular, cagri, iletisim,
  } = site
  const [sekme, setSekme] = useState(vitrin.sekmeler[0].anahtar)

  const etkin = vitrin.sekmeler.find((s) => s.anahtar === sekme) ?? vitrin.sekmeler[0]
  const basHarf = koc.ad.split(' ').map((k) => k[0]).join('').slice(0, 2)

  const bagAdres = [
    iletisim.eposta && { ad: 'E-posta', adres: `mailto:${iletisim.eposta}`, metin: iletisim.eposta },
    iletisim.telefon && { ad: 'Telefon', adres: `tel:${iletisim.telefon.replace(/\s/g, '')}`, metin: iletisim.telefon },
    iletisim.whatsapp && { ad: 'WhatsApp', adres: `https://wa.me/${iletisim.whatsapp}`, metin: 'Mesaj gönder' },
    iletisim.instagram && { ad: 'Instagram', adres: `https://instagram.com/${iletisim.instagram}`, metin: `@${iletisim.instagram}` },
  ].filter(Boolean)

  return (
    <div className="tanitim" id="tepe">
      <Ustluk ad={koc.ad} onGiris={onGiris} />

      {/* ---------- Kahraman ---------- */}
      <section className="t-kahraman">
        <div className="t-kap t-kahraman-ic">
          <div>
            <p className="t-etiket">{koc.unvan}</p>
            <h1><Vurgulu metin={koc.vaat} /></h1>
            <p className="t-kahraman-alt">{koc.altVaat}</p>

            <div className="t-kahraman-eylem">
              <a className="t-dugme t-dugme--ana" href="#iletisim">{cagri.dugme}</a>
              <button className="t-dugme t-dugme--cizgi" onClick={onGiris}>Zaten öğrencisiyim</button>
            </div>

            <div className="t-kahraman-guven">
              <span><i className="t-nokta" aria-hidden="true" />Tanışma görüşmesi ücretsiz</span>
              <span><i className="t-nokta" aria-hidden="true" />Veli için ayrı hesap</span>
            </div>
          </div>

          <div className="t-telefon-yuva">
            <div className="t-yuzen t-yuzen--1" aria-hidden="true">🔥 <b>14 gün</b>&nbsp;çalışma serisi</div>
            <div className="t-yuzen t-yuzen--2" aria-hidden="true">📈 <b>+23 net</b>&nbsp;Nisan → Eylül</div>
            <div className="t-yuzen t-yuzen--3" aria-hidden="true">✓ Fizik · <b>25 soru</b></div>
            <Telefon egik baslik="Bugün" tarih="Pzt · 14 Ekim">
              <EkranGorev gorevler={vitrin.maket.gorevler} />
            </Telefon>
          </div>
        </div>
      </section>

      {/* ---------- Sayılar ---------- */}
      <section className="t-bant t-bant--sayilar">
        <div className="t-kap">
          <Belir>
            <div className="t-serit">
              {sayilar.map((s) => (
                <div key={s.not} className="t-serit-oge">
                  {s.emoji && <span className="t-serit-em" aria-hidden="true">{s.emoji}</span>}
                  <div className="t-serit-sayi">
                    <SayanSayi metin={s.sayi} />
                    <span className="t-serit-birim">{s.birim}</span>
                  </div>
                  <span className="t-serit-not">{s.not}</span>
                </div>
              ))}
            </div>
          </Belir>
        </div>
      </section>

      {/* ---------- Kayan ders şeridi ---------- */}
      <section className="t-bant t-bant--dar t-bant--gri">
        <p className="t-kayan-baslik">{kayan.baslik}</p>
        <div className="t-ray-dis">
          <div className="t-ray-ic">
            {[0, 1].map((kopya) => (
              <div className="t-ray-grup" key={kopya} aria-hidden={kopya === 1}>
                {kayan.dersler.map((d) => <span className="t-rozet" key={d}>{d}</span>)}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Vitrin (koyu bant) ---------- */}
      <section className="t-bant t-bant--koyu" id="sistem">
        <div className="t-kap">
          <Belir>
            <div className="t-vitrin-ic">
              <div>
                <p className="t-etiket">Platform</p>
                <h2 className="t-baslik">{vitrin.baslik}</h2>
                <p className="t-alt-metin">{vitrin.aciklama}</p>

                <div className="t-sekmeler" role="tablist" aria-label="Ekranlar">
                  {vitrin.sekmeler.map((s) => (
                    <button
                      key={s.anahtar}
                      role="tab"
                      aria-selected={s.anahtar === sekme}
                      className={`t-sekme ${s.anahtar === sekme ? 't-sekme--etkin' : ''}`}
                      onClick={() => setSekme(s.anahtar)}
                    >
                      <span className="t-sekme-im" aria-hidden="true">{s.emoji}</span>
                      <span>
                        <span className="t-sekme-ad">{s.ad}</span>
                        <span className="t-sekme-not">{s.not}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="t-telefon-yuva">
                <Telefon key={etkin.anahtar} baslik={etkin.ekran.baslik} tarih={etkin.ekran.tarih}>
                  <Ekran anahtar={etkin.anahtar} maket={vitrin.maket} />
                </Telefon>
              </div>
            </div>
          </Belir>
        </div>
      </section>

      {/* ---------- Yaklaşım ---------- */}
      <section className="t-bant">
        <div className="t-kap">
          <Belir>
            <p className="t-etiket">Yaklaşım</p>
            <h2 className="t-baslik">{yaklasim.baslik}</h2>
            <p className="t-alt-metin">{yaklasim.aciklama}</p>
            <div className="t-ilkeler">
              {yaklasim.ilkeler.map((ilke, n) => (
                <Belir key={ilke.baslik} gecikme={n * 80} className="t-hucre">
                  <article className="t-ilke">
                    <div className="t-ilke-im" aria-hidden="true">{ilke.emoji}</div>
                    <h3>{ilke.baslik}</h3>
                    <p>{ilke.metin}</p>
                  </article>
                </Belir>
              ))}
            </div>
          </Belir>
        </div>
      </section>

      {/* ---------- Nasıl çalışıyoruz ---------- */}
      <section className="t-bant t-bant--gri" id="nasil">
        <div className="t-kap">
          <Belir>
            <p className="t-etiket">Süreç</p>
            <h2 className="t-baslik">{nasil.baslik}</h2>
            <p className="t-alt-metin">{nasil.aciklama}</p>
            <ol className="t-yol">
              {nasil.adimlar.map((a, i) => (
                <li key={a.baslik} className="t-durak">
                  <span className="t-durak-no" aria-hidden="true">{i + 1}</span>
                  <h3>{a.baslik}</h3>
                  <p>{a.metin}</p>
                  {i === 0 && <span className="t-cip">ÜCRETSİZ</span>}
                </li>
              ))}
            </ol>
          </Belir>
        </div>
      </section>

      {/* ---------- Videolar ---------- */}
      <section className="t-bant" id="videolar">
        <div className="t-kap">
          <Belir>
            <div className="t-video-baslik">
              <div>
                <p className="t-etiket">Videolar</p>
                <h2 className="t-baslik">{videolar.baslik}</h2>
                <p className="t-alt-metin">{videolar.aciklama}</p>
              </div>
              {videolar.kanal && (
                <a className="t-dugme t-dugme--cizgi" href={videolar.kanal} target="_blank" rel="noreferrer">
                  Kanala git
                </a>
              )}
            </div>
            <div className="t-videolar">
              {videolar.liste.map((v, n) => (
                <Belir key={v.baslik} gecikme={(n % 3) * 90} className="t-hucre t-video-hucre">
                  <VideoKart video={v} />
                </Belir>
              ))}
            </div>
          </Belir>
        </div>
      </section>

      {/* ---------- Seminerler ---------- */}
      <section className="t-bant t-bant--gri" id="seminerler">
        <div className="t-kap">
          <Belir>
            <p className="t-etiket">Sahne</p>
            <h2 className="t-baslik">{seminerler.baslik}</h2>
            <p className="t-alt-metin">{seminerler.aciklama}</p>
            <div className="t-galeri">
              {seminerler.liste.map((sm, n) => (
                <Belir key={sm.baslik} gecikme={(n % 3) * 90} className="t-hucre">
                  <SeminerKart seminer={sm} />
                </Belir>
              ))}
            </div>
          </Belir>
        </div>
      </section>

      {/* ---------- Kim ---------- */}
      <section className="t-bant" id="kim">
        <div className="t-kap">
          <Belir>
            <div className="t-kim">
              <div className="t-portre">
                {koc.portre ? <img src={koc.portre} alt={koc.ad} /> : <span>{basHarf}</span>}
              </div>
              <div className="t-kim-metin">
                <p className="t-etiket">Koç</p>
                <h2 className="t-baslik">Kimim</h2>
                {koc.biyografi.map((p, i) => <p key={i}>{p}</p>)}
              </div>
            </div>
          </Belir>
        </div>
      </section>

      {/* ---------- Belgeler ---------- */}
      <section className="t-bant t-bant--sicak" id="belgeler">
        <div className="t-kap">
          <Belir>
            <p className="t-etiket">Belgeler</p>
            <h2 className="t-baslik">{belgeler.baslik}</h2>
            <p className="t-alt-metin">{belgeler.aciklama}</p>
            <div className="t-belge-serit">
              <ul className="t-belge-raf">
                {belgeler.liste.map((b) => (
                  <li key={b.ad} className="t-belge">
                    <div className="t-belge-gorsel">
                      {b.gorsel
                        ? <img src={b.gorsel} alt={b.ad} loading="lazy" />
                        : <span className="t-belge-bos">Görsel eklenmedi</span>}
                    </div>
                    <h3>{b.ad}</h3>
                    <p className="t-belge-kurum">{b.kurum}</p>
                    <p className="t-belge-yil">{b.yil}</p>
                  </li>
                ))}
              </ul>
            </div>
            <p className="t-kaydir-ipucu">← yana kaydırın →</p>
          </Belir>
        </div>
      </section>

      {/* ---------- Kimler için ---------- */}
      <section className="t-bant">
        <div className="t-kap">
          <Belir>
            <p className="t-etiket">Kapsam</p>
            <h2 className="t-baslik">{kimler.baslik}</h2>
            <div className="t-gruplar">
              {kimler.gruplar.map((g) => (
                <div key={g.ad} className="t-grup">
                  {g.emoji && <span className="t-grup-em" aria-hidden="true">{g.emoji}</span>}
                  <span className="t-grup-ad">{g.ad}</span>
                  <span className="t-grup-alt">{g.aciklama}</span>
                </div>
              ))}
            </div>
          </Belir>
        </div>
      </section>

      {/* ---------- Yorumlar ---------- */}
      {yorumlar.liste.length > 0 && (
        <section className="t-bant t-bant--gri">
          <div className="t-kap">
            <Belir>
              <p className="t-etiket">Geri bildirim</p>
              <h2 className="t-baslik">{yorumlar.baslik}</h2>
              <YorumDongusu liste={yorumlar.liste} />
            </Belir>
          </div>
        </section>
      )}

      {/* ---------- Sık sorulanlar ---------- */}
      <section className="t-bant" id="sorular">
        <div className="t-kap">
          <Belir>
            <p className="t-etiket">Sorular</p>
            <h2 className="t-baslik">{sorular.baslik}</h2>
            <div className="t-sss-liste">
              {sorular.liste.map((s) => <Soru key={s.soru} {...s} />)}
            </div>
          </Belir>
        </div>
      </section>

      {/* ---------- Kapanış ---------- */}
      <section className="t-bant t-bant--sicak t-cagri" id="iletisim">
        <div className="t-kap">
          <Belir>
            <div className="t-cagri-ic">
              <div>
                <p className="t-etiket">İletişim</p>
                <h2>{cagri.baslik}</h2>
                <p className="t-cagri-metin">{cagri.metin}</p>
                <div className="t-cagri-eylem">
                  {iletisim.whatsapp && (
                    <a className="t-dugme t-dugme--ana" href={`https://wa.me/${iletisim.whatsapp}`} target="_blank" rel="noreferrer">
                      WhatsApp’tan yaz
                    </a>
                  )}
                  {iletisim.eposta && (
                    <a
                      className={`t-dugme ${iletisim.whatsapp ? 't-dugme--cizgi' : 't-dugme--ana'}`}
                      href={`mailto:${iletisim.eposta}`}
                    >
                      E-posta gönder
                    </a>
                  )}
                </div>
              </div>

              {bagAdres.length > 0 && (
                <ul className="t-iletisim">
                  {bagAdres.map((b) => (
                    <li key={b.ad}>
                      <span className="t-iletisim-ad">{b.ad}</span>
                      <a href={b.adres} target={b.adres.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
                        {b.metin}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Belir>
        </div>
      </section>

      <footer className="t-alt">
        <div className="t-kap">
          <div className="t-alt-ic">
            <div>
              <span className="t-alt-marka">{koc.ad}</span>
              <p className="t-alt-not">
                YKS ve LGS koçluğu. Haftalık program, konu takibi ve deneme analizi tek sistemde.
              </p>
            </div>
            <div className="t-alt-bag">
              <a href="#sistem">Sistem</a>
              <a href="#nasil">Süreç</a>
              <a href="#videolar">Videolar</a>
              <a href="#seminerler">Seminerler</a>
              <a href="#belgeler">Belgeler</a>
              <a href="#sorular">Sorular</a>
              <a href="#iletisim">İletişim</a>
              <button onClick={onGiris}>Giriş yap</button>
            </div>
          </div>
          <div className="t-alt-cizgi">© {new Date().getFullYear()} {koc.ad}</div>
        </div>
      </footer>
    </div>
  )
}
