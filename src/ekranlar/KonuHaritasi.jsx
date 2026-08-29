import { useCallback, useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Bos, Kart, Uyari, Yukleniyor } from '../bilesenler/Ortak.jsx'

/* 300'den fazla konu var. Hepsini birden çekmek hem yavaş hem okunmaz olurdu:
   dersler özet gelir, konular ders açıldığında yüklenir. */

const DURUMLAR = ['baslanmadi', 'calisiliyor', 'tamamlandi', 'tekrar_gerekli']

const DURUM_ADI = {
  baslanmadi: 'Başlanmadı',
  calisiliyor: 'Çalışılıyor',
  tamamlandi: 'Bitti',
  tekrar_gerekli: 'Tekrar',
}

// Dokununca sıradaki duruma geçer. Açılır menü değil, çünkü
// öğrenci bunu yüzlerce kez yapacak.
const sonraki = (d) => DURUMLAR[(DURUMLAR.indexOf(d ?? 'baslanmadi') + 1) % DURUMLAR.length]

function Cubuk({ toplam, tamamlandi, calisiliyor, tekrar }) {
  const y = (n) => (toplam ? (n / toplam) * 100 : 0)
  return (
    <div
      className='konu-cubuk'
      role='img'
      aria-label={`${toplam} konudan ${tamamlandi} bitti, ${calisiliyor} çalışılıyor, ${tekrar} tekrar gerekiyor`}
    >
      <div className='konu-cubuk--bitti' style={{ width: `${y(tamamlandi)}%` }} />
      <div className='konu-cubuk--calisiliyor' style={{ width: `${y(calisiliyor)}%` }} />
      <div className='konu-cubuk--tekrar' style={{ width: `${y(tekrar)}%` }} />
    </div>
  )
}

export default function KonuHaritasi({ profilId }) {
  const [dersler, setDersler] = useState(null)
  const [acik, setAcik] = useState(null)
  const [konular, setKonular] = useState({})
  const [hata, setHata] = useState('')

  const ozetiYukle = useCallback(async () => {
    const { data, error } = await supabase.rpc('konu_ozetim')
    if (error) {
      setHata(hataMetni(error))
      return
    }
    setDersler(data ?? [])
  }, [])

  useEffect(() => {
    ozetiYukle()
  }, [ozetiYukle])

  async function dersAc(dersId) {
    if (acik === dersId) {
      setAcik(null)
      return
    }
    setAcik(dersId)
    if (konular[dersId]) return

    const { data, error } = await supabase
      .from('konular')
      .select('id, ad, unite, sira, konu_ilerleme(durum, koc_onayi)')
      .eq('ders_id', dersId)
      .order('sira')

    if (error) {
      setHata(hataMetni(error))
      return
    }
    setKonular((m) => ({
      ...m,
      [dersId]: (data ?? []).map((k) => ({
        ...k,
        durum: k.konu_ilerleme?.[0]?.durum ?? 'baslanmadi',
        onayli: Boolean(k.konu_ilerleme?.[0]?.koc_onayi),
      })),
    }))
  }

  async function durumDegistir(dersId, konu) {
    const yeni = sonraki(konu.durum)
    setHata('')
    setKonular((m) => ({
      ...m,
      [dersId]: m[dersId].map((k) =>
        k.id === konu.id ? { ...k, durum: yeni, onayli: yeni === 'tamamlandi' && k.onayli } : k,
      ),
    }))

    const { error } = await supabase
      .from('konu_ilerleme')
      .upsert(
        { ogrenci_id: profilId, konu_id: konu.id, durum: yeni },
        { onConflict: 'ogrenci_id,konu_id' },
      )

    if (error) {
      setKonular((m) => ({
        ...m,
        [dersId]: m[dersId].map((k) =>
          k.id === konu.id ? { ...k, durum: konu.durum, onayli: konu.onayli } : k,
        ),
      }))
      setHata(hataMetni(error))
      return
    }
    ozetiYukle()
  }

  if (dersler === null) return <Yukleniyor />

  return (
    <>
      <Uyari>{hata}</Uyari>
      {dersler.length === 0 ? (
        <Kart baslik='Konu haritası'>
          <Bos baslik='Katalog atanmamış' aciklama='Koçun sana bir konu kataloğu tanımlamalı.' />
        </Kart>
      ) : (
        <Kart baslik='Konu haritası' altBaslik='Konuya dokun: başlanmadı → çalışılıyor → bitti → tekrar'>
          {dersler.map((d) => (
            <div key={d.dersId} className='ders-blok'>
              <button className='ders-basi' onClick={() => dersAc(d.dersId)} aria-expanded={acik === d.dersId}>
                <div>
                  <span className='liste-ad'>{d.ders}</span>
                  <span className='liste-alt'>
                    {String(d.kapsam).toUpperCase().replace('_', '/')} · {d.tamamlandi}/{d.toplam} bitti
                    {d.tamamlandi > 0 && ` · ${d.onayli ?? 0} koç onaylı`}
                  </span>
                </div>
                <span className='ok' aria-hidden='true'>{acik === d.dersId ? '−' : '+'}</span>
              </button>

              <Cubuk toplam={d.toplam} tamamlandi={d.tamamlandi} calisiliyor={d.calisiliyor} tekrar={d.tekrar} />

              {acik === d.dersId &&
                (konular[d.dersId] ? (
                  <ul className='liste'>
                    {konular[d.dersId].map((k) => (
                      <li key={k.id}>
                        <button className='konu-satir' onClick={() => durumDegistir(d.dersId, k)}>
                          <span className='konu-ad'>{k.ad}</span>
                          <span className="konu-durum">
                            {/* Koç kontrol edene kadar "bitti" beklemede sayılır. */}
                            {k.durum === 'tamamlandi' &&
                              (k.onayli ? (
                                <span className="konu-onay" title="Koçun onayladı">✓ onaylı</span>
                              ) : (
                                <span className="konu-onay konu-onay--bekliyor">onay bekliyor</span>
                              ))}
                            <span className={`konu-rozet konu-rozet--${k.durum}`}>
                              {DURUM_ADI[k.durum]}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Yukleniyor />
                ))}
            </div>
          ))}
        </Kart>
      )}
    </>
  )
}
