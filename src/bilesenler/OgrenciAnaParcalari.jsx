import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import Gidisat, { sureYaz, gunAyYaz } from '../ortak/Gidisat.jsx'
import { gunEkle, yerelIso } from '../lib/hafta.js'

/* Öğrenci ana sayfasının koçla ortak iskeletteki parçaları (21 Eylül 2026):
   Gidişatın (kendi verisi), Yol ve Denemeler kapıları, koçun notu. */

export function OgrenciGidisati({ ogrenciId, tazele = 0 }) {
  const [donem, setDonem] = useState('bugun')
  const [veri, setVeri] = useState(null)
  const bugun = yerelIso(new Date())

  useEffect(() => {
    let iptal = false
    const bas = gunEkle(bugun, -29)
    Promise.all([
      supabase.from('gorevler').select('tarih, durum, tur, yapilan_adet').eq('ogrenci_id', ogrenciId).gte('tarih', bas).lte('tarih', bugun),
      supabase.from('calisma_oturumlari').select('sure_dk, baslangic').eq('ogrenci_id', ogrenciId).gte('baslangic', `${bas}T00:00:00`),
      supabase.from('deneme_ozet').select('tarih').eq('ogrenci_id', ogrenciId).gte('tarih', bas),
    ]).then(([g, o, d]) => {
      if (iptal) return
      if (g.error || o.error) { setVeri(false); return }
      setVeri({
        gorevler: g.data ?? [],
        oturumlar: (o.data ?? []).map((x) => ({ ...x, tarih: yerelIso(new Date(x.baslangic)) })),
        denemeler: d.data ?? [],
      })
    })
    return () => { iptal = true }
  }, [ogrenciId, bugun, tazele])

  let sonuc
  if (veri === null) sonuc = { yukleniyor: true }
  else if (veri === false) sonuc = { bos: { baslik: 'Gidişatın şu an yüklenemedi.', metin: 'Bağlantını kontrol edip sayfayı yenile.' } }
  else {
    /* Veri başlangıcı: ilk plan ya da ilk sayaç. Öncesi "veri yok". */
    const tarihler = [...veri.gorevler.map((x) => x.tarih), ...veri.oturumlar.map((x) => x.tarih)].sort()
    const ilkGun = tarihler[0] ?? null
    const gunSayisi = ilkGun ? Math.round((new Date(`${bugun}T00:00:00`) - new Date(`${ilkGun}T00:00:00`)) / 86400000) + 1 : 0
    const bas = donem === 'bugun' ? bugun : donem === 'hafta' ? gunEkle(bugun, -6) : gunEkle(bugun, -29)

    if (donem === 'ay' && gunSayisi < 30) {
      sonuc = {
        not: 'Son 30 gün.',
        bos: ilkGun
          ? { baslik: `30 günlük görünüm ${gunAyYaz(gunEkle(ilkGun, 29))} tarihinde dolar.`, metin: `Çalışmaya ${gunAyYaz(ilkGun)} tarihinde başladın. Eksik günleri tahminle doldurmuyoruz.` }
          : { baslik: 'Henüz kayıt yok.', metin: 'İlk işini bitirdiğinde burası dolmaya başlar.' },
      }
    } else {
      const aralik = (x) => x.tarih >= bas && x.tarih <= bugun
      const gor = veri.gorevler.filter(aralik)
      const otr = veri.oturumlar.filter(aralik)
      const den = veri.denemeler.filter(aralik)
      const biten = gor.filter((x) => x.durum === 'tamamlandi')
      const dk = otr.reduce((a, x) => a + (x.sure_dk ?? 0), 0)
      const soru = biten.reduce((a, x) => a + (x.yapilan_adet ?? 0), 0)
      const seriBas = ilkGun && ilkGun > bas ? ilkGun : bas
      const gunler = []
      for (let t = seriBas; t <= bugun; t = gunEkle(t, 1)) gunler.push(t)
      const gunluk = (f) => (donem === 'bugun' || gunler.length < 2 ? null : gunler.map(f))
      sonuc = {
        not:
          donem === 'bugun'
            ? 'Bugün, sayaç ve bitirdiğin işlerden.'
            : ilkGun && ilkGun > bas
              ? `Son 7 gün. Başlangıcın ${gunAyYaz(ilkGun)}, ${gunSayisi} gün var.`
              : donem === 'hafta' ? 'Son 7 gün.' : 'Son 30 gün.',
        kartlar: [
          { ikon: 'sure', etiket: 'Çalışma süresi', deger: sureYaz(dk), alt: 'Sayaçla ölçülen süre.', seri: gunluk((t) => otr.filter((x) => x.tarih === t).reduce((a, x) => a + (x.sure_dk ?? 0), 0)) },
          gor.length
            ? { ikon: 'tamam', etiket: 'Biten iş', deger: `${biten.length} / ${gor.length}`, alt: biten.length === gor.length ? 'Hepsi bitti.' : `${gor.length - biten.length} iş bekliyor.`, seri: gunluk((t) => biten.filter((x) => x.tarih === t).length) }
            : { ikon: 'tamam', etiket: 'Biten iş', deger: 'Yok', alt: 'Bu dönemde planlı iş yok.', sonuk: true },
          { ikon: 'soru', etiket: 'Çözülen soru', deger: String(soru), alt: 'Bitirdiğin soru işlerinden.' },
          den.length
            ? { ikon: 'deneme', etiket: 'Deneme', deger: String(den.length), alt: 'Bu dönemde girdiğin deneme.' }
            : { ikon: 'deneme', etiket: 'Deneme', deger: 'Yok', alt: 'Bu dönemde deneme girmedin.', sonuk: true },
        ],
      }
    }
  }

  return <Gidisat baslik="Gidişatın" donem={donem} onDonem={setDonem} {...sonuc} />
}

export function Kapilar({ denemeler = [], onYol, onDenemeler }) {
  const son = denemeler[0] ?? null
  return (
    <section className="ana-kapilar" aria-label="Yol ve Denemeler">
      <button type="button" className="ana-kapi" onClick={onYol}>
        <svg className="ana-kapi-cizim" viewBox="0 0 150 70" aria-hidden="true">
          <path d="M10 60 C 40 60 30 30 62 30 S 96 8 140 12" fill="none" stroke="var(--cizgi-2)" strokeWidth="4" strokeLinecap="round" strokeDasharray="1 9" />
          <circle cx="10" cy="60" r="7" fill="var(--m-vurgu)" />
          <circle className="ana-kapi-durak" cx="62" cy="30" r="6" fill="var(--yuzey)" stroke="var(--m-vurgu)" strokeWidth="3" />
          <circle cx="104" cy="16" r="5" fill="var(--yuzey)" stroke="var(--cizgi-2)" strokeWidth="2.5" />
          <circle cx="140" cy="12" r="5" fill="var(--yuzey)" stroke="var(--cizgi-2)" strokeWidth="2.5" />
        </svg>
        <b>Yol</b>
        <span>Konu konu nerede olduğun, sıradaki durak.</span>
      </button>
      <button type="button" className="ana-kapi" onClick={onDenemeler}>
        <span className="ana-kapi-cubuklar" aria-hidden="true">
          <i style={{ height: 22 }} /><i style={{ height: 34 }} /><i style={{ height: 28 }} /><i style={{ height: 46 }} />
        </span>
        <b>Denemeler</b>
        <span>
          {son
            ? `Son deneme ${gunAyYaz(son.tarih)}: ${Number(son.toplam_net).toFixed(1).replace('.', ',')} net. Hata defterin de burada.`
            : 'Henüz deneme yok. İlk denemeni ekle, net çizgin başlasın.'}
        </span>
      </button>
    </section>
  )
}

export function KocNotu({ kocMesaji }) {
  if (!kocMesaji) return null
  return (
    <section className="ana-bolum ana-kart koc-notu" aria-label="Koçundan mesaj">
      <span className="koc-notu-kim">Kıvanç Hoca yazdı</span>
      <p>{kocMesaji.mesaj.icerik}</p>
      <button type="button" className="ana-dugme ana-dugme--ikincil" disabled={kocMesaji.kapaniyor} onClick={kocMesaji.okudum}>
        Okudum
      </button>
    </section>
  )
}
