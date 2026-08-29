import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { Kart } from '../bilesenler/Ortak.jsx'
import RiskRadari from '../bilesenler/RiskRadari.jsx'

/** Koçun günlük durum ekranı. Öğrenci listesi ayrı sekmede;
 *  burası "bugün ne oluyor" sorusuna cevap verir. */
export default function KocPaneli({ onOgrenciAc }) {
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

  return (
    <div className="panel">
      {ozet && <Ozetler ozet={ozet} />}
      <RiskRadari onOgrenciAc={onOgrenciAc} />
    </div>
  )
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

  return (
    <svg
      className="net-grafik"
      viewBox={`0 0 ${G} ${Y}`}
      role="img"
      aria-label={`Sınıf ortalaması net grafiği, son değer ${son.toFixed(1)}`}
    >
      <path d={alan} fill="#4a90e2" opacity="0.14" />
      <path d={cizgi} fill="none" stroke="#4a90e2" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(veri.length - 1)} cy={y(son)} r="4.5"
              fill="#4a90e2" stroke="#1e1f23" strokeWidth="2.5" />
    </svg>
  )
}

function Ozetler({ ozet }) {
  const riskli = ozet.riskliOgrenciler ?? []
  const sessiz = riskli.filter((o) => (o.gunGecti ?? 0) >= 3 || o.hicBaslamadi).length
  const net = ozet.sinifNetDegisimi

  return (
    <>
      <div className="kpi-satir">
        <div>
          <p className="kpi-etiket">Plan tamamlama</p>
          <p className="kpi-sayi">%{ozet.planTamamlama ?? 0}</p>
          <p className="kpi-alt">son 7 gün</p>
        </div>
        <div>
          <p className="kpi-etiket">Aktif öğrenci</p>
          <p className="kpi-sayi">
            {ozet.aktifOgrenci ?? 0}/{ozet.toplamOgrenci ?? 0}
          </p>
          <p className={`kpi-alt ${sessiz ? 'kpi-alt--kotu' : 'kpi-alt--iyi'}`}>
            {sessiz ? `${sessiz} kişi 3 gündür yok` : 'herkes bu hafta aktif'}
          </p>
        </div>
      </div>

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
