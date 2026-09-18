import { useEffect, useMemo, useState } from 'react'
import Bolum from '../ortak/Bolum.jsx'
import { supabase } from '../lib/supabase.js'
import { Yukleniyor } from './Ortak.jsx'
import { FAZ_ADI } from '../lib/kaynak.js'

/**
 * Öğrencinin elindeki kaynaklar.
 *
 * Ayrı bir "öğrencinin kitapları" listesi tutmuyoruz. Koç göreve kaynak
 * iliştirdiğinde o kitabın öğrencinin elinde olduğu zaten belli; veri
 * görevlerde yaşıyor, burada yalnızca toplanıyor. Böylece koç ikinci bir
 * liste bakımı yapmak zorunda kalmıyor ve iki liste birbirinden ayrı
 * düşemiyor.
 *
 * Aynı bileşen iki ekranda: koçun öğrenci sayfasında (hangi kitabı
 * vermişim) ve öğrencinin kendi panelinde (elimde hangi kitaplar var).
 *
 * Öğrenci tarafında yalnızca kitap adları var. Yayınevi, faz, son
 * verilen aralık ve görev sayısı koçun takip verisi; öğrencinin bu
 * ekranda yanıtladığı soru "elimde hangi kitaplar var", o kadar.
 */

const KAPSAM = { tyt: 'TYT', ayt: 'AYT', tyt_ayt: 'TYT + AYT' }

function tarihKisa(t) {
  if (!t) return null
  return new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
}

/* Ders adlarını karşılaştırmak için sadeleştirir: "TYT Matematik" ile
   "Matematik" aynı dersi işaret ediyor, biri kapsamlı yazılmış o kadar. */
const sade = (a) => (a ?? '').toLocaleLowerCase('tr-TR').replace(/\b(tyt|ayt|ydt)\b/g, '').trim()

const ayniDers = (a, b) => {
  const x = sade(a)
  const y = sade(b)
  if (!x || !y) return false
  return x === y || x.includes(y) || y.includes(x)
}

export default function OgrenciKaynaklari({ ogrenciId, rol = 'ogrenci', bugunDersler }) {
  const [liste, setListe] = useState(null)
  const [tumu, setTumu] = useState(false)
  /* Kapalı açılıyor: kitap listesi günün işini yapmak için gerekli değil,
     ihtiyaç duyulunca bakılan bir raf. Kapalıyken bir satır yer kaplıyor. */
  const [acik, setAcik] = useState(false)

  useEffect(() => {
    if (!ogrenciId) return
    let iptal = false
    supabase.rpc('ogrenci_kaynaklari', { p_ogrenci: ogrenciId }).then(({ data }) => {
      if (!iptal) setListe(data ?? [])
    })
    return () => {
      iptal = true
    }
  }, [ogrenciId])

  const ben = rol === 'ogrenci'
  const baslik = ben ? 'Kaynaklarım' : 'Öğrencinin kaynakları'

  /* Bugün'de raf değil, bugünün rafı duruyor: öğrencinin bu ekranda
     yanıtladığı soru "bugünkü işler için elimde ne var". Tüm liste bir
     dokunuş uzakta; süzme bir şeyi saklamıyor, sıraya koyuyor. */
  const suzulmus = useMemo(() => {
    if (!ben || !liste || !bugunDersler?.length) return null
    const eslesen = liste.filter((k) => bugunDersler.some((d) => ayniDers(d, k.dersAd)))
    return eslesen.length ? eslesen : null
  }, [ben, liste, bugunDersler])

  /* Aynı kitap birden çok görevde kullanıldığında listeye birden çok
     kez düşüyordu. Öğrencinin sorusu "elimde hangi kitaplar var";
     aynı adı iki kere görmek cevabı uzatıyor, zenginleştirmiyor. */
  const gosterilen = useMemo(() => {
    const kaynak = suzulmus && !tumu ? suzulmus : liste
    if (!kaynak) return kaynak
    const gorulen = new Set()
    return kaynak.filter((k) => {
      const anahtar = (k.ad ?? '').trim().toLocaleLowerCase('tr-TR')
      if (gorulen.has(anahtar)) return false
      gorulen.add(anahtar)
      return true
    })
  }, [suzulmus, tumu, liste])

  /* Öğrencide dolu hali tek satır katlanır kart; yüklenirken de aynı satır
     çizilir. Önceden iki satırlık iskelet kartı gelip küçülüyor, altındaki
     haftanın sözünü yukarı çekiyordu. */
  if (liste === null && ben) {
    /* Öğrenci: kart değil bölüm (TASARIM-KURALLARI 8); yüklenirken de aynı
       tek satır, altındaki içerik zıplamasın. */
    return <Bolum cizgili baslik="Kaynaklarım" aciklama="Geliyor…" />
  }

  if (liste === null) {
    return (
      <Bolum cizgili baslik={baslik}>
        <Yukleniyor satir={2} />
      </Bolum>
    )
  }

  /* Boş liste için koca bir kart çizilmiyordu diye değil, çiziliyordu
     diye not: bir ekran boyu "Henüz kaynak yok" kartı yer kaplıyordu.
     Koç tarafında bölüm zaten katlanır tek satır; boşken de tek satır. */
  if (liste.length === 0 && ben) {
    return (
      <Bolum
        cizgili
        baslik="Kaynaklarım"
        aciklama="Koçun bir göreve kitap iliştirdiğinde o kitap burada listelenir."
      />
    )
  }

  if (ben) {
    const sayi = gosterilen?.length ?? 0
    return (
      <Bolum
        cizgili
        baslik="Kaynaklarım"
        sayi={sayi}
        aciklama={suzulmus && !tumu ? 'Bugünkü derslerin kitapları.' : 'Görevlerde kullandığın kitaplar.'}
        eylem={acik ? 'Gizle' : 'Göster'}
        onEylem={() => setAcik((a) => !a)}
      >
        {acik && suzulmus && (
          <button className="metin-dugme kaynak-tumu" onClick={() => setTumu((t) => !t)}>
            {tumu ? 'Bugünküler' : 'Tümü'}
          </button>
        )}
        {acik && (
          <ul className="liste kaynak-adlar">
            {gosterilen.map((k) => (
              <li key={k.id} className="liste-satir">
                <span className="liste-ad">{k.ad}</span>
              </li>
            ))}
          </ul>
        )}
      </Bolum>
    )
  }

  /* Koç: kart değil bölüm (TASARIM-KURALLARI 8). Katlanma korunuyor:
     liste uzun olabilir, başlığın sağındaki yazı düğmesi açıp kapatır. */
  const sayi = gosterilen?.length ?? 0
  return (
    <Bolum
      cizgili
      baslik="Öğrencinin kaynakları"
      sayi={sayi}
      aciklama={
        liste.length === 0
          ? 'Göreve kaynak iliştirdiğinde kitap burada birikir.'
          : acik
            ? null
            : 'Verdiğin görevlerden birikenler.'
      }
      eylem={liste.length > 0 ? (acik ? 'Gizle' : 'Göster') : null}
      onEylem={() => setAcik((a) => !a)}
    >
      {acik && liste.length > 0 && (
      <ul className="liste">
        {gosterilen.map((k) => {
          const alt = [
            k.yayinevi,
            k.dersAd ? `${k.dersAd}${k.kapsam ? ` · ${KAPSAM[k.kapsam] ?? ''}` : ''}` : null,
            FAZ_ADI[k.faz] ?? k.faz,
          ]
            .filter(Boolean)
            .join(' · ')
          const son = tarihKisa(k.sonKullanim)
          return (
            <li key={k.id} className="liste-satir">
              <div>
                <span className="liste-ad">{k.ad}</span>
                <span className="liste-alt">{alt}</span>
                {k.sonAralik && <span className="liste-alt">Son verilen: {k.sonAralik}</span>}
              </div>
              <span className="sayi">
                {k.acikGorev > 0 ? `${k.acikGorev} açık` : son ? son : `${k.gorevSayisi} görev`}
              </span>
            </li>
          )
        })}
      </ul>
      )}
    </Bolum>
  )
}
