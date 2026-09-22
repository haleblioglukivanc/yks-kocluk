import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Bolum from '../ortak/Bolum.jsx'
import BosDurum from '../ortak/BosDurum.jsx'
import Sekmeler from '../ortak/Sekmeler.jsx'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Bos, Kart, Uyari, Yukleniyor } from '../bilesenler/Ortak.jsx'
import KonuYolu from '../bilesenler/KonuYolu.jsx'
import { dersKapsamAdi, dersleriGrupla, grupToplami, kapsamEtiketi } from '../lib/dersGruplari.js'

/* 300'den fazla konu var. Hepsini birden çekmek hem yavaş hem okunmaz olurdu:
   dersler özet gelir, konular ders açıldığında yüklenir. */

function Cubuk({ toplam, tamamlandi, onayli = 0, calisiliyor, tekrar }) {
  /* Öğrenciye üç durum: bitti, çalışıyorum, başlanmadı.
     Eskiden beş vardı (onaylı / onay bekliyor / çalışılıyor / tekrar /
     başlanmadı). Beşi de koçun kavramları: onay koçta, tekrar kararı
     koçta. Öğrencinin bunları ayırt etmesi gerekmiyor, ayırt etmeye
     çalışması ekranı okunmaz yapıyordu. Sayılar kaybolmuyor, birleşiyor:
     onay bekleyen de bitmiştir, tekrar da çalışılan bir konudur. */
  const bitti = tamamlandi
  const calisilan = calisiliyor + tekrar
  const bos = Math.max(0, toplam - bitti - calisilan)
  const y = (n) => (toplam ? (n / toplam) * 100 : 0)
  const dokunuldu = bitti + calisilan > 0
  const parcalar = [
    ['onayli', bitti, 'bitti'],
    ['calisiliyor', calisilan, 'çalışıyorum'],
  ]
  return (
    <>
      <div
        className='konu-cubuk'
        role='img'
        aria-label={`${toplam} konudan ${bitti} bitti, ${calisilan} çalışılıyor, ${bos} başlanmadı`}
      >
        {parcalar.map(([k, n]) => n > 0 && (
          <div key={k} className={`konu-cubuk--${k}`} style={{ width: `${y(n)}%` }} />
        ))}
      </div>
      <div className='konu-lejant' aria-hidden='true'>
        {dokunuldu ? (
          <>
            {parcalar.map(([k, n, ad]) => n > 0 && (
              <span key={k} className={`konu-lejant--${k}`}>{n} {ad}</span>
            ))}
            {bos > 0 && <span className='konu-lejant--bos'>{bos} başlanmadı</span>}
          </>
        ) : (
          <span className='konu-lejant--yok'>Henüz başlanmadı</span>
        )}
      </div>
    </>
  )
}

/* Ders adlarını karşılaştırırken kapsam ayıklanır: görevde "Geometri",
   katalogda "TYT AYT Geometri" olabiliyor. */
const sade = (a) => (a ?? '').toLocaleLowerCase('tr-TR').replace(/\b(tyt|ayt|ydt)\b/g, '').trim()
const ayniDers = (a, b) => {
  const x = sade(a); const y = sade(b)
  return Boolean(x) && Boolean(y) && (x === y || x.includes(y) || y.includes(x))
}

export default function KonuHaritasi({ profilId, odakDers, sekmeYuvasi = null, yeni = false, rol = 'ogrenci' }) {
  const [dersler, setDersler] = useState(null)
  const [secili, setSecili] = useState(null)
  const [hata, setHata] = useState('')

  /* profilId hedef öğrenciyi söyler. Vekaletteyken oturum koçun olduğu için
     RPC'nin auth.uid()'e bakması yetmiyordu: kimin haritası açılacağını
     açıkça geçiyoruz. Yetkiyi RLS tutuyor. */
  const ozetiYukle = useCallback(async () => {
    const { data, error } = await supabase.rpc('konu_ozetim', {
      p_ogrenci_id: profilId ?? null,
    })
    if (error) {
      setHata(hataMetni(error))
      return
    }
    setDersler(data ?? [])
  }, [profilId])

  useEffect(() => {
    setDersler(null)
    setSecili(null)
    ozetiYukle()
  }, [ozetiYukle])

  /* Ders şeridi yanal kayar; seçili ders (ör. Coğrafya) şeridin sağında
     kalınca hiçbiri seçili görünmüyordu (22 Eylül 2026). Yalnız şerit kayar,
     sayfa yerinden oynamaz. */
  const derslerRef = useRef(null)
  useEffect(() => {
    const kap = derslerRef.current
    const el = kap?.querySelector('[aria-pressed="true"]')
    if (!kap || !el) return
    const sol = el.offsetLeft - kap.offsetLeft
    const sag = sol + el.offsetWidth
    if (sol < kap.scrollLeft || sag > kap.scrollLeft + kap.clientWidth) kap.scrollLeft = Math.max(0, sol - 12)
  }, [secili, dersler])

  /* Harita gelmeden bir ekran boyu yer tutulur. Altındaki Seri ve kitap
     kartları daha hızlı geliyordu; harita sonradan açılınca onları ekrandan
     itiyordu. Gerçek patika neredeyse her zaman bir ekrandan uzun. */
  if (dersler === null) {
    return (
      <Kart sinif='konu-haritasi--bekliyor'>
        <Yukleniyor satir={4} />
      </Kart>
    )
  }

  /* TYT Matematik ve AYT Matematik katalogda iki satır, öğrencinin
     yolunda tek ders. Çubuk da ikisinin toplamını gösteriyor: "matematikte
     neredeyim" sorusunun tek bir cevabı var. */
  const gruplar = dersleriGrupla(dersler)

  /* Yol'a girmenin sebebi "neredeyim" sorusu ve cevabı patikanın içinde.
     Eskiden altı ders alt alta kapalı duruyordu: patika iki dokunuş
     uzaktaydı ve liste hangisine basacağına dair bir şey söylemiyordu.
     Artık patika doğrudan açılıyor, dersler üstte bir şerit.

     Açılışta seçilen ders: üzerinde çalışılan konu olan ilk ders. Yoksa
     ilk ders. Tarih bilgisi özet sorgusunda yok; "çalışılıyor" durumu
     öğrencinin şu an nerede olduğuna en yakın veri. */
  /* odakDers: gün kapandıktan sonra buraya geçilirken "bugün şurayı
     çalıştın" bilgisi geliyor; o ders açık gelsin. Öğrenci sonradan
     şeritten başka bir derse geçerse seçimi kendi tercihi kazanır. */
  const odak = odakDers ? gruplar.find((g) => ayniDers(g.ad, odakDers)) : null
  const varsayilan =
    odak ?? gruplar.find((g) => grupToplami(g, ['calisiliyor']).calisiliyor > 0) ?? gruplar[0]
  const etkin = gruplar.find((g) => g.kod === secili) ?? varsayilan

  if (gruplar.length === 0) {
    return (
      <>
        <Uyari>{hata}</Uyari>
        <BosDurum metin={rol === 'koc' ? 'Bu öğrencinin konu kataloğu seçilmemiş. Profilinden bir katalog seçince yolu burada belirir.' : 'Yol henüz çizilmedi. Koçun konu listeni tanımlayınca harita burada belirir.'} />
      </>
    )
  }

  const t = grupToplami(etkin, ['toplam', 'tamamlandi', 'onayli', 'calisiliyor', 'tekrar'])

  /* Yeni Yol sayfası (22 Eylül 2026 mokabı): ders seçimi halkalı haplar,
     altında beyaz kartta düz patika. */
  if (yeni) {
    const CEVRE = 2 * Math.PI * 14
    return (
      <>
        <Uyari>{hata}</Uyari>
        <div className="yol-dersler" role="group" aria-label="Dersler" ref={derslerRef}>
          {gruplar.map((g) => {
            const gt = grupToplami(g, ['toplam', 'tamamlandi'])
            const oran = gt.toplam ? gt.tamamlandi / gt.toplam : 0
            const secili = g.kod === etkin.kod
            return (
              <button key={g.kod} type="button" className="yol-ders" aria-pressed={secili} onClick={() => setSecili(g.kod)}>
                <svg viewBox="0 0 36 36" aria-hidden="true">
                  <circle cx="18" cy="18" r="14" fill="none" stroke={secili ? 'rgba(255,255,255,.25)' : 'var(--m-yumusak)'} strokeWidth="4" />
                  {oran > 0 && <circle cx="18" cy="18" r="14" fill="none" stroke={secili ? '#fff' : 'var(--m-vurgu)'} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${oran * CEVRE} ${CEVRE}`} transform="rotate(-90 18 18)" />}
                </svg>
                {g.ad}
              </button>
            )
          })}
        </div>
        <p className="yol-ders-cumle">{etkin.ad}: {t.toplam} konudan {t.tamamlandi} tanesi bitti.</p>
        <section className="yol-kart" aria-label={`${etkin.ad} yolu`}>
          {etkin.dersler.map((d) => (
            <div key={d.dersId} className="yol-kapsam">
              {etkin.dersler.length > 1 && (
                <p className="yol-kapsam-bas"><span>{dersKapsamAdi(d)}</span><small>{d.tamamlandi}/{d.toplam}</small></p>
              )}
              <KonuYolu ogrenciId={profilId} dersId={d.dersId} rol={rol} onDegisti={ozetiYukle} durakSayisi={d.toplam} duz />
            </div>
          ))}
        </section>
      </>
    )
  }

  return (
    <>
      <Uyari>{hata}</Uyari>
      {/* Ders seçimi kutu değil: başlığın alt kenarında alt çizgili sekmeler
          (yuva yoksa zeminde). Harita kartsız; kendisi beyaz yüzeyde. */}
      {(() => {
        const sekmeler = (
          <Sekmeler
            varyant={sekmeYuvasi ? 'koyu' : 'acik'}
            etiket='Dersler'
            deger={etkin.kod}
            onSec={setSecili}
            secenekler={gruplar.map((g) => {
              const gt = grupToplami(g, ['toplam', 'tamamlandi'])
              return { k: g.kod, ad: g.ad, rozet: <span className='alt-sekme-sayi'>{gt.tamamlandi}/{gt.toplam}</span> }
            })}
          />
        )
        return sekmeYuvasi ? createPortal(sekmeler, sekmeYuvasi) : sekmeler
      })()}
      <Bolum baslik={etkin.ad} sayi={`${kapsamEtiketi(etkin)} · ${t.toplam} konu`}>
        <Cubuk toplam={t.toplam} tamamlandi={t.tamamlandi} onayli={t.onayli} calisiliyor={t.calisiliyor} tekrar={t.tekrar} />

        {etkin.dersler.map((d) => (
          <div key={d.dersId} className='ders-kapsam veri-yuzey'>
            {etkin.dersler.length > 1 && (
              <p className='ders-kapsam-basi'>
                <span className='ders-kapsam-rozet'>{dersKapsamAdi(d)}</span>
                <span className='ders-kapsam-sayi'>{d.tamamlandi}/{d.toplam}</span>
              </p>
            )}
            <KonuYolu ogrenciId={profilId} dersId={d.dersId} rol="ogrenci" onDegisti={ozetiYukle} durakSayisi={d.toplam} />
          </div>
        ))}
      </Bolum>
    </>
  )
}
