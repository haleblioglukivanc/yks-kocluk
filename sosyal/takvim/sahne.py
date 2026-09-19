"""Her güne sahne yönü atar: kurgu, zemin, çizim, vurgu kelimesi (ve dev tipografide sayı).

    python3 sosyal/takvim/sahne.py          # sahne.json'u yeniden kurar

Kurallar
- Seri içeriği belirler, kurgu sahneyi: her serinin 2-3 uygun kurgusu var, haftadan haftaya döner.
- Art arda iki gün aynı kurgu ya da aynı zemin gelmez.
- Çizim, başlık + kancadaki anahtar kelimelerden seçilir; son 10 günde kullanılan çizim tekrar edilmez.
- Hassas günlere sahne yönü yazılmaz: sade kartla (Gunluk) üretilir.
- "elle": true olan günlere dokunulmaz (elle yönetilmiş günler).
"""
import json, pathlib, re, sys, zlib

KOK = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(KOK))
from govde import GOVDE  # noqa: E402

PLAN = json.loads((KOK / 'yillik-plan.json').read_text(encoding='utf-8'))
YOL = KOK / 'sahne.json'
ESKI = json.loads(YOL.read_text(encoding='utf-8')) if YOL.exists() else {}

# Seriye uygun kurgular (sırayla döner). 'dev' yalnız kancada sayı varsa seçilir.
KURGU = {
    'Haftanın Planı': ['dev', 'metafor', 'masa'],
    'Ders Taktiği': ['metafor', 'dev', 'masa'],
    'Aynı Hafta': ['yazisma', 'yazisma', 'metafor'],
    'Veli Köşesi': ['masa', 'metafor'],
    'Doğru Bilinen Yanlışlar': ['bolunmus', 'bolunmus', 'metafor'],
    'Deneme Günü': ['harita', 'metafor', 'dev', 'masa'],
    'Sınav Psikolojisi': ['metafor'],
    'Özel Gün': ['metafor', 'dev'],
    'Gündem': ['metafor'],
}
# Kurguya uygun zeminler (okunurluk için: telefonun içi krem, notlar pastel, patikanın izi krem)
ZEMIN = {
    'metafor': ['krem', 'murekkep', 'nane', 'gok', 'seftali', 'kum'],
    'dev': ['murekkep', 'krem', 'gok', 'nane'],
    'yazisma': ['seftali', 'gok', 'nane', 'kum'],
    'masa': ['kum', 'krem', 'gok'],
    'harita': ['gok', 'nane', 'seftali'],
    'bolunmus': ['seftali'],          # ikiye bölünmüş: üst şeftali, alt nane — sabit
}
# Çizim ← anahtar kelimeler (küçük harf, kök). Yukarıdakiler daha özgül, önce denenir.
CIZIM = [
    ('bayrak', ['cumhuriyet', '19 mayıs', '23 nisan', '15 temmuz', 'zafer bayramı', '29 ekim']),
    ('kar-tanesi', ['kış', 'yılbaşı', 'soğuk', 'en uzun gece']),
    ('yaprak', ['mevsim', 'sonbahar']),
    ('gunes', ['bayram', 'bahar', 'yaz planı', 'yaz denemesi', 'tatil', 'güneş', 'ışık', 'iyi ki']),
    ('ay-bulut', ['uyku', 'uyu', 'gece', 'yatmadan', 'akşam', 'karanlık']),
    ('telefon-kilit', ['telefon', 'ekran', 'sosyal medya']),
    ('optik', ['optik', 'kodlama']),
    ('kum-saati', ["yks'ye", 'gün kal', 'son ay', 'son hafta', 'son 100', 'yaklaşırken', 'son denemeler', 'son pazar']),
    ('kronometre', ['dakika', 'süre', 'saniye', 'hız', 'blok', 'saat']),
    ('kulaklik', ['müzik', 'gürültü', 'sessiz']),
    ('terazi', ['kıyas', 'denge', 'karşılaştır', 'kardeş']),
    ('tabela', ['karar', 'dershane', 'okul mu']),
    ('pusula', ['tercih', 'hedefimi', 'yön', 'neden başladın']),
    ('hedef-tahtasi', ['hedef', 'strateji', 'tahmin']),
    ('grafik-cubuk', ['net', 'grafik', 'analiz', 'sonuç', 'puan']),
    ('bulut-yagmur', ['kaygı', 'kötü', 'stres', 'düştüm', 'korku', 'panik', 'başaramazsam', 'başarısız']),
    ('pil', ['yorgun', 'enerji', 'tüken', 'pes', 'motivasyonum yok', 'bıraktım']),
    ('dugum', ['karışık', 'takıldı', 'dağıl', 'dalıyorum', 'anlamadım']),
    ('kalp-atisi', ['beden', 'sağlık', 'hastalan', 'beslen', 'kafein']),
    ('kahve', ['sabah', 'mola', 'kalk', 'dinlen']),
    ('zarf', ['mektup', 'teşekkür', 'iletişim', 'öğretmen', 'konuşma']),
    ('ev-kalp', ['aile', 'anne', 'baba', 'veli', 'ev içi', 'evde']),
    ('ayna', ['kendine', 'kendi', 'değer', 'güven', 'affet']),
    ('kavanoz-yildiz', ['zafer', 'gurur', 'ödül', 'övgü', 'iyi şey', 'yükseldim']),
    ('kalem-silgi', ['yanlış', 'hata', 'kalem', 'silgi', 'boş bırak']),
    ('kitap-yigini', ['kaynak', 'kitap', 'soru bankası', 'özet', 'ezber', 'formül', 'konu anlatımı', 'tekrar']),
    ('buyutec-kitap', ['paragraf', 'soru kökü', 'okuma', 'tuzak', 'dikkat', 'anlam']),
    ('merdiven', ['yavaş', 'adım', 'küçük', 'ilerle', 'minimum', 'kolay']),
    ('damla', ['her gün', 'damla', 'birik', 'düzen', 'istikrar', 'sabır']),
    ('takvim', ['takvim', 'program', 'plan', 'hafta', 'rutin']),
    ('filiz', ['yeni', 'başla', 'ilk', 'umut', 'başlangıç']),
    ('roket', ['motivasyon', 'hızlan']),
    ('dusunce-balonu', ['hissi', 'düşün', 'iç ses', 'hissediyorum']),
]
# Hiçbir kelime tutmazsa seriye göre yedek havuz
YEDEK = {
    'Haftanın Planı': ['takvim', 'merdiven', 'hedef-tahtasi', 'damla'],
    'Ders Taktiği': ['ampul', 'buyutec-kitap', 'kitap-yigini', 'kronometre'],
    'Aynı Hafta': ['dusunce-balonu', 'zarf', 'ayna'],
    'Veli Köşesi': ['ev-kalp', 'zarf', 'terazi'],
    'Doğru Bilinen Yanlışlar': ['dugum', 'ampul', 'tabela'],
    'Deneme Günü': ['grafik-cubuk', 'optik', 'hedef-tahtasi', 'kronometre'],
    'Sınav Psikolojisi': ['dusunce-balonu', 'kavanoz-yildiz', 'filiz', 'ayna', 'bulut-yagmur'],
    'Özel Gün': ['gunes', 'kavanoz-yildiz', 'filiz'],
    'Gündem': ['ampul', 'dusunce-balonu'],
}
SAYI_KELIME = {'iki': 2, 'üç': 3, 'dört': 4, 'beş': 5, 'altı': 6, 'yedi': 7, 'sekiz': 8, 'dokuz': 9, 'on': 10,
               'yirmi': 20, 'otuz': 30, 'kırk': 40, 'elli': 50, 'yüz': 100}
DOLGU = {'ve', 'ile', 'için', 'ama', 'çünkü', 'değil', 'daha', 'bile', 'sadece', 'şimdi', 'hiçbir', 'hepsi', 'bunu', 'yerine',
         'nasıl', 'neden', 'hocam', 'sence', 'bence', 'tane', 'şeyi', 'şeyin',
         'şunu', 'olmaz', 'olur', 'yapma', 'gibi', 'kadar', 'sonra', 'önce', 'yarın', 'bugün', 'hafta', 'olsun', 'olmazsa'}


def kucuk(t):
    return t.replace('I', 'ı').replace('İ', 'i').lower()


def tohum(*p):
    return zlib.crc32('|'.join(map(str, p)).encode())


def sayi_bul(kanca):
    """Dev tipografi için: kancadaki sayı + ardından gelen kelime. Sıra sayıları (8. sınıf) sayılmaz."""
    kel = kanca.split()
    for i, k in enumerate(kel):
        yalin = re.sub(r"[^\wçğıöşüÇĞİÖŞÜ']", '', k)
        deger = None
        if re.fullmatch(r'\d{1,3}', yalin) and not k.endswith('.'):
            deger = yalin
        elif kucuk(yalin) in SAYI_KELIME:
            deger = str(SAYI_KELIME[kucuk(yalin)])
        if deger and i + 1 < len(kel):
            ek = re.sub(r'[^\wçğıöşüÇĞİÖŞÜ]', '', kel[i + 1])
            if 2 <= len(ek) <= 10:
                cumleler = re.split(r'(?<=[.?!])\s+', kanca)
                ust = ' '.join(c for c in cumleler if k not in c.split()) or ''
                return {'sayi': deger, 'ek': ek + '.', 'ust': ust}
    return None


def vurgu_bul(kanca):
    """Vurgu: cümlenin son parçasındaki (vurucu kısım) en dolu kelime; yoksa bütün kancadaki."""
    def uygun(parca):
        k = [re.sub(r"[^\wçğıöşüÇĞİÖŞÜ']", '', x) for x in parca.split()]
        return [x for x in k if len(x) >= 4 and kucuk(x) not in DOLGU and not x.isdigit()]
    parcalar = [x for x in re.split(r'[.,?!:;]', kanca) if uygun(x)]
    adaylar = uygun(parcalar[-1]) if parcalar else []
    return max(adaylar, key=len) if adaylar else None


def cizim_sec(g, son):
    # Kelimeler kelime başından eşleşir: "çakışınca" içindeki "kış" sayılmaz
    metin = ' ' + re.sub(r"[^\wçğıöşü' ]", ' ', kucuk(f"{g['baslik']} {g['kanca']}")) + ' '
    if 'tabela' not in son and len(re.findall(r' m[iı] ', metin)) >= 2:      # "X mi, Y mi?" = iki yol
        return 'tabela'
    for ad, kelimeler in CIZIM:
        if ad not in son and any(' ' + k.strip() in metin for k in kelimeler):
            return ad
    havuz = [c for c in YEDEK.get(g['seri'], ['ampul']) if c not in son] or YEDEK.get(g['seri'], ['ampul'])
    return havuz[tohum(g['tarih']) % len(havuz)]


def kur():
    cikti, onceki_kurgu, onceki_zemin, son_cizim = {'_not': ESKI.get('_not', '')}, None, None, []
    for n, g in enumerate(PLAN):
        t = g['tarih']
        if ESKI.get(t, {}).get('elle'):
            s = ESKI[t]
            s.setdefault('vurgu', vurgu_bul(g['kanca']))
            cikti[t], onceki_kurgu = s, s['kurgu']
            onceki_zemin = {'seftali', 'nane'} if s['kurgu'] == 'bolunmus' else {s['zemin']}
            son_cizim = (son_cizim + [s.get('cizim')])[-10:]
            continue
        if g['hassas'] or g['baslik'] not in GOVDE:
            onceki_kurgu = onceki_zemin = None
            continue
        hafta = n // 7
        sayi = sayi_bul(g['kanca'])
        secenek = [k for k in KURGU.get(g['seri'], ['metafor']) if k != 'dev' or sayi]
        sira = secenek[hafta % len(secenek):] + secenek[:hafta % len(secenek)]
        kurgu = next((k for k in sira if k != onceki_kurgu), 'metafor' if onceki_kurgu != 'metafor' else 'masa')
        yasak = set(onceki_zemin or ())
        if n + 1 < len(PLAN) and PLAN[n + 1]['seri'] == 'Doğru Bilinen Yanlışlar':
            yasak |= {'seftali', 'nane'}                  # ertesi gün ikiye bölünmüş (şeftali/nane) gelebilir
        izinli = [z for z in ZEMIN[kurgu] if z not in yasak] or ZEMIN[kurgu]
        if kurgu == 'bolunmus':
            zemin = 'seftali'
        else:
            zemin = izinli[tohum(t, 'zemin') % len(izinli)]
        cizim = cizim_sec(g, son_cizim)
        s = {'kurgu': kurgu, 'zemin': zemin, 'cizim': cizim}
        if kurgu == 'dev':
            s.update(sayi)
        else:
            kanca = re.sub(r'^[^:]*veli[^:]*:\s*', '', g['kanca'], flags=re.I) if kurgu == 'masa' else g['kanca']
            if kurgu == 'bolunmus':
                m = re.match(r"^[‘'\"“](.+?)[’'\"”]\s*(.*)$", g['kanca'])
                kanca = m.group(2) if m else g['kanca']
            v = vurgu_bul(kanca)
            if v:
                s['vurgu'] = v
        cikti[t] = s
        onceki_kurgu, onceki_zemin = kurgu, ({'seftali', 'nane'} if kurgu == 'bolunmus' else {zemin})
        son_cizim = (son_cizim + [cizim])[-10:]
    YOL.write_text(json.dumps(cikti, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    return cikti


if __name__ == '__main__':
    c = kur()
    from collections import Counter
    gunler = [v for k, v in c.items() if not k.startswith('_')]
    print(len(gunler), 'gün ·', dict(Counter(v['kurgu'] for v in gunler)))
    print('zemin:', dict(Counter(v['zemin'] for v in gunler)))
    print('çizim:', len(set(v.get('cizim') for v in gunler)), 'farklı ·', Counter(v.get('cizim') for v in gunler).most_common(6))
