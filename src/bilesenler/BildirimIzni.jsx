import { useEffect, useState } from 'react'
import { Kalem, KALEM_ADI } from './Kalem.jsx'
import {
  aboneOl, izinEkraniGerekliMi, izinEkraniniErtele, kurulumGerekli, kuruluMu,
} from '../lib/bildirim.js'

/* Bildirim izni ekranı.

   Tek ekran, iki hâl: iPhone'da uygulama henüz ana ekranda değilse iki
   adım (ekle, sonra izin ver); kuruluysa veya Android'deyse tek adım.
   Kâmil anlatır, tek mavi buton. İlk girişte bir kez; "sonra" denirse üç
   gün sonra bir daha; sonra yalnız Hesap yaprağından. */

const ikonPaylas = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3v13M7 8l5-5 5 5M5 14v6h14v-6" />
  </svg>
)

export default function BildirimIzni({ profil }) {
  const [gorunur, setGorunur] = useState(false)
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState(null)

  useEffect(() => {
    setGorunur(izinEkraniGerekliMi())
  }, [])

  if (!gorunur || !profil) return null

  const ad = (profil.ad_soyad || '').split(' ')[0]
  const kurulumLazim = kurulumGerekli()
  const ogrenci = profil.rol === 'ogrenci'
  const soz = kurulumLazim
    ? `Merhaba ${ad}! ${ogrenci ? 'Koçun' : 'Biri'} mesaj yazınca haberin olsun istersen iki küçük adım var. Ben yanındayım.`
    : ogrenci
      ? `Merhaba ${ad}! Koçun mesaj yazınca ya da bir görevin açık kalınca sana haber vereyim mi?`
      : `Merhaba ${ad}! Yeni mesaj ve onay bekleyen işler için sana haber vereyim mi?`

  const ertele = () => { izinEkraniniErtele(); setGorunur(false) }

  const ac = async () => {
    if (kurulumLazim) {
      /* iOS'ta "adımları yaptım" demek kurulumdan sonraki açılışta
         sorulacağı anlamına gelir; burada izin isteyemeyiz. */
      ertele()
      return
    }
    setBekliyor(true)
    const h = await aboneOl(profil.id)
    setBekliyor(false)
    if (h) { setHata(h); return }
    setGorunur(false)
  }

  return (
    <div className="izin" role="dialog" aria-modal="true" aria-label="Bildirim izni">
      <div className="izin-tepe">
        <Kalem ruh="anlatiyor" boyut={52} />
        <p className="izin-balon">{soz}</p>
      </div>
      <div className="izin-govde">
        {kurulumLazim ? (
          <>
            <div className="izin-adim izin-adim--acik">
              <span className="izin-no">1</span>
              <div>
                <b>Uygulamayı ana ekrana ekle</b>
                <p>Alttaki paylaş düğmesine dokun, "Ana Ekrana Ekle"yi seç.</p>
                <span className="izin-ipucu">{ikonPaylas} Paylaş düğmesi ekranın altında</span>
              </div>
            </div>
            <div className="izin-adim">
              <span className="izin-no">2</span>
              <div>
                <b>Ana ekrandan aç, izin ver</b>
                <p>Yeni ikondan açınca bir soru çıkacak. "İzin ver" de, bu kadar.</p>
              </div>
            </div>
          </>
        ) : (
          <>
            {kuruluMu() && (
              <div className="izin-adim izin-adim--bitti">
                <span className="izin-no">✓</span>
                <div><b>Uygulama yüklü</b><p>Ana ekranındaki ikondan açtın.</p></div>
              </div>
            )}
            <div className="izin-adim izin-adim--acik">
              <span className="izin-no">{kuruluMu() ? '2' : '1'}</span>
              <div>
                <b>Bildirimlere izin ver</b>
                <p>Butona basınca telefon soracak. {ogrenci ? 'Günde en fazla bir hatırlatma gelir, gece gelmez.' : 'Gece bildirim gelmez.'}</p>
              </div>
            </div>
          </>
        )}
        {hata && <p className="izin-hata">{hata}</p>}
        <button type="button" className="dugme dugme--birincil izin-dugme" onClick={ac} disabled={bekliyor}>
          {kurulumLazim ? 'Adımları yaptım, devam et' : bekliyor ? 'Soruluyor…' : 'Bildirimleri aç'}
        </button>
        <button type="button" className="izin-gec" onClick={ertele}>Şimdi değil, sonra hatırlat</button>
        <p className="izin-not">{KALEM_ADI} yalnızca görev hatırlatması yapar; mesajlar gönderenin adıyla gelir.</p>
      </div>
    </div>
  )
}
