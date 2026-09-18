"""Bir yıllık içerik takvimi: 19 Eylül 2026 – 18 Eylül 2027, her gün bir video.

    python3 sosyal/takvim/uret.py  ->  yillik-plan.json + yillik-plan.csv

Her gün için: seri, konu, kanca (ilk kare), kitle, mevsim/ruh hali, gün batımı,
platform başına yayın saati ve hashtag, özel gün ve hassasiyet notu,
YKS/LGS geri sayımı. Tarihler 'kesin' ya da 'tahmini' diye işaretlidir.
"""
import csv, json, math, pathlib
from datetime import date, timedelta
from bankalar import PLAN, TAKTIK, AYNI_HAFTA, VELI, EFSANE, DENEME, PAZAR, MEVSIM

BURASI = pathlib.Path(__file__).resolve().parent
BAS, BIT = date(2026, 9, 19), date(2027, 9, 18)

# ── Konum: Tarsus (gün batımı / iftar saati buradan hesaplanır) ──────────────
ENLEM, BOYLAM, UTC = 36.918, 34.895, 3

def gun_batimi(g, enlem=ENLEM, boylam=BOYLAM):
    """NOAA yaklaşımı; ±2 dk. Dönüş: 'SS:DD' yerel saat."""
    n = g.timetuple().tm_yday
    gam = 2 * math.pi / 365 * (n - 1)
    eqt = 229.18 * (0.000075 + 0.001868*math.cos(gam) - 0.032077*math.sin(gam)
                    - 0.014615*math.cos(2*gam) - 0.040849*math.sin(2*gam))
    dek = (0.006918 - 0.399912*math.cos(gam) + 0.070257*math.sin(gam) - 0.006758*math.cos(2*gam)
           + 0.000907*math.sin(2*gam) - 0.002697*math.cos(3*gam) + 0.00148*math.sin(3*gam))
    la = math.radians(enlem)
    ha = math.degrees(math.acos(math.cos(math.radians(90.833)) / (math.cos(la)*math.cos(dek))
                                - math.tan(la)*math.tan(dek)))
    dk = 720 - 4*(boylam - ha) - eqt + UTC*60
    return int(dk // 60), int(dk % 60)


# ── Takvim: resmi (MEB) ve tahmini (ÖSYM/MEB sınav, dini günler) ─────────────
def aralik(a, b):
    g = a
    while g <= b:
        yield g; g += timedelta(1)

YKS = date(2027, 6, 19)          # tahmini: ÖSYM 2027 takvimi henüz yok (19–20 Haziran bekleniyor)
LGS = date(2027, 6, 13)          # tahmini: MEB açıklamadı (haziranın 2. hafta sonu bekleniyor)
TATIL = set()
for a, b in [((2026,11,14),(2026,11,22)), ((2027,1,23),(2027,2,7)), ((2027,3,6),(2027,3,14)),
             ((2027,6,26),(2027,9,12))]:        # MEB resmi + hafta sonları; yaz: okul açılışı tahmini
    TATIL |= set(aralik(date(*a), date(*b)))
RAMAZAN = set(aralik(date(2027, 2, 8), date(2027, 3, 8)))     # tahmini; bayram 9–11 Mart
BAYRAM = {date(2027,3,9), date(2027,3,10), date(2027,3,11),
          date(2027,5,16), date(2027,5,17), date(2027,5,18), date(2027,5,19)}
RESMI_TATIL = {date(2026,10,29), date(2027,1,1), date(2027,4,23), date(2027,5,1),
               date(2027,5,19), date(2027,7,15), date(2027,8,30)} | BAYRAM
TATIL |= RESMI_TATIL

# Özel günler: tarih -> (başlık, kanca, kitle, hassas, kesinlik)
# hassas=True: müzik yok, satış çağrısı yok, sade kart; eğlenceli ton yok.
OZEL = {
 date(2026,9,19): ("İlk deneme bir harita", "İlk denemen not değil. Harita.", "öğrenci", False, "kesin"),
 date(2026,10,10): ("Dünya Ruh Sağlığı Günü", "Sınav kaygısı zayıflık değil. Konuşulur.", "herkes", False, "kesin"),
 date(2026,10,29): ("Cumhuriyet Bayramı", "Cumhuriyetimizin 103. yılı kutlu olsun.", "herkes", False, "kesin"),
 date(2026,11,10): ("10 Kasım", "Saygı ve rahmetle anıyoruz.", "herkes", True, "kesin"),
 date(2026,11,13): ("Ara tatil planı", "9 günlük ara tatil: 3 gün dinlen, 6 gün telafi.", "öğrenci", False, "kesin"),
 date(2026,11,24): ("Öğretmenler Günü", "Bir öğretmenin tek cümlesi bir yılı değiştirebilir.", "herkes", False, "kesin"),
 date(2026,12,1): ("YKS'ye 200 gün", "200 gün. Haftada 7 gün değil, haftada 6 iyi gün.", "öğrenci", False, "tahmini"),
 date(2026,12,21): ("Yılın en uzun gecesi", "Bugün yılın en uzun gecesi. Yarından itibaren günler uzuyor.", "öğrenci", False, "kesin"),
 date(2026,12,31): ("Yılbaşı gecesi", "Bu gece ders yok. Yarın 2027: sınav yılı.", "herkes", False, "kesin"),
 date(2027,1,1): ("2027: sınav yılı", "Yeni yıl, yeni plan değil. Aynı plan, daha sakin.", "öğrenci", False, "kesin"),
 date(2027,1,20): ("YKS'ye 150 gün", "150 gün kaldı. Panik değil, tempo.", "öğrenci", False, "tahmini"),
 date(2027,1,22): ("Karne günü", "Karneye bakmadan önce çocuğunuzun yüzüne bakın.", "veli", False, "kesin"),
 date(2027,1,25): ("Yarıyıl: yılın en değerli 16 günü", "16 gün okul yok. Yılın en değerli bloğu başladı.", "öğrenci", False, "kesin"),
 date(2027,2,6): ("6 Şubat", "Kaybettiklerimizi rahmetle anıyoruz.", "herkes", True, "kesin"),
 date(2027,2,8): ("İkinci dönem ve Ramazan", "İkinci dönem başladı. Ramazanda çalışma saatleri değişir.", "öğrenci", False, "tahmini"),
 date(2027,2,11): ("YKS başvuru dönemi", "Başvuru ayı: kimlik, fotoğraf, ücret. Son güne bırakmayın.", "veli", False, "tahmini"),
 date(2027,3,8): ("Arife ve ara tatil", "Bayram ve ara tatil birleşti. Her gün 1 saat kural.", "öğrenci", False, "tahmini"),
 date(2027,3,9): ("Ramazan Bayramı", "Bayramınız mübarek olsun.", "herkes", False, "tahmini"),
 date(2027,3,11): ("YKS'ye 100 gün", "100 gün. Yeni konu değil, tekrar zamanı başlıyor.", "öğrenci", False, "tahmini"),
 date(2027,3,21): ("Gün geceyi geçti", "Bugünden sonra gündüz geceden uzun. Işık senden yana.", "öğrenci", False, "kesin"),
 date(2027,4,23): ("23 Nisan", "23 Nisan kutlu olsun. LGS'ye hazırlanan çocuklarımıza.", "herkes", False, "kesin"),
 date(2027,4,30): ("YKS'ye 50 gün", "50 gün. Her gün bir deneme değil, her gün bir analiz.", "öğrenci", False, "tahmini"),
 date(2027,5,9): ("Anneler Günü", "Sınav yılının görünmeyen koçu: anneler.", "herkes", False, "kesin"),
 date(2027,5,15): ("Kurban arifesi: 5 günlük ara", "5 gün tatil: 2 gün aile, 3 gün düzenli tekrar.", "öğrenci", False, "tahmini"),
 date(2027,5,16): ("Kurban Bayramı", "Bayramınız mübarek olsun.", "herkes", False, "tahmini"),
 date(2027,5,19): ("19 Mayıs", "Gençlik ve Spor Bayramı kutlu olsun. Bu yıl sizin yılınız.", "herkes", False, "kesin"),
 date(2027,5,20): ("YKS'ye 30 gün", "30 gün. Uyku saatini sınav saatine göre ayarla.", "öğrenci", False, "tahmini"),
 date(2027,6,9): ("YKS'ye 10 gün", "10 gün. Yeni hiçbir şey. Sadece bildiklerin.", "öğrenci", False, "tahmini"),
 date(2027,6,12): ("LGS'ye bir gün", "Yarın LGS. Bu akşam çanta, kimlik, erken yatak.", "veli", False, "tahmini"),
 date(2027,6,13): ("LGS günü", "Bugün çocuklarımızın günü. Sonuç ne olursa olsun, yanlarındayız.", "veli", False, "tahmini"),
 date(2027,6,18): ("Yarın TYT", "Yarın TYT. Bu gece çalışma. Uyu.", "öğrenci", False, "tahmini"),
 date(2027,6,19): ("TYT günü", "Bugün hazırlığın konuşuyor. Sakin ol, sırayla git.", "öğrenci", False, "tahmini"),
 date(2027,6,20): ("AYT günü ve Babalar Günü", "Son oturum. Ve bugün Babalar Günü.", "herkes", False, "tahmini"),
 date(2027,6,21): ("Sınav bitti", "Bitti. Şimdi dinlen. Sonuç beklemek de bir iş.", "öğrenci", False, "tahmini"),
 date(2027,6,25): ("Karne ve 11. sınıflar", "11. sınıf bitti. YKS 2028'e bir yıl.", "öğrenci", False, "kesin"),
 date(2027,7,14): ("Sonuç haftası", "Sonuç yaklaşıyor. Bekleme kaygısı normal.", "herkes", False, "tahmini"),
 date(2027,7,15): ("15 Temmuz", "Demokrasi ve Millî Birlik Günü.", "herkes", True, "kesin"),
 date(2027,7,21): ("Tercih dönemi", "Tercih listesi: şehir, bölüm, puan, sen. Bu sırayla değil.", "veli", False, "tahmini"),
 date(2027,8,26): ("Yerleştirme sonuçları", "Sonuç ne olursa olsun, bir sonraki adım var.", "herkes", False, "tahmini"),
 date(2027,8,30): ("Zafer Bayramı", "30 Ağustos Zafer Bayramı kutlu olsun.", "herkes", False, "kesin"),
 date(2027,9,13): ("Yeni ders yılı", "Yeni yıl. YKS 2028 bugün başlıyor.", "öğrenci", False, "tahmini"),
}

SERI = {  # haftanın günü -> (seri adı, banka, kitle, video şablonu)
 0: ("Haftanın Planı", PLAN, "öğrenci", "kart-liste"),
 1: ("Ders Taktiği", TAKTIK, "öğrenci", "soru-cozum"),
 2: ("Aynı Hafta", AYNI_HAFTA, "öğrenci", "yazisma"),
 3: ("Veli Köşesi", VELI, "veli", "kart-veli"),
 4: ("Doğru Bilinen Yanlışlar", EFSANE, "öğrenci", "efsane-gercek"),
 5: ("Deneme Günü", DENEME, "öğrenci", "kart-liste"),
 6: ("Sınav Psikolojisi", PAZAR, "öğrenci", "tek-cumle"),   # pazar akşamı; uzman (PDR) imzalı
}

# ── Mevsim ve ruh hali ──────────────────────────────────────────────────────
AY_RUH = {
 9: ("Yeni başlangıç", "Heves yüksek, plan kaygısı var. Düzen kurma zamanı."),
 10: ("Ritim", "İlk deneme şoku, ritim oturuyor. Günler kısalmaya başladı."),
 11: ("Kasım düşüşü", "Karanlık erken, ilk yorgunluk. Ara tatil nefes aldırır."),
 12: ("Kış dibi", "Yılın en karanlık haftaları. Motivasyon dipte; küçük hedef, sıcak ton."),
 1: ("Karne ve toparlanma", "Karne kaygısı, sonra yarıyılın 16 günlük fırsatı."),
 2: ("Gerçeklik", "İkinci dönem, başvuru ayı, Ramazan. Sınav artık gerçek."),
 3: ("Bahar ve 100 gün", "Işık artıyor, bayram ve 100 gün eşiği. Tempo artar."),
 4: ("Bahar yorgunluğu", "Hava güzel, masa zor. Net platosu. Sabır tonu."),
 5: ("Son düzlük", "Panik ve yoğunluk. Uzun bayram tatili. Sakinleştirici ton."),
 6: ("Sınav ayı", "LGS ve YKS. Sade, kısa, sakin mesajlar."),
 7: ("Bekleme ve tercih", "Sonuç kaygısı, tercih. Veli içerikleri öne çıkar. Yeni 12'ler başlar."),
 8: ("Yaz ve yeni hedef", "Yerleştirme sonuçları; YKS 2028 için yaz düzeni."),
}

def ruh_hali(g, gb):
    ad, aciklama = AY_RUH[g.month]
    dk = gb[0]*60 + gb[1]
    isik = "karanlık erken (%02d:%02d)" % gb if dk < 17*60+30 else ("uzun gün (%02d:%02d)" % gb if dk > 19*60+30 else "gün batımı %02d:%02d" % gb)
    return ad, aciklama, isik

# ── Yayın saatleri ──────────────────────────────────────────────────────────
# Başlangıç varsayımı; ilk 4 haftanın Buffer ölçümleriyle ayarlanır.
# ig=Instagram, tt=TikTok, yt=YouTube
SAAT = {
 "okul":      {"ig": "20:30", "tt": "21:30", "yt": "19:30"},  # okul çıkışı + akşam yemeği sonrası
 "cumartesi": {"ig": "13:00", "tt": "14:30", "yt": "12:30"},  # deneme sabahı bitince
 "pazar":     {"ig": "20:00", "tt": "21:00", "yt": "19:00"},  # pazar akşamı kaygı saati
 "tatil":     {"ig": "21:30", "tt": "22:30", "yt": "20:30"},  # geç yatılan günler
 "veli":      {"ig": "21:00", "tt": "20:30", "yt": "20:00"},  # veliler: akşam yemeği sonrası
 "bayram":    {"ig": "11:00", "tt": "13:00", "yt": "11:00"},  # bayramlaşma sonrası, kısa
}
def saatler(g, kitle, gb):
    if g in BAYRAM:
        s = dict(SAAT["bayram"]); tur = "bayram"
    elif g in RAMAZAN:          # iftardan (gün batımı) sonra
        dk = gb[0]*60 + gb[1]
        f = lambda e: "%02d:%02d" % divmod(dk + e, 60)
        s = {"ig": f(120), "tt": f(150), "yt": f(90)}; tur = "ramazan"
    elif kitle == "veli":
        s = dict(SAAT["veli"]); tur = "veli"
    elif g in TATIL:
        s = dict(SAAT["tatil"]); tur = "tatil"
    elif g.weekday() == 5:
        s = dict(SAAT["cumartesi"]); tur = "cumartesi"
    elif g.weekday() == 6:
        s = dict(SAAT["pazar"]); tur = "pazar"
    else:
        s = dict(SAAT["okul"]); tur = "okul"
    return s, tur

# ── Hashtag'ler ─────────────────────────────────────────────────────────────
def kucuk(t):
    return t.replace("I", "ı").replace("İ", "i").lower()

def etiketler(g, seri, kitle, ders=None, hassas=False):
    if hassas:                                   # anma günlerinde etiket yok
        return {"ig": [], "tt": [], "yt": []}
    yil = "#yks2027" if g <= YKS + timedelta(1) else "#yks2028"   # kohort değişimi
    ana = [yil, "#yks"]
    hafta = hafta_no(g)
    havuz = {
     "Haftanın Planı": ["#dersprogramı", "#verimliçalışma", "#çalışmaplanı", "#planlıçalışma", "#zamanyönetimi"],
     "Ders Taktiği": ["#soruçözümü", "#derstaktikleri", "#tytkampı", "#konuanlatımı", "#sorubankası"],
     "Aynı Hafta": ["#öğrencihayatı", "#sınavstresi", "#yksmotivasyon", "#sınavkaygısı", "#öğrenci"],
     "Veli Köşesi": ["#veli", "#sınavyılı", "#ebeveyn", "#anneyiz", "#velirehberi"],
     "Doğru Bilinen Yanlışlar": ["#dersçalışma", "#doğrubilinenyanlışlar", "#çalışmayöntemleri", "#bilgi", "#verimliçalışma"],
     "Deneme Günü": ["#denemesınavı", "#netartırma", "#tytdeneme", "#denemeanalizi", "#türkiyegenelideneme"],
     "Sınav Psikolojisi": ["#sınavkaygısı", "#psikoloji", "#motivasyon", "#sınavpsikolojisi", "#pdr", "#yksmotivasyon"],
     "Özel Gün": ["#motivasyon", "#eğitim", "#öğrenci", "#yks"],
    }[seri]
    seri_et = [havuz[(hafta + i) % len(havuz)] for i in range(2)]
    if g.weekday() == 3:                         # perşembe: yerel keşif için konum etiketi
        seri_et = seri_et[:1] + ["#mersin"]
    if ders:
        seri_et = ["#" + kucuk(ders.split()[-1])] + seri_et[:1]
        if ders.startswith("LGS"):
            ana = ["#lgs2027" if g <= LGS else "#lgs2028", "#lgs"]
    if kitle == "veli":
        ana = [yil, "#lgs"]
    return {
        "ig": ana + seri_et + ["#eğitimkoçluğu"],       # Instagram: 5 alakalı etiket
        "tt": ana + seri_et + ["#keşfet"],              # TikTok: 5 etiket, biri keşif
        "yt": [ana[0], seri_et[0], "#Shorts"],          # YouTube: başlığın üstünde bu üçü görünür
    }

def sec(banka, kullanilan, ay):
    """Önce bu aya ait mevsimlik konu, yoksa sıradaki yıl boyu konu."""
    baslik = lambda o: o[-2]
    bos = [i for i in range(len(banka)) if i not in kullanilan]
    if not bos:
        kullanilan.clear(); bos = list(range(len(banka)))
    mevsimlik = [i for i in bos if ay in MEVSIM.get(baslik(banka[i]), ())]
    genel = [i for i in bos if baslik(banka[i]) not in MEVSIM]
    i = (mevsimlik or genel or bos)[0]
    kullanilan.add(i)
    return banka[i]

# ── Üret ────────────────────────────────────────────────────────────────────
def hafta_no(g):
    """Pazartesiden başlayan hafta sayısı (14 Eylül 2026 haftası = 0)."""
    return (g - date(2026, 9, 14)).days // 7

TEMA_SIRA = ["gece", "krem", "orman", "murdum", "gok"]   # her hafta bir tema: profil ızgarası düzenli, akış çeşitli
SORU = {
 "Haftanın Planı": ["Bu haftanın 3 işi ne? Yaz, cuma soralım.", "En verimli saatin hangisi?", "Bu hafta neyi bırakıyorsun?"],
 "Ders Taktiği": ["Bu taktiği dene, sonucu yaz.", "Sıradaki taktik hangi dersten olsun?", "Senin bu konudaki taktiğin ne?"],
 "Aynı Hafta": ["Sen olsan koça ne yazardın?", "Bu mesaj sana tanıdık geldi mi?", "Koç doğru mu söyledi? Yaz."],
 "Veli Köşesi": ["Evde işe yarayan tek cümleniz ne?", "Sizce en zor kısmı ne?", "Bir sonraki veli konusu ne olsun?"],
 "Doğru Bilinen Yanlışlar": ["Sen de buna inanıyor muydun? Evet ya da hayır.", "Başka hangi efsaneyi çürütelim?", "Sence doğru mu? Yaz."],
 "Deneme Günü": ["Bugünkü netin kaç? Sadece rakam.", "En çok hangi derste boş bıraktın?", "Denemeye kaçta başladın?"],
 "Sınav Psikolojisi": ["Bu haftanı tek kelimeyle yaz.", "Bu hafta seni ne iyi hissettirdi?", "Yarının ilk işi ne?"],
}

def uret():
    kullanilan = {k: set() for k in SERI}
    satirlar = []
    for g in aralik(BAS, BIT):
        gb = gun_batimi(g)
        wd = g.weekday()
        seri, banka, kitle, sablon = SERI[wd]
        ders = None
        if g in OZEL:
            baslik, kanca, kitle, hassas, kesinlik = OZEL[g]
            seri, sablon = "Özel Gün", ("sade-kart" if hassas else "tek-cumle")
        else:
            hassas, kesinlik = False, "kesin"
            oge = sec(banka, kullanilan[wd], g.month)
            if len(oge) == 3: ders, baslik, kanca = oge
            else: baslik, kanca = oge
        mevsim, ruh, isik = ruh_hali(g, gb)
        saat, gun_turu = saatler(g, kitle, gb)
        if hassas:
            saat = {"ig": "09:05", "tt": "09:05", "yt": "09:05"} if g == date(2026,11,10) else {"ig": "10:00", "tt": "10:00", "yt": "10:00"}
        et = etiketler(g, seri, kitle, ders, hassas)
        satirlar.append({
            "tarih": g.isoformat(), "gun": "Pzt Sal Çar Per Cum Cmt Paz".split()[wd],
            "seri": seri, "ders": ders or "", "baslik": baslik, "kanca": kanca,
            "kitle": kitle, "sablon": sablon, "hassas": hassas, "kesinlik": kesinlik,
            "mevsim": mevsim, "ruh_hali": ruh, "isik": isik, "gun_batimi": "%02d:%02d" % gb,
            "gun_turu": gun_turu, "saat": saat, "etiket": et,
            "yks_kalan": (YKS - g).days if g <= YKS else None,
            "lgs_kalan": (LGS - g).days if g <= LGS else None,
            "ramazan": g in RAMAZAN, "tatil": g in TATIL,
            "cta": "" if hassas else ("Tanışma görüşmesi: khkocluk.com" if wd in (3, 6) else "Takip et, her gün bir tane."),
            "muzik": not hassas and seri != "Veli Köşesi" and not (seri == "Sınav Psikolojisi" and hafta_no(g) % 2),
            "tema": "gece" if hassas else TEMA_SIRA[hafta_no(g) % len(TEMA_SIRA)],
            "soru": "" if (hassas or seri == "Özel Gün") else SORU[seri][hafta_no(g) % len(SORU[seri])],
        })
    return satirlar

if __name__ == "__main__":
    s = uret()
    (BURASI / "yillik-plan.json").write_text(json.dumps(s, ensure_ascii=False, indent=1), encoding="utf-8")
    with open(BURASI / "yillik-plan.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["tarih","gün","seri","ders","başlık","kanca","kitle","şablon","hassas","kesinlik","mevsim",
                    "ruh hali","ışık","gün batımı","gün türü","IG saat","TikTok saat","YT saat",
                    "IG etiket","TikTok etiket","YT etiket","YKS kalan","LGS kalan"])
        for r in s:
            w.writerow([r["tarih"],r["gun"],r["seri"],r["ders"],r["baslik"],r["kanca"],r["kitle"],r["sablon"],
                        "evet" if r["hassas"] else "",r["kesinlik"],r["mevsim"],r["ruh_hali"],r["isik"],r["gun_batimi"],
                        r["gun_turu"],r["saat"]["ig"],r["saat"]["tt"],r["saat"]["yt"],
                        " ".join(r["etiket"]["ig"])," ".join(r["etiket"]["tt"])," ".join(r["etiket"]["yt"]),
                        r["yks_kalan"] if r["yks_kalan"] is not None else "", r["lgs_kalan"] if r["lgs_kalan"] is not None else ""])
    sayfa = (BURASI / "sablon.html").read_text(encoding="utf-8").replace(
        "/*VERI*/[]", json.dumps(s, ensure_ascii=False, separators=(",", ":")))
    (BURASI / "takvim.html").write_text(sayfa, encoding="utf-8")   # tarayıcıda açılan takvim
    from collections import Counter
    print(len(s), "gün;", Counter(r["seri"] for r in s))
    kullanim = Counter(r["seri"] for r in s if r["seri"] != "Özel Gün")
    print("banka tekrar kontrolü:", {k: (v, len(SERI[[i for i in SERI if SERI[i][0]==k][0]][1])) for k, v in kullanim.items()})
