from PIL import Image, ImageDraw, ImageFont
import math, os

W, H = 2560, 1440
# YouTube safe areas (centered)
SAFE_W, SAFE_H = 1546, 423          # mobil / her cihaz
TAB_W = 1855                         # tablet
DESK_W = 2560                        # masaustu band genisligi
SX0, SY0 = (W - SAFE_W) // 2, (H - SAFE_H) // 2   # 507, 508
SX1, SY1 = SX0 + SAFE_W, SY0 + SAFE_H             # 2053, 931
CY = H // 2

BG      = (15, 21, 32)
BG2     = (17, 24, 42)
INK     = (233, 238, 247)
MUTED   = (139, 155, 184)
FAINT   = (44, 56, 82)
AMBER   = (255, 194, 74)
AMBER_D = (214, 154, 44)
BLUE    = (74, 128, 240)

BR = os.path.join(os.path.dirname(__file__), 'fontlar', 'Bricolage.ttf')
KA = os.path.join(os.path.dirname(__file__), 'fontlar', 'Karla.ttf')

def bric(size, weight=700, width=100, opsz=96):
    f = ImageFont.truetype(BR, size)
    f.set_variation_by_axes([min(opsz, 96), weight, width])
    return f

def karla(size, weight=400):
    f = ImageFont.truetype(KA, size)
    f.set_variation_by_axes([weight])
    return f

def canvas(bg=BG):
    return Image.new('RGB', (W, H), bg)

def glow(img, cx, cy, rx, ry, color, alpha=40):
    """Kucuk olcekte cizilip buyutulen yumusak radyal isik (halka olusmaz)."""
    from PIL import ImageFilter
    s = 8
    m = Image.new('L', (W // s, H // s), 0)
    md = ImageDraw.Draw(m)
    md.ellipse([(cx - rx) / s, (cy - ry) / s, (cx + rx) / s, (cy + ry) / s], fill=alpha)
    m = m.filter(ImageFilter.GaussianBlur(rx / s / 2.2)).resize((W, H), Image.BICUBIC)
    img.paste(Image.new('RGB', (W, H), color), (0, 0), m)


def vignette(img, strength=26):
    glow(img, W // 2, CY, 1500, 820, (36, 48, 76), strength)

def stroke(d, p0, p1, w, color):
    """Yuvarlak uclu cizgi."""
    d.line([p0, p1], fill=color, width=w)
    r = w / 2
    for (x, y) in (p0, p1):
        d.ellipse([x - r, y - r, x + r, y + r], fill=color)

def monogram(d, x, y, h, amber=AMBER, ink=INK):
    """KH monogrami: K'nin kollari H'nin sol bacaginda bitiyor, ortak dikey amber.
    (x, y) sol ust kose, h yukseklik."""
    w = h * 0.16
    top, bot = y, y + h
    sx = x + w / 2                    # K govdesi
    mx = x + h * 0.72                 # ortak dikey (K kol ucu = H sol bacak)
    rx = x + h * 1.37                 # H sag bacak
    my = y + h * 0.5
    stroke(d, (sx, top), (sx, bot), int(w), ink)                # K govde
    stroke(d, (sx + w * 0.15, my), (mx, top), int(w), ink)      # K ust kol
    stroke(d, (sx + w * 0.15, my), (mx, bot), int(w), ink)      # K alt kol
    stroke(d, (mx, my), (rx, my), int(w), ink)                  # H orta cizgi
    stroke(d, (rx, top), (rx, bot), int(w), ink)                # H sag bacak
    stroke(d, (mx, top), (mx, bot), int(w), amber)              # ortak dikey (en ustte)
    return rx + w / 2


def bez(p0, p1, p2, p3, n=90):
    pts = []
    for i in range(n + 1):
        t = i / n
        mt = 1 - t
        x = mt**3*p0[0] + 3*mt*mt*t*p1[0] + 3*mt*t*t*p2[0] + t**3*p3[0]
        y = mt**3*p0[1] + 3*mt*mt*t*p1[1] + 3*mt*t*t*p2[1] + t**3*p3[1]
        pts.append((x, y))
    return pts

def polyline(d, pts, w, color):
    d.line(pts, fill=color, width=w, joint='curve')
    r = w / 2
    for (x, y) in (pts[0], pts[-1]):
        d.ellipse([x - r, y - r, x + r, y + r], fill=color)

def text(d, xy, s, font, fill, anchor='la'):
    d.text(xy, s, font=font, fill=fill, anchor=anchor)

def rrect(d, box, r, fill=None, outline=None, width=2):
    d.rounded_rectangle(box, radius=r, fill=fill, outline=outline, width=width)
