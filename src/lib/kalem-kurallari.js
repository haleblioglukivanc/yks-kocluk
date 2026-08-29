// Kâmil'in kural motoru.
//
// Ses tonu kuralları (bunlar kod kadar bağlayıcı):
//  1. Asla suçlama. '3 gündür girmedin' yok; 'bugün 15 dakika bile sayılır' var.
//  2. Her mesajın bir işi var: ya eylem önerir, ya kutlar, ya risk söyler.
//  3. Öğrenciye asla başka öğrenciyle kıyas yapılmaz.
//  4. Ünlem işareti yok, emoji yok. Sıcaklık kelimelerden gelir.
//  5. Kötü haber verirken önce normalleştir, sonra tek bir adım öner.
//  6. Veli tarafında Kâmil neredeyse hiç konuşmaz.









const o = (b) => b.ogrenci;
const k = (b) => b.koc;

// ---------------------------------------------------------------- ÖĞRENCİ

const OGRENCI_KURALLARI = [
  {
    kod: 'yeni_rozet',
    rol: 'ogrenci', oncelik: 100, tekrar: 'her_zaman', ruh: 'kutlama',
    kosul: (b) => Boolean(o(b).yeniRozetAdi),
    mesaj: (b) => `${o(b).yeniRozetAdi} rozetini aldın. Bunu hak ettin.`,
    eylem: () => ({ etiket: 'Rozetlerim', hedef: '/rozetler' }),
  },
  {
    kod: 'seri_kilometre',
    rol: 'ogrenci', oncelik: 95, tekrar: 'gunde_bir', ruh: 'kutlama',
    kosul: (b) => [7, 14, 30, 50, 100].includes(o(b).guncelSeri),
    mesaj: (b) => `${o(b).guncelSeri} gün oldu, hiç ara vermedin. Defterin dolmaya başladı.`,
  },
  {
    kod: 'gun_tamamlandi',
    rol: 'ogrenci', oncelik: 90, tekrar: 'gunde_bir', ruh: 'sevinc',
    kosul: (b) => o(b).bugunToplamGorev > 0 && o(b).bugunTamamlanan === o(b).bugunToplamGorev,
    mesaj: () => `Bugünün hepsi bitti. Gerisi senin zamanın.`,
  },
  {
    kod: 'net_yukseldi',
    rol: 'ogrenci', oncelik: 85, tekrar: 'her_zaman', ruh: 'sevinc',
    kosul: (b) => (o(b).sonDenemeNetFarki ?? 0) >= 3 && (o(b).sonDenemeGunOnce ?? 99) <= 2,
    mesaj: (b) => `Son denemede netin ${Math.round(o(b).sonDenemeNetFarki)} arttı. Yaptığın şey işe yarıyor.`,
    eylem: () => ({ etiket: 'Denemeyi gör', hedef: '/denemeler' }),
  },
  {
    kod: 'net_dustu',
    rol: 'ogrenci', oncelik: 80, tekrar: 'her_zaman', ruh: 'dusunuyor',
    kosul: (b) => (o(b).sonDenemeNetFarki ?? 0) <= -4 && (o(b).sonDenemeGunOnce ?? 99) <= 2,
    mesaj: (b) =>
      o(b).enZayifKonu
        ? `Netler dalgalanır, tek bir deneme bir şey söylemez. İstersen ${o(b).enZayifKonu} tarafına bir bakalım.`
        : `Netler dalgalanır, tek bir deneme bir şey söylemez. Hangi bölüm zorladı, birlikte bakalım mı?`,
    eylem: () => ({ etiket: 'Analize bak', hedef: '/denemeler/son' }),
  },
  {
    kod: 'geri_donus',
    rol: 'ogrenci', oncelik: 75, tekrar: 'gunde_bir', ruh: 'fikir',
    kosul: (b) => o(b).sonAktiflikGun >= 3,
    mesaj: () => `Bugün 15 dakikalık tek bir görevle başlasak? Başlamak en zor kısmı.`,
    eylem: () => ({ etiket: 'En kısa görevi aç', hedef: '/bugun?sirala=kisa' }),
  },
  {
    kod: 'gecikmis_birikti',
    rol: 'ogrenci', oncelik: 65, tekrar: 'gunde_bir', ruh: 'dusunuyor',
    kosul: (b) => o(b).gecikmisGorev >= 3,
    mesaj: (b) => `${o(b).gecikmisGorev} görev bekliyor. Hepsini bugün bitirmek şart değil, birini seç yeter.`,
    eylem: () => ({ etiket: 'Bekleyenler', hedef: '/bugun?filtre=gecikmis' }),
  },
  {
    kod: 'ilk_gorev',
    rol: 'ogrenci', oncelik: 60, tekrar: 'gunde_bir', ruh: 'sevinc',
    kosul: (b) => o(b).bugunTamamlanan === 1 && o(b).bugunToplamGorev > 1,
    mesaj: (b) => `Bir tanesi bitti, ${o(b).bugunToplamGorev - 1} tane kaldı. Ritim tuttu.`,
  },
  {
    kod: 'gunaydin',
    rol: 'ogrenci', oncelik: 50, tekrar: 'gunde_bir', ruh: 'bekliyor',
    kosul: (b) => b.gunIlkGirisMi && b.saat >= 5 && b.saat < 20 && o(b).bugunToplamGorev > 0,
    mesaj: (b) => `Bugün ${o(b).bugunToplamGorev} işin var. İlkiyle başlayalım mı?`,
    eylem: () => ({ etiket: 'Bugünü aç', hedef: '/bugun' }),
  },
  {
    kod: 'bos_gun',
    rol: 'ogrenci', oncelik: 45, tekrar: 'gunde_bir', ruh: 'bekliyor',
    kosul: (b) => b.gunIlkGirisMi && o(b).bugunToplamGorev === 0,
    mesaj: () => `Bugün planında bir şey yok. Dinlenmek de plana dahil.`,
  },
  {
    kod: 'gec_saat',
    rol: 'ogrenci', oncelik: 40, tekrar: 'gunde_bir', ruh: 'uyku',
    kosul: (b) => b.saat >= 23 || b.saat < 4,
    mesaj: () => `Geç oldu. Yorgun beyin öğrenmiyor, yarın daha verimli olursun.`,
  },
];

// -------------------------------------------------------------------- KOÇ

const KOC_KURALLARI = [
  {
    kod: 'acil_ogrenci',
    rol: 'koc', oncelik: 100, tekrar: 'gunde_bir', ruh: 'endise',
    kosul: (b) => k(b).riskliOgrenciler.some((r) => r.seviye === 'acil'),
    mesaj: (b) => {
      const a = k(b).riskliOgrenciler.filter((r) => r.seviye === 'acil');
      return a.length === 1
        ? `${a[0].ad} için bugün bir şey yapmak lazım.`
        : `${a.length} öğrenci acil listesinde: ${a.slice(0, 3).map((x) => x.ad).join(', ')}.`;
    },
    eylem: () => ({ etiket: 'Risk radarı', hedef: '/panel#risk' }),
  },
  {
    kod: 'sinif_dusuyor',
    rol: 'koc', oncelik: 80, tekrar: 'haftada_bir', ruh: 'dusunuyor',
    kosul: (b) => (k(b).sinifNetDegisimi ?? 0) <= -3,
    mesaj: (b) => `Sınıf ortalaması ${Math.abs(Math.round(k(b).sinifNetDegisimi))} net düşmüş. Ortak bir konu var mı, ısı haritasına bakalım.`,
    eylem: () => ({ etiket: 'Konu ısı haritası', hedef: '/panel#isi' }),
  },
  {
    kod: 'veli_ozeti_bekliyor',
    rol: 'koc', oncelik: 70, tekrar: 'gunde_bir', ruh: 'bekliyor',
    kosul: (b) => k(b).bekleyenVeliOzeti > 0,
    mesaj: (b) => `${k(b).bekleyenVeliOzeti} veli özeti onayını bekliyor.`,
    eylem: () => ({ etiket: 'Onay kuyruğu', hedef: '/veli-ozetleri' }),
  },
  {
    kod: 'okunmamis_mesaj',
    rol: 'koc', oncelik: 65, tekrar: 'gunde_bir', ruh: 'sasirdi',
    kosul: (b) => k(b).okunmamisMesaj >= 3,
    mesaj: (b) => `${k(b).okunmamisMesaj} okunmamış mesaj birikmiş.`,
    eylem: () => ({ etiket: 'Mesajlar', hedef: '/mesajlar' }),
  },
  {
    kod: 'kutlanacak_var',
    rol: 'koc', oncelik: 60, tekrar: 'gunde_bir', ruh: 'kutlama',
    kosul: (b) => k(b).yeniSeriKuranlar.length > 0,
    mesaj: (b) => {
      const s = k(b).yeniSeriKuranlar;
      return s.length === 1
        ? `${s[0]} yeni bir seri kurdu. Bugün bunu görmesi iyi olur.`
        : `${s.length} öğrenci yeni seri kurdu. Kısa bir tebrik iyi gider.`;
    },
    eylem: () => ({ etiket: 'Tebrik gönder', hedef: '/mesajlar/yeni?sablon=tebrik' }),
  },
  {
    kod: 'deneme_girilmemis',
    rol: 'koc', oncelik: 55, tekrar: 'haftada_bir', ruh: 'fikir',
    kosul: (b) => k(b).buHaftaGirilenDeneme === 0 && k(b).aktifOgrenci > 0,
    mesaj: () => `Bu hafta hiç deneme girilmemiş. Hatırlatma göndermek ister misin?`,
    eylem: () => ({ etiket: 'Toplu hatırlatma', hedef: '/mesajlar/toplu?sablon=deneme' }),
  },
  {
    kod: 'sabah_ozeti',
    rol: 'koc', oncelik: 50, tekrar: 'gunde_bir', ruh: 'bekliyor',
    kosul: (b) => b.gunIlkGirisMi,
    mesaj: (b) =>
      `${k(b).aktifOgrenci}/${k(b).toplamOgrenci} öğrenci bu hafta aktif. Panel hazır.`,
  },
];

// ------------------------------------------------------------------- VELİ
// Veli ekranı sakin kalmalı. Tek bir kural, o da haftada bir.

const VELI_KURALLARI = [
  {
    kod: 'veli_yeni_ozet',
    rol: 'veli', oncelik: 50, tekrar: 'haftada_bir', ruh: 'bekliyor',
    kosul: (b) => Boolean(b.veli && b.veli.yeniOzetVarMi),
    mesaj: (b) => `${b.veli.ogrenciAdi} için bu haftanın özeti hazır.`,
  },
];

const TUM_KURALLAR = [...OGRENCI_KURALLARI, ...KOC_KURALLARI, ...VELI_KURALLARI];

// --------------------------------------------------------------- MOTOR


function tekrarUygunMu(kural, gecmis, simdi) {
  const son = gecmis.sonGosterim[kural.kod];
  if (!son) return true;
  const gecenSaat = (simdi.getTime() - son.getTime()) / 36e5;
  if (kural.tekrar === 'gunde_bir') return son.toDateString() !== simdi.toDateString();
  if (kural.tekrar === 'haftada_bir') return gecenSaat >= 24 * 7;
  return gecenSaat >= 1; // her_zaman için bile 1 saat soğuma
}

/**
 * Kâmil'in ne diyeceğini seçer.
 * Bir oturumda en fazla `gunlukLimit` (varsayılan 2) mesaj döner.
 * Hiç uygun kural yoksa boş dizi döner — sessiz kalmak da bir cevap.
 */
export function kalemNeDesin(baglam, gecmis, simdi = new Date()) {
  if (gecmis.sessizBitis && gecmis.sessizBitis > simdi) return [];

  const kalan = gecmis.gunlukLimit - gecmis.buOturumdaGosterilen;
  if (kalan <= 0) return [];

  return TUM_KURALLAR
    .filter((kr) => kr.rol === baglam.rol)
    .filter((kr) => {
      try { return kr.kosul(baglam); } catch { return false; }
    })
    .filter((kr) => tekrarUygunMu(kr, gecmis, simdi))
    .sort((a, b) => b.oncelik - a.oncelik)
    .slice(0, kalan)
    .map((kr) => ({
      kod: kr.kod,
      ruh: kr.ruh,
      mesaj: kr.mesaj(baglam),
      eylem: kr.eylem?.(baglam),
    }));
}

/** Gösterilen her mesaj kalem_olaylari'na yazılır — hangisi işe yarıyor ölçülsün. */
export function olayKaydiOlustur(profilId, olay) {
  return {
    profil_id: profilId,
    tetikleyici: olay.kod,
    kural_kodu: olay.kod,
    ruh: olay.ruh,
    mesaj: olay.mesaj,
  };
}
