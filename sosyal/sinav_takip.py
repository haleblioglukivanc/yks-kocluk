"""Sınav tarihlerini resmi kaynaktan izler ve takvimi kendiliğinden düzenler.

- YKS: ÖSYM sınav takvimi sayfası okunur. O yılın YKS tarihleri (TYT, AYT, başvuru,
  sonuç) yayınlandığında takvim/sinavlar.json güncellenir, 'kesin' olarak işaretlenir
  ve takvim yeniden kurulur: geri sayım günleri (200/150/100/50/30/10), sınav günleri,
  sonuç ve tercih günleri, sınava göre yerleşen konular yeni tarihe kayar.
- LGS: MEB'in ayrı bir takvim sayfası yok; haber başlıklarında tarih aranır ve yalnız
  ÖNERİ olarak raporlanır (resmî duyuru görülmeden takvim değiştirilmez).

    python3 sosyal/sinav_takip.py            # kontrol et, değiştiyse uygula
    python3 sosyal/sinav_takip.py --yil 2026 # ayrıştırıcıyı geçmiş yılla dene (dosyaya yazmaz)
"""
import html, json, os, pathlib, re, subprocess, sys, urllib.parse, urllib.request, xml.etree.ElementTree as ET
from datetime import date, datetime

KOK = pathlib.Path(__file__).resolve().parent
DOSYA = KOK / 'takvim' / 'sinavlar.json'
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
      'Accept-Language': 'tr'}


def al(url):
    for _ in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as c:
                v = c.read()
                if len(v) > 5000:
                    return v.decode('utf-8', 'ignore')
        except Exception:
            pass
    return ''


def tr_tarih(t):
    g, a, y = t.split('.')
    return f'{y}-{a}-{g}'


def osym_yks(yil):
    s = al('https://www.osym.gov.tr/Sayfa/SinavTakvimi')
    if not s:
        return None, 'ÖSYM sayfası okunamadı'
    t = re.sub(r'<script.*?</script>|<style.*?</style>', '', s, flags=re.S)
    t = html.unescape(re.sub(r'<[^>]+>', ' | ', t))
    t = re.sub(r'(\s*\|\s*)+', ' | ', t)
    t = re.sub(r'\s+', ' ', t)
    D = r'(\d\d\.\d\d\.\d{4})'
    ara = lambda d: re.search(d, t)
    tyt = ara(rf'{yil}-YKS 1\. Oturum \(TYT\) \| Sınav Tarihi: \| {D}')
    if not tyt:
        return None, f'{yil}-YKS henüz ÖSYM takviminde yok'
    ayt = ara(rf'{yil}-YKS 2\. Oturum \(AYT\) \| Sınav Tarihi: \| {D}')
    bas = ara(rf'{yil}-YKS 1\. Oturum \(TYT\) \| Başvuru Tarihi: \| {D} \| {D}')
    son = ara(rf'{yil}-YKS 1\. Oturum \(TYT\) \| Sonuç Tarihi: \| {D}')
    v = {'tyt': tr_tarih(tyt.group(1))}
    if ayt: v['ayt'] = tr_tarih(ayt.group(1))
    if bas: v['basvuru_bas'], v['basvuru_bit'] = tr_tarih(bas.group(1)), tr_tarih(bas.group(2))
    if son: v['sonuc'] = tr_tarih(son.group(1))
    return v, 'ÖSYM sınav takvimi'


def lgs_haber(yil):
    url = 'https://news.google.com/rss/search?' + urllib.parse.urlencode(
        {'q': f'LGS {yil} tarihi', 'hl': 'tr', 'gl': 'TR', 'ceid': 'TR:tr'})
    s = al(url)
    if not s:
        return None, []
    aylar = {'Haziran': 6, 'Mayıs': 5, 'Temmuz': 7}
    sayac, ornek = {}, []
    for it in ET.fromstring(s).findall('.//item'):
        b = it.findtext('title') or ''
        if 'LGS' not in b or 'tahmin' in b.lower() or 'beklen' in b.lower():
            continue
        m = re.search(rf'(\d{{1,2}})\s+(Haziran|Mayıs|Temmuz)\s+{yil}', b)
        if m:
            t = date(yil, aylar[m.group(2)], int(m.group(1))).isoformat()
            sayac[t] = sayac.get(t, 0) + 1
            ornek.append(b)
    if not sayac:
        return None, []
    en = max(sayac, key=sayac.get)
    return (en if sayac[en] >= 3 else None), ornek[:5]


def main():
    cikti = os.environ.get('GITHUB_OUTPUT')
    veri = json.loads(DOSYA.read_text(encoding='utf-8'))
    yil = int(veri['yks']['tyt'][:4])
    if '--yil' in sys.argv:
        yil = int(sys.argv[sys.argv.index('--yil') + 1])
        print(yil, osym_yks(yil)); print('LGS haber:', lgs_haber(yil)); return

    rapor, degisti = [], False
    yks, kaynak = osym_yks(yil)
    if yks:
        eski = {k: veri['yks'].get(k) for k in yks}
        if yks != eski or not veri['yks']['kesin']:
            veri['yks'].update(yks)
            veri['yks']['kesin'] = True
            veri['yks']['kaynak'] = f'{kaynak} ({datetime.now():%d.%m.%Y} tarihinde okundu)'
            degisti = True
            rapor.append(f'**{yil}-YKS tarihleri ÖSYM takviminde yayınlandı; takvim buna göre yeniden kuruldu.**\n')
            rapor += [f'- {k}: {eski.get(k) or "—"} → **{v}**' for k, v in yks.items()]
    else:
        print(kaynak)

    lgs, ornek = lgs_haber(yil)
    if lgs and lgs != veri['lgs']['tarih']:
        rapor.append(f'\n**LGS için haberlerde {lgs} tarihi geçiyor** (şu an takvimde: {veri["lgs"]["tarih"]}, '
                     f'{"kesin" if veri["lgs"]["kesin"] else "tahmin"}). MEB duyurusunu kontrol edip onaylarsanız güncellenir.')
        rapor += [f'  - {b}' for b in ornek]

    if degisti:
        eski_plan = {r['tarih']: r['baslik'] for r in json.loads((KOK / 'takvim' / 'yillik-plan.json').read_text(encoding='utf-8'))}
        DOSYA.write_text(json.dumps(veri, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        subprocess.run([sys.executable, 'uret.py'], cwd=KOK / 'takvim', check=True, capture_output=True)
        yeni = json.loads((KOK / 'takvim' / 'yillik-plan.json').read_text(encoding='utf-8'))
        bugun = date.today().isoformat()
        ozel = [(r['tarih'], r['baslik']) for r in yeni if r['seri'] == 'Özel Gün' and r['tarih'] >= bugun
                and eski_plan.get(r['tarih']) != r['baslik']]
        fark = sum(1 for r in yeni if r['tarih'] >= bugun and eski_plan.get(r['tarih']) != r['baslik'])
        rapor.append(f'\n{fark} günün konusu yer değiştirdi. Yeni tarihine kayan özel günler:')
        rapor += [f'- {t}: {b}' for t, b in ozel]
        sys.path.insert(0, str(KOK / 'takvim'))
        from govde import GOVDE
        eksik = [r['tarih'] for r in yeni if r['tarih'] >= bugun and r['baslik'] not in GOVDE]
        rapor.append('\nBütün günlerin metni hazır.' if not eksik else f'\n⚠️ Metni olmayan günler: {", ".join(eksik)}')

    metin = '\n'.join(rapor)
    print(metin or 'Değişiklik yok.')
    if cikti:
        with open(cikti, 'a') as f:
            f.write(f'degisti={"1" if degisti else "0"}\n')
            f.write(f'rapor={"1" if rapor else "0"}\n')
        (KOK / '.sinav-rapor.md').write_text(metin, encoding='utf-8')


if __name__ == '__main__':
    main()
