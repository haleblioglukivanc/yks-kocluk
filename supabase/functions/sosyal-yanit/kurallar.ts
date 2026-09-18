// Kategori kuralları ve sabit yanıtlar — sosyal/yanit/siniflandir.py ile aynı.
// Kriz ve istismar kelime kurallarıyla yakalanır; yapay zekâya bırakılmaz.
export const IMZA = '— KH ekibi'
export const SITE = 'khkocluk.com'

const KURAL: [string, RegExp[]][] = [
  ['kriz', [/intihar/, /kendimi öldür/, /ölmek ist/, /yaşamak ist(e)?miyorum/, /kendime zarar/, /canıma kıy/,
    /bilek(lerimi)?\s*kes/, /her şeyi bitir/, /artık yaşa/, /yok olmak ist/, /beni kimse özlemez/]],
  ['istismar', [/taciz/, /istismar/, /beni dövüyor/, /dövüyorlar/, /bana dokunuyor/, /zorla/, /tehdit ediyor/]],
  ['hakaret', [/\bspam\b/, /takip(e)? takip/, /\b(salak|aptal|gerizekalı)\b/, /bit\.ly/, /kazanç fırsatı/]],
  ['bilgi', [/fiyat/, /ücret/, /kaç para/, /ne kadar/, /randevu/, /kayıt/, /nasıl başvur/, /iletişim/, /numara/,
    /online mı/, /yüz yüze/, /görüşme/]],
  ['psikoloji', [/kaygı/, /stres/, /panik/, /uyuyamıyorum/, /ağlıyorum/, /motivasyon/, /bıktım/, /yoruldum/,
    /depres/, /mutsuz/, /yalnız/, /baskı/, /korkuyorum/]],
  ['net', [/^\s*\d{1,3}([.,]\d{1,2})?\s*(net)?\s*[!.]*\s*$/, /\bnet(im)?\b.*\d/, /\d+\s*net/]],
  ['ders', [/nasıl çöz/, /anlamadım/, /konu/, /soru/, /türev/, /paragraf/, /fizik/, /kimya/, /matematik/, /geometri/]],
  ['tesekkur', [/teşekkür/, /sağol/, /harika/, /süper/, /çok iyi/, /eline sağlık/, /❤|👏|🙏/]],
]

export const SABIT: Record<string, string> = {
  kriz: 'Bunu yazdığın için teşekkür ederim, şu an yalnız değilsin. Lütfen hemen güvendiğin bir yetişkine ' +
    "(ailen, öğretmenin, rehber öğretmenin) anlat. Kendini güvende hissetmiyorsan 112'yi ara. " +
    `Sana buradan da ulaşacağız. ${IMZA}`,
  istismar: "Bunu anlatman çok değerli ve cesurca. Güvendiğin bir yetişkine hemen anlat. Acil bir durumda 112'yi, " +
    `destek için ALO 183'ü arayabilirsin. Sana buradan da ulaşacağız. ${IMZA}`,
  bilgi: `Merhaba! İlk adım 30 dakikalık ücretsiz tanışma görüşmesi. Ayrıntılar ve randevu için: ${SITE} ${IMZA}`,
}
export const SABLON: Record<string, string> = {
  tesekkur: `Çok teşekkür ederiz, yarın yeni bir video var. ${IMZA}`,
  net: `Kaydettik! Bir sonraki denemede hedef +2 net, fazlası değil. ${IMZA}`,
  ders: `Güzel soru! Bu konunun taktiği yakında videoda; takipte kal. Beklemek istemezsen: ${SITE} ${IMZA}`,
  psikoloji: 'Bunu hissetmen çok normal, yalnız değilsin. Bugün küçük tek bir iş seç, gerisini yarına bırak. ' +
    `Uzun sürerse okulundaki rehber öğretmenle konuşmak iyi gelir. ${IMZA}`,
  diger: `Yorumun için teşekkürler! ${IMZA}`,
}
export const BILDIRIM = new Set(['kriz', 'istismar'])
export const YANITSIZ = new Set(['hakaret'])

export const SISTEM = `Sen Kıvanç Hoca ile Eğitim Koçluğu'nun sosyal medya yanıt asistanısın. YKS/LGS öğrencilerine ve velilerine
Türkçe, sıcak, kısa (en fazla 3 cümle) yanıt taslağı yazarsın. Öğrenciye "sen", veliye "siz" dersin.
Kurallar: psikolojik değerlendirme, tanı, tedavi, ilaç konuşmazsın; net/puan garantisi vermezsin; kişisel bilgi
istemezsin; uzun ders anlatmazsın, tek ipucu verirsin; gerekirse ${SITE} adresine yönlendirirsin.
Kaygı ve stres konularında genel destek verir, sürerse okul rehber öğretmenine yönlendirirsin.
Kendini Kıvanç ya da psikolojik danışman olarak tanıtmazsın. Yanıtın sonuna "${IMZA}" yaz. Yalnız yanıt metnini döndür.`

export function kategori(metin: string): string {
  const m = metin.toLocaleLowerCase('tr-TR')
  for (const [k, desenler] of KURAL) if (desenler.some((d) => d.test(m))) return k
  return 'diger'
}
