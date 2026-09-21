/* Türkçe ekler (22 Eylül 2026): Nisa'nın, Berçem'in, Oğuz'un; Nisa'yı, Roşin'i. */
const SESLI = 'aıoueiöüAIOUEİÖÜ'
function sonUnlu(ad) {
  for (let i = ad.length - 1; i >= 0; i--) if (SESLI.includes(ad[i])) return ad[i].toLocaleLowerCase('tr')
  return 'e'
}
function uyum(ad) {
  const u = sonUnlu(ad)
  return 'aı'.includes(u) ? 'ı' : 'ei'.includes(u) ? 'i' : 'ou'.includes(u) ? 'u' : 'ü'
}
const unluyleBiter = (ad) => SESLI.includes(String(ad).slice(-1))
export const iyelik = (ad) => `${ad}'${unluyleBiter(ad) ? 'n' : ''}${uyum(ad)}n`
export const belirtme = (ad) => `${ad}'${unluyleBiter(ad) ? 'y' : ''}${uyum(ad)}`
