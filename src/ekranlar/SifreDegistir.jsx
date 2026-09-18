import { useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Alan, Dugme, Uyari } from '../bilesenler/Ortak.jsx'
import SekmeTepesi from '../bilesenler/SekmeTepesi.jsx'
import Bolum from '../ortak/Bolum.jsx'

/**
 * Kendi şifreni değiştirme. Herkes için hesap menüsünden açılır (/sifre).
 *
 * `ilk`: hesap geçici şifreyle açıldıysa (ya da şifresi sıfırlandıysa)
 * girişte bu ekran gelir. Karar (Ağustos 2026): zorunlu değil, öneri —
 * "Sonra" ile geçilebilir; oturum boyunca bir daha sorulmaz.
 * (TESPIT-YONETIM.md 2.1: bu ekran bir temizlik turunda silinmişti.)
 */
export default function SifreDegistir({ ilk = false, onSonra, onBitti }) {
  const [mevcut, setMevcut] = useState('')
  const [sifre, setSifre] = useState('')
  const [tekrar, setTekrar] = useState('')
  const [goster, setGoster] = useState(false)
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState('')
  const [tamam, setTamam] = useState(false)

  async function kaydet() {
    setHata('')
    if (!mevcut) return setHata(ilk ? 'Sana verilen geçici şifreyi yaz.' : 'Mevcut şifreni yaz.')
    if (sifre.length < 8) return setHata('Şifre en az 8 karakter olmalı.')
    if (!/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(sifre) || !/\d/.test(sifre)) {
      return setHata('Şifrede en az bir harf ve bir rakam olsun.')
    }
    if (sifre !== tekrar) return setHata('İki şifre aynı değil.')
    setBekliyor(true)
    /* Supabase'de "şifre değişiminde mevcut şifre" ayarı açık: yeni şifre
       mevcut şifreyle birlikte gönderilir. */
    const { data: u, error } = await supabase.auth.updateUser({ password: sifre, current_password: mevcut })
    if (error) {
      setBekliyor(false)
      const m = error.message ?? ''
      return setHata(
        /different from the old|same/i.test(m)
          ? 'Yeni şifre eskisiyle aynı olamaz.'
          : /current password|invalid.*password|credentials/i.test(m) || error.code === 'current_password_mismatch'
            ? (ilk ? 'Geçici şifre doğru değil.' : 'Mevcut şifre doğru değil.')
            : /weak|pwned|leaked/i.test(m)
              ? 'Bu şifre çok yaygın; daha tahmin edilmesi zor bir şifre seç.'
              : hataMetni(error),
      )
    }
    if (u?.user?.id) {
      await supabase.from('profiller').update({ sifre_degistirmeli: false }).eq('id', u.user.id)
      // Erişim günlüğü (Yönetim → Teknik). Yazılamazsa şifre yine değişmiştir.
      const { data: ben } = await supabase.from('profiller').select('ad_soyad').eq('id', u.user.id).maybeSingle()
      await supabase.from('erisim_gunlugu').insert({
        yapan_id: u.user.id, hedef_id: u.user.id, olay: 'sifre_degistirdi',
        hedef_ad: ben?.ad_soyad ?? null,
      })
    }
    setBekliyor(false)
    setMevcut('')
    setSifre('')
    setTekrar('')
    setTamam(true)
  }

  return (
    <>
      <SekmeTepesi
        baslik={ilk ? 'Kendi şifreni belirle' : 'Şifremi değiştir'}
        altBaslik={
          ilk
            ? 'Hesabın geçici bir şifreyle açıldı. Yalnız senin bildiğin bir şifre belirle.'
            : 'Yeni şifre bu cihazda ve diğerlerinde bir sonraki girişte geçerli olur.'
        }
      />
      <Bolum baslik="Yeni şifre">
        {tamam ? (
          <div className="veri-yuzey sifre-tamam">
            <p className="liste-ad">Şifren değişti.</p>
            <p className="liste-alt">Bir sonraki girişte yeni şifreni kullanacaksın.</p>
            <Dugme onClick={onBitti}>Devam et</Dugme>
          </div>
        ) : (
          <div className="form-kutu form-kutu--duz">
            <Alan etiket={ilk ? 'Sana verilen geçici şifre' : 'Mevcut şifre'}>
              <input
                type={goster ? 'text' : 'password'}
                autoComplete="current-password"
                value={mevcut}
                onChange={(e) => setMevcut(e.target.value)}
              />
            </Alan>
            <Alan etiket="Yeni şifre" ipucu="En az 8 karakter; en az bir harf ve bir rakam">
              <input
                type={goster ? 'text' : 'password'}
                autoComplete="new-password"
                value={sifre}
                onChange={(e) => setSifre(e.target.value)}
              />
            </Alan>
            <Alan etiket="Yeni şifre (tekrar)">
              <input
                type={goster ? 'text' : 'password'}
                autoComplete="new-password"
                value={tekrar}
                onChange={(e) => setTekrar(e.target.value)}
              />
            </Alan>
            <label className="onay">
              <input type="checkbox" checked={goster} onChange={(e) => setGoster(e.target.checked)} />
              <span>Şifreyi göster</span>
            </label>
            <Uyari>{hata}</Uyari>
            <Dugme onClick={kaydet} bekliyor={bekliyor}>Şifreyi kaydet</Dugme>
            {ilk && onSonra && (
              <button type="button" className="metin-dugme sifre-sonra" onClick={onSonra}>
                Sonra
              </button>
            )}
          </div>
        )}
      </Bolum>
    </>
  )
}
