"""Okundu damgası: metni baştan sona okunup onaylanmış günler doğrudan paylaşılır.

Yazım denetimi (denetim.py) yalnız sözlükte olmayan kelimeyi yakalar; gerçek ama yanlış
kelimeyi ('uzun' yerine 'ucuz'), yanlış tarihi ya da ters konuşmacıyı yakalayamaz. Onu okuma
yakalar. Okunan günün metninin özeti takvim/okundu.json'a yazılır. Günlük üretimde:

  - metin okunduğu gibi duruyorsa  -> video doğrudan Buffer'a planlanır
  - metin sonradan değiştiyse, gün hiç okunmadıysa ya da gündem içeriği geldiyse
                                    -> video Telegram'da koç onayına düşer

    python3 sosyal/okundu.py --damgala --baslangic 2026-10-04   # okuduktan sonra damgala
    python3 sosyal/okundu.py --durum                            # damgası olmayan / değişmiş günler

Metni değiştiren kişi yeniden okuyup yeniden damgalar; damgalamadan itilen değişiklik onaya düşer.
"""
import argparse, hashlib, json, pathlib, sys

KOK = pathlib.Path(__file__).resolve().parent
DOSYA = KOK / 'takvim' / 'okundu.json'


def ozet(g, govde):
    ham = json.dumps([g['baslik'], g['kanca'], list(govde or []), g.get('soru', '')], ensure_ascii=False)
    return hashlib.sha1(ham.encode('utf-8')).hexdigest()[:12]


def okundu_mu(g, govde):
    if not DOSYA.exists():
        return False
    return json.loads(DOSYA.read_text(encoding='utf-8')).get(g['tarih']) == ozet(g, govde)


if __name__ == '__main__':
    sys.path.insert(0, str(KOK / 'takvim'))
    from govde import GOVDE
    a = argparse.ArgumentParser()
    a.add_argument('--damgala', action='store_true'); a.add_argument('--durum', action='store_true')
    a.add_argument('--baslangic', default='0000'); a.add_argument('--bitis', default='9999')
    arg = a.parse_args()
    plan = json.loads((KOK / 'takvim' / 'yillik-plan.json').read_text(encoding='utf-8'))
    kayit = json.loads(DOSYA.read_text(encoding='utf-8')) if DOSYA.exists() else {}
    if arg.damgala:
        n = 0
        for g in plan:
            if arg.baslangic <= g['tarih'] <= arg.bitis and GOVDE.get(g['baslik']):
                kayit[g['tarih']] = ozet(g, GOVDE[g['baslik']]); n += 1
        DOSYA.write_text(json.dumps(dict(sorted(kayit.items())), ensure_ascii=False, indent=0) + '\n', encoding='utf-8')
        print(f'{n} gün damgalandı.')
    else:
        eksik = [g['tarih'] for g in plan if arg.baslangic <= g['tarih'] <= arg.bitis
                 and kayit.get(g['tarih']) != ozet(g, GOVDE.get(g['baslik']))]
        print(f'Damgasız ya da değişmiş {len(eksik)} gün:', ' '.join(eksik[:40]))
