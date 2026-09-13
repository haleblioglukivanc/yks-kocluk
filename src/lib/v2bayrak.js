/**
 * v2 bayrağı — öğrenci arayüzünün açma kapama düğmesi.
 *
 * v2 artık öğrencide varsayılan. v1 silinmedi: `?v2=0` ile geri dönülür,
 * seçim tarayıcıda kalır. Geri almak gerekirse burada tek satır yeter —
 * varsayılanı `false` yapmak bütün öğrencileri eski arayüze döndürür.
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
    /* Yalnızca açıkça kapatan geri döner; kaydı olmayan v2 görür. */
    return localStorage.getItem(ANAHTAR) !== '0'
  } catch {
    /* Gizli sekmede localStorage kapalı olabilir; v2 yine de açılır. */
    return true
  }
}

export function v2Kapat() {
  try {
    localStorage.setItem(ANAHTAR, '0')
  } catch { /* yok say */ }
}
