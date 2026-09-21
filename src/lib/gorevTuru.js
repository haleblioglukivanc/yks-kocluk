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
  gorusme: 'Koçunla görüşme',
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
  gorusme: 'Görüşme',
}

/** Öğrencinin listesinde tür, ne yapacağını söyleyen fiille (22 Eylül 2026). */
export const GOREV_TUR_EYLEM = {
  konu_anlatimi: 'Konuyu çalış',
  soru_cozumu: 'Soru çöz',
  tekrar: 'Tekrar et',
  deneme: 'Deneme çöz',
  okuma: 'Oku',
  diger: 'Çalış',
  gorusme: 'Görüşme',
}

/** Hedef adedi sorulan türler (30 soru, 20 sayfa…). */
export const ADETLI_TURLER = new Set(['soru_cozumu', 'okuma', 'tekrar'])

/* ── Görev durumları ───────────────────────────────────────────
   Dört durum var ve üçü ekranda birbirinden ayrılmalı. Renk
   sistem katmanından gelir: satıra data-durum verilir, nokta ve
   rozet rengini oradan okur (bkz. sistem.css).

   tamamlandi → iyi   (yeşil)  bitti
   devam      → eylem (mavi)   başlanmış, sürüyor
   atlandi    → izle  (amber)  geride ama acil değil
   bekliyor   → notr  (gri)    henüz sırada, bilgi taşımıyor */
export const GOREV_DURUM_ANLAMI = {
  tamamlandi: 'iyi',
  devam: 'eylem',
  atlandi: 'izle',
  bekliyor: 'notr',
}

/* Rozet metni yalnızca kendiliğinden okunmayan iki durumda çıkar:
   bitti zaten üstü çizili, bekliyor da varsayılan hâl. */
export const GOREV_DURUM_ROZETI = {
  devam: 'devam ediyor',
  atlandi: 'atlandı',
}
