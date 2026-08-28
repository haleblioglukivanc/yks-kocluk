import { useCallback, useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Uyari, Yukleniyor } from './Ortak.jsx'

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
export default function ProgramIzgarasi({ ogrenci, duzenlenebilir, onHucreSec }) {
  const [bas, setBas] = useState(() => haftaBasi(new Date()))
  const [gorevler, setGorevler] = useState(null)
  const [hata, setHata] = useState('')

  const gunler = haftaGunleri(bas)
  const ilk = gunAnahtari(gunler[0])
  const son = gunAnahtari(gunler[6])

  const yukle = useCallback(async () => {
    const { data, error } = await supabase
      .from('gorevler')
      .select('id, tarih, periyot, tur, baslik, hedef_adet, yapilan_adet, durum, dersler(ad), konular(ad)')
      .eq('ogrenci_id', ogrenci.id)
      .gte('tarih', ilk)
      .lte('tarih', son)
      .order('periyot', { nullsFirst: false })
    if (error) setHata(hataMetni(error))
    setGorevler(data ?? [])
  }, [ogrenci.id, ilk, son])

  useEffect(() => { yukle() }, [yukle])

  async function bittiIsaretle(g) {
    const yeni = g.durum === 'tamamlandi' ? 'bekliyor' : 'tamamlandi'
    const { error } = await supabase.from('gorevler').update({ durum: yeni }).eq('id', g.id)
    if (error) setHata(hataMetni(error))
    else yukle()
  }

  const bugun = gunAnahtari(new Date())
  const harita = {}
  ;(gorevler ?? []).forEach((g) => {
    if (g.periyot) harita[`${g.tarih}-${g.periyot}`] = g
  })
  const gunBoyu = (gorevler ?? []).filter((g) => !g.periyot)

  const bloklar = (gorevler ?? []).filter((g) => g.periyot)
  const biten = bloklar.filter((g) => g.durum === 'tamamlandi').length
  const oran = bloklar.length ? Math.round((biten / bloklar.length) * 100) : 0

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
                  <tr key={saat}>
                    <td className="prg-saat">{saat}</td>
                    {gunler.map((g) => {
                      const anahtar = `${gunAnahtari(g)}-${si + 1}`
                      const blok = harita[anahtar]
                      if (blok) {
                        const bitti = blok.durum === 'tamamlandi'
                        return (
                          <td key={anahtar}>
                            <button
                              className={`hucre hucre--dolu${bitti ? ' hucre--bitti' : ''}`}
                              onClick={() =>
                                duzenlenebilir ? onHucreSec?.(blok, gunAnahtari(g), si + 1) : bittiIsaretle(blok)
                              }
                              aria-pressed={bitti}
                              title={`${blok.baslik}${blok.hedef_adet ? ` · ${blok.yapilan_adet}/${blok.hedef_adet}` : ''}`}
                            >
                              {blok.dersler?.ad ?? blok.baslik}
                            </button>
                          </td>
                        )
                      }
                      return (
                        <td key={anahtar}>
                          <button
                            className="hucre hucre--bos"
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
                ))}
              </tbody>
            </table>
          </div>

          <p className="prg-ipucu">
            {duzenlenebilir
              ? 'Boş hücreye dokunup ders atayın. Yeşil bloklar öğrencinin tamamladıklarıdır.'
              : 'Etüdü bitirince bloğa dokunun. Yeşile döner.'}
          </p>

          {gunBoyu.length > 0 && (
            <div className="prg-serbest">
              <h4>Saate bağlı olmayan görevler</h4>
              <ul>
                {gunBoyu.map((g) => (
                  <li key={g.id}>
                    <button
                      className={`serbest${g.durum === 'tamamlandi' ? ' serbest--bitti' : ''}`}
                      onClick={() => (duzenlenebilir ? onHucreSec?.(g, g.tarih, null) : bittiIsaretle(g))}
                    >
                      <span className="serbest-gun">
                        {new Date(g.tarih).toLocaleDateString('tr-TR', { weekday: 'short' })}
                      </span>
                      <span className="serbest-ad">{g.baslik}</span>
                      {g.hedef_adet && (
                        <span className="serbest-adet">{g.yapilan_adet}/{g.hedef_adet}</span>
                      )}
                    </button>
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
