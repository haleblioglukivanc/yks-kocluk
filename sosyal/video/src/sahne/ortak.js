// Sahne sistemi: ortak palet, yazı tipleri ve hareket yardımcıları.
// Görsel dil (17 Eylül 2026'da onaylanan): kalın mürekkep çizgi + kaymış renk dolgusu,
// krem / mürekkep zemin, dört dolgu rengi. Amber yalnız vurgu, büyük yüzey olmaz.
import { interpolate, spring } from 'remotion'
import { loadFont as baslikFontu } from '@remotion/google-fonts/BricolageGrotesque'
import { loadFont as govdeFontu } from '@remotion/google-fonts/Karla'
import { loadFont as elFontu } from '@remotion/google-fonts/Caveat'

const ALT = { subsets: ['latin', 'latin-ext'] }
export const BASLIK = baslikFontu('normal', { weights: ['800'], ...ALT }).fontFamily
export const GOVDE = govdeFontu('normal', { weights: ['400', '600'], ...ALT }).fontFamily
export const EL = elFontu('normal', { weights: ['700'], ...ALT }).fontFamily

export const P = {
  krem: '#F4EFE6', kum: '#EDE6D8', murekkep: '#1A2233',
  seftali: '#F5B99B', nane: '#A8DCC4', gok: '#9DB8F2', amber: '#E8A41C', limon: '#FAD27A',
}

// Zeminler: her biri zemin + yazı + ikincil yazı + üst etiket rengi + çizim dolgusu
export const ZEMIN = {
  krem:    { bg: P.krem,     yazi: P.murekkep, soluk: '#4a5570', etiket: '#8a5a00', dolgu: P.nane,    koyu: false },
  kum:     { bg: P.kum,      yazi: P.murekkep, soluk: '#4a5570', etiket: '#8a5a00', dolgu: P.seftali, koyu: false },
  murekkep:{ bg: P.murekkep, yazi: P.krem,     soluk: '#cfd6e6', etiket: P.amber,   dolgu: P.gok,     koyu: true },
  nane:    { bg: P.nane,     yazi: P.murekkep, soluk: '#1f4a3c', etiket: '#1f4a3c', dolgu: P.krem,    koyu: false },
  seftali: { bg: P.seftali,  yazi: P.murekkep, soluk: '#5a2e1c', etiket: '#5a2e1c', dolgu: P.krem,    koyu: false },
  gok:     { bg: P.gok,      yazi: P.murekkep, soluk: '#1e3470', etiket: '#1e3470', dolgu: P.krem,    koyu: false },
}

// 1080×1920. 20:9 telefonlarda yanlardan ~108 px kırpılır; sağda beğeni düğmeleri,
// altta açıklama, üstte sekmeler durur. İçerik bu kutunun dışına çıkmaz.
export const G = { sol: 130, sag: 170, ust: 250, alt: 430 }
export const GEN = 1080 - G.sol - G.sag      // 780
export const SON = 1920 - G.alt              // 1490

export const SURE = 600
export const SATIR = [165, 255, 345]   // gövde satırları (5.5, 8.5, 11.5 sn)
export const KAPANIS = 450             // 15 sn

export const yay = (f, bas, cfg = { damping: 18, stiffness: 130 }) => (bas <= 0 ? 1 : spring({ frame: f - bas, fps: 30, config: cfg }))
export const ara = (f, a, b, x = 0, y = 1) => interpolate(f, [a, b], [x, y], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
export const gel = (p, d = 30) => ({ opacity: Math.min(1, p * 1.4), transform: `translateY(${(1 - p) * d}px)` })

// Kalemle çizilmiş gibi titrek elips (bir turdan biraz fazla döner, uç açık kalır)
export function elCemberi(cx, cy, rx, ry, tur = 1.12, tohum = 3) {
  const n = 48, nok = []
  for (let i = 0; i <= n; i++) {
    const t = -Math.PI / 2 - 0.3 + (i / n) * Math.PI * 2 * tur
    const s = 1 + 0.035 * Math.sin(i * 1.7 + tohum) + 0.05 * (i / n)
    nok.push([cx + Math.cos(t) * rx * s, cy + Math.sin(t) * ry * s])
  }
  return 'M' + nok.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L')
}

// Kalemle çekilmiş yatay çizgi (altı çizili / üstü çizili)
export function elCizgisi(x1, y, x2, dalga = 7, tohum = 1) {
  const n = 16, nok = []
  for (let i = 0; i <= n; i++) {
    const x = x1 + ((x2 - x1) * i) / n
    nok.push([x, y + Math.sin(i * 0.9 + tohum) * dalga * (0.6 + 0.4 * Math.sin(i + tohum))])
  }
  return 'M' + nok.map(([x, yy]) => `${x.toFixed(1)} ${yy.toFixed(1)}`).join(' L')
}

// Kanca uzunluğuna göre punto
export const punto = (t, taban) => (t.length < 30 ? taban : t.length < 48 ? taban * 0.88 : taban * 0.76)
