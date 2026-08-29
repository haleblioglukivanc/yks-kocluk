import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Bos, Dugme, Kart, Uyari, Yukleniyor } from './Ortak.jsx'
import DenemeFormu from './DenemeFormu.jsx'

/* Deneme sekmesi. Öğrenci panelinde ve koçun "öğrenci gözüyle" ekranında
   aynı dosyadan çiziliyor; ikisi de salt okunur, denemeyi koç giriyor.

   Sıralama bilinçli: önce net nereye gidiyor, sonra hangi ders taşıyor,
   en sonda ne çalışılacak. Grafikle başlayıp konuyla bitmek, "iyi/kötü"
   duygusunu eyleme bağlıyor.

   Denemeyi koç da öğrenci de girebiliyor — sonucu zaten ikisi de biliyor,
   girişi tek tarafa kilitlemek sadece kaydı geciktiriyordu. */

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

export default function DenemePaneli({
  ogrenciId = null,
  katalogId = null,
  duzenlenebilir = false,
}) {
  const [veri, setVeri] = useState(null)
  const [tur, setTur] = useState(null)
  const [hata, setHata] = useState('')
  const [formAcik, setFormAcik] = useState(false)
  const [acikHata, setAcikHata] = useState(null)

  const yukle = useCallback(async () => {
    const { data, error } = await supabase.rpc('deneme_paneli', {
      p_ogrenci: ogrenciId,
      p_limit: 12,
    })
    if (error) {
      setHata(hataMetni(error))
      setVeri({ denemeler: [], zayif: [] })
      return
    }
    setHata('')
    setVeri(data ?? { denemeler: [], zayif: [] })
  }, [ogrenciId])

  useEffect(() => {
    yukle()
  }, [yukle])

  async function sil(id) {
    const { error } = await supabase.from('denemeler').delete().eq('id', id)
    if (error) setHata(hataMetni(error))
    else yukle()
  }

  const denemeler = veri?.denemeler ?? []

  // Türler karışık girildiğinde TYT ile AYT netini aynı çizgiye dizmek
  // yanıltıcı olurdu; her tür kendi grafiğine bakıyor.
  const turler = useMemo(
    () => [...new Set(denemeler.map((d) => d.tur))],
    [denemeler],
  )
  const seciliTur = tur ?? turler[0] ?? null
  const suzulmus = denemeler.filter((d) => d.tur === seciliTur)

  if (veri === null) return <Yukleniyor />

  if (denemeler.length === 0) {
    return (
      <Kart
        baslik="Denemeler"
        eylem={
          duzenlenebilir ? (
            <Dugme tur="ikincil" onClick={() => setFormAcik((v) => !v)}>
              {formAcik ? 'Kapat' : 'Deneme ekle'}
            </Dugme>
          ) : null
        }
      >
        <Uyari>{hata}</Uyari>
        {formAcik ? (
          <DenemeFormu
            ogrenciId={ogrenciId}
            katalogId={katalogId}
            onEklendi={() => {
              setFormAcik(false)
              yukle()
            }}
          />
        ) : (
          <Bos
            baslik="Deneme kaydı yok"
            aciklama={
              duzenlenebilir
                ? 'İlk denemeyi ekleyince net gelişimi burada görünecek.'
                : 'Deneme girildiğinde net gelişimi burada görünecek.'
            }
          />
        )}
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

      <Kart
        baslik="Tüm denemeler"
        altBaslik={`${denemeler.length} kayıt`}
        eylem={
          duzenlenebilir ? (
            <Dugme tur="ikincil" onClick={() => setFormAcik((v) => !v)}>
              {formAcik ? 'Kapat' : 'Deneme ekle'}
            </Dugme>
          ) : null
        }
      >
        <Uyari>{hata}</Uyari>

        {formAcik && (
          <DenemeFormu
            ogrenciId={ogrenciId}
            katalogId={katalogId}
            onEklendi={() => {
              setFormAcik(false)
              yukle()
            }}
          />
        )}

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
              {duzenlenebilir && (
                <>
                  <button
                    className="metin-dugme"
                    onClick={() => setAcikHata(acikHata === d.id ? null : d.id)}
                    aria-expanded={acikHata === d.id}
                  >
                    Hata konuları
                  </button>
                  <button className="sil-dugme" onClick={() => sil(d.id)} aria-label="Denemeyi sil">
                    ×
                  </button>
                  {acikHata === d.id && (
                    <DenemeHatalari deneme={d} katalogId={katalogId} onDegisti={yukle} />
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      </Kart>
    </>
  )
}

/* Netin hangi konudan düştüğü, denemenin asıl bilgisi. Buraya girilen
   satırlar öğrencinin deneme sekmesinde "tekrar edilmesi gereken konular"
   listesinde birikiyor. */
function DenemeHatalari({ deneme, katalogId, onDegisti }) {
  const [satirlar, setSatirlar] = useState(null)
  const [dersler, setDersler] = useState([])
  const [konular, setKonular] = useState([])
  const [dersId, setDersId] = useState('')
  const [konuId, setKonuId] = useState('')
  const [adet, setAdet] = useState('1')
  const [hata, setHata] = useState('')

  const yukle = useCallback(async () => {
    const { data, error } = await supabase
      .from('deneme_hatalari')
      .select('konu_id, adet, konular(ad, dersler(ad))')
      .eq('deneme_id', deneme.id)
    if (error) setHata(hataMetni(error))
    setSatirlar(data ?? [])
  }, [deneme.id])

  useEffect(() => {
    yukle()
  }, [yukle])

  useEffect(() => {
    if (!katalogId) return
    supabase
      .from('dersler')
      .select('id, ad')
      .eq('katalog_id', katalogId)
      .order('sira')
      .then(({ data }) => setDersler(data ?? []))
  }, [katalogId])

  useEffect(() => {
    setKonuId('')
    if (!dersId) {
      setKonular([])
      return
    }
    supabase
      .from('konular')
      .select('id, ad')
      .eq('ders_id', Number(dersId))
      .order('sira')
      .then(({ data }) => setKonular(data ?? []))
  }, [dersId])

  async function ekle() {
    if (!konuId) return
    const { error } = await supabase
      .from('deneme_hatalari')
      .upsert(
        { deneme_id: deneme.id, konu_id: Number(konuId), adet: Math.max(1, Number(adet) || 1) },
        { onConflict: 'deneme_id,konu_id' },
      )
    if (error) {
      setHata(hataMetni(error))
      return
    }
    setHata('')
    setKonuId('')
    setAdet('1')
    yukle()
    onDegisti?.()
  }

  async function kaldir(kId) {
    const { error } = await supabase
      .from('deneme_hatalari')
      .delete()
      .eq('deneme_id', deneme.id)
      .eq('konu_id', kId)
    if (error) setHata(hataMetni(error))
    else {
      yukle()
      onDegisti?.()
    }
  }

  return (
    <div className="hata-kutu">
      <Uyari>{hata}</Uyari>
      {satirlar === null ? (
        <Yukleniyor />
      ) : satirlar.length === 0 ? (
        <p className="kart-alt">Bu denemede konu bazlı hata girilmemiş.</p>
      ) : (
        <ul className="liste">
          {satirlar.map((h) => (
            <li key={h.konu_id} className="zayif-satir">
              <div className="zayif-metin">
                <span className="gorev-baslik">{h.konular?.ad}</span>
                <span className="gorev-etiket">{h.konular?.dersler?.ad}</span>
              </div>
              <span className="zayif-sayi">{h.adet}</span>
              <button className="sil-dugme" onClick={() => kaldir(h.konu_id)} aria-label="Kaldır">
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="hata-form">
        <select value={dersId} onChange={(e) => setDersId(e.target.value)} aria-label="Ders">
          <option value="">Ders seç</option>
          {dersler.map((d) => (
            <option key={d.id} value={d.id}>{d.ad}</option>
          ))}
        </select>
        <select
          value={konuId}
          onChange={(e) => setKonuId(e.target.value)}
          disabled={!konular.length}
          aria-label="Konu"
        >
          <option value="">{konular.length ? 'Konu seç' : 'Önce ders seç'}</option>
          {konular.map((k) => (
            <option key={k.id} value={k.id}>{k.ad}</option>
          ))}
        </select>
        <div className="hata-form-alt">
          <input
            type="number"
            min="1"
            max="99"
            value={adet}
            onChange={(e) => setAdet(e.target.value)}
            aria-label="Hata adedi"
          />
          <Dugme tur="ikincil" onClick={ekle} disabled={!konuId}>Ekle</Dugme>
        </div>
      </div>
    </div>
  )
}
