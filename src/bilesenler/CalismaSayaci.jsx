import { Kart, Uyari } from './Ortak.jsx'
import { SAYAC_SURELERI, bicimle, kalanMs, useSayac, useSayacTiki } from '../lib/sayac.jsx'

/**
 * Çalışma sayacının tam görünümü. Durum artık burada değil, SayacSaglayici'da:
 * başlıktaki canlı rozet ile bu kart aynı oturumu okuyor.
 *
 * Boştaki kart bilerek tek satır. Eskiden başlık + alt başlık + üç geniş
 * düğme ile üç satır kaplıyor ve "Günün hedefleri"ni ekranın altına
 * itiyordu; sayaç günün işi değil, işin yanındaki alet.
 */
export default function CalismaSayaci() {
  const sayac = useSayac()
  const durum = sayac?.durum ?? null
  useSayacTiki(!!durum?.calisiyor)

  if (!sayac) return null

  if (!durum) {
    return (
      <Kart
        baslik='Çalışma sayacı'
        altBaslik='Süreyi seç, başla. Ekranı kapatsan da sayar.'
        eylem={
          <div className='sayac-secim'>
            {SAYAC_SURELERI.map((dk) => (
              <button key={dk} className='dugme dugme--ikincil dugme--ufak' onClick={() => sayac.basla(dk)}>
                {dk} dk
              </button>
            ))}
          </div>
        }
      >
        <Uyari tur='bilgi'>{sayac.uyari}</Uyari>
      </Kart>
    )
  }

  const kalan = kalanMs(durum)
  const oran = 1 - kalan / (durum.hedefDk * 60000)
  const C = 2 * Math.PI * 52

  return (
    <Kart baslik='Çalışma sayacı'>
      <div className='sayac-halka'>
        <svg viewBox='0 0 120 120' width='150' height='150' role='img'
             aria-label={`Kalan süre ${bicimle(kalan)}`}>
          <circle cx='60' cy='60' r='52' fill='none' stroke='#e6eef8' strokeWidth='8' />
          <circle cx='60' cy='60' r='52' fill='none' stroke='#e2571f' strokeWidth='8'
                  strokeLinecap='round' strokeDasharray={C}
                  strokeDashoffset={C * (1 - oran)} transform='rotate(-90 60 60)' />
          <text x='60' y='67' textAnchor='middle' fontSize='23' fill='currentColor'>
            {bicimle(kalan)}
          </text>
        </svg>
      </div>

      <div className='sayac-dugmeler'>
        {durum.calisiyor ? (
          <button className='dugme dugme--ikincil' onClick={sayac.duraklat}>
            Duraklat
          </button>
        ) : (
          <button className='dugme dugme--ikincil' onClick={sayac.devam}>
            Devam et
          </button>
        )}
        <button className='dugme dugme--birincil' onClick={sayac.bitir}>
          Bitir ve kaydet
        </button>
      </div>
      {!durum.calisiyor && <p className='kart-alt'>Duraklattın. Süre işlemiyor.</p>}
    </Kart>
  )
}
