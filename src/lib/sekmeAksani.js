/**
 * Sekme aksanları.
 *
 * Renk sekmenin kendisine bağlı, ekrana değil: koç panelindeki "Konular"
 * ile öğrenci panelindeki "Konular" aynı indigoyu alıyor. Böylece renk
 * "hangi sekmedesin" bilgisini taşıyor, sadece süs olmuyor.
 *
 * Aksan sekmede ve kartın üst kenarında durur; kartın içine girmez.
 * İçerideki nokta ve çubuklar anlamlı renkler taşıyor (yeşil bitti,
 * mavi çalışılıyor, kırmızı tekrar) ve aksan onları bozmamalı.
 */
const AKSANLAR = {
  bugun: 'var(--aksan-bugun)',
  program: 'var(--aksan-program)',
  konular: 'var(--aksan-konular)',
  denemeler: 'var(--aksan-denemeler)',
  notlar: 'var(--aksan-notlar)',
  rozetler: 'var(--aksan-bugun)',
  veli: 'var(--aksan-notlar)',
}

/** Sekme gövdesine verilecek stil nesnesi. */
export function aksanStili(sekme) {
  return { '--ak': AKSANLAR[sekme] ?? 'var(--aksan-varsayilan)' }
}
