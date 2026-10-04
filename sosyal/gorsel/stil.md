# Görsel stil kuralları (master prompt)

Günlük Shorts'ta her satırın kendi görseli var: kanca + gövde satırları. Görseller her sabah
`sosyal/gorsel.py` ile **Cloudflare Workers AI** üzerinden ücretsiz üretilir (Kıvanç'ın hesabı,
günlük ücretsiz kota). Hepsi aynı görsel evrende durmalı; tutarlılığı bu dosya sağlar.

## Evren
- Gece, bir öğrencinin çalışma köşesi. Sıcak amber masa lambası, koyu lacivert gölgeler.
- 35 mm film görünümü, hafif gren, sığ alan derinliği.
- Her karede **tek bir nesne ya da küçük bir natürmort** — metaforun kendisi (kum saati, pil, merdiven,
  açık defter, kırık kalem…). Satırın anlamını tek bir görüntüye indir.
- 9:16 dikey. Üst ve alt üçte bir sakin, koyu ve boş: yazı oraya gelir.

## Yasaklar (her istemin sonuna eklenir)
- İnsan, yüz, el, beden yok. (Tutarlılık sorunu ve öğrenci mahremiyeti.)
- Yazı, harf, rakam, logo, tabela yok. (Model Türkçe yazamıyor; metin videoda koddan basılır.)
- Çizbi maskotu modele çizdirilmez.

## İstem kalıbı
Kod aşağıdaki bloğu okur; `{nesne}` yerine o satırın görsel tarifi gelir.

```istem
{nesne}. Vertical cinematic photograph, 35mm film look, soft grain, shallow depth of field, a single
subject on a dark wooden study desk at night, warm amber desk-lamp glow, deep navy-blue shadows, moody
and calm, top third and bottom third are dark empty space. No people, no faces, no hands, no text,
no letters, no numbers, no logos.
```

## Satırdan görsele
Llama (aynı hesap, ücretsiz) her satırı tek bir somut nesneye çevirir. Kural: soyut kavram yerine
gözle görülen bir şey ("plan küçülür" → "a thick planner next to a small pocket notebook").
Üretilen istemler `sosyal/video/public/sahne/<tarih>/istem.json`'da durur; beğenilmeyen satırın
istemi elle düzeltilip `python3 sosyal/gorsel.py --tarih <tarih> --yeniden` ile yeniden üretilir.
