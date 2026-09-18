import { useState } from 'react'
import { sifreSifirla } from '../lib/hesap.js'
import { Uyari } from './Ortak.jsx'
import EylemDugmesi from '../ortak/EylemDugmesi.jsx'

/**
 * Başka birinin şifresini sıfırlama: iki adım (sor → üret), sonuç bir kez
 * görünür. Yönetim → Koçlar ve koçun öğrenci ekranı (Kayıt → Hesap) kullanır.
 * Yetki sunucuda (sifre-sifirla Edge Function); burası yalnız arayüz.
 */
export default function SifreSifirla({ kisiId, ad }) {
  const [adim, setAdim] = useState('kapali') // kapali | onay | sonuc
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState('')
  const [sonuc, setSonuc] = useState(null)
  const [kopyalandi, setKopyalandi] = useState(false)

  async function uret() {
    setHata('')
    setBekliyor(true)
    try {
      const d = await sifreSifirla(kisiId)
      setSonuc(d)
      setAdim('sonuc')
    } catch (e) {
      setHata(e.message ?? 'Şifre sıfırlanamadı.')
    } finally {
      setBekliyor(false)
    }
  }

  function kopyala() {
    navigator.clipboard
      ?.writeText(`${sonuc.eposta ? `E-posta: ${sonuc.eposta}\n` : ''}Geçici şifre: ${sonuc.gecici_sifre}`)
      .then(() => setKopyalandi(true))
  }

  if (adim === 'kapali') {
    return (
      <EylemDugmesi ikon="anahtar" onClick={() => setAdim('onay')}>
        Şifre sıfırla
      </EylemDugmesi>
    )
  }

  if (adim === 'onay') {
    return (
      <div className="sifre-sifirla">
        <p className="liste-alt">
          {ad} için yeni geçici şifre üretilecek; eski şifresi hemen geçersiz olur.
        </p>
        <Uyari>{hata}</Uyari>
        <div className="sifre-sifirla-dugmeler">
          <EylemDugmesi ikon="anahtar" onClick={uret} disabled={bekliyor}>
            {bekliyor ? 'Üretiliyor…' : 'Yeni şifre üret'}
          </EylemDugmesi>
          <button type="button" className="metin-dugme" onClick={() => setAdim('kapali')}>Vazgeç</button>
        </div>
      </div>
    )
  }

  return (
    <div className="sifre-sifirla sifre-sifirla--sonuc">
      <p className="liste-ad">{sonuc.ad_soyad} için yeni geçici şifre</p>
      <p className="liste-alt">
        {sonuc.eposta ? <>{sonuc.eposta} · </> : null}
        <code className="kod-rozet">{sonuc.gecici_sifre}</code>
      </p>
      <p className="liste-alt">Bir daha gösterilmez. İlk girişte kendi şifresini belirlemesi önerilir.</p>
      <div className="sifre-sifirla-dugmeler">
        <EylemDugmesi ikon="kopya" onClick={kopyala}>{kopyalandi ? 'Kopyalandı' : 'Kopyala'}</EylemDugmesi>
        <button type="button" className="metin-dugme" onClick={() => { setAdim('kapali'); setSonuc(null) }}>
          Kapat
        </button>
      </div>
    </div>
  )
}
