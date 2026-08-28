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
    tanitim:
      '[DOLDURULACAK] Kaç yıldır koçluk yaptığınız, hangi alanda okuduğunuz, ' +
      'neden bu işi yaptığınız. Öğrenciyle ve veliyle nasıl çalıştığınıza dair ' +
      'iki üç cümle. Abartılı iddia yerine somut ve sade bir anlatım daha güven verir.',
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
    { sayi: '1.498', etiket: 'konu başlığı', not: 'MEB müfredatına göre güncel' },
    { sayi: '7', etiket: 'ayrı katalog', not: 'YKS alanları, 9-11. sınıf ve LGS' },
    { sayi: '[DOLDURULACAK]', etiket: 'öğrenci', not: 'Şu an koçluk verilen' },
  ],

  nasil: {
    baslik: 'Nasıl çalışıyoruz',
    adimlar: [
      {
        baslik: 'Tanışma ve seviye tespiti',
        metin:
          'Hangi sınıfta, hangi alanda ve nerede olduğunuzu konuşuyoruz. ' +
          'Deneme sonuçlarınız varsa birlikte bakıyoruz.',
      },
      {
        baslik: 'Programın kurulması',
        metin:
          'Haftalık program, sizin gerçek gününüze göre yazılıyor. ' +
          'Okul, dershane ve dinlenme saatleri hesaba katılıyor.',
      },
      {
        baslik: 'Günlük takip',
        metin:
          'Yapılan ve yapılmayan görevler sistem üzerinden görünüyor. ' +
          'Aksama olduğunda aynı hafta içinde müdahale ediliyor.',
      },
      {
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
      'Günlük ve haftalık program',
      'Konu bazlı ilerleme durumu',
      'Deneme sonuçları ve net değişimi',
      'Soru çözüm sayıları',
      'Veli görüntüleme erişimi',
    ],
  },

  kimler: {
    baslik: 'Kimler için',
    gruplar: [
      { ad: 'YKS', aciklama: 'Sayısal, Eşit Ağırlık ve Sözel alanları' },
      { ad: '9-11. sınıf', aciklama: 'Okul dersleriyle birlikte erken hazırlık' },
      { ad: 'LGS', aciklama: '8. sınıf öğrencileri' },
      { ad: 'Mezun', aciklama: 'İkinci kez sınava girecekler' },
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
