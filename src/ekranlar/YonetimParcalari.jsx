import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { Uyari, Yukleniyor } from '../bilesenler/Ortak.jsx'
import Bolum from '../ortak/Bolum.jsx'
import { Tahsilat, Ayarlar, Sistem, Vekalet } from './YoneticiPaneli.jsx'
import Basvurular from '../bilesenler/Basvurular.jsx'
import SosyalKutusu from '../bilesenler/SosyalKutusu.jsx'
import SmsKaydi from '../bilesenler/SmsKaydi.jsx'
import Veliler from '../bilesenler/Veliler.jsx'
import KvkkTalepleri from '../bilesenler/KvkkTalepleri.jsx'
import HaftalikTakvim from '../bilesenler/HaftalikTakvim.jsx'
import Entegrasyonlar from '../bilesenler/Entegrasyonlar.jsx'
import EpostaKaydi from '../bilesenler/EpostaKaydi.jsx'
import ErisimGunlugu from '../bilesenler/ErisimGunlugu.jsx'

/* Yönetim paneli kalktı (22 Eylül 2026, Bekir): tek koç aynı zamanda
   yönetici. Parçalar koçun profilindeki satırlardan açılan sayfalara
   dağıldı; bu dosya onların içeriği. Teknik kayıtlar yalnız /sistem
   adresinde, hiçbir menüde yok. İş büyüyüp ikinci koç gelirse
   YoneticiPaneli.jsx yeniden bağlanabilir. */

function useRpc(ad, args) {
  const [veri, setVeri] = useState(undefined)
  const [hata, setHata] = useState('')
  useEffect(() => {
    let iptal = false
    supabase.rpc(ad, args).then(({ data, error }) => {
      if (iptal) return
      if (error) setHata(error.message)
      setVeri(data ?? null)
    })
    return () => { iptal = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ad])
  return { veri, hata }
}

export function BasvurularSayfasi() {
  return <Basvurular />
}

export function SosyalSayfasi() {
  return (
    <>
      <SosyalKutusu />
      <SmsKaydi />
    </>
  )
}

export function IlhamSayfasi() {
  return <HaftalikTakvim />
}

export function KutuphaneSayfasi({ onGit }) {
  return <Ayarlar onGit={onGit} />
}

export function OdemelerSayfasi({ onOgrenciAc }) {
  const { veri, hata } = useRpc('yonetici_tahsilat_ozeti')
  if (hata) return <Uyari>{hata}</Uyari>
  if (veri === undefined) return <Yukleniyor />
  return <Tahsilat t={veri} onOgrenciAc={onOgrenciAc} />
}

export function KvkkSayfasi() {
  const { veri, hata } = useRpc('yonetici_ogrenci_listesi')
  if (hata) return <Uyari>{hata}</Uyari>
  if (veri === undefined) return <Yukleniyor />
  return (
    <>
      <Veliler />
      <KvkkTalepleri ogrenciler={veri ?? []} />
    </>
  )
}

export function SistemSayfasi() {
  const sistem = useRpc('yonetici_sistem_durumu')
  const vekalet = useRpc('yonetici_vekalet_kayitlari', { p_limit: 8 })
  return (
    <>
      <Entegrasyonlar />
      {sistem.veri !== undefined && sistem.veri && <Sistem s={sistem.veri} />}
      <EpostaKaydi />
      <ErisimGunlugu />
      {vekalet.veri !== undefined && <Vekalet liste={vekalet.veri} />}
      <Bolum cizgili baslik="Sürüm" aciklama="Canlıdaki derleme; her gönderimde Cloudflare yeniden derler.">
        <p className="liste-alt">derleme {__DERLEME__}</p>
      </Bolum>
    </>
  )
}
