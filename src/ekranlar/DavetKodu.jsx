import { useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Alan, Dugme, Uyari } from '../bilesenler/Ortak.jsx'

export default function DavetKodu({ profil, onBaglandi, onCikis }) {
  const [kod, setKod] = useState('')
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState('')

  function bicimle(ham) {
    const temiz = ham.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
    return temiz.length > 4 ? `${temiz.slice(0, 4)}-${temiz.slice(4)}` : temiz
  }

  async function gonder() {
    setHata('')
    if (kod.replace('-', '').length !== 8) {
      setHata('Kod 8 karakter olmalı.')
      return
    }
    setBekliyor(true)
    try {
      const { error } = await supabase.rpc('daveti_kullan', { p_kod: kod })
      if (error) throw error
      await onBaglandi()
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
          <h1>Neredeyse hazır</h1>
          <p>
            Merhaba {profil?.ad_soyad ?? ''}. Devam etmek için koçunuzdan aldığınız davet
            kodunu girin.
          </p>
        </header>

        <Alan etiket="Davet kodu" ipucu="Örnek: K7QM-3XPD">
          <input
            value={kod}
            onChange={(e) => setKod(bicimle(e.target.value))}
            onKeyDown={(e) => e.key === 'Enter' && gonder()}
            placeholder="XXXX-XXXX"
            className="kod-girisi"
            inputMode="text"
            autoCapitalize="characters"
            spellCheck="false"
          />
        </Alan>

        <Uyari>{hata}</Uyari>

        <Dugme onClick={gonder} bekliyor={bekliyor}>
          Kodu kullan
        </Dugme>

        <button className="metin-dugme" onClick={onCikis}>
          Çıkış yap
        </button>
      </div>
    </div>
  )
}
