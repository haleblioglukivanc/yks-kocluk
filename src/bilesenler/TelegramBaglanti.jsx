import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { Uyari, Yukleniyor } from './Ortak.jsx'
import Bolum from '../ortak/Bolum.jsx'
import EylemDugmesi from '../ortak/EylemDugmesi.jsx'

/* Telefon değişir, hesap kaybolur, kod unutulur. Bunların hiçbiri
   geliştiriciye sorulacak bir şey olmamalı: koç kendi kodunu burada
   üretir, kendi bağlantısını burada koparır.

   Kod ekranda görünüyor ama kalıcı bir şifre değil — tek kullanımlık,
   24 saatlik bir bilet. Kaybolursa yenisi üretilir, eskisi ölür. */

function saatKaldi(bitis) {
  if (!bitis) return null
  const fark = new Date(bitis).getTime() - Date.now()
  if (fark <= 0) return null
  const saat = Math.floor(fark / 3600000)
  if (saat >= 1) return `${saat} saat`
  return `${Math.max(1, Math.round(fark / 60000))} dakika`
}

export default function TelegramBaglanti() {
  const [durum, setDurum] = useState(null)
  const [hata, setHata] = useState(null)
  const [bekliyor, setBekliyor] = useState(false)
  const [kopyalandi, setKopyalandi] = useState(false)

  const yukle = useCallback(async () => {
    const { data, error } = await supabase.rpc('telegram_durumum')
    if (error) { setHata(error.message); return }
    setHata(null)
    setDurum(data)
  }, [])

  useEffect(() => { yukle() }, [yukle])

  async function kodUret() {
    setBekliyor(true)
    const { error } = await supabase.rpc('telegram_kod_al')
    setBekliyor(false)
    if (error) { setHata(error.message); return }
    setKopyalandi(false)
    yukle()
  }

  async function baglantiyiKes() {
    if (!window.confirm('Telegram bağlantısı kesilecek. Bildirimler duracak. Emin misin?')) return
    setBekliyor(true)
    const { error } = await supabase.rpc('telegram_kes')
    setBekliyor(false)
    if (error) { setHata(error.message); return }
    yukle()
  }

  async function kopyala(metin) {
    try {
      await navigator.clipboard.writeText(metin)
      setKopyalandi(true)
      setTimeout(() => setKopyalandi(false), 2000)
    } catch { /* izin yoksa kullanıcı elle seçer */ }
  }

  if (hata) {
    return (
      <Bolum cizgili baslik='Telegram'>
        <Uyari>{hata}</Uyari>
      </Bolum>
    )
  }

  if (durum === null) {
    return (
      <Bolum cizgili baslik='Telegram'>
        <Yukleniyor satir={2} sade />
      </Bolum>
    )
  }

  const bot = durum.bot_kullanici
  const kod = durum.bekleyen_kod
  const kalan = saatKaldi(durum.kod_bitis)

  return (
    /* Kart değil bölüm; durum hap değil açıklama satırı (TASARIM-KURALLARI 7–8). */
    <Bolum
      cizgili
      baslik='Telegram'
      aciklama={durum.bagli_mi ? '● Bağlı' : 'Bağlı değil · öğrencilerinle telefonundan yazış'}
      eylem={durum.bagli_mi ? null : kod ? null : 'Kod üret'}
      onEylem={kodUret}
    >
      {durum.bagli_mi ? (
        <div className='tg-govde'>
          <p className='tg-aciklama'>
            Telegram’dan yazdığın mesajlar öğrenciye gidiyor; öğrenci veya veli
            yazınca telefonuna bildirim düşüyor.
            {durum.aktif_ogrenci && (
              <> Şu an <strong>{durum.aktif_ogrenci}</strong> ile yazışıyorsun.</>
            )}
          </p>
          <p className='tg-not'>
            Telefonun değiştiyse ve aynı Telegram hesabını kullanıyorsan bir şey
            yapmana gerek yok. Hesabı kaybettiysen önce bağlantıyı kes, sonra
            yeni kod üret.
          </p>
          <button className='tehlike-yazi-dugme' onClick={baglantiyiKes} disabled={bekliyor}>
            Bağlantıyı kes
          </button>
        </div>
      ) : kod ? (
        <div className='tg-govde'>
          <ol className='tg-adimlar'>
            <li>
              Telegram’da <a className='tg-link' href={`https://t.me/${bot}`}
                 target='_blank' rel='noreferrer'>@{bot}</a> botunu aç.
            </li>
            <li>Aşağıdaki satırı olduğu gibi gönder.</li>
          </ol>

          <button className='tg-kod' onClick={() => kopyala(`/baglan ${kod}`)}>
            <code>/baglan {kod}</code>
            <span className='tg-kopyala'>{kopyalandi ? 'Kopyalandı' : 'Kopyala'}</span>
          </button>

          <p className='tg-not'>
            {kalan ? `Kod ${kalan} geçerli.` : 'Kodun süresi doldu.'} Tek kullanımlık —
            kaybedersen yenisini üretebilirsin.
          </p>
          <EylemDugmesi onClick={kodUret} disabled={bekliyor} ikon='ekle'>Yeni kod üret</EylemDugmesi>
        </div>
      ) : (
        <div className='tg-govde'>
          <p className='tg-aciklama'>
            Bağlandığında öğrencilerinle Telegram üzerinden yazışabilir, gelen
            mesajları uygulamayı açmadan cevaplayabilirsin.
          </p>
        </div>
      )}
    </Bolum>
  )
}
