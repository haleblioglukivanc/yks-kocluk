import { useCallback, useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Uyari } from './Ortak.jsx'

/**
 * Öğrencinin acil görüşme hakkı.
 *
 * Terapideki acil seans mantığı: haftada bir kez, sebep yazma zorunluluğu
 * olmadan koçtan görüşme istenebilir. Hak pazartesi yenilenir, birikmez.
 * Zorunlu sebep tam da yazamayan öğrenciyi durdururdu; öğrenciden istenen
 * tek şey aciliyet: bugün mü, bu hafta içinde mi.
 *
 * Randevunun günü, saati ve süresi koçun insiyatifinde. Öğrenci burada
 * saat seçmez; koç kurunca randevu gününe blok olarak düşer (GunGorusmesi).
 */
export default function AcilGorusme() {
  const [hak, setHak] = useState(null)
  const [acik, setAcik] = useState(false)
  const [aciliyet, setAciliyet] = useState('bu_hafta')
  const [notMetni, setNotMetni] = useState('')
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState('')

  const yukle = useCallback(async () => {
    const { data, error } = await supabase.rpc('ogrenci_gorusme_hakki')
    if (!error) setHak(data ?? null)
  }, [])

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
    if (data?.durum === 'hak_yok') {
      setHak({ kullanilabilir: false, bekleyen: false })
      setAcik(false)
      return
    }
    setAcik(false)
    setNotMetni('')
    yukle()
  }

  if (!hak) return null

  if (hak.bekleyen) {
    return (
      <div className="acil-kutu acil-kutu--bekliyor">
        <strong>Görüşme isteğin koçuna iletildi</strong>
        <p>Kıvanç Hoca günü ve saati belirleyince gününde görürsün.</p>
      </div>
    )
  }

  if (!hak.kullanilabilir) {
    return (
      <div className="acil-kutu acil-kutu--kapali">
        <strong>Bu haftaki görüşme hakkını kullandın</strong>
        <p>Hakkın pazartesi yenilenir. Acil bir şey varsa mesaj yazabilirsin.</p>
      </div>
    )
  }

  return (
    <div className="acil-kutu">
      <strong>Acil konuşmam lazım</strong>
      <p>
        Kafanı meşgul eden bir şey varsa haftada bir kez koçundan görüşme
        isteyebilirsin. Sebep yazmak zorunda değilsin.
      </p>

      {hata ? <Uyari>{hata}</Uyari> : null}

      {acik ? (
        <>
          <div className="acil-secim" role="group" aria-label="Ne zaman konuşmak istiyorsun">
            <button
              className="acil-secenek"
              aria-pressed={aciliyet === 'bugun'}
              onClick={() => setAciliyet('bugun')}
            >
              Bugün konuşmalıyım
            </button>
            <button
              className="acil-secenek"
              aria-pressed={aciliyet === 'bu_hafta'}
              onClick={() => setAciliyet('bu_hafta')}
            >
              Bu hafta içinde
            </button>
          </div>
          <textarea
            className="kuyruk-alan"
            rows={3}
            value={notMetni}
            placeholder="İstersen birkaç kelime yaz (zorunlu değil)"
            onChange={(e) => setNotMetni(e.target.value)}
            aria-label="Koçuna not"
          />
          <div className="acil-dugmeler">
            <button className="acil-dugme" disabled={bekliyor} onClick={gonder}>
              Görüşme iste
            </button>
            <button className="dugme dugme--ikincil" disabled={bekliyor} onClick={() => setAcik(false)}>
              Vazgeç
            </button>
          </div>
        </>
      ) : (
        <button className="acil-dugme" onClick={() => setAcik(true)}>
          Koçundan görüşme iste
        </button>
      )}
      <span className="acil-hak">Bu hafta hakkın duruyor · pazartesi yenilenir</span>
    </div>
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
