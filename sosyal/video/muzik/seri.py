"""Günlük videoların fon müzikleri — koddan üretilir, telif yoktur.
Her seriye bir karakter: aynı seri her hafta aynı müzikle tanınır.
Olaylar Gunluk.jsx ile aynı: gövde satırları 6/9/12 sn (çan), kapanış 15 sn (majör çözülme).

    python3 muzik/seri.py  ->  public/muzik/<seri>.mp3
"""
import numpy as np, pathlib, subprocess, wave
from scipy.signal import lfilter

SR, SURE = 44100, 20.0
N = int(SR * SURE)
AD = {'C':-9,'C#':-8,'D':-7,'D#':-6,'E':-5,'F':-4,'F#':-3,'G':-2,'G#':-1,'A':0,'A#':1,'B':2}
hz = lambda n: 440 * 2 ** ((AD[n[:-1]] + 12 * (int(n[-1]) - 4)) / 12)

def piyano(f, sure=2.2, sert=1.0):
    t = np.arange(int(SR*sure)) / SR
    return sum(a*np.sin(2*np.pi*f*k*t)*np.exp(-t*(1.6+k*0.9*sert)) for k, a in [(1,1),(2,.38),(3,.16),(4,.07)]) * np.minimum(1, t/0.006)

def ped(fs, sure, giris=0.8, cikis=1.0):
    t = np.arange(int(SR*sure)) / SR
    s = sum(np.sin(2*np.pi*(f+d)*t) + .18*np.sin(2*np.pi*2*(f+d)*t) for f in fs for d in (-.12, .12))
    return s/len(fs) * np.clip(np.minimum(t/giris, (sure-t)/cikis), 0, 1)

def can(f, sure=2.0):
    t = np.arange(int(SR*sure)) / SR
    return (np.sin(2*np.pi*f*t) + .4*np.sin(2*np.pi*f*2.76*t)*np.exp(-t*4)) * np.exp(-t*1.8) * np.minimum(1, t/0.003)

def yanki(x):
    y = np.zeros_like(x)
    for d, g in [(1557,.78),(1617,.77),(1491,.76),(1422,.75)]:
        a = np.zeros(d+1); a[0] = 1; a[d] = -g
        y += lfilter([1], a, x)
    y /= 4
    for d, g in [(225,.6),(556,.6)]:
        b = np.zeros(d+1); b[0] = -g; b[d] = 1
        a = np.zeros(d+1); a[0] = 1; a[d] = -g
        y = lfilter(b, a, y)
    return y

# seri: (sekizlik süresi sn, [ (bas, akor) x4 gövde bölümü ], kapanış akoru, çan notası)
SERILER = {
 'plan':      (0.30, [('C3',['E4','G4','C5']),('G2',['D4','G4','B4']),('A2',['C4','E4','A4']),('F2',['A3','C4','F4'])], ('C2',['E3','G3','D4','E4','B4']), 'G6'),
 'taktik':    (0.25, [('D3',['F4','A4','D5']),('A#2',['D4','F4','A#4']),('F2',['A3','C4','F4']),('C3',['E4','G4','C5'])], ('F2',['A3','C4','G4','A4','E5']), 'A6'),
 'aynihafta': (0.375,[('A2',['C4','E4','A4']),('F2',['A3','C4','F4']),('C3',['G3','C4','E4']),('G2',['G3','C4','D4'])], ('C2',['E3','G3','D4','E4','B4']), 'E6'),
 'veli':      (0.42, [('F2',['A3','C4','F4']),('C3',['G3','C4','E4']),('D3',['F4','A4','D5']),('A#2',['D4','F4','A#4'])], ('F2',['C4','E4','G4','A4']), 'C6'),
 'efsane':    (0.28, [('E2',['G3','B3','E4']),('C3',['E4','G4','C5']),('G2',['D4','G4','B4']),('D3',['F#4','A4','D5'])], ('G2',['B3','D4','A4','B4','F#5']), 'D6'),
 'deneme':    (0.25, [('G2',['B3','D4','G4']),('E2',['G3','B3','E4']),('C3',['E4','G4','C5']),('D3',['F#4','A4','D5'])], ('G2',['B3','D4','A4','B4']), 'B5'),
 'pazar':     (0.50, [('D3',['F4','A4','D5']),('A#2',['D4','F4','A4']),('F2',['A3','C4','F4']),('C3',['E4','G4','C5'])], ('F2',['A3','C4','G4','E5']), 'A5'),
 'ozel':      (0.40, [('C3',['E4','G4','C5']),('A2',['C4','E4','A4']),('F2',['A3','C4','F4']),('G2',['B3','D4','G4'])], ('C2',['E3','G3','D4','E4','B4']), 'C6'),
}
BOLUM = [0.0, 6.0, 9.0, 12.0, 15.0]   # dört akor bölümü + kapanış

def uret(ad, adim, akorlar, kapanis, cn):
    sol = np.zeros(N); sag = np.zeros(N)
    def ekle(s, bas, pan=0.0, k=1.0):
        i = int(bas*SR); j = min(N, i+len(s))
        if j > i:
            sol[i:j] += s[:j-i]*k*(1-pan)*.7; sag[i:j] += s[:j-i]*k*(1+pan)*.7
    for n, (b, akor) in enumerate(akorlar):
        bas, bit = BOLUM[n], BOLUM[n+1]
        ekle(ped([hz(x) for x in akor], bit-bas+.6, .5 if bas else 1.2, .6), bas, 0, .15)
        ekle(piyano(hz(b), 3, .6), bas, -.2, .32)
        dizi = akor + akor[-2:0:-1]; t = bas; k = 0
        while t < bit - .05:
            ekle(piyano(hz(dizi[k % len(dizi)]), 1.5), t, .25 if k % 2 else -.05, .12); t += adim; k += 1
    b, akor = kapanis
    ekle(ped([hz(x) for x in akor], 5.6, .8, 1.5), 15.0, 0, .17)
    ekle(piyano(hz(b), 4, .5), 15.0, -.2, .34)
    for k, x in enumerate(akor): ekle(piyano(hz(x), 3.5, .5), 15.0 + k*.06, (k-2)*.15, .2)
    for s in (6.0, 9.0, 12.0): ekle(can(hz(cn), 1.5), s, .3, .045)
    sol = sol*.75 + yanki(sol)*.35; sag = sag*.75 + yanki(sag)*.35
    t = np.arange(N)/SR
    zarf = np.clip((SURE-t)/2.2, 0, 1)**1.5 * np.clip(t/0.4, 0, 1)
    st = np.stack([sol, sag], 1) * zarf[:, None]
    st = np.tanh(st/np.abs(st).max()*1.2) * .5
    kok = pathlib.Path(__file__).resolve().parent.parent / 'public' / 'muzik'; kok.mkdir(exist_ok=True)
    wav = kok / f'{ad}.wav'
    with wave.open(str(wav), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st*32767).astype('<i2').tobytes())
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(wav), '-af', 'loudnorm=I=-16:TP=-1.5:LRA=7',
                    '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '128k', str(kok / f'{ad}.mp3')], check=True)
    wav.unlink()

if __name__ == '__main__':
    for ad, (adim, akorlar, kap, cn) in SERILER.items():
        uret(ad, adim, akorlar, kap, cn); print('yazıldı:', ad)
