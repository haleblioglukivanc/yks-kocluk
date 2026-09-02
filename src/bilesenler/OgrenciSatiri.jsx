import { Avatar } from './Fotograf.jsx'

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

export function sonDurum(r) {
  if (!r) return 'Veri yok'
  if (r.hic_baslamadi || r.gun_gecti == null) return 'yeni'
  if (r.gun_gecti === 0) return 'bugün'
  if (r.gun_gecti === 1) return 'dün'
  return `${r.gun_gecti} gün`
}

/** Son 7 günün günlük tamamlama oranı. Tek yüzde "ne kadar" der,
 *  bu şerit "ne zaman" der: hangi gün çalıştı, ne zaman bıraktı. */
export function Nabiz({ dizi, ad }) {
  const g = Array.isArray(dizi) && dizi.length === 7 ? dizi : [0, 0, 0, 0, 0, 0, 0]
  const gunAdi = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']
  const bugun = new Date().getDay()
  const etiket = g
    .map((v, i) => `${gunAdi[(bugun - 6 + i + 7) % 7]} %${v}`)
    .join(', ')

  return (
    <span className="nabiz" role="img" aria-label={`${ad} son 7 gün: ${etiket}`}>
      {g.map((v, i) => (
        <span key={i} className={`nabiz-gun${i === 6 ? ' nabiz-gun--bugun' : ''}`}>
          <i style={{ height: `${Math.max(v, 0)}%` }} />
        </span>
      ))}
    </span>
  )
}

/** Satır = isim + tek sebep cümlesi + nabız. Yüzde, durum kelimesi ve
 *  satır içi eylemler kaldırıldı: satıra dokunmak tek işi yapar, detayı
 *  açar. Eylemler detay kartındaki menüde. */
export default function OgrenciSatiri({ ogrenci, risk, nabiz, onAc }) {
  const aktif = ogrenci.aktif !== false
  const ad = ogrenci.profiller?.ad_soyad ?? ogrenci.ad_soyad ?? 'İsimsiz'
  const renk = aktif ? (RISK_RENK[risk?.risk_seviyesi] ?? 'var(--cizgi-2)') : 'var(--soluk)'

  return (
    <li className="ogr-satir-sarmal">
      <button
        className={`ogrenci-kutu${aktif ? '' : ' ogrenci-kutu--pasif'}`}
        style={{ '--serit': renk }}
        onClick={() => onAc?.(ogrenci.id)}
      >
        <Avatar yol={ogrenci.profiller?.fotograf_yolu} ad={ad} />
        <div className="ok-orta">
          <span className="liste-ad">{ad}</span>
          <span className={`ok-sebep ok-sebep--${tonu(risk)}`}>
            {aktif ? sebepCumlesi(risk) : 'Erişim kapalı'}
          </span>
        </div>
        {aktif && <Nabiz dizi={nabiz} ad={ad} />}
        <svg className="ok-ileri" viewBox="0 0 24 24" width="16" height="16" fill="none"
             stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m9 6 6 6-6 6" />
        </svg>
      </button>
    </li>
  )
}
