import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { Kart } from './Ortak.jsx'
import RaporTepesi from './RaporTepesi.jsx'

/**
 * Sınıfın "bak" katmanı: plan tamamlama, aktif öğrenci, net trendi.
 *
 * Koç panelinin açılışından buraya, Raporlar'ın tepesine taşındı. Panel
 * "bugün kime dokunmalıyım" sorusuna cevap verir (risk radarı, onay
 * kuyruğu); bu sayılar o soruya cevap değil, haftalık bakışın parçası.
 * Veriyi kendi çekiyor: koc_panel_ozeti başlık için zaten hesaplanıyor,
 * burada ikinci ekranda tekrar çağrılması sorun değil.
 */
export default function SinifOzeti() {
  const [ozet, setOzet] = useState(null)
  useEffect(() => {
    let iptal = false
    supabase.rpc('koc_panel_ozeti').then(({ data }) => {
      if (!iptal && data) setOzet(data)
    })
    return () => {
      iptal = true
    }
  }, [])
  if (!ozet) return null
  return <Ozetler ozet={ozet} />
}

function NetGrafigi({ veri }) {
  if (!veri || veri.length < 2) {
    return <p className="kart-alt">Grafik için en az iki haftalık deneme verisi gerekiyor.</p>
  }

  const G = 300
  const Y = 130
  const kenar = 10
  const degerler = veri.map((d) => Number(d.ort))
  const enAz = Math.min(...degerler) - 4
  const enCok = Math.max(...degerler) + 4
  const x = (i) => kenar + (i * (G - kenar * 2)) / (veri.length - 1)
  const y = (v) => Y - kenar - ((v - enAz) / (enCok - enAz)) * (Y - kenar * 2)

  const cizgi = veri.map((d, i) => `${i ? 'L' : 'M'}${x(i)} ${y(Number(d.ort))}`).join(' ')
  const alan = `${cizgi} L${x(veri.length - 1)} ${Y} L${x(0)} ${Y} Z`
  const son = Number(veri[veri.length - 1].ort)
  // Yükselen eğri mavi, düşen eğri turuncu: renk yönü de anlatsın
  const renk = son >= Number(veri[0].ort) ? '#1f63c4' : '#e2571f'

  return (
    <svg
      className="net-grafik"
      viewBox={`0 0 ${G} ${Y}`}
      role="img"
      aria-label={`Sınıf ortalaması net grafiği, son değer ${son.toFixed(1)}`}
    >
      <defs>
        <linearGradient id="netDolgu" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={renk} stopOpacity="0.32" />
          <stop offset="100%" stopColor={renk} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={alan} fill="url(#netDolgu)" />
      <path d={cizgi} fill="none" stroke={renk} strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(veri.length - 1)} cy={y(son)} r="4.5"
              fill={renk} stroke="#ffffff" strokeWidth="2.5" />
    </svg>
  )
}

function Ozetler({ ozet }) {
  const riskli = ozet.riskliOgrenciler ?? []
  const sessiz = riskli.filter((o) => (o.gunGecti ?? 0) >= 3 || o.hicBaslamadi).length
  const tamamlama = ozet.planTamamlama ?? 0
  const net = ozet.sinifNetDegisimi

  /* İki KPI kartı tepeye girdi: gösterge plan tamamlama, altındaki satır
     aktif öğrenci. Durum rengi eskisi gibi: 60 altı dikkat. */
  const bugun = new Date()
  const haftaOnce = new Date(bugun)
  haftaOnce.setDate(bugun.getDate() - 6)
  const kisa = (d) => d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })

  return (
    <>
      <RaporTepesi
        baslik="Bu hafta"
        altBaslik={`${kisa(haftaOnce)} – ${kisa(bugun)}`}
        yuzde={tamamlama}
        deger={`%${tamamlama}`}
        etiket="Plan tamamlama"
        detay={`${ozet.aktifOgrenci ?? 0} / ${ozet.toplamOgrenci ?? 0} öğrenci aktif${sessiz ? ` · ${sessiz} kişi 3 gündür yok` : ''}`}
        durum={tamamlama >= 60 && !sessiz ? 'iyi' : 'dikkat'}
        durumMetni={tamamlama >= 60 && !sessiz ? 'Yolunda' : 'Dikkat'}
      />

      <Kart
        baslik="Sınıf ortalaması net"
        altBaslik={
          net == null
            ? 'Geçen haftayla karşılaştırma için yeterli veri yok'
            : `Geçen haftaya göre ${net > 0 ? '+' : ''}${Number(net).toFixed(1)} net`
        }
      >
        <NetGrafigi veri={ozet.netTrendi} />
      </Kart>
    </>
  )
}
