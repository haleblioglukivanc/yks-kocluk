import { useCallback, useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Uyari, Yukleniyor } from './Ortak.jsx'
import Bolum from '../ortak/Bolum.jsx'
import BosDurum from '../ortak/BosDurum.jsx'

/**
 * Yönetim → Öğrenciler ve veliler → Veliler. İki kaynak:
 * uygulama hesabı olan veliler ve SMS/izin kaydı olan veliler (hesabı olmayabilir).
 * KVKK: izin ne zaman, hangi kanaldan, kim tarafından alındı; geri çekilebilir.
 */
const KANAL = { telefon: 'telefonla', eposta: 'e-postayla', whatsapp: 'WhatsApp’tan', yuz_yuze: 'yüz yüze', form: 'formla', diger: 'diğer' }
const tarih = (t) => (t ? new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : null)

export default function Veliler() {
  const [v, setV] = useState(null)
  const [hata, setHata] = useState('')

  const yukle = useCallback(async () => {
    const { data, error } = await supabase.rpc('yonetici_veli_listesi')
    if (error) setHata(hataMetni(error))
    setV(data ?? { kayitlar: [], hesaplar: [] })
  }, [])
  useEffect(() => {
    yukle()
  }, [yukle])

  async function geriCek(id) {
    const { error } = await supabase.rpc('yonetici_veli_izin_geri_cek', { p_veli: id })
    if (error) setHata(hataMetni(error))
    else yukle()
  }

  const toplam = v ? v.hesaplar.length + v.kayitlar.length : null
  return (
    <Bolum cizgili baslik="Veliler" sayi={toplam || null} aciklama="Uygulama hesabı olanlar ve SMS izni kaydı olanlar.">
      <Uyari>{hata}</Uyari>
      {v === null ? (
        <Yukleniyor />
      ) : toplam === 0 ? (
        <BosDurum metin="Kayıtlı veli yok." />
      ) : (
        <ul className="liste">
          {v.hesaplar.map((h) => (
            <li key={h.id} className="liste-satir">
              <div>
                <span className="liste-ad">{h.ad}</span>
                <span className="liste-alt">
                  {(h.ogrenciler ?? []).join(', ') || 'bağlı öğrenci yok'} · uygulama hesabı
                  {h.telefon ? ` · ${h.telefon}` : ''}
                </span>
              </div>
            </li>
          ))}
          {v.kayitlar.map((k) => (
            <li key={`k${k.id}`} className="liste-satir">
              <div>
                <span className="liste-ad">{k.ad}</span>
                <span className="liste-alt">
                  {k.ogrenci ?? 'öğrenci silinmiş'} · {k.telefon}
                  {k.sms_izni
                    ? ` · SMS izni ${tarih(k.izin_zamani) ?? ''} ${KANAL[k.izin_kanali] ?? k.izin_kanali ?? ''}${k.izni_alan ? `, alan: ${k.izni_alan}` : ''}`
                    : ' · SMS izni yok'}
                </span>
              </div>
              {k.sms_izni && (
                <button type="button" className="metin-dugme" onClick={() => geriCek(k.id)}>İzni geri çek</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Bolum>
  )
}
