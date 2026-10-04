"""Bir günün videosu için satır başına görsel üretir (Cloudflare Workers AI, ücretsiz kota).

    python3 sosyal/gorsel.py --tarih 2026-10-05            # eksik görselleri üret
    python3 sosyal/gorsel.py --tarih 2026-10-05 --yeniden  # istemleri ve görselleri baştan üret

Kanca + gövde satırları için birer görsel: sosyal/video/public/sahne/<tarih>/00.jpg, 01.jpg ...
İstemler aynı klasörde istem.json'da; elle düzeltilen istem, görsel silinip betik yeniden
çalıştırılınca kullanılır. Stil kuralları sosyal/gorsel/stil.md.

Cloudflare'e Supabase'deki cf-ai köprüsü üzerinden gider (anahtar Supabase sırlarında, deneme analiziyle
ortak); gereken yalnız SUPABASE_URL + SUPABASE_SERVICE_KEY (iş akışında zaten var). Köprüye ulaşılamaz ya da
Cloudflare hata verirse betik uyarı verip çıkar; video eski foto kurgusuyla üretilir.
"""
import argparse, base64, json, os, pathlib, re, sys, urllib.error, urllib.request

KOK = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(KOK))
from gunluk import gun_bul, GOVDE  # noqa: E402

METIN_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast'
# Önce dikey çıktı verebilen model; olmazsa kare çıkaran hızlı model (Remotion dikeye kırpar)
KOPRU = None
GORSEL_MODELLER = [m for m in os.environ.get('GORSEL_MODEL', '').split(',') if m] or [
    '@cf/leonardo/lucid-origin', '@cf/black-forest-labs/flux-1-schnell']


def kalip():
    metin = (KOK / 'gorsel' / 'stil.md').read_text(encoding='utf-8')
    return ' '.join(re.search(r'```istem\n(.*?)```', metin, re.S).group(1).split())


def kopru():
    """Supabase'deki cf-ai köprüsü: Cloudflare anahtarı Supabase sırlarında (deneme analiziyle ortak)."""
    url = os.environ.get('SUPABASE_URL', '').strip().rstrip('/')
    anahtar = os.environ.get('CF_KOPRU_ANAHTAR', '').strip()
    servis = os.environ.get('SUPABASE_SERVICE_KEY', '').strip()
    if url and not anahtar and servis:
        r = urllib.request.Request(f'{url}/rest/v1/sosyal_ayar?anahtar=eq.CF_KOPRU_ANAHTAR&select=deger',
                                   headers={'apikey': servis, 'Authorization': 'Bearer ' + servis})
        with urllib.request.urlopen(r, timeout=30) as c:
            satir = json.loads(c.read())
        anahtar = satir[0]['deger'] if satir else ''
    return (url, anahtar) if url and anahtar else None


def cf(model, govde):
    hesap, anahtar = os.environ.get('CLOUDFLARE_ACCOUNT_ID', '').strip(), os.environ.get('CLOUDFLARE_API_TOKEN', '').strip()
    if hesap and anahtar:                         # doğrudan Cloudflare (yerelde istenirse)
        r = urllib.request.Request(f'https://api.cloudflare.com/client/v4/accounts/{hesap}/ai/run/{model}', method='POST',
            data=json.dumps(govde).encode(), headers={'Authorization': 'Bearer ' + anahtar, 'Content-Type': 'application/json'})
    else:                                         # varsayılan: Supabase köprüsü
        url, kk = KOPRU
        r = urllib.request.Request(f'{url}/functions/v1/cf-ai', method='POST',
            data=json.dumps({'model': model, 'govde': govde}).encode(),
            headers={'x-anahtar': kk, 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(r, timeout=120) as c:
            tur, ham = c.headers.get('Content-Type', ''), c.read()
    except urllib.error.HTTPError as h:
        raise RuntimeError(f'HTTP {h.code}: {h.read().decode(errors="ignore")[:200]}')
    if 'json' not in tur:
        return {'_ikili': ham}
    veri = json.loads(ham)
    if not veri.get('success', True):
        raise RuntimeError(json.dumps(veri.get('errors'), ensure_ascii=False))
    return veri.get('result', veri)


def nesneler(g, parcalar):
    """Her satırı tek, somut, metinsiz bir görsel tarifine çevirir (İngilizce)."""
    satirlar = '\n'.join(f'{i}. {p}' for i, p in enumerate(parcalar))
    istem = (f"Lines from a 20-second vertical video for Turkish university-exam (YKS) students. Topic: {g['baslik']}.\n"
             f"{satirlar}\n\nFor EACH line, invent ONE visual metaphor that makes its MEANING visible: a concrete "
             "still-life scene of physical objects on a study desk at night, 10-20 words, English. Show the idea, not the "
             "words: 'small steps add up' -> 'a tall stack of thin coins, each slightly golden, rising like a tower'; 'rest is part of "
             "the work' -> 'a closed laptop beside a steaming cup of tea and a folded blanket'; 'mistakes show the way' -> "
             "'a crumpled paper ball next to a brass compass pointing upward'. Never reuse these examples. "
             "Rules: physical objects only, each line a different main object, never people, faces, hands, text, "
             "letters, numbers, screens or logos. Reply ONLY with a JSON array of "
             f"{len(parcalar)} strings, in line order.")
    sonuc = cf(METIN_MODEL, {'messages': [{'role': 'user', 'content': istem}], 'max_tokens': 700, 'temperature': 0.6})
    cevap = sonuc.get('response') or (sonuc.get('choices') or [{}])[0].get('message', {}).get('content') or sonuc
    if isinstance(cevap, str):
        cevap = json.loads(re.search(r'\[.*\]', cevap, re.S).group(0))
    if not isinstance(cevap, list) or len(cevap) < len(parcalar):
        raise RuntimeError(f'Llama beklenen listeyi vermedi: {cevap!r}'[:300])
    return [str(x).strip() for x in cevap[:len(parcalar)]]


def ciz(istem, hedef):
    son_hata = None
    for model in GORSEL_MODELLER:
        try:
            govde = {'prompt': istem}
            govde.update({'width': 720, 'height': 1280} if 'lucid' in model else {'steps': 4} if 'schnell' in model else {})
            sonuc = cf(model, govde)
            ham = sonuc.get('_ikili') or base64.b64decode(sonuc['image'])
            uzanti = '.png' if ham[:4] == b'\x89PNG' else '.jpg'
            hedef.with_suffix(uzanti).write_bytes(ham)
            return model
        except Exception as h:                    # model yok, kota, ağ: sıradakini dene
            son_hata = h
            print(f'   {model.split("/")[-1]}: {h}'[:240])
    raise RuntimeError(f'Hiçbir görsel modeli çalışmadı: {son_hata}')


def uret(tarih, yeniden=False):
    global KOPRU
    KOPRU = None if os.environ.get('CLOUDFLARE_API_TOKEN') else kopru()
    if not KOPRU and not (os.environ.get('CLOUDFLARE_ACCOUNT_ID') and os.environ.get('CLOUDFLARE_API_TOKEN')):
        print('::warning::Cloudflare köprüsüne ulaşılamadı (SUPABASE_URL + SUPABASE_SERVICE_KEY yok); satır görselleri üretilmedi.')
        return False
    g = gun_bul(tarih)
    govde = g.get('gundem_govde') or GOVDE.get(g['baslik'])
    if not govde:
        return False
    parcalar = [g['kanca'], *govde]
    klasor = KOK / 'video' / 'public' / 'sahne' / tarih
    klasor.mkdir(parents=True, exist_ok=True)
    kayit = klasor / 'istem.json'
    if yeniden:
        for p in klasor.glob('[0-9][0-9].*'):
            p.unlink()
    tarifler = None if yeniden or not kayit.exists() else json.loads(kayit.read_text(encoding='utf-8')).get('nesne')
    if not tarifler or len(tarifler) != len(parcalar):
        tarifler = nesneler(g, parcalar)
    kalip_ = kalip()
    kayit.write_text(json.dumps({'tarih': tarih, 'satir': parcalar, 'nesne': tarifler}, ensure_ascii=False, indent=1),
                     encoding='utf-8')
    for i, (satir, nesne) in enumerate(zip(parcalar, tarifler)):
        hedef = klasor / f'{i:02d}'
        if list(klasor.glob(f'{i:02d}.*')):
            continue
        model = ciz(kalip_.replace('{nesne}', nesne.rstrip('.')), hedef)
        print(f'   {i:02d} [{model.split("/")[-1]}] {satir[:40]} -> {nesne}')
    return True


def gorseller(tarih):
    """Remotion'a verilecek göreli yollar (kanca + satırlar); eksikse boş liste."""
    klasor = KOK / 'video' / 'public' / 'sahne' / tarih
    yollar = sorted(p for p in klasor.glob('[0-9][0-9].*')) if klasor.exists() else []
    return [f'sahne/{tarih}/{p.name}' for p in yollar]


if __name__ == '__main__':
    a = argparse.ArgumentParser()
    a.add_argument('--tarih', required=True)
    a.add_argument('--yeniden', action='store_true')
    arg = a.parse_args()
    try:
        uret(arg.tarih, arg.yeniden)
    except (urllib.error.URLError, RuntimeError, KeyError, ValueError) as h:
        print(f'::warning::Satır görselleri üretilemedi, video eski kurguyla çıkacak: {h}'[:500])
    print('görseller:', gorseller(arg.tarih))
