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
 */

const HARITA = {
  'türkçe': ['TÜR', '#ea580c'],
  'matematik': ['MAT', '#2563eb'],
  'geometri': ['GEO', '#0891b2'],
  'fizik': ['FİZ', '#7c3aed'],
  'kimya': ['KİM', '#db2777'],
  'biyoloji': ['BİY', '#15803d'],
  'tarih': ['TAR', '#a16207'],
  'coğrafya': ['COĞ', '#0d9488'],
  'felsefe': ['FEL', '#9333ea'],
  'mantık': ['MAN', '#a855f7'],
  'psikoloji': ['PSİ', '#c026d3'],
  'sosyoloji': ['SOS', '#be185d'],
  'edebiyat': ['EDB', '#b45309'],
  'türk dili ve edebiyatı': ['EDB', '#b45309'],
  'din kültürü ve ahlak bilgisi': ['DİN', '#475569'],
  'ingilizce': ['İNG', '#0369a1'],
  'i̇ngilizce': ['İNG', '#0369a1'],
  'fen bilimleri': ['FEN', '#059669'],
  't.c. inkılap tarihi ve atatürkçülük': ['İNK', '#a16207'],
  't.c. i̇nkılap tarihi ve atatürkçülük': ['İNK', '#a16207'],
}

/* Haritada olmayan dersler için sabit palet. Aynı ad her zaman
   aynı rengi alsın diye ada göre deterministik seçiliyor. */
const YEDEK_RENKLER = [
  '#2563eb', '#0891b2', '#7c3aed', '#db2777',
  '#15803d', '#a16207', '#0d9488', '#be185d',
]

const buyuk = (m) => m.toLocaleUpperCase('tr-TR')

export function dersGorunumu(ad) {
  const temiz = (ad ?? '').trim()
  if (!temiz) return { kod: '—', renk: '#94a3b8', ad: '' }

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
