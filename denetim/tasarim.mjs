import fs from 'node:fs'
import { chromium } from 'playwright'

const ADRES = 'https://khkocluk.com'
const OUT = '/home/claude/shots'
fs.mkdirSync(OUT, { recursive: true })
const OGR = 'c13f3c89-a8ab-42bc-8c17-00663f5a6154'
const ROLLER = {
  koc: { hesap: ['tasarim.koc@demo.khkocluk.com', 'Demo2026!ux'],
    ekranlar: ['/', '/yapilacaklar', '/ogrencilerim', `/ogrenci/${OGR}`, '/mesajlar', '/bildirimler', '/profil', '/kaynaklar', '/sifre'] },
  ogrenci: { hesap: ['demo02@demo.khkocluk.com', 'Demo2026!ux'],
    ekranlar: ['/', '/yol', '/denemeler', '/mesajlar', '/bildirimler', '/profil'] },
}
const G = { tel: { w: 390, h: 844, mobil: true }, masa: { w: 1366, h: 900, mobil: false } }
const bekle = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await chromium.launch()
const rapor = []
for (const [rol, t] of Object.entries(ROLLER)) {
  const c0 = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const p0 = await c0.newPage()
  await p0.goto(`${ADRES}/giris`, { waitUntil: 'load' })
  await p0.fill('input[type="email"]', t.hesap[0])
  await p0.fill('input[type="password"]', t.hesap[1])
  await p0.getByRole('button', { name: /giriş yap/i }).click()
  await p0.locator('input[type="password"]').waitFor({ state: 'detached', timeout: 20000 }).catch(() => {})
  await bekle(1500)
  const ok = (await p0.locator('input[type="password"]').count()) === 0
  console.log(rol, 'giriş', ok)
  const durum = await c0.storageState()
  await c0.close()
  if (!ok) continue
  for (const [g, V] of Object.entries(G)) {
    const ctx = await browser.newContext({ viewport: { width: V.w, height: V.h }, isMobile: V.mobil, hasTouch: V.mobil, deviceScaleFactor: 1, locale: 'tr-TR', storageState: durum })
    for (const yol of t.ekranlar) {
      const page = await ctx.newPage()
      const errs = []
      page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)) })
      try {
        await page.goto(ADRES + yol, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {})
        await bekle(2500)
        const ad = `${rol}-${g}-${yol.replace(/\//g, '_').replace(/^_$/, 'ana') || 'ana'}`
        await page.screenshot({ path: `${OUT}/${ad}.png`, fullPage: true })
        const tasma = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
        const yuk = await page.evaluate(() => document.documentElement.scrollHeight)
        rapor.push({ rol, g, yol, tasma, yuk, errs: errs.slice(0, 3) })
      } catch (e) { rapor.push({ rol, g, yol, hata: String(e).slice(0, 200) }) }
      await page.close()
    }
    await ctx.close()
  }
}
await browser.close()
fs.writeFileSync(`${OUT}/rapor.json`, JSON.stringify(rapor, null, 2))
console.log(JSON.stringify(rapor, null, 1))
