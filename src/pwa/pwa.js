/* PWA çekirdeği (19 Eylül 2026'da sıfırdan yazıldı).

   Üç iş yapar:
   1. Service worker'ı kaydeder ve güncellemeyi sessizce getirir.
   2. Tarayıcının kurulum iznini (beforeinstallprompt) sayfa açılır açılmaz
      yakalar. Bu olay yalnız bir kez ve çok erken geliyor; React açılmadan,
      giriş yapılmadan önce dinlenmezse kaçıyor. Eski kodun "Ekle" düğmesi
      bu yüzden çoğu zaman hiç çıkmıyordu.
   3. Hangi cihaz/tarayıcıda olduğumuzu söyler, çünkü kurulumun yolu her
      yerde farklı.

   main.jsx bu dosyayı React'ten önce çağırır (baslat). */

const TABAN = import.meta.env.BASE_URL

/* ── Kurulum izni: küçük bir abone deposu ───────────────────────────── */

let istem = null
let kuruldu = false
const dinleyiciler = new Set()
const duyur = () => dinleyiciler.forEach((f) => f())

export function abone(f) {
  dinleyiciler.add(f)
  return () => dinleyiciler.delete(f)
}

export const istemVar = () => Boolean(istem)

export const kuruluMu = () =>
  kuruldu ||
  window.matchMedia?.('(display-mode: standalone)').matches ||
  window.navigator.standalone === true

/** Tarayıcının kendi kurulum penceresini açar. Kabul edilirse true. */
export async function kur() {
  if (!istem) return false
  const olay = istem
  istem = null
  olay.prompt()
  const { outcome } = await olay.userChoice
  duyur()
  return outcome === 'accepted'
}

/* ── Ortam: kurulum bu cihazda nasıl yapılır ────────────────────────── */

const ua = () => window.navigator.userAgent

const iosMu = () =>
  /iphone|ipad|ipod/i.test(ua()) ||
  // iPadOS kendini masaüstü Safari gibi tanıtıyor
  (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1)

/* Instagram, TikTok, Facebook vb. uygulamaların içindeki tarayıcı. Buradan
   kurulum yapılamaz; öğrenci linke oradan tıklamış olabilir. */
const uygulamaIciMi = () =>
  /Instagram|FBAN|FBAV|FB_IAB|TikTok|musical_ly|Bytedance|Snapchat|Line\//i.test(ua()) ||
  /; wv\)/.test(ua())

/**
 * 'kurulu'       zaten ana ekrandan açılmış
 * 'istem'        tarayıcı tek tuşla kurmaya izin veriyor (Chrome, Edge, Samsung)
 * 'uygulama-ici' Instagram/TikTok gibi bir uygulamanın içinden açılmış
 * 'ios'          iPhone/iPad Safari veya Chrome: Paylaş → Ana Ekrana Ekle
 * 'ios-diger'    iPhone'da başka tarayıcı: önce Safari'de açılmalı
 * 'mac-safari'   Mac Safari: Dosya → Dock'a Ekle
 * 'android'      Android, izin henüz gelmedi: tarayıcı menüsünden
 * 'masaustu'     masaüstü Chrome/Edge, izin henüz gelmedi: adres çubuğundaki simge
 * 'yok'          bu tarayıcı kurulumu desteklemiyor (ör. masaüstü Firefox)
 */
export function ortam() {
  if (kuruluMu()) return 'kurulu'
  if (istem) return 'istem'
  if (uygulamaIciMi()) return 'uygulama-ici'
  // iOS 16.4+ Safari ve Chrome Paylaş menüsünden ekleyebiliyor; diğerleri değil.
  if (iosMu()) return /FxiOS|EdgiOS|OPiOS|YaBrowser|GSA\//i.test(ua()) ? 'ios-diger' : 'ios'
  if (/Android/i.test(ua())) return 'android'
  if (/Macintosh/i.test(ua()) && /Safari/i.test(ua()) && !/Chrome|Chromium|Edg|Firefox/i.test(ua())) return 'mac-safari'
  if (/Chrome|Edg/i.test(ua())) return 'masaustu'
  return 'yok'
}

/* ── Kurtarma ───────────────────────────────────────────────────────── */

/** Önbelleği ve service worker'ı silip uygulamayı ağdan yeniden açar.
    Asıl iş index.html'deki bağımsız betikte (uygulama kodu bozuksa da
    çalışsın diye); burası yalnız oraya yönlendirir. */
export function yenidenYukle() {
  window.location.replace(TABAN + '?sifirla=1')
}

/* ── Başlatma ───────────────────────────────────────────────────────── */

export function baslat() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    istem = e
    duyur()
  })
  window.addEventListener('appinstalled', () => {
    istem = null
    kuruldu = true
    duyur()
  })

  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return

  /* Sayfa yüklendikten sonra: ilk açılışı yavaşlatmasın. */
  window.addEventListener('load', async () => {
    let kayit
    try {
      kayit = await navigator.serviceWorker.register(TABAN + 'sw.js', { scope: TABAN })
    } catch {
      return // Service worker olmadan da uygulama çalışır, yalnız çevrimdışı olmaz.
    }

    /* Kurulu uygulama günlerce açık kalabiliyor. Öne her gelişinde yeni
       sürüm var mı diye bakar. Yeni sürüm devreye girdiyse sayfayı o anda
       değil, kullanıcı uygulamaya bir sonraki dönüşünde yeniler: yazdığı
       bir şey yarıda kaybolmasın. */
    let yeniSurum = false
    const vardiOnceden = Boolean(navigator.serviceWorker.controller)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (vardiOnceden) yeniSurum = true
    })
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return
      if (yeniSurum) window.location.reload()
      else kayit.update().catch(() => {})
    })
  })
}

/* ── Durum çubuğu ───────────────────────────────────────────────────── */

/** Telefonun durum çubuğunu / pencere başlığını ekranın tepe rengine boyar. */
export function durumCubugu(renk) {
  const etiket = document.querySelector('meta[name="theme-color"]')
  if (etiket && renk) etiket.setAttribute('content', renk)
}
