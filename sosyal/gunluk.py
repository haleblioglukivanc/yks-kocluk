"""Takvimden bir günün videosunu üretir ve üç kanala Buffer'da planlar.

    python3 sosyal/gunluk.py --tarih 2026-09-21 --render            # sadece video
    python3 sosyal/gunluk.py --tarih 2026-09-21 --render --gonder   # video + Buffer
    python3 sosyal/gunluk.py --tarih 2026-09-21 --metin             # sadece açıklamaları göster

Gövdesi (sosyal/takvim/govde.py) yazılmamış gün üretilmez: uyarı verir, çıkar.
Aynı gün aynı kanala ikinci kez gönderilmez (Buffer'da o güne ait gönderi varsa atlar).
"""
import argparse, json, mimetypes, os, pathlib, subprocess, sys, urllib.error, urllib.request
from datetime import date, datetime, timedelta, timezone

KOK = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(KOK / 'takvim'))
from govde import GOVDE  # noqa: E402

TR = timezone(timedelta(hours=3))
KANAL = {'yt': '6aace7c9ea19ca0bde758f8b', 'ig': '6aad24b7ea19ca0bde778286', 'tt': '6aad283cea19ca0bde77a6ba'}
MUZIK = {'Haftanın Planı': 'plan', 'Ders Taktiği': 'taktik', 'Aynı Hafta': 'aynihafta', 'Veli Köşesi': 'veli',
         'Doğru Bilinen Yanlışlar': 'efsane', 'Deneme Günü': 'deneme', 'Sınav Psikolojisi': 'pazar', 'Özel Gün': 'ozel',
         'Gündem': 'ozel'}
EKIP = json.loads((KOK / 'ekip.json').read_text(encoding='utf-8'))
UZMAN_NOTU = ('Bu içerik bilgilendirme amaçlıdır. Kaygı, uykusuzluk ya da umutsuzluk haftalardır sürüyorsa '
              'okul rehber öğretmenine ya da bir uzmana başvur. Acil bir durumda 112.')
SITE = 'https://khkocluk.com'


def gun_bul(tarih):
    plan = json.loads((KOK / 'takvim' / 'yillik-plan.json').read_text(encoding='utf-8'))
    for g in plan:
        if g['tarih'] == tarih:
            break
    else:
        sys.exit(f'{tarih} takvimde yok.')
    # Onaylanmış gündem içeriği (sosyal/takvim/gundem.json) takvimdeki günün yerine geçer
    gp = KOK / 'takvim' / 'gundem.json'
    for x in (json.loads(gp.read_text(encoding='utf-8')) if gp.exists() else []):
        if x.get('tarih') == tarih and x.get('onay'):
            g = {**g, 'seri': 'Gündem', 'sablon': x.get('sablon', 'kart-liste'), 'baslik': x['baslik'],
                 'kanca': x['kanca'], 'ders': '', 'soru': x.get('soru', ''), 'gundem_govde': x['govde']}
            g['etiket'] = {k: v[:-1] + x.get('etiket', []) + v[-1:] for k, v in g['etiket'].items()}
            print('>> Gündem içeriği kullanılıyor:', x['baslik'])
    # Sınav Psikolojisi: uzman imzası
    if g['seri'] == 'Sınav Psikolojisi' and EKIP['uzman']['ad']:
        g['imza'] = f"{EKIP['uzman']['unvan']} {EKIP['uzman']['ad']}"
    return g


def metinler(g, govde):
    """Platform başına açıklama. Hassas günlerde çağrı ve etiket yok."""
    satirlar = '\n'.join(govde)
    et = {k: ' '.join(v) for k, v in g['etiket'].items()}
    soru = f"\n\n💬 {g['soru']}" if g.get('soru') else ''
    if g['seri'] == 'Sınav Psikolojisi':
        soru += (f"\n\n— {g['imza']}" if g.get('imza') else '') + f"\n\n{UZMAN_NOTU}"
    if g['hassas']:
        yalin = f"{g['kanca']}\n\n{satirlar}"
        return {'yt': yalin, 'ig': yalin, 'tt': yalin}, g['baslik']
    yt = (f"{g['kanca']}\n\n{satirlar}{soru}\n\n{g['seri']} · her gün bir video.\n"
          f"Kıvanç Hoca ile Eğitim Koçluğu: {SITE}\nTanışma görüşmesi (30 dk, ücretsiz): {SITE}/#iletisim\n\n{et['yt']}")
    ig = (f"{g['kanca']}\n\n{satirlar}{soru}\n\n{g['seri']} · her gün bir video. Kaydet, haftaya lazım olur.\n"
          f"Tanışma görüşmesi: khkocluk.com (profildeki bağlantı)\n\n{et['ig']}")
    tt = f"{g['kanca']}\n\n{satirlar}{soru}\n\nkhkocluk.com\n\n{et['tt']}"
    baslik = g['kanca'] if len(g['kanca']) <= 92 else g['baslik']
    return {'yt': yt, 'ig': ig, 'tt': tt}, baslik + ' #Shorts'


def render(g, govde, cikti):
    video = KOK / 'video'
    paket = video / 'build'
    if not (paket / 'index.html').exists():        # bir kez paketle, sonra her kare hızlı
        subprocess.run(['npx', 'remotion', 'bundle', 'src/index.js', f'--out-dir={paket}', '--log=error'],
                       cwd=video, check=True)
    props = {'gun': g, 'govde': govde, 'muzik': f"muzik/{MUZIK[g['seri']]}.mp3" if g.get('muzik') else None}
    pf = video / '.props.json'
    pf.write_text(json.dumps(props, ensure_ascii=False), encoding='utf-8')
    cikti.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(['npx', 'remotion', 'render', str(paket), 'Gunluk', str(cikti), f'--props={pf}',
                    '--crf=20', '--log=error'], cwd=video, check=True)
    subprocess.run(['npx', 'remotion', 'still', str(paket), 'Gunluk', str(cikti.with_suffix('.png')),
                    f'--props={pf}', '--frame=0', '--log=error'], cwd=video, check=True)
    pf.unlink()


# ── Buffer + Supabase ───────────────────────────────────────────
def env(k):
    return os.environ.get(k, '').strip()


def buffer(sorgu, degisken=None):
    r = urllib.request.Request('https://api.buffer.com', method='POST',
        data=json.dumps({'query': sorgu, 'variables': degisken or {}}).encode(),
        headers={'Authorization': 'Bearer ' + env('BUFFER_API_KEY'), 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(r, timeout=60) as c:
            veri = json.loads(c.read())
    except urllib.error.HTTPError as h:
        sys.exit('Buffer HTTP %s: %s' % (h.code, h.read().decode()[:500]))
    if veri.get('errors'):
        sys.exit('Buffer hatası: ' + json.dumps(veri['errors'], ensure_ascii=False))
    return veri['data']


def yukle(dosya, klasor):
    import hashlib
    url = env('SUPABASE_URL').rstrip('/')
    p = pathlib.Path(dosya)
    ad = '%s/%s-%s%s' % (klasor, p.stem, hashlib.sha1(p.read_bytes()).hexdigest()[:8], p.suffix)
    r = urllib.request.Request('%s/storage/v1/object/sosyal/%s' % (url, ad), data=p.read_bytes(), method='POST',
        headers={'Authorization': 'Bearer ' + env('SUPABASE_SERVICE_KEY'),
                 'Content-Type': mimetypes.guess_type(p.name)[0] or 'video/mp4', 'x-upsert': 'true'})
    with urllib.request.urlopen(r, timeout=300) as c:
        c.read()
    return '%s/storage/v1/object/public/sosyal/%s' % (url, ad)


def o_gun_gonderi_var_mi(kanal, tarih):
    org = buffer('{ account { organizations { id } } }')['account']['organizations'][0]['id']
    bas = datetime.fromisoformat(tarih).replace(tzinfo=TR)
    q = '''query($i: PostsInput!){ posts(first: 20, input: $i){ edges { node { id dueAt status } } } }'''
    veri = buffer(q, {'i': {'organizationId': org, 'filter': {'channelIds': [kanal], 'dueAt': {
        'start': bas.astimezone(timezone.utc).isoformat(), 'end': (bas + timedelta(days=1)).astimezone(timezone.utc).isoformat()}}}})
    return [e['node']['id'] for e in (veri['posts']['edges'] or [])]


def gonder(g, video, aciklama, yt_baslik, deneme):
    simdi = datetime.now(TR)
    link = None
    for k in ('yt', 'ig', 'tt'):
        zaman = datetime.fromisoformat(f"{g['tarih']}T{g['saat'][k]}").replace(tzinfo=TR)
        if zaman < simdi + timedelta(minutes=10):
            zaman = simdi + timedelta(minutes=15)
        print(f"-- {k}: {zaman:%Y-%m-%d %H:%M} (TR)")
        if deneme:
            print(aciklama[k][:300] + ('…' if len(aciklama[k]) > 300 else '')); continue
        var = o_gun_gonderi_var_mi(KANAL[k], g['tarih'])
        if var:
            print('   bu kanala o gün zaten gönderi var, atlandı:', var); continue
        link = link or yukle(video, g['tarih'])
        varlik = {'url': link}
        if k in ('ig', 'tt'):
            varlik['metadata'] = {'thumbnailOffset': 0}          # kapak = ilk kare
        girdi = {'text': aciklama[k], 'channelId': KANAL[k], 'schedulingType': 'automatic', 'mode': 'customScheduled',
                 'dueAt': zaman.astimezone(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z'), 'assets': [{'video': varlik}]}
        if k == 'yt':
            girdi['metadata'] = {'youtube': {'title': yt_baslik[:100], 'categoryId': '27', 'privacy': 'public',
                                             'notifySubscribers': True, 'madeForKids': False}}
        if k == 'ig':
            girdi['metadata'] = {'instagram': {'type': 'reel', 'shouldShareToFeed': True}}
        s = '''mutation($i: CreatePostInput!){ createPost(input: $i){
                 ... on PostActionSuccess { post { id dueAt } } ... on MutationError { message } } }'''
        sonuc = buffer(s, {'i': girdi})['createPost']
        if 'message' in sonuc:
            sys.exit(f'{k}: gönderi oluşturulamadı: ' + sonuc['message'])
        print('   planlandı:', sonuc['post']['id'])


if __name__ == '__main__':
    a = argparse.ArgumentParser()
    a.add_argument('--tarih', default=(datetime.now(TR) + timedelta(days=1)).strftime('%Y-%m-%d'))
    a.add_argument('--render', action='store_true'); a.add_argument('--gonder', action='store_true')
    a.add_argument('--metin', action='store_true'); a.add_argument('--deneme', action='store_true')
    arg = a.parse_args()
    g = gun_bul(arg.tarih)
    govde = g.get('gundem_govde') or GOVDE.get(g['baslik'])
    print(f"{g['tarih']} {g['gun']} · {g['seri']} · {g['baslik']}")
    if not govde:
        print(f"::warning::{g['tarih']} ({g['baslik']}) için gövde yazılmamış; video üretilmedi.")
        sys.exit(0)
    aciklama, yt_baslik = metinler(g, govde)
    video = KOK / 'medya' / 'gunluk' / f"{g['tarih']}.mp4"
    if arg.metin:
        print('YT başlık:', yt_baslik)
        for k, v in aciklama.items():
            print(f'\n=== {k} ===\n{v}')
    if arg.render:
        render(g, govde, video); print('video:', video)
    if arg.gonder:
        gonder(g, video, aciklama, yt_baslik, arg.deneme)
