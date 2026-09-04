/* Anlık bildirim: service worker'a vite-plugin-pwa importScripts ile eklenir.
   Yük: { baslik, govde, yol, tip }. Dokununca uygulama o yola açılır. */
self.addEventListener('push', (e) => {
  let v = {}
  try { v = e.data ? e.data.json() : {} } catch { v = { govde: e.data ? e.data.text() : '' } }
  e.waitUntil(
    self.registration.showNotification(v.baslik || 'YKS Koçluk', {
      body: v.govde || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: v.tip || 'genel',
      renotify: true,
      data: { yol: v.yol || '/' },
    }),
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const yol = (e.notification.data && e.notification.data.yol) || '/'
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((liste) => {
      for (const c of liste) {
        if ('focus' in c) {
          if ('navigate' in c) c.navigate(yol).catch(() => {})
          return c.focus()
        }
      }
      return self.clients.openWindow(yol)
    }),
  )
})
