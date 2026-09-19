import { Avatar } from './Fotograf.jsx'
import { MarkaIsareti } from './Marka.jsx'

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

/* Öğrencide zil yerine Çizbi'nin yüzü (Plan B, 19 Eylül 2026): bildirim,
   koç mesajı, yeni kaynak aynı gelen kutusunda; mesajları Çizbi getirir.
   Rozet amber; kırmızı yalnız acil içindir. */
function CizbiYuz() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <rect x="6" y="1.5" width="12" height="4.5" rx="2" fill="var(--g-mavi, #3b82f6)" />
      <rect x="6" y="6" width="12" height="2" fill="#b8b8b8" />
      <rect x="6" y="8" width="12" height="13" rx="1" fill="#f0a42b" />
      <circle cx="9.6" cy="13" r="2.6" fill="#fff" stroke="#5a3a12" strokeWidth="0.9" />
      <circle cx="14.4" cy="13" r="2.6" fill="#fff" stroke="#5a3a12" strokeWidth="0.9" />
      <circle cx="10" cy="13.3" r="1.3" fill="#1d1b4d" />
      <circle cx="14.8" cy="13.3" r="1.3" fill="#1d1b4d" />
      <path d="M10 17.6q2 1.6 4 0" fill="none" stroke="#5a3a12" strokeWidth="1" strokeLinecap="round" />
    </svg>
  )
}

export default function UstCubuk({ profil, rozet = 0, onLogo, onZil, onHesap, onGeri = null, zilEtkin, hesapEtkin, gelenKutusu = false, hesapGizli = false }) {
  return (
    <div className="ust-cubuk">
      <button type="button" className="ust-logo" onClick={onLogo} aria-label="Ana ekran">
        <MarkaIsareti yukseklik={18} sinif="ust-logo-isaret" />
        <span className="ust-logo-ad">Kıvanç Hoca İle Koçluk</span>
      </button>
      <div className="ust-ikonlar">
        {/* Gözle bakarken koçun tek çıkış kapısı. Bant değil, köşede tek
            satır: ekranın geri kalanı öğrencinin gördüğü ekran olarak kalsın. */}
        {onGeri && (
          <button type="button" className="ust-geri" onClick={onGeri}>
            <svg {...ikon} width={15} height={15}>
              <path d="M14 6 8.5 12l5.5 6" />
            </svg>
            Yönetime dön
          </button>
        )}
        <button
          type="button"
          className={zilEtkin ? 'ust-ikon ust-ikon--etkin' : 'ust-ikon'}
          onClick={onZil}
          aria-label={
            gelenKutusu
              ? (rozet > 0 ? `Gelen kutusu, ${rozet} yeni` : 'Gelen kutusu')
              : (rozet > 0 ? `Bildirimler, ${rozet} bekleyen` : 'Bildirimler')
          }
          aria-current={zilEtkin ? 'page' : undefined}
        >
          {gelenKutusu ? (
            <CizbiYuz />
          ) : (
            <svg {...ikon}>
              <path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z" />
              <path d="M10 20a2 2 0 0 0 4 0" />
            </svg>
          )}
          {rozet > 0 && (
            <span className={gelenKutusu ? 'ust-rozet ust-rozet--amber' : 'ust-rozet'} aria-hidden="true">
              {rozet > 9 ? '9+' : rozet}
            </span>
          )}
        </button>
        {/* Vekalette hesap düğmesi yok: yeri "Yönetime dön"ün, telefonda üçü
            birden sığmıyor, koçun avatarı da öğrencinin ekranında yabancı. */}
        {!hesapGizli && (
        <button
          type="button"
          className={hesapEtkin ? 'ust-ikon ust-ikon--hesap ust-ikon--etkin' : 'ust-ikon ust-ikon--hesap'}
          onClick={onHesap}
          aria-label="Hesap"
          aria-haspopup="dialog"
        >
          <Avatar yol={profil?.fotograf_yolu} ad={profil?.ad_soyad} boyut="orta" />
        </button>
        )}
      </div>
    </div>
  )
}
