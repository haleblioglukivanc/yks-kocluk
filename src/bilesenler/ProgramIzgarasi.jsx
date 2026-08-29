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
export default function ProgramIzgarasi({ ogrenci, duzenlenebilir, onHucreSec, saltOkunur }) {
  const [bas, setBas] = useState(() => haftaBasi(new Date()))
  const [gorevler, setGorevler] = useState(null)
  const [hata, setHata] = useState('')
  // Öğrenci bloğa dokununca önce ayrıntı açılır; "bitti" oradan işaretlenir.
  // Doğrudan işaretlemek, koçun yazdığı notu ve hedefi görünmez kılıyordu.
  const [secilen, setSecilen] = useState(null)

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
            {saltOkunur
              ? 'Önizleme: bloğa dokunup ayrıntıyı görebilirsin, değişiklik yapılamaz.'
              : duzenlenebilir
                ? 'Boş hücreye dokunup ders atayın. Yeşil bloklar öğrencinin tamamladıklarıdır.'
                : 'Bloğa dokun: ne çözeceğini ve koçunun notunu gösterir.'}
          </p>

          {secilen && (
            <BlokAyrinti
              blok={secilen}
              saltOkunur={saltOkunur}
              onKapat={() => setSecilen(null)}
              onBitir={(yapilan) => bittiIsaretle(secilen, yapilan)}
            />
          )}

          {gunBoyu.length > 0 && (
            <div className="prg-serbest">
              <h4>Saate bağlı olmayan görevler</h4>
              <ul>
                {gunBoyu.map((g) => (
                  <li key={g.id}>
                    <button
                      className={`serbest${g.durum === 'tamamlandi' ? ' serbest--bitti' : ''}`}
                      onClick={() => {
                        if (duzenlenebilir) onHucreSec?.(g, g.tarih, null)
                        else setSecilen(g)
                      }}
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
