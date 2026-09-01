import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './supabase.js'

/**
 * Çalışma sayacının ortak durumu.
 *
 * Neden bağlam: sayaç eskiden CalismaSayaci'nın içindeydi ve yalnızca
 * "Bugün" sekmesi açıkken ekrandaydı. Öğrenci 25 dk başlatıp Konular'a
 * geçtiğinde sayaç localStorage'da çalışmaya devam ediyor ama görünmüyordu;
 * ne kalan süre okunuyordu ne duraklatılabiliyordu.
 *
 * Durum buraya taşındı: başlıktaki canlı rozet ile karttaki halka aynı
 * oturumu okuyor. İki ayrı useState olsaydı iki ayrı sayaç olurdu.
 *
 * Saniye tiki bilerek burada değil: sağlayıcı her saniye render olsaydı
 * bütün öğrenci paneli onunla birlikte render olurdu. Kalan süre zaman
 * damgasından hesaplandığı için gösteren bileşen kendi tikini kurar
 * (useSayacTiki); buradaki interval yalnızca bitişi kolluyor ve state'e
 * dokunmadığı için render tetiklemiyor.
 */

const DEPO = 'kalem_sayac'
export const SAYAC_SURELERI = [25, 45, 50]

const Baglam = createContext(null)

/* setInterval'ın kaç kez çalıştığını saymaz, zaman damgasından hesaplar.
   Telefon ekranı kapanınca tarayıcı interval'ı yavaşlatır; damga bundan
   etkilenmez. */
export function kalanMs(d) {
  if (!d) return 0
  const akan = d.calisiyor ? Date.now() - d.baslangic : 0
  return Math.max(0, d.hedefDk * 60000 - (d.biriken + akan))
}

export function bicimle(ms) {
  const t = Math.ceil(ms / 1000)
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

const oku = () => {
  try {
    return JSON.parse(localStorage.getItem(DEPO)) || null
  } catch {
    return null
  }
}

const yaz = (d) => {
  try {
    if (d) localStorage.setItem(DEPO, JSON.stringify(d))
    else localStorage.removeItem(DEPO)
  } catch {
    /* özel modda depolama kapalı olabilir, sayaç yine çalışır */
  }
}

export function SayacSaglayici({ ogrenciId, onKaydedildi, children }) {
  const [durum, setDurum] = useState(oku)
  const [uyari, setUyari] = useState('')

  /* Panel her render'da yeni bir yenile() veriyor; bitir'i ona bağlarsak
     her render'da yeniden kurulur. Ref ile sabitliyoruz. */
  const bildirRef = useRef(onKaydedildi)
  bildirRef.current = onKaydedildi

  const guncelle = useCallback((d) => {
    setDurum(d)
    yaz(d)
  }, [])

  const basla = useCallback(
    (hedefDk, gorevId = null) => {
      setUyari('')
      /* gorevId: sayaç hangi görev için açıldı. Sıradaki kartı çalışan
         sayacın başlığını bununla yazıyor; yoksa serbest çalışma. */
      guncelle({ hedefDk, gorevId, baslangic: Date.now(), biriken: 0, calisiyor: true })
    },
    [guncelle],
  )

  const duraklat = useCallback(() => {
    setDurum((d) => {
      if (!d?.calisiyor) return d
      const y = { ...d, biriken: d.biriken + (Date.now() - d.baslangic), calisiyor: false }
      yaz(y)
      return y
    })
  }, [])

  const devam = useCallback(() => {
    setDurum((d) => {
      if (!d || d.calisiyor) return d
      const y = { ...d, baslangic: Date.now(), calisiyor: true }
      yaz(y)
      return y
    })
  }, [])

  const bitir = useCallback(async () => {
    const d = durum
    if (!d) return
    const gecenMs = d.biriken + (d.calisiyor ? Date.now() - d.baslangic : 0)
    const dk = Math.round(gecenMs / 60000)
    guncelle(null)

    if (dk < 1) {
      setUyari('Bir dakikadan kısa sürdü, bunu saymadım. Bir dahakine biraz daha kal.')
      return
    }
    const { error } = await supabase.from('calisma_oturumlari').insert({
      ogrenci_id: ogrenciId,
      sure_dk: dk,
      baslangic: new Date(Date.now() - gecenMs).toISOString(),
    })
    if (error) {
      setUyari('Süre kaydedilemedi. Bağlantıyı kontrol edip bir daha dene, emeğin boşa gitmesin.')
      return
    }
    setUyari('')
    bildirRef.current?.(dk)
  }, [durum, ogrenciId, guncelle])

  /* Bitişi kolluyor. setState çağırmadığı için render tetiklemez. */
  const bitirRef = useRef(bitir)
  bitirRef.current = bitir
  useEffect(() => {
    if (!durum?.calisiyor) return
    const t = setInterval(() => {
      if (kalanMs(durum) === 0) bitirRef.current()
    }, 1000)
    return () => clearInterval(t)
  }, [durum])

  useEffect(() => {
    if (!durum?.calisiyor || !('wakeLock' in navigator)) return
    let iptal = false
    let kilit = null
    navigator.wakeLock
      .request('screen')
      .then((k) => {
        if (iptal) k.release()
        else kilit = k
      })
      .catch(() => {})
    return () => {
      iptal = true
      kilit?.release?.()
    }
  }, [durum?.calisiyor])

  const deger = useMemo(
    () => ({ durum, uyari, basla, duraklat, devam, bitir }),
    [durum, uyari, basla, duraklat, devam, bitir],
  )

  return <Baglam.Provider value={deger}>{children}</Baglam.Provider>
}

/** Sağlayıcı yoksa null döner: sayacı olmayan ekranlar (koç, veli) patlamasın. */
export function useSayac() {
  return useContext(Baglam)
}

/** Kalan süreyi ekranda yazan bileşen kendi saniye tikini kurar. */
export function useSayacTiki(aktif) {
  const [, tik] = useState(0)
  useEffect(() => {
    if (!aktif) return
    const t = setInterval(() => tik((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [aktif])
}
