import { Children, isValidElement } from 'react'
import { useGenisEkran } from '../lib/genislik.js'

/* Bilgisayarda tek çerçeve, iki sütun (22 Eylül 2026, Bekir: "masaüstü
   güncellemesi tüm ekranlarda aynı olmalı"). Çocuklar telefondaki sırayla
   yazılır; <Sag> içine alınanlar geniş ekranda sağ sütuna geçer, geri kalan
   her şey sol sütunda kalır. Telefon ve tablette sıra ve görünüm aynen. */
export function Sag({ children }) {
  return <>{children}</>
}

export default function Sutunlu({ children, sinif = '' }) {
  const genis = useGenisEkran()
  if (!genis) return <>{children}</>
  const sol = []
  const sag = []
  Children.forEach(children, (c) => {
    if (c == null || c === false) return
    if (isValidElement(c) && c.type === Sag) sag.push(c)
    else sol.push(c)
  })
  return (
    <div className={`iki-sutun ${sinif}`.trim()}>
      <div className="iki-sutun-sol">{sol}</div>
      <div className="iki-sutun-sag">{sag}</div>
    </div>
  )
}
