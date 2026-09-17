/* Haftanın tek tanımı: pazartesiden bugüne (Türkiye'de hafta pazartesi başlar).
   Rapor tepesi, Raporlar kartı ve mail aynı dönemi göstersin diye tek yerde. */

export function yerelIso(d) {
  const t = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return t.toISOString().slice(0, 10)
}

export function gunEkle(iso, n) {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + n)
  return yerelIso(d)
}

/** Haftanın pazartesisi. */
export function haftaBasi(d = new Date()) {
  const k = (d.getDay() + 6) % 7
  return gunEkle(yerelIso(d), -k)
}

/** [pazartesi, bugün] ISO tarih çifti. */
export function haftaAraligi(d = new Date()) {
  return [haftaBasi(d), yerelIso(d)]
}

export const kisaTarih = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })
