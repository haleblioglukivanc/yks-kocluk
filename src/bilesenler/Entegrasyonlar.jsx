import { useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Uyari, Yukleniyor } from './Ortak.jsx'
import Bolum from '../ortak/Bolum.jsx'

/**
 * Yönetim → Teknik → Entegrasyonlar. Her dış servis tek satır: anahtar
 * tanımlı mı, en son ne zaman çalıştı, bekleyen/hata var mı.
 * Kaynaklar: yonetici_entegrasyon_durumu (veritabanı izleri, Vault adları) +
 * sistem-durumu Edge Function (fonksiyon ortamındaki anahtar ADLARI; değer yok).
 */
const kisa = (z) =>
  z ? new Date(z).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : null

export default function Entegrasyonlar() {
  const [db, setDb] = useState(null)
  const [env, setEnv] = useState(null)
  const [hata, setHata] = useState('')
  const [anahtarAcik, setAnahtarAcik] = useState(false)

  useEffect(() => {
    supabase.rpc('yonetici_entegrasyon_durumu').then(({ data, error }) => {
      if (error) setHata(hataMetni(error))
      else setDb(data)
    })
    supabase.functions.invoke('sistem-durumu', { body: {} }).then(({ data, error }) => {
      setEnv(error ? { anahtarlar: [], degerler: {}, hata: true } : data)
    })
  }, [])

  if (hata) return <Bolum baslik="Entegrasyonlar"><Uyari>{hata}</Uyari></Bolum>
  if (!db || !env) return <Bolum baslik="Entegrasyonlar"><Yukleniyor satir={4} /></Bolum>

  const v = new Set(db.vault ?? [])
  const e = new Set(env.anahtarlar ?? [])
  const varMi = (...adlar) => adlar.every((a) => e.has(a))

  const satirlar = [
    {
      ad: 'E-posta',
      alt: [
        db.eposta.son ? `son gönderim ${kisa(db.eposta.son)}` : 'hiç gönderilmedi',
        db.eposta.bekleyen ? `${db.eposta.bekleyen} bekliyor` : null,
        db.eposta.hata_7g ? `7 günde ${db.eposta.hata_7g} hata` : null,
      ],
      durum: !v.has('servis_anahtari') ? ['uyari', 'Anahtar yok'] : db.eposta.hata_7g ? ['uyari', 'Hata var'] : db.eposta.bekleyen > 3 ? ['izle', 'Kuyruk birikti'] : ['iyi', 'Çalışıyor'],
    },
    {
      ad: 'SMS · İleti Merkezi',
      alt: [
        env.degerler?.ILETIMERKEZI_SENDER ? `başlık ${env.degerler.ILETIMERKEZI_SENDER}` : null,
        db.sms.son ? `son gönderim ${kisa(db.sms.son)}` : 'hiç gönderilmedi',
        db.sms.bekleyen ? `${db.sms.bekleyen} bekliyor` : null,
        db.sms.hata_7g ? `7 günde ${db.sms.hata_7g} hata` : null,
      ],
      durum: env.hata ? ['sonuk', 'Bilinmiyor'] : !varMi('ILETIMERKEZI_KEY', 'ILETIMERKEZI_HASH') ? ['uyari', 'Anahtar yok'] : db.sms.hata_7g ? ['uyari', 'Hata var'] : db.sms.bekleyen && !db.sms.son ? ['izle', 'Gönderilmemiş var'] : ['iyi', 'Hazır'],
    },
    {
      ad: 'Telegram',
      alt: [db.telegram.bot ? `@${db.telegram.bot}` : null, `${db.telegram.bagli} bağlı hesap`],
      durum: v.has('telegram_bot_token') && db.telegram.bot ? ['iyi', 'Bağlı'] : ['uyari', 'Kurulmamış'],
    },
    {
      ad: 'Web bildirimi',
      alt: ['tarayıcı ve telefon bildirimleri'],
      durum: v.has('vapid_genel') && v.has('vapid_ozel') ? ['iyi', 'Hazır'] : ['uyari', 'Anahtar yok'],
    },
    {
      ad: 'YouTube',
      alt: [db.youtube.son ? `son yorum ${kisa(db.youtube.son)}` : 'henüz yorum çekilmedi'],
      durum: db.youtube.bagli ? ['iyi', 'Bağlı'] : varMi('YT_CLIENT_ID', 'YT_CLIENT_SECRET') ? ['izle', 'Hesap bağlanmadı'] : ['sonuk', 'Kurulmamış'],
    },
    {
      ad: 'Instagram',
      alt: [db.instagram.son ? `son mesaj ${kisa(db.instagram.son)}` : 'henüz mesaj yok'],
      durum: varMi('IG_TOKEN') ? ['iyi', 'Bağlı'] : ['sonuk', 'Kurulmamış'],
    },
    {
      ad: 'Yapay zekâ · deneme analizi',
      alt: [
        env.degerler?.AI_SAGLAYICI ? `sağlayıcı ${env.degerler.AI_SAGLAYICI}` : null,
        db.yz.model ? `model ${db.yz.model}` : null,
        db.yz.son ? `son analiz ${kisa(db.yz.son)}` : 'henüz analiz yok',
        db.yz.hata_7g ? `7 günde ${db.yz.hata_7g} hata` : null,
      ],
      durum: db.yz.hata_7g ? ['uyari', 'Hata var'] : ['iyi', 'Hazır'],
    },
  ]

  const tumAnahtarlar = [...(db.vault ?? []).map((a) => `${a} (Vault)`), ...(env.anahtarlar ?? [])]

  return (
    <Bolum
      baslik="Entegrasyonlar"
      sayi={satirlar.length}
      aciklama="Dış servisler: anahtar tanımlı mı, en son ne zaman çalıştı."
      eylem={anahtarAcik ? 'Anahtarları gizle' : 'Anahtar adları'}
      onEylem={() => setAnahtarAcik((a) => !a)}
    >
      <ul className="liste">
        {satirlar.map((s) => (
          <li key={s.ad} className="liste-satir">
            <div>
              <span className="liste-ad">{s.ad}</span>
              <span className="liste-alt">{s.alt.filter(Boolean).join(' · ')}</span>
            </div>
            <span className="durum-yazi" data-durum={s.durum[0]}>● {s.durum[1]}</span>
          </li>
        ))}
      </ul>
      {anahtarAcik && (
        <p className="bolum-aciklama teknik-anahtarlar">
          Tanımlı anahtarlar (yalnız adlar, değerler gösterilmez): {tumAnahtarlar.join(', ') || '—'}
          {env.hata ? ' · fonksiyon ortamı okunamadı' : ''}
        </p>
      )}
    </Bolum>
  )
}
