"""
Sertifika PDF'lerini sitede yayımlanabilir görsele çevirir; kişisel veriyi siler.

    python belge-uret/maskele.py <pdf-klasoru>

Çıktı: public/belgeler/<ad>.jpg (büyük) ve <ad>-kucuk.jpg (şerit için).
Orijinal PDF'ler depoya girmez; yalnız bu betiğin ürettiği görseller girer.

Silinenler (metin katmanından tamamen, üstü boyanmaz):
  · 11 haneli TC kimlik numarası
  · Anne ve baba adı (MEB belgelerindeki tablo)
  · "İbrahim" ön adı (ad soyad geçen her yerde)
  · Karekod: e-Devlet karekodu barkodun yanında TC kimlik numarasını da taşır.
Barkod numarası kalır; tek başına kişisel veri değildir.

Yeni bir belge türü gelirse (ör. diploma) önce çıktıyı gözle kontrol edin:
betik son adımda metinde TC / ön ad / karekod kalıp kalmadığını denetler.
"""
import re
import sys
from pathlib import Path

import cv2
import numpy as np
import pymupdf

sys.stdout.reconfigure(encoding='utf-8')
KOK = Path(__file__).resolve().parent.parent
CIKTI = KOK / 'public' / 'belgeler'
YAZI = {
    'serif': 'C:/Windows/Fonts/times.ttf',
    'sans': 'C:/Windows/Fonts/arialbd.ttf',
}

# PDF dosya adı → sitedeki görsel adı
ADLAR = {
    'bilisel': 'bdt',
    'ema': 'sema',
    'emdr': 'emdr',
    'evlilik': 'cift-terapisi',
    'ingilizce': 'ingilizce-a2',
    'zel eitim': 'ozel-egitim',
    'diploma': 'diploma',
}

TC = re.compile(r'\b\d{11}\b')
ON_AD = re.compile(r'İ(brahim|BRAHİM)\s+')


def spanlar(sayfa):
    for b in sayfa.get_text('dict')['blocks']:
        for l in b.get('lines', []):
            for s in l['spans']:
                if s['text'].strip():
                    yield s


def karekodlar(sayfa):
    """Karekodların sayfa koordinatındaki dikdörtgenleri."""
    olcek = 300 / 72
    pix = sayfa.get_pixmap(dpi=300)
    img = np.frombuffer(pix.samples, np.uint8).reshape(pix.h, pix.w, pix.n)[:, :, :3].copy()
    ok, _, noktalar, _ = cv2.QRCodeDetector().detectAndDecodeMulti(img)
    if not ok:
        return []
    kutular = []
    for n in noktalar:
        x0, y0 = n.min(axis=0) / olcek
        x1, y1 = n.max(axis=0) / olcek
        kutular.append(pymupdf.Rect(x0, y0, x1, y1) + (-4, -4, 4, 4))
    return kutular


def maskele(sayfa):
    ss = list(spanlar(sayfa))
    yeniden = []  # (span, yeni metin)

    # Anne/baba adı: etiketle aynı satırdaki değer hücresi
    etiket_y = [s['bbox'][1] for s in ss if s['text'].strip() in ('ANNE ADI', 'BABA ADI')]

    for s in ss:
        t = s['text']
        r = pymupdf.Rect(s['bbox'])
        if TC.search(t):
            yeniden.append((s, TC.sub('•' * 11, t)))
        elif ON_AD.search(t):
            yeniden.append((s, ON_AD.sub('', t)))
        elif any(abs(r.y0 - y) < 2 for y in etiket_y) and t.strip() not in ('ANNE ADI', 'BABA ADI') and r.x0 < 250:
            yeniden.append((s, '•••••'))

    for s, _ in yeniden:
        sayfa.add_redact_annot(pymupdf.Rect(s['bbox']))
    sayfa.apply_redactions(images=pymupdf.PDF_REDACT_IMAGE_NONE, graphics=pymupdf.PDF_REDACT_LINE_ART_NONE)

    # Karekod: pikselleri ve çizgileri sil, yerine not yaz
    kodlar = karekodlar(sayfa)
    for k in kodlar:
        sayfa.add_redact_annot(k, fill=(1, 1, 1))
    if kodlar:
        sayfa.apply_redactions(images=pymupdf.PDF_REDACT_IMAGE_PIXELS, graphics=pymupdf.PDF_REDACT_LINE_ART_REMOVE_IF_TOUCHED)
    for k in kodlar:
        sayfa.insert_textbox(k + (-6, 0, 6, 0), '\n\nKarekod\nkişisel veri\niçerdiği için\nkaldırıldı',
                             fontsize=6, fontname='sans', fontfile=YAZI['sans'], color=(0.45, 0.45, 0.45), align=1)

    # Değişen satırları aynı yazı tipi, boyut ve renkle geri yaz
    for s, metin in yeniden:
        tur = 'serif' if 'Serif' in s['font'] or 'Times' in s['font'] else 'sans'
        font = pymupdf.Font(fontfile=YAZI[tur])
        c = s['color']
        renk = ((c >> 16 & 255) / 255, (c >> 8 & 255) / 255, (c & 255) / 255)
        x, y = s['origin']
        eski_orta = (s['bbox'][0] + s['bbox'][2]) / 2
        genislik = font.text_length(metin, s['size'])
        # Ortalanmış satırlar (ör. sertifikadaki ad) ortada kalsın
        if abs(eski_orta - sayfa.rect.width / 2) < 30:
            x = sayfa.rect.width / 2 - genislik / 2
        sayfa.insert_text((x, y), metin, fontsize=s['size'], fontname=tur, fontfile=YAZI[tur], color=renk)


def denetle(sayfa, ad):
    metin = sayfa.get_text()
    sorun = []
    if TC.search(metin):
        sorun.append('TC kimlik numarası')
    if ON_AD.search(metin):
        sorun.append('ön ad')
    if karekodlar(sayfa):
        sorun.append('karekod')
    if sorun:
        sys.exit(f'✗ {ad}: hâlâ duruyor → {", ".join(sorun)}')


def gorsel(sayfa, yol, genislik):
    pix = sayfa.get_pixmap(matrix=pymupdf.Matrix(genislik / sayfa.rect.width, genislik / sayfa.rect.width))
    img = np.frombuffer(pix.samples, np.uint8).reshape(pix.h, pix.w, pix.n)[:, :, :3]
    cv2.imwrite(str(yol), cv2.cvtColor(img, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 84])


def main():
    kaynak = Path(sys.argv[1] if len(sys.argv) > 1 else '../sertifikalar')
    CIKTI.mkdir(parents=True, exist_ok=True)
    for pdf in sorted(kaynak.glob('*.pdf')):
        ad = next((v for k, v in ADLAR.items() if k in pdf.name.lower()), pdf.stem)
        belge = pymupdf.open(pdf)
        sayfa = belge[0]
        maskele(sayfa)
        denetle(sayfa, pdf.name)
        gorsel(sayfa, CIKTI / f'{ad}.jpg', 1600)
        gorsel(sayfa, CIKTI / f'{ad}-kucuk.jpg', 560)
        print(f'✓ {pdf.name} → {ad}.jpg')


if __name__ == '__main__':
    main()
