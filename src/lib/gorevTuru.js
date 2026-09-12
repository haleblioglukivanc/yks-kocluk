/**
 * Görev türü adları — tek kaynak.
 *
 * Aynı sözlük beş dosyada ayrı ayrı duruyordu; birinde yapılan
 * düzeltme diğerlerinde unutuluyordu. Etiket burada değişir, program
 * ızgarası, günün hedefleri, sıradaki kart, öğrenci başlığı ve koçun
 * görev formu birden güncellenir.
 *
 * "Deneme" tek başına belirsizdi: genel deneme ayrı bir kayıt türü,
 * görev olarak verilen şey tek dersin denemesi. Adı artık ne olduğunu
 * söylüyor: branş denemesi.
 */

/** Tam ad — form, liste ve başlık metinlerinde. */
export const GOREV_TUR_ADI = {
  konu_anlatimi: 'Konu anlatımı',
  soru_cozumu: 'Soru çözümü',
  tekrar: 'Tekrar',
  deneme: 'Branş denemesi',
  okuma: 'Okuma',
  diger: 'Diğer',
}

/** Öğrenciye dönük yüz: "Diğer" yerine "Çalışma". */
export const GOREV_TUR_OGRENCI = {
  ...GOREV_TUR_ADI,
  diger: 'Çalışma',
}

/** Dar yerler (haftalık ızgara hücresi, rozet) — tek kelime. */
export const GOREV_TUR_KISA = {
  konu_anlatimi: 'Konu',
  soru_cozumu: 'Soru',
  tekrar: 'Tekrar',
  deneme: 'Branş',
  okuma: 'Okuma',
  diger: 'Diğer',
}

/** Hedef adedi sorulan türler (30 soru, 20 sayfa…). */
export const ADETLI_TURLER = new Set(['soru_cozumu', 'okuma', 'tekrar'])

export function gorevTuruAdi(tur, sozluk = GOREV_TUR_ADI) {
  return sozluk[tur] ?? tur
}
