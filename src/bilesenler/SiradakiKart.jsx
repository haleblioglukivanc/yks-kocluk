import { useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Kart, Uyari } from './Ortak.jsx'
import GorevKaynagi from './GorevKaynagi.jsx'
import { SAYAC_SURELERI, bicimle, kalanMs, useSayac, useSayacTiki, varsayilanDk } from '../lib/sayac.jsx'

/**
 * Bugün'ün merkezi: tek görev, tek düğme.
 *
 * Eskiden sayaç ayrı bir karttı ve görev listesinin üstünde üç süre
 * düğmesiyle duruyordu; öğrenci önce süre seçiyor, sonra listeden hangi
 * işe bakacağını buluyordu. Burada sıra tersine döndü: kart sıradaki işi
 * söyler, "Başla" o iş için sayacı açar. Sayaç çalışırken aynı kart
 * halkaya dönüşür — iki kart değil, bir kartın iki hâli.
 *
 * Süre görevden gelmiyor (gorevler tablosunda süre yok); türe göre
 * varsayılan seçiliyor, yanında iki alternatif duruyor.
 *
 * Öğrenci panelinde dokunulabilir, vekalette de aynı bileşen çizilir.
 */

const TUR_ADI = {
  konu_anlatimi: 'Konu anlatımı',
  soru_cozumu: 'Soru çözümü',
  tekrar: 'Tekrar',
  deneme: 'Deneme',
  okuma: 'Okuma',
  diger: 'Çalışma',
}
function Halka({ durum }) {
  const kalan = kalanMs(durum)
  const oran = 1 - kalan / (durum.hedefDk * 60000)
  const C = 2 * Math.PI * 52
  return (
    <div className="sayac-halka">
      <svg viewBox="0 0 120 120" width="150" height="150" role="img"
           aria-label={`Kalan süre ${bicimle(kalan)}`}>
        <circle cx="60" cy="60" r="52" fill="none" stroke="var(--cizgi)" strokeWidth="8" />
        <circle cx="60" cy="60" r="52" fill="none" stroke="var(--marka-amber)" strokeWidth="8"
                strokeLinecap="round" strokeDasharray={C}
                strokeDashoffset={C * (1 - oran)} transform="rotate(-90 60 60)" />
        <text x="60" y="67" textAnchor="middle" fontSize="23" fill="currentColor">
          {bicimle(kalan)}
        </text>
      </svg>
    </div>
  )
}

export default function SiradakiKart({ gorevler, onDegisti, saltOkunur = false }) {
  const sayac = useSayac()
  const durum = sayac?.durum ?? null
  useSayacTiki(!!durum?.calisiyor)

  /* Atlama oturumluk: sayfa yenilenince sıra başa döner. Kalıcı olsaydı
     "atlandı" durumuna yazmak gerekirdi, o da koçun raporuna girerdi. */
  const [atlanan, setAtlanan] = useState([])
  const [hata, setHata] = useState('')

  const liste = gorevler ?? []
  const bekleyen = liste.filter((g) => g.durum !== 'tamamlandi')
  const calisan = durum?.gorevId ? liste.find((g) => g.id === durum.gorevId) : null
  const sira =
    bekleyen.find((g) => !atlanan.includes(g.id)) ?? bekleyen[0] ?? null

  async function tamamla(g) {
    if (saltOkunur) return
    const { error } = await supabase
      .from('gorevler')
      .update({ durum: 'tamamlandi' })
      .eq('id', g.id)
    if (error) {
      setHata(hataMetni(error))
      return
    }
    setHata('')
    onDegisti?.()
  }

  /* ── Sayaç çalışıyor: aynı kart halkaya dönüşür ── */
  if (durum) {
    const baslik = calisan
      ? calisan.baslik || [calisan.ders, calisan.konu].filter(Boolean).join(' · ')
      : 'Serbest çalışma'
    return (
      <Kart baslik={baslik} altBaslik={`${durum.hedefDk} dk`}>
        <Halka durum={durum} />
        <div className="sayac-dugmeler">
          {durum.calisiyor ? (
            <button className="dugme dugme--ikincil" onClick={sayac.duraklat}>Duraklat</button>
          ) : (
            <button className="dugme dugme--ikincil" onClick={sayac.devam}>Devam et</button>
          )}
          <button className="dugme dugme--birincil" onClick={sayac.bitir}>Bitir ve kaydet</button>
        </div>
        {!durum.calisiyor && <p className="kart-alt">Duraklattın. Süre işlemiyor.</p>}
      </Kart>
    )
  }

  /* ── Serbest: görev yok ya da hepsi bitti ── */
  if (!sira) {
    const hepsiBitti = liste.length > 0
    return (
      <Kart
        baslik={hepsiBitti ? 'Bugünün hepsi bitti' : 'Bugün için plan yok'}
        altBaslik={hepsiBitti ? 'İstersen serbest çalış, sayaç sayar.' : 'Sayaçla serbest çalışabilirsin.'}
        eylem={
          <div className="sayac-secim">
            {SAYAC_SURELERI.map((dk) => (
              <button key={dk} className="dugme dugme--ikincil dugme--ufak" onClick={() => sayac?.basla(dk)}>
                {dk} dk
              </button>
            ))}
          </div>
        }
      >
        <Uyari tur="bilgi">{sayac?.uyari}</Uyari>
      </Kart>
    )
  }

  /* ── Sıradaki iş ── */
  const varsayilan = varsayilanDk(sira.tur)
  const digerler = SAYAC_SURELERI.filter((dk) => dk !== varsayilan)
  const etiket = [sira.ders, sira.konu].filter(Boolean).join(' · ')
  const tur = TUR_ADI[sira.tur]
  const kalanSoru =
    sira.hedef_adet && sira.hedef_adet > 0
      ? Math.max(0, sira.hedef_adet - (sira.yapilan_adet ?? 0))
      : null
  const baslik =
    sira.baslik + (kalanSoru !== null && !/\d/.test(sira.baslik) ? ` — ${kalanSoru} soru` : '')

  return (
    <section className="kart siradaki" aria-label="Sıradaki iş">
      <Uyari>{hata}</Uyari>
      <Uyari tur="bilgi">{sayac?.uyari}</Uyari>
      <p className="siradaki-etiket">Sıradaki</p>
      <h2 className="siradaki-baslik">{baslik}</h2>
      {(etiket || tur) && (
        <p className="siradaki-alt">{[etiket, tur].filter(Boolean).join(' · ')}</p>
      )}
      <GorevKaynagi gorev={sira} />
      {sira.aciklama && <p className="siradaki-not">{sira.aciklama}</p>}

      <div className="siradaki-eylem">
        <button
          className="dugme dugme--birincil siradaki-basla"
          disabled={saltOkunur}
          onClick={() => sayac?.basla(varsayilan, sira.id)}
        >
          ▶ {varsayilan} dk başla
        </button>
        {digerler.map((dk) => (
          <button
            key={dk}
            className="dugme dugme--ikincil dugme--ufak"
            disabled={saltOkunur}
            onClick={() => sayac?.basla(dk, sira.id)}
            aria-label={`${dk} dakika başla`}
          >
            {dk}
          </button>
        ))}
      </div>
      <div className="siradaki-ikincil">
        <button className="metin-dugme" disabled={saltOkunur} onClick={() => tamamla(sira)}>
          ✓ Tamamla
        </button>
        {bekleyen.length > 1 && (
          <button className="metin-dugme" onClick={() => setAtlanan((a) => [...a, sira.id])}>
            Atla ›
          </button>
        )}
      </div>
    </section>
  )
}
