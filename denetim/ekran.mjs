/* Ekran taraması: canlı sitede, kalıcı demo hesaplarla.
   Chromium: 390 / 820 / 1366 — WebKit (Safari motoru): 390.
   Her ekran için: görüntü, konsol hataları, başarısız istekler, yatay taşma,
   axe erişilebilirlik (yalnız Chromium), 44px altı dokunma hedefi (yalnız 390).
   Çıktı: ham/ekran.json ve ekran/*.png */
import fs from 'node:fs'
import path from 'node:path'
import { chromium, webkit } from 'playwright'
import AxeBuilder from '@axe-core/playwright'

const KOK = path.resolve(new URL('..', import.meta.url).pathname)
const HAM = path.join(KOK, 'denetim', 'ham')
const EKRAN = path.join(KOK, 'denetim', 'ekran')
fs.mkdirSync(HAM, { recursive: true })
fs.mkdirSync(EKRAN, { recursive: true })
const ADRES = process.env.ADRES ?? 'https://khkocluk.com'
const kimlik = fs.existsSync(path.join(HAM, 'kimlik.json')) ? JSON.parse(fs.readFileSync(path.join(HAM, 'kimlik.json'), 'utf8')) : {}
const demoOgrenciId = kimlik.ogrenci

const GENISLIK = { telefon: { w: 390, h: 844, mobil: true }, tablet: { w: 820, h: 1180, mobil: true }, masaustu: { w: 1366, h: 900, mobil: false } }
const ROLLER = {
  ziyaretci: { hesap: null, ekranlar: ['/', '/giris', '/randevu'] },
  ogrenci: { hesap: ['demo.ogrenci@khkocluk.com', 'Demo2026!ux'], ekranlar: ['/', '/yol', '/denemeler', '/mesajlar', '/bildirimler'] },
  koc: {
    hesap: ['demo.koc@khkocluk.com', 'Demo2026!ux'],
    ekranlar: ['/', '/ogrenciler', '/raporlar', '/mesajlar', '/bildirimler', '/konular', '/kaynaklar', '/yonetim', ...(demoOgrenciId ? [`/ogrenci/${demoOgrenciId}`, `/gozuyle/${demoOgrenciId}`] : [])],
  },
}
const MOTORLAR = [
  { ad: 'chromium', motor: chromium, genislikler: ['telefon', 'tablet', 'masaustu'] },
  { ad: 'webkit', motor: webkit, genislikler: ['telefon'] },
]

/* Devam edebilir: ham/ekran.json varsa hatasız kayıtlar atlanır, her sayfadan sonra dosya yazılır. */
const JSON_YOL = path.join(HAM, 'ekran.json')
const sonuclar = fs.existsSync(JSON_YOL) ? JSON.parse(fs.readFileSync(JSON_YOL, 'utf8')).sonuclar.filter((s) => !s.hata) : []
const yazildi = () => fs.writeFileSync(JSON_YOL, JSON.stringify({ tarih: new Date().toISOString(), adres: ADRES, sonuclar }, null, 2))
const varMi = (k) => sonuclar.some((s) => s.motor === k.motor && s.rol === k.rol && s.genislik === k.genislik && s.yol === k.yol)
const bekle = (ms) => new Promise((r) => setTimeout(r, ms))
const zamanAsimi = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`sert zaman aşımı ${ms}ms`)), ms))])

async function girisYap(context, hesap) {
  const page = await context.newPage()
  await page.goto(`${ADRES}/giris`, { waitUntil: 'load' })
  await page.fill('input[type="email"]', hesap[0])
  await page.fill('input[type="password"]', hesap[1])
  await page.getByRole('button', { name: /giriş yap/i }).click()
  /* Giriş sonrası adres /giris'te kalabiliyor (uygulama tanınmayan yolu ana ekrana düşürüyor);
     başarı ölçütü formun kaybolması. */
  await page.locator('input[type="password"]').waitFor({ state: 'detached', timeout: 20000 }).catch(() => {})
  await bekle(1500)
  const basarili = (await page.locator('input[type="password"]').count()) === 0
  await page.close()
  return basarili
}

for (const M of MOTORLAR) {
  const browser = await M.motor.launch(M.ad === 'chromium' ? { args: ['--ignore-certificate-errors'] } : {})
  for (const [rol, tanim] of Object.entries(ROLLER)) {
    let durum = null
    if (tanim.hesap) {
      const c = await browser.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true })
      const ok = await girisYap(c, tanim.hesap)
      if (!ok) {
        sonuclar.push({ motor: M.ad, rol, hata: 'giriş başarısız' })
        await c.close()
        continue
      }
      durum = await c.storageState()
      await c.close()
    }
    for (const g of M.genislikler) {
      const G = GENISLIK[g]
      const context = await browser.newContext({
        viewport: { width: G.w, height: G.h },
        isMobile: G.mobil,
        hasTouch: G.mobil,
        deviceScaleFactor: 1,
        reducedMotion: 'reduce',
        locale: 'tr-TR',
        storageState: durum ?? undefined,
        ignoreHTTPSErrors: true,
      })
      for (const yol of tanim.ekranlar) {
        if (varMi({ motor: M.ad, rol, genislik: g, yol })) continue
        const page = await context.newPage()
        page.setDefaultTimeout(20000)
        const konsol = []
        const basarisiz = []
        /* Konteyner vekili TLS'i kırıyor; sertifika kaynaklı konsol hataları ortamın, sitenin değil. */
        page.on('console', (m) => { if (m.type() === 'error' && !/SSL certificate|ERR_CERT/.test(m.text())) konsol.push(m.text().slice(0, 140)) })
        page.on('pageerror', (e) => konsol.push(`pageerror: ${String(e).slice(0, 140)}`))
        page.on('response', (r) => { if (r.status() >= 400) basarisiz.push(`${r.status()} ${r.url().replace(ADRES, '').slice(0, 90)}`) })
        page.on('requestfailed', (r) => { const n = r.failure()?.errorText ?? ''; if (!/ABORTED|telemetry|realtime|CERT/.test(n + r.url())) basarisiz.push(`FAIL ${r.url().replace(ADRES, '').slice(0, 90)} ${n}`) })
        const kayit = { motor: M.ad, rol, genislik: g, yol }
        const t0 = Date.now()
        try {
          await zamanAsimi((async () => {
          await page.goto(ADRES + yol, { waitUntil: 'load' })
          await bekle(2500)
          kayit.sure = Date.now() - t0
          kayit.sonYol = new URL(page.url()).pathname
          kayit.baslik = await page.title()
          kayit.tasma = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
          kayit.metin = await page.evaluate(() => document.body.innerText.length)
          kayit.boy = await page.evaluate(() => document.documentElement.scrollHeight)
          if (g === 'telefon') {
            kayit.kucukHedef = await page.evaluate(() => {
              const secici = 'a[href], button, [role="button"], input, select, textarea, [onclick]'
              const kucuk = []
              for (const el of document.querySelectorAll(secici)) {
                const r = el.getBoundingClientRect()
                const st = getComputedStyle(el)
                if (r.width === 0 || r.height === 0 || st.visibility === 'hidden' || st.display === 'none') continue
                if (r.top > window.innerHeight * 3) continue
                /* Etkin hedef: görünmez halka (::after/::before, sistem.css .dokun-halka) ya da
                   içinde durduğu <label> — etikete dokunmak da kutuyu işaretler. */
                let w = r.width, h = r.height
                for (const ps of ['::after', '::before']) {
                  const p = getComputedStyle(el, ps)
                  if (p.content !== 'none' && p.position === 'absolute') { w = Math.max(w, parseFloat(p.width) || 0); h = Math.max(h, parseFloat(p.height) || 0) }
                }
                const etiket = el.closest('label')
                if (etiket) {
                  const e = etiket.getBoundingClientRect(), ea = getComputedStyle(etiket, '::after')
                  const halka = ea.content !== 'none' && ea.position === 'absolute' ? e.height - parseFloat(ea.top) - parseFloat(ea.bottom) : 0
                  w = Math.max(w, e.width); h = Math.max(h, e.height, halka)
                }
                if (Math.min(w, h) < 44) {
                  kucuk.push({ etiket: (el.getAttribute('aria-label') || el.textContent || el.className || el.tagName).toString().trim().replace(/\s+/g, ' ').slice(0, 30), w: Math.round(r.width), h: Math.round(r.height) })
                }
              }
              return kucuk
            })
          }
          if (M.ad === 'chromium') {
            const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'best-practice']).analyze()
            kayit.axe = axe.violations.map((v) => ({ id: v.id, etki: v.impact, adet: v.nodes.length, hedef: v.nodes[0]?.target?.[0]?.toString().slice(0, 60) }))
          }
          const dosya = `${rol}${yol.replace(/\//g, '_').replace(/[^a-zA-Z0-9_-]/g, '')}-${G.w}-${M.ad}.png`
          /* 32767px üstü sayfayı motor çekemiyor; o zaman yalnız görünüm alanı (boy zaten kayıtta) */
          await page.screenshot({ path: path.join(EKRAN, dosya), fullPage: kayit.boy < 30000 })
          kayit.goruntu = dosya
          })(), 60000)
        } catch (e) {
          kayit.hata = String(e).slice(0, 160)
        }
        kayit.konsol = konsol.slice(0, 6)
        kayit.basarisiz = [...new Set(basarisiz)].slice(0, 6)
        sonuclar.push(kayit)
        yazildi()
        await page.close().catch(() => {})
      }
      await context.close()
    }
  }
  await browser.close()
}

yazildi()
const ok = sonuclar.filter((s) => !s.hata)
const konsolHatali = ok.filter((s) => s.konsol.length).length
const tasan = ok.filter((s) => s.tasma > 0).length
const axeCiddi = ok.reduce((t, s) => t + (s.axe ?? []).filter((v) => v.etki === 'serious' || v.etki === 'critical').length, 0)
const kucuk = ok.filter((s) => s.kucukHedef?.length).reduce((t, s) => t + s.kucukHedef.length, 0)
console.log(`ekran: ${sonuclar.length} yükleme, hata ${sonuclar.length - ok.length}, konsol hatalı ${konsolHatali}, yatay taşma ${tasan}, axe ciddi/kritik ${axeCiddi}, 44px altı hedef ${kucuk}`)
