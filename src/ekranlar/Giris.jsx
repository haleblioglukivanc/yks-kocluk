import { useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Alan, Dugme, Uyari } from '../bilesenler/Ortak.jsx'

export default function Giris() {
  const [kip, setKip] = useState('giris') // 'giris' | 'kayit'
  const [eposta, setEposta] = useState('')
  const [sifre, setSifre] = useState('')
  const [adSoyad, setAdSoyad] = useState('')
  const [koc, setKoc] = useState(false)
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState('')
  const [bilgi, setBilgi] = useState('')

  async function gonder() {
    setHata('')
    setBilgi('')

    if (!eposta.trim() || !sifre) {
      setHata('E-posta ve şifre gerekli.')
      return
    }
    if (kip === 'kayit' && adSoyad.trim().length < 2) {
      setHata('Ad soyad girin.')
      return
    }

    setBekliyor(true)
    try {
      if (kip === 'giris') {
        const { error } = await supabase.auth.signInWithPassword({
          email: eposta.trim(),
          password: sifre,
        })
        if (error) throw error
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: eposta.trim(),
          password: sifre,
          options: {
            data: {
              ad_soyad: adSoyad.trim(),
              // Koç dışındaki roller davet koduyla belirlenir.
              rol: koc ? 'koc' : 'ogrenci',
            },
          },
        })
        if (error) throw error
        if (!data.session) {
          setBilgi('Kayıt alındı. E-postanıza gelen bağlantıyı onaylayın.')
        }
      }
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
          <h1>
            YKS <span className="ince">Koçluk</span>
          </h1>
          <p>Program, deneme takibi ve konu ilerlemesi tek yerde.</p>
        </header>

        <div className="sekmeler">
          <button
            className={kip === 'giris' ? 'sekme sekme--etkin' : 'sekme'}
            onClick={() => {
              setKip('giris')
              setHata('')
            }}
          >
            Giriş yap
          </button>
          <button
            className={kip === 'kayit' ? 'sekme sekme--etkin' : 'sekme'}
            onClick={() => {
              setKip('kayit')
              setHata('')
            }}
          >
            Kayıt ol
          </button>
        </div>

        {kip === 'kayit' && (
          <Alan etiket="Ad soyad">
            <input
              value={adSoyad}
              onChange={(e) => setAdSoyad(e.target.value)}
              autoComplete="name"
              placeholder="Adınız ve soyadınız"
            />
          </Alan>
        )}

        <Alan etiket="E-posta">
          <input
            type="email"
            value={eposta}
            onChange={(e) => setEposta(e.target.value)}
            autoComplete="email"
            placeholder="ornek@eposta.com"
          />
        </Alan>

        <Alan etiket="Şifre" ipucu={kip === 'kayit' ? 'En az 6 karakter' : undefined}>
          <input
            type="password"
            value={sifre}
            onChange={(e) => setSifre(e.target.value)}
            autoComplete={kip === 'kayit' ? 'new-password' : 'current-password'}
            onKeyDown={(e) => e.key === 'Enter' && gonder()}
            placeholder="••••••••"
          />
        </Alan>

        {kip === 'kayit' && (
          <label className="onay">
            <input type="checkbox" checked={koc} onChange={(e) => setKoc(e.target.checked)} />
            <span>
              Koç olarak kayıt oluyorum
              <em>Öğrenci ve veliler koçlarından aldıkları davet koduyla katılır.</em>
            </span>
          </label>
        )}

        <Uyari>{hata}</Uyari>
        <Uyari tur="bilgi">{bilgi}</Uyari>

        <Dugme onClick={gonder} bekliyor={bekliyor}>
          {kip === 'giris' ? 'Giriş yap' : 'Hesap oluştur'}
        </Dugme>
      </div>
    </div>
  )
}
