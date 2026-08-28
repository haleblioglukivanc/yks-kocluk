import { useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Alan, Dugme, Uyari } from '../bilesenler/Ortak.jsx'

export default function SifreDegistir({ profil, onBitti, onCikis }) {
  const [yeni, setYeni] = useState('')
  const [tekrar, setTekrar] = useState('')
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState('')

  async function kaydet() {
    setHata('')
    if (yeni.length < 8) {
      setHata('Şifre en az 8 karakter olmalı.')
      return
    }
    if (yeni !== tekrar) {
      setHata('Şifreler eşleşmiyor.')
      return
    }
    setBekliyor(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: yeni })
      if (error) throw error

      const { error: pHata } = await supabase
        .from('profiller')
        .update({ sifre_degistirmeli: false })
        .eq('id', profil.id)
      if (pHata) throw pHata

      await onBitti()
    } catch (e) {
      setHata(hataMetni(e))
    } finally {
      setBekliyor(false)
    }
  }

  return (
    <div className="giris-sayfa">
      <div className="giris-kutu">
        <header className="giris-basi">
          <h1>Şifrenizi belirleyin</h1>
          <p>
            Hoş geldiniz {profil.ad_soyad}. Hesabınız geçici bir şifreyle açıldı. Devam
            etmek için kendi şifrenizi belirleyin.
          </p>
        </header>

        <Alan etiket="Yeni şifre" ipucu="En az 8 karakter">
          <input
            type="password"
            value={yeni}
            onChange={(e) => setYeni(e.target.value)}
            autoComplete="new-password"
            placeholder="••••••••"
          />
        </Alan>

        <Alan etiket="Yeni şifre (tekrar)">
          <input
            type="password"
            value={tekrar}
            onChange={(e) => setTekrar(e.target.value)}
            autoComplete="new-password"
            onKeyDown={(e) => e.key === 'Enter' && kaydet()}
            placeholder="••••••••"
          />
        </Alan>

        <Uyari>{hata}</Uyari>

        <Dugme onClick={kaydet} bekliyor={bekliyor}>
          Kaydet ve devam et
        </Dugme>

        <button className="metin-dugme" onClick={onCikis}>
          Çıkış yap
        </button>
      </div>
    </div>
  )
}
