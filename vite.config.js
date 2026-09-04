import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Cloudflare kokte yayinlar, TABAN bos kalir. Degisken yine de duruyor:
// ileride alan adi alinip site bir alt dizine tasinirsa tek yerden ayarlanir.
const taban = process.env.TABAN || '/'

const DERLEME = new Date().toISOString().slice(0, 16).replace('T', ' ')

export default defineConfig({
  define: { __DERLEME__: JSON.stringify(DERLEME) },
  base: taban,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'YKS Koçluk',
        short_name: 'YKS Koçluk',
        description:
          'Tek koç, çok öğrenci. Program, deneme takibi ve konu ilerlemesi tek yerde.',
        lang: 'tr',
        dir: 'ltr',
        start_url: taban,
        scope: taban,
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#ffffff',
        background_color: '#EDEFF3',
        icons: [
          { src: taban + 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: taban + 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: taban + 'icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Belge gorselleri yalnizca tanitim sayfasinda kullaniliyor;
        // uygulamanin calismasi icin gerekli degil. On bellege alinmazlar,
        // ihtiyac aninda agdan cekilir.
        globIgnores: ['**/belgeler/**'],
        navigateFallback: taban + 'index.html',
        // Yeni surum indirildigi anda devreye girsin. Bunlar olmadan eski
        // service worker sayfayi kontrol etmeye devam eder ve kullanici
        // butun sekmeleri kapatana kadar eski surumu gorur.
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // Anlık bildirim dinleyicileri (public/push-sw.js)
        importScripts: ['push-sw.js'],
      },
    }),
  ],
})
