import { Avatar } from './Fotograf.jsx'

/**
 * Uygulamanın tepesindeki ince şerit: sol köşede logo, sağda zil ve profil.
 *
 * Eskiden beyaz bir üst barda dört düğme (yönetim, tema, mesaj, çıkış)
 * ve altında ad soyad + sürüm satırı vardı. Tam ekran bir uygulama gibi
 * hissettirmesi için şerit koyu yüzeyle birleşti; günde bir kez
 * dokunulan şeyler Hesap yaprağına, sayı taşıyan şeyler zile taşındı.
 *
 * Şerit Bugün ekranlarında koyu başlıkla aynı yüzeyi paylaşır; diğer
 * ekranlarda tek başına koyu bir tepe olarak kalır.
 */
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

export default function UstCubuk({ profil, rozet = 0, onLogo, onZil, onHesap, zilEtkin, hesapEtkin }) {
  return (
    <div className="ust-cubuk">
      <button type="button" className="ust-logo" onClick={onLogo} aria-label="Ana ekran">
        <span className="ust-logo-isaret" aria-hidden="true">K</span>
        <span className="ust-logo-ad">Koçluk</span>
      </button>
      <div className="ust-ikonlar">
        <button
          type="button"
          className={zilEtkin ? 'ust-ikon ust-ikon--etkin' : 'ust-ikon'}
          onClick={onZil}
          aria-label={rozet > 0 ? `Bildirimler, ${rozet} bekleyen` : 'Bildirimler'}
          aria-current={zilEtkin ? 'page' : undefined}
        >
          <svg {...ikon}>
            <path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z" />
            <path d="M10 20a2 2 0 0 0 4 0" />
          </svg>
          {rozet > 0 && (
            <span className="ust-rozet" aria-hidden="true">
              {rozet > 9 ? '9+' : rozet}
            </span>
          )}
        </button>
        <button
          type="button"
          className={hesapEtkin ? 'ust-ikon ust-ikon--hesap ust-ikon--etkin' : 'ust-ikon ust-ikon--hesap'}
          onClick={onHesap}
          aria-label="Hesap"
          aria-haspopup="dialog"
        >
          <Avatar yol={profil?.fotograf_yolu} ad={profil?.ad_soyad} boyut="orta" />
        </button>
      </div>
    </div>
  )
}
