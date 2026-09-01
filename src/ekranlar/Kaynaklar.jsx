import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { Alan, Bos, Dugme, Kart, Uyari, Yukleniyor } from '../bilesenler/Ortak.jsx'
import KaynakKarti from '../bilesenler/KaynakKarti.jsx'
import {
  FAZ_ADI,
  KONU_BAZLI_FAZ,
  SEVIYE_ADI,
  SEVIYE_IPUCU,
} from '../lib/kaynak.js'

/**
 * Koçun kaynak kütüphanesi.
 *
 * Kaynak `ders_kod`'a bağlanıyor, tek tek ders satırlarına değil: aynı
 * ders yedi ayrı katalogda ayrı satır olarak duruyor ve kitabı yedi kez
 * eklemek kütüphaneyi daha doğmadan öldürürdü.
 *
 * Formda dört zorunlu alan var. Konu alanı yalnızca konuya bağlanan
 * fazlarda çıkıyor; ayrı bir "kapsam" sorusu sormuyoruz.
 */

const KAPSAM_ADI = { tyt: 'TYT', ayt: 'AYT', tyt_ayt: 'Ayrım yok' }

function hataMetni(e) {
  return e?.message ?? 'Kaydedilemedi. Bir daha dener misin?'
}

export default function Kaynaklar({ profil }) {
  const [dersler, setDersler] = useState([])
  const [kaynaklar, setKaynaklar] = useState(null)
  const [arama, setArama] = useState('')
  const [dersKod, setDersKod] = useState('')
  const [faz, setFaz] = useState('')
  const [seviye, setSeviye] = useState('')
  const [formAcik, setFormAcik] = useState(false)

  /* Kanonik ders listesi: aynı ders_kod bir kez görünsün. */
  useEffect(() => {
    supabase
      .from('dersler')
      .select('ders_kod, ad, kapsam, sira')
      .order('sira')
      .then(({ data }) => {
        const gorulen = new Map()
        for (const d of data ?? []) {
          if (d.ders_kod && !gorulen.has(d.ders_kod)) gorulen.set(d.ders_kod, d)
        }
        setDersler([...gorulen.values()].sort((a, b) => a.ad.localeCompare(b.ad, 'tr')))
      })
  }, [])

  const yukle = useCallback(async () => {
    setKaynaklar(null)
    let sorgu = supabase
      .from('kaynaklar')
      .select('*')
      .eq('aktif', true)
      .order('ad')
    if (dersKod) sorgu = sorgu.eq('ders_kod', dersKod)
    if (faz) sorgu = sorgu.eq('faz', faz)
    if (seviye) sorgu = sorgu.eq('seviye', Number(seviye))
    const { data } = await sorgu
    setKaynaklar(data ?? [])
  }, [dersKod, faz, seviye])

  useEffect(() => {
    yukle()
  }, [yukle])

  const gorunen = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase('tr-TR')
    if (!q) return kaynaklar ?? []
    return (kaynaklar ?? []).filter(
      (k) =>
        k.ad.toLocaleLowerCase('tr-TR').includes(q) ||
        (k.yayinevi ?? '').toLocaleLowerCase('tr-TR').includes(q),
    )
  }, [kaynaklar, arama])

  const dersAdi = (kod) => dersler.find((d) => d.ders_kod === kod)?.ad ?? kod

  return (
    <div className="panel">
      <Kart
        baslik="Kaynaklar"
        altBaslik="Kitaplar, bağlantılar ve kendi hazırladıkların"
        eylem={
          <Dugme tur="ufak" onClick={() => setFormAcik((a) => !a)}>
            {formAcik ? 'Kapat' : 'Kaynak ekle'}
          </Dugme>
        }
      >
        {formAcik && (
          <KaynakFormu
            profil={profil}
            dersler={dersler}
            onEklendi={() => {
              setFormAcik(false)
              yukle()
            }}
          />
        )}

        <div className="kaynak-suzgec">
          <input
            type="text"
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            placeholder="Kaynak ara"
            aria-label="Kaynak ara"
          />

          <select value={dersKod} onChange={(e) => setDersKod(e.target.value)} aria-label="Ders">
            <option value="">Tüm dersler</option>
            {dersler.map((d) => (
              <option key={d.ders_kod} value={d.ders_kod}>{d.ad}</option>
            ))}
          </select>

          <div className="kaynak-cipler" role="group" aria-label="Tür">
            <Cip etkin={!faz} onClick={() => setFaz('')}>Tümü</Cip>
            {Object.entries(FAZ_ADI).map(([k, ad]) => (
              <Cip key={k} etkin={faz === k} onClick={() => setFaz(faz === k ? '' : k)}>
                {ad}
              </Cip>
            ))}
          </div>

          <div className="kaynak-cipler" role="group" aria-label="Seviye">
            {Object.entries(SEVIYE_ADI).map(([n, ad]) => (
              <Cip
                key={n}
                etkin={seviye === n}
                onClick={() => setSeviye(seviye === n ? '' : n)}
              >
                {ad}
              </Cip>
            ))}
          </div>
        </div>

        {kaynaklar === null ? (
          <Yukleniyor metin="Kütüphaneye bakıyorum" />
        ) : gorunen.length === 0 ? (
          <Bos
            baslik={dersKod ? `${dersAdi(dersKod)} için kaynak yok` : 'Henüz kaynak yok'}
            aciklama="MEB'in ücretsiz kaynakları hazır yüklü. Kendi notunu ya da bir kitabı da ekleyebilirsin."
          />
        ) : (
          <div className="kaynak-liste">
            {gorunen.map((k) => (
              <KaynakKarti
                key={k.id}
                kaynak={k}
                eylem={
                  k.koc_id === profil?.id ? (
                    <button
                      type="button"
                      className="metin-dugme"
                      onClick={async () => {
                        await supabase.from('kaynaklar').update({ aktif: false }).eq('id', k.id)
                        yukle()
                      }}
                    >
                      Kaldır
                    </button>
                  ) : null
                }
              />
            ))}
          </div>
        )}
      </Kart>
    </div>
  )
}

function Cip({ etkin, onClick, children }) {
  return (
    <button
      type="button"
      className="kaynak-cip"
      aria-pressed={etkin}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function KaynakFormu({ profil, dersler, onEklendi }) {
  const [ad, setAd] = useState('')
  const [faz, setFaz] = useState('soru_bankasi')
  const [dersKod, setDersKod] = useState('')
  const [kapsam, setKapsam] = useState('tyt_ayt')
  const [konuId, setKonuId] = useState('')
  const [konular, setKonular] = useState([])
  const [seviye, setSeviye] = useState('')
  const [bicim, setBicim] = useState('baglanti')
  const [url, setUrl] = useState('')
  const [yayinevi, setYayinevi] = useState('')
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState('')

  const konuBazli = KONU_BAZLI_FAZ.has(faz)

  useEffect(() => {
    if (!konuBazli || !dersKod) {
      setKonular([])
      setKonuId('')
      return
    }
    /* Konu listesi herhangi bir katalogdan gelebilir; kaynak konuya
       bağlandığında v_kaynak_konu aynı adlı konuları diğer kataloglarda
       da eşleştiriyor. */
    supabase
      .from('dersler')
      .select('id')
      .eq('ders_kod', dersKod)
      .limit(1)
      .then(async ({ data }) => {
        const ders = data?.[0]
        if (!ders) return setKonular([])
        const { data: kk } = await supabase
          .from('konular')
          .select('id, ad, sira')
          .eq('ders_id', ders.id)
          .order('sira')
        setKonular(kk ?? [])
      })
  }, [konuBazli, dersKod])

  async function kaydet() {
    if (ad.trim().length < 2) return setHata('Kaynağa bir ad ver.')
    if (!dersKod) return setHata('Hangi derse ait olduğunu seç.')
    if (bicim === 'baglanti' && !url.trim()) return setHata('Bağlantı adresini yaz.')

    setBekliyor(true)
    setHata('')

    const { data, error } = await supabase
      .from('kaynaklar')
      .insert({
        koc_id: profil.id,
        ad: ad.trim(),
        yayinevi: yayinevi.trim() || null,
        faz,
        seviye: seviye ? Number(seviye) : null,
        ders_kod: dersKod,
        kapsam,
        bicim,
        telif: bicim === 'basili' ? 'dis' : 'kendi',
        url: bicim === 'baglanti' ? url.trim() : null,
        son_kontrol: bicim === 'baglanti' ? new Date().toISOString().slice(0, 10) : null,
      })
      .select('id')
      .single()

    if (error) {
      setBekliyor(false)
      return setHata(hataMetni(error))
    }

    if (konuBazli && konuId) {
      await supabase.from('kaynak_konu').insert({ kaynak_id: data.id, konu_id: Number(konuId) })
    }

    setBekliyor(false)
    onEklendi()
  }

  return (
    <div className="form-kutu">
      <Alan etiket="Ad">
        <input
          type="text"
          value={ad}
          onChange={(e) => setAd(e.target.value)}
          placeholder="Örn. Limitte belirsizlik türleri — özet notu"
        />
      </Alan>

      <Alan etiket="Ne tür bir kaynak">
        <select value={faz} onChange={(e) => setFaz(e.target.value)}>
          {Object.entries(FAZ_ADI).map(([k, a]) => (
            <option key={k} value={k}>{a}</option>
          ))}
        </select>
      </Alan>

      <Alan etiket="Ders">
        <select value={dersKod} onChange={(e) => setDersKod(e.target.value)}>
          <option value="">Ders seç</option>
          {dersler.map((d) => (
            <option key={d.ders_kod} value={d.ders_kod}>{d.ad}</option>
          ))}
        </select>
      </Alan>

      <Alan etiket="Sınav bölümü">
        <select value={kapsam} onChange={(e) => setKapsam(e.target.value)}>
          {Object.entries(KAPSAM_ADI).map(([k, a]) => (
            <option key={k} value={k}>{a}</option>
          ))}
        </select>
      </Alan>

      {/* Konu alanı yalnızca konuya bağlanan fazlarda çıkar. */}
      {konuBazli && (
        <Alan
          etiket="Konu"
          ipucu={`${FAZ_ADI[faz]} konuya bağlandığı için soruldu`}
        >
          <select
            value={konuId}
            onChange={(e) => setKonuId(e.target.value)}
            disabled={!konular.length}
          >
            <option value="">{konular.length ? 'Konu seç' : 'Önce ders seç'}</option>
            {konular.map((k) => (
              <option key={k.id} value={k.id}>{k.ad}</option>
            ))}
          </select>
        </Alan>
      )}

      <Alan
        etiket="Seviye"
        ipucu={seviye ? SEVIYE_IPUCU[Number(seviye)] : 'Bilmiyorsan boş bırak, zorunlu değil'}
      >
        <select value={seviye} onChange={(e) => setSeviye(e.target.value)}>
          <option value="">Belirtme</option>
          {Object.entries(SEVIYE_ADI).map(([n, a]) => (
            <option key={n} value={n}>{a}</option>
          ))}
        </select>
      </Alan>

      <Alan etiket="Nerede duruyor">
        <select value={bicim} onChange={(e) => setBicim(e.target.value)}>
          <option value="baglanti">Bağlantı</option>
          <option value="basili">Basılı kitap</option>
        </select>
      </Alan>

      {bicim === 'baglanti' && (
        <Alan
          etiket="Adres"
          ipucu="Yalnızca hak sahibinin kendi yayımladığı sayfalara bağlan"
        >
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://"
          />
        </Alan>
      )}

      {bicim === 'basili' && (
        <Alan etiket="Yayınevi" ipucu="Sayfa aralığı kaynağa değil, göreve yazılır">
          <input
            type="text"
            value={yayinevi}
            onChange={(e) => setYayinevi(e.target.value)}
            placeholder="Örn. Bilgi Sarmal"
          />
        </Alan>
      )}

      <Uyari>{hata}</Uyari>

      <Dugme onClick={kaydet} bekliyor={bekliyor}>
        Kaynağı kaydet
      </Dugme>
    </div>
  )
}
