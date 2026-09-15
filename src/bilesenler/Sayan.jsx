import { useSayarak } from '../lib/canli.js'

/** Sayı 0'dan sayarak gelir. on/son: "%" ve " dk" gibi ekler.
 *  Ekran okuyucu bitmiş değeri okur; sayma yalnız görsel. */
export default function Sayan({ deger, on = '', son = '', ondalik = 0 }) {
  const d = useSayarak(Number(deger) || 0)
  const bitmis = `${on}${(Number(deger) || 0).toFixed(ondalik)}${son}`
  return <span aria-label={bitmis}>{on}{d.toFixed(ondalik)}{son}</span>
}
