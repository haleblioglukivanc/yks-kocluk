import { useEffect, useRef, useState } from 'react'
import { site } from '../icerik/site.js'

/** {kelime} işaretli kısmı fosforlu vurguya çevirir. */
function Vurgulu({ metin }) {
  const parcalar = metin.split(/(\{[^}]+\})/g)
  return parcalar.map((p, i) =>
    p.startsWith('{') ? (
      <mark key={i} className="fosfor">
        {p.slice(1, -1)}
      </mark>
    ) : (
      <span key={i}>{p}</span>
    ),
  )
}

/** Net gelişim çizgisi. Sayfa açılırken kâğıdın üstüne çiziliyor. */
function NetCizgisi({ veri }) {
  const [ciz, setCiz] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const azHareket = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (azHareket) {
      setCiz(true)
      return
    }
    const g = new IntersectionObserver(
      ([giris]) => giris.isIntersecting && setCiz(true),
      { threshold: 0.3 },
    )
    if (ref.current) g.observe(ref.current)
    return () => g.disconnect()
  }, [])

  const G = 640
  const Y = 200
  const bosluk = { sol: 34, sag: 14, ust: 16, alt: 28 }
  const enAz = Math.min(...veri.map((d) => d.net)) - 8
  const enCok = Math.max(...veri.map((d) => d.net)) + 6

  const x = (i) => bosluk.sol + (i * (G - bosluk.sol - bosluk.sag)) / (veri.length - 1)
  const y = (n) =>
    bosluk.ust + ((enCok - n) * (Y - bosluk.ust - bosluk.alt)) / (enCok - enAz)

  const noktalar = veri.map((d, i) => `${x(i)},${y(d.net)}`).join(' ')
  const son = veri[veri.length - 1]

  return (
    <figure className="net" ref={ref}>
      <svg viewBox={`0 0 ${G} ${Y}`} role="img" aria-label="Aylık deneme netlerinin gelişimi">
        {[0, 0.5, 1].map((o) => {
          const deger = Math.round(enAz + (enCok - enAz) * (1 - o))
          const cy = bosluk.ust + o * (Y - bosluk.ust - bosluk.alt)
          return (
            <g key={o}>
              <line x1={bosluk.sol} y1={cy} x2={G - bosluk.sag} y2={cy} className="net-eksen" />
              <text x={0} y={cy + 3.5} className="net-eksen-yazi">{deger}</text>
            </g>
          )
        })}

        <polyline points={noktalar} className={`net-cizgi${ciz ? ' net-cizgi--ciz' : ''}`} />

        {veri.map((d, i) => (
          <circle
            key={d.ay}
            cx={x(i)}
            cy={y(d.net)}
            r={i === veri.length - 1 ? 4.5 : 2.5}
            className={i === veri.length - 1 ? 'net-nokta net-nokta--son' : 'net-nokta'}
            style={{ animationDelay: ciz ? `${400 + i * 90}ms` : undefined }}
          />
        ))}

        {veri.map((d, i) => (
          <text key={d.ay} x={x(i)} y={Y - 8} className="net-ay">{d.ay}</text>
        ))}

        <text x={x(veri.length - 1)} y={y(son.net) - 12} className="net-son-deger">
          {son.net}
        </text>
      </svg>
    </figure>
  )
}

function Soru({ soru, cevap }) {
  const [acik, setAcik] = useState(false)
  return (
    <div className={`sss${acik ? ' sss--acik' : ''}`}>
      <button className="sss-soru" onClick={() => setAcik((v) => !v)} aria-expanded={acik}>
        <span>{soru}</span>
        <span className="sss-isaret" aria-hidden="true" />
      </button>
      {acik && <p className="sss-cevap">{cevap}</p>}
    </div>
  )
}

export default function Tanitim({ onGiris }) {
  const { koc, belgeler, sayilar, netGrafigi, nasil, platform, kimler, yorumlar, sorular, cagri, iletisim } = site

  const bagAdres = [
    iletisim.eposta && { ad: 'E-posta', adres: `mailto:${iletisim.eposta}`, metin: iletisim.eposta },
    iletisim.telefon && { ad: 'Telefon', adres: `tel:${iletisim.telefon.replace(/\s/g, '')}`, metin: iletisim.telefon },
    iletisim.whatsapp && { ad: 'WhatsApp', adres: `https://wa.me/${iletisim.whatsapp}`, metin: 'Mesaj gönder' },
    iletisim.instagram && { ad: 'Instagram', adres: `https://instagram.com/${iletisim.instagram}`, metin: `@${iletisim.instagram}` },
  ].filter(Boolean)

  const basHarf = koc.ad.split(' ').map((k) => k[0]).join('').slice(0, 2)

  return (
    <div className="sayfa-kagit">
      <div className="marj" aria-hidden="true" />

      <header className="ust">
        <span className="ust-ad">{koc.ad}</span>
        <nav className="ust-nav">
          <a href="#nasil">Nasıl çalışıyoruz</a>
          <a href="#belgeler">Belgeler</a>
          <a href="#iletisim">İletişim</a>
          <button className="kucuk-dugme" onClick={onGiris}>Giriş yap</button>
        </nav>
      </header>

      {/* ---------- Kahraman ---------- */}
      <section className="kahraman">
        <p className="eyebrow">{koc.unvan}</p>
        <h1><Vurgulu metin={koc.vaat} /></h1>
        <p className="kahraman-alt">{koc.altVaat}</p>

        <NetCizgisi veri={netGrafigi.veri} />
        <p className="net-not">
          <strong>{netGrafigi.baslik}.</strong> {netGrafigi.aciklama}
        </p>

        <div className="kahraman-eylem">
          <a className="ana-dugme" href="#iletisim">{cagri.dugme}</a>
          <button className="metin-bag" onClick={onGiris}>Zaten öğrencisiyim →</button>
        </div>
      </section>

      {/* ---------- Sayılar ---------- */}
      <section className="serit">
        {sayilar.map((s) => (
          <div key={s.not} className="serit-oge">
            <strong>{s.sayi}</strong>
            <span className="serit-birim">{s.birim}</span>
            <span className="serit-not">{s.not}</span>
          </div>
        ))}
      </section>

      {/* ---------- Kim ---------- */}
      <section className="bolum kim" id="kim">
        <div className="portre">
          {koc.portre ? <img src={koc.portre} alt={koc.ad} /> : <span>{basHarf}</span>}
        </div>
        <div className="kim-metin">
          <h2>Kimim</h2>
          {koc.biyografi.map((p, i) => <p key={i}>{p}</p>)}
        </div>
      </section>

      {/* ---------- Belgeler ---------- */}
      <section className="bolum" id="belgeler">
        <h2>{belgeler.baslik}</h2>
        <p className="bolum-alt">{belgeler.aciklama}</p>
        <div className="belge-izgara">
          {belgeler.liste.map((b) => (
            <article key={b.ad} className="belge">
              <div className="belge-gorsel">
                {b.gorsel ? <img src={b.gorsel} alt={b.ad} loading="lazy" /> : <span className="belge-bos">Görsel eklenmedi</span>}
              </div>
              <h3>{b.ad}</h3>
              <p className="belge-kurum">{b.kurum}</p>
              <p className="belge-yil">{b.yil}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ---------- Nasıl ---------- */}
      <section className="bolum" id="nasil">
        <h2>{nasil.baslik}</h2>
        <p className="bolum-alt">{nasil.aciklama}</p>
        <ol className="adimlar">
          {nasil.adimlar.map((a, i) => (
            <li key={a.baslik}>
              <span className="adim-no">{i + 1}</span>
              <div>
                <h3>{a.baslik}</h3>
                <p>{a.metin}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------- Platform ---------- */}
      <section className="bolum" id="sistem">
        <h2>{platform.baslik}</h2>
        <p className="bolum-alt">{platform.aciklama}</p>
        <ul className="takip">
          {platform.maddeler.map((m) => (
            <li key={m.ad}>
              <span className="tik" aria-hidden="true" />
              <span className="takip-ad">{m.ad}</span>
              <span className="takip-not">{m.not}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------- Kimler için ---------- */}
      <section className="bolum">
        <h2>{kimler.baslik}</h2>
        <div className="gruplar">
          {kimler.gruplar.map((g) => (
            <div key={g.ad} className="grup">
              <span className="grup-ad">{g.ad}</span>
              <span className="grup-alt">{g.aciklama}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Yorumlar ---------- */}
      {yorumlar.liste.length > 0 && (
        <section className="bolum">
          <h2>{yorumlar.baslik}</h2>
          <div className="yorumlar">
            {yorumlar.liste.map((y) => (
              <blockquote key={y.kisi} className="yorum">
                <p>{y.metin}</p>
                <footer>
                  <span className="yorum-kisi">{y.kisi}</span>
                  <span className="yorum-rol">{y.rol}</span>
                </footer>
              </blockquote>
            ))}
          </div>
        </section>
      )}

      {/* ---------- SSS ---------- */}
      <section className="bolum" id="sorular">
        <h2>{sorular.baslik}</h2>
        <div className="sss-liste">
          {sorular.liste.map((s) => <Soru key={s.soru} {...s} />)}
        </div>
      </section>

      {/* ---------- İletişim ---------- */}
      <section className="bolum cagri" id="iletisim">
        <h2>{cagri.baslik}</h2>
        <p className="cagri-metin">{cagri.metin}</p>
        {bagAdres.length > 0 ? (
          <ul className="iletisim">
            {bagAdres.map((b) => (
              <li key={b.ad}>
                <span className="iletisim-ad">{b.ad}</span>
                <a href={b.adres} target={b.adres.startsWith('http') ? '_blank' : undefined} rel="noreferrer">{b.metin}</a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="bolum-alt">İletişim bilgisi henüz eklenmedi.</p>
        )}
      </section>

      <footer className="alt">
        <span>{koc.ad} · {new Date().getFullYear()}</span>
        <button className="metin-bag" onClick={onGiris}>Giriş yap</button>
      </footer>
    </div>
  )
}
