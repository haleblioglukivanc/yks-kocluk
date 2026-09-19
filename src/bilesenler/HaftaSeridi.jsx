import { useCallback, useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Kart, Uyari } from './Ortak.jsx'
import GunHedefleri from './GunHedefleri.jsx'
import { gunEkle } from '../lib/tarih.js'
import GunSeridi from '../ortak/GunSeridi.jsx'

/**
 * Hafta şeridi: Program sekmesinin yerini aldı.
 *
 * Öğrencinin "bugün ne var, yarın ne var" sorusuna tam ızgara fazla
 * geliyordu; ızgara koçun planlama aracı, orada kalıyor. Burada yedi gün
 * bir şerit, altında seçili günün listesi. Bugün seçiliyken liste
 * panelin canlı verisinden (ozet.gorevler) çizilir ki tik anında
 * Sıradaki kartı ve Çizbi'yle aynı sayıyı görsün; diğer günler haftalık
 * sorgudan gelir. İki durumda da aynı GunHedefleri.
 */

const KISA_GUN = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

/* Izgaranın join'li satırını GunHedefleri'nin düz satırına çevirir;
   ogrenci_bugun_ozeti de aynı düz şekli veriyor. */
/* Başka bir günün listesi de Bugün ile aynı kartı besliyor; koç damgası
   iki kaynakta da aynı adla çıkmalı ki kart tek bir alan tanısın. */
function duzlestir(g, ogrenciId) {
  return {
    ...g,
    koc_isaretledi: Boolean(g.islem_yapan) && g.islem_yapan !== ogrenciId,
    ders: g.dersler?.ad ?? null,
    konu: g.konular?.ad ?? null,
    kaynak_ad: g.kaynaklar?.ad ?? null,
    kaynak_bicim: g.kaynaklar?.bicim ?? null,
    kaynak_url: g.kaynaklar?.url ?? null,
    kaynak_dosya: g.kaynaklar?.dosya_yolu ?? null,
  }
}

/* Şerit artık kendi başına bir bölüm değil, görev kartının başlığı:
   dokunduğun gün aynı kartın içinde açılıyor. Seçim yukarıda tutuluyor
   (secili / onSec) ve o günün listesi onListe ile yukarı veriliyor. */
export default function HaftaSeridi({ ogrenciId, haftaBasi, bugun, bugunGorevler, onDegisti, secili, onSec, onListe }) {
  /* Açılışta kapalı: şerit yalnız yedi gün ve noktalar. Bir güne dokununca
     o günün listesi altından açılır; aynı güne tekrar dokununca kapanır.
     Ekran ilk açıldığında bir cümle, bir kart, bir düğme görünsün diye. */
  const [hafta, setHafta] = useState([])
  const [hata, setHata] = useState('')

  /* İki hafta birden yükleniyor ve şerit yanal kaydırılıyor: ayrı bir
     "sonraki hafta" düğmesi ya kartı uzatıyor ya günleri daraltıyordu.
     Ders şeridinde de aynı davranış var, öğrenci yeni bir şey öğrenmiyor. */
  const basi = haftaBasi ?? null
  const gunler = basi ? Array.from({ length: 14 }, (_, i) => gunEkle(basi, i)) : []
  const haftalar = [gunler.slice(0, 7), gunler.slice(7)]

  const yukle = useCallback(async () => {
    if (!ogrenciId || !basi) return
    const { data, error } = await supabase
      .from('gorevler')
      .select(
        'id, tarih, periyot, tur, baslik, aciklama, hedef_adet, yapilan_adet, durum, islem_yapan, kaynak_aralik, baslangic_saat, bitis_saat, dersler(ad), konular(ad), kaynaklar(ad, bicim, url, dosya_yolu)',
      )
      .eq('ogrenci_id', ogrenciId)
      .gte('tarih', basi)
      .lte('tarih', gunEkle(basi, 13))
      .order('baslangic_saat', { nullsFirst: false })
      .order('durum')
      .order('periyot', { nullsFirst: false })
      .order('id')
    if (error) {
      setHata(hataMetni(error))
      return
    }
    setHata('')
    setHafta((data ?? []).map((g) => duzlestir(g, ogrenciId)))
  }, [ogrenciId, basi])

  /* Bugünün listesi değişince haftalık sayılar da tazelensin. */
  useEffect(() => {
    yukle()
  }, [yukle, bugunGorevler])

  const sayim = Object.fromEntries(
    gunler.map((t) => {
      const l = hafta.filter((g) => g.tarih === t)
      return [t, { toplam: l.length, biten: l.filter((g) => g.durum === 'tamamlandi').length }]
    }),
  )
  const haftaToplam = hafta.length
  const haftaBiten = hafta.filter((g) => g.durum === 'tamamlandi').length

  const seciliBugunMu = secili === bugun
  const liste = seciliBugunMu ? bugunGorevler : hafta.filter((g) => g.tarih === secili)
  const seciliAd = seciliBugunMu
    ? 'Günün hedefleri'
    : secili
      ? `${KISA_GUN[gunler.indexOf(secili)] ?? ''} · ${new Date(`${secili}T00:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}`
      : 'Gün'

  useEffect(() => {
    onListe?.({ tarih: secili, liste, bugunMu: seciliBugunMu, ad: seciliAd, yenile: degisti })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secili, hafta, bugunGorevler])

  function degisti() {
    onDegisti?.()
    yukle()
  }

  return (
    <div className="hafta-serit-kap">
      <Uyari>{hata}</Uyari>
      {/* Şerit ortak bileşen: koçun Program sekmesi de aynısını çiziyor. */}
      <GunSeridi
        haftalar={haftalar.map((g, h) => ({ anahtar: String(h), gunler: g }))}
        sayim={sayim}
        secili={secili}
        bugun={bugun}
        onSec={onSec}
        damga
        bugunSade
      />
    </div>
  )
}
