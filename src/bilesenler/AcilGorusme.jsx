import { useCallback, useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { AltSayfa, Uyari } from './Ortak.jsx'

/**
 * Öğrencinin acil görüşme hakkı.
 *
 * Terapideki acil seans mantığı: haftada bir kez, sebep yazma zorunluluğu
 * olmadan koçtan görüşme istenebilir. Hak pazartesi yenilenir, birikmez.
 * Zorunlu sebep tam da yazamayan öğrenciyi durdururdu; öğrenciden istenen
 * tek şey aciliyet: bugün mü, bu hafta içinde mi.
 *
 * Ekranda sabit bir kutu olarak duruyordu; her gün yer kaplayıp hiçbir şey
 * söylemiyordu. Şimdi selam satırının sağında küçük bir ikon. Dokunuş
 * doğrudan sinyal göndermiyor: haftada tek hak var, cepte yanlış dokunma
 * hakkı konuşmadan yakardı. Dokununca yaprak açılır, sinyal gönder deyince
 * gider. İkon kendiliğinden sallanmaz — hareket öğrencinin dokunuşuna
 * cevap verir, duran kırmızı bir ikonun kendi kendine titremesi her gün
 * alarm gibi görünürdü.
 *
 * Randevunun günü, saati ve süresi koçun insiyatifinde.
 *
 * Vekaleten bakan koç ekranın aynısını görür — ikon, hak durumu ve yaprak
 * dahil. Gönderme kapalıdır: talebi öğrencinin kendisi açar, koçun onun
 * adına haftalık hakkını yakması anlamsız olurdu.
 */
export default function AcilGorusme({ ogrenciId = null, saltOkunur = false }) {
  const [hak, setHak] = useState(null)
  const [acik, setAcik] = useState(false)
  const [canli, setCanli] = useState(false)
  const [aciliyet, setAciliyet] = useState('bu_hafta')
  const [notMetni, setNotMetni] = useState('')
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState('')

  const yukle = useCallback(async () => {
    const { data, error } = await supabase.rpc('ogrenci_gorusme_hakki',
      ogrenciId ? { p_ogrenci_id: ogrenciId } : {})
    if (!error) setHak(data ?? null)
  }, [ogrenciId])

  useEffect(() => {
    yukle()
  }, [yukle])

  async function gonder() {
    setBekliyor(true)
    setHata('')
    const { data, error } = await supabase.rpc('ogrenci_gorusme_iste', {
      p_aciliyet: aciliyet,
      p_not: notMetni,
    })
    setBekliyor(false)
    if (error) {
      setHata(hataMetni(error))
      return
    }
    setAcik(false)
    setNotMetni('')
    if (data?.durum === 'hak_yok') {
      setHak({ kullanilabilir: false, bekleyen: false })
      return
    }
    yukle()
  }

  if (!hak) return null

  /* Talep gönderildi: ikon durumu söyler, öğrenci ikinci kez basmaya
     çalışmaz. */
  if (hak.bekleyen) {
    return (
      <span className="acil acil--bekliyor" title="Görüşme isteğin koçuna iletildi">
        <span className="acil-ikon" aria-hidden="true">⏳</span>
        <span className="acil-yazi">Koçuna iletildi</span>
      </span>
    )
  }

  /* Hak bitti: ikon kaybolmuyor, soluklaşıyor. Kaybolsa öğrenci gördüğünü
     sanırdı; sönük durması hem yerini öğretir hem yenileneceğini söyler. */
  if (!hak.kullanilabilir) {
    return (
      <span className="acil acil--soluk" title="Bu haftaki görüşme hakkını kullandın · pazartesi yenilenir">
        <span className="acil-ikon" aria-hidden="true">💬</span>
      </span>
    )
  }

  function ac() {
    setCanli(false)
    requestAnimationFrame(() => setCanli(true))
    setAcik(true)
  }

  return (
    <>
      <button
        type="button"
        className={acik ? 'acil acil--acik' : 'acil'}
        onClick={() => (acik ? setAcik(false) : ac())}
        aria-expanded={acik}
        aria-label="SOS: koçumla acil konuşmam lazım"
      >
        {/* Yazı yerine kısa SOS (22 Eylül 2026, Bekir). */}
        <span className={canli ? 'acil-sos acil-ikon--canli' : 'acil-sos'} aria-hidden="true">SOS</span>
      </button>

      {/* Yaprak alt sayfa olarak açılır: düğme artık tepenin köşesinde ve
          tepe overflow:hidden; sayfa içi kutu orada kırpılırdı. */}
      {acik ? (
        <AltSayfa
          baslik="Ne zaman konuşalım?"
          altBaslik="Sebep yazmak zorunda değilsin. Günü ve saati koçun belirleyecek."
          onKapat={() => setAcik(false)}
        >
        <div className="acil-yaprak acil-yaprak--sayfa">

          {hata ? <Uyari>{hata}</Uyari> : null}
          {saltOkunur ? (
            <Uyari tur="bilgi">Vekaleten bakıyorsun. Talebi yalnızca öğrenci açabilir.</Uyari>
          ) : null}

          <div className="acil-secim" role="group" aria-label="Ne zaman konuşmak istiyorsun">
            <button
              type="button"
              className="acil-secenek"
              aria-pressed={aciliyet === 'bugun'}
              disabled={saltOkunur}
              onClick={() => setAciliyet('bugun')}
            >
              Bugün konuşmalıyım
            </button>
            <button
              type="button"
              className="acil-secenek"
              aria-pressed={aciliyet === 'bu_hafta'}
              disabled={saltOkunur}
              onClick={() => setAciliyet('bu_hafta')}
            >
              Bu hafta içinde
            </button>
          </div>

          <textarea
            className="kuyruk-alan"
            rows={2}
            value={notMetni}
            disabled={saltOkunur}
            placeholder="İstersen birkaç kelime yaz"
            onChange={(e) => setNotMetni(e.target.value)}
            aria-label="Koçuna not"
          />

          <div className="acil-dugmeler">
            <button
              type="button"
              className="acil-dugme"
              disabled={bekliyor || saltOkunur}
              onClick={gonder}
            >
              Görüşme iste
            </button>
            <button
              type="button"
              className="dugme dugme--ikincil"
              disabled={bekliyor}
              onClick={() => setAcik(false)}
            >
              Vazgeç
            </button>
          </div>
        </div>
        </AltSayfa>
      ) : null}
    </>
  )
}

/** Kurulan randevu öğrencinin gününde: saat, süre ve ne yapması gerektiği. */
export function GunGorusmesi({ gorevler }) {
  const gorusme = (gorevler ?? []).find((g) => g.tur === 'gorusme' && g.durum !== 'tamamlandi')
  if (!gorusme) return null
  const saat = (gorusme.baslangic_saat ?? '').slice(0, 5)
  const bitis = (gorusme.bitis_saat ?? '').slice(0, 5)
  return (
    <div className="gun-gorusme">
      <span className="gun-gorusme-saat">{saat}</span>
      <span className="gun-gorusme-ic">
        <strong>{gorusme.baslik ?? 'Koçunla görüşme'}</strong>
        <span>{gorusme.aciklama ?? (bitis ? `${saat}–${bitis}` : '')}</span>
      </span>
    </div>
  )
}
