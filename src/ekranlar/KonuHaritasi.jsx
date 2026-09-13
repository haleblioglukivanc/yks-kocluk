import { useCallback, useEffect, useState } from 'react'
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

export default function KonuHaritasi({ profilId, odakDers }) {
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

  if (dersler === null) return <Yukleniyor />

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
        <Kart baslik='Konu haritası'>
          <Bos baslik='Yol henüz çizilmedi' aciklama='Koçun konu listeni tanımlayınca harita burada belirir.' />
        </Kart>
      </>
    )
  }

  const t = grupToplami(etkin, ['toplam', 'tamamlandi', 'onayli', 'calisiliyor', 'tekrar'])

  return (
    <>
      <Uyari>{hata}</Uyari>
      <Kart baslik={etkin.ad} altBaslik={`${kapsamEtiketi(etkin)} · ${t.toplam} konu`}>
        <div className='ders-serit' role='tablist' aria-label='Dersler'>
          {gruplar.map((g) => {
            const gt = grupToplami(g, ['toplam', 'tamamlandi'])
            const bu = g.kod === etkin.kod
            return (
              <button
                key={g.kod}
                role='tab'
                aria-selected={bu}
                className={bu ? 'ders-cip ders-cip--etkin' : 'ders-cip'}
                onClick={() => setSecili(g.kod)}
              >
                <span className='ders-cip-ad'>{g.ad}</span>
                <span className='ders-cip-sayi'>{gt.tamamlandi}/{gt.toplam}</span>
              </button>
            )
          })}
        </div>

        <Cubuk toplam={t.toplam} tamamlandi={t.tamamlandi} onayli={t.onayli} calisiliyor={t.calisiliyor} tekrar={t.tekrar} />

        {etkin.dersler.map((d) => (
          <div key={d.dersId} className='ders-kapsam'>
            {etkin.dersler.length > 1 && (
              <p className='ders-kapsam-basi'>
                <span className='ders-kapsam-rozet'>{dersKapsamAdi(d)}</span>
                <span className='ders-kapsam-sayi'>{d.tamamlandi}/{d.toplam}</span>
              </p>
            )}
            <KonuYolu ogrenciId={profilId} dersId={d.dersId} rol="ogrenci" onDegisti={ozetiYukle} />
          </div>
        ))}
      </Kart>
    </>
  )
}
