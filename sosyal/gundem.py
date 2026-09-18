"""Gündem taraması: eğitim ve öğrenci psikolojisiyle ilgili haftanın konuları.

Google Haberler (son 7 gün) ve Google Trends Türkiye'yi okur, konuları puanlar,
hassas olanları (ölüm, afet, şiddet) işaretler ve bir GitHub konusu (issue) açar.
Hiçbir şey otomatik yayınlanmaz: onaylanan konu sosyal/takvim/gundem.json'a
{"tarih", "baslik", "kanca", "govde": [3 satır], "onay": true} olarak yazılır ve
o günün videosu takvimdeki konunun yerine bunu kullanır.

    python3 sosyal/gundem.py            # raporu ekrana yazar
    python3 sosyal/gundem.py --issue    # GitHub konusu açar (Actions içinde)
"""
import json, os, re, sys, urllib.parse, urllib.request, xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime

TR = timezone(timedelta(hours=3))
ARAMALAR = {
    'Sınav ve okul': 'YKS OR LGS OR ÖSYM OR "Milli Eğitim" OR MEB OR karne OR "ara tatil" OR tercih',
    'Öğrenci psikolojisi': '"sınav kaygısı" OR "öğrenci psikolojisi" OR ergenlik OR "akran zorbalığı" OR "ekran süresi" OR "rehber öğretmen"',
    'Gençlik ve dijital': '"sosyal medya" öğrenci OR "yapay zeka" öğrenci OR "telefon yasağı" okul',
}
ANAHTAR = ['yks', 'lgs', 'ösym', 'meb', 'sınav', 'okul', 'öğrenci', 'tercih', 'karne', 'tatil', 'deneme', 'üniversite',
           'kaygı', 'stres', 'psikoloji', 'ergenlik', 'ergenler', 'rehberlik', 'zorbalık', 'telefon', 'sosyal medya', 'yapay zeka',
           'uyku', 'motivasyon', 'burs', 'kyk', 'müfredat', 'maarif']
# Kelime başında eşleşir: 'kaza' → kaza, kazası, kazada ama 'kazandı' değil
HASSAS = [r'öldü', r'ölüm', r'hayatını kaybet', r'yaşamını yitir', r'intihar', r'deprem', r'saldırı', r'cinayet',
          r'kaza(sı|da|ya|lar)?\b', r'yaralan', r'yaralı', r'istismar', r'şehit', r'yangın', r'sel(de|den)?\b',
          r'patlama', r'vefat', r'taciz', r'bıçak']


def oku(url):
    r = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(r, timeout=30) as c:
        return ET.fromstring(c.read())


def haberler():
    sonuc = []
    for grup, q in ARAMALAR.items():
        url = 'https://news.google.com/rss/search?' + urllib.parse.urlencode(
            {'q': q + ' when:7d', 'hl': 'tr', 'gl': 'TR', 'ceid': 'TR:tr'})
        for it in oku(url).findall('.//item'):
            baslik = it.findtext('title') or ''
            kaynak = baslik.rsplit(' - ', 1)[-1] if ' - ' in baslik else ''
            sonuc.append({'grup': grup, 'baslik': baslik.rsplit(' - ', 1)[0], 'kaynak': kaynak,
                          'link': it.findtext('link'), 'tarih': parsedate_to_datetime(it.findtext('pubDate')).astimezone(TR)})
    return sonuc


def trendler():
    ns = {'ht': 'https://trends.google.com/trending/rss'}
    out = []
    for it in oku('https://trends.google.com/trending/rss?geo=TR').findall('.//item'):
        haber = [n.findtext('ht:news_item_title', namespaces=ns) or '' for n in it.findall('ht:news_item', ns)]
        out.append({'terim': it.findtext('title'), 'trafik': it.findtext('ht:approx_traffic', namespaces=ns), 'haber': haber})
    return out


def puanla(metin):
    m = metin.lower()
    return (sum(1 for a in ANAHTAR if re.search(r'\b' + re.escape(a), m)),
            any(re.search(r'\b' + h, m) for h in HASSAS))


def konu_kumele(liste):
    """Aynı olayı anlatan başlıkları kaba bir benzerlikle birleştirir."""
    kume = []
    for h in sorted(liste, key=lambda x: x['tarih'], reverse=True):
        kel = set(re.findall(r'\w{4,}', h['baslik'].lower()))
        for k in kume:
            if len(kel & k['kel']) >= 3:
                k['adet'] += 1; k['kaynaklar'].add(h['kaynak']); break
        else:
            kume.append({**h, 'kel': kel, 'adet': 1, 'kaynaklar': {h['kaynak']}})
    return kume


def rapor():
    simdi = datetime.now(TR)
    kume = konu_kumele(haberler())
    for k in kume:
        k['puan'], k['hassas'] = puanla(k['baslik'])
        k['skor'] = k['puan'] * 2 + k['adet'] - (simdi - k['tarih']).days * 0.3
    kume = [k for k in kume if k['puan'] > 0]
    kume.sort(key=lambda k: k['skor'], reverse=True)
    trend = [t for t in trendler() if puanla(t['terim'] + ' ' + ' '.join(t['haber'][:2]))[0] >= 2]

    s = [f"## Gündem taraması · {simdi:%d.%m.%Y %H:%M}", '',
         'Aşağıdakiler **öneri**dir; hiçbiri kendiliğinden yayınlanmaz. Uygun olanı seçip',
         '`sosyal/takvim/gundem.json` dosyasına tarih ve metinle ekleyin (ya da Claude ile sohbette “şunu yap” deyin).',
         '⚠️ işaretli konular hassastır (ölüm, afet, şiddet): eğitim içeriğine çevrilmez, en fazla sade bir anma kartı.', '']
    s.append('### Google Trends Türkiye (bugün, eğitimle ilgili olanlar)')
    s += [f"- **{t['terim']}** ({t['trafik']}) — {t['haber'][0] if t['haber'] else ''}" for t in trend] or ['- Bugün eğitimle ilgili trend arama yok.']
    s.append('')
    for grup in ARAMALAR:
        s.append(f'### {grup} (son 7 gün)')
        g = [k for k in kume if k['grup'] == grup][:8]
        s += [f"- {'⚠️ ' if k['hassas'] else ''}[{k['baslik']}]({k['link']}) · {', '.join(sorted(x for x in k['kaynaklar'] if x))[:60]}"
              f" · {k['tarih']:%d.%m} · {k['adet']} haber" for k in g] or ['- Kayda değer bir şey yok.']
        s.append('')
    return '\n'.join(s)


def issue_ac(govde):
    repo, token = os.environ['GITHUB_REPOSITORY'], os.environ['GITHUB_TOKEN']
    veri = {'title': f"Gündem önerileri · {datetime.now(TR):%d.%m.%Y}", 'body': govde, 'labels': ['gündem']}
    r = urllib.request.Request(f'https://api.github.com/repos/{repo}/issues', method='POST', data=json.dumps(veri).encode(),
        headers={'Authorization': f'Bearer {token}', 'Accept': 'application/vnd.github+json'})
    with urllib.request.urlopen(r, timeout=30) as c:
        print('Konu açıldı:', json.loads(c.read())['html_url'])


if __name__ == '__main__':
    metin = rapor()
    print(metin)
    if '--issue' in sys.argv:
        issue_ac(metin)
