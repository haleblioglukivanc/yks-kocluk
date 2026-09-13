import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { Bos, Kart, Yukleniyor } from './Ortak.jsx'
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

  const gosterilen = suzulmus && !tumu ? suzulmus : liste

  if (liste === null) {
    return (
      <Kart baslik={baslik}>
        <Yukleniyor satir={2} />
      </Kart>
    )
  }

  if (liste.length === 0) {
    return (
      <Kart baslik={baslik}>
        <Bos
          baslik="Henüz kaynak yok"
          aciklama={
            ben
              ? 'Koçun bir göreve kitap iliştirdiğinde o kitap burada listelenir.'
              : 'Göreve kaynak iliştirdiğinde kitap burada birikir.'
          }
        />
      </Kart>
    )
  }

  return (
    <Kart
      baslik={baslik}
      altBaslik={
        ben
          ? suzulmus && !tumu
            ? 'Bugünkü derslerin kitapları'
            : 'Görevlerde kullandığın kitaplar'
          : 'Verdiğin görevlerden birikenler'
      }
      eylem={
        ben && suzulmus ? (
          <button type="button" className="metin-dugme" onClick={() => setTumu((t) => !t)}>
            {tumu ? 'Bugünküler' : 'Tümü'}
          </button>
        ) : null
      }
    >
      {ben ? (
        <ul className="liste kaynak-adlar">
          {gosterilen.map((k) => (
            <li key={k.id} className="liste-satir">
              <span className="liste-ad">{k.ad}</span>
            </li>
          ))}
        </ul>
      ) : (
      <ul className="liste">
        {liste.map((k) => {
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
              {/* Sayı öğüt değil bilgi: kaç görevde geçti, en son ne zaman.
                  Açık görev varsa öne çıkıyor, çünkü sırada bekleyen iş o. */}
              <span className="sayi">
                {k.acikGorev > 0 ? `${k.acikGorev} açık` : son ? son : `${k.gorevSayisi} görev`}
              </span>
            </li>
          )
        })}
      </ul>
      )}
    </Kart>
  )
}
