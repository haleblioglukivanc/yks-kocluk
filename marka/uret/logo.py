from PIL import Image, ImageDraw, ImageFont
import os
OUT = os.path.join(os.path.dirname(__file__), '..')
INK, KOYU, AMBER = '#E8EDF7', '#0D1220', '#F5B23C'

SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -8 106 116" width="106" height="116" role="img" aria-label="KH monogram">
  <title>Kıvanç Hoca ile Eğitim Koçluğu — KH monogramı</title>
  <g fill="none" stroke-width="16" stroke-linecap="round">
    <path d="M8 0V100" stroke="{ink}"/>
    <path d="M10.4 50L50 0" stroke="{ink}"/>
    <path d="M10.4 50L50 100" stroke="{ink}"/>
    <path d="M50 50H98" stroke="{ink}"/>
    <path d="M98 0V100" stroke="{ink}"/>
    <path d="M50 0V100" stroke="{amber}"/>
  </g>
</svg>
"""
open(f'{OUT}/logo-kh.svg', 'w').write(SVG.format(ink=INK, amber=AMBER))
open(f'{OUT}/logo-kh-acik-zemin.svg', 'w').write(SVG.format(ink=KOYU, amber=AMBER))

def hx(c):
    c = c.lstrip('#'); return tuple(int(c[i:i+2], 16) for i in (0, 2, 4))

def ciz(d, olc, ox, oy, ink, amber):
    kal = int(16 * olc); r = kal / 2
    def L(p0, p1, renk):
        a = (ox + p0[0]*olc, oy + p0[1]*olc); b = (ox + p1[0]*olc, oy + p1[1]*olc)
        d.line([a, b], fill=renk, width=kal)
        for p in (a, b):
            d.ellipse([p[0]-r, p[1]-r, p[0]+r, p[1]+r], fill=renk)
    L((8, 0), (8, 100), ink)
    L((10.4, 50), (50, 0), ink)
    L((10.4, 50), (50, 100), ink)
    L((50, 50), (98, 50), ink)
    L((98, 0), (98, 100), ink)
    L((50, 0), (50, 100), amber)

def png(path, ink, hedef_h=1024):
    s = hedef_h / 116 * 4
    W, H = int(106 * s), int(116 * s)
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ciz(ImageDraw.Draw(img), s, 0, 8 * s, hx(ink) + (255,), hx(AMBER) + (255,))
    img.resize((int(106 * hedef_h / 116), hedef_h), Image.LANCZOS).save(path)

png(f'{OUT}/logo-kh.png', INK)
png(f'{OUT}/logo-kh-acik-zemin.png', KOYU)

# profil gorselleri (kare, dairesel kirpmaya uygun)
def profil(path, zemin, ink, boy=1080, h_oran=0.44):
    s = 3; P = boy * s
    img = Image.new('RGB', (P, P), hx(zemin))
    olc = boy * h_oran * s / 100
    ciz(ImageDraw.Draw(img), olc, (P - 106 * olc) / 2, (P - 100 * olc) / 2, hx(ink), hx(AMBER))
    img.resize((boy, boy), Image.LANCZOS).save(path)

profil(f'{OUT}/profil-1080-koyu.png', KOYU, INK)
profil(f'{OUT}/profil-1080-acik.png', '#FFFFFF', KOYU)
profil(f'{OUT}/profil-800-koyu.png', KOYU, INK, 800)

# yatay kilit
def bric(size, weight=700):
    f = ImageFont.truetype(os.path.join(os.path.dirname(__file__), 'fontlar', 'Bricolage.ttf'), size); f.set_variation_by_axes([96, weight, 100]); return f

def kilit(path, ink):
    s = 3; h = 120 * s; olc = h / 100
    ad = 'Kıvanç Hoca ile Eğitim Koçluğu'
    f = bric(int(96 * s)); tw = f.getlength(ad); pad = 40 * s
    W = int(106 * olc + pad + tw + 8); H = int(h + 40 * s)
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    ciz(d, olc, 0, (H - h) / 2, hx(ink) + (255,), hx(AMBER) + (255,))
    d.text((106 * olc + pad, H / 2), ad, font=f, fill=hx(ink) + (255,), anchor='lm')
    img.resize((W // s, H // s), Image.LANCZOS).save(path)

kilit(f'{OUT}/logo-yatay.png', INK)
kilit(f'{OUT}/logo-yatay-acik-zemin.png', KOYU)
print('ok')

# --- video filigrani (YouTube, 150x150, seffaf zemin) ----------------------
def filigran(path, ink, boy=150, h_oran=0.52, daire=None, golge=True):
    """Oynaticinin sag alt kosesinde duran isaret. Zemin seffaf; video acik
    renkliyse harfler kaybolmasin diye altina yumusak golge konur."""
    from PIL import ImageFilter
    s = 6; P = boy * s
    img = Image.new('RGBA', (P, P), (0, 0, 0, 0))
    if daire:
        ImageDraw.Draw(img).ellipse([0, 0, P - 1, P - 1], fill=hx(daire) + (225,))
    olc = boy * h_oran * s / 100
    ox, oy = (P - 106 * olc) / 2, (P - 100 * olc) / 2
    if golge and not daire:
        g = Image.new('RGBA', (P, P), (0, 0, 0, 0))
        ciz(ImageDraw.Draw(g), olc, ox, oy + 2 * s, (0, 0, 0, 190), (0, 0, 0, 190))
        img.alpha_composite(g.filter(ImageFilter.GaussianBlur(3 * s)))
    ciz(ImageDraw.Draw(img), olc, ox, oy, hx(ink) + (255,), hx(AMBER) + (255,))
    img.resize((boy, boy), Image.LANCZOS).save(path)

filigran(f'{OUT}/filigran-150-seffaf.png', '#FFFFFF')
filigran(f'{OUT}/filigran-150-daire.png', INK, daire=KOYU, h_oran=0.44)
print('filigran ok')
