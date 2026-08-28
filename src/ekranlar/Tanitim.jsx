import { site } from '../icerik/site.js'

export default function Tanitim({ onGiris }) {
  const { koc, iletisim, ozetler, nasil, platform, kimler, cagri } = site

  const baglantilar = [
    iletisim.eposta && { ad: 'E-posta', adres: `mailto:${iletisim.eposta}`, metin: iletisim.eposta },
    iletisim.telefon && { ad: 'Telefon', adres: `tel:${iletisim.telefon.replace(/\s/g, '')}`, metin: iletisim.telefon },
    iletisim.whatsapp && { ad: 'WhatsApp', adres: `https://wa.me/${iletisim.whatsapp}`, metin: 'Mesaj gönder' },
    iletisim.instagram && { ad: 'Instagram', adres: `https://instagram.com/${iletisim.instagram}`, metin: `@${iletisim.instagram}` },
  ].filter(Boolean)

  return (
    <div className="tanitim">
      <header className="t-bar">
        <span className="marka">
          YKS <span className="ince">Koçluk</span>
        </span>
        <button className="dugme dugme--ikincil dugme--kucuk" onClick={onGiris}>
          Giriş yap
        </button>
      </header>

      {/* Hero */}
      <section className="t-hero">
        <p className="t-etiket">
          {koc.ad} · {koc.unvan}
        </p>
        <h1>{koc.vaat}</h1>
        <p className="t-ozet">{koc.tanitim}</p>
        <div className="t-eylemler">
          <a className="dugme dugme--birincil" href="#iletisim">
            {cagri.dugme}
          </a>
          <button className="metin-dugme" onClick={onGiris}>
            Zaten öğrencisiyim
          </button>
        </div>
      </section>

      {/* Sayılar */}
      <section className="t-sayilar">
        {ozetler.map((o) => (
          <div key={o.etiket} className="t-sayi">
            <span className="t-emoji" aria-hidden="true">{o.emoji}</span>
            <strong>{o.sayi}</strong>
            <span className="t-sayi-etiket">{o.etiket}</span>
            <span className="t-sayi-not">{o.not}</span>
          </div>
        ))}
      </section>

      {/* Nasıl çalışıyoruz */}
      <section className="t-bolum">
        <h2>{nasil.baslik}</h2>
        <ol className="t-adimlar">
          {nasil.adimlar.map((a, i) => (
            <li key={a.baslik}>
              <span className="t-adim-no">
                <span className="t-emoji" aria-hidden="true">{a.emoji}</span>
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <h3>{a.baslik}</h3>
                <p>{a.metin}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Platform */}
      <section className="t-bolum t-bolum--kutu">
        <h2>{platform.baslik}</h2>
        <ul className="t-maddeler">
          {platform.maddeler.map((m) => (
            <li key={m.metin}>
              <span className="t-emoji" aria-hidden="true">{m.emoji}</span>
              {m.metin}
            </li>
          ))}
        </ul>
        <p className="t-dipnot">
          Öğrenci ve veli, kendi hesaplarıyla aynı sisteme giriyor. Veli yalnızca
          görüntüleyebiliyor.
        </p>
      </section>

      {/* Kimler için */}
      <section className="t-bolum">
        <h2>{kimler.baslik}</h2>
        <div className="t-gruplar">
          {kimler.gruplar.map((g) => (
            <div key={g.ad} className="t-grup">
              <span className="t-emoji t-emoji--buyuk" aria-hidden="true">{g.emoji}</span>
              <span className="t-grup-ad">{g.ad}</span>
              <span className="t-grup-aciklama">{g.aciklama}</span>
            </div>
          ))}
        </div>
      </section>

      {/* İletişim */}
      <section className="t-bolum t-cagri" id="iletisim">
        <h2>{cagri.baslik}</h2>
        <p>{cagri.metin}</p>
        {baglantilar.length > 0 ? (
          <ul className="t-iletisim">
            {baglantilar.map((b) => (
              <li key={b.ad}>
                <span className="t-iletisim-ad">{b.ad}</span>
                <a href={b.adres} target={b.adres.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
                  {b.metin}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="t-dipnot">İletişim bilgisi henüz eklenmedi.</p>
        )}
      </section>

      <footer className="t-alt">
        <span>
          {koc.ad} · {new Date().getFullYear()}
        </span>
        <button className="metin-dugme" onClick={onGiris}>
          Giriş yap
        </button>
      </footer>
    </div>
  )
}
