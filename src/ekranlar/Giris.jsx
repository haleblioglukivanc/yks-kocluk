import { useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Alan, Dugme, Uyari } from '../bilesenler/Ortak.jsx'

export default function Giris({ onGeri }) {
  const [eposta, setEposta] = useState('')
  const [sifre, setSifre] = useState('')
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState('')

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
      <div className="giris-kutu">
        <header className="giris-basi">
          <h1>Giriş</h1>
          <p>Program, deneme takibi ve konu ilerlemesi tek yerde.</p>
        </header>

        <Alan etiket="E-posta">
          <input
            type="email"
            value={eposta}
            onChange={(e) => setEposta(e.target.value)}
            autoComplete="email"
            placeholder="ornek@eposta.com"
          />
        </Alan>

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

        <Uyari>{hata}</Uyari>

        <Dugme onClick={gonder} bekliyor={bekliyor}>
          Giriş yap
        </Dugme>

        <p className="giris-not">
          Hesabınız koçunuz tarafından açılır. Giriş bilgilerinizi bilmiyorsanız koçunuza
          danışın.
        </p>

        {onGeri && (
          <button className="metin-dugme" onClick={onGeri}>
            Ana sayfaya dön
          </button>
        )}
      </div>
    </div>
  )
}
