import { useEffect, useState } from 'react'
import { aboneMi, aboneOl, abonelikIptal, kurulumGerekli } from '../lib/bildirim.js'
import { Avatar } from './Fotograf.jsx'

/**
 * Alttan açılan Hesap yaprağı.
 *
 * Üst barda dağınık duran düğmelerin yeni evi: kim olduğun, hangi
 * şapkayla baktığın (koç / yönetici), gece görünümü, çıkış. Sürüm notu
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
  mod,
  onMod,
  yonetimdeMi,
  onSapka,
  onCikis,
  onGit,
}) {
  useEffect(() => {
    if (!acik) return
    const tus = (e) => e.key === 'Escape' && onKapat()
    document.addEventListener('keydown', tus)
    return () => document.removeEventListener('keydown', tus)
  }, [acik, onKapat])

  if (!acik) return null
  const yonetici = profil?.rol === 'yonetici'

  const [bildirim, setBildirim] = useState(null)   // null: bilinmiyor
  const [bildirimNotu, setBildirimNotu] = useState(null)
  useEffect(() => {
    if (!acik) return
    let iptal = false
    aboneMi().then((v) => { if (!iptal) setBildirim(v) })
    return () => { iptal = true }
  }, [acik])

  async function bildirimDegistir() {
    setBildirimNotu(null)
    if (bildirim) {
      await abonelikIptal()
      setBildirim(false)
      return
    }
    if (kurulumGerekli()) {
      setBildirimNotu('iPhone\'da önce paylaş düğmesinden "Ana Ekrana Ekle" de, sonra buradan aç.')
      return
    }
    const h = await aboneOl(profil.id)
    if (h) { setBildirimNotu(h); return }
    setBildirim(true)
  }

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
          <button type="button" className="hesap-satir" onClick={onMod} role="switch" aria-checked={mod === 'gece'}>
            <svg {...ikon}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
            <span>Gece görünümü</span>
            <i className={mod === 'gece' ? 'anahtar anahtar--acik' : 'anahtar'} aria-hidden="true" />
          </button>
          <button type="button" className="hesap-satir" onClick={bildirimDegistir} role="switch" aria-checked={Boolean(bildirim)}>
            <svg {...ikon}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10 21h4" /></svg>
            <span>Bildirimler{bildirimNotu ? <small className="hesap-not">{bildirimNotu}</small> : null}</span>
            <i className={bildirim ? 'anahtar anahtar--acik' : 'anahtar'} aria-hidden="true" />
          </button>
          <button type="button" className="hesap-satir" onClick={() => { onKapat(); onGit('/mesajlar') }}>
            <svg {...ikon}><path d="M4 5h16v11H9l-5 4z" /></svg>
            <span>Mesajlar</span>
            <em>›</em>
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
