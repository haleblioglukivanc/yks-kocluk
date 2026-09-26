"""Günlük videonun seslendirmesi: ElevenLabs, Kıvanç'ın klonlanmış sesi.

Kanca, gövde satırları ve kapanış tek istekte okunur (tonlama bölünmez); ElevenLabs'ın
harf zamanlarından her parçanın ve her kelimenin başladığı an çıkarılır. Video bu
zamanlara göre kurulur: satır, Kıvanç onu okumaya başladığında ekrana gelir.

    python3 sosyal/ses.py "Deneme cümlesi." "İkinci cümle."   # -> sosyal/medya/ses/deneme.mp3

Anahtar: ELEVENLABS_API_KEY (GitHub secret; yerelde depo kökündeki .env).
Aynı metin ikinci kez okutulmaz: sonuç metnin özetiyle önbelleğe yazılır.
"""
import base64, hashlib, json, os, pathlib, re, sys, urllib.error, urllib.request

KOK = pathlib.Path(__file__).resolve().parent
SES_ID = os.environ.get('ELEVENLABS_SES_ID', '').strip() or 'ZKMGIIUyHLQowzll3hUe'     # "kıvanç" (klon, tr)
MODEL = os.environ.get('ELEVENLABS_MODEL', '').strip() or 'eleven_multilingual_v2'
AYAR = {'stability': 0.5, 'similarity_boost': 0.85, 'style': 0.3, 'use_speaker_boost': True, 'speed': 1.0}

# Kısaltmalar harf harf okunsun; ekleri ("YKS'ye") korunur
KISALTMA = {'YKS': 'ye ka se', 'TYT': 'te ye te', 'AYT': 'a ye te', 'LGS': 'le ge se', 'ÖSYM': 'ö se ye me',
            'MEB': 'meb', 'PDR': 'pe de re', 'KPSS': 'ka pe se se', 'YDT': 'ye de te', 'MSÜ': 'me se ü'}


def anahtar():
    k = os.environ.get('ELEVENLABS_API_KEY', '').strip()
    if not k:
        env = KOK.parent / '.env'
        if env.exists():
            for s in env.read_text(encoding='utf-8').splitlines():
                if s.startswith('ELEVENLABS_API_KEY='):
                    k = s.split('=', 1)[1].strip()
    return k


def okunus(kelime):
    """Ekranda yazan kelimenin sesli okunacak hali (boş olabilir)."""
    k = kelime.replace('“', '').replace('”', '').replace('"', '').replace('«', '').replace('»', '')
    k = re.sub(r'\b(\d{1,2}):00\b', r'\1', k)                 # 19:00 -> 19
    k = re.sub(r'\b(\d{1,2}):(\d{2})\b', r'\1 \2', k)          # 19:30 -> 19 30
    k = re.sub(r'%(\d+)', r'yüzde \1', k)
    k = re.sub(r'(\d+)\s*dk\b', r'\1 dakika', k)
    for kis, oku in KISALTMA.items():
        k = re.sub(rf"\b{kis}\b", oku, k)
    return k.strip()


def _istek(metin):
    govde = {'text': metin, 'model_id': MODEL, 'language_code': 'tr', 'voice_settings': AYAR}
    r = urllib.request.Request(f'https://api.elevenlabs.io/v1/text-to-speech/{SES_ID}/with-timestamps?output_format=mp3_44100_128',
        data=json.dumps(govde).encode(), method='POST',
        headers={'xi-api-key': anahtar(), 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(r, timeout=180) as c:
            return json.loads(c.read())
    except urllib.error.HTTPError as h:
        sys.exit('ElevenLabs HTTP %s: %s' % (h.code, h.read().decode()[:500]))


def seslendir(parcalar, cikti):
    """parcalar: ekranda yazan metinler (kanca, satırlar, kapanış).
    Döner: {'sure': sn, 'parca': [{'bas','bit','kelime': [bas...]}]} — ekrandaki her kelimenin başladığı an."""
    if not anahtar():
        sys.exit('ELEVENLABS_API_KEY yok.')
    cikti = pathlib.Path(cikti)
    ozet = hashlib.sha1(json.dumps([parcalar, SES_ID, MODEL, AYAR], ensure_ascii=False).encode()).hexdigest()[:12]
    onbellek = cikti.with_suffix('.json')
    if cikti.exists() and onbellek.exists():
        eski = json.loads(onbellek.read_text(encoding='utf-8'))
        if eski.get('ozet') == ozet:
            return eski

    # Metni kur: ekrandaki her kelimenin okunuşunun metindeki başlangıç yeri tutulur
    metin, yer = '', []
    for i, p in enumerate(parcalar):
        yer.append([])
        for k in p.split():
            o = okunus(k)
            yer[-1].append(len(metin) + (1 if metin and o else 0) if o else None)
            if o:
                metin += (' ' if metin else '') + o
        if metin and not re.search(r'[.!?…:]$', metin):
            metin += '.'                                       # parçalar arasında nefes payı

    veri = _istek(metin)
    h = veri['alignment']
    bas_z, bit_z = h['character_start_times_seconds'], h['character_end_times_seconds']
    cikti.parent.mkdir(parents=True, exist_ok=True)
    cikti.write_bytes(base64.b64decode(veri['audio_base64']))

    sonuc = {'ozet': ozet, 'sure': round(bit_z[-1], 3), 'parca': []}
    for kelimeler in yer:
        zaman, onceki = [], None
        for y in kelimeler:
            t = bas_z[min(y, len(bas_z) - 1)] if y is not None else onceki
            zaman.append(round(t if t is not None else 0.0, 3)); onceki = t
        # parçanın bitişi: son okunan kelimenin son harfi
        son = max((y for y in kelimeler if y is not None), default=None)
        bit = None
        if son is not None:
            j = son
            while j + 1 < len(bit_z) and h['characters'][j + 1] not in ' ':
                j += 1
            bit = round(bit_z[j], 3)
        sonuc['parca'].append({'bas': zaman[0] if zaman else 0.0, 'bit': bit, 'kelime': zaman})
    onbellek.write_text(json.dumps(sonuc, ensure_ascii=False), encoding='utf-8')
    return sonuc


# Parçadan sonra bırakılan sessizlik (sn): kanca yerleşsin, her satır okunabilsin
ARA_KANCA, ARA_SATIR, ARA_KAPANIS = 0.7, 0.55, 0.9


def zamanla(ses, gecikme=0.3, fps=30):
    """Seslendirme zamanlarından videonun zaman çizelgesi (kare).
    parca[0] kanca, [1..n] gövde satırları, son parça kapanış. Tek kayıt parçalara bölünür,
    aralarına sessizlik konur: 'klip' her parçanın kayıttaki yeri ve videodaki başlangıcı."""
    p = ses['parca']
    kare = lambda t: int(round(t * fps))
    klip, kelime, t = [], [], gecikme
    for i, x in enumerate(p):
        bas = max(0.0, x['bas'] - 0.04)
        bit = p[i + 1]['bas'] - 0.02 if i + 1 < len(p) else ses['sure'] + 0.15
        klip.append({'from': kare(t), 'kesBas': kare(bas), 'kesBit': kare(bit)})
        kelime.append([kare(t + w - bas) for w in x['kelime']])
        t += bit - bas
        t += ARA_KANCA if i == 0 else ARA_KAPANIS if i == len(p) - 2 else ARA_SATIR if i < len(p) - 1 else 0
    satir = [max(klip[i]['from'] - 4, 20) for i in range(1, len(p) - 1)]
    kapanis = klip[-1]['from'] - 24
    sure = max(kare(t) + 60, kapanis + 150)
    return {'satir': satir, 'kapanis': kapanis, 'sure': sure, 'kelime': kelime, 'klip': klip}


if __name__ == '__main__':
    parcalar = sys.argv[1:] or ['Yazdığın plan değil, saat verdiğin plan çalışır.', '“Salı 19:00, 40 problem” bir plan.', 'Yarın yine buradayız.']
    s = seslendir(parcalar, KOK / 'medya' / 'ses' / 'deneme.mp3')
    print(json.dumps(zamanla(s), ensure_ascii=False))
