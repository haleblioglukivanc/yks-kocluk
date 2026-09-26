"""Seri fon müzikleri — ElevenLabs Music ile üretilir (eski koddan sentez: seri.py).
Her seriye bir karakter; aynı seri her hafta aynı müzikle tanınır. 30 sn, sözsüz.
Video sesten uzun olursa Remotion döngüye alır; Kıvanç konuşurken müzik kısılır (Sahne.jsx).

    python3 muzik/eleven.py            # hepsi  -> public/muzik/<seri>.mp3
    python3 muzik/eleven.py plan veli  # yalnız bunlar

Parça başına ~375 ElevenLabs kredisi. Anahtar: ELEVENLABS_API_KEY (.env).
"""
import json, pathlib, sys, urllib.request

KOK = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(KOK.parent))
from ses import anahtar  # noqa: E402

ORTAK = ('Instrumental background bed for a short vertical social video with a spoken voice-over on top: '
         'leave space in the mid frequencies for the voice, no vocals, no choir, no spoken words, '
         'engaging from the very first second, modern and polished, clean ending. ')
SERI = {
    'plan':      'Monday planning energy: bright plucked synth arpeggio, soft kick and claps, warm bass, 100 BPM, optimistic and organized, a small lift every 8 bars.',
    'taktik':    'Clever study-tactic vibe: playful pizzicato strings and muted marimba, tight hip-hop drums, 92 BPM, curious and smart.',
    'aynihafta': 'Late-night chat between coach and student: lo-fi felt piano, vinyl crackle, soft brushed drums, 80 BPM, intimate, honest and a little hopeful.',
    'veli':      'Calm and trustworthy for parents: gentle acoustic guitar and soft piano, light shaker, 84 BPM, warm, reassuring, mature.',
    'efsane':    'Myth-busting twist: suspenseful plucks and ticking percussion that resolve into a confident groove, 96 BPM, intriguing then satisfying.',
    'deneme':    'Practice-exam day: driving but controlled electronic beat, pulsing bass, rising synth pads, 110 BPM, focused and determined.',
    'pazar':     'Sunday mental-health calm: soft ambient pads, slow warm piano, no drums, 70 BPM, gentle, safe and breathing.',
    'ozel':      'Special-day warmth: cinematic light strings and piano with soft percussion, 90 BPM, heartfelt and uplifting.',
}


def uret(ad):
    govde = {'prompt': ORTAK + SERI[ad], 'music_length_ms': 30000, 'force_instrumental': True}
    r = urllib.request.Request('https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128', data=json.dumps(govde).encode(),
                               method='POST', headers={'xi-api-key': anahtar(), 'Content-Type': 'application/json'})
    with urllib.request.urlopen(r, timeout=300) as c:
        veri = c.read()
    cikti = KOK / 'public' / 'muzik' / f'{ad}.mp3'
    cikti.write_bytes(veri)
    print(ad, len(veri) // 1024, 'KB')


if __name__ == '__main__':
    for ad in sys.argv[1:] or SERI:
        uret(ad)
