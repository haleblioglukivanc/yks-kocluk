import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import AnaTepe from '../ortak/AnaTepe.jsx'
import { TabelaCizimi, PostaKutusuCizimi, PortreCizimi } from '../ortak/KapiCizimleri.jsx'
import { useFotograf } from '../bilesenler/Fotograf.jsx'
import { useMevsim } from '../lib/mevsim.js'
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
  const [otuz, setOtuz] = useState([])
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
      setOtuz(data?.gunluk ?? [])
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

  /* Son 7 günün çubukları: veri başlangıcından önceki gün "veri yok". */
  const son7 = Array.from({ length: 7 }, (_, i) => {
    const t = gunEkle(bugun, i - 6)
    const g = otuz.find((x) => x.tarih === t)
    return { tarih: t, dakika: g?.dakika ?? 0, veriYok: !ilkGun || t < ilkGun, bugun: t === bugun }
  })
  if (veri === null || ilkGun === undefined) return { yukleniyor: true, son7 }
  if (veri === false) return { son7, bos: { baslik: 'Gidişat şu an yüklenemedi.', metin: 'Bağlantıyı kontrol edip sayfayı yenile.' } }

  const g = veri.genel ?? {}
  const ogr = veri.ogrenciler ?? []
  const gunSayisi = ilkGun ? Math.round((new Date(`${bugun}T00:00:00`) - new Date(`${ilkGun}T00:00:00`)) / 86400000) + 1 : 0

  if (donem === 'ay' && gunSayisi < 30) {
    return {
      son7,
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
    son7,
    not,
    kartlar: [
      (g.gorev_toplam ?? 0) > 0
        ? { kisa: 'görev', ikon: 'tamam', etiket: 'Görev tamamlama', deger: `%${Math.round(g.tamamlama_yuzdesi ?? 0)}`, alt: `${g.gorev_tamam ?? 0} / ${g.gorev_toplam} görev bitti.` }
        : { kisa: 'görev', ikon: 'tamam', etiket: 'Görev tamamlama', deger: 'Yok', alt: 'Bu dönemde görev yok.', sonuk: true },
      { kisa: 'çalışma', ikon: 'sure', etiket: 'Çalışma süresi', deger: sureYaz(g.toplam_dakika ?? 0), alt: 'Sayaçla ölçülen süre.', seri: seri && seri.length >= 2 ? seri : null },
      { kisa: 'çalışan', ikon: 'kisi', etiket: 'Çalışan öğrenci', deger: `${calisan} / ${g.ogrenci_sayisi ?? ogr.length}`, alt: 'En az bir dakika sayaç açan.' },
      (g.deneme_sayisi ?? 0) > 0
        ? { kisa: 'deneme', ikon: 'deneme', etiket: 'Deneme', deger: String(g.deneme_sayisi), alt: 'Bu dönemde girilen deneme.' }
        : { kisa: 'deneme', ikon: 'deneme', etiket: 'Deneme', deger: 'Yok', alt: 'Bu dönemde deneme girilmedi.', sonuk: true },
    ],
  }
}

function KocPortresi({ profil, mevsim }) {
  const foto = useFotograf(profil?.fotograf_yolu)
  const bas = (profil?.ad_soyad ?? '').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toLocaleUpperCase('tr')
  return <PortreCizimi mevsim={mevsim} foto={foto} bas={bas} durum={null} idEk="kocana" />
}

export default function KocAnaSayfa({ profil, onGit, tepe }) {
  const [riskler, setRiskler] = useState(null)
  const [isler, setIsler] = useState(null)
  const [donem, setDonem] = useState('bugun')
  const gidisat = useKocGidisati(donem)
  const mevsim = useMevsim()

  useEffect(() => {
    let iptal = false
    ;(async () => {
      const { data: oturum } = await supabase.auth.getSession()
      const benimId = oturum?.session?.user?.id
      if (!benimId) return
      const [r, k] = await Promise.all([
        supabase.from('ogrenci_risk').select('ogrenci_id, ad_soyad, risk_seviyesi, risk_ham, sessiz_gun').eq('koc_id', benimId),
        supabase.rpc('koc_karar_kuyrugu', { p_limit: 99 }),
      ])
      if (iptal) return
      setRiskler(r.data ?? [])
      setIsler((k.data ?? []).filter((x) => x.tip !== 'tebrik'))
    })()
    return () => { iptal = true }
  }, [])

  /* Tepedeki tek cümle: bekleyen iş varsa ondan, yoksa öğrencilerden. */
  let ozet = ozetCumlesi(riskler)
  const acil = (isler ?? []).filter((x) => x.segment === 'acil')
  if (isler && isler.length) {
    const ilk = (acil[0] ?? isler[0]).ad?.split(' ')[0]
    const acilMetin = acil.length === 0 ? '' : acil.length === isler.length ? ', hepsi acil' : `, ${acil.length} tanesi acil`
    ozet = `${isler.length} iş bekliyor${acilMetin}. Önce ${ilk}.`
  }

  const sirali = [...(riskler ?? [])].sort((a, b) => (b.risk_ham ?? 0) - (a.risk_ham ?? 0))
  const dikkat = sirali.filter((r) => r.risk_seviyesi !== 'iyi').length
  const iyi = sirali.length - dikkat
  const ogrenciEtiket = !riskler
    ? 'Öğrencilerim'
    : sirali.length === 0 ? 'Öğrenci yok' : dikkat === 0 ? 'Hepsi yolunda' : iyi === 0 ? `${dikkat} dikkat istiyor` : `${dikkat} dikkat, ${iyi} yolunda`
  const basHarf = (ad) => (ad ?? '').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toLocaleUpperCase('tr')

  const isSayisi = isler?.length ?? 0
  const veliSayisi = (isler ?? []).filter((x) => x.tip === 'veli_ozet').length
  const isMetni = !isler
    ? ' '
    : isSayisi === 0
      ? 'Bekleyen iş yok. Bugünlük bu kadar.'
      : [acil.length ? `${acil.length} acil` : null, veliSayisi ? `${veliSayisi} veli özeti` : null, isSayisi - acil.length - veliSayisi > 0 ? `${isSayisi - acil.length - veliSayisi} karar` : null].filter(Boolean).join(', ') + `. Önce ${(acil[0] ?? isler[0]).ad?.split(' ')[0]}.`

  return (
    <div className="ana-sayfa ana-sayfa--koc">
      {/* Sağda Kıvanç'ın fotoğraf çerçevesi; çerçeveye ya da selama dokununca
          koçun profil sayfası açılır (22 Eylül 2026, Bekir). */}
      <AnaTepe
        selam={selamVer(profil?.ad_soyad)}
        tarih={bugunTarih()}
        ozet={ozet}
        {...tepe}
        onBaslik={() => onGit('/profil')}
        sagCizim={(mevsim) => (
          <button type="button" className="od-portre" onClick={() => onGit('/profil')} aria-label="Profilim">
            <KocPortresi profil={profil} mevsim={mevsim} />
          </button>
        )}
      />
      <div className="ana-govde ana-govde--dar">
        {/* Kapılar (22 Eylül 2026, Bekir): Dikkat gerektirenler'in yerinde
            iki kart; öğrenci ekranındaki Yol / Denemeler kartlarının eşi. */}
        <section className="ana-kapilar" aria-label="Öğrencilerim ve Yapılacaklar">
          <button type="button" className="ana-kapi" onClick={() => onGit('/ogrencilerim')}>
            <TabelaCizimi mevsim={mevsim} ogrenciler={sirali.map((r) => ({ bas: basHarf(r.ad_soyad), durum: r.risk_seviyesi }))} />
            <b>Öğrencilerim</b>
            <span>{ogrenciEtiket === 'Öğrencilerim' ? ' ' : `${sirali.length} öğrenci: ${ogrenciEtiket}.`}</span>
          </button>
          <button type="button" className="ana-kapi" onClick={() => onGit('/yapilacaklar')}>
            <PostaKutusuCizimi mevsim={mevsim} sayi={isSayisi} acil={acil.length > 0} />
            <b>Yapılacaklar</b>
            <span>{isMetni}</span>
          </button>
        </section>
        <Gidisat donem={donem} onDonem={setDonem} {...gidisat} />
      </div>
    </div>
  )
}

/* Posta kutusunun arkası (22 Eylül 2026, Bekir): ekran ana ekranla aynı
   kalır; sahnenin sağ üstünde posta kutusu, altında karar kartları. */
export function YapilacaklarEkrani({ onOgrenciAc, tepe }) {
  const [isler, setIsler] = useState(null)
  useEffect(() => {
    let iptal = false
    supabase.rpc('koc_karar_kuyrugu', { p_limit: 99 }).then(({ data }) => {
      if (!iptal) setIsler((data ?? []).filter((x) => x.tip !== 'tebrik'))
    })
    return () => { iptal = true }
  }, [])
  const acil = (isler ?? []).filter((x) => x.segment === 'acil').length
  const n = isler?.length ?? 0
  const ozet = !isler ? ' ' : n === 0 ? 'Posta kutusu boş. Bugünlük bu kadar.' : `${n} iş bekliyor${acil ? `, ${acil === n ? 'hepsi' : `${acil} tanesi`} acil` : ''}.`
  return (
    <div className="ana-sayfa ana-sayfa--koc">
      <AnaTepe
        selam="Yapılacaklar"
        tarih={bugunTarih()}
        ozet={ozet}
        {...tepe}
        sagCizim={(mevsim) => <PostaKutusuCizimi mevsim={mevsim} sayi={n} acil={acil > 0} zemin={false} />}
      />
      <div className="ana-govde ana-govde--dar">
        <section className="ana-bolum ana-kart dikkat" aria-label="Yapılacaklar">
          <KararKuyrugu onOgrenciAc={onOgrenciAc} />
          <VeliMesajlari />
        </section>
      </div>
    </div>
  )
}

/* Tabelanın arkası: aynı ekran; sağ üstte tabela, altında öğrenciler. */
export function OgrencilerimEkrani({ onOgrenciAc, onMesaj, tepe }) {
  const [riskler, setRiskler] = useState(null)
  useEffect(() => {
    let iptal = false
    ;(async () => {
      const { data: oturum } = await supabase.auth.getSession()
      const benimId = oturum?.session?.user?.id
      if (!benimId) return
      const { data } = await supabase.from('ogrenci_risk').select('ogrenci_id, ad_soyad, risk_seviyesi, risk_ham, sessiz_gun').eq('koc_id', benimId)
      if (!iptal) setRiskler(data ?? [])
    })()
    return () => { iptal = true }
  }, [])
  const sirali = [...(riskler ?? [])].sort((a, b) => (b.risk_ham ?? 0) - (a.risk_ham ?? 0))
  const basHarf = (ad) => (ad ?? '').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toLocaleUpperCase('tr')
  return (
    <div className="ana-sayfa ana-sayfa--koc">
      <AnaTepe
        selam="Öğrencilerim"
        tarih={bugunTarih()}
        ozet={ozetCumlesi(riskler)}
        {...tepe}
        sagCizim={(mevsim) => <TabelaCizimi mevsim={mevsim} zemin={false} ogrenciler={sirali.map((r) => ({ bas: basHarf(r.ad_soyad), durum: r.risk_seviyesi }))} />}
      />
      <div className="ana-govde ana-govde--dar">
        <OgrenciNabzi onOgrenciAc={onOgrenciAc} onMesaj={onMesaj} />
      </div>
    </div>
  )
}
