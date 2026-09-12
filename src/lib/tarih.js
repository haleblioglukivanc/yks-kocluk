/**
 * Gün anahtarları (YYYY-AA-GG) tek yerden üretilir.
 *
 * `toISOString()` yerel gece yarısını UTC'ye çevirir: Türkiye'de (UTC+3)
 * 00:00 bir önceki günün 21:00'ı olur ve tarih bir gün geriye kayar.
 * Hafta şeridi bu yüzden pazartesi yerine cumartesiden başlıyordu; iki
 * zincirli çağrı olduğu için kayma iki güne çıkmıştı. Bu dosyadaki iki
 * fonksiyon dışında hiçbir yerde gün metni üretilmez.
 */

/** Yerel saate göre YYYY-AA-GG. sv-SE biçimi zaten bu sırada verir. */
export const yerelGun = (t) => t.toLocaleDateString('sv-SE')

/** 'YYYY-AA-GG' metnine n gün ekler, yine yerel gün metni döndürür. */
export function gunEkle(iso, n) {
  const t = new Date(`${iso}T00:00:00`)
  t.setDate(t.getDate() + n)
  return yerelGun(t)
}

/** Verilen tarihin içinde bulunduğu haftanın pazartesisi. */
export function haftaBasi(tarih) {
  const t = new Date(tarih)
  t.setDate(t.getDate() - ((t.getDay() + 6) % 7))
  t.setHours(0, 0, 0, 0)
  return t
}
