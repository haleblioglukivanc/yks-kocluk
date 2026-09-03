import { useEffect } from 'react'
import { Kalem, KALEM_ADI } from './Kalem.jsx'
import { maskotuDevral } from '../lib/maskotNobeti.js'

/**
 * Veli panelinin başlığı: koç ve öğrenciyle aynı koyu yüzey.
 * Tek soruya cevap verir: çocuğum bu hafta nasıl?
 * Sayılar cümlenin içinde ve yalnız burada; altındaki kartlar sayı
 * tekrarlamaz. Koçun yayınlamadığı hiçbir şey buraya gelmez.
 */
const RUH = { yukseliyor: 'sevinc', sabit: 'bekliyor', dusuyor: 'dusunuyor' }
const GIDISAT = { yukseliyor: 'Gidişat iyi.', sabit: 'Gidişat sabit.', dusuyor: 'Bu hafta biraz geride kaldı.' }

const sure = (dk = 0) => {
  const s = Math.floor(dk / 60)
  const d = dk % 60
  if (s && d) return `${s} saat ${d} dakika`
  if (s) return `${s} saat`
  return `${d} dakika`
}

function cumle(ozet, cocukAdi) {
  if (!ozet) {
    return cocukAdi
      ? `${cocukAdi} için haftanın özeti henüz hazır değil. Koç hazırladığında burada göreceksin.`
      : 'Bağlı bir öğrenci görünmüyor. Koçtan aldığın davet kodunu kontrol et.'
  }
  const ad = (ozet.ogrenciAdi ?? '').split(' ')[0] || 'Öğrenci'
  const devam = ozet.devam ?? 0
  const parcalar = [`${ad} bu hafta planının %${devam}'ini tamamladı`]
  if (ozet.dakika > 0) parcalar.push(`${sure(ozet.dakika)} çalıştı`)
  return `${parcalar.join(', ')}. ${GIDISAT[ozet.trend] ?? GIDISAT.sabit}`
}

export default function VeliBasligi({ ozet, cocukAdi }) {
  useEffect(() => maskotuDevral(), [])
  const ruh = ozet ? RUH[ozet.trend] ?? 'bekliyor' : 'bekliyor'
  return (
    <section className="hero-yuzey ob" aria-label={`${KALEM_ADI} ve haftanın özeti`}>
      <div className="ob-ust">
        <div className="ob-kalem" aria-hidden="true">
          <Kalem ruh={ruh} boyut={76} />
        </div>
        <div className="ob-soz">
          <p className="ob-mesaj" role="status">{cumle(ozet, cocukAdi)}</p>
        </div>
      </div>
    </section>
  )
}
