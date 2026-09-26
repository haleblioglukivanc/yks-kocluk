import takvim from '../../sosyal/takvim/sinavlar.json'

/* Sınav tarihleri ve net/puan hesabı — tanıtım sayfasındaki sayaç ile
   /net-hesapla sayfası kullanır.

   Tarihler tek kaynaktan gelir: sosyal/takvim/sinavlar.json. ÖSYM takvimi
   açıklanınca sosyal/sinav_takip.py o dosyayı kendisi günceller; sayaç da
   kendiliğinden doğru tarihe geçer. `kesin: false` iken sayfada "tahmini" yazar. */

export const SINAVLAR = {
  YKS: { ad: 'YKS', tarih: new Date(`${takvim.yks.tyt}T10:15:00+03:00`), kesin: takvim.yks.kesin, not: 'TYT oturumu' },
  LGS: { ad: 'LGS', tarih: new Date(`${takvim.lgs.tarih}T09:30:00+03:00`), kesin: takvim.lgs.kesin, not: 'Birinci oturum' },
}

export function kalanSure(hedef, simdi = new Date()) {
  const ms = Math.max(0, hedef - simdi)
  return {
    gun: Math.floor(ms / 864e5),
    saat: Math.floor(ms / 36e5) % 24,
    dakika: Math.floor(ms / 6e4) % 60,
    saniye: Math.floor(ms / 1e3) % 60,
  }
}

/* ── Testler ─────────────────────────────────────────────────────
   Soru sayıları ÖSYM ve MEB'in son yıllardaki sınav düzeni. */
export const TESTLER = {
  tyt: [
    { id: 'tr', ad: 'Türkçe', soru: 40 },
    { id: 'sos', ad: 'Sosyal Bilimler', soru: 20 },
    { id: 'mat', ad: 'Temel Matematik', soru: 40 },
    { id: 'fen', ad: 'Fen Bilimleri', soru: 20 },
  ],
  ayt: [
    { id: 'mat', ad: 'Matematik', soru: 40 },
    { id: 'fiz', ad: 'Fizik', soru: 14 },
    { id: 'kim', ad: 'Kimya', soru: 13 },
    { id: 'biy', ad: 'Biyoloji', soru: 13 },
    { id: 'edb', ad: 'Türk Dili ve Edebiyatı', soru: 24 },
    { id: 'tar1', ad: 'Tarih-1', soru: 10 },
    { id: 'cog1', ad: 'Coğrafya-1', soru: 6 },
    { id: 'tar2', ad: 'Tarih-2', soru: 11 },
    { id: 'cog2', ad: 'Coğrafya-2', soru: 11 },
    { id: 'fel', ad: 'Felsefe Grubu', soru: 12 },
    { id: 'din', ad: 'Din Kültürü', soru: 6 },
  ],
  ydt: [{ id: 'dil', ad: 'Yabancı Dil', soru: 80 }],
  lgs: [
    { id: 'tr', ad: 'Türkçe', soru: 20 },
    { id: 'mat', ad: 'Matematik', soru: 20 },
    { id: 'fen', ad: 'Fen Bilimleri', soru: 20 },
    { id: 'ink', ad: 'T.C. İnkılap Tarihi', soru: 10 },
    { id: 'din', ad: 'Din Kültürü', soru: 10 },
    { id: 'ing', ad: 'Yabancı Dil', soru: 10 },
  ],
}

/* YKS'de 4 yanlış 1 doğruyu, LGS'de 3 yanlış 1 doğruyu götürür. */
export function net(dogru, yanlis, bolen = 4) {
  return (Number(dogru) || 0) - (Number(yanlis) || 0) / bolen
}

/* Formdaki bir dersin neti. Doğru + yanlış soru sayısını aşıyorsa satır
   hatalıdır; toplama ve puana 0 olarak girer (ekranda uyarı görünür). */
export function dersNeti(degerler, testId, ders, bolen = 4) {
  const d = Number(degerler[`${testId}.${ders.id}.d`]) || 0
  const y = Number(degerler[`${testId}.${ders.id}.y`]) || 0
  return d + y > ders.soru ? 0 : net(d, y, bolen)
}

/* ── Yaklaşık puan ───────────────────────────────────────────────
   ÖSYM puanı standart sapmayla hesaplar; katsayılar her yıl sınavın
   zorluğuna göre değişir ve sınavdan sonra belli olur. Buradaki katsayılar
   her puan türünde 500 tavanını veren, yaygın kullanılan yaklaşık
   değerlerdir. Sonuç yön göstermek içindir; sayfada "yaklaşık" yazar.
   Katsayı güncellenecekse yalnız bu tablo değişir. */
const TABAN = 100
const K = {
  tyt: { tr: 3.3, sos: 3.4, mat: 3.3, fen: 3.4 },
  // AYT puan türlerinde TYT'nin %40'ı sayılır
  tytPayi: { tr: 1.32, sos: 1.36, mat: 1.32, fen: 1.36 },
  say: { mat: 3.0, fiz: 2.85, kim: 3.07, biy: 3.07 },
  ea: { mat: 3.0, edb: 3.0, tar1: 2.8, cog1: 3.33 },
  soz: { edb: 3.0, tar1: 2.8, cog1: 3.33, tar2: 2.91, cog2: 2.91, fel: 3.0, din: 3.33 },
  dil: { dil: 3.0 },
}

const topla = (netler, kat) =>
  Object.entries(kat).reduce((t, [id, k]) => t + Math.max(0, netler[id] || 0) * k, 0)

/* netler: { tyt: {tr, sos, ...}, ayt: {...}, ydt: {dil} } */
export function puanlar(netler) {
  const tyt = netler.tyt || {}
  // ÖSYM: TYT puanı için Türkçe ya da Temel Matematik'ten en az 0,5 net gerekir
  const tytGecerli = (tyt.tr || 0) >= 0.5 || (tyt.mat || 0) >= 0.5
  if (!tytGecerli) return { tytGecerli }
  const tytPayi = topla(tyt, K.tytPayi)
  const ayt = netler.ayt || {}
  // Puan türü, o türe özgü bir test doldurulunca gösterilir: yalnız AYT
  // matematik giren sayısal öğrenciye eşit ağırlık puanı çıkmasın.
  const doldu = (...idler) => idler.some((id) => (ayt[id] || 0) > 0)
  return {
    tytGecerli,
    tyt: TABAN + topla(tyt, K.tyt),
    say: doldu('mat', 'fiz', 'kim', 'biy') ? TABAN + tytPayi + topla(ayt, K.say) : null,
    ea: doldu('edb', 'tar1', 'cog1') ? TABAN + tytPayi + topla(ayt, K.ea) : null,
    soz: doldu('tar2', 'cog2', 'fel', 'din') ? TABAN + tytPayi + topla(ayt, K.soz) : null,
    dil: (netler.ydt?.dil || 0) > 0 ? TABAN + tytPayi + topla(netler.ydt, K.dil) : null,
  }
}

/* OBP = diploma notu × 5; yerleştirmeye katkısı OBP × 0,12 (en fazla 60).
   Geçen yıl bir programa yerleşenlerde katsayı yarıya iner (0,06). */
export function obpKatkisi(diploma, gecenYilYerlesti = false) {
  const d = Number(diploma)
  if (!d || d < 50 || d > 100) return null
  return d * 5 * (gecenYilYerlesti ? 0.06 : 0.12)
}

export const sayiYaz = (n, basamak = 2) =>
  n == null ? '—' : n.toLocaleString('tr-TR', { minimumFractionDigits: basamak, maximumFractionDigits: basamak })
