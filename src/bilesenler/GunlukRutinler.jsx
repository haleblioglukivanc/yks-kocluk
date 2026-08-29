import { useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Kart, Uyari } from './Ortak.jsx'

/* Rutin, günlük görevden farklı bir şey: her hafta aynı satır, her gün bir
   kutu. Onay kutusu değil optik form baloncuğu kullanıyoruz — yedi günü tek
   bakışta görmek, "bu hafta nasıl gitti" sorusunun cevabı. */

const KISA_GUN = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']
const TAM_GUN = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']

/** haftaBasi 'YYYY-AA-GG' pazartesi; i gün sonrası yine ISO metin. */
function gunEkle(iso, i) {
  const t = new Date(`${iso}T00:00:00`)
  t.setDate(t.getDate() + i)
  return t.toISOString().slice(0, 10)
}

export default function GunlukRutinler({ ogrenciId, rutinler, haftaBasi, bugun, onDegisti }) {
  const [liste, setListe] = useState(rutinler ?? [])
  const [hata, setHata] = useState('')
  const [duzenle, setDuzenle] = useState(false)
  const [yeniAd, setYeniAd] = useState('')
  const [bekliyor, setBekliyor] = useState(false)

  useEffect(() => {
    setListe(rutinler ?? [])
  }, [rutinler])

  // Bugünün sütununu vurgulayabilmek için hangi sütun olduğunu bul
  const bugunIndeks = haftaBasi && bugun
    ? Math.round((new Date(`${bugun}T00:00:00`) - new Date(`${haftaBasi}T00:00:00`)) / 86400000)
    : -1

  async function isaretle(rutin, gunIndeks) {
    if (!haftaBasi) return
    const tarih = gunEkle(haftaBasi, gunIndeks)
    const acik = Boolean(rutin.gunler?.[gunIndeks])
    const onceki = liste

    setHata('')
    setListe((l) =>
      l.map((r) =>
        r.id === rutin.id
          ? { ...r, gunler: r.gunler.map((v, i) => (i === gunIndeks ? !acik : v)) }
          : r,
      ),
    )

    const { error } = acik
      ? await supabase.from('rutin_kayit').delete().eq('rutin_id', rutin.id).eq('tarih', tarih)
      : await supabase
          .from('rutin_kayit')
          .upsert({ rutin_id: rutin.id, ogrenci_id: ogrenciId, tarih }, { onConflict: 'rutin_id,tarih' })

    if (error) {
      setListe(onceki)
      setHata(hataMetni(error))
      return
    }
    onDegisti?.()
  }

  async function ekle() {
    const ad = yeniAd.trim()
    if (!ad) return
    setBekliyor(true)
    const { data, error } = await supabase
      .from('rutinler')
      .insert({ ogrenci_id: ogrenciId, ad, sira: liste.length })
      .select('id, ad, sira')
      .single()
    setBekliyor(false)
    if (error) {
      setHata(hataMetni(error))
      return
    }
    setYeniAd('')
    setListe((l) => [...l, { ...data, gunler: [false, false, false, false, false, false, false] }])
    onDegisti?.()
  }

  async function kaldir(rutin) {
    const onceki = liste
    setListe((l) => l.filter((r) => r.id !== rutin.id))
    const { error } = await supabase.from('rutinler').update({ aktif: false }).eq('id', rutin.id)
    if (error) {
      setListe(onceki)
      setHata(hataMetni(error))
      return
    }
    onDegisti?.()
  }

  const buHafta = liste.reduce((a, r) => a + (r.gunler ?? []).filter(Boolean).length, 0)

  return (
    <Kart
      baslik="Günlük rutinler"
      altBaslik={liste.length ? `Bu hafta ${buHafta} işaret` : undefined}
      eylem={
        <button className="metin-dugme" onClick={() => setDuzenle((d) => !d)}>
          {duzenle ? 'Bitti' : 'Düzenle'}
        </button>
      }
    >
      <Uyari>{hata}</Uyari>

      {liste.length === 0 && !duzenle ? (
        <p className="kart-alt">
          Henüz rutin yok. “Düzenle”ye dokunup her gün tekrarlayacağın alışkanlıkları ekle.
        </p>
      ) : (
        <div className="rutin-sarmal">
          <table className="rutin-izgara">
            <thead>
              <tr>
                <th />
                {KISA_GUN.map((g, i) => (
                  <th key={g} className={i === bugunIndeks ? 'rutin-bugun' : undefined}>
                    {g}
                  </th>
                ))}
                {duzenle && <th />}
              </tr>
            </thead>
            <tbody>
              {liste.map((r) => (
                <tr key={r.id}>
                  <td className="rutin-ad">{r.ad}</td>
                  {KISA_GUN.map((g, i) => (
                    <td key={g}>
                      <button
                        className={`baloncuk baloncuk--dokun${r.gunler?.[i] ? ' baloncuk--dolu' : ''}`}
                        aria-pressed={Boolean(r.gunler?.[i])}
                        aria-label={`${r.ad} · ${TAM_GUN[i]}`}
                        onClick={() => isaretle(r, i)}
                      />
                    </td>
                  ))}
                  {duzenle && (
                    <td>
                      <button
                        className="rutin-sil"
                        onClick={() => kaldir(r)}
                        aria-label={`${r.ad} rutinini kaldır`}
                      >
                        ×
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {duzenle && (
        <div className="rutin-ekle">
          <input
            value={yeniAd}
            onChange={(e) => setYeniAd(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && ekle()}
            placeholder="Kitap okuma, günlük tekrar…"
            maxLength={40}
            aria-label="Yeni rutin adı"
          />
          <button className="dugme dugme--ikincil" onClick={ekle} disabled={bekliyor || !yeniAd.trim()}>
            Ekle
          </button>
        </div>
      )}
    </Kart>
  )
}
