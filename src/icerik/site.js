/**
 * ═══════════════════════════════════════════════════════════════
 *  TANITIM SAYFASININ TÜM İÇERİĞİ
 *  Metin değiştirmek için başka dosyaya girmeye gerek yok.
 * ═══════════════════════════════════════════════════════════════
 *
 *  ⚠️  ŞU AN DEMO VERİ İLE ÇALIŞIYOR.
 *
 *  Yayına çıkmadan önce gerçek bilgiyle değiştirilecek alanlar:
 *    · koc.biyografi   → Kıvanç'ın kendi metni
 *    · belgeler.liste  → gerçek diploma / sertifika görselleri
 *    · yorumlar.liste  → gerçek öğrenci ve veli yorumları
 *    · netGrafigi.veri → gerçek bir öğrencinin net gelişimi
 *    · iletisim.*      → telefon, WhatsApp, Instagram
 *
 *  Uydurma yorumu gerçek bir kişinin adı altında yayınlamak etik ve
 *  hukuki risk taşır. yorumlar.liste dizisini boşaltırsanız ([])
 *  o bölüm sayfada hiç görünmez.
 */

export const site = {
  koc: {
    ad: 'Kıvanç Haleblioğlu',
    unvan: 'YKS ve LGS Koçu',

    // Sayfanın ilk cümlesi. {} içindeki kelimeye fosforlu vurgu gelir.
    vaat: 'Netin nereye gittiğini {birlikte} görelim.',

    altVaat:
      'On yıldır sınava hazırlanan öğrencilerle çalışıyorum. Yaptığım iş ' +
      'program yazmak değil; o programın gerçekten yürüdüğünden emin olmak.',

    // ⚠️ DEMO — Kıvanç kendi cümleleriyle değiştirmeli.
    biyografi: [
      'Koçluğa kendi hazırlık sürecimde eksikliğini hissettiğim şeyi yapmak için ' +
        'başladım: birinin haftalık olarak nerede olduğumu sorması ve sapmayı erken görmesi.',
      'Öğrencilerimin çoğu bilgi eksikliğinden değil, düzensizlikten kaybediyor. ' +
        'Bu yüzden çalışmanın kendisi kadar takibine de önem veriyorum. Her hafta ne ' +
        'yapıldığı, ne yapılmadığı ve nedeni konuşulur.',
      'Veliyle iletişimi öğrencinin bilgisi dâhilinde kurarım. Veli sisteme girip ' +
        'ilerlemeyi görebilir; ama süreç öğrenciyle benim aramdadır.',
    ],

    // public/ klasörüne koyup yolunu yazın: '/kivanc.jpg'. Boşsa baş harfler görünür.
    portre: '',
  },

  // ⚠️ DEMO — gerçek belgelerle değiştirilecek.
  // Görselleri public/belgeler/ içine koyup gorsel alanına yolunu yazın.
  // ⚠️ DEMO — görseller örnektir, üzerlerinde "ÖRNEK" filigranı vardır.
  // Gerçek belgeleri public/belgeler/ içine koyup gorsel yolunu değiştirin.
  belgeler: {
    baslik: 'Belgeler',
    aciklama: 'Eğitim ve sertifikalar. Yana kaydırarak hepsini görebilirsiniz.',
    liste: [
      { ad: 'Lisans Diploması', kurum: '[DEMO] Eğitim Fakültesi', yil: '2015', gorsel: '/belgeler/ornek-01.png' },
      { ad: 'Eğitim Koçluğu Sertifikası', kurum: '[DEMO] Sürekli Eğitim Merkezi', yil: '2016', gorsel: '/belgeler/ornek-02.png' },
      { ad: 'Rehberlik ve Psikolojik Danışmanlık', kurum: '[DEMO] Pedagoji Enstitüsü', yil: '2019', gorsel: '/belgeler/ornek-03.png' },
      { ad: 'Ölçme ve Değerlendirme', kurum: '[DEMO] Eğitim Bilimleri Merkezi', yil: '2022', gorsel: '/belgeler/ornek-04.png' },
      { ad: 'Öğrenme Psikolojisi', kurum: '[DEMO] Psikoloji Uygulama Merkezi', yil: '2018', gorsel: '/belgeler/ornek-05.png' },
      { ad: 'Sınav Kaygısı Yönetimi', kurum: '[DEMO] Danışmanlık Akademisi', yil: '2020', gorsel: '/belgeler/ornek-06.png' },
      { ad: 'Verimli Ders Çalışma Teknikleri', kurum: '[DEMO] Eğitim Akademisi', yil: '2017', gorsel: '/belgeler/ornek-07.png' },
      { ad: 'Bireysel Farklılıklar ve Öğrenme Stilleri', kurum: '[DEMO] Eğitim Enstitüsü', yil: '2021', gorsel: '/belgeler/ornek-08.png' },
      { ad: 'Aile İletişimi ve Veli Danışmanlığı', kurum: '[DEMO] Aile Danışma Merkezi', yil: '2023', gorsel: '/belgeler/ornek-09.png' },
      { ad: 'Kariyer Planlama ve Tercih Danışmanlığı', kurum: '[DEMO] Meslek Rehberliği Merkezi', yil: '2024', gorsel: '/belgeler/ornek-10.png' },
    ],
  },

  // emoji alanı isteğe bağlı: silersen o satırda emoji görünmez.
  sayilar: [
    { emoji: '🕙', sayi: '10', birim: 'yıl', not: 'Koçluk deneyimi' },
    { emoji: '🎓', sayi: '3.450', birim: 'öğrenci', not: 'Bugüne kadar birlikte çalışılan' },
    { emoji: '📚', sayi: '1.498', birim: 'konu', not: 'Güncel müfredata göre takip edilen' },
  ],

  // ⚠️ DEMO — grafiğin şeklini göstermek için. Gerçek veriyle değiştirin.
  netGrafigi: {
    baslik: 'Bir öğrencinin bir yılı',
    aciklama: 'Aylık deneme netleri. İnişler dâhil, çünkü süreç düz gitmez.',
    veri: [
      { ay: 'Eyl', net: 42 }, { ay: 'Eki', net: 51 }, { ay: 'Kas', net: 48 },
      { ay: 'Ara', net: 59 }, { ay: 'Oca', net: 63 }, { ay: 'Şub', net: 58 },
      { ay: 'Mar', net: 71 }, { ay: 'Nis', net: 78 }, { ay: 'May', net: 84 },
      { ay: 'Haz', net: 91 },
    ],
  },

  nasil: {
    baslik: 'Nasıl çalışıyoruz',
    aciklama: 'Dört adım. Sırası önemli, çünkü her biri bir öncekine dayanıyor.',
    adimlar: [
      {
        baslik: 'Tanışma ve seviye tespiti',
        metin:
          'Hangi sınıfta, hangi alanda ve gerçekte nerede olduğunuzu konuşuyoruz. ' +
          'Elinizde deneme sonucu varsa birlikte okuyoruz. Bu görüşme ücretsiz.',
      },
      {
        baslik: 'Programın kurulması',
        metin:
          'Haftalık program sizin gerçek gününüze göre yazılıyor. Okul, dershane, ' +
          'yol ve dinlenme saatleri düşülüyor; kalan zamana program yapılır.',
      },
      {
        baslik: 'Günlük takip',
        metin:
          'Yapılan ve yapılmayan görevler sistemde görünüyor. Aksama olduğunda ay ' +
          'sonunu beklemiyoruz; aynı hafta konuşup nedenini buluyoruz.',
      },
      {
        baslik: 'Deneme analizi',
        metin:
          'Her denemeden sonra net değişimi ve konu bazlı eksikler çıkarılıyor. ' +
          'Program bir sonraki hafta buna göre güncelleniyor.',
      },
    ],
  },

  platform: {
    baslik: 'Sistemde ne takip ediliyor',
    aciklama: 'Öğrenci ve veli kendi hesabıyla giriyor. Veli görebilir, değiştiremez.',
    maddeler: [
      { ad: 'Haftalık program', not: 'Günlük görevler, hedef soru sayılarıyla' },
      { ad: 'Konu ilerlemesi', not: 'Başlanmadı / çalışılıyor / bitti' },
      { ad: 'Deneme sonuçları', not: 'Ders bazlı doğru, yanlış ve net' },
      { ad: 'Net grafiği', not: 'Zaman içindeki değişim' },
      { ad: 'Veli erişimi', not: 'Sadece görüntüleme' },
    ],
  },

  kimler: {
    baslik: 'Kimler için',
    gruplar: [
      { emoji: '🎯', ad: 'YKS', aciklama: 'Sayısal, Eşit Ağırlık, Sözel' },
      { emoji: '🏫', ad: '9–11. sınıf', aciklama: 'Okulla birlikte erken hazırlık' },
      { emoji: '✏️', ad: 'LGS', aciklama: '8. sınıf' },
      { emoji: '🔁', ad: 'Mezun', aciklama: 'İkinci kez girecekler' },
    ],
  },

  // ⚠️ DEMO — gerçek yorum yoksa: liste: []
  yorumlar: {
    baslik: 'Ne diyorlar',
    liste: [
      {
        metin:
          '[DEMO] En çok işime yarayan şey haftalık görüşmelerdi. Kendi başıma plan ' +
          'yapıyordum ama iki hafta sonra bırakıyordum. Burada bırakma şansım olmadı.',
        kisi: 'Ö. Y.', rol: '12. sınıf · Sayısal',
      },
      {
        metin:
          '[DEMO] Oğlumun ne yaptığını sormaktan yorulmuştum. Sisteme girip ' +
          'görebiliyorum, o yüzden artık sormuyorum. İkimiz de rahatladık.',
        kisi: 'S. K.', rol: 'Veli',
      },
      {
        metin:
          '[DEMO] Denemeden sonra sadece net söylenmiyor, hangi konudan kaybettiğim ' +
          'çıkarılıyor. Bir sonraki hafta o konu programa giriyor.',
        kisi: 'M. A.', rol: 'Mezun · Eşit Ağırlık',
      },
    ],
  },

  // ── Kayan şerit: takip edilen dersler ───────────────────────────
  kayan: {
    baslik: 'Sistemde takibi yapılan dersler',
    dersler: [
      'TYT Türkçe', 'TYT Matematik', 'TYT Geometri', 'TYT Fizik', 'TYT Kimya',
      'TYT Biyoloji', 'TYT Tarih', 'TYT Coğrafya', 'TYT Felsefe', 'TYT Din Kültürü',
      'AYT Matematik', 'AYT Geometri', 'AYT Fizik', 'AYT Kimya', 'AYT Biyoloji',
      'AYT Edebiyat', 'AYT Tarih', 'AYT Coğrafya', 'AYT Felsefe Grubu',
      'LGS Matematik', 'LGS Fen Bilimleri', 'LGS Türkçe', 'LGS İnkılap',
    ],
  },

  // ── Vitrin: sekmeli ürün bölümü ─────────────────────────────────
  // Her sekmenin bir maketi var. Maket türleri: gorev, ilerleme, net, veli.
  vitrin: {
    baslik: 'Sistemin içi',
    aciklama:
      'Ekran görüntüsü değil; aşağıdaki maketler öğrencinin ve velinin telefonunda ' +
      'gerçekten gördüğü ekranların birebir aynısı.',
    sekmeler: [
      {
        anahtar: 'gorev',
        emoji: '🗓️',
        ad: 'Bugün ne yapacağım',
        not: 'Öğrenci telefonu açtığında tek bir liste görür. Yarını değil, bugünü.',
        ekran: { baslik: 'Bugün', tarih: 'Pzt · 14 Ekim' },
      },
      {
        anahtar: 'ilerleme',
        emoji: '📖',
        ad: 'Konu ilerlemesi',
        not: 'Her ders için nerede kalındığı. Tahmin değil, işaretlenmiş konu sayısı.',
        ekran: { baslik: 'Konular', tarih: 'TYT · Sayısal' },
      },
      {
        anahtar: 'net',
        emoji: '📈',
        ad: 'Deneme netleri',
        not: 'Her denemeden sonra net değişimi ve hangi konudan kaybedildiği.',
        ekran: { baslik: 'Denemeler', tarih: 'Son 6 deneme' },
      },
      {
        anahtar: 'veli',
        emoji: '👪',
        ad: 'Velinin gördüğü',
        not: 'Veli haftalık özeti görür, hiçbir şeyi değiştiremez. Süreç öğrenciyle koç arasındadır.',
        ekran: { baslik: 'Haftalık özet', tarih: '7–13 Ekim' },
      },
    ],
    // Maket verileri — demo, gerçek öğrenci verisi değil.
    maket: {
      gorevler: [
        { ad: 'AYT Matematik · Türev', adet: '40 soru', bitti: true },
        { ad: 'TYT Türkçe · Paragraf', adet: '30 soru', bitti: true },
        { ad: 'AYT Fizik · Çembersel hareket', adet: 'konu + 25 soru', bitti: false },
        { ad: 'TYT Kimya · Karışımlar', adet: '20 soru', bitti: false },
        { ad: 'Tekrar · Dünkü yanlışlar', adet: '15 soru', bitti: false },
      ],
      ilerlemeler: [
        { ad: 'AYT Matematik', oran: 72, not: '31/43 konu' },
        { ad: 'AYT Fizik', oran: 54, not: '18/33 konu' },
        { ad: 'TYT Türkçe', oran: 88, not: '22/25 konu' },
        { ad: 'AYT Kimya', oran: 41, not: '12/29 konu' },
      ],
      netler: [
        { ay: 'Nis', net: 58 }, { ay: 'May', net: 61 }, { ay: 'Haz', net: 67 },
        { ay: 'Tem', net: 66 }, { ay: 'Ağu', net: 74 }, { ay: 'Eyl', net: 81 },
      ],
      veli: {
        satirlar: [
          { ad: 'Tamamlanan görev', deger: '19 / 22' },
          { ad: 'Çözülen soru', deger: '1.240' },
          { ad: 'Çalışma süresi', deger: '26 sa 40 dk' },
          { ad: 'Son deneme neti', deger: '81,25' },
        ],
        not: 'Bu hafta fizik programın gerisinde kaldı. Önümüzdeki hafta fizik ağırlıklı ilerleyeceğiz.',
      },
    },
  },

  sorular: {
    baslik: 'Sık sorulanlar',
    liste: [
      {
        soru: 'Görüşmeler nasıl yapılıyor?',
        cevap: 'Haftada bir, önceden belirlenen saatte. Yüz yüze ya da görüntülü. Süre genelde 30–45 dakika.',
      },
      {
        soru: 'Ücret ne kadar?',
        cevap:
          'Öğrencinin sınıfına ve görüşme sıklığına göre değişiyor. Tanışma görüşmesinde ' +
          'net rakam konuşuyoruz; o görüşme ücretsiz.',
      },
      {
        soru: 'Ders anlatıyor musunuz?',
        cevap:
          'Hayır. Koçluk ders anlatımı değildir. Neyi, ne zaman, ne kadar çalışacağınızı ' +
          'planlar ve takip ederim. Konu eksiği varsa uygun kaynağa yönlendiririm.',
      },
      {
        soru: 'Veli süreci nasıl görüyor?',
        cevap:
          'Veliye kendi hesabı açılıyor. Program, görevler ve deneme sonuçlarını ' +
          'görüntüleyebiliyor; hiçbirini değiştiremiyor.',
      },
      {
        soru: 'Yıl ortasında başlanır mı?',
        cevap:
          'Başlanır. Program kalan süreye göre yeniden kurulur. Geç başlamak hiç ' +
          'başlamamaktan iyidir, ama beklentiyi de buna göre konuşuruz.',
      },
    ],
  },

  cagri: {
    baslik: 'Önce tanışalım',
    metin:
      'Birlikte çalışıp çalışamayacağımızı anlamak için kısa bir görüşme yeterli. ' +
      'Ücretsiz ve bir taahhüt oluşturmuyor.',
    dugme: 'İletişime geç',
  },

  iletisim: {
    // Boş bırakılan satır sayfada görünmez.
    eposta: 'haleblioglukivanc@gmail.com',
    telefon: '',
    whatsapp: '',
    instagram: '',
  },
}
