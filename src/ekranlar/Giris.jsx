import { useState } from 'react'
import { MarkaIsareti } from '../bilesenler/Marka.jsx'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Alan, Dugme, Uyari } from '../bilesenler/Ortak.jsx'

export default function Giris({ onGeri }) {
  const [eposta, setEposta] = useState('')
  const [sifre, setSifre] = useState('')
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState('')
  /* 'giris' | 'unuttum' | 'gonderildi' */
  const [kip, setKip] = useState('giris')

  /* Şifremi unuttum: Supabase e-postaya tek kullanımlık bağlantı yollar.
     Adres kayıtlı olsun olmasın aynı cevap verilir; kimin hesabı olduğu
     buradan öğrenilemesin. */
  async function baglantiGonder() {
    setHata('')
    const adres = eposta.trim()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(adres)) {
      setHata('Hesabının e-posta adresini yaz.')
      return
    }
    setBekliyor(true)
    const { error } = await supabase.auth.resetPasswordForEmail(adres, {
      redirectTo: `${window.location.origin}/`,
    })
    setBekliyor(false)
    if (error && /rate|too many|seconds/i.test(error.message ?? '')) {
      setHata('Kısa sürede çok deneme oldu. Birkaç dakika sonra tekrar dene.')
      return
    }
    if (error) console.warn('sifirlama', error)
    setKip('gonderildi')
  }

  async function gonder() {
    setHata('')
    if (!eposta.trim() || !sifre) {
      setHata('E-posta ve şifre gerekli.')
      return
    }
    setBekliyor(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: eposta.trim(),
        password: sifre,
      })
      if (error) throw error
    } catch (e) {
      setHata(hataMetni(e))
    } finally {
      setBekliyor(false)
    }
  }

  return (
    <div className="giris-sayfa giris-kagit">
      <div className="giris-zemin" aria-hidden="true" />
      <div className="giris-ust">
        <span className="giris-marka">
          <MarkaIsareti yukseklik={20} sinif="giris-marka-isaret" />
          Kıvanç Hoca
        </span>
        <span className="giris-marka-alt">YKS · LGS koçu</span>
      </div>
      <p className="giris-etiket"><i />Öğrenci · veli · koç girişi</p>
      <div className="giris-kutu">
        <header className="giris-basi">
          <h1>{kip === 'giris' ? 'Giriş' : 'Şifre yenile'}</h1>
          <p>
            {kip === 'giris'
              ? 'Program, deneme takibi ve konu ilerlemesi tek yerde.'
              : 'E-postana gelen bağlantıyla yeni şifreni belirlersin.'}
          </p>
        </header>

        {kip === 'gonderildi' ? (
          <>
            <p className="giris-not giris-not--kutu">
              <strong>{eposta.trim()}</strong> adresi kayıtlıysa şifre yenileme bağlantısı
              gönderildi. Gelen kutunu (gerekirse gereksiz klasörünü) kontrol et; bağlantıya
              dokununca yeni şifreni belirleyeceksin.
            </p>
            <button type="button" className="metin-dugme giris-unuttum" onClick={() => setKip('giris')}>
              ← Girişe dön
            </button>
          </>
        ) : (
          <>
            <Alan etiket="E-posta">
              <input
                type="email"
                value={eposta}
                onChange={(e) => setEposta(e.target.value)}
                autoComplete="email"
                placeholder="ornek@eposta.com"
                onKeyDown={(e) => kip === 'unuttum' && e.key === 'Enter' && baglantiGonder()}
              />
            </Alan>

            {kip === 'giris' && (
              <Alan etiket="Şifre">
                <input
                  type="password"
                  value={sifre}
                  onChange={(e) => setSifre(e.target.value)}
                  autoComplete="current-password"
                  onKeyDown={(e) => e.key === 'Enter' && gonder()}
                  placeholder="••••••••"
                />
              </Alan>
            )}

            <Uyari>{hata}</Uyari>

            {kip === 'giris' ? (
              <>
                <Dugme onClick={gonder} bekliyor={bekliyor}>
                  Giriş yap
                </Dugme>
                <button
                  type="button"
                  className="metin-dugme giris-unuttum"
                  onClick={() => { setHata(''); setKip('unuttum') }}
                >
                  Şifremi unuttum
                </button>
              </>
            ) : (
              <>
                <Dugme onClick={baglantiGonder} bekliyor={bekliyor}>
                  Bağlantı gönder
                </Dugme>
                <button
                  type="button"
                  className="metin-dugme giris-unuttum"
                  onClick={() => { setHata(''); setKip('giris') }}
                >
                  ← Girişe dön
                </button>
              </>
            )}

            {kip === 'giris' && (
              <p className="giris-not">
                Hesabın koçun tarafından açılır. E-posta adresini bilmiyorsan koçuna danış.
              </p>
            )}
          </>
        )}
      </div>

      {onGeri && (
        <button className="metin-dugme giris-geri" onClick={onGeri}>
          ← Ana sayfaya dön
        </button>
      )}
    </div>
  )
}
