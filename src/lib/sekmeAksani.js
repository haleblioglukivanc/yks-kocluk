/**
 * Sekme aksanı.
 *
 * ESKİDEN: her sekmenin kendi rengi vardı (bugün amber, program mor,
 * konular indigo, denemeler kiremit...). Yedi ayrı hue, sistemdeki dört
 * anlamlı rengin yanında sekizinci-dokuzuncu renk oluyordu. Sonuç: aktif
 * sekme mor, yanındaki "acil" rozeti kırmızı, başlık turuncu — hiçbiri
 * diğerinden daha önemli görünmüyordu.
 *
 * ŞİMDİ: sekmenin kimliğini ikon ve etiket taşıyor, renk değil. Renk
 * yalnızca "buradasın" der ve o da sistemdeki eylem rengidir.
 *
 * Bunun asıl faydası: yeni bir sekme eklerken burada da, CSS'te de
 * hiçbir şey yazılmaz. Haritaya kayıt gerekmiyor, çünkü harita yok.
 */

/** Sekme gövdesine verilecek stil nesnesi. */
export function aksanStili() {
  return { '--ak': 'var(--serin)' }
}
