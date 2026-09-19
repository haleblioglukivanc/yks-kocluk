import { useEffect } from 'react'
import { Avatar } from './Fotograf.jsx'
import { kurulumuGoster, useKurulum } from '../pwa/KurulumDaveti.jsx'
import { kur, yenidenYukle } from '../pwa/pwa.js'

/**
 * Alttan açılan Hesap yaprağı.
 *
 * Üst barda dağınık duran düğmelerin yeni evi: kim olduğun, hangi
 * şapkayla baktığın (koç / yönetici), mesajlar, çıkış. Sürüm notu
 * en altta küçücük; göz önünden gitti ama sorun ayıklarken hâlâ okunur.
 */
const ROL_ADI = { koc: 'Koç', ogrenci: 'Öğrenci', veli: 'Veli', yonetici: 'Yönetici' }

const ikon = {
  viewBox: '0 0 24 24',
  width: 20,
  height: 20,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

export default function HesapYapragi({
  acik,
  onKapat,
  profil,
  eposta,
  yonetimdeMi,
  onSapka,
  onCikis,
  onGit,
}) {
  const kurulum = useKurulum()

  useEffect(() => {
    if (!acik) return
    const tus = (e) => e.key === 'Escape' && onKapat()
    document.addEventListener('keydown', tus)
    return () => document.removeEventListener('keydown', tus)
  }, [acik, onKapat])

  if (!acik) return null
  const yonetici = profil?.yonetici === true

  return (
    <div className="yaprak-arka" onClick={onKapat}>
      <div
        className="yaprak"
        role="dialog"
        aria-modal="true"
        aria-label="Hesap"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="yaprak-tutamac" aria-hidden="true" />
        <div className="hesap-kimlik">
          <Avatar yol={profil?.fotograf_yolu} ad={profil?.ad_soyad} boyut="buyuk" />
          <div>
            <strong>{profil?.ad_soyad}</strong>
            <span>{eposta || ROL_ADI[profil?.rol] || ''}</span>
          </div>
        </div>

        {yonetici && (
          <div className="sapka-secim" role="group" aria-label="Görünüm">
            <button
              type="button"
              className={yonetimdeMi ? 'sapka' : 'sapka sapka--secili'}
              onClick={() => { onSapka('koc'); onKapat() }}
            >
              Koç
            </button>
            <button
              type="button"
              className={yonetimdeMi ? 'sapka sapka--secili' : 'sapka'}
              onClick={() => { onSapka('yonetici'); onKapat() }}
            >
              Yönetici
            </button>
          </div>
        )}

        <div className="hesap-menu">
          <button type="button" className="hesap-satir" onClick={() => { onKapat(); onGit('/mesajlar') }}>
            <svg {...ikon}><path d="M4 5h16v11H9l-5 4z" /></svg>
            <span>Mesajlar</span>
            <em>›</em>
          </button>
          {/* Koçun arada bir kullandığı işler: Raporlar'daki "Araçlar" ve
              Telegram buraya taşındı (Bekir, 18 Eylül 2026). */}
          {profil?.rol === 'koc' && (
            <>
              <button type="button" className="hesap-satir" onClick={() => { onKapat(); onGit('/konular') }}>
                <svg {...ikon}><path d="M4 6h16M4 12h10M4 18h6" /></svg>
                <span>Konu öncelikleri</span>
                <em>›</em>
              </button>
              <button type="button" className="hesap-satir" onClick={() => { onKapat(); onGit('/kaynaklar') }}>
                <svg {...ikon}><path d="M5 4h10a4 4 0 0 1 4 4v12H9a4 4 0 0 1-4-4z" /><path d="M5 16a4 4 0 0 1 4-4h10" /></svg>
                <span>Kaynaklar</span>
                <em>›</em>
              </button>
              <button type="button" className="hesap-satir" onClick={() => { onKapat(); onGit('/baglantilar') }}>
                <svg {...ikon}><path d="M4 12 20 4l-6 16-3-7-7-1z" /></svg>
                <span>Telegram bağlantısı</span>
                <em>›</em>
              </button>
            </>
          )}
          <button type="button" className="hesap-satir" onClick={() => { onKapat(); onGit('/sifre') }}>
            <svg {...ikon}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
            <span>Şifremi değiştir</span>
            <em>›</em>
          </button>
          {/* Uygulama: kurulu değilse yükle; her zaman "yenile" (beyaz ekran
              ya da eski sürüm takılı kaldığında adres yazmadan çıkış yolu). */}
          {kurulum.kurulabilir && (
            <button
              type="button"
              className="hesap-satir"
              onClick={() => { onKapat(); if (kurulum.istem) kur(); else kurulumuGoster() }}
            >
              <svg {...ikon}><rect x="6" y="2.5" width="12" height="19" rx="2.5" /><path d="M12 8v6" /><path d="m9.5 11.5 2.5 2.5 2.5-2.5" /></svg>
              <span>Uygulamayı yükle</span>
              <em>›</em>
            </button>
          )}
          <button type="button" className="hesap-satir" onClick={yenidenYukle}>
            <svg {...ikon}><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" /><path d="M3 21v-5h5" /></svg>
            <span>Uygulamayı yenile</span>
          </button>
          <button type="button" className="hesap-satir hesap-satir--cikis" onClick={onCikis}>
            <svg {...ikon}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="m16 17 5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
            <span>Çıkış yap</span>
          </button>
        </div>
        <p className="hesap-surum">sürüm {__DERLEME__}</p>
      </div>
    </div>
  )
}
