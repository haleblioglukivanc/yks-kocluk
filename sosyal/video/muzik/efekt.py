"""Kurgu ses efektleri — koddan üretilir, telif ve maliyet yok (yalnız standart kitaplık).
    python3 muzik/efekt.py  ->  public/efekt/{gecis,vurus,kapanis}.wav
gecis: satır değişirken hava süpürmesi · vurus: satır yerine oturunca tok vuruş · kapanis: yükselen parıltı
"""
import math, pathlib, random, struct, wave

SR = 44100
KOK = pathlib.Path(__file__).resolve().parent.parent / 'public' / 'efekt'


def yaz(ad, ornek):
    tepe = max(abs(x) for x in ornek) or 1
    KOK.mkdir(parents=True, exist_ok=True)
    with wave.open(str(KOK / f'{ad}.wav'), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(b''.join(struct.pack('<h', int(x / tepe * 0.85 * 32767)) for x in ornek))


def gecis(sure=0.42):
    rnd, n, y, cikti = random.Random(7), int(SR * sure), 0.0, []
    for i in range(n):
        t = i / n
        kes = 0.02 + 0.5 * t * t                      # alçak geçiren süzgeç açılır: ıslık yükselir
        y += kes * (rnd.uniform(-1, 1) - y)
        cikti.append(y * math.sin(math.pi * t) ** 2 * (0.4 + 0.6 * t))
    return cikti


def vurus(sure=0.5):
    rnd, cikti = random.Random(3), []
    for i in range(int(SR * sure)):
        t = i / SR
        f = 48 + 90 * math.exp(-t * 30)               # perdesi düşen tok vuruş
        cikti.append(math.sin(2 * math.pi * f * t) * math.exp(-t * 9) + rnd.uniform(-1, 1) * 0.5 * math.exp(-t * 90))
    return cikti


def kapanis(sure=1.4):
    cikti = []
    for i in range(int(SR * sure)):
        t = i / SR
        s = sum(math.sin(2 * math.pi * f * t) * math.exp(-max(0, t - g) * 2.6) * (t >= g)
                for f, g in [(523.25, 0), (659.25, .07), (783.99, .14), (1046.5, .21), (1318.5, .28)])
        cikti.append(s * min(1, t / 0.004))
    return cikti


if __name__ == '__main__':
    for ad, fn in [('gecis', gecis), ('vurus', vurus), ('kapanis', kapanis)]:
        yaz(ad, fn()); print(ad)
