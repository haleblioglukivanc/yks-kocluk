import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import AnaTepe from '../ortak/AnaTepe.jsx'
import { sureYaz, gunAyYaz } from '../ortak/Gidisat.jsx'
import SahneKapilari from '../ortak/SahneKapilari.jsx'
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

const GUN = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']
const DONEM = [['bugun', 'Bugün'], ['hafta', '7 gün'], ['ay', '30 gün']]

/* Sahnenin altı: tek şeritte dört sayı ve son 7 günün çalışma çubukları.
   Kart yığını yok; sahne ekranın yıldızı kalsın. */
function GidisatSeridi({ donem, onDonem, g }) {
  const enCok = Math.max(1, ...(g.son7 ?? []).map((x) => x.dakika))
  return (
    <section className="gs" aria-label="Gidişat">
      <div className="ana-bolum-bas">
        <h2>Gidişat</h2>
        <div className="ana-anahtar" role="group" aria-label="Dönem">
          {DONEM.map(([k, ad]) => (
            <button key={k} type="button" aria-pressed={donem === k} onClick={() => onDonem(k)}>{ad}</button>
          ))}
        </div>
      </div>
      {g.yukleniyor ? (
        <div className="gs-serit gs-serit--bekle" aria-busy="true" />
      ) : g.bos ? (
        <div className="gd-bos"><strong>{g.bos.baslik}</strong><span>{g.bos.metin}</span></div>
      ) : (
        <>
          <div className="gs-serit">
            {g.kartlar.map((k) => (
              <div key={k.kisa}>
                <b className={k.sonuk ? 'gd-deger--sonuk' : ''}>{k.deger}</b>
                <span>{k.kisa}</span>
              </div>
            ))}
          </div>
          {g.not && <p className="ana-bolum-not">{g.not}</p>}
        </>
      )}
      <div className="gs-hafta" role="img" aria-label={`Son 7 gün çalışma: ${(g.son7 ?? []).map((x) => (x.veriYok ? 'veri yok' : sureYaz(x.dakika))).join(', ')}`}>
        <span className="gs-hafta-baslik">Son 7 gün çalışma</span>
        <div className="gs-cubuklar">
          {(g.son7 ?? []).map((x) => (
            <div key={x.tarih} className="gs-gun">
              <div className={x.veriYok ? 'gs-kutu gs-kutu--yok' : 'gs-kutu'}>
                {!x.veriYok && <i style={{ height: `${Math.max(x.dakika > 0 ? 8 : 0, Math.round((x.dakika / enCok) * 100))}%` }} />}
              </div>
              <span className={x.bugun ? 'gs-gun-ad gs-gun-ad--bugun' : 'gs-gun-ad'}>{x.bugun ? 'Bugün' : GUN[new Date(`${x.tarih}T00:00:00`).getDay()]}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function KocAnaSayfa({ profil, onGit, tepe }) {
  const [riskler, setRiskler] = useState(null)
  const [isler, setIsler] = useState(null)
  const [donem, setDonem] = useState('bugun')
  const gidisat = useKocGidisati(donem)

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

  return (
    <div className="ana-sayfa ana-sayfa--koc">
      <AnaTepe selam={selamVer(profil?.ad_soyad)} tarih={bugunTarih()} ozet={ozet} {...tepe}>
        {(mevsim) => (
          <SahneKapilari
            mevsim={mevsim}
            ogrenciler={sirali.map((r) => ({ bas: basHarf(r.ad_soyad), durum: r.risk_seviyesi }))}
            ogrenciEtiket={ogrenciEtiket}
            isSayisi={isler?.length ?? 0}
            acilVar={acil.length > 0}
            onOgrenciler={() => onGit('/ogrencilerim')}
            onYapilacaklar={() => onGit('/yapilacaklar')}
          />
        )}
      </AnaTepe>
      <div className="ana-govde ana-govde--dar">
        <GidisatSeridi donem={donem} onDonem={setDonem} g={gidisat} />
      </div>
    </div>
  )
}

/* Posta kutusunun arkası: karar kartları tek tek (eski "Dikkat gerektirenler"). */
export function YapilacaklarEkrani({ onOgrenciAc }) {
  return (
    <div className="ana-govde ana-govde--dar alt-ekran">
      <section className="ana-bolum ana-kart dikkat" aria-label="Yapılacaklar">
        <div className="ana-bolum-bas"><h2>Yapılacaklar</h2></div>
        <KararKuyrugu onOgrenciAc={onOgrenciAc} />
        <VeliMesajlari />
      </section>
    </div>
  )
}

/* Tabelanın arkası: öğrenciler, bugünün işleri ve 7 günlük ritim. */
export function OgrencilerimEkrani({ onOgrenciAc }) {
  return (
    <div className="ana-govde alt-ekran">
      <OgrenciNabzi onOgrenciAc={onOgrenciAc} />
    </div>
  )
}
