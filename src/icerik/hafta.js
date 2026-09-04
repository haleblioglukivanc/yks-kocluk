// Örnek içerik: bir öğrencinin gerçek haftası (kurgusal, tanıtım için)
export const ogrenci = { ad: 'Elif', sinif: '12. sınıf · Sayısal', hedef: 'Tıp', hafta: '14–20 Ekim' };

export const gunler = [
  { ad: 'Pazartesi', kisa: 'Pzt', tarih: '14 Eki', gorevler: [
    { ders: 'Matematik', konu: 'Türev — zincir kuralı', adet: '40 soru', durum: 'bitti' },
    { ders: 'Fizik', konu: 'Elektrik akımı — tekrar', adet: '25 soru', durum: 'bitti' },
    { ders: 'Türkçe', konu: 'Paragraf', adet: '20 soru', durum: 'bitti' } ],
    not: 'Türevde 40/40. Hızlandırıyoruz.' },
  { ad: 'Salı', kisa: 'Sal', tarih: '15 Eki', gorevler: [
    { ders: 'Matematik', konu: 'Türev — uygulamalar', adet: '30 soru', durum: 'bitti' },
    { ders: 'Kimya', konu: 'Gazlar', adet: '30 soru', durum: 'kaldi' },
    { ders: 'Biyoloji', konu: 'Sinir sistemi — konu', adet: '1 video', durum: 'bitti' } ],
    not: 'Gazlar kalmış. Sormadım; çarşamba bakacağım.' },
  { ad: 'Çarşamba', kisa: 'Çar', tarih: '16 Eki', gorevler: [
    { ders: 'Kimya', konu: 'Gazlar', adet: '30 soru', durum: 'tasindi' },
    { ders: 'Fizik', konu: 'Manyetizma — konu', adet: '1 video', durum: 'kaldi' },
    { ders: 'Türkçe', konu: 'Paragraf', adet: '20 soru', durum: 'kaldi' } ],
    not: 'Okulda sınav haftası. Akşam konuştuk — aşağıda.' },
  { ad: 'Perşembe', kisa: 'Per', tarih: '17 Eki', gorevler: [
    { ders: 'Kimya', konu: 'Gazlar', adet: '20 soru', durum: 'bitti' },
    { ders: 'Fizik', konu: 'Manyetizma — konu', adet: '1 video', durum: 'bitti' } ],
    not: 'Hafifletilmiş gün. İki iş, ikisi de bitti.' },
  { ad: 'Cuma', kisa: 'Cum', tarih: '18 Eki', gorevler: [
    { ders: 'Matematik', konu: 'Türev — karma test', adet: '35 soru', durum: 'bitti' },
    { ders: 'Fizik', konu: 'Manyetizma', adet: '25 soru', durum: 'bitti' },
    { ders: 'Türkçe', konu: 'Paragraf', adet: '20 soru', durum: 'bitti' } ],
    not: 'Ritim geri geldi.' },
  { ad: 'Cumartesi', kisa: 'Cmt', tarih: '19 Eki', gorevler: [
    { ders: 'Deneme', konu: 'TYT genel deneme', adet: '165 dk', durum: 'bitti' },
    { ders: 'Analiz', konu: 'Yanlış defteri', adet: '40 dk', durum: 'bitti' } ],
    not: 'TYT 84,5 net. Geçen hafta 81,25.' },
  { ad: 'Pazar', kisa: 'Paz', tarih: '20 Eki', gorevler: [
    { ders: 'Görüşme', konu: 'Haftalık değerlendirme', adet: '30 dk', durum: 'bitti' },
    { ders: 'Dinlenme', konu: 'Plan yok', adet: '—', durum: 'bos' } ],
    not: 'Gelecek hafta: manyetizma soru, gazlar tekrar.' },
];

export const mesajlar = [
  { kim: 'ogrenci', saat: '21:40', metin: 'Hocam bugün hiçbir şey yapamadım. Okulda iki sınav vardı, eve gelince uyuyakaldım.' },
  { kim: 'koc', saat: '21:52', metin: 'Sorun değil, sınav haftası olduğunu biliyorduk. Bir şey sorayım: yorgunluk mu, moral mi?' },
  { kim: 'ogrenci', saat: '21:53', metin: 'Yorgunluk. Ama üç iş birikti, yarın da yetişmez diye kötü hissediyorum.' },
  { kim: 'koc', saat: '22:01', metin: 'Birikmeyecek. Paragrafı bu hafta siliyorum, cuma zaten var. Gazlar 30 değil 20 soru. Manyetizma videosunu izle, soru çözme. Yarın iki iş, o kadar.' },
  { kim: 'ogrenci', saat: '22:02', metin: 'Tamam hocam. Teşekkürler.' },
  { kim: 'koc', saat: '22:03', metin: 'Cumartesi denemeden sonra konuşuruz. Şimdi uyu.' },
];

export const ilkeler = [
  { baslik: 'Kaçan gün telafi edilir, cezalandırılmaz', metin: 'Program bir sözleşme değil, bir tahmin. Hayat araya girdiğinde plan öğrenciye uyar; öğrenci plana değil.' },
  { baslik: 'Haftada bir görüşme, her gün kontrol', metin: 'Pazar 30 dakika konuşuruz. Ama her akşam listeye bakarım; iki gün üst üste boş kalırsa ben yazarım.' },
  { baslik: 'Veli izler, karışmaz', metin: 'Veli haftalık özeti görür: kaç iş planlandı, kaçı bitti, deneme netleri. Günlük listeye erişimi yok — o alan öğrenciyle benim aramızda.' },
];

export const baslangic = [
  { baslik: 'Tanışma görüşmesi', sure: '30 dk · ücretsiz', metin: 'Öğrenciyle konuşurum, veliyle ayrıca. Hedef, mevcut net, günlük gerçek çalışma süresi.' },
  { baslik: 'İlk hafta: gözlem', sure: '7 gün', metin: 'Program yazmam. Öğrenci ne yapıyorsa onu sisteme işler; ben sadece izlerim. Gerçek kapasiteyi böyle görürüz.' },
  { baslik: 'İkinci hafta: program', sure: 'sonrası her hafta', metin: 'Gözleme göre ilk program. Pazar görüşmesi, gün sonu kontrolleri ve deneme analizi başlar.' },
];
