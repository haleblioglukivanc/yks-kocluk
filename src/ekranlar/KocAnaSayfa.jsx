import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import AnaTepe from '../ortak/AnaTepe.jsx'
import Gidisat, { sureYaz, gunAyYaz } from '../ortak/Gidisat.jsx'
import KararKuyrugu from '../bilesenler/KararKuyrugu.jsx'
import VeliMesajlari from '../bilesenler/VeliMesajlari.jsx'
import OgrenciNabzi from '../bilesenler/OgrenciNabzi.jsx'
import { gunEkle, yerelIso } from '../lib/hafta.js'

/* Koçun tek ekranı (21 Eylül 2026, mevsimsel tasarım). Alt menü, Rapor
   ve Öğrenciler sekmeleri kalktı; hepsi burada, tek sırayla:
   tepe → dikkat gerektirenler → öğrencilerim → gidişat.
   Kıvanç'ın Excel'i sevmesinin sebebi her şeyi tek sayfada görmesi. */

const bugunTarih = () =>
  new Date()
    .toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })
    .replace(/^(\d+ \S+) (\S+)$/, '$2, $1')

function selamVer(ad) {
  const s = new Date().getHours()
  const ilk = (ad ?? '').split(' ')[0]
  const kok = s < 5 ? 'İyi geceler' : s < 12 ? 'Günaydın' : s < 18 ? 'İyi günler' : 'İyi akşamlar'
  return ilk ? `${kok} ${ilk}` : kok
}

/* Tepedeki tek cümle: kaç öğrenci yolunda, önce kime bakılmalı. */
function ozetCumlesi(riskler) {
  if (!riskler) return ' '
  if (riskler.length === 0) return 'Henüz öğrencin yok. İlk öğrencini Yönetim’den ekleyebilirsin.'
  const iyi = riskler.filter((r) => r.risk_seviyesi === 'iyi').length
  const bas = iyi === 0
    ? `${riskler.length} öğrencinin hepsi bugün bir göz istiyor.`
    : iyi === riskler.length
      ? `${riskler.length} öğrencinin hepsi bugün yolunda.`
      : `${riskler.length} öğrenciden ${iyi} tanesi bugün yolunda.`
  const oncelik = [...riskler]
    .filter((r) => r.risk_seviyesi === 'acil')
    .sort((a, b) => (b.risk_ham ?? 0) - (a.risk_ham ?? 0))[0]
  if (!oncelik) return bas
  const ilk = (oncelik.ad_soyad ?? '').split(' ')[0]
  const sessiz = oncelik.sessiz_gun ?? 0
  return sessiz >= 2 ? `${bas} ${ilk} ${sessiz} gündür sessiz.` : `${bas} Önce ${ilk}’e bak.`
}

function useKocGidisati(donem) {
  const [ilkGun, setIlkGun] = useState(undefined)
  const [veri, setVeri] = useState(null)
  const bugun = yerelIso(new Date())

  /* Veri başlangıcı: son 30 günde ilk çalışılan gün. Bundan önceki
     günler "veri yok"tur; sıfır diye çizilmez. */
  useEffect(() => {
    let iptal = false
    supabase.rpc('rapor_ozeti', { p_baslangic: gunEkle(bugun, -29), p_bitis: bugun }).then(({ data }) => {
      if (iptal) return
      const ilk = (data?.gunluk ?? []).find((g) => (g.dakika ?? 0) > 0)
      setIlkGun(ilk?.tarih ?? null)
    })
    return () => { iptal = true }
  }, [bugun])

  useEffect(() => {
    let iptal = false
    setVeri(null)
    const bas = donem === 'bugun' ? bugun : donem === 'hafta' ? gunEkle(bugun, -6) : gunEkle(bugun, -29)
    supabase.rpc('rapor_ozeti', { p_baslangic: bas, p_bitis: bugun }).then(({ data, error }) => {
      if (!iptal) setVeri(error ? false : { ...data, bas })
    })
    return () => { iptal = true }
  }, [donem, bugun])

  if (veri === null || ilkGun === undefined) return { yukleniyor: true }
  if (veri === false) return { bos: { baslik: 'Gidişat şu an yüklenemedi.', metin: 'Bağlantıyı kontrol edip sayfayı yenile.' } }

  const g = veri.genel ?? {}
  const ogr = veri.ogrenciler ?? []
  const gunSayisi = ilkGun ? Math.round((new Date(`${bugun}T00:00:00`) - new Date(`${ilkGun}T00:00:00`)) / 86400000) + 1 : 0

  if (donem === 'ay' && gunSayisi < 30) {
    return {
      not: 'Son 30 gün.',
      bos: ilkGun
        ? {
            baslik: `30 günlük görünüm ${gunAyYaz(gunEkle(ilkGun, 29))} tarihinde dolar.`,
            metin: `Gerçek veri ${gunAyYaz(ilkGun)} tarihinde başladı. Eksik günleri tahminle doldurmuyoruz; o zamana kadar 7 günlük görünüme bak.`,
          }
        : { baslik: 'Henüz çalışma kaydı yok.', metin: 'Öğrenciler sayaç başlattıkça burası dolmaya başlar.' },
    }
  }

  const seriBas = ilkGun && ilkGun > veri.bas ? ilkGun : veri.bas
  const seri = donem === 'bugun' ? null : (veri.gunluk ?? []).filter((x) => x.tarih >= seriBas).map((x) => x.dakika ?? 0)
  const calisan = ogr.filter((o) => (o.dakika ?? 0) > 0).length

  let not
  if (donem === 'bugun') not = `Bugün, ${g.ogrenci_sayisi ?? ogr.length} öğrencinin toplamı.`
  else if (ilkGun && ilkGun > veri.bas) not = `Son 7 gün. Veri başlangıcı ${gunAyYaz(ilkGun)}, ${gunSayisi} gün var.`
  else if (!ilkGun) not = 'Son 7 gün. Henüz çalışma kaydı yok.'
  else not = donem === 'hafta' ? 'Son 7 gün.' : 'Son 30 gün.'

  return {
    not,
    kartlar: [
      (g.gorev_toplam ?? 0) > 0
        ? { ikon: 'tamam', etiket: 'Görev tamamlama', deger: `%${Math.round(g.tamamlama_yuzdesi ?? 0)}`, alt: `${g.gorev_tamam ?? 0} / ${g.gorev_toplam} görev bitti.` }
        : { ikon: 'tamam', etiket: 'Görev tamamlama', deger: 'Yok', alt: 'Bu dönemde görev yok.', sonuk: true },
      { ikon: 'sure', etiket: 'Çalışma süresi', deger: sureYaz(g.toplam_dakika ?? 0), alt: 'Sayaçla ölçülen süre.', seri: seri && seri.length >= 2 ? seri : null },
      { ikon: 'kisi', etiket: 'Çalışan öğrenci', deger: `${calisan} / ${g.ogrenci_sayisi ?? ogr.length}`, alt: 'En az bir dakika sayaç açan.' },
      (g.deneme_sayisi ?? 0) > 0
        ? { ikon: 'deneme', etiket: 'Deneme', deger: String(g.deneme_sayisi), alt: 'Bu dönemde girilen deneme.' }
        : { ikon: 'deneme', etiket: 'Deneme', deger: 'Yok', alt: 'Bu dönemde deneme girilmedi.', sonuk: true },
    ],
  }
}

export default function KocAnaSayfa({ profil, onOgrenciAc, tepe }) {
  const [riskler, setRiskler] = useState(null)
  const [donem, setDonem] = useState('bugun')
  const gidisat = useKocGidisati(donem)

  useEffect(() => {
    let iptal = false
    ;(async () => {
      const { data: oturum } = await supabase.auth.getSession()
      const benimId = oturum?.session?.user?.id
      if (!benimId) return
      const { data } = await supabase
        .from('ogrenci_risk')
        .select('ogrenci_id, ad_soyad, risk_seviyesi, risk_ham, sessiz_gun')
        .eq('koc_id', benimId)
      if (!iptal) setRiskler(data ?? [])
    })()
    return () => { iptal = true }
  }, [])

  return (
    <div className="ana-sayfa ana-sayfa--koc">
      <AnaTepe
        selam={selamVer(profil?.ad_soyad)}
        tarih={bugunTarih()}
        ozet={ozetCumlesi(riskler)}
        {...tepe}
      />
      <div className="ana-govde">
        <div className="ana-ust-izgara">
          <section className="ana-bolum ana-kart dikkat" aria-label="Dikkat gerektirenler">
            <div className="ana-bolum-bas">
              <h2>Dikkat gerektirenler</h2>
            </div>
            <KararKuyrugu onOgrenciAc={onOgrenciAc} kompakt />
            <VeliMesajlari />
          </section>
          <Gidisat donem={donem} onDonem={setDonem} {...gidisat} />
        </div>
        <OgrenciNabzi onOgrenciAc={onOgrenciAc} />
      </div>
    </div>
  )
}
