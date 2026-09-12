/**
 * Ders grupları — TYT ve AYT aynı dersin iki yüzü.
 *
 * Katalogda "Matematik" iki satır olarak duruyor: biri TYT, biri AYT.
 * Veritabanında bunun sebebi var (soru sayısı, deneme türü, kaynak
 * eşleşmesi hepsi kapsama bağlı). Ama koç ekranda "Matematik"i iki kere
 * görünce konu listesi bütün olmaktan çıkıyor; öğrencinin matematikte
 * nerede olduğuna bakmak için iki ayrı yere girmek gerekiyor.
 *
 * Çözüm veriyi değil görünümü düzeltmek: `ders_kod` aynı olan satırlar
 * tek bir ders grubunda toplanıyor, kapsam ayrımı grubun içinde bir
 * başlık olarak kalıyor. Tek dersi olan gruplarda başlık hiç çizilmiyor.
 *
 * Tek kaynak: konu yolu, öğrencinin haritası ve görev formu aynı
 * gruplamayı kullanmalı. Buradaki bir düzeltme üçüne birden yansır.
 */

export const KAPSAM_ADI = {
  tyt: 'TYT',
  ayt: 'AYT',
  ydt: 'YDT',
  tyt_ayt: 'TYT + AYT',
}

/* Grup içinde sıralama: önce TYT, sonra ortak, sonra AYT. Öğrencinin
   yürüdüğü sıra bu; hazırlık TYT konularıyla başlıyor. */
const KAPSAM_SIRA = { tyt: 1, tyt_ayt: 2, ayt: 3, ydt: 4 }

const anahtar = (d) =>
  d.ders_kod || d.dersKod || (d.ad ?? '').trim().toLocaleLowerCase('tr-TR')

/**
 * Ders satırlarını ders koduna göre gruplar.
 *
 * @param {Array} dersler - { id|dersId, ad, kapsam, sira, ders_kod } satırları
 * @returns {Array} { kod, ad, sira, kapsamlar, dersler } grupları
 */
export function dersleriGrupla(dersler = []) {
  const gruplar = new Map()

  for (const d of dersler) {
    const kod = anahtar(d)
    if (!kod) continue
    let g = gruplar.get(kod)
    if (!g) {
      g = { kod, ad: d.ad ?? '', sira: d.sira ?? 0, dersler: [] }
      gruplar.set(kod, g)
    }
    g.dersler.push(d)
    /* Aynı ders iki katalog satırında farklı adlanabiliyor
       ("Edebiyat" / "Türk Dili ve Edebiyatı"). Uzun olan tam addır. */
    if ((d.ad ?? '').length > g.ad.length) g.ad = d.ad
    g.sira = Math.min(g.sira, d.sira ?? 0)
  }

  return [...gruplar.values()]
    .map((g) => {
      const sirali = [...g.dersler].sort(
        (a, b) => (KAPSAM_SIRA[a.kapsam] ?? 9) - (KAPSAM_SIRA[b.kapsam] ?? 9),
      )
      return {
        ...g,
        dersler: sirali,
        kapsamlar: [...new Set(sirali.map((d) => d.kapsam))],
      }
    })
    .sort((a, b) => a.sira - b.sira)
}

/** Grubun kapsam etiketi: "TYT + AYT", "TYT", "AYT"… */
export function kapsamEtiketi(grup) {
  const par = (grup?.kapsamlar ?? []).flatMap((k) =>
    k === 'tyt_ayt' ? ['TYT', 'AYT'] : [KAPSAM_ADI[k] ?? String(k).toUpperCase()],
  )
  return [...new Set(par)].join(' + ')
}

/** Grup içindeki tek bir ders satırının kapsam başlığı. */
export function dersKapsamAdi(ders) {
  return KAPSAM_ADI[ders?.kapsam] ?? String(ders?.kapsam ?? '').toUpperCase()
}

/** Sayısal alanları grup düzeyinde toplar (konu sayısı, ilerleme…). */
export function grupToplami(grup, alanlar) {
  const t = {}
  for (const alan of alanlar) {
    t[alan] = grup.dersler.reduce((n, d) => n + (Number(d[alan]) || 0), 0)
  }
  return t
}
