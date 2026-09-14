from temel import *
from PIL import Image, ImageDraw
import os

TITLE = 'Kıvanç Hoca ile Eğitim Koçluğu'
SITE  = 'KHKOCLUK.COM'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')

# --------------------------------------------------------------- 1: Patika
def v1():
    img = canvas(); vignette(img, 30); d = ImageDraw.Draw(img, 'RGBA')

    # Patika 55 px yukari alindi: duraklarin etiketleri mobil guvenli alanin
    # (alt sinir y=931) icinde kalsin, telefonda kirpilmasin.
    pts = bez((-80, 955), (620, 745), (1280, 955), (2010, 811)) + \
          bez((2010, 811), (2280, 797), (2430, 851), (2640, 823))[1:]
    polyline(d, pts, 6, (34, 44, 66))
    seg = [p for p in pts if 500 <= p[0] <= 2070]
    polyline(d, seg, 7, AMBER_D)

    duraklar = [(700, 'Konu'), (1180, 'Test'), (1640, 'Deneme'), (2010, 'Hedef')]
    fl = karla(30, 600)
    for i, (x, lab) in enumerate(duraklar):
        y = min(pts, key=lambda p: abs(p[0] - x))[1]
        son = i == len(duraklar) - 1
        r = 18 if son else 13
        d.ellipse([x-r-8, y-r-8, x+r+8, y+r+8], fill=BG)
        if son:
            glow(img, x, y, 105, 105, (255, 194, 74), 16)
            d.ellipse([x-r, y-r, x+r, y+r], fill=AMBER)
        else:
            d.ellipse([x-r, y-r, x+r, y+r], fill=BG, outline=AMBER_D, width=5)
        text(d, (x, y + 42), lab, fl, AMBER if son else MUTED, 'ma')

    monogram(d, 560, 512, 96)
    text(d, (560, 630), TITLE, bric(96, 700), INK)
    text(d, (566, 748), 'Haftalık program, deneme analizi ve çalışma düzeni',
         karla(40, 400), MUTED)
    text(d, (2044, 522), SITE, karla(28, 600), (96, 112, 142), 'ra')
    return img

# --------------------------------------------------- 2: Haftalik program
def v2():
    img = canvas(); vignette(img, 24); d = ImageDraw.Draw(img, 'RGBA')

    monogram(d, 560, 534, 98)
    text(d, (560, 676), 'Kıvanç Hoca ile', bric(86, 700), INK)
    text(d, (560, 778), 'Eğitim Koçluğu', bric(86, 700), INK)
    text(d, (566, 888), 'YKS ve LGS hazırlığı   ' + SITE, karla(32, 500), MUTED)

    gunler = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pa']
    plan   = [[120, 70], [90, 150], [170, 60], [110, 100, 60], [70, 180], [200], [90]]
    vurgu  = (3, 1)
    x0, cw, gap, ust = 1540, 52, 20, 596
    fd = karla(26, 600)
    d.line([(0, ust - 16), (W, ust - 16)], fill=(26, 35, 54), width=3)
    d.line([(x0 - 26, ust - 16), (x0 + 7 * cw + 6 * gap + 26, ust - 16)], fill=(46, 60, 88), width=3)
    import random
    random.seed(7)
    for k in range(1, 9):          # guvenli alanin sagina dogru sonen haftalar
        for yon in (1,):
            xx = x0 + 6 * (cw + gap) + k * (cw + gap)
            if xx > W:
                continue
            t = max(0.0, 1 - k / 8)
            yy = ust
            for hgt in random.sample([70, 110, 150, 90, 180], 2):
                rrect(d, [xx, yy, xx + cw, yy + hgt], 14,
                      fill=(int(18 + 18 * t), int(24 + 23 * t), int(38 + 34 * t)))
                yy += hgt + 12
    for i, (g, blocks) in enumerate(zip(gunler, plan)):
        x = x0 + i * (cw + gap)
        text(d, (x + cw / 2, 556), g, fd, AMBER if i == vurgu[0] else (108, 124, 152), 'ma')
        y = ust
        for j, hgt in enumerate(blocks):
            renk = AMBER if (i, j) == vurgu else (36, 47, 72)
            rrect(d, [x, y, x + cw, y + hgt], 14, fill=renk)
            y += hgt + 12
    return img

# ------------------------------------------------------------ 3: Kalem izi
def v3():
    img = canvas(BG2); d = ImageDraw.Draw(img, 'RGBA')
    for i in range(72):
        x = -420 + i * 46
        d.line([(x, 0), (x + 520, H)], fill=(255, 255, 255, 4), width=2)
    glow(img, 1180, CY, 1250, 620, (40, 54, 86), 34)
    d = ImageDraw.Draw(img, 'RGBA')

    f = bric(130, 700)
    text(d, (600, 546), 'Kıvanç Hoca ile', f, INK)
    text(d, (600, 692), 'Eğitim Koçluğu', f, INK)
    w = f.getlength('Eğitim Koçluğu')

    y = 888
    p = bez((598, y + 4), (600 + w * .3, y - 18), (600 + w * .7, y + 20), (600 + w + 30, y - 8))
    for i in range(len(p) - 1):
        t = i / (len(p) - 1)
        d.line([p[i], p[i + 1]], fill=AMBER, width=max(int(17 * (1 - t) + 5 * t), 3))

    monogram(d, 1880, 542, 152)
    text(d, (600, 912), 'YKS ve LGS hazırlığı     ' + SITE, karla(34, 500), MUTED)
    return img

# --------------------------------------------------------- 4: Fotograf yeri
def v4():
    img = canvas()
    glow(img, 1846, 716, 500, 450, (120, 90, 42), 74)
    glow(img, 940, CY, 1100, 600, (32, 43, 70), 34)
    d = ImageDraw.Draw(img, 'RGBA')

    monogram(d, 560, 532, 94)
    text(d, (560, 668), 'Kıvanç Hoca ile', bric(90, 700), INK)
    text(d, (560, 774), 'Eğitim Koçluğu', bric(90, 700), INK)
    text(d, (566, 890), 'YKS ve LGS hazırlığı     ' + SITE, karla(32, 500), MUTED)

    box = [1648, 524, 2044, 928]
    d.arc([box[0] - 92, box[1] - 92, box[2] + 92, box[3] + 92], 28, 318, fill=AMBER_D, width=5)
    rrect(d, box, 34, fill=(20, 28, 48))
    for x in range(box[0] + 16, box[2] - 16, 34):
        d.line([(x, box[1]), (min(x + 18, box[2] - 16), box[1])], fill=(52, 66, 96), width=3)
        d.line([(x, box[3]), (min(x + 18, box[2] - 16), box[3])], fill=(52, 66, 96), width=3)
    for y in range(box[1] + 16, box[3] - 16, 34):
        d.line([(box[0], y), (box[0], min(y + 18, box[3] - 16))], fill=(52, 66, 96), width=3)
        d.line([(box[2], y), (box[2], min(y + 18, box[3] - 16))], fill=(52, 66, 96), width=3)
    cx, cy = (box[0] + box[2]) / 2, box[1] + 214
    d.ellipse([cx - 58, cy - 140, cx + 58, cy - 24], fill=(34, 45, 70))
    d.pieslice([cx - 124, cy, cx + 124, cy + 260], 180, 360, fill=(34, 45, 70))
    text(d, (cx, box[3] - 52), 'Kıvanç’ın fotoğrafı', karla(26, 500), (96, 112, 142), 'ma')
    return img


VAR = [('youtube-patika', v1), ('secenek-program', v2), ('secenek-kalem-izi', v3), ('secenek-fotograf', v4)]
for name, fn in VAR:
    im = fn()
    im.save(f'{OUT}/banner-{name}.png')
print('ok')
