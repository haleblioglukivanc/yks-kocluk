/**
 * Ders görünümü — kısa kod ve renk.
 *
 * Haftalık ızgarada yedi sütun telefona sığdığında hücre ~40px kalıyor;
 * "Türk Dili ve Edebiyatı" oraya sığmıyor, kırpılınca da okunmuyor.
 * Hücrede kısa kod duruyor, tam ad dokununca açılan panelde.
 *
 * Renk dersi ayırt etmek için; hücre zemini durumu (bekliyor/bitti)
 * gösterdiğinden ders rengi ince kenar şeridi olarak veriliyor.
 * İki bilgi böylece çakışmıyor.
 *
 * Tek kaynak: ızgara, gün hedefleri, raporlar — hepsi burayı kullanmalı.
 * Renk değerleri tema.css'te (--ders-*); burada yalnız token adı durur,
 * hepsi --ders-renk CSS değişkeni olarak kullanılır.
 */

const HARITA = {
  'türkçe': ['TÜR', 'var(--ders-tur)'],
  'matematik': ['MAT', 'var(--ders-mat)'],
  'geometri': ['GEO', 'var(--ders-geo)'],
  'fizik': ['FİZ', 'var(--ders-fiz)'],
  'kimya': ['KİM', 'var(--ders-kim)'],
  'biyoloji': ['BİY', 'var(--ders-biy)'],
  'tarih': ['TAR', 'var(--ders-tar)'],
  'coğrafya': ['COĞ', 'var(--ders-cog)'],
  'felsefe': ['FEL', 'var(--ders-fel)'],
  'mantık': ['MAN', 'var(--ders-man)'],
  'psikoloji': ['PSİ', 'var(--ders-psi)'],
  'sosyoloji': ['SOS', 'var(--ders-sos)'],
  'edebiyat': ['EDB', 'var(--ders-edb)'],
  'türk dili ve edebiyatı': ['EDB', 'var(--ders-edb)'],
  'din kültürü ve ahlak bilgisi': ['DİN', 'var(--ders-din)'],
  'ingilizce': ['İNG', 'var(--ders-ing)'],
  'i̇ngilizce': ['İNG', 'var(--ders-ing)'],
  'fen bilimleri': ['FEN', 'var(--ders-fen)'],
  't.c. inkılap tarihi ve atatürkçülük': ['İNK', 'var(--ders-tar)'],
  't.c. i̇nkılap tarihi ve atatürkçülük': ['İNK', 'var(--ders-tar)'],
}

/* Haritada olmayan dersler için sabit palet. Aynı ad her zaman
   aynı rengi alsın diye ada göre deterministik seçiliyor. */
const YEDEK_RENKLER = [
  'var(--ders-mat)', 'var(--ders-geo)', 'var(--ders-fiz)', 'var(--ders-kim)',
  'var(--ders-biy)', 'var(--ders-tar)', 'var(--ders-cog)', 'var(--ders-sos)',
]

const buyuk = (m) => m.toLocaleUpperCase('tr-TR')

export function dersGorunumu(ad) {
  const temiz = (ad ?? '').trim()
  if (!temiz) return { kod: '—', renk: 'var(--ders-yok)', ad: '' }

  const anahtar = temiz.toLocaleLowerCase('tr-TR')
  const kayit = HARITA[anahtar]
  if (kayit) return { kod: kayit[0], renk: kayit[1], ad: temiz }

  // Bilinmeyen ders: ilk üç harf + ada göre sabit renk
  let toplam = 0
  for (let i = 0; i < anahtar.length; i++) toplam = (toplam * 31 + anahtar.charCodeAt(i)) % 9973
  return {
    kod: buyuk(temiz.slice(0, 3)),
    renk: YEDEK_RENKLER[toplam % YEDEK_RENKLER.length],
    ad: temiz,
  }
}

/* Serbest metinde ders adı arar ("Türkçe · Sözcükte Anlam", "17:40 bloğu ·
   Fizik — Vektörler"). Karar kuyruğu satırlarının rengi buradan gelir;
   bulunamazsa null döner, çağıran kendi rengine düşer. */
const DERS_ADLARI = Object.keys(HARITA).sort((a, b) => b.length - a.length)
export function metindenDers(metin) {
  const k = (metin ?? '').toLocaleLowerCase('tr-TR')
  if (!k) return null
  const ad = DERS_ADLARI.find((d) => k.includes(d))
  if (!ad) return null
  const bas = ad.split(' ').map((p) => (p === 've' ? p : p.charAt(0).toLocaleUpperCase('tr-TR') + p.slice(1))).join(' ')
  return { ...dersGorunumu(ad), ad: bas }
}
