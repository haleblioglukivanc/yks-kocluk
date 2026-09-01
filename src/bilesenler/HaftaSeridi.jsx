import { useCallback, useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Kart, Uyari } from './Ortak.jsx'
import GunHedefleri from './GunHedefleri.jsx'

/**
 * Hafta şeridi: Program sekmesinin yerini aldı.
 *
 * Öğrencinin "bugün ne var, yarın ne var" sorusuna tam ızgara fazla
 * geliyordu; ızgara koçun planlama aracı, orada kalıyor. Burada yedi gün
 * bir şerit, altında seçili günün listesi. Bugün seçiliyken liste
 * panelin canlı verisinden (ozet.gorevler) çizilir ki tik anında
 * Sıradaki kartı ve Kâmil'le aynı sayıyı görsün; diğer günler haftalık
 * sorgudan gelir. İki durumda da aynı GunHedefleri.
 */

const KISA_GUN = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

function gunEkle(iso, i) {
  const t = new Date(`${iso}T00:00:00`)
  t.setDate(t.getDate() + i)
  return t.toISOString().slice(0, 10)
}

/* Izgaranın join'li satırını GunHedefleri'nin düz satırına çevirir;
   ogrenci_bugun_ozeti de aynı düz şekli veriyor. */
function duzlestir(g) {
  return {
    ...g,
    ders: g.dersler?.ad ?? null,
    konu: g.konular?.ad ?? null,
    kaynak_ad: g.kaynaklar?.ad ?? null,
    kaynak_bicim: g.kaynaklar?.bicim ?? null,
    kaynak_url: g.kaynaklar?.url ?? null,
    kaynak_dosya: g.kaynaklar?.dosya_yolu ?? null,
  }
}

export default function HaftaSeridi({ ogrenciId, haftaBasi, bugun, bugunGorevler, onDegisti, saltOkunur = false }) {
  const [kaydirma, setKaydirma] = useState(0) // 0 bu hafta, 1 sonraki
  const [secili, setSecili] = useState(bugun)
  const [hafta, setHafta] = useState([])
  const [hata, setHata] = useState('')

  const basi = haftaBasi ? gunEkle(haftaBasi, kaydirma * 7) : null
  const gunler = basi ? Array.from({ length: 7 }, (_, i) => gunEkle(basi, i)) : []

  useEffect(() => {
    setSecili(bugun)
  }, [bugun])

  const yukle = useCallback(async () => {
    if (!ogrenciId || !basi) return
    const { data, error } = await supabase
      .from('gorevler')
      .select(
        'id, tarih, periyot, tur, baslik, aciklama, hedef_adet, yapilan_adet, durum, kaynak_aralik, dersler(ad), konular(ad), kaynaklar(ad, bicim, url, dosya_yolu)',
      )
      .eq('ogrenci_id', ogrenciId)
      .gte('tarih', basi)
      .lte('tarih', gunEkle(basi, 6))
      .order('durum')
      .order('periyot', { nullsFirst: false })
      .order('id')
    if (error) {
      setHata(hataMetni(error))
      return
    }
    setHata('')
    setHafta((data ?? []).map(duzlestir))
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

  function degisti() {
    onDegisti?.()
    yukle()
  }

  return (
    <>
      <Kart
        baslik={kaydirma ? 'Sonraki hafta' : 'Bu hafta'}
        altBaslik={haftaToplam ? `${haftaToplam} blok · ${haftaBiten} bitti` : 'Plan yok'}
        eylem={
          <button className="metin-dugme" onClick={() => { setKaydirma((k) => (k ? 0 : 1)); setSecili(kaydirma ? bugun : null) }}>
            {kaydirma ? '‹ Bu hafta' : 'Sonraki ›'}
          </button>
        }
      >
        <Uyari>{hata}</Uyari>
        <div className="hafta-serit" role="tablist" aria-label="Haftanın günleri">
          {gunler.map((t, i) => {
            const s = sayim[t] ?? { toplam: 0, biten: 0 }
            const bugunMu = t === bugun
            const gecmis = t < bugun
            return (
              <button
                key={t}
                role="tab"
                aria-selected={t === secili}
                className={`hafta-gun${t === secili ? ' hafta-gun--secili' : ''}${bugunMu ? ' hafta-gun--bugun' : ''}${gecmis ? ' hafta-gun--gecmis' : ''}`}
                onClick={() => setSecili(t)}
              >
                <span className="hafta-gun-ad">{KISA_GUN[i]}</span>
                <span className="hafta-gun-no">{Number(t.slice(8, 10))}</span>
                <span className="hafta-gun-nokta" aria-label={`${s.biten}/${s.toplam} blok`}>
                  {s.toplam === 0 ? (
                    <i className="hafta-nokta hafta-nokta--yok" />
                  ) : s.toplam <= 4 ? (
                    Array.from({ length: s.toplam }, (_, k) => (
                      <i key={k} className={`hafta-nokta${k < s.biten ? ' hafta-nokta--dolu' : ''}`} />
                    ))
                  ) : (
                    <b className="hafta-nokta-sayi">{s.biten}/{s.toplam}</b>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </Kart>

      {secili && (
        <GunHedefleri
          baslik={seciliAd}
          gorevler={liste}
          saltOkunur={saltOkunur}
          onDegisti={degisti}
        />
      )}
    </>
  )
}
