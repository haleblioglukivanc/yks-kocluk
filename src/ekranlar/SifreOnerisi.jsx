// ŞU AN KULLANILMIYOR.
// App.jsx içinde render edilmiyor; şifre değiştirme önerisi kaldırıldı.
// Geri getirmek için App.jsx'e <SifreOnerisi profil={profil} onGuncellendi={yenile} />
// satırını eklemek yeterli.

import { useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Alan, Dugme, Kart, Uyari } from '../bilesenler/Ortak.jsx'

/**
 * Şifre değiştirme artık zorunlu değil. Geçici şifreyle açılan hesaplarda
 * kapatılabilir bir öneri olarak görünür; kullanıcı isterse değiştirir.
 */
export default function SifreOnerisi({ profil, onGuncellendi }) {
  const [acik, setAcik] = useState(false)
  const [gizlendi, setGizlendi] = useState(false)
  const [yeni, setYeni] = useState('')
  const [tekrar, setTekrar] = useState('')
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState('')

  if (gizlendi || !profil?.sifre_degistirmeli) return null

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

      setGizlendi(true)
      await onGuncellendi?.()
    } catch (e) {
      setHata(hataMetni(e))
    } finally {
      setBekliyor(false)
    }
  }

  if (!acik) {
    return (
      <div className="oneri">
        <div>
          <p className="oneri-baslik">Şifrenizi değiştirmek ister misiniz?</p>
          <p className="oneri-alt">
            Hesabınız koçunuzun verdiği geçici şifreyle açıldı. Kendi şifrenizi
            belirlerseniz hesabınıza yalnızca siz girebilirsiniz.
          </p>
        </div>
        <div className="oneri-eylem">
          <Dugme tur="ikincil" onClick={() => setAcik(true)}>
            Değiştir
          </Dugme>
          <button className="metin-dugme" onClick={() => setGizlendi(true)}>
            Şimdi değil
          </button>
        </div>
      </div>
    )
  }

  return (
    <Kart baslik="Şifre değiştir">
      <div className="form-kutu">
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
          Kaydet
        </Dugme>
        <button className="metin-dugme" onClick={() => setAcik(false)}>
          Vazgeç
        </button>
      </div>
    </Kart>
  )
}
