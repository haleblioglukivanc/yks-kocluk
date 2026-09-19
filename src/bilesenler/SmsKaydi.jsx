import { useCallback, useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Uyari, Yukleniyor } from './Ortak.jsx'
import Bolum from '../ortak/Bolum.jsx'
import BosDurum from '../ortak/BosDurum.jsx'

/* Yönetim → İletişim: SMS kuyruğunun kaydı (veli haftalık özetleri). Bekleyen
   ya da hatalı kayıt iptal edilebilir; gönderim sms-gonder'de. */
const DURUM = { bekliyor: 'Bekliyor', gonderiliyor: 'Gönderiliyor', gonderildi: 'Gönderildi', hata: 'Hata', iptal: 'İptal' }
const TON = { bekliyor: 'izle', gonderiliyor: 'izle', gonderildi: 'iyi', hata: 'uyari', iptal: 'sonuk' }

export default function SmsKaydi() {
  const [liste, setListe] = useState(null)
  const [hepsi, setHepsi] = useState(false)
  const [hata, setHata] = useState('')

  const yukle = useCallback(async () => {
    const { data, error } = await supabase.rpc('yonetici_sms_kaydi', { p_limit: 50 })
    if (error) setHata(hataMetni(error))
    setListe(data ?? [])
  }, [])
  useEffect(() => {
    yukle()
  }, [yukle])

  async function iptal(id) {
    const { error } = await supabase.rpc('yonetici_sms_iptal', { p_id: id })
    if (error) setHata(hataMetni(error))
    else yukle()
  }

  const gosterilen = liste ? (hepsi ? liste : liste.slice(0, 5)) : []
  return (
    <Bolum
      cizgili
      baslik="SMS kaydı"
      sayi={liste?.length || null}
      aciklama="Veliye giden haftalık özetler. SMS gönderimi kapalı; veli özetleri koçun Bugün ekranındaki “Veliye iletilecek” kutusundan WhatsApp ile iletilir."
      eylem={liste && liste.length > 5 ? (hepsi ? 'Kısalt' : `Tümü · ${liste.length}`) : null}
      onEylem={() => setHepsi((v) => !v)}
    >
      <Uyari>{hata}</Uyari>
      {liste === null ? (
        <Yukleniyor />
      ) : liste.length === 0 ? (
        <BosDurum metin="Henüz SMS gönderilmedi." />
      ) : (
        <ul className="liste">
          {gosterilen.map((s) => (
            <li key={s.id} className="liste-satir">
              <div>
                <span className="liste-ad">{s.veli ?? s.ogrenci ?? 'Alıcı yok'}</span>
                <span className="liste-alt">
                  {new Date(s.gonderildi ?? s.olusturuldu).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  {' · '}{String(s.govde ?? '').slice(0, 60)}{String(s.govde ?? '').length > 60 ? '…' : ''}
                  {s.hata ? ` · ${s.hata}` : ''}
                </span>
              </div>
              <span className="sms-sag">
                <span className="durum-yazi" data-durum={TON[s.durum] ?? 'notr'}>● {DURUM[s.durum] ?? s.durum}</span>
                {['bekliyor', 'hata'].includes(s.durum) && (
                  <button type="button" className="metin-dugme" onClick={() => iptal(s.id)}>İptal</button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Bolum>
  )
}
