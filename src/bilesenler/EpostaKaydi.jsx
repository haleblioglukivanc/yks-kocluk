import { useCallback, useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Uyari, Yukleniyor } from './Ortak.jsx'
import { haftaAraligi } from '../lib/hafta.js'
import Bolum from '../ortak/Bolum.jsx'
import BosDurum from '../ortak/BosDurum.jsx'
import EylemDugmesi from '../ortak/EylemDugmesi.jsx'

/* Posta kuyruğunun kaydı: koç raporları, veli özetleri, başvuru ve sosyal
   medya acil bildirimleri. Raporlar ekranındaydı; rapor değil sistem kaydı
   olduğu için Yönetim → Sistem'e taşındı (Bekir, 18 Eylül 2026). Haftalık
   koç raporu zaten kendiliğinden gidiyor; buradaki düğmeler elle gönderim
   ve altyapı sınaması için. */

const DURUM_YAZI = { bekliyor: 'sırada', gonderiliyor: 'gönderiliyor', gonderildi: 'gönderildi', hata: 'hata', iptal: 'iptal' }
const TIP_YAZI = {
  veli_haftalik: 'Veli · haftalık',
  koc_gunluk: 'Koç · günlük',
  koc_haftalik: 'Koç · haftalık',
  ogrenci_haftalik: 'Öğrenci · haftalık',
}

export default function EpostaKaydi() {
  const [gecmis, setGecmis] = useState(null)
  const [hepsi, setHepsi] = useState(false)
  const [islemde, setIslemde] = useState(null)
  const [hata, setHata] = useState('')
  const [bilgi, setBilgi] = useState('')

  const yukle = useCallback(async () => {
    const { data } = await supabase
      .from('mail_kuyrugu')
      .select('id, rapor_tipi, konu, durum, hata_mesaji, gonderildi_zaman, olusturuldu')
      .order('olusturuldu', { ascending: false })
      .limit(20)
    setGecmis(data ?? [])
  }, [])

  useEffect(() => {
    yukle()
  }, [yukle])

  async function haftalikGonder() {
    setIslemde('gonder')
    setHata('')
    setBilgi('')
    const [bas, bit] = haftaAraligi()
    const { error } = await supabase.rpc('koc_raporu_gonder', {
      p_tip: 'koc_haftalik',
      p_baslangic: bas,
      p_bitis: bit,
    })
    if (error) {
      setIslemde(null)
      setHata(hataMetni(error))
      return
    }
    const { data, error: fnHata } = await supabase.functions.invoke('rapor-mail')
    setIslemde(null)
    if (fnHata) setBilgi('Rapor kuyruğa alındı ama gönderici yanıt vermedi. Listeden durumu izleyebilirsin.')
    else if (data?.basarisiz > 0) setHata('Gönderim başarısız. Listede hata mesajı yazıyor.')
    else setBilgi('Bu haftanın raporu e-posta olarak gönderildi.')
    await yukle()
  }

  async function testMaili() {
    setIslemde('test')
    setHata('')
    setBilgi('')
    const { data, error } = await supabase.functions.invoke('rapor-mail', { body: { test: true } })
    setIslemde(null)
    if (error || data?.tamam === false) {
      setHata(`Mail altyapısı yanıt vermedi: ${data?.hata ?? error?.message ?? 'bilinmeyen hata'}`)
      return
    }
    setBilgi(`Test maili ${data?.alici ?? 'gönderen adrese'} yollandı.`)
  }

  const gosterilen = gecmis ? (hepsi ? gecmis : gecmis.slice(0, 5)) : []

  return (
    <Bolum
      cizgili
      baslik='E-posta kaydı'
      aciklama='Giden bütün mailler. Haftalık koç raporu kendiliğinden gider.'
      eylem={islemde === 'gonder' ? 'Gönderiliyor…' : 'Haftalık raporu gönder'}
      onEylem={() => islemde !== 'gonder' && haftalikGonder()}
    >
      <Uyari>{hata}</Uyari>
      <Uyari tur='bilgi'>{bilgi}</Uyari>
      {gecmis === null ? (
        <Yukleniyor />
      ) : gecmis.length === 0 ? (
        <BosDurum metin='Henüz mail gitmedi. Önce test maili göndererek altyapıyı doğrula.' />
      ) : (
        <ul className='liste rapor-gecmis'>
          {gosterilen.map((m) => (
            <li key={m.id} className='liste-satir'>
              <div className='rapor-satir-metin'>
                <span className='liste-ad'>{m.konu}</span>
                <span className='liste-alt'>
                  {TIP_YAZI[m.rapor_tipi] ?? m.rapor_tipi} ·{' '}
                  {new Date(m.gonderildi_zaman ?? m.olusturuldu).toLocaleString('tr-TR', {
                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                  })}
                </span>
                {m.durum === 'hata' && m.hata_mesaji && <span className='rapor-hata'>{m.hata_mesaji}</span>}
              </div>
              <span
                className='durum-yazi'
                data-durum={m.durum === 'hata' ? 'uyari' : m.durum === 'gonderildi' ? 'notr' : 'sonuk'}
              >
                {DURUM_YAZI[m.durum] ?? m.durum}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className='rapor-eposta-alt'>
        {gecmis && gecmis.length > 5 ? (
          <EylemDugmesi onClick={() => setHepsi((v) => !v)}>
            {hepsi ? 'Kısalt' : `Tümü · ${gecmis.length}`}
          </EylemDugmesi>
        ) : <span />}
        <EylemDugmesi ikon='gonder' onClick={testMaili} disabled={islemde === 'test'}>
          {islemde === 'test' ? 'Gönderiliyor…' : 'Test maili'}
        </EylemDugmesi>
      </div>
    </Bolum>
  )
}
