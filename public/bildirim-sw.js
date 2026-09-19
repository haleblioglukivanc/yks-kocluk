/* Anlık bildirim: service worker'a eklenen dinleyiciler (vite.config.js →
   workbox.importScripts). Workbox'ın önbellek kodundan ayrı tutuldu: burada
   bir hata olursa bile uygulamanın açılması etkilenmesin diye her şey
   try/catch içinde ve hiçbir önbellek işine dokunmuyor.

   Yük (bildirim-gonder): { id, tip, baslik, govde, yol, rozet } */

self.addEventListener('push', (olay) => {
  let v = {}
  try {
    v = olay.data ? olay.data.json() : {}
  } catch {
    v = { govde: olay.data ? olay.data.text() : '' }
  }

  const isler = [
    self.registration.showNotification(v.baslik || 'Kıvanç Hoca', {
      body: v.govde || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      // Aynı türden yenisi eskisinin yerine geçer, bildirim merkezi dolmaz
      tag: v.tip ? `${v.tip}-${v.id ?? ''}` : undefined,
      data: { yol: v.yol || '/' },
    }),
  ]

  // İkondaki rakam (iPhone ve bilgisayarda; Android'de telefon kendisi yönetir)
  if (typeof v.rozet === 'number' && self.navigator.setAppBadge) {
    isler.push(
      (v.rozet > 0 ? self.navigator.setAppBadge(v.rozet) : self.navigator.clearAppBadge()).catch(() => {}),
    )
  }

  olay.waitUntil(Promise.all(isler))
})

self.addEventListener('notificationclick', (olay) => {
  olay.notification.close()
  const yol = (olay.notification.data && olay.notification.data.yol) || '/'
  const hedef = new URL(yol, self.location.origin).href

  olay.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((pencereler) => {
      for (const p of pencereler) {
        if (new URL(p.url).origin !== self.location.origin) continue
        // Açık pencere varsa onu öne getir ve bildirimin ekranına götür
        return p.focus().then((odak) => (odak && 'navigate' in odak ? odak.navigate(hedef) : odak)).catch(() => {})
      }
      return self.clients.openWindow(hedef)
    }),
  )
})
