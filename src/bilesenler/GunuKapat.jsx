import { useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Uyari } from './Ortak.jsx'
import { Kalem, KALEM_ADI } from './Kalem.jsx'
import GunlukRutinler from './GunlukRutinler.jsx'
import BugunCozulen from './BugunCozulen.jsx'

/**
 * Günü kapat — "kaydet" katmanı.
 *
 * Rutin işaretleme ve çözülen soru girişi eskiden Bugün'de iki ayrı kart
 * olarak duruyordu; gün içinde sürekli görünüyor ama günde bir kez, akşam
 * dolduruluyordu. Buraya, üç adımlık bir alt sayfaya taşındı:
 *   1 rutinler  2 çözülen soru  3 Kâmil'in özeti + "Günü kapat"
 * Kartlar aynı bileşenler (GunlukRutinler, BugunCozulen); yalnız kap değişti.
 * Koçun öğrenci gözüyle ekranı da bunu çizer, salt okunur.
 *
 * Günü kapatan öğrenci değil, saat: gece 00:05'te sistem her öğrencinin
 * gününü kapatır (private.gunleri_kapat). Öğrenci bu akışı bitirdiyse
 * gun_kapanis'a tam=true yazılır, bitirmediyse gece işi tam=false yazar.
 * Koç listede otomatik görür; Kâmil 22:00'den sonra hatırlatır.
 * "Tamamlanan" gün yeniden açılıp düzeltilebilir; upsert aynı satırı günceller.
 */

const ADIMLAR = ['Rutinler', 'Çözülen soru', 'Özet']

function ozetCumlesi(ozet) {
  const toplam = ozet?.bugunToplamGorev ?? 0
  const biten = ozet?.bugunTamamlanan ?? 0
  const soru = ozet?.bugunSoruToplam ?? 0
  const dk = ozet?.calismaDkBugun ?? 0
  if (toplam > 0 && biten === toplam) {
    return { ruh: 'sevinc', mesaj: 'Bugünün hepsi bitti. Yarın buradan devam.' }
  }
  if (biten === 0 && soru === 0 && dk === 0) {
    return { ruh: 'bekliyor', mesaj: 'Bugün sessiz geçti. Yarın tek bir blokla başlamak yeter.' }
  }
  if (toplam > 0 && biten < toplam) {
    return { ruh: 'fikir', mesaj: `${toplam - biten} blok yarına kaldı. Bugün yapılan boşa gitmedi.` }
  }
  return { ruh: 'sevinc', mesaj: 'Plan yoktu ama çalıştın. Bu sayılır.' }
}

export default function GunuKapat({ acik, onKapat, ogrenciId, katalogId, ozet, onDegisti, saltOkunur = false }) {
  const [adim, setAdim] = useState(0)
  const [hata, setHata] = useState('')
  const [bekliyor, setBekliyor] = useState(false)

  useEffect(() => {
    if (acik) setAdim(0)
  }, [acik])

  useEffect(() => {
    if (!acik) return
    const kacis = (e) => {
      if (e.key === 'Escape') onKapat?.()
    }
    window.addEventListener('keydown', kacis)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', kacis)
      document.body.style.overflow = ''
    }
  }, [acik, onKapat])

  if (!acik) return null

  const son = adim === ADIMLAR.length - 1
  const bugunIndeks =
    ozet?.haftaBasi && ozet?.bugun
      ? Math.round((new Date(`${ozet.bugun}T00:00:00`) - new Date(`${ozet.haftaBasi}T00:00:00`)) / 86400000)
      : -1
  const rutinBugun = (ozet?.rutinler ?? []).filter((r) => r.gunler?.[bugunIndeks]).length
  const rutinToplam = (ozet?.rutinler ?? []).length
  const soz = ozetCumlesi(ozet)

  async function kapat() {
    if (saltOkunur || !ozet?.bugun) return
    setBekliyor(true)
    const { error } = await supabase
      .from('gun_kapanis')
      .upsert({ ogrenci_id: ogrenciId, tarih: ozet.bugun, kapandi: new Date().toISOString(), tam: true }, { onConflict: 'ogrenci_id,tarih' })
    setBekliyor(false)
    if (error) {
      setHata(hataMetni(error))
      return
    }
    setHata('')
    onDegisti?.()
    onKapat?.()
  }

  return (
    <div className="alt-sayfa-perde" onClick={onKapat} role="presentation">
      <section
        className="alt-sayfa"
        role="dialog"
        aria-modal="true"
        aria-label="Günü tamamla"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="alt-sayfa-tutamac" aria-hidden="true" />
        <header className="alt-sayfa-bas">
          <h2>Günü tamamla</h2>
          <ol className="adim-noktalar" aria-label={`Adım ${adim + 1} / ${ADIMLAR.length}`}>
            {ADIMLAR.map((a, i) => (
              <li key={a} className={i === adim ? 'adim-nokta adim-nokta--etkin' : 'adim-nokta'} aria-current={i === adim ? 'step' : undefined}>
                <span className="gorsel-gizli">{a}</span>
              </li>
            ))}
          </ol>
          <p className="alt-sayfa-alt">{adim + 1}/{ADIMLAR.length} · {ADIMLAR[adim]}</p>
        </header>

        <div className="alt-sayfa-govde">
          {adim === 0 && (
            <GunlukRutinler
              ogrenciId={ogrenciId}
              rutinler={ozet?.rutinler}
              haftaBasi={ozet?.haftaBasi}
              bugun={ozet?.bugun}
              onDegisti={onDegisti}
              saltOkunur={saltOkunur}
            />
          )}
          {adim === 1 && ozet?.bugun && (
            <BugunCozulen
              ogrenciId={ogrenciId}
              katalogId={katalogId}
              kayitlar={ozet?.bugunSoru}
              tarih={ozet.bugun}
              onDegisti={onDegisti}
              saltOkunur={saltOkunur}
            />
          )}
          {son && (
            <div className="kapanis-ozet">
              <div className="kapanis-kalem" aria-hidden="true">
                <Kalem ruh={soz.ruh} boyut={96} yipranma={ozet?.yipranma ?? 0} />
              </div>
              <p className="kapanis-ad">{KALEM_ADI}</p>
              <p className="kapanis-mesaj">{soz.mesaj}</p>
              <dl className="kapanis-sayilar">
                <div><dt>Blok</dt><dd>{ozet?.bugunTamamlanan ?? 0}/{ozet?.bugunToplamGorev ?? 0}</dd></div>
                <div><dt>Süre</dt><dd>{ozet?.calismaDkBugun ?? 0} dk</dd></div>
                <div><dt>Soru</dt><dd>{ozet?.bugunSoruToplam ?? 0}</dd></div>
                {rutinToplam > 0 && <div><dt>Rutin</dt><dd>{rutinBugun}/{rutinToplam}</dd></div>}
              </dl>
              <Uyari>{hata}</Uyari>
            </div>
          )}
        </div>

        <footer className="alt-sayfa-dugmeler">
          {adim > 0 ? (
            <button className="dugme dugme--ikincil" onClick={() => setAdim((a) => a - 1)}>
              ‹ {ADIMLAR[adim - 1]}
            </button>
          ) : (
            <button className="dugme dugme--ikincil" onClick={onKapat}>Vazgeç</button>
          )}
          {son ? (
            <button className="dugme dugme--birincil" disabled={saltOkunur || bekliyor} onClick={kapat}>
              {ozet?.gunKapandi ? 'Kaydet' : 'Günü tamamla'}
            </button>
          ) : (
            <button className="dugme dugme--birincil" onClick={() => setAdim((a) => a + 1)}>
              {ADIMLAR[adim + 1]} ›
            </button>
          )}
        </footer>
      </section>
    </div>
  )
}
