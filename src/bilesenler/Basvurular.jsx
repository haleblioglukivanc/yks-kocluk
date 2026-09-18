import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Uyari, Yukleniyor } from './Ortak.jsx'
import Bolum from '../ortak/Bolum.jsx'
import BosDurum from '../ortak/BosDurum.jsx'
import Sekmeler from '../ortak/Sekmeler.jsx'
import EylemDugmesi from '../ortak/EylemDugmesi.jsx'

/**
 * Tanıtım sitesindeki randevu formundan gelen başvurular (Yönetim → İletişim).
 * Eskiden yalnız Telegram + e-postaya düşüyordu; bildirim kaçarsa başvuru
 * kayboluyordu (TESPIT-YONETIM.md 2.4). Durum: yeni → arandı → kayıt oldu / olmadı.
 */
const DURUM = { yeni: 'Yeni', arandi: 'Arandı', kayit_oldu: 'Kayıt oldu', olmadi: 'Olmadı', kapandi: 'Olmadı' }
const DURUM_TON = { yeni: 'uyari', arandi: 'izle', kayit_oldu: 'iyi', olmadi: 'sonuk', kapandi: 'sonuk' }
const ZAMAN = { hafta_ici_gunduz: 'hafta içi gündüz', hafta_ici_aksam: 'hafta içi akşam', hafta_sonu: 'hafta sonu' }
const telYaz = (t) => (t ? `0${t.slice(0, 3)} ${t.slice(3, 6)} ${t.slice(6, 8)} ${t.slice(8)}` : '')
const kisa = (z) => new Date(z).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

export default function Basvurular() {
  const [liste, setListe] = useState(null)
  const [filtre, setFiltre] = useState('yeni')
  const [hata, setHata] = useState('')

  const yukle = useCallback(async () => {
    const { data, error } = await supabase
      .from('basvurular')
      .select('id, hizmet, ad_soyad, telefon, dolduran, sinav, sinif, arama_zamani, not_metni, durum, arandi_zaman, sonuc_notu, olusturuldu')
      .order('olusturuldu', { ascending: false })
      .limit(200)
    if (error) setHata(hataMetni(error))
    setListe(data ?? [])
  }, [])

  useEffect(() => {
    yukle()
  }, [yukle])

  const sayi = useMemo(() => {
    const s = { yeni: 0, arandi: 0, kayit_oldu: 0, olmadi: 0 }
    for (const b of liste ?? []) s[b.durum === 'kapandi' ? 'olmadi' : b.durum] += 1
    return s
  }, [liste])

  const gorunen = (liste ?? []).filter((b) =>
    filtre === 'tumu' ? true : filtre === 'olmadi' ? ['olmadi', 'kapandi'].includes(b.durum) : b.durum === filtre)

  return (
    <Bolum
      baslik="Başvurular"
      sayi={liste?.length ?? null}
      aciklama="Tanıtım sitesindeki formdan gelenler. Aradıkça durumunu işaretle."
    >
      <Uyari>{hata}</Uyari>
      <Sekmeler
        varyant="acik"
        etiket="Başvuru durumu"
        deger={filtre}
        onSec={setFiltre}
        secenekler={[
          { k: 'yeni', ad: 'Yeni', rozet: sayi.yeni ? <span className="alt-sekme-sayi" data-segment="acil">{sayi.yeni}</span> : null },
          { k: 'arandi', ad: 'Arandı', rozet: <span className="alt-sekme-sayi">{sayi.arandi}</span> },
          { k: 'kayit_oldu', ad: 'Kayıt oldu', rozet: <span className="alt-sekme-sayi">{sayi.kayit_oldu}</span> },
          { k: 'olmadi', ad: 'Olmadı', rozet: <span className="alt-sekme-sayi">{sayi.olmadi}</span> },
          { k: 'tumu', ad: 'Tümü' },
        ]}
      />
      {liste === null ? (
        <Yukleniyor satir={3} />
      ) : gorunen.length === 0 ? (
        <BosDurum metin={filtre === 'yeni' ? 'Bekleyen yeni başvuru yok.' : 'Bu durumda başvuru yok.'} />
      ) : (
        <ul className="basvuru-liste">
          {gorunen.map((b) => <Basvuru key={b.id} b={b} onDegisti={yukle} />)}
        </ul>
      )}
    </Bolum>
  )
}

function Basvuru({ b, onDegisti }) {
  const [not, setNot] = useState('')
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState('')

  async function isle(durum) {
    setHata('')
    setBekliyor(true)
    const { error } = await supabase.rpc('basvuru_isle', { p_id: b.id, p_durum: durum, p_not: not })
    setBekliyor(false)
    if (error) return setHata(hataMetni(error))
    setNot('')
    onDegisti()
  }

  const alt = [
    b.hizmet === 'danismanlik' ? 'Danışmanlık' : `${b.sinav} · ${b.sinif === 'mezun' ? 'mezun' : `${b.sinif}. sınıf`}`,
    b.dolduran === 'veli' ? 'veli doldurdu' : 'öğrenci doldurdu',
    ZAMAN[b.arama_zamani] ? `aranmak istiyor: ${ZAMAN[b.arama_zamani]}` : null,
  ].filter(Boolean)

  return (
    <li className="basvuru veri-yuzey">
      <div className="basvuru-bas">
        <span className="liste-ad">{b.ad_soyad}</span>
        <span className="durum-yazi" data-durum={DURUM_TON[b.durum]}>● {DURUM[b.durum]}</span>
      </div>
      <a className="basvuru-tel" href={`tel:+90${b.telefon}`}>{telYaz(b.telefon)}</a>
      <p className="liste-alt">{alt.join(' · ')} · {kisa(b.olusturuldu)}</p>
      {b.not_metni && <p className="basvuru-not">“{b.not_metni}”</p>}
      {b.sonuc_notu && <p className="liste-alt">Görüşme notu: {b.sonuc_notu}</p>}
      <label className="basvuru-not-alan">
        <span className="alan-etiket">Görüşme notu</span>
        <input value={not} onChange={(e) => setNot(e.target.value)} placeholder="İsteğe bağlı, örn. hafta sonu tekrar ara" />
      </label>
      <Uyari>{hata}</Uyari>
      <div className="basvuru-eylem">
        {b.durum !== 'arandi' && <EylemDugmesi ikon="ok" onClick={() => isle('arandi')} disabled={bekliyor}>Arandı</EylemDugmesi>}
        {b.durum !== 'kayit_oldu' && <EylemDugmesi ikon="ekle" onClick={() => isle('kayit_oldu')} disabled={bekliyor}>Kayıt oldu</EylemDugmesi>}
        {!['olmadi', 'kapandi'].includes(b.durum) && (
          <button type="button" className="metin-dugme" onClick={() => isle('olmadi')} disabled={bekliyor}>Olmadı</button>
        )}
        {b.durum !== 'yeni' && (
          <button type="button" className="metin-dugme" onClick={() => isle('yeni')} disabled={bekliyor}>Yeniye al</button>
        )}
      </div>
    </li>
  )
}
