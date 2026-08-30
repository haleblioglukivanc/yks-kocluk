import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Uyari, Yukleniyor } from './Ortak.jsx'
import { dersGorunumu } from '../lib/dersGorunum.js'

export const PERIYOTLAR = ['09—11', '11—13', '14—16', '16—18', '19—21', '21—23']
export const KISA_GUN = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

/** Yerel saate göre YYYY-MM-DD. toISOString UTC'ye kaydırır, kullanılmaz. */
export const gunAnahtari = (t) => t.toLocaleDateString('sv-SE')

export function haftaBasi(tarih) {
  const t = new Date(tarih)
  t.setDate(t.getDate() - ((t.getDay() + 6) % 7))
  t.setHours(0, 0, 0, 0)
  return t
}

/** Açık panelin kimliği. Değişince panel görünür alana kaydırılır. */
const acikTarihAnahtari = (acikSecim, secilen) => {
  const s = acikSecim ?? secilen
  if (!s) return null
  if (s.rutinGunler) return 'rutin'
  return `${s.tarih ?? ''}-${s.periyot ?? ''}`
}

export function haftaGunleri(bas) {
  return Array.from({ length: 7 }, (_, i) => {
    const t = new Date(bas)
    t.setDate(bas.getDate() + i)
    return t
  })
}

/**
 * Haftalık program ızgarası.
 * Satırlar zaman dilimi, sütunlar gün. Koç boş hücreye ders atar,
 * öğrenci dolu hücreye dokunup bitmiş olarak işaretler.
 */
export default function ProgramIzgarasi({
  ogrenci,
  duzenlenebilir,
  onHucreSec,
  onRutinEkle,
  saltOkunur,
  acikSecim,
  panel,
}) {
  const [bas, setBas] = useState(() => haftaBasi(new Date()))
  const [gorevler, setGorevler] = useState(null)
  const [hata, setHata] = useState('')
  // Öğrenci bloğa dokununca önce ayrıntı açılır; "bitti" oradan işaretlenir.
  // Doğrudan işaretlemek, koçun yazdığı notu ve hedefi görünmez kılıyordu.
  const [secilen, setSecilen] = useState(null)
  const acilirRef = useRef(null)

  const gunler = haftaGunleri(bas)
  const ilk = gunAnahtari(gunler[0])
  const son = gunAnahtari(gunler[6])

  const yukle = useCallback(async () => {
    const { data, error } = await supabase
      .from('gorevler')
      .select('id, tarih, periyot, tur, baslik, aciklama, hedef_adet, yapilan_adet, durum, dersler(ad), konular(ad)')
      .eq('ogrenci_id', ogrenci.id)
      .gte('tarih', ilk)
      .lte('tarih', son)
      .order('periyot', { nullsFirst: false })
    if (error) setHata(hataMetni(error))
    setGorevler(data ?? [])
  }, [ogrenci.id, ilk, son])

  useEffect(() => { yukle() }, [yukle])

  // Panel açılınca ekranda görünür olsun; klavye açılan telefonlarda şart.
  const acilirAnahtar = acikTarihAnahtari(acikSecim, secilen)
  useEffect(() => {
    if (!acilirAnahtar) return
    acilirRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [acilirAnahtar])

  async function bittiIsaretle(g, yapilan) {
    const yeni = g.durum === 'tamamlandi' ? 'bekliyor' : 'tamamlandi'
    const guncelleme = { durum: yeni }
    if (yapilan != null) guncelleme.yapilan_adet = yapilan
    const { error } = await supabase.from('gorevler').update(guncelleme).eq('id', g.id)
    if (error) {
      setHata(hataMetni(error))
      return
    }
    setSecilen(null)
    yukle()
  }

  const bugun = gunAnahtari(new Date())
  const harita = {}
  ;(gorevler ?? []).forEach((g) => {
    if (g.periyot) harita[`${g.tarih}-${g.periyot}`] = g
  })
  const gunBoyu = (gorevler ?? []).filter((g) => !g.periyot)

  /* Rutinler isme göre gruplanıyor. "Paragraf" her gün tekrarlanıyorsa
     yedi ayrı satır yerine tek satır ve yedi gün rozeti görünür. */
  const rutinHarita = new Map()
  for (const g of gunBoyu) {
    const ad = g.dersler?.ad ?? g.baslik
    if (!rutinHarita.has(ad)) rutinHarita.set(ad, [])
    rutinHarita.get(ad).push(g)
  }
  const rutinler = [...rutinHarita.entries()].map(([ad, liste]) => ({
    ad,
    gorevler: liste.slice().sort((a, b) => a.tarih.localeCompare(b.tarih)),
    biten: liste.filter((g) => g.durum === 'tamamlandi').length,
  }))

  const bloklar = (gorevler ?? []).filter((g) => g.periyot)
  const biten = bloklar.filter((g) => g.durum === 'tamamlandi').length
  const oran = bloklar.length ? Math.round((biten / bloklar.length) * 100) : 0

  /* Veri girişi tablonun altında değil, dokunulan hücrenin hemen altında
     açılır. Hangi güne/saate yazdığın gözden kaçmasın diye.
     Koç tarafında panel dışarıdan (acikSecim + panel), öğrenci tarafında
     içeriden (secilen -> BlokAyrinti) gelir; yerleşim ikisinde de aynı. */
  const acikTarih = acikSecim?.tarih ?? secilen?.tarih ?? null
  const acikPeriyot = acikSecim?.periyot ?? secilen?.periyot ?? null
  const acikSutun = acikTarih ? gunler.findIndex((g) => gunAnahtari(g) === acikTarih) : -1

  const panelIcerik = secilen ? (
    <BlokAyrinti
      blok={secilen}
      saltOkunur={saltOkunur}
      onKapat={() => setSecilen(null)}
      onBitir={(yapilan) => bittiIsaretle(secilen, yapilan)}
    />
  ) : (acikSecim ? panel : null)

  // Rutin / gün boyu görevlerin hücresi yok: onlar tablonun altında açılır.
  const satirdaAcik = Boolean(panelIcerik) && acikSutun >= 0 && acikPeriyot != null

  return (
    <div className="prg">
      <div className="prg-basi">
        <div className="prg-hafta">
          <button
            className="ok-dugme"
            onClick={() => setBas(new Date(bas.getFullYear(), bas.getMonth(), bas.getDate() - 7))}
            aria-label="Önceki hafta"
          >←</button>
          <div className="prg-hafta-orta">
            <span className="prg-hafta-etiket">Hafta</span>
            <span className="prg-hafta-tarih">
              {gunler[0].toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} –{' '}
              {gunler[6].toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
            </span>
          </div>
          <button
            className="ok-dugme"
            onClick={() => setBas(new Date(bas.getFullYear(), bas.getMonth(), bas.getDate() + 7))}
            aria-label="Sonraki hafta"
          >→</button>
        </div>
        <button className="metin-dugme" onClick={() => setBas(haftaBasi(new Date()))}>Bu hafta</button>
      </div>

      <Uyari>{hata}</Uyari>

      {gorevler === null ? (
        <Yukleniyor />
      ) : (
        <>
          <div className="prg-ozet">
            <span className="prg-ozet-etiket">Tamamlanan blok</span>
            <span className="prg-ozet-sayi">{biten}/{bloklar.length}</span>
            <div className="prg-cubuk"><div style={{ width: `${oran}%` }} /></div>
          </div>

          <div className="prg-kaydir">
            <table className="prg-tablo">
              <thead>
                <tr>
                  <th />
                  {gunler.map((g, i) => (
                    <th key={i} className={gunAnahtari(g) === bugun ? 'prg-bugun' : undefined}>
                      {KISA_GUN[i]}
                      <span className="prg-gun-no">{g.getDate()}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERIYOTLAR.map((saat, si) => (
                  <Fragment key={saat}>
                  <tr>
                    <td className="prg-saat">{saat}</td>
                    {gunler.map((g) => {
                      const anahtar = `${gunAnahtari(g)}-${si + 1}`
                      const blok = harita[anahtar]
                      const bugunSutunu = gunAnahtari(g) === bugun
                      if (blok) {
                        const bitti = blok.durum === 'tamamlandi'
                        const gor = dersGorunumu(blok.dersler?.ad ?? blok.baslik)
                        return (
                          <td key={anahtar} className={bugunSutunu ? 'prg-bugun-sutun' : undefined}>
                            <button
                              className={`hucre hucre--dolu${bitti ? ' hucre--bitti' : ''}${
                                anahtar === `${acikTarih}-${acikPeriyot}` ? ' hucre--secili' : ''
                              }`}
                              onClick={() => {
                                if (duzenlenebilir) onHucreSec?.(blok, gunAnahtari(g), si + 1)
                                else setSecilen(blok)
                              }}
                              aria-pressed={bitti}
                              title={[
                                blok.baslik,
                                blok.hedef_adet ? `${blok.yapilan_adet}/${blok.hedef_adet}` : null,
                                blok.aciklama,
                              ].filter(Boolean).join(' · ')}
                              style={{ '--ders-renk': gor.renk }}
                            >
                              <span className="hucre-kod">{gor.kod}</span>
                              <span className="hucre-tam">{gor.ad || blok.baslik}</span>
                            </button>
                          </td>
                        )
                      }
                      return (
                        <td key={anahtar} className={bugunSutunu ? 'prg-bugun-sutun' : undefined}>
                          <button
                            className={`hucre hucre--bos${
                              anahtar === `${acikTarih}-${acikPeriyot}` ? ' hucre--secili' : ''
                            }`}
                            disabled={!duzenlenebilir}
                            onClick={() => onHucreSec?.(null, gunAnahtari(g), si + 1)}
                            aria-label="Blok ekle"
                          >
                            {duzenlenebilir ? '+' : '·'}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                  {satirdaAcik && acikPeriyot === si + 1 && (
                    <tr className="prg-acilir-satir">
                      <td colSpan={8}>
                        <div
                          className="prg-acilir"
                          ref={acilirRef}
                          style={{ '--ok-sutun': acikSutun }}
                        >
                          <span className="prg-acilir-ok" aria-hidden="true" />
                          {panelIcerik}
                        </div>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <p className="prg-ipucu">
            {saltOkunur
              ? 'Önizleme: bloğa dokunup ayrıntıyı görebilirsin, değişiklik yapılamaz.'
              : duzenlenebilir
                ? 'Boş hücreye dokunup ders atayın. Yeşil bloklar öğrencinin tamamladıklarıdır.'
                : 'Bloğa dokun: ne çözeceğini ve koçunun notunu gösterir.'}
          </p>

          {/* Hücresi olmayan görevler (rutin, gün boyu) tablonun altında açılır */}
          {panelIcerik && !satirdaAcik && (
            <div className="prg-alt-panel" ref={acilirRef}>{panelIcerik}</div>
          )}

          {(gunBoyu.length > 0 || duzenlenebilir) && (
            <div className="prg-serbest">
              <div className="rutin-baslik">
                <h4>Rutinler</h4>
                {duzenlenebilir && (
                  <button
                    className="rutin-ekle"
                    onClick={() => onRutinEkle?.(gunler.map(gunAnahtari))}
                    aria-label="Rutin ekle"
                    title="Rutin ekle"
                  >
                    +
                  </button>
                )}
              </div>
              <ul>
                {rutinler.length === 0 && duzenlenebilir && (
                  <li className="rutin-bos">
                    Saate bağlı olmayan tekrar eden görevler burada. Artıya dokunup ekleyin.
                  </li>
                )}
                {rutinler.map((r) => (
                  <li key={r.ad} className="rutin">
                    <div className="rutin-basi">
                      <span className="rutin-ad">{r.ad}</span>
                      <span className="rutin-sayi">{r.biten}/{r.gorevler.length}</span>
                    </div>
                    <div className="rutin-gunler">
                      {r.gorevler.map((g) => (
                        <button
                          key={g.id}
                          className={`rutin-gun${g.durum === 'tamamlandi' ? ' rutin-gun--bitti' : ''}`}
                          title={g.baslik}
                          onClick={() => {
                            if (duzenlenebilir) onHucreSec?.(g, g.tarih, null)
                            else setSecilen(g)
                          }}
                        >
                          {new Date(g.tarih).toLocaleDateString('tr-TR', { weekday: 'short' })}
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}


const TUR_ADI = {
  konu_anlatimi: 'Konu anlatımı',
  soru_cozumu: 'Soru çözümü',
  tekrar: 'Tekrar',
  deneme: 'Deneme',
  okuma: 'Okuma',
  diger: 'Diğer',
}

/** Öğrencinin bloğa dokununca gördüğü ayrıntı: hangi konu, kaç soru,
 *  koçun notu. Bitirme de buradan yapılır. */
function BlokAyrinti({ blok, saltOkunur, onKapat, onBitir }) {
  const [yapilan, setYapilan] = useState(
    blok.yapilan_adet != null ? String(blok.yapilan_adet) : '',
  )
  const bitti = blok.durum === 'tamamlandi'

  return (
    <div className="blok-ayrinti">
      <header className="hucre-basi">
        <div>
          <span className="hucre-gun">{blok.baslik}</span>
          <span className="hucre-saat">
            {[blok.dersler?.ad, blok.konular?.ad, TUR_ADI[blok.tur] ?? blok.tur]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </div>
        <button className="metin-dugme" onClick={onKapat}>Kapat</button>
      </header>

      {blok.hedef_adet != null && (
        <p className="blok-hedef">
          Hedef: <strong>{blok.hedef_adet}</strong> soru
        </p>
      )}

      {blok.aciklama && <p className="gorev-not">{blok.aciklama}</p>}

      {!saltOkunur && (
        <div className="blok-eylem">
          {blok.hedef_adet != null && (
            <label className="alan">
              <span className="alan-etiket">Kaç tane çözdün?</span>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                max="999"
                value={yapilan}
                onChange={(e) => setYapilan(e.target.value)}
                placeholder="0"
              />
            </label>
          )}
          <button
            className="dugme dugme--birincil"
            onClick={() => onBitir(yapilan === '' ? null : Number(yapilan))}
          >
            {bitti ? 'Geri al' : 'Bitirdim'}
          </button>
        </div>
      )}
    </div>
  )
}
