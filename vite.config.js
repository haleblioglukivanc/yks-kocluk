import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Cloudflare kokte yayinlar, TABAN bos kalir. Degisken yine de duruyor:
// ileride site bir alt dizine tasinirsa tek yerden ayarlanir.
const taban = process.env.TABAN || '/'

const DERLEME = new Date().toISOString().slice(0, 16).replace('T', ' ')

/* PWA (19 Eylul 2026'da sifirdan yazildi).
   Kurallar:
   - Manifest guncel markayi tasir: "Kivanc Hoca", koyu lacivert.
   - Acilis adresi /giris: kurulu uygulama tanitim sayfasini acmaz. Giris
     yapmis kullanici /giris'te zaten kendi Bugun ekranina duser.
   - id sabit: ad ya da adres degisse de telefon ayni uygulama sanir.
   - Yon kilidi yok: koc masaustunden, ogrenci tabletten de giriyor.
   - On bellege yalniz uygulamanin kendisi girer. Tanitim sayfasinin
     gorselleri (seminerler, video, belgeler, portre) agdan gelir.
   - Kayit src/pwa/pwa.js'te, elle: yeni surum sayfayi kullanim
     ortasinda yenilemez, uygulamaya bir sonraki donuste devreye girer. */
const LACIVERT = '#2e3a52'
const IKON_ZEMIN = '#0f1520'

export default defineConfig({
  define: { __DERLEME__: JSON.stringify(DERLEME) },
  base: taban,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      manifest: {
        id: taban,
        name: 'Kıvanç Hoca İle Koçluk',
        short_name: 'Kıvanç Hoca',
        description: 'YKS ve LGS koçluğu: günün programı, deneme takibi ve konu ilerlemesi.',
        lang: 'tr',
        dir: 'ltr',
        start_url: taban + 'giris',
        scope: taban,
        display: 'standalone',
        theme_color: LACIVERT,
        background_color: IKON_ZEMIN,
        categories: ['education'],
        /* İkona basılı tutunca çıkan kısayollar. Her rolde var olan
           ekranlar: koça ve öğrenciye ayrı kısayol verilemiyor. */
        shortcuts: [
          { name: 'Mesajlar', url: taban + 'mesajlar', icons: [{ src: taban + 'icon-192.png', sizes: '192x192' }] },
          { name: 'Bildirimler', url: taban + 'bildirimler', icons: [{ src: taban + 'icon-192.png', sizes: '192x192' }] },
        ],
        icons: [
          { src: taban + 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: taban + 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: taban + 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2}', 'favicon.svg', 'icon-*.png', 'apple-touch-icon.png'],
        globIgnores: ['gizlilik.html', 'bildirim-sw.js'],
        // Anlık bildirim dinleyicileri (public/bildirim-sw.js)
        importScripts: [taban + 'bildirim-sw.js'],
        navigateFallback: taban + 'index.html',
        // Dosya isteklerine (uzantili yollar) asla index.html donmesin.
        navigateFallbackDenylist: [/\/[^/?]+\.[^/?]+$/],
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
