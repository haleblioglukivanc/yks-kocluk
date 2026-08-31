import { useSyncExternalStore } from 'react'

/* Bir ekranda iki Kâmil olmaz. Başlıktaki Kâmil'i App yol bakarak gizliyor
   ama sekme içindeki ekranlar (konu yolu gibi) App'ten görünmüyor. Bu yüzden
   ekran kendisi "Kâmil bende" diyor, köşedeki kopya de kenara çekiliyor.

   Sayaç tutuluyor: iki ekran üst üste açılıp biri kapanınca köşedeki Kâmil
   erken geri gelmesin. */

let sayac = 0
const dinleyiciler = new Set()

function duyur() {
  for (const f of dinleyiciler) f()
}

/** Ekran monte olurken çağrılır; dönen işlev kaldırırken çağrılmalı. */
export function maskotuDevral() {
  sayac += 1
  duyur()
  let birakildi = false
  return () => {
    if (birakildi) return
    birakildi = true
    sayac = Math.max(0, sayac - 1)
    duyur()
  }
}

function abone(f) {
  dinleyiciler.add(f)
  return () => dinleyiciler.delete(f)
}

const oku = () => sayac > 0

/** Ekranda başka bir Kâmil var mı? */
export function useMaskotDevrildiMi() {
  return useSyncExternalStore(abone, oku, () => false)
}
