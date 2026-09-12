/**
 * İkinci dalga: kütüphaneyi yayınevi genişliğiyle büyütür.
 *
 * Birinci dalga her ders için "hangi kitap" sorusunu cevaplıyordu;
 * bu dalga "öğrencinin elinde hangi kitap olursa olsun listede bulunsun"
 * sorusunu. Koç öğrencinin aldığı kitabı listede bulamazsa sistem dışına
 * çıkıyor, o yüzden piyasada yaygın olan yayınevlerini de ekliyoruz.
 *
 * Kalıp bilinçli: her yayınevinin kendi seri adı kullanılıyor
 * (Paraf "Soru Kütüphanesi", Toprak "Yeni Nesil", Okyanus "Özel Ders
 * Konseptli"…) ki koç raftaki kitabı adından tanısın.
 */
const fs = require('fs')
const yol = __dirname + '/kaynaklar-piyasa.json'
const veri = JSON.parse(fs.readFileSync(yol, 'utf8'))

const DERS_ADI = {
  yks_turkce: 'Türkçe',
  yks_matematik: 'Matematik',
  yks_geometri: 'Geometri',
  yks_fizik: 'Fizik',
  yks_kimya: 'Kimya',
  yks_biyoloji: 'Biyoloji',
  yks_tarih: 'Tarih',
  yks_cografya: 'Coğrafya',
  yks_edebiyat: 'Edebiyat',
  yks_felsefe: 'Felsefe',
}

/* Hangi ders hangi kapsamda satılıyor. Geometri tek kitap (TYT+AYT),
   Türkçe yalnızca TYT, Edebiyat yalnızca AYT. */
const CIFTLER = [
  ['yks_turkce', 'tyt'],
  ['yks_matematik', 'tyt'],
  ['yks_matematik', 'ayt'],
  ['yks_geometri', 'tyt_ayt'],
  ['yks_fizik', 'tyt'],
  ['yks_fizik', 'ayt'],
  ['yks_kimya', 'tyt'],
  ['yks_kimya', 'ayt'],
  ['yks_biyoloji', 'tyt'],
  ['yks_biyoloji', 'ayt'],
  ['yks_tarih', 'tyt'],
  ['yks_tarih', 'ayt'],
  ['yks_cografya', 'tyt'],
  ['yks_cografya', 'ayt'],
  ['yks_edebiyat', 'ayt'],
  ['yks_felsefe', 'tyt'],
  ['yks_felsefe', 'ayt'],
]

const KAPSAM_ON = { tyt: 'TYT', ayt: 'AYT', tyt_ayt: 'TYT AYT' }

/* Her yayınevi: seri adı kalıbı, seviye ve hangi derslerde var.
   dersler: null = hepsinde. */
const YAYINEVLERI = [
  { yayinevi: 'Paraf Yayınları', kalip: '{K} {D} Soru Kütüphanesi', seviye: 2, dersler: null,
    aciklama: 'Özet konu anlatımı + modüler testler' },
  { yayinevi: 'Toprak Yayıncılık', kalip: '{K} {D} Yeni Nesil Soru Bankası', seviye: 3, dersler: null,
    aciklama: 'Zorluk düzeyi piyasa ortalamasının üstünde' },
  { yayinevi: 'Sınav Yayınları', kalip: '{K} {D} 3 Kademeli Soru Bankası', seviye: 1, dersler: null,
    aciklama: 'Öğren / yorumla / ilişkilendir kademeleri' },
  { yayinevi: 'Okyanus Yayıncılık', kalip: '{K} {D} Özel Ders Konseptli Soru Bankası', seviye: 2, dersler: null },
  { yayinevi: 'Nitelik Yayınları', kalip: '{K} {D} Tersyüz Soru Bankası', seviye: 2,
    dersler: ['yks_matematik', 'yks_geometri', 'yks_fizik', 'yks_kimya', 'yks_biyoloji'] },
  { yayinevi: 'Kafa Dengi Yayınları', kalip: '{K} {D} Orta ve İleri Düzey Soru Bankası', seviye: 3,
    dersler: ['yks_turkce', 'yks_matematik', 'yks_kimya', 'yks_biyoloji'] },
  { yayinevi: 'Sonuç Yayınları', kalip: '{K} {D} Soru Bankası', seviye: 1,
    dersler: ['yks_turkce', 'yks_tarih', 'yks_cografya', 'yks_felsefe', 'yks_edebiyat'] },
  { yayinevi: 'Palme Yayınevi', kalip: 'YKS {K} {D} Soru Kitabı', seviye: 2,
    dersler: ['yks_matematik', 'yks_geometri', 'yks_kimya'] },
  { yayinevi: 'Esen Yayınları', kalip: '{K} {D} Soru Bankası', seviye: 2,
    dersler: ['yks_matematik', 'yks_fizik', 'yks_kimya'] },
  { yayinevi: 'Orijinal Yayınları', kalip: '{K} {D} Soru Bankası', seviye: 2,
    dersler: ['yks_turkce', 'yks_matematik', 'yks_geometri'] },
  { yayinevi: 'ENS Yayıncılık', kalip: '{K} {D} Destek Soru Bankası', seviye: 1,
    dersler: ['yks_fizik', 'yks_kimya', 'yks_biyoloji'],
    aciklama: 'Video konu anlatımı ve soru çözümü' },
]

/* Branş denemesi: koç haftalık tek ders denemesi yazarken listede
   deneme kaynağı bulamıyordu. Özdebir bu bandın klasiği. */
const DENEME = [
  { yayinevi: 'Özdebir Yayınları', kalip: '{K} {D} Branş Denemesi', seviye: 2, faz: 'brans_denemesi',
    dersler: ['yks_turkce', 'yks_matematik', 'yks_geometri', 'yks_fizik', 'yks_kimya',
              'yks_biyoloji', 'yks_tarih', 'yks_cografya', 'yks_edebiyat'] },
  { yayinevi: '3D Yayınları', kalip: '{K} {D} Simülasyon Denemeleri', seviye: 2, faz: 'brans_denemesi',
    dersler: ['yks_turkce', 'yks_fizik', 'yks_kimya', 'yks_biyoloji', 'yks_tarih', 'yks_cografya'] },
]

const ad = (kalip, kapsam, ders) =>
  kalip.replace('{K}', KAPSAM_ON[kapsam]).replace('{D}', DERS_ADI[ders])

const yeni = []
for (const kume of [YAYINEVLERI, DENEME]) {
  for (const y of kume) {
    for (const [ders, kapsam] of CIFTLER) {
      if (y.dersler && !y.dersler.includes(ders)) continue
      yeni.push({
        ders,
        kapsam,
        faz: y.faz ?? 'soru_bankasi',
        seviye: y.seviye,
        yayinevi: y.yayinevi,
        ad: ad(y.kalip, kapsam, ders),
        ...(y.aciklama ? { aciklama: y.aciklama } : {}),
      })
    }
  }
}

/* Aynı yayınevi + aynı kitap adı iki kere girmesin. */
const anahtar = (k) => `${k.ders}|${k.kapsam}|${k.yayinevi}|${k.ad}`
const varOlan = new Set(veri.kaynaklar.map(anahtar))
const eklenecek = yeni.filter((k) => !varOlan.has(anahtar(k)))

veri.kaynaklar = veri.kaynaklar.concat(eklenecek)
fs.writeFileSync(yol, JSON.stringify(veri, null, 2) + '\n')

const say = {}
for (const k of veri.kaynaklar) {
  const a = `${DERS_ADI[k.ders] ?? k.ders} ${KAPSAM_ON[k.kapsam]}`
  say[a] = (say[a] || 0) + 1
}
console.log('eklendi:', eklenecek.length, '· toplam:', veri.kaynaklar.length)
console.log('yayınevi sayısı:', new Set(veri.kaynaklar.map((k) => k.yayinevi)).size)
for (const a of Object.keys(say).sort()) console.log(' ', a.padEnd(20), say[a])
