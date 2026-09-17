import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { Kart, Bos, Yukleniyor } from './Ortak.jsx'
import { haftaAraligi, kisaTarih } from '../lib/hafta.js'
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
  /* Veri gelmeden de aynı iskelet çizilir: başlık, dönem, boş gösterge.
     Önceden null dönüyordu; veri gelince üç parça birden eklenip
     sayfayı aşağı itiyordu (mobilde CLS 0.82). */
  return <Ozetler ozet={ozet} />
}

function NetGrafigi({ veri }) {
  if (!veri || veri.length < 2) {
    return <Bos ruh="dusunuyor" baslik="Sınıf eğrisi burada belirecek" aciklama="İki haftalık deneme verisi birikince çizgi kendiliğinden çizilir." />
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
      <path d={alan} fill="url(#netDolgu)" className="grafik-alan" />
      <path d={cizgi} className="grafik-cizgi" pathLength="1" fill="none" stroke={renk} strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" />
      <circle className="grafik-nokta grafik-nokta--son" cx={x(veri.length - 1)} cy={y(son)} r="4.5"
              fill={renk} stroke="#ffffff" strokeWidth="2.5" />
      <text className="grafik-etiket grafik-etiket--gec" x={x(veri.length - 1) - 8} y={Math.max(10, y(son) - 9)} textAnchor="end" fill={renk}>
        {son.toFixed(1)}
      </text>
    </svg>
  )
}

function Ozetler({ ozet }) {
  const yukleniyor = ozet == null
  const riskli = ozet?.riskliOgrenciler ?? []
  const sessiz = riskli.filter((o) => (o.gunGecti ?? 0) >= 3 || o.hicBaslamadi).length
  const tamamlama = ozet?.planTamamlama ?? 0
  const net = ozet?.sinifNetDegisimi
  const iyi = tamamlama >= 60 && !sessiz

  /* Dönem Raporlar kartındaki "Bu hafta" ile aynı: pazartesiden bugüne.
     Tarih tarayıcıda hesaplanır, veri beklemez. */
  const [bas, bit] = haftaAraligi()

  return (
    <>
      <RaporTepesi
        baslik="Bu hafta"
        altBaslik={`${kisaTarih(bas)} – ${kisaTarih(bit)}`}
        yuzde={yukleniyor ? null : tamamlama}
        deger={yukleniyor ? '–' : `%${tamamlama}`}
        etiket="Plan tamamlama"
        detay={
          yukleniyor
            ? 'Öğrenciler sayılıyor…'
            : `${ozet.aktifOgrenci ?? 0} / ${ozet.toplamOgrenci ?? 0} öğrenci aktif${sessiz ? ` · ${sessiz} kişi 3 gündür yok` : ''}`
        }
        durum={yukleniyor ? 'bekliyor' : iyi ? 'iyi' : 'dikkat'}
        durumMetni={yukleniyor ? '\u00a0' : iyi ? 'Yolunda' : 'Dikkat'}
      />

      <Kart
        baslik="Sınıf ortalaması net"
        altBaslik={
          yukleniyor
            ? 'Hesaplanıyor…'
            : net == null
              ? 'Geçen haftayla karşılaştırma için yeterli veri yok'
              : `Geçen haftaya göre ${net > 0 ? '+' : ''}${Number(net).toFixed(1)} net`
        }
      >
        <div className="net-yer">
          {yukleniyor ? <Yukleniyor satir={3} /> : <NetGrafigi veri={ozet.netTrendi} />}
        </div>
      </Kart>
    </>
  )
}
