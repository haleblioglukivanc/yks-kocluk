/**
 * Kaynak sözlüğü — tek kaynak.
 *
 * Kütüphane, görev seçici ve ileride öğrenci ekranı aynı adları
 * kullanmalı. Burada değişen bir etiket her yerde birden değişir.
 *
 * FAZ, kaynağın hazırlık sürecinde hangi basamağa denk geldiğini
 * söyler; SEVİYE ise ne kadar zorladığını. İkisi bağımsız: konusu yeni
 * bitmiş bir öğrenci soru bankasının zorunu da çözebilir.
 */

export const FAZ_ADI = {
  konu_anlatimi: 'Konu anlatımı',
  soru_bankasi: 'Soru bankası',
  fasikul: 'Fasikül',
  konu_denemesi: 'Konu denemesi',
  brans_denemesi: 'Branş denemesi',
  genel_deneme: 'Genel deneme',
}

/* Konuya bağlanan fazlar. Form bu kümeye bakıp konu alanını
   gösteriyor; ayrı bir "kapsam" sorusu sormaya gerek kalmıyor. */
export const KONU_BAZLI_FAZ = new Set(['konu_anlatimi', 'fasikul', 'konu_denemesi'])

/* Sektör "kolay/orta/zor" diyor. Öğrenciye "sen kolay seviyedesin"
   demek moral kırıcı, üstelik kaynağın ne işe yaradığını da söylemiyor.
   Aynı üçlü, işlevini anlatan adlarla. */
export const SEVIYE_ADI = {
  1: 'Temel',
  2: 'Sınav ayarı',
  3: 'Ayırt edici',
}

export const SEVIYE_IPUCU = {
  1: 'Konuyu yeni oturtanlar için',
  2: 'Sınavda çıkan ayarda',
  3: 'Tavanı zorlayanlar için',
}

export const BICIM_ADI = {
  dosya: 'Dosya',
  baglanti: 'Bağlantı',
  basili: 'Basılı kitap',
}

export const TELIF_ADI = {
  kendi: 'Kendi içeriğim',
  resmi: 'Resmî kaynak',
  dis: 'Dış bağlantı',
}

/** Bağlantı kaç aydır kontrol edilmediyse uyarı gösterilir. */
const CURUME_AYI = 6

export function baglantiEskimis(kaynak) {
  if (kaynak?.bicim !== 'baglanti') return false
  if (!kaynak.son_kontrol) return true
  const gun = (Date.now() - new Date(kaynak.son_kontrol).getTime()) / 86400000
  return gun > CURUME_AYI * 30
}

/** Kaynağın açılacağı adres. Basılı kitapta adres yok. */
export function kaynakAdresi(kaynak) {
  if (kaynak?.bicim === 'baglanti') return kaynak.url || null
  if (kaynak?.bicim === 'dosya') return kaynak.dosya_yolu || null
  return null
}
