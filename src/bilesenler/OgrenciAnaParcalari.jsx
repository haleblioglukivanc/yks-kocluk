import { useFotograf } from './Fotograf.jsx'
import { useMevsim } from '../lib/mevsim.js'
import { YolCizimi, DenemeCizimi } from '../ortak/KapiCizimleri.jsx'
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

/* Yol ve Denemeler kapıları (22 Eylül 2026, mokap onaylı): koçun tabela ve
   posta kutusu gibi kendi çizimleri; altında gerçek veriden tek cümle. */
export function Kapilar({ ogrenciId, denemeler = [], onYol, onDenemeler }) {
  const mevsim = useMevsim()
  const [konu, setKonu] = useState(null)
  const [seri, setSeri] = useState(0)
  const [tekrar, setTekrar] = useState(0)
  useEffect(() => {
    if (!ogrenciId) return
    let iptal = false
    const bugun = yerelIso(new Date())
    Promise.all([
      supabase.from('konu_ilerleme').select('durum').eq('ogrenci_id', ogrenciId),
      supabase.from('seriler').select('guncel_seri, son_aktif_gun').eq('ogrenci_id', ogrenciId).maybeSingle(),
      supabase.from('hata_defteri').select('id', { count: 'exact', head: true }).eq('ogrenci_id', ogrenciId).is('ogrenildi', null).lte('sonraki_tekrar', bugun),
    ]).then(([k, s, h]) => {
      if (iptal) return
      const liste = k.data ?? []
      setKonu({ toplam: liste.length, biten: liste.filter((x) => x.durum === 'tamamlandi').length })
      /* Seri yalnız aktivite olunca güncelleniyor; dünden eskiyse kopmuştur. */
      const son = s.data?.son_aktif_gun
      setSeri(son && son >= gunEkle(bugun, -1) ? s.data.guncel_seri ?? 0 : 0)
      setTekrar(h.count ?? 0)
    })
    return () => { iptal = true }
  }, [ogrenciId])
  const son = denemeler[0] ?? null
  const onceki = denemeler.find((d, i) => i > 0 && d.tur === son?.tur) ?? null
  const fark = son && onceki ? Number(son.toplam_net) - Number(onceki.toplam_net) : null
  const netler = [...denemeler].filter((d) => d.tur === son?.tur).slice(0, 4).reverse().map((d) => Number(d.toplam_net))
  const net = (n) => Number(n).toFixed(2).replace(/0$/, '').replace('.', ',')
  return (
    <section className="ana-kapilar" aria-label="Yol ve Denemeler">
      <button type="button" className="ana-kapi" onClick={onYol}>
        <YolCizimi mevsim={mevsim} oran={konu?.toplam ? konu.biten / konu.toplam : 0} seri={seri} />
        <b>Yol</b>
        <span>
          {!konu ? ' ' : konu.toplam === 0 ? 'Konu konu nerede olduğun, sıradaki durak.' : `${konu.toplam} konudan ${konu.biten}'${konu.biten === 1 ? 'i' : 'u'} bitti.`}
        </span>
      </button>
      <button type="button" className="ana-kapi" onClick={onDenemeler}>
        <DenemeCizimi mevsim={mevsim} netler={netler} />
        <b>Denemeler</b>
        <span>
          {son
            ? `Son ${String(son.tur ?? '').toUpperCase()} ${net(son.toplam_net)} net${fark ? ` ${fark > 0 ? '▲' : '▼'}${net(Math.abs(fark))}` : ''}${tekrar ? ` · ${tekrar} tekrar bekliyor` : ''}.`
            : 'Henüz deneme yok. İlk denemeni ekle, net çizgin başlasın.'}
        </span>
      </button>
    </section>
  )
}

/* Koçun notunda koçun yüzü: fotoğrafı varsa o, yoksa baş harfleri. */
function KocYuzu({ kocId }) {
  const [yol, setYol] = useState(null)
  useEffect(() => {
    if (!kocId) return
    let iptal = false
    supabase.from('profiller').select('fotograf_yolu').eq('id', kocId).maybeSingle().then(({ data }) => {
      if (!iptal) setYol(data?.fotograf_yolu ?? null)
    })
    return () => { iptal = true }
  }, [kocId])
  const foto = useFotograf(yol)
  return <span className="koc-notu-yuz">{foto ? <img className="portre-foto" src={foto} alt="" /> : 'KH'}</span>
}

export function KocNotu({ kocMesaji }) {
  if (!kocMesaji) return null
  return (
    <section className="ana-bolum ana-kart koc-notu" aria-label="Koçundan mesaj">
      <div className="koc-notu-ust">
        <KocYuzu kocId={kocMesaji.mesaj.gonderen_id} />
        <span className="koc-notu-kim">Kıvanç Hoca{kocMesaji.mesaj.olusturuldu ? ` · ${new Date(kocMesaji.mesaj.olusturuldu).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}` : ''}</span>
      </div>
      <p>{kocMesaji.mesaj.icerik}</p>
      <button type="button" className="ana-dugme ana-dugme--ikincil" disabled={kocMesaji.kapaniyor} onClick={kocMesaji.okudum}>
        Okudum
      </button>
    </section>
  )
}
