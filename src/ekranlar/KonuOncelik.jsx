import { useCallback, useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Bos, Kart, Uyari, Yukleniyor } from '../bilesenler/Ortak.jsx'

/* Konular sekmesi — koçun "bu hafta sınıfa neyi anlatayım" sorusuna cevap.

   Eski KonuIsiHaritasi yalnızca öğrencinin elle koyduğu "tekrar" bayrağını
   sayıyordu; kimse bayrak koymayınca ekran boş kalıyordu. Bu bileşen
   konu_oncelik_listesi RPC'sini okur: skor motoru (konu_skor) sınav
   ağırlığı, zorlanma sinyali ve tekrar gecikmesini birlikte tartar.

   İki bölüm:
   - sinif    : ≥2 öğrenci VE ≥%40 zorlanıyor → ortak etüt konusu
   - bireysel : tek tük öğrenci → kişisel plan, ortak ders değil          */

const KAPSAM = { tyt: 'TYT', ayt: 'AYT', tyt_ayt: 'TYT/AYT' }

function tarihKisa(t) {
  if (!t) return '—'
  const d = new Date(t)
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
}

export default function KonuOncelik({ onOgrenciAc }) {
  const [veri, setVeri] = useState(null)
  const [dersId, setDersId] = useState('')
  const [acik, setAcik] = useState(null)
  const [hata, setHata] = useState('')
  const [bildirim, setBildirim] = useState('')
  const [bireyselAcik, setBireyselAcik] = useState(false)

  const yukle = useCallback(async () => {
    const { data, error } = await supabase.rpc('konu_oncelik_listesi', {
      p_ders_id: dersId ? Number(dersId) : null,
      p_limit: 15,
    })
    if (error) {
      setHata(hataMetni(error))
      return
    }
    setHata('')
    setVeri(data)
  }, [dersId])

  useEffect(() => {
    yukle()
  }, [yukle])

  async function gorevAc(k) {
    const idler = [...(k.zorlananlar ?? []), ...(k.gecikenler ?? [])].map((o) => o.id)
    if (idler.length === 0) return
    const { data, error } = await supabase.rpc('konu_tekrar_gorevi_ac', {
      p_konu_id: k.konuId,
      p_ogrenci_idler: idler,
    })
    if (error) {
      setHata(hataMetni(error))
      return
    }
    setBildirim(
      data === 0
        ? 'Hepsinin zaten açık tekrar görevi var.'
        : `${data} öğrenciye "${k.konu} tekrarı" görevi açıldı.`,
    )
    setTimeout(() => setBildirim(''), 4000)
  }

  if (hata && !veri) {
    return (
      <Kart baslik="Açılmadı">
        <Uyari>{hata}</Uyari>
      </Kart>
    )
  }
  if (!veri) return <Yukleniyor />

  const sinif = veri.sinif ?? []
  const bireysel = veri.bireysel ?? []
  const dersler = veri.dersler ?? []

  const satir = (k, tur) => (
    <li key={k.konuId} className="isi-satir">
      <button
        className="isi-dugme"
        onClick={() => setAcik(acik === k.konuId ? null : k.konuId)}
        aria-expanded={acik === k.konuId}
      >
        <span className="isi-ad">
          <span className="liste-ad">{k.konu}</span>
          <span className="liste-alt">
            {[k.ders, KAPSAM[k.kapsam] ?? k.kapsam, k.beklenenSoru > 0 && `≈${k.beklenenSoru} soru`]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </span>
        {/* Çubuk artık "kaçta kaç": payda sınıf, pay zorlanan */}
        <span className={`isi-cubuk isi-cubuk--${tur}`} aria-hidden="true">
          <span style={{ width: `${(k.zorlanan / Math.max(1, k.toplam)) * 100}%` }} />
        </span>
        <span className="isi-sayi">
          {k.zorlanan}/{k.toplam}
        </span>
      </button>

      {acik === k.konuId && (
        <div className="isi-detay">
          <div className="oncelik-kisiler">
            {(k.zorlananlar ?? []).map((o) => (
              <button
                key={o.id}
                type="button"
                className="oncelik-kisi"
                onClick={() => onOgrenciAc?.(o.id)}
                title="Öğrenciyi aç"
              >
                {o.ad}
              </button>
            ))}
          </div>
          <p className="kart-alt">
            {k.gecikmis > 0 && `${k.gecikmis} öğrencide tekrar gecikti · `}
            {k.acilmamis > 0 && `${k.acilmamis} hiç açmadı · `}
            son çalışma {tarihKisa(k.sonCalisma)}
          </p>
          <button type="button" className="dugme dugme--ikincil oncelik-gorev" onClick={() => gorevAc(k)}>
            Hepsine tekrar görevi aç
          </button>
        </div>
      )}
    </li>
  )

  return (
    <>
      <Uyari tur="bilgi">{bildirim}</Uyari>
      <Uyari>{hata}</Uyari>

      <Kart
        baslik="Sınıfça zorlanılan"
        altBaslik={`${veri.ogrenciSayisi} öğrenci · sınava ${veri.sinavaKalan} gün · ortak etüt için`}
        eylem={
          dersler.length > 1 ? (
            <select
              value={dersId}
              onChange={(e) => setDersId(e.target.value)}
              aria-label="Derse göre süz"
              className="isi-suzgec"
            >
              <option value="">Tüm dersler</option>
              {dersler.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.ad}
                </option>
              ))}
            </select>
          ) : null
        }
      >
        {sinif.length === 0 ? (
          <Bos
            baslik="Ortak sorun yok"
            aciklama="Hiçbir konuda öğrencilerin %40'ından fazlası zorlanmıyor. Aşağıdaki bireysel liste yeter."
          />
        ) : (
          <ul className="liste">{sinif.map((k) => satir(k, 'sinif'))}</ul>
        )}
      </Kart>

      <Kart
        baslik="Bireysel"
        altBaslik="Tek tük öğrenci — kişisel plan konusu, ortak ders değil"
        eylem={
          bireysel.length > 0 ? (
            <button
              type="button"
              className="dugme dugme--ikincil"
              onClick={() => setBireyselAcik((a) => !a)}
              aria-expanded={bireyselAcik}
            >
              {bireyselAcik ? 'Gizle' : `${bireysel.length} konu`}
            </button>
          ) : null
        }
      >
        {bireysel.length === 0 ? (
          <Bos baslik="Henüz veri yok" aciklama="Skor motoru öğrenciler çalıştıkça dolar." />
        ) : bireyselAcik ? (
          <ul className="liste">{bireysel.map((k) => satir(k, 'bireysel'))}</ul>
        ) : (
          <p className="kart-alt">
            En öncelikli: {bireysel.slice(0, 3).map((k) => k.konu).join(', ')}
          </p>
        )}
      </Kart>
    </>
  )
}
