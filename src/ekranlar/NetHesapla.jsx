import { useEffect, useMemo, useState } from 'react'
import { site } from '../icerik/site.js'
import { MarkaIsareti } from '../bilesenler/Marka.jsx'
import { TESTLER, net, dersNeti, puanlar, obpKatkisi, sayiYaz } from '../lib/sinav.js'
import '../tanitim.css'
import '../randevu.css'
import '../hesap.css'

/* Ücretsiz net ve yaklaşık puan hesabı (/net-hesapla). Üyelik yok, veri
   sunucuya gitmez; girilen sayılar yalnız ziyaretçinin tarayıcısında
   (localStorage) tutulur ki sayfaya dönünce kaybolmasın. */

const DEPO = 'net-hesapla'
const BOS = { sinav: 'YKS', d: {}, diploma: '', yerlesti: false }

function oku() {
  try { return { ...BOS, ...JSON.parse(localStorage.getItem(DEPO) || '{}') } } catch { return BOS }
}

function Test({ baslik, alt, testId, dersler, degerler, degis, bolen }) {
  const toplam = dersler.reduce((t, d) => t + dersNeti(degerler, testId, d, bolen), 0)
  return (
    <fieldset className="h-test">
      <legend>
        <span>{baslik}</span>
        <small>{alt}</small>
        <b>{sayiYaz(toplam)} <i>net</i></b>
      </legend>
      <div className="h-satir h-satir--bas" aria-hidden="true"><span>Ders</span><span>Doğru</span><span>Yanlış</span><span>Net</span></div>
      {dersler.map((d) => {
        const kd = `${testId}.${d.id}.d`, ky = `${testId}.${d.id}.y`
        const dg = Number(degerler[kd]) || 0, yn = Number(degerler[ky]) || 0
        const tasti = dg + yn > d.soru
        const n = net(dg, yn, bolen)
        return (
          <div key={d.id} className={'h-satir' + (tasti ? ' h-satir--hata' : '')}>
            <span className="h-ders">{d.ad}<small>{d.soru} soru</small></span>
            <input type="number" inputMode="numeric" min="0" max={d.soru} value={degerler[kd] ?? ''} placeholder="0"
              onChange={(e) => degis(kd, e.target.value, d.soru)} aria-label={`${d.ad} doğru`} />
            <input type="number" inputMode="numeric" min="0" max={d.soru} value={degerler[ky] ?? ''} placeholder="0"
              onChange={(e) => degis(ky, e.target.value, d.soru)} aria-label={`${d.ad} yanlış`} />
            <span className="h-net">{tasti ? <em>{d.soru} soru var</em> : dg || yn ? sayiYaz(n) : '—'}</span>
          </div>
        )
      })}
    </fieldset>
  )
}

export default function NetHesapla({ onGeri, onRandevu }) {
  const { koc } = site
  const [f, setF] = useState(oku)
  useEffect(() => { document.title = `YKS ve LGS net hesaplama · ${koc.ad}` }, [koc.ad])
  useEffect(() => { try { localStorage.setItem(DEPO, JSON.stringify(f)) } catch { /* gizli sekme */ } }, [f])

  const degis = (anahtar, deger, ust) => {
    const temiz = deger === '' ? '' : String(Math.max(0, Math.min(ust, Math.floor(Number(deger) || 0))))
    setF((o) => ({ ...o, d: { ...o.d, [anahtar]: temiz } }))
  }
  const sifirla = () => setF((o) => ({ ...BOS, sinav: o.sinav }))

  const netler = useMemo(() => {
    const cikar = (testId, bolen = 4) => Object.fromEntries(TESTLER[testId].map((d) => [d.id, dersNeti(f.d, testId, d, bolen)]))
    return { tyt: cikar('tyt'), ayt: cikar('ayt'), ydt: cikar('ydt'), lgs: cikar('lgs', 3) }
  }, [f.d])
  const p = useMemo(() => puanlar(netler), [netler])
  const obp = obpKatkisi(f.diploma, f.yerlesti)
  const lgsToplam = Object.values(netler.lgs).reduce((a, b) => a + b, 0)
  const girildi = Object.values(f.d).some((v) => v !== '' && v !== '0')

  const yks = f.sinav === 'YKS'
  const turler = [
    ['tyt', 'TYT', 'Önlisans'],
    ['say', 'Sayısal', 'Tıp, mühendislik'],
    ['ea', 'Eşit Ağırlık', 'Hukuk, işletme, psikoloji'],
    ['soz', 'Sözel', 'Tarih, edebiyat, iletişim'],
    ['dil', 'Dil', 'Dil bölümleri'],
  ]

  return (
    <div className="tanitim basvuru-sayfa hesap-sayfa">
      <header className="t-ust">
        <div className="t-kap t-ust-ic">
          <a href="/" className="t-marka r-marka" onClick={(e) => { e.preventDefault(); onGeri() }}>
            <span className="t-marka-kilit">
              <MarkaIsareti yukseklik={22} sinif="t-marka-isaret" />
              <span className="t-marka-ad">{koc.ad}</span>
            </span>
            <span className="t-marka-alt">YKS · LGS koçu</span>
          </a>
          <nav className="t-nav">
            <a href="/randevu" onClick={(e) => { e.preventDefault(); onRandevu() }} className="t-dugme t-dugme--ana t-dugme--kucuk">Ücretsiz tanışma</a>
          </nav>
        </div>
      </header>

      <main className="t-kap h-kap">
        <div className="h-bas">
          <p className="r-ust-etiket">Ücretsiz araç · üyelik yok</p>
          <h1>Net ve puan hesaplama</h1>
          <p className="r-giris">
            Doğru ve yanlışlarını yaz; netin ve yaklaşık puanın anında çıksın. Girdiklerin yalnız bu
            cihazda kalır, bir yere gönderilmez.
          </p>
          <div className="r-cipler" role="tablist" aria-label="Sınav">
            {['YKS', 'LGS'].map((s) => (
              <button key={s} type="button" role="tab" aria-selected={f.sinav === s} className={`r-cip${f.sinav === s ? ' r-cip--secili' : ''}`} onClick={() => setF((o) => ({ ...o, sinav: s }))}>{s}</button>
            ))}
          </div>
        </div>

        <div className="h-izgara">
          <div className="h-girdiler">
            {yks ? (
              <>
                <Test baslik="TYT" alt="120 soru · 165 dk" testId="tyt" dersler={TESTLER.tyt} degerler={f.d} degis={degis} bolen={4} />
                <Test baslik="AYT" alt="Alanına ait testleri doldurman yeter" testId="ayt" dersler={TESTLER.ayt} degerler={f.d} degis={degis} bolen={4} />
                <Test baslik="YDT" alt="Yalnız dil puanı için" testId="ydt" dersler={TESTLER.ydt} degerler={f.d} degis={degis} bolen={4} />
                <fieldset className="h-test h-obp">
                  <legend><span>Diploma notu</span><small>OBP katkısı</small></legend>
                  <label className="r-alan">
                    <span>Diploma notu <small>(50–100)</small></span>
                    <input type="number" inputMode="decimal" min="50" max="100" step="0.01" value={f.diploma} placeholder="örn. 85"
                      onChange={(e) => setF((o) => ({ ...o, diploma: e.target.value }))} />
                  </label>
                  <label className="r-onay">
                    <input type="checkbox" checked={f.yerlesti} onChange={(e) => setF((o) => ({ ...o, yerlesti: e.target.checked }))} />
                    Geçen yıl bir programa yerleştim (katkı yarıya iner)
                  </label>
                </fieldset>
              </>
            ) : (
              <Test baslik="LGS" alt="90 soru · 3 yanlış 1 doğruyu götürür" testId="lgs" dersler={TESTLER.lgs} degerler={f.d} degis={degis} bolen={3} />
            )}
            {girildi && <button type="button" className="h-sifirla" onClick={sifirla}>Hepsini temizle</button>}
          </div>

          <aside className="h-sonuc" aria-live="polite">
            {yks ? (
              <>
                <h2>Yaklaşık puanların</h2>
                {!p.tytGecerli ? (
                  <p className="h-bos">Puanın hesaplanması için Türkçe ya da Temel Matematik'ten en az 0,5 net gerekir.</p>
                ) : (
                  <dl className="h-puanlar">
                    {turler.map(([id, ad, not]) => (
                      <div key={id} className={p[id] == null ? 'bos' : ''}>
                        <dt>{ad}<small>{not}</small></dt>
                        <dd>
                          <b>{sayiYaz(p[id])}</b>
                          {p[id] != null && obp != null && <small>yerleştirme {sayiYaz(p[id] + obp)}</small>}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
                {obp != null && <p className="h-obp-not">Diploma katkın: <b>+{sayiYaz(obp)}</b> puan</p>}
                <p className="h-uyari">
                  Yaklaşık hesaptır. ÖSYM puanı standart sapmayla hesaplar ve katsayılar her yıl sınavın
                  zorluğuna göre değişir; gerçek puan birkaç puan farklı çıkabilir. Tercih kararı için
                  ÖSYM sonucunu bekle.
                </p>
              </>
            ) : (
              <>
                <h2>LGS netin</h2>
                <p className="h-lgs"><b>{sayiYaz(lgsToplam)}</b> / 90 net</p>
                <p className="h-uyari">LGS puanı MEB'in standart puan hesabıyla belirlenir ve sınavdan sonra açıklanır; burada yalnız net gösterilir.</p>
              </>
            )}

            <div className="h-cagri">
              <b>Bu netle nereye?</b>
              <p>Net tek başına bir şey söylemez; hangi konudan kaybettiğin söyler. 30 dakikalık tanışmada denemeni birlikte okuyalım.</p>
              <a href="/randevu" onClick={(e) => { e.preventDefault(); onRandevu() }} className="t-dugme t-dugme--ana">Ücretsiz tanışma</a>
            </div>
          </aside>
        </div>

        <section className="h-bilgi">
          <div><h3>Net nasıl hesaplanır?</h3><p>YKS'de net = doğru − yanlış ÷ 4. LGS'de net = doğru − yanlış ÷ 3. Boş bıraktığın soru neti etkilemez.</p></div>
          <div><h3>OBP nedir?</h3><p>Diploma notunun 5 katı. Yerleştirme puanına 0,12 katsayısıyla eklenir, en fazla 60 puan. Geçen yıl yerleşenlerde katsayı 0,06'dır.</p></div>
          <div><h3>Hangi puan türü benim?</h3><p>Sayısal: matematik ve fen. Eşit ağırlık: matematik, edebiyat, tarih-1, coğrafya-1. Sözel: sosyal testlerin tamamı. Dil: YDT.</p></div>
        </section>
      </main>
    </div>
  )
}
