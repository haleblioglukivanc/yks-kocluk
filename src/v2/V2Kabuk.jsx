import { useCallback, useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Uyari, Yukleniyor } from '../bilesenler/Ortak.jsx'
import { Kalem } from '../bilesenler/Kalem.jsx'
import { SayacSaglayici } from '../lib/sayac.jsx'
import SiradakiKart from '../bilesenler/SiradakiKart.jsx'
import GunuKapat from '../bilesenler/GunuKapat.jsx'
import { v2Kapat } from '../lib/v2bayrak.js'
import Varis from './Varis.jsx'
import './v2.css'

/**
 * v2 öğrenci kabuğu.
 *
 * v1'in kabuğunun (üst şerit + alt gezinme + sekmeler) yerine geçer; App
 * bayrak açıkken doğrudan buraya düşer, kendi kabuğunu hiç çizmez.
 *
 * Tek yön var: Bugün → çalışma (SiradakiKart'ın içinde) → günü kapat →
 * varış. Sekme yok. Yol ve Denemeler v2'nin ilk turunda yok; ikisi de
 * gün içinde değil, gün sonunda ya da haftada bir bakılan yerler.
 *
 * Bilerek yeniden yazılmayanlar: SiradakiKart ve GunuKapat. İkisi de
 * zaten v2'nin istediği şekilde çalışıyor (tek görev tek düğme; rutin ve
 * çözülen soru tek akışta). Kopyalamak, v1'de yapılan düzeltmenin
 * v2'de unutulması demek olurdu.
 */

/* Sınav tarihi katalogda tutulmuyor; tek yerde sabit duruyor.
   Yıl dönünce burası güncellenir. */
const SINAV = new Date('2027-06-19T00:00:00')

function kalanGun() {
  const bugun = new Date()
  bugun.setHours(0, 0, 0, 0)
  return Math.max(0, Math.round((SINAV - bugun) / 86400000))
}

export default function V2Kabuk({ profil }) {
  const [kayit, setKayit] = useState(null)
  const [ozet, setOzet] = useState(null)
  const [hata, setHata] = useState('')
  const [tazele, setTazele] = useState(0)
  const [kapatAcik, setKapatAcik] = useState(false)
  const [ekran, setEkran] = useState('bugun')

  const yenile = useCallback(() => setTazele((n) => n + 1), [])

  useEffect(() => {
    let iptal = false
    ;(async () => {
      const { data: o, error } = await supabase
        .from('ogrenciler')
        .select('id, katalog_id')
        .eq('id', profil.id)
        .maybeSingle()
      if (iptal) return
      if (error) {
        setHata(hataMetni(error))
        return
      }
      setKayit(o)

      const { data: b } = await supabase.rpc('ogrenci_bugun_ozeti', { p_ogrenci_id: profil.id })
      if (!iptal && b) setOzet(b)
    })()
    return () => { iptal = true }
  }, [profil.id, tazele])

  /* Varış ekranı gecede açılır. Gövdeye de yazıyoruz ki tarayıcı şeridi
     ekranla aynı renge gitsin — yarısı beyaz bir tepe, geçişi bozuyor. */
  useEffect(() => {
    const etiket = document.querySelector('meta[name="theme-color"]')
    if (etiket) etiket.setAttribute('content', ekran === 'varis' ? '#070a14' : '#fffdf9')
  }, [ekran])

  if (hata) return <div className="v2"><div className="v2-govde"><Uyari>{hata}</Uyari></div></div>
  if (!kayit) return <div className="v2"><div className="v2-govde"><Yukleniyor /></div></div>

  const bugunTarih = new Date().toLocaleDateString('tr-TR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  const toplam = ozet?.bugunToplamGorev ?? 0
  const biten = ozet?.bugunTamamlanan ?? 0
  const hepsiBitti = toplam > 0 && biten === toplam
  const cizbiSozu = hepsiBitti
    ? 'Bugünün hepsi bitti. Günü kapatınca haritaya bakarız.'
    : toplam === 0
      ? 'Bugün için plan yok. Sayaçla serbest çalışabilirsin.'
      : `${toplam - biten} iş kaldı. Sıradakiyle başla.`

  return (
    <div className="v2" data-gece={ekran === 'varis' ? '' : undefined}>
      <header className="v2-tepe">
        <span className="v2-gerisayim">YKS'ye <b>{kalanGun()} gün</b></span>
      </header>

      {ekran === 'varis' ? (
        <Varis
          ogrenciId={kayit.id}
          ozet={ozet}
          onKapat={() => { setEkran('bugun'); yenile() }}
        />
      ) : (
        <SayacSaglayici>
          <div className="v2-govde">
            <p className="v2-tarih">{bugunTarih}</p>

            <SiradakiKart gorevler={ozet?.gorevler} onDegisti={yenile} />

            {ozet?.bugun && (
              <button className="v2-kapat-dugme" onClick={() => setKapatAcik(true)}>
                <strong>{ozet.gunKapandi ? 'Gün tamamlandı ✓' : 'Günü kapat'}</strong>
                <span>
                  {ozet.gunKapandi
                    ? 'Rutin ya da soru düzeltmek için dokun'
                    : 'Rutinler · çözülen soru · özet'}
                </span>
              </button>
            )}

            <div className="v2-cizbi">
              <Kalem ruh={hepsiBitti ? 'sevinc' : 'bekliyor'} boyut={38} yipranma={ozet?.yipranma ?? 0} />
              <p>{cizbiSozu}</p>
            </div>

            <button
              className="v2-eski"
              onClick={() => { v2Kapat(); window.location.href = window.location.pathname }}
            >
              Eski görünüme dön
            </button>
          </div>
        </SayacSaglayici>
      )}

      <GunuKapat
        acik={kapatAcik}
        onKapat={() => setKapatAcik(false)}
        onTamamlandi={() => { setKapatAcik(false); setEkran('varis') }}
        ogrenciId={kayit.id}
        katalogId={kayit.katalog_id}
        ozet={ozet}
        onDegisti={yenile}
      />
    </div>
  )
}
