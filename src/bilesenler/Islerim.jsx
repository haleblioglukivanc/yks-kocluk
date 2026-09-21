import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { gunEkle } from '../lib/hafta.js'
import { dersGorunumu } from '../lib/dersGorunum.js'
import { sureYaz } from '../ortak/Gidisat.jsx'

/* Öğrencinin "İşlerim" bölümü (22 Eylül 2026, Bekir'in onayladığı mokap).
   Koçun Gidişat anahtarının eşi: Bugün / 7 gün / 30 gün. Anahtarın altında
   tek satır özet (çalışılan süre, biten iş). Bugün: sıradaki iş kartı ve
   günün işleri (children). 7 gün: haftanın her günü bir satır, dokununca o
   günün işleri. 30 gün: aylık takvim (tamam ✓, yarım !, kaçtı ✕, planlı) ve
   altında kaçan / yarım kalan işler. Hafta şeridi bunun yerine kalktı. */

const GUN_KISA = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']
const AY = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']

const tarihOku = (t) => new Date(`${t}T00:00:00`)

function gunDurumu(liste, tarih, bugun) {
  if (!liste || liste.length === 0) return null
  const biten = liste.filter((g) => g.durum === 'tamamlandi').length
  if (tarih === bugun) return 'bugun'
  if (tarih > bugun) return 'gelecek'
  if (biten === liste.length) return 'tam'
  if (biten > 0 || liste.some((g) => (g.yapilan_adet ?? 0) > 0)) return 'kismen'
  return 'kacti'
}

export default function Islerim({ ogrenciId, bugun, haftaBasi, bugunGorevler = [], tazele = 0, children }) {
  const [donem, setDonem] = useState('bugun')
  const [gorevler, setGorevler] = useState(null)
  const [sureler, setSureler] = useState(null)
  const [acikGun, setAcikGun] = useState(null)

  /* Ayın başından haftanın sonuna kadar tek sorgu: 7 gün ve 30 gün ikisi de buradan. */
  const aralik = useMemo(() => {
    if (!bugun) return null
    const b = tarihOku(bugun)
    const ayBas = `${bugun.slice(0, 7)}-01`
    const ayBit = new Date(b.getFullYear(), b.getMonth() + 1, 0)
    const ayBitIso = `${ayBit.getFullYear()}-${String(ayBit.getMonth() + 1).padStart(2, '0')}-${String(ayBit.getDate()).padStart(2, '0')}`
    const hb = haftaBasi ?? bugun
    const hs = gunEkle(hb, 6)
    return { ayBas: hb < ayBas ? hb : ayBas, ayBit: hs > ayBitIso ? hs : ayBitIso, ayBasGercek: ayBas, ayBitGercek: ayBitIso, hb, hs }
  }, [bugun, haftaBasi])

  useEffect(() => {
    if (!ogrenciId || !aralik) return
    let iptal = false
    ;(async () => {
      const [g, s] = await Promise.all([
        supabase.from('gorevler').select('id, tarih, baslik, durum, yapilan_adet, hedef_adet, dersler(ad)')
          .eq('ogrenci_id', ogrenciId).gte('tarih', aralik.ayBas).lte('tarih', aralik.ayBit),
        supabase.from('calisma_oturumlari').select('baslangic, sure_dk')
          .eq('ogrenci_id', ogrenciId).gte('baslangic', `${aralik.ayBas}T00:00:00`).lte('baslangic', `${aralik.ayBit}T23:59:59`),
      ])
      if (iptal) return
      setGorevler(g.data ?? [])
      setSureler(s.data ?? [])
    })()
    return () => { iptal = true }
  }, [ogrenciId, aralik, tazele])

  const gunun = (t) => (gorevler ?? []).filter((g) => g.tarih === t)
  const dakika = (bas, bit) => (sureler ?? [])
    .filter((s) => { const t = (s.baslangic ?? '').slice(0, 10); return t >= bas && t <= bit })
    .reduce((a, s) => a + (s.sure_dk ?? 0), 0)

  let ozet = null
  if (aralik && gorevler && sureler) {
    if (donem === 'bugun') {
      const l = bugunGorevler.length ? bugunGorevler : gunun(bugun)
      const biten = l.filter((g) => g.durum === 'tamamlandi').length
      ozet = <><b>{sureYaz(dakika(bugun, bugun))}</b> çalıştın · <b>{biten} / {l.length}</b> iş bitti</>
    } else if (donem === 'hafta') {
      const l = (gorevler ?? []).filter((g) => g.tarih >= aralik.hb && g.tarih <= aralik.hs)
      ozet = <>Bu hafta <b>{sureYaz(dakika(aralik.hb, aralik.hs))}</b> · <b>{l.filter((g) => g.durum === 'tamamlandi').length} / {l.length}</b> iş bitti</>
    } else {
      const l = (gorevler ?? []).filter((g) => g.tarih >= aralik.ayBasGercek && g.tarih <= aralik.ayBitGercek)
      const kacan = l.filter((g) => g.tarih < bugun && g.durum !== 'tamamlandi').length
      ozet = <>{AY[tarihOku(bugun).getMonth()]}'de <b>{sureYaz(dakika(aralik.ayBasGercek, aralik.ayBitGercek))}</b> · <b>{l.filter((g) => g.durum === 'tamamlandi').length} / {l.length}</b> iş bitti{kacan ? <> · <b>{kacan}</b> iş kaldı</> : null}</>
    }
  }

  return (
    <section className="isl" aria-label="İşlerim">
      <div className="ana-bolum-bas isl-bas">
        <h2>İşlerim</h2>
        <div className="ana-anahtar" role="group" aria-label="Dönem">
          {[['bugun', 'Bugün'], ['hafta', '7 gün'], ['ay', '30 gün']].map(([k, ad]) => (
            <button key={k} type="button" aria-pressed={donem === k} onClick={() => setDonem(k)}>{ad}</button>
          ))}
        </div>
      </div>
      <p className="isl-ozet">{ozet ?? ' '}</p>

      {donem === 'bugun' && <div className="isl-bugun">{children}</div>}

      {donem === 'hafta' && aralik && (
        <div className="isl-kart">
          {Array.from({ length: 7 }, (_, i) => {
            const t = gunEkle(aralik.hb, i)
            const l = gunun(t)
            const biten = l.filter((g) => g.durum === 'tamamlandi').length
            const acik = acikGun === t
            return (
              <div key={t}>
                <button type="button" className={t === bugun ? 'isl-gun isl-gun--bugun' : 'isl-gun'} onClick={() => setAcikGun(acik ? null : t)} aria-expanded={acik} disabled={!l.length}>
                  <b>{GUN_KISA[tarihOku(t).getDay()]} {tarihOku(t).getDate()}{t === bugun && <em> · bugün</em>}</b>
                  <span className="isl-cubuk"><s style={{ width: l.length ? `${(biten / l.length) * 100}%` : 0 }} /></span>
                  <small>{!l.length ? 'plan yok' : t <= bugun ? `${biten} / ${l.length}` : `${l.length} iş`}</small>
                </button>
                {acik && (
                  <div className="isl-gun-ic">
                    {l.map((g) => (
                      <div key={g.id} className={g.durum === 'tamamlandi' ? 'isl-is isl-is--bitti' : 'isl-is'}>
                        <i style={{ background: dersGorunumu(g.dersler?.ad).renk }} />{g.baslik}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {donem === 'ay' && aralik && (
        <>
          <div className="isl-kart isl-ay">
            <div className="isl-ay-bas">
              {AY[tarihOku(bugun).getMonth()]} {tarihOku(bugun).getFullYear()}
            </div>
            <div className="isl-ay-izgara">
              {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((g) => <span key={g} className="isl-gad">{g}</span>)}
              {Array.from({ length: (tarihOku(aralik.ayBasGercek).getDay() + 6) % 7 }, (_, i) => <span key={`b${i}`} />)}
              {Array.from({ length: Number(aralik.ayBitGercek.slice(8)) }, (_, i) => {
                const t = `${aralik.ayBasGercek.slice(0, 8)}${String(i + 1).padStart(2, '0')}`
                const d = gunDurumu(gunun(t), t, bugun) ?? (t === bugun ? 'bugun' : 'bos')
                const isaret = { tam: '✓', kismen: '!', kacti: '✕' }[d]
                return (
                  <span key={t} className={`isl-hc isl-hc--${d}`} aria-label={`${i + 1}: ${{ tam: 'tamam', kismen: 'yarım', kacti: 'kaçtı', gelecek: 'planlı', bugun: 'bugün', bos: 'plan yok' }[d]}`}>
                    {i + 1}{isaret && <i>{isaret}</i>}
                  </span>
                )
              })}
            </div>
            <div className="isl-ay-alt">
              <span><b className="isl-hc--tam" />tamam</span>
              <span><b className="isl-hc--kismen" />yarım</span>
              <span><b className="isl-hc--kacti" />kaçtı</span>
              <span><b className="isl-hc--gelecek" />planlı</span>
            </div>
          </div>
          {(() => {
            const kalan = (gorevler ?? [])
              .filter((g) => g.tarih >= aralik.ayBasGercek && g.tarih < bugun && g.durum !== 'tamamlandi')
              .sort((a, b) => (a.tarih < b.tarih ? 1 : -1))
              .slice(0, 5)
            if (!kalan.length) return null
            return (
              <div className="isl-kart isl-kalan">
                {kalan.map((g) => (
                  <div key={g.id} className="isl-is">
                    <i style={{ background: dersGorunumu(g.dersler?.ad).renk }} />{g.baslik}
                    <em>{tarihOku(g.tarih).getDate()} {AY[tarihOku(g.tarih).getMonth()].slice(0, 3)} · {(g.yapilan_adet ?? 0) > 0 ? 'yarım' : 'kaçtı'}</em>
                  </div>
                ))}
              </div>
            )
          })()}
        </>
      )}
    </section>
  )
}
