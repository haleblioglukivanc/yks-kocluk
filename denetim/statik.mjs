/* Statik tarama: kodu çalıştırmadan bakılabilen her şey.
   Çıktı: denetim/ham/statik.json — rapor.mjs bunu okur. */
import fs from 'node:fs'
import path from 'node:path'

const KOK = path.resolve(new URL('..', import.meta.url).pathname)
const HAM = path.join(KOK, 'denetim', 'ham')
fs.mkdirSync(HAM, { recursive: true })

function dosyalar(dizin, uzantilar) {
  const sonuc = []
  for (const ad of fs.readdirSync(dizin)) {
    const tam = path.join(dizin, ad)
    if (fs.statSync(tam).isDirectory()) {
      if (ad === 'node_modules' || ad === 'dist') continue
      sonuc.push(...dosyalar(tam, uzantilar))
    } else if (uzantilar.some((u) => ad.endsWith(u))) sonuc.push(tam)
  }
  return sonuc
}
const goreli = (p) => path.relative(KOK, p)
const oku = (p) => fs.readFileSync(p, 'utf8')

const srcDosyalar = dosyalar(path.join(KOK, 'src'), ['.js', '.jsx', '.css'])
const cssDosyalar = srcDosyalar.filter((d) => d.endsWith('.css'))
const jsxDosyalar = srcDosyalar.filter((d) => !d.endsWith('.css'))
const fnDosyalar = fs.existsSync(path.join(KOK, 'supabase/functions'))
  ? dosyalar(path.join(KOK, 'supabase/functions'), ['.ts', '.js'])
  : []

/* Satır satır eşleşme toplayıcı */
function tara(liste, desen, secenek = {}) {
  const bulgular = []
  for (const d of liste) {
    const satirlar = oku(d).split('\n')
    satirlar.forEach((s, i) => {
      if (secenek.disla && secenek.disla.test(s)) return
      if (desen.test(s)) bulgular.push({ dosya: goreli(d), satir: i + 1, metin: s.trim().slice(0, 110) })
    })
  }
  return bulgular
}
const sayPerDosya = (b) => {
  const m = {}
  for (const x of b) m[x.dosya] = (m[x.dosya] ?? 0) + 1
  return Object.entries(m).sort((a, b) => b[1] - a[1])
}

/* 1) Tasarım sistemi: renk ve ölçü kaçakları.
   Kural (SISTEM.md): rengi tema.css tanımlar; başka yerde ham renk olmaz.
   Kesme noktaları yalnız yerlesim.css'te. */
const temaDisiCss = cssDosyalar.filter((d) => !d.endsWith('tema.css'))
const hexKacak = tara(temaDisiCss, /#[0-9a-fA-F]{3,8}\b/, { disla: /^\s*\/\*|url\(/ })
const rgbKacak = tara(temaDisiCss, /\b(rgba?|hsla?)\(/, { disla: /^\s*\/\*/ })
/* Kalem.jsx: Çizbi'nin çizimi — izin verilen tek illüstrasyon, kendi paletiyle (satır içi 'kalem' dışlaması dosyayı kaçırıyordu) */
const jsxRenk = tara(jsxDosyalar.filter((d) => !d.endsWith('Kalem.jsx')), /(#[0-9a-fA-F]{6}\b|\brgba?\()/, { disla: /^\s*(\/\/|\/\*|\*)|href=|id=|#\{|aria-|kalem|marka/ })
/* Inline style: yalnız tamamen sabit değerli olanlar kaçaktır (CSS'e taşınabilir).
   Çalışma anında hesaplanan değerler (yüzde, konum, --ders-renk gibi değişkenler)
   React'te stil nesnesiyle verilir; onlar sayılmaz. */
const sabitStil = (satir) => {
  const ic = satir.match(/style=\{\{([^}]*)\}\}/)
  if (!ic) return false
  const ciftler = ic[1].split(',').map((c) => c.trim()).filter(Boolean)
  return ciftler.length > 0 && ciftler.every((c) => /^['"]?[-\w]+['"]?\s*:\s*('[^'$]*'|"[^"$]*"|-?[\d.]+)$/.test(c))
}
const inlineStyle = tara(jsxDosyalar, /style=\{\{/).filter((b) => sabitStil(oku(path.join(KOK, b.dosya)).split('\n')[b.satir - 1]))
const pxKacak = tara(
  temaDisiCss.filter((d) => !d.endsWith('yerlesim.css')),
  /\b\d+px\b/,
  { disla: /^\s*\/\*|0px|1px|2px|border|outline|box-shadow|transform|stroke|blur|inset|--/ },
)
const kesmeNoktasi = tara(cssDosyalar.filter((d) => !d.endsWith('yerlesim.css')), /@media\s*\((min|max)-width/)
/* !important: prefers-reduced-motion blokları hariç — orada hareketi her
   özgüllükte kesmek için bilinçli (erişilebilirlik deyimi). */
const important = []
for (const d of cssDosyalar) {
  const satirlar = oku(d).split('\n')
  let derinlik = 0, hareketBloku = -1
  satirlar.forEach((s, i) => {
    if (hareketBloku < 0 && /@media[^{]*prefers-reduced-motion/.test(s)) hareketBloku = derinlik
    if (/!important/.test(s) && hareketBloku < 0) important.push({ dosya: goreli(d), satir: i + 1, metin: s.trim().slice(0, 110) })
    derinlik += (s.match(/\{/g) ?? []).length - (s.match(/\}/g) ?? []).length
    if (hareketBloku >= 0 && derinlik <= hareketBloku) hareketBloku = -1
  })
}

/* Tekrarlı seçici: aynı seçici birden fazla dosyada tanımlanmış */
const seciciHarita = {}
for (const d of cssDosyalar) {
  const metin = oku(d).replace(/\/\*[\s\S]*?\*\//g, '')
  for (const es of metin.matchAll(/(^|\n)\s*([^@{}\n][^{}\n]*?)\s*\{/g)) {
    const secici = es[2].trim().replace(/\s+/g, ' ')
    if (!secici || secici.startsWith(':root') || secici.startsWith('from') || secici.startsWith('to') || /^\d/.test(secici)) continue
    ;(seciciHarita[secici] ??= new Set()).add(goreli(d))
  }
}
const tekrarliSecici = Object.entries(seciciHarita)
  .filter(([, s]) => s.size > 1)
  .map(([secici, s]) => ({ secici, dosyalar: [...s] }))

/* 2) Kalıntı ve hijyen */
const kalinti = {
  kamil: tara(srcDosyalar, /k[âa]mil/i, { disla: /kalem/i }),
  workersDev: tara([...srcDosyalar, path.join(KOK, 'index.html'), path.join(KOK, 'wrangler.jsonc')], /workers\.dev/),
  eskiAlanAdi: tara([...srcDosyalar, path.join(KOK, 'index.html')], /kivanchaleb?lioglu\.com/),
  consoleLog: tara(srcDosyalar, /console\.(log|debug)\(/),
  /* XXX telefon maskesini (05XX XXX XX XX) yakalamasın: yalnız yorum işareti olarak sayılır */
  todo: tara([...srcDosyalar, ...fnDosyalar], /\b(TODO|FIXME|HACK)\b|\bXXX\b(?!\s+XX)/),
  localhost: tara(srcDosyalar, /localhost|127\.0\.0\.1/),
  debugger: tara(srcDosyalar, /^\s*debugger/),
}

/* 3) Gizli anahtar izi: anon anahtar (eyJ…) beklenir, service_role beklenmez */
/* Gerçek anahtar literali her yerde yasak; service_role adı yalnız istemci (src) tarafında sorun */
const anahtarIzi = [
  ...tara([...srcDosyalar, ...fnDosyalar, path.join(KOK, 'wrangler.jsonc'), path.join(KOK, 'index.html')],
    /(sb_secret_[A-Za-z0-9_-]+|sk-[a-zA-Z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|eyJhbGciOi[A-Za-z0-9_.-]{40,})/),
  ...tara(srcDosyalar, /service_role|SERVICE_ROLE/, { disla: /^\s*(\/\/|\*|\/\*\*?)/ }),
]

/* 4) Edge function: kimlik doğrulama izi var mı? */
const fonksiyonlar = []
for (const d of fnDosyalar.filter((f) => f.endsWith('index.ts'))) {
  const m = oku(d)
  fonksiyonlar.push({
    ad: path.basename(path.dirname(d)),
    satir: m.split('\n').length,
    authBasligi: /authorization/i.test(m),
    getUser: /auth\.getUser|getClaims|verify/i.test(m),
    rolKontrolu: /rol\b.*(koc|ogrenci|yonetici)|yonetici|koc_mu|rol ===/i.test(m),
    serviceRole: /SERVICE_ROLE/.test(m),
    cors: /Access-Control-Allow-Origin/.test(m),
    corsYildiz: /Access-Control-Allow-Origin['"]?\s*:\s*['"]\*/.test(m),
  })
}

/* 5) Boyut: en büyük dosyalar (bakım yükü) */
const buyukDosyalar = srcDosyalar
  .map((d) => ({ dosya: goreli(d), satir: oku(d).split('\n').length }))
  .sort((a, b) => b.satir - a.satir)
  .slice(0, 10)

/* 6) Erişilebilirlik statik: alt'sız img, aria-label'sız ikon düğme (kaba ölçüm) */
const altsizImg = tara(jsxDosyalar, /<img\b(?![^>]*\balt=)/)
const ikonDugme = tara(jsxDosyalar, /className="[^"]*ikon-dugme[^"]*"(?![^>]*aria-label)/)

/* 7) PWA / çevrimdışı izi */
const pwa = {
  manifest: fs.existsSync(path.join(KOK, 'public/manifest.webmanifest')) || /manifest/.test(oku(path.join(KOK, 'vite.config.js'))),
  serviceWorker: /VitePWA|registerSW|serviceWorker/.test(oku(path.join(KOK, 'vite.config.js')) + jsxDosyalar.map(oku).join('')),
}

const sonuc = {
  tarih: new Date().toISOString(),
  dosyaSayisi: { css: cssDosyalar.length, jsx: jsxDosyalar.length, edgeFn: fonksiyonlar.length },
  cssSatir: cssDosyalar.reduce((t, d) => t + oku(d).split('\n').length, 0),
  tasarimSistemi: {
    hexKacak: { toplam: hexKacak.length, dosyalar: sayPerDosya(hexKacak), ornek: hexKacak.slice(0, 8) },
    rgbKacak: { toplam: rgbKacak.length, dosyalar: sayPerDosya(rgbKacak), ornek: rgbKacak.slice(0, 5) },
    jsxRenk: { toplam: jsxRenk.length, ornek: jsxRenk.slice(0, 8) },
    inlineStyle: { toplam: inlineStyle.length, dosyalar: sayPerDosya(inlineStyle) },
    pxKacak: { toplam: pxKacak.length, dosyalar: sayPerDosya(pxKacak) },
    kesmeNoktasi: { toplam: kesmeNoktasi.length, ornek: kesmeNoktasi.slice(0, 10) },
    important: { toplam: important.length, dosyalar: sayPerDosya(important) },
    tekrarliSecici: { toplam: tekrarliSecici.length, ornek: tekrarliSecici.slice(0, 15) },
  },
  kalinti: Object.fromEntries(Object.entries(kalinti).map(([k, v]) => [k, { toplam: v.length, ornek: v.slice(0, 6) }])),
  anahtarIzi: { toplam: anahtarIzi.length, ornek: anahtarIzi.map((x) => ({ dosya: x.dosya, satir: x.satir })) },
  fonksiyonlar,
  buyukDosyalar,
  erisilebilirlikStatik: { altsizImg: altsizImg.length, ikonDugmeEtiketsiz: ikonDugme.length, ornek: [...altsizImg, ...ikonDugme].slice(0, 6) },
  pwa,
}
fs.writeFileSync(path.join(HAM, 'statik.json'), JSON.stringify(sonuc, null, 2))
console.log(
  `statik: hex ${hexKacak.length}, rgb ${rgbKacak.length}, px ${pxKacak.length}, !important ${important.length}, tekrar seçici ${tekrarliSecici.length}, kâmil ${kalinti.kamil.length}, console.log ${kalinti.consoleLog.length}, TODO ${kalinti.todo.length}, anahtar izi ${anahtarIzi.length}`,
)
