"""Gelen yorum/mesajı kategoriye ayırır ve yanıt taslağı üretir.

Kriz ve istismar kelime kurallarıyla yakalanır (yapay zekâya bırakılmaz).
Diğerleri için taslak yapay zekâdan gelir; Cloudflare Workers AI anahtarı
(CF_ACCOUNT_ID, CF_AI_TOKEN) yoksa şablon taslak kullanılır.

    python3 sosyal/yanit/siniflandir.py "Hocam fiyatlar ne kadar?"
    python3 sosyal/yanit/siniflandir.py --ornek      # örnek mesajlarla dener
"""
import json, os, re, sys, urllib.request

IMZA = '— KH ekibi'
SITE = 'khkocluk.com'

KURAL = [  # (kategori, desenler) — sıra önemli: ilk eşleşen kazanır
 ('kriz', [r'intihar', r'kendimi öldür', r'ölmek ist', r'yaşamak ist(e)?miyorum', r'kendime zarar', r'canıma kıy',
           r'bilek(lerimi)?\s*kes', r'her şeyi bitir', r'artık yaşa', r'yok olmak ist', r'beni kimse özlemez']),
 ('istismar', [r'taciz', r'istismar', r'beni dövüyor', r'dövüyorlar', r'bana dokunuyor', r'zorla', r'tehdit ediyor']),
 ('hakaret', [r'\bspam\b', r'takip(e)? takip', r'\b(salak|aptal|gerizekalı)\b', r'bit\.ly', r'kazanç fırsatı']),
 ('bilgi', [r'fiyat', r'ücret', r'kaç para', r'ne kadar', r'randevu', r'kayıt', r'nasıl başvur', r'iletişim',
            r'numara', r'online mı', r'yüz yüze', r'görüşme']),
 ('psikoloji', [r'kaygı', r'stres', r'panik', r'uyuyamıyorum', r'ağlıyorum', r'motivasyon', r'bıktım', r'yoruldum',
                r'depres', r'mutsuz', r'yalnız', r'baskı', r'korkuyorum']),
 ('net', [r'^\s*\d{1,3}([.,]\d{1,2})?\s*(net)?\s*[!.]*\s*$', r'\bnet(im)?\b.*\d', r'\d+\s*net']),
 ('ders', [r'nasıl çöz', r'anlamadım', r'konu', r'soru', r'türev', r'paragraf', r'fizik', r'kimya', r'matematik', r'geometri']),
 ('tesekkur', [r'teşekkür', r'sağol', r'harika', r'süper', r'çok iyi', r'eline sağlık', r'❤|👏|🙏']),
]

SABIT = {
 'kriz': ('Bunu yazdığın için teşekkür ederim, şu an yalnız değilsin. Lütfen hemen güvendiğin bir yetişkine '
          '(ailen, öğretmenin, rehber öğretmenin) anlat. Kendini güvende hissetmiyorsan 112\'yi ara. '
          f'Sana buradan da ulaşacağız. {IMZA}'),
 'istismar': ('Bunu anlatman çok değerli ve cesurca. Güvendiğin bir yetişkine hemen anlat. Acil bir durumda 112\'yi, '
              f'destek için ALO 183\'ü arayabilirsin. Sana buradan da ulaşacağız. {IMZA}'),
 'bilgi': (f'Merhaba! İlk adım 30 dakikalık ücretsiz tanışma görüşmesi. '
           f'Ayrıntılar ve randevu için: {SITE} {IMZA}'),
}
SABLON = {
 'tesekkur': f'Çok teşekkür ederiz, yarın yeni bir video var. {IMZA}',
 'net': f'Kaydettik! Bir sonraki denemede hedef +2 net, fazlası değil. {IMZA}',
 'ders': f'Güzel soru! Bu konunun taktiği yakında videoda; takipte kal. Beklemek istemezsen: {SITE} {IMZA}',
 'psikoloji': (f'Bunu hissetmen çok normal, yalnız değilsin. Bugün küçük tek bir iş seç, gerisini yarına bırak. '
               f'Uzun sürerse okulundaki rehber öğretmenle konuşmak iyi gelir. {IMZA}'),
 'diger': f'Yorumun için teşekkürler! {IMZA}',
}
BILDIRIM = {'kriz', 'istismar'}      # Kıvanç'a anında haber
YANITSIZ = {'hakaret'}

SISTEM = f"""Sen Kıvanç Hoca ile Eğitim Koçluğu'nun sosyal medya yanıt asistanısın. YKS/LGS öğrencilerine ve velilerine
Türkçe, sıcak, kısa (en fazla 3 cümle) yanıt taslağı yazarsın. Öğrenciye "sen", veliye "siz" dersin.
Kurallar: psikolojik değerlendirme, tanı, tedavi, ilaç konuşmazsın; net/puan garantisi vermezsin; kişisel bilgi
istemezsin; uzun ders anlatmazsın, tek ipucu verirsin; gerekirse {SITE} adresine yönlendirirsin.
Kaygı ve stres konularında genel destek verir, sürerse okul rehber öğretmenine yönlendirirsin.
Yanıtın sonuna "{IMZA}" yaz. Yalnız yanıt metnini döndür."""


def kategori(metin):
    m = metin.lower()
    for k, desenler in KURAL:
        if any(re.search(d, m) for d in desenler):
            return k
    return 'diger'


def yapay_zeka(metin, kat):
    hesap, anahtar = os.environ.get('CF_ACCOUNT_ID'), os.environ.get('CF_AI_TOKEN')
    if not (hesap and anahtar):
        return None
    url = f'https://api.cloudflare.com/client/v4/accounts/{hesap}/ai/run/@cf/meta/llama-3.3-70b-instruct-fp8-fast'
    veri = {'messages': [{'role': 'system', 'content': SISTEM},
                         {'role': 'user', 'content': f'Kategori: {kat}\nGelen mesaj: {metin}'}], 'max_tokens': 220}
    r = urllib.request.Request(url, data=json.dumps(veri).encode(), method='POST',
        headers={'Authorization': f'Bearer {anahtar}', 'Content-Type': 'application/json'})
    with urllib.request.urlopen(r, timeout=60) as c:
        return json.loads(c.read())['result']['response'].strip()


def taslak(metin):
    kat = kategori(metin)
    if kat in YANITSIZ:
        return {'kategori': kat, 'taslak': None, 'bildirim': False, 'kaynak': 'yanıt yok (gizle önerisi)'}
    if kat in SABIT:
        return {'kategori': kat, 'taslak': SABIT[kat], 'bildirim': kat in BILDIRIM, 'kaynak': 'sabit'}
    yz = yapay_zeka(metin, kat)
    return {'kategori': kat, 'taslak': yz or SABLON[kat], 'bildirim': False, 'kaynak': 'yapay zekâ' if yz else 'şablon'}


ORNEK = [
 'Hocam fiyatlarınız ne kadar, online mı?', '87 net', 'Harika video, teşekkürler 🙏',
 'Paragrafta hep süre yetmiyor ne yapmalıyım', 'Çok stresliyim, hiçbir şey yetişmeyecek gibi',
 'Artık yaşamak istemiyorum', 'Takip et takip edeyim bit.ly/xyz', 'Babam beni dövüyor',
 'Türevi hiç anlamadım', 'Kızım LGS\'ye hazırlanıyor, nasıl başvururuz?',
]

if __name__ == '__main__':
    if '--ornek' in sys.argv:
        for m in ORNEK:
            t = taslak(m)
            print(f"[{t['kategori']:<9}] {'🔔 ' if t['bildirim'] else ''}{m}\n    → ({t['kaynak']}) {t['taslak']}\n")
    else:
        print(json.dumps(taslak(' '.join(sys.argv[1:])), ensure_ascii=False, indent=2))
