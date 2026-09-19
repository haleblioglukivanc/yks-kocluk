import { Avatar } from './Fotograf.jsx'
import { dokunulduMu, temasMetni } from '../lib/temas.js'

/* Bu satır koç tarafındaki her öğrenci listesinin ortak yapı taşı.
   Yeni bir listeye ihtiyaç olursa buradan beslensin; görsel bir karar
   tek yerde değişip her ekrana yansısın. */

const RISK_RENK = {
  iyi: 'var(--marka-yesil-acik)',
  izle: 'var(--marka-amber)',
  acil: 'var(--marka-alev)',
}

/** Satırın altındaki tek cümle. Koç "neden buradaymış" sorusunu
 *  yüzdeye bakarak çözemiyordu; en keskin sebebi yazıyoruz. */
export function sebepCumlesi(r) {
  if (!r) return 'Veri yok'
  const p = []

  if (r.hic_baslamadi) p.push('Hiç başlamadı')
  else if (r.gun_gecti >= 2) p.push(`${r.gun_gecti} gündür sessiz`)

  if (r.gecikmis_gorev > 0) p.push(`${r.gecikmis_gorev} gecikmiş görev`)

  /* Gün gece kendiliğinden kapanır; öğrenci akşam kaydını girmediyse
     eksik kapanır. Koç bunu buradan görür, kimseden bir şey istemez. */
  if (r.eksik_ust_uste >= 2) p.push(`${r.eksik_ust_uste} gündür günü tamamlamıyor`)
  else if (r.dun_tam === false && p.length < 2) p.push('dün günü tamamlamadı')

  const net = Number(r.net_farki ?? 0)
  if (net <= -5) p.push(`son denemede ${Math.round(net)} net`)
  else if (net >= 5 && p.length < 2) p.push(`son denemede +${Math.round(net)} net`)

  if (p.length === 0) {
    if (r.dun_tam === true) return 'Dün günü tamamladı'
    if (r.guncel_seri >= 3) return `${r.guncel_seri} günlük seri sürüyor`
    if (r.haftalik_gorev === 0) return 'Bu hafta görev atanmamış'
    return 'Yolunda görünüyor'
  }
  return p.slice(0, 2).join(' · ')
}

/** Sebebin ilk parçası kırmızı vurgulansın mı: sessizlik ve gecikme
 *  eyleme çağırıyor, net artışı çağırmıyor. */
function tonu(r) {
  if (!r) return 'notr'
  if (r.hic_baslamadi || r.gun_gecti >= 2 || r.gecikmis_gorev >= 5 || r.eksik_ust_uste >= 2) return 'uyari'
  if (Number(r.net_farki ?? 0) >= 5) return 'iyi'
  return 'notr'
}

/** Liste bir rehber: renk noktası + küçük fotoğraf + isim + tek satırda
 *  tek sebep. Sayı yok, çubuk yok; onlar detay kartında. Cümlenin ikinci
 *  parçası da detayda; burada yalnız en keskini. */
function tekSebep(r) {
  return sebepCumlesi(r).split(' · ')[0]
}

export default function OgrenciSatiri({ ogrenci, risk, temas = null, onAc, secili = false }) {
  const aktif = ogrenci.aktif !== false
  const ad = ogrenci.profiller?.ad_soyad ?? ogrenci.ad_soyad ?? 'İsimsiz'
  /* Koç bu öğrenciye dokunduysa (mesaj, toplu mesaj, görüşme) satır
     sönükleşir: durum gerçek kalır ama "sırada bekliyor" değildir. */
  const dokunuldu = aktif && dokunulduMu(temas)
  const temasCumlesi = aktif ? temasMetni(temas) : null
  const renk = !aktif
    ? 'var(--soluk)'
    : dokunuldu
      ? 'var(--cizgi-2)'
      : (RISK_RENK[risk?.risk_seviyesi] ?? 'var(--cizgi-2)')

  return (
    <li className="rehber-satir-sarmal">
      <button
        className={`rehber-satir${aktif ? '' : ' rehber-satir--pasif'}${dokunuldu ? ' rehber-satir--dokunuldu' : ''}${secili ? ' rehber-satir--secili' : ''}`}
        aria-current={secili ? 'true' : undefined}
        style={{ '--nokta': renk }}
        onClick={() => onAc?.(ogrenci.id)}
      >
        <i className="rehber-nokta" aria-hidden="true" />
        <Avatar yol={ogrenci.profiller?.fotograf_yolu} ad={ad} boyut="kucuk" />
        <div className="ok-orta">
          <span className="liste-ad">{ad}</span>
          <span className={`rehber-sebep${tonu(risk) === 'uyari' && aktif && !dokunuldu ? ' rehber-sebep--uyari' : ''}`}>
            {aktif ? tekSebep(risk) : 'Erişim kapalı'}
          </span>
          {temasCumlesi && (
            <span className={`rehber-temas rehber-temas--${temas.durum}`}>{temasCumlesi}</span>
          )}
        </div>
        <svg className="ok-ileri" viewBox="0 0 24 24" width="16" height="16" fill="none"
             stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m9 6 6 6-6 6" />
        </svg>
      </button>
    </li>
  )
}
