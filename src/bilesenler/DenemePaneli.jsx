import { useEffect, useMemo, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Bos, Kart, Uyari, Yukleniyor } from './Ortak.jsx'

/* Deneme sekmesi. Öğrenci panelinde ve koçun "öğrenci gözüyle" ekranında
   aynı dosyadan çiziliyor; ikisi de salt okunur, denemeyi koç giriyor.

   Sıralama bilinçli: önce net nereye gidiyor, sonra hangi ders taşıyor,
   en sonda ne çalışılacak. Grafikle başlayıp konuyla bitmek, "iyi/kötü"
   duygusunu eyleme bağlıyor. */

const TUR_ADI = { tyt: 'TYT', ayt: 'AYT', ydt: 'YDT', brans: 'Branş' }
const DURUM_ETIKET = {
  baslanmadi: 'başlanmadı',
  calisiliyor: 'çalışılıyor',
  tamamlandi: 'bitti',
  tekrar_gerekli: 'tekrar',
}

/** Küçük gelişim çizgisi. Eksen yok: burada okunması gereken şey
 *  değerin kendisi değil, yönü. */
function NetCizgisi({ seri }) {
  if (seri.length < 2) {
    return <p className="kart-alt">Grafik için en az iki deneme gerekiyor.</p>
  }
  const G = 380
  const Y = 90
  const kenar = 8
  const degerler = seri.map((s) => s.net)
  const enAz = Math.min(...degerler)
  const enCok = Math.max(...degerler)
  const aralik = Math.max(1, enCok - enAz)
  const x = (i) => kenar + (i * (G - kenar * 2)) / (seri.length - 1)
  const y = (v) => Y - kenar - ((v - enAz) / aralik) * (Y - kenar * 3)
  const noktalar = seri.map((s, i) => [x(i), y(s.net)])

  return (
    <svg
      className="net-cizgi"
      viewBox={`0 0 ${G} ${Y}`}
      role="img"
      aria-label={`Net gelişim grafiği, son değer ${seri[seri.length - 1].net.toFixed(2)}`}
    >
      <polyline
        points={noktalar.map((p) => p.join(',')).join(' ')}
        fill="none"
        stroke="var(--dolgu)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {noktalar.map((p, i) => (
        <circle
          key={i}
          cx={p[0]}
          cy={p[1]}
          r={i === noktalar.length - 1 ? 4 : 2.5}
          fill={i === noktalar.length - 1 ? 'var(--dolgu)' : 'var(--yuzey)'}
          stroke="var(--dolgu)"
          strokeWidth="1.6"
        />
      ))}
    </svg>
  )
}

export default function DenemePaneli({ ogrenciId = null, saltOkunur = false }) {
  const [veri, setVeri] = useState(null)
  const [tur, setTur] = useState(null)
  const [hata, setHata] = useState('')

  useEffect(() => {
    let iptal = false
    supabase
      .rpc('deneme_paneli', { p_ogrenci: ogrenciId, p_limit: 12 })
      .then(({ data, error }) => {
        if (iptal) return
        if (error) {
          setHata(hataMetni(error))
          setVeri({ denemeler: [], zayif: [] })
          return
        }
        setVeri(data ?? { denemeler: [], zayif: [] })
      })
    return () => {
      iptal = true
    }
  }, [ogrenciId])

  const denemeler = veri?.denemeler ?? []

  // Türler karışık girildiğinde TYT ile AYT netini aynı çizgiye dizmek
  // yanıltıcı olurdu; her tür kendi grafiğine bakıyor.
  const turler = useMemo(
    () => [...new Set(denemeler.map((d) => d.tur))],
    [denemeler],
  )
  const seciliTur = tur ?? turler[0] ?? null
  const suzulmus = denemeler.filter((d) => d.tur === seciliTur)

  if (hata && !denemeler.length) {
    return (
      <Kart baslik="Denemeler">
        <Uyari>{hata}</Uyari>
      </Kart>
    )
  }
  if (veri === null) return <Yukleniyor />

  if (denemeler.length === 0) {
    return (
      <Kart baslik="Denemeler">
        <Bos
          baslik="Deneme kaydı yok"
          aciklama={
            saltOkunur
              ? 'Öğrenci henüz boş bir ekran görüyor.'
              : 'Koçun deneme sonuçlarını girdiğinde net gelişimin burada görünecek.'
          }
        />
      </Kart>
    )
  }

  // Grafik eskiden yeniye; liste yeniden eskiye
  const seri = [...suzulmus].reverse().map((d) => ({ ...d, net: Number(d.toplamNet) }))
  const son = seri[seri.length - 1]
  const onceki = seri[seri.length - 2]
  const fark = son && onceki ? son.net - onceki.net : null
  const zayif = veri.zayif ?? []

  return (
    <>
      <Kart
        baslik="Net gelişimi"
        altBaslik={`${TUR_ADI[seciliTur] ?? seciliTur} · son ${suzulmus.length} deneme`}
        eylem={
          turler.length > 1 ? (
            <div className="tur-secim">
              {turler.map((t) => (
                <button
                  key={t}
                  className={t === seciliTur ? 'tur-cip tur-cip--etkin' : 'tur-cip'}
                  aria-pressed={t === seciliTur}
                  onClick={() => setTur(t)}
                >
                  {TUR_ADI[t] ?? t.toUpperCase()}
                </button>
              ))}
            </div>
          ) : null
        }
      >
        <div className="net-ozet">
          <div>
            <span className="net-ozet-etiket">Son net</span>
            <strong className="net-ozet-sayi">{son.net.toFixed(2)}</strong>
          </div>
          {fark !== null && (
            <span className={`net-fark${fark >= 0 ? ' net-fark--artis' : ' net-fark--dusus'}`}>
              {fark >= 0 ? '▲' : '▼'} {Math.abs(fark).toFixed(2)}
            </span>
          )}
        </div>
        <NetCizgisi seri={seri} />
      </Kart>

      <Kart
        baslik="Ders bazında"
        altBaslik={`Son deneme · ${new Date(son.tarih).toLocaleDateString('tr-TR')}${
          son.yayin ? ` · ${son.yayin}` : ''
        }`}
      >
        {son.dersler.length === 0 ? (
          <Bos baslik="Ders kırılımı yok" aciklama="Bu denemede ders sonucu girilmemiş." />
        ) : (
          <>
            <div className="net-kutular">
              {son.dersler.map((d) => (
                <div key={d.ders} className="net-kutu">
                  <span className="net-kutu-ders">{d.ders}</span>
                  <strong className="net-kutu-net">{Number(d.net).toFixed(2)}</strong>
                  <span className="dny">
                    <span className="dny-d">{d.dogru}</span>
                    <span className="dny-y">{d.yanlis}</span>
                    <span className="dny-b">{d.bos}</span>
                  </span>
                </div>
              ))}
            </div>
            <p className="kart-alt">Net = doğru − yanlış ÷ 4</p>
          </>
        )}
      </Kart>

      <Kart
        baslik="Tekrar edilmesi gereken konular"
        altBaslik="Denemelerde hata çıkan başlıklar"
      >
        {zayif.length === 0 ? (
          <Bos
            baslik="Konu bazlı hata girilmemiş"
            aciklama={
              saltOkunur
                ? 'Denemeye hata konusu eklerseniz burada birikir.'
                : 'Koçun denemelerde hata çıkan konuları işaretledikçe burası dolacak.'
            }
          />
        ) : (
          <ul className="liste">
            {zayif.map((z) => (
              <li key={z.konuId} className="zayif-satir">
                <div className="zayif-metin">
                  <span className="gorev-baslik">{z.konu}</span>
                  <span className="gorev-etiket">
                    {z.ders} · {z.deneme} denemede · {DURUM_ETIKET[z.durum] ?? z.durum}
                  </span>
                </div>
                <span className="zayif-sayi">{z.hata}</span>
              </li>
            ))}
          </ul>
        )}
      </Kart>

      <Kart baslik="Tüm denemeler" altBaslik={`${denemeler.length} kayıt`}>
        <ul className="liste">
          {denemeler.map((d) => (
            <li key={d.id} className="liste-satir">
              <div>
                <span className="liste-ad">{d.ad || `${TUR_ADI[d.tur] ?? d.tur} denemesi`}</span>
                <span className="liste-alt">
                  {new Date(d.tarih).toLocaleDateString('tr-TR')}
                  {d.yayin ? ` · ${d.yayin}` : ''} · {d.toplamDogru}D {d.toplamYanlis}Y{' '}
                  {d.toplamBos}B
                </span>
              </div>
              <div className="net-rozet">
                <strong>{Number(d.toplamNet).toFixed(2)}</strong>
                <span>net</span>
              </div>
            </li>
          ))}
        </ul>
      </Kart>
    </>
  )
}
