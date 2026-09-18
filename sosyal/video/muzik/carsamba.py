"""Çarşamba videosunun fon müziği — koddan üretilir, telif yoktur.

Akorlar videonun zaman çizelgesine oturur (src/Carsamba.jsx, 30 kare = 1 sn):
gerilimli minör açılış -> paragraf silinince (12,3 sn) aydınlanma ->
perşembe bitince (15,2 sn) çözülme -> kapanışta (16,7 sn) uzun majör akor.
Mesaj geldikçe yumuşak bir çan, işler bitince parlak bir çan.

    python3 muzik/carsamba.py  ->  public/carsamba-muzik.wav
"""
import numpy as np, wave, pathlib

SR, SURE = 44100, 20.0
N = int(SR * SURE)
sol = np.zeros(N); sag = np.zeros(N)

def hz(nota):  # 'A4' gibi
    adlar = {'C':-9,'C#':-8,'D':-7,'D#':-6,'E':-5,'F':-4,'F#':-3,'G':-2,'G#':-1,'A':0,'A#':1,'B':2}
    ad, okt = nota[:-1], int(nota[-1])
    return 440 * 2 ** ((adlar[ad] + 12 * (okt - 4)) / 12)

def ekle(sinyal, bas, pan=0.0, kazanc=1.0):
    i = int(bas * SR); j = min(N, i + len(sinyal))
    if j <= i: return
    s = sinyal[:j - i] * kazanc
    sol[i:j] += s * (1 - pan) / 2 * 2 ** .5 * .7
    sag[i:j] += s * (1 + pan) / 2 * 2 ** .5 * .7

def piyano(f, sure=2.4, sert=1.0):
    t = np.arange(int(SR * sure)) / SR
    ses = sum(a * np.sin(2 * np.pi * f * k * t) * np.exp(-t * (1.6 + k * 0.9 * sert))
              for k, a in [(1, 1), (2, .38), (3, .16), (4, .07)])
    atak = np.minimum(1, t / 0.006)
    return ses * atak

def ped(frekanslar, sure, giris=0.8, cikis=1.0):
    t = np.arange(int(SR * sure)) / SR
    ses = np.zeros_like(t)
    for f in frekanslar:
        for sapma in (-0.12, 0.12):  # hafif koro
            ses += np.sin(2 * np.pi * (f + sapma) * t) + 0.18 * np.sin(2 * np.pi * 2 * (f + sapma) * t)
    zarf = np.minimum(1, t / giris) * np.minimum(1, (sure - t) / cikis)
    return ses / len(frekanslar) * np.clip(zarf, 0, 1)

def can(f, sure=3.0):
    t = np.arange(int(SR * sure)) / SR
    return (np.sin(2*np.pi*f*t) + .4*np.sin(2*np.pi*f*2.76*t)*np.exp(-t*4)) * np.exp(-t*1.8) * np.minimum(1, t/0.003)

# (başlangıç sn, bitiş sn, bas, akor notaları)
AKORLAR = [
    (0.00,  3.00, 'A2', ['C4','E4','A4']),        # Am
    (3.00,  6.00, 'F2', ['A3','C4','F4']),        # F
    (6.00,  9.00, 'C3', ['G3','C4','E4']),        # C
    (9.00, 12.33, 'G2', ['G3','C4','D4']),        # Gsus — gerilim
    (12.33,13.67, 'F2', ['A3','E4','C5']),        # Fmaj7 — silindi, nefes
    (13.67,15.17, 'G2', ['B3','D4','G4']),        # G — taşınıyor
    (15.17,16.67, 'C3', ['E4','G4','C5']),        # C — bitti
    (16.67,20.00, 'C2', ['E3','G3','D4','E4','B4']),  # Cmaj9 — kapanış
]
ADIM = 0.375  # sekizlik, 80 bpm
for bas, bit, b, akor in AKORLAR:
    uz = bit - bas
    ekle(ped([hz(n) for n in akor], uz + 0.6, giris=0.6 if bas else 1.5, cikis=0.7), bas, 0, 0.16)
    ekle(piyano(hz(b), min(3, uz + 0.5), 0.6), bas, -0.2, 0.34)
    if bas < 16.6:  # kapanışta arpej durur, akor çınlar
        dizi = akor + akor[-2:0:-1]
        t = bas; k = 0
        while t < bit - 0.05:
            ekle(piyano(hz(dizi[k % len(dizi)]), 1.6), t, 0.25 if k % 2 else -0.05, 0.13)
            t += ADIM; k += 1
    else:
        for k, n in enumerate(akor):
            ekle(piyano(hz(n), 3.5, 0.5), bas + k * 0.06, (k - 2) * 0.15, 0.2)

for sn in [36, 88, 150, 205, 300, 336]:           # mesajlar
    ekle(can(hz('E6'), 1.5), sn / 30, 0.3, 0.035)
ekle(can(hz('A5'), 2.0), 370 / 30, -0.3, 0.05)     # silindi
for k, n in enumerate(['C6', 'E6', 'G6']):          # bitti
    ekle(can(hz(n), 2.5), 455 / 30 + k * 0.07, 0.2, 0.05)

# basit yankı (Schroeder): paralel tarak + seri tüm geçiren
def yanki(x):
    cikti = np.zeros_like(x)
    for gec, g in [(1557, .78), (1617, .77), (1491, .76), (1422, .75)]:
        y = x.copy()
        for i in range(gec, len(y), gec):
            y[i:i+gec] += g * y[i-gec:i][:len(y[i:i+gec])]
        cikti += y
    cikti /= 4
    for gec, g in [(225, .6), (556, .6)]:
        y = np.zeros_like(cikti); tampon = np.zeros(gec)
        for i in range(len(cikti)):
            b = tampon[i % gec]; v = cikti[i] + g * b
            y[i] = b - g * v; tampon[i % gec] = v
        cikti = y
    return cikti

sol = sol * .75 + yanki(sol) * .35
sag = sag * .75 + yanki(sag) * .35
t = np.arange(N) / SR
son = np.clip((SURE - t) / 2.2, 0, 1) ** 1.5         # son 2,2 sn söner
basla = np.clip(t / 0.4, 0, 1)
st = np.stack([sol, sag], 1) * (son * basla)[:, None]
st = np.tanh(st / np.abs(st).max() * 1.2) * 0.5       # tepe ~ -6 dB
yol = pathlib.Path(__file__).resolve().parent.parent / 'public' / 'carsamba-muzik.wav'
with wave.open(str(yol), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((st * 32767).astype('<i2').tobytes())
print('yazıldı:', yol)
