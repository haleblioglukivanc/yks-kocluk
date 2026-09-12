import { useSyncExternalStore } from 'react'

/* Bir ekranda iki Çizbi olmaz. Başlıktaki Çizbi'yi App yol bakarak gizliyor
   ama sekme içindeki ekranlar (konu yolu gibi) App'ten görünmüyor. Bu yüzden
   ekran kendisi "Çizbi bende" diyor, köşedeki kopya de kenara çekiliyor.

   Sayaç tutuluyor: iki ekran üst üste açılıp biri kapanınca köşedeki Çizbi
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

/** Ekranda başka bir Çizbi var mı? */
export function useMaskotDevrildiMi() {
  return useSyncExternalStore(abone, oku, () => false)
}
