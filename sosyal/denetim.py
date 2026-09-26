"""Yayın öncesi yazım denetimi: günün kancası, gövdesi, sorusu ve açıklamaları.

    python3 sosyal/denetim.py --tarih 2026-09-27     # tek gün
    python3 sosyal/denetim.py --hepsi                # bütün yıl

Türkçe sözlükte (hunspell tr_TR) olmayan bir kelime bulursa hata verir ve video üretilmez.
Doğru yazıldığı halde sözlükte olmayan kelimeler (YKS, EBOB, zekâ...) sosyal/sozluk.txt'e eklenir.
Not: gerçek ama yanlış kelimeyi (ör. 'uzun' yerine 'ucuz') hiçbir denetleyici yakalayamaz;
onu Telegram'daki koç onayı yakalar.
"""
import argparse, json, pathlib, re, subprocess, sys

KOK = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(KOK / 'takvim'))
from govde import GOVDE  # noqa: E402

SOZLUK = {k.strip().lower() for k in (KOK / 'sozluk.txt').read_text(encoding='utf-8').splitlines()
          if k.strip() and not k.startswith('#')}


def metinler(g):
    govde = g.get('gundem_govde') or GOVDE.get(g['baslik']) or []
    return [g['kanca'], g.get('soru', ''), g.get('cta', '')] + list(govde)


def bilinmeyenler(satirlar):
    temiz = [re.sub(r"https?://\S+|#\S+|[’'][^\s.,:;!?)]*", ' ', s) for s in satirlar]
    r = subprocess.run(['hunspell', '-i', 'utf-8', '-d', 'tr_TR', '-l'], input='\n'.join(temiz),
                       capture_output=True, text=True, check=True)
    return sorted({k for k in r.stdout.split() if k.lower() not in SOZLUK and not k.isdigit()})


if __name__ == '__main__':
    a = argparse.ArgumentParser()
    a.add_argument('--tarih'); a.add_argument('--hepsi', action='store_true')
    arg = a.parse_args()
    plan = json.loads((KOK / 'takvim' / 'yillik-plan.json').read_text(encoding='utf-8'))
    gunler = plan if arg.hepsi else [g for g in plan if g['tarih'] == arg.tarih]
    if not gunler:
        sys.exit(f'{arg.tarih} takvimde yok.')
    hata = 0
    for g in gunler:
        b = bilinmeyenler(metinler(g))
        if b:
            hata += 1
            print(f"::error::{g['tarih']} ({g['baslik']}): sözlükte olmayan kelime: {', '.join(b)}")
    if hata:
        sys.exit('Yazım denetimi geçmedi. Kelime doğruysa sosyal/sozluk.txt dosyasına ekle, yanlışsa metni düzelt.')
    print(f'Yazım denetimi temiz ({len(gunler)} gün).')
