import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { Yukleniyor } from './Ortak.jsx'
import Bolum from '../ortak/Bolum.jsx'
import BosDurum from '../ortak/BosDurum.jsx'

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
  /* Veri gelmeden de aynı iskelet çizilir: başlık, dönem, boş gösterge.
     Önceden null dönüyordu; veri gelince üç parça birden eklenip
     sayfayı aşağı itiyordu (mobilde CLS 0.82). */
  return <Ozetler ozet={ozet} />
}

function NetGrafigi({ veri }) {
  if (!veri || veri.length < 2) {
    return <BosDurum metin="Karşılaştırma için iki haftalık deneme gerekiyor; henüz yok." />
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
  const renk = son >= Number(veri[0].ort) ? 'var(--grafik-yukselen)' : 'var(--grafik-dusen)'

  return (
    <svg
      className="net-grafik"
      viewBox={`0 0 ${G} ${Y}`}
      role="img"
      aria-label={`Sınıf ortalaması net grafiği, son değer ${son.toFixed(1)}`}
    >
      <defs>
        <linearGradient id="netDolgu" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: renk }} stopOpacity="0.32" />
          <stop offset="100%" style={{ stopColor: renk }} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={alan} fill="url(#netDolgu)" className="grafik-alan" />
      <path d={cizgi} className="grafik-cizgi" pathLength="1" fill="none" style={{ stroke: renk }} strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" />
      <circle className="grafik-nokta grafik-nokta--son" cx={x(veri.length - 1)} cy={y(son)} r="4.5"
              style={{ fill: renk, stroke: 'var(--beyaz)' }} strokeWidth="2.5" />
      <text className="grafik-etiket grafik-etiket--gec" x={x(veri.length - 1) - 8} y={Math.max(10, y(son) - 9)} textAnchor="end">
        {son.toFixed(1)}
      </text>
    </svg>
  )
}

/* Raporlar'daki sınıf net bölümü. Plan tamamlama göstergesi buradan
   kalktı: Raporlar'ın üst bloğu seçilen dönemin tek sayısını gösteriyor
   (eskiden burada haftalık %86, aşağıda dönemlik %100 — iki sayı çelişiyordu). */
function Ozetler({ ozet }) {
  const yukleniyor = ozet == null
  const net = ozet?.sinifNetDegisimi
  return (
    <Bolum
      cizgili
      baslik="Sınıf ortalaması net"
      aciklama={
        yukleniyor
          ? 'Hesaplanıyor…'
          : net == null
            ? null
            : `Geçen haftaya göre ${net > 0 ? '+' : ''}${Number(net).toFixed(1)} net`
      }
    >
      <div className="net-yer">
        {yukleniyor ? <Yukleniyor satir={3} /> : <NetGrafigi veri={ozet.netTrendi} />}
      </div>
    </Bolum>
  )
}
