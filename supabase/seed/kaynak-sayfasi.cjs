/**
 * Kaynak önerisi gözden geçirme sayfası.
 *
 * Tek kaynak JSON; bu betik ondan hem okunacak sayfayı hem de
 * (--sql ile) veritabanına gidecek INSERT'i üretiyor. İkisinin
 * birbirinden ayrı düşmesi mümkün değil.
 */
const fs = require('fs')

const veri = JSON.parse(fs.readFileSync(__dirname + '/kaynaklar-piyasa.json', 'utf8'))

const DERS_ADI = {
  yks_turkce: 'Türkçe',
  yks_matematik: 'Matematik',
  yks_geometri: 'Geometri',
  yks_fizik: 'Fizik',
  yks_kimya: 'Kimya',
  yks_biyoloji: 'Biyoloji',
  yks_tarih: 'Tarih',
  yks_cografya: 'Coğrafya',
  yks_edebiyat: 'Edebiyat',
  yks_felsefe: 'Felsefe',
  yks_mantik: 'Mantık',
  yks_psikoloji: 'Psikoloji',
  yks_sosyoloji: 'Sosyoloji',
}
const SIRA = Object.keys(DERS_ADI)
const KAPSAM = { tyt: 'TYT', ayt: 'AYT', tyt_ayt: 'TYT + AYT' }
const FAZ = {
  konu_anlatimi: 'Konu anlatımı',
  soru_bankasi: 'Soru bankası',
  fasikul: 'Fasikül',
  konu_denemesi: 'Konu denemesi',
  brans_denemesi: 'Branş denemesi',
  genel_deneme: 'Genel deneme',
}
const SEVIYE = { 1: 'Temel', 2: 'Sınav ayarı', 3: 'Ayırt edici' }

const kacir = (m) =>
  String(m ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

if (process.argv.includes('--sql')) {
  const satir = (k) =>
    `  (${[
      `'${k.ad.replace(/'/g, "''")}'`,
      `'${k.yayinevi.replace(/'/g, "''")}'`,
      `'${k.faz}'`,
      k.seviye ?? 'null',
      `'${k.ders}'`,
      `'${k.kapsam}'`,
      `'basili'`,
      `'dis'`,
      k.aciklama ? `'${k.aciklama.replace(/'/g, "''")}'` : 'null',
    ].join(', ')})`
  console.log(
    'insert into public.kaynaklar\n  (ad, yayinevi, faz, seviye, ders_kod, kapsam, bicim, telif, aciklama)\nvalues\n' +
      veri.kaynaklar.map(satir).join(',\n') +
      ';',
  )
  process.exit(0)
}

const gruplar = SIRA.map((kod) => {
  const kendi = veri.kaynaklar.filter((k) => k.ders === kod)
  const kapsamlar = ['tyt', 'tyt_ayt', 'ayt'].filter((kp) => kendi.some((k) => k.kapsam === kp))
  return { kod, ad: DERS_ADI[kod], kapsamlar, kendi }
}).filter((g) => g.kendi.length > 0)

const kart = (k) => `
        <li class="kaynak">
          <span class="sv sv${k.seviye}">${SEVIYE[k.seviye] ?? '—'}</span>
          <span class="orta">
            <b>${kacir(k.ad)}</b>
            <i>${kacir(k.yayinevi)} · ${FAZ[k.faz]}</i>
            ${k.aciklama ? `<u>${kacir(k.aciklama)}</u>` : ''}
          </span>
        </li>`

const bolum = (g) => `
      <section class="ders">
        <h2>${g.ad} <span>${g.kendi.length}</span></h2>
        ${g.kapsamlar
          .map(
            (kp) => `
        <h3>${KAPSAM[kp]}</h3>
        <ul>${g.kendi.filter((k) => k.kapsam === kp).map(kart).join('')}
        </ul>`,
          )
          .join('')}
      </section>`

const html = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Kaynak kütüphanesi önerisi</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=Karla:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root{
  --kagit:#faf8f4; --yuzey:#fff; --yuzey-2:#f3efe8; --murekkep:#1c1b19;
  --grafit:#4a4742; --soluk:#8b857c; --cizgi:#e4ded3;
  --amber:#c8892a; --serin:#2f6fa3; --yesil:#2fa36b;
  --display:'Bricolage Grotesque',Georgia,serif; --govde:'Karla',system-ui,sans-serif;
}
@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]){
    --kagit:#17161a; --yuzey:#1f1e23; --yuzey-2:#27262c; --murekkep:#f2efe9;
    --grafit:#cdc8c0; --soluk:#948e85; --cizgi:#343238;
  }
}
:root[data-theme="dark"]{
  --kagit:#17161a; --yuzey:#1f1e23; --yuzey-2:#27262c; --murekkep:#f2efe9;
  --grafit:#cdc8c0; --soluk:#948e85; --cizgi:#343238;
}
*{box-sizing:border-box}
body{margin:0;background:var(--kagit);color:var(--murekkep);
  font-family:var(--govde);font-size:16px;line-height:1.5;
  -webkit-text-size-adjust:100%}
.sar{max-width:760px;margin:0 auto;padding:1.5rem 1.125rem 4rem}
header{border-bottom:1px solid var(--cizgi);padding-bottom:1.125rem;margin-bottom:1.5rem}
h1{font-family:var(--display);font-weight:700;font-size:1.5rem;line-height:1.2;margin:0 0 .5rem}
.ozet{color:var(--grafit);font-size:.9375rem;margin:0}
.sayac{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:1rem}
.sayac b{background:var(--yuzey);border:1px solid var(--cizgi);border-radius:999px;
  padding:.25rem .625rem;font-size:.8125rem;font-weight:600;color:var(--grafit)}
.ders{margin:0 0 1.75rem}
.ders h2{font-family:var(--display);font-weight:700;font-size:1.125rem;margin:0 0 .25rem;
  display:flex;align-items:center;gap:.5rem}
.ders h2 span{font-family:var(--govde);font-size:.75rem;font-weight:600;color:var(--soluk);
  border:1px solid var(--cizgi);border-radius:999px;padding:.0625rem .5rem}
.ders h2::after{content:'';flex:1;height:1px;background:var(--cizgi)}
.ders h3{font-size:.75rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;
  color:var(--soluk);margin:1rem 0 .375rem}
ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.375rem}
.kaynak{display:flex;gap:.625rem;align-items:flex-start;background:var(--yuzey);
  border:1px solid var(--cizgi);border-radius:10px;padding:.625rem .75rem}
.orta{display:flex;flex-direction:column;min-width:0}
.orta b{font-weight:600;font-size:.9375rem}
.orta i{font-style:normal;font-size:.8125rem;color:var(--soluk);margin-top:.0625rem}
.orta u{text-decoration:none;font-size:.8125rem;color:var(--grafit);margin-top:.25rem}
.sv{flex:0 0 auto;margin-top:.125rem;font-size:.6875rem;font-weight:700;letter-spacing:.03em;
  padding:.1875rem .5rem;border-radius:999px;border:1px solid var(--cizgi);white-space:nowrap}
.sv1{color:var(--yesil);border-color:color-mix(in srgb,var(--yesil) 45%,transparent)}
.sv2{color:var(--serin);border-color:color-mix(in srgb,var(--serin) 45%,transparent)}
.sv3{color:var(--amber);border-color:color-mix(in srgb,var(--amber) 55%,transparent)}
footer{margin-top:2rem;padding-top:1.125rem;border-top:1px solid var(--cizgi);
  color:var(--soluk);font-size:.8125rem}
footer p{margin:0 0 .5rem}
</style>
</head>
<body>
<div class="sar">
  <header>
    <h1>Kaynak kütüphanesi önerisi</h1>
    <p class="ozet">Mevcut ${17} MEBİ kaynağının üzerine eklenecek piyasa kaynakları.
    Her ders ve kapsam için en az üç seçenek; sıralama en çok kullanılandan başlıyor.
    Seviye: <b>Temel</b> konuyu yeni oturtan, <b>Sınav ayarı</b> ÖSYM ayarında,
    <b>Ayırt edici</b> üst bant.</p>
    <div class="sayac">
      <b>${veri.kaynaklar.length} yeni kaynak</b>
      <b>${gruplar.length} ders</b>
      <b>${new Set(veri.kaynaklar.map((k) => k.yayinevi)).size} yayınevi</b>
    </div>
  </header>
${gruplar.map(bolum).join('')}
  <footer>
    <p>Kayıtlar yalnızca künye: kitap adı, yayınevi, faz ve seviye. İçerik veya
    dosya tutulmuyor; koç görevde "şu kitabın şu aralığı" diyebilsin diye var.</p>
    <p>Telif: üçüncü taraf (<i>dis</i>), biçim: basılı. MEBİ kaynakları yerinde kalıyor.</p>
  </footer>
</div>
</body>
</html>
`

fs.mkdirSync('/mnt/user-data/outputs', { recursive: true })
fs.writeFileSync('/mnt/user-data/outputs/kaynak-onerisi.html', html)
console.log('yazıldı:', veri.kaynaklar.length, 'kaynak,', gruplar.length, 'ders')
