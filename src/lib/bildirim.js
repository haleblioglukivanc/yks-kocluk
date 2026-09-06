import { supabase } from './supabase.js'

/* Anlık bildirim yardımcıları.

   İki engel var: iPhone'da bildirim yalnız ana ekrana eklenmiş uygulamadan
   çalışır; her yerde kullanıcı önce izin vermeli. Bu dosya bu iki durumu
   tek yerden okur; ekranlar buradan sorar. */

export const kuruluMu = () =>
  window.matchMedia?.('(display-mode: standalone)').matches ||
  window.navigator.standalone === true

export const iosMu = () =>
  /iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
  (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1)

export const destekliMi = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

/* iPhone'da kurulmadan önce push yok; Safari sekmesinde PushManager de yok. */
export const kurulumGerekli = () => iosMu() && !kuruluMu()

export const izin = () => (('Notification' in window) ? Notification.permission : 'denied')

const ANAHTAR = 'bildirim-izin-erteleme'
const UC_GUN = 3 * 24 * 3600 * 1000

function erteleme() {
  try { return JSON.parse(window.localStorage.getItem(ANAHTAR) || 'null') } catch { return null }
}

/* Ekran ilk girişte gelir; "sonra" denirse 3 gün sonra bir kez daha; sonra
   yalnız Hesap yaprağından açılır. */
export function izinEkraniGerekliMi() {
  if (!destekliMi() && !kurulumGerekli()) return false
  if (izin() === 'granted' || izin() === 'denied') return false
  const e = erteleme()
  if (!e) return true
  if (e.sayi >= 2) return false
  return Date.now() - e.zaman > UC_GUN
}

export function izinEkraniniErtele() {
  const e = erteleme() || { sayi: 0 }
  try {
    window.localStorage.setItem(ANAHTAR, JSON.stringify({ sayi: e.sayi + 1, zaman: Date.now() }))
  } catch { /* depolama kapalıysa bir sonraki açılışta yine sorar */ }
}

function b64ToUint8(b64) {
  const dolgu = '='.repeat((4 - (b64.length % 4)) % 4)
  const ham = window.atob((b64 + dolgu).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(ham, (c) => c.charCodeAt(0))
}

async function kayitAl() {
  const r = await navigator.serviceWorker.getRegistration()
  return r ?? (await navigator.serviceWorker.ready)
}

/* İzin ister, cihazı kaydeder. Hata metni döner (başarıda null). */
export async function aboneOl(profilId) {
  if (kurulumGerekli()) return 'Önce uygulamayı ana ekrana ekle.'
  if (!destekliMi()) return 'Bu tarayıcı bildirimi desteklemiyor.'
  const sonuc = await Notification.requestPermission()
  if (sonuc !== 'granted') return 'İzin verilmedi. Telefon ayarlarından açabilirsin.'
  const { data: anahtar, error } = await supabase.rpc('bildirim_genel_anahtar')
  if (error || !anahtar) return 'Bildirim anahtarı alınamadı.'
  const kayit = await kayitAl()
  let abone = await kayit.pushManager.getSubscription()
  if (!abone) {
    abone = await kayit.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: b64ToUint8(anahtar),
    })
  }
  return kaydet(profilId, abone)
}

async function kaydet(profilId, abone) {
  const j = abone.toJSON()
  const { error } = await supabase.from('bildirim_abonelikleri').upsert(
    {
      profil_id: profilId,
      endpoint: j.endpoint,
      p256dh: j.keys.p256dh,
      auth: j.keys.auth,
      platform: iosMu() ? 'ios' : /android/i.test(navigator.userAgent) ? 'android' : 'web',
      son_kullanim: new Date().toISOString(),
    },
    { onConflict: 'endpoint' },
  )
  return error ? 'Cihaz kaydedilemedi: ' + error.message : null
}

/* Uygulama her açılışta: izin verilmiş ve abonelik varsa kaydı tazeler.
   Hesap değişince (aynı telefonda başka kullanıcı) satır yeni kişiye geçer. */
export async function aboneligiTazele(profilId) {
  try {
    if (!destekliMi() || izin() !== 'granted') return
    const kayit = await navigator.serviceWorker.getRegistration()
    const abone = await kayit?.pushManager.getSubscription()
    if (abone) await kaydet(profilId, abone)
  } catch { /* sessiz: bildirim yardımcı bir özellik, ana akışı bozmasın */ }
}

export async function aboneMi() {
  try {
    if (!destekliMi() || izin() !== 'granted') return false
    const kayit = await navigator.serviceWorker.getRegistration()
    return Boolean(await kayit?.pushManager.getSubscription())
  } catch { return false }
}

export async function abonelikIptal() {
  try {
    const kayit = await navigator.serviceWorker.getRegistration()
    const abone = await kayit?.pushManager.getSubscription()
    if (!abone) return
    await supabase.from('bildirim_abonelikleri').delete().eq('endpoint', abone.endpoint)
    await abone.unsubscribe()
  } catch { /* yoksay */ }
}
