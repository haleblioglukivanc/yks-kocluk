import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { kuruluMu } from './pwa.js'

/* Anlık bildirim, istemci tarafı (19 Eylül 2026).

   Sunucu tarafı: private.bildirim_ekle → bildirim_kuyrugu → bildirim-gonder.
   Hangi olayın telefona gideceği sunucuda (private.anlik_mi); burası yalnız
   bu cihazı kaydeder/siler ve ikondaki rakamı günceller.

   Durumlar:
   'yok'          tarayıcı desteklemiyor
   'kurulum'      iPhone/iPad: önce ana ekrana eklenmeli (iOS kuralı)
   'engelli'      kullanıcı izni reddetmiş; yalnız telefon ayarlarından açılır
   'kapali'       izin istenebilir ya da izin var ama bu cihaz kayıtlı değil
   'acik'         bu cihaz bildirim alıyor */

const destekli = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

const iosMu = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

const platform = () =>
  iosMu() ? 'ios' : /android/i.test(navigator.userAgent) ? 'android' : 'masaustu'

/* VAPID genel anahtarı base64url → Uint8Array (PushManager bunu ister) */
function anahtarBaytlari(b64) {
  const dolgu = '='.repeat((4 - (b64.length % 4)) % 4)
  const ham = atob((b64 + dolgu).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(ham, (c) => c.charCodeAt(0))
}

async function kayit() {
  // Service worker yalnız yayında kayıtlı (pwa.js); hazır olmasını bekle
  return navigator.serviceWorker.ready
}

export async function bildirimDurumu() {
  if (iosMu() && !kuruluMu()) return 'kurulum'
  if (!destekli()) return 'yok'
  if (Notification.permission === 'denied') return 'engelli'
  if (Notification.permission !== 'granted') return 'kapali'
  try {
    const k = await navigator.serviceWorker.getRegistration()
    const abone = k && (await k.pushManager.getSubscription())
    return abone ? 'acik' : 'kapali'
  } catch {
    return 'kapali'
  }
}

/** İzin ister ve bu cihazı hesaba bağlar. Bir düğme tıklamasından çağrılmalı
    (iPhone izni ancak kullanıcı dokununca sorar). Yeni durumu döndürür. */
export async function bildirimiAc() {
  if (!destekli()) return 'yok'
  const izin = await Notification.requestPermission()
  if (izin === 'denied') return 'engelli'
  if (izin !== 'granted') return 'kapali'

  const { data: genel, error } = await supabase.rpc('bildirim_genel_anahtar')
  if (error || !genel) throw new Error('Bildirim anahtarı alınamadı')

  const k = await kayit()
  let abone = await k.pushManager.getSubscription()
  if (!abone) {
    abone = await k.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: anahtarBaytlari(genel),
    })
  }
  const j = abone.toJSON()
  const { error: kHata } = await supabase.rpc('bildirim_cihaz_kaydet', {
    p_endpoint: j.endpoint,
    p_p256dh: j.keys.p256dh,
    p_auth: j.keys.auth,
    p_platform: platform(),
  })
  if (kHata) throw kHata
  return 'acik'
}

/** Bu cihazı hesaptan ayırır (bildirim kapat ve çıkış yap). */
export async function bildirimiKapat() {
  if (!destekli()) return
  try {
    const k = await navigator.serviceWorker.getRegistration()
    const abone = k && (await k.pushManager.getSubscription())
    if (!abone) return
    await supabase.rpc('bildirim_cihaz_sil', { p_endpoint: abone.endpoint })
    await abone.unsubscribe()
  } catch {
    /* Çıkışı engellemesin */
  }
  ikonRakami(0)
}

/** Çıkış yaparken: cihaz bu hesaptan ayrılır ama izin ve abonelik telefonda
    kalır. Aynı cihazda kim giriş yaparsa bildirimler ona bağlanır
    (bildirimKaydiniTazele); ortak tablette önceki kişinin bildirimi gelmez. */
export async function cihaziHesaptanAyir() {
  if (!destekli()) return
  try {
    const k = await navigator.serviceWorker.getRegistration()
    const abone = k && (await k.pushManager.getSubscription())
    if (abone) await supabase.rpc('bildirim_cihaz_sil', { p_endpoint: abone.endpoint })
  } catch {
    /* Çıkışı engellemesin */
  }
  ikonRakami(0)
}

/** Giriş yapılmış ve izin varsa cihaz kaydını tazeler: aynı telefonda başka
    hesaba geçildiyse cihaz yeni hesaba bağlanır, silinmişse geri gelir. */
export async function bildirimKaydiniTazele() {
  if ((await bildirimDurumu()) !== 'acik') return
  try {
    await bildirimiAc()
  } catch {
    /* sessizce geç */
  }
}

/** Ana ekran ikonundaki rakam (iPhone ve bilgisayar; Android'de telefon yönetir). */
export function ikonRakami(n) {
  try {
    if (!('setAppBadge' in navigator)) return
    if (n > 0) navigator.setAppBadge(n).catch(() => {})
    else navigator.clearAppBadge().catch(() => {})
  } catch {
    /* desteklenmiyor */
  }
}

export function useBildirim() {
  const [durum, setDurum] = useState(null)
  const [mesgul, setMesgul] = useState(false)

  useEffect(() => {
    let iptal = false
    bildirimDurumu().then((d) => !iptal && setDurum(d))
    return () => { iptal = true }
  }, [])

  const ac = useCallback(async () => {
    setMesgul(true)
    try {
      setDurum(await bildirimiAc())
    } catch {
      setDurum(await bildirimDurumu())
    } finally {
      setMesgul(false)
    }
  }, [])

  const kapat = useCallback(async () => {
    setMesgul(true)
    await bildirimiKapat()
    setDurum(await bildirimDurumu())
    setMesgul(false)
  }, [])

  return { durum, mesgul, ac, kapat }
}
