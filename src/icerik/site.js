/**
 * Tanıtım sayfasının bütün metinleri burada.
 * Değiştirmek için başka dosyaya girmenize gerek yok.
 *
 * ⚠️ [DOLDURULACAK] işaretli yerler yer tutucudur. Gerçek bilgiyle
 * değiştirilmeden yayına çıkmamalı.
 */

export const site = {
  koc: {
    ad: 'Kıvanç Haleblioğlu',
    unvan: 'YKS ve LGS Koçu',
    // Tek cümlelik vaat. Ziyaretçinin okuyacağı ilk şey.
    vaat: 'Dağınık bir çalışma düzenini, takip edilebilir bir programa çeviriyorum.',
    // Kısa tanıtım. 2-3 cümle. Kendi ağzınızdan yazın.
    // ⚠️ Bu metin hâlâ yer tutucu. Kıvanç kendi ağzından yazmalı.
    tanitim:
      '[DOLDURULACAK] On yıldır YKS ve LGS öğrencileriyle çalışıyorum. ' +
      'Buraya kendi cümlelerinizle: hangi alanda okuduğunuz, neden bu işi ' +
      'yaptığınız, öğrenciyle ve veliyle nasıl çalıştığınız. İki üç cümle yeter; ' +
      'abartılı iddia yerine sade bir anlatım daha çok güven verir.',
  },

  iletisim: {
    // Boş bırakılan alanlar sayfada görünmez.
    eposta: 'haleblioglukivanc@gmail.com',
    telefon: '', // örn. '+90 5XX XXX XX XX'
    whatsapp: '', // sadece rakam, örn. '905XXXXXXXXX'
    instagram: '', // kullanıcı adı, '@' olmadan
  },

  // Ana vaadin altındaki üç kısa kanıt satırı.
  ozetler: [
    { emoji: '🗓️', sayi: '10', etiket: 'yıl', not: 'Koçluk deneyimi' },
    { emoji: '🎓', sayi: '3.450', etiket: 'öğrenci', not: 'Bugüne kadar birlikte çalışılan' },
    { emoji: '📚', sayi: '1.498', etiket: 'konu başlığı', not: 'Güncel MEB müfredatına göre' },
  ],

  nasil: {
    baslik: 'Nasıl çalışıyoruz',
    adimlar: [
      {
        emoji: '🤝',
        baslik: 'Tanışma ve seviye tespiti',
        metin:
          'Hangi sınıfta, hangi alanda ve nerede olduğunuzu konuşuyoruz. ' +
          'Deneme sonuçlarınız varsa birlikte bakıyoruz.',
      },
      {
        emoji: '🗂️',
        baslik: 'Programın kurulması',
        metin:
          'Haftalık program, sizin gerçek gününüze göre yazılıyor. ' +
          'Okul, dershane ve dinlenme saatleri hesaba katılıyor.',
      },
      {
        emoji: '✅',
        baslik: 'Günlük takip',
        metin:
          'Yapılan ve yapılmayan görevler sistem üzerinden görünüyor. ' +
          'Aksama olduğunda aynı hafta içinde müdahale ediliyor.',
      },
      {
        emoji: '📈',
        baslik: 'Deneme analizi',
        metin:
          'Her denemeden sonra net değişimi ve konu bazlı eksikler çıkarılıyor. ' +
          'Program buna göre güncelleniyor.',
      },
    ],
  },

  platform: {
    baslik: 'Sistem üzerinden neler takip ediliyor',
    maddeler: [
      { emoji: '🗓️', metin: 'Günlük ve haftalık program' },
      { emoji: '📖', metin: 'Konu bazlı ilerleme durumu' },
      { emoji: '📊', metin: 'Deneme sonuçları ve net değişimi' },
      { emoji: '✏️', metin: 'Soru çözüm sayıları' },
      { emoji: '👨‍👩‍👦', metin: 'Veli görüntüleme erişimi' },
    ],
  },

  kimler: {
    baslik: 'Kimler için',
    gruplar: [
      { emoji: '🎯', ad: 'YKS', aciklama: 'Sayısal, Eşit Ağırlık ve Sözel alanları' },
      { emoji: '🏫', ad: '9-11. sınıf', aciklama: 'Okul dersleriyle birlikte erken hazırlık' },
      { emoji: '🧩', ad: 'LGS', aciklama: '8. sınıf öğrencileri' },
      { emoji: '🔁', ad: 'Mezun', aciklama: 'İkinci kez sınava girecekler' },
    ],
  },

  cagri: {
    baslik: 'Başlamadan önce konuşalım',
    metin:
      'Uygun olup olmadığımızı anlamak için kısa bir görüşme yeterli. ' +
      'Ücret ve çalışma düzenini o görüşmede netleştiriyoruz.',
    dugme: 'İletişime geç',
  },
}
