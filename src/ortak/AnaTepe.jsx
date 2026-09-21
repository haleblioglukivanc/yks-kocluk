import Manzara from './Manzara.jsx'
import { useMevsim, MEVSIM_ADI } from '../lib/mevsim.js'
import { MevsimDali, MevsimIsareti } from './MevsimSahnesi.jsx'

const SLOGAN = { sonbahar: 'Odaklan, derinleş, güçlen.', kis: 'Sakinlikte güç var.', ilkbahar: 'Yenilen, birlikte büyü.', yaz: 'Daha fazlası mümkün.' }

/* Ana sayfanın tepesi — koçta ve öğrencide aynı iskelet (21 Eylül 2026):
   mevsim manzarası, marka, sağ üstte bildirim + hesap, altında tarih,
   selam ve tek cümlelik özet. Alt menü kalktığı için hesap menüsü
   (Yönetim, profil, çıkış) buradaki yuvarlak düğmeden açılır. */

function KhIsareti() {
  return (
    <svg className="ana-marka-isaret" width="38" height="38" viewBox="0 0 38 38" aria-hidden="true">
      <rect width="38" height="38" rx="11" fill="var(--murekkep)" />
      <path d="M10 9v20M10.5 19L20 10M10.5 19L20 28M29 9v20M20 19h9" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <path d="M20 9v20" stroke="var(--altin)" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  )
}

const ZIL = (
  <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </svg>
)
const KUTU = (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 5h16v11H9l-5 4z" />
  </svg>
)

export default function AnaTepe({
  selam,
  tarih,
  ozet,
  rozet = 0,
  gelenKutusu = false,
  onZil,
  onHesap,
  hesapHarf = '',
  ekDugme = null,
  children = null,
  onGeri = null,
  sagCizim = null,
}) {
  const mevsim = useMevsim()
  return (
    <header className={children ? 'ana-tepe ana-tepe--kapili' : 'ana-tepe'} data-mevsim={mevsim}>
      <Manzara mevsim={mevsim} />
      {sagCizim ? <div className="ana-tepe-cizim">{typeof sagCizim === 'function' ? sagCizim(mevsim) : sagCizim}</div> : <MevsimDali mevsim={mevsim} />}
      <div className="ana-tepe-ic">
        <div className="ana-tepe-ust">
          {onGeri && (
            <button type="button" className="ana-yuvarlak" onClick={onGeri} aria-label="Ana ekrana dön">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
            </button>
          )}
          <div className="ana-marka">
            <KhIsareti />
            <span className="ana-marka-ad">
              <b>Kıvanç Hoca</b>
              <span>İle Koçluk</span>
            </span>
          </div>
          <div className="ana-tepe-eylem">
            {ekDugme}
            {onZil && (
              <button
                type="button"
                className="ana-yuvarlak"
                onClick={onZil}
                aria-label={
                  gelenKutusu
                    ? rozet > 0 ? `Gelen kutusu, ${rozet} yeni` : 'Gelen kutusu'
                    : rozet > 0 ? `Bildirimler, ${rozet} yeni` : 'Bildirimler'
                }
              >
                {gelenKutusu ? KUTU : ZIL}
                {rozet > 0 && <span className={gelenKutusu ? 'ana-rozet ana-rozet--sakin' : 'ana-rozet'}>{rozet > 9 ? '9+' : rozet}</span>}
              </button>
            )}
            {onHesap && (
              <button type="button" className="ana-yuvarlak ana-yuvarlak--hesap" onClick={onHesap} aria-label="Hesap menüsü">
                {hesapHarf}
              </button>
            )}
          </div>
        </div>
        <div className="ana-selam">
          <div className="ana-ust-satir">
            <span className="ana-mevsim">
              <MevsimIsareti mevsim={mevsim} boyut={16} />
              {MEVSIM_ADI[mevsim]}<span className="ana-slogan">, {SLOGAN[mevsim]}</span>
            </span>
            {tarih && <span className="ana-tarih">{tarih}</span>}
          </div>
          <h1>{selam}</h1>
          {ozet && <p className="ana-ozet">{ozet}</p>}
        </div>
      </div>
      {typeof children === 'function' ? children(mevsim) : children}
    </header>
  )
}
