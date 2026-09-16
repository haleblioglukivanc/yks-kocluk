import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Kart, Uyari, Yukleniyor } from './Ortak.jsx'

/* Veliye giden haftalık özet otomatik SMS ile gitmiyor.
   Gerekçe: elimizdeki onaylı gönderici başlığı başka bir firmanın
   (FIRATILTSM). Veli, tanımadığı bir başlıktan gelen mesajı anlamaz;
   başkasının markasıyla mesaj atmak da doğru değil. Başlıklar firma
   unvanı/marka ile eşleşmek zorunda olduğundan "bilgi" gibi genel bir
   başlık alınamıyor.

   Bu yüzden: koç onaylar → mesaj burada bekler → koç kendi telefonundan
   WhatsApp ile gönderir. Veli kimden geldiğini bilir, maliyet yok,
   okundu bilgisi var. Bedeli: gönderim koçun bir dokunuşuna bağlı —
   sayaç ve rozet bunu hatırlatıyor.

   Kuyruk (sms_kuyrugu) ve onun tetikleyicisi aynen duruyor. Kendi
   başlığımız onaylanırsa cron'u yeniden kurmak yetiyor. */

const ILISKI = { anne: 'annesi', baba: 'babası', vasi: 'vasisi', diger: 'velisi' }

/* +905321112233 okunmuyor; 0532 111 22 33 gösteriliyor. */
function telYaz(t) {
  return /^\+90\d{10}$/.test(t ?? '')
    ? `0${t.slice(3, 6)} ${t.slice(6, 9)} ${t.slice(9, 11)} ${t.slice(11)}`
    : (t ?? '')
}

/* wa.me ülke kodunu başında artı olmadan ister. */
function waNumara(t) {
  const s = (t ?? '').replace(/[^0-9]/g, '')
  if (s.startsWith('90')) return s
  if (s.startsWith('0')) return `90${s.slice(1)}`
  return s.length === 10 ? `90${s}` : s
}

function basHarf(ad) {
  return (ad ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toLocaleUpperCase('tr-TR')
}

/* Üç gün dokunulmamış mesaj unutulmuş demektir. */
const GECIKME_GUN = 3
function gecikti(olusturuldu) {
  return Date.now() - new Date(olusturuldu).getTime() > GECIKME_GUN * 864e5
}

function SimgeWhatsapp() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="vm-simge">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5 0-.9.2-3-.9-2.5-1.3-4-4-4.2-4.2-.1-.2-1-1.4-1-2.6s.6-1.8.9-2c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.5c-.1.2-.3.3-.1.6.1.3.6 1.1 1.4 1.8 1 .9 1.8 1.1 2 1.2.3.1.4.1.6-.1l.7-.9c.2-.2.4-.2.6-.1l1.9.9c.2.1.4.2.4.3.1.2.1.6 0 1.1Z" />
    </svg>
  )
}

function Mesaj({ satir, onIsaretle }) {
  const [acik, setAcik] = useState(false)
  const [kopyalandi, setKopyalandi] = useState(false)
  const iletildi = satir.durum === 'gonderildi'

  async function kopyala() {
    try {
      await navigator.clipboard.writeText(satir.govde)
      setKopyalandi(true)
      setTimeout(() => setKopyalandi(false), 1400)
    } catch {
      /* izin yoksa sessiz geç; metin zaten ekranda, elle seçilebilir */
    }
  }

  /* Sohbeti mesaj yazılı açar. Koç yalnız gönder'e basar; biz gönderdi
     varsayıyoruz ama "Geri al" ile dönülebiliyor. */
  function whatsapp() {
    const adres = `https://wa.me/${waNumara(satir.telefon)}?text=${encodeURIComponent(satir.govde)}`
    window.open(adres, '_blank', 'noopener')
    onIsaretle(satir.id, true)
  }

  return (
    <li className="vm-satir" data-durum={satir.durum} data-gec={!iletildi && gecikti(satir.olusturuldu) ? '1' : null}>
      <div className="vm-bas">
        <div className="vm-harf" aria-hidden="true">{basHarf(satir.veli_ad)}</div>
        <div className="vm-kim">
          <span className="vm-ad">{satir.veli_ad}</span>
          <span className="vm-alt">
            {satir.ogrenci_ad}'in {ILISKI[satir.iliski] ?? 'velisi'} ·{' '}
            <span className="vm-tel">{telYaz(satir.telefon)}</span>
          </span>
        </div>
        <span className={`vm-durum vm-durum--${iletildi ? 'iletildi' : 'bekliyor'}`}>
          {iletildi ? 'İletildi' : 'Bekliyor'}
        </span>
      </div>

      <p className={acik ? 'vm-metin' : 'vm-metin vm-metin--kisa'}>{satir.govde}</p>

      <div className="vm-eylem">
        {iletildi ? (
          <button className="dugme dugme--ikincil" onClick={() => onIsaretle(satir.id, false)}>
            Geri al
          </button>
        ) : (
          <button className="dugme dugme--whatsapp" onClick={whatsapp}>
            <SimgeWhatsapp />
            WhatsApp'ta aç
          </button>
        )}
        <button className="dugme dugme--ikincil" onClick={kopyala}>
          {kopyalandi ? 'Kopyalandı' : 'Kopyala'}
        </button>
        <button className="metin-dugme vm-ac" onClick={() => setAcik((v) => !v)}>
          {acik ? 'Kısalt' : 'Tam metni gör'}
        </button>
      </div>
    </li>
  )
}

export default function VeliMesajlari() {
  const [liste, setListe] = useState(null)
  const [hata, setHata] = useState('')

  const yukle = useCallback(async () => {
    const { data, error } = await supabase.rpc('koc_veli_mesajlari')
    if (error) setHata(hataMetni(error))
    setListe(data ?? [])
  }, [])

  useEffect(() => {
    yukle()
    /* Karar kuyruğu bir özeti onayladığında kutu kendini tazeler; yoksa
       satır ancak sayfa yenilenince görünüyordu. */
    window.addEventListener('veli-mesaji-eklendi', yukle)
    return () => window.removeEventListener('veli-mesaji-eklendi', yukle)
  }, [yukle])

  /* İyimser güncelleme: damga tek alan, hata olursa listeyi tazeliyoruz. */
  const isaretle = useCallback(async (id, iletildi) => {
    setListe((l) =>
      (l ?? []).map((s) =>
        s.id === id
          ? { ...s, durum: iletildi ? 'gonderildi' : 'bekliyor', gonderildi: iletildi ? new Date().toISOString() : null }
          : s,
      ),
    )
    const { error } = await supabase.rpc('koc_veli_mesaji_isaretle', {
      p_id: id,
      p_iletildi: iletildi,
    })
    if (error) {
      setHata(hataMetni(error))
      yukle()
    }
  }, [yukle])

  const bekleyen = useMemo(
    () => (liste ?? []).filter((s) => s.durum !== 'gonderildi').length,
    [liste],
  )

  /* Bekleyen de iletilen de yoksa kart hiç görünmesin: koçun panosunda
     boş kutu durmasın. */
  if (liste !== null && liste.length === 0) return null

  return (
    <Kart
      sinif="kart--veli-mesaj"
      baslik="Veliye iletilecek"
      altBaslik="Onayladığın özetler burada bekler. WhatsApp'tan kendi numaranla gönderirsin."
      eylem={
        bekleyen > 0 ? (
          <span className="vm-sayac">
            <span>{bekleyen}</span> bekliyor
          </span>
        ) : null
      }
    >
      <Uyari>{hata}</Uyari>

      {liste === null ? (
        <Yukleniyor metin="Mesajlar geliyor" satir={2} />
      ) : (
        <>
          <ul className="vm-liste">
            {liste.map((s) => (
              <Mesaj key={s.id} satir={s} onIsaretle={isaretle} />
            ))}
          </ul>
          <p className="vm-ipucu">
            WhatsApp'ta aç dediğinde velinin sohbeti mesaj yazılı hâlde açılır; sen yalnız
            gönder'e basarsın. İletilenler bir gün burada soluk durur, sonra düşer.
          </p>
        </>
      )}
    </Kart>
  )
}
