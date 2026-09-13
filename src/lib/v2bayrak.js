/**
 * v2 bayrağı — paralel öğrenci arayüzünün açma kapama düğmesi.
 *
 * v2 mevcut ekranların yanına kuruluyor, yerine değil. Bayrak kapalıyken
 * App eskisi gibi çalışır; tek satır v2 kodu çalışmaz.
 *
 * Açmak için adrese `?v2=1` eklenir, kapatmak için `?v2=0`. Seçim
 * tarayıcıda kalır, böylece öğrenci her seferinde adresi yazmak zorunda
 * kalmaz. Veritabanına kolon eklemiyoruz: deneme bir kişiyle yapılacak,
 * işe yaradığına karar verilirse `ogrenciler.v2_acik` o zaman gelir.
 */

const ANAHTAR = 'yks-v2'

export function v2Acik() {
  try {
    const sorgu = new URLSearchParams(window.location.search)
    if (sorgu.has('v2')) {
      const acik = sorgu.get('v2') !== '0'
      localStorage.setItem(ANAHTAR, acik ? '1' : '0')
      return acik
    }
    return localStorage.getItem(ANAHTAR) === '1'
  } catch {
    /* Gizli sekmede localStorage kapalı olabilir; bayrak kapalı sayılır. */
    return false
  }
}

export function v2Kapat() {
  try {
    localStorage.setItem(ANAHTAR, '0')
  } catch { /* yok say */ }
}
