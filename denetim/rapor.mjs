/* DENETIM.md üretici: ham/*.json ve logları okur, tek rapor yazar.
   Bulgu önem sırası: 1 kritik (veri/erişim/çökme), 2 önemli (kalite, uyum),
   3 hijyen (temizlik). Tur 1 (mekanik) 3'leri, Tur 2 (yargı) 1–2'leri okur. */
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

const KOK = path.resolve(new URL('..', import.meta.url).pathname)
const HAM = path.join(KOK, 'denetim', 'ham')
const okuJson = (ad) => (fs.existsSync(path.join(HAM, ad)) ? JSON.parse(fs.readFileSync(path.join(HAM, ad), 'utf8')) : null)
const okuMetin = (ad) => (fs.existsSync(path.join(HAM, ad)) ? fs.readFileSync(path.join(HAM, ad), 'utf8') : '')

const statik = okuJson('statik.json')
const rls = okuJson('rls.json')
const ekran = okuJson('ekran.json')
const knip = okuJson('knip.json')
const audit = okuJson('audit.json')
const advisors = okuJson('advisors.json')
const buildLog = okuMetin('build.log')
const distBoyut = okuMetin('dist-boyut.txt')
const lh = {}
for (const ad of fs.readdirSync(HAM).filter((f) => f.startsWith('lh-') && f.endsWith('.json'))) {
  const j = okuJson(ad)
  if (j?.categories) lh[ad.slice(3, -5)] = { puan: Object.fromEntries(Object.entries(j.categories).map(([k, v]) => [k, Math.round((v.score ?? 0) * 100)])), lcp: j.audits?.['largest-contentful-paint']?.displayValue, cls: j.audits?.['cumulative-layout-shift']?.displayValue, tbt: j.audits?.['total-blocking-time']?.displayValue, boyut: j.audits?.['total-byte-weight']?.displayValue }
}
const commit = execSync('git log -1 --format="%h %ad" --date=short', { cwd: KOK }).toString().trim()
const bulgular = [] // { onem, alan, metin }
const ekle = (onem, alan, metin) => bulgular.push({ onem, alan, metin })

/* ---------- Yapı ---------- */
const buildUyari = (buildLog.match(/\(!\)/g) ?? []).length
const buildHata = /error/i.test(buildLog) && !/built in/i.test(buildLog)
if (buildHata) ekle(1, 'yapı', 'Build başarısız — build.log')
if (buildUyari) ekle(2, 'yapı', `Build ${buildUyari} uyarı veriyor (chunk boyutu / dinamik import) — ham/build.log`)
const auditSay = audit?.metadata?.vulnerabilities ?? {}
if ((auditSay.critical ?? 0) + (auditSay.high ?? 0) > 0) ekle(2, 'yapı', `npm audit: ${auditSay.critical ?? 0} kritik, ${auditSay.high ?? 0} yüksek açık`)
const knipDosya = knip?.files?.length ?? 0
const knipExport = knip?.issues?.reduce((t, i) => t + (i.exports?.length ?? 0) + (i.types?.length ?? 0), 0) ?? 0
const knipDep = knip?.issues?.reduce((t, i) => t + (i.dependencies?.length ?? 0) + (i.devDependencies?.length ?? 0), 0) ?? 0
if (knipDosya) ekle(3, 'yapı', `${knipDosya} dosya hiçbir yerden import edilmiyor (ölü dosya): ${knip.files.slice(0, 4).map((f) => path.basename(f)).join(', ')}${knipDosya > 4 ? '…' : ''}`)
if (knipExport) ekle(3, 'yapı', `${knipExport} kullanılmayan export`)
if (knipDep) ekle(3, 'yapı', `${knipDep} kullanılmayan paket`)

/* ---------- Kod hijyeni ve tasarım sistemi ---------- */
if (statik) {
  const ts = statik.tasarimSistemi
  if (ts.hexKacak.toplam) ekle(3, 'tasarım sistemi', `tema.css dışında ${ts.hexKacak.toplam} ham renk (hex) — en çok: ${ts.hexKacak.dosyalar.slice(0, 3).map(([d, n]) => `${path.basename(d)} ${n}`).join(', ')}`)
  if (ts.rgbKacak.toplam) ekle(3, 'tasarım sistemi', `tema.css dışında ${ts.rgbKacak.toplam} rgb()/hsl() rengi`)
  if (ts.jsxRenk.toplam) ekle(3, 'tasarım sistemi', `JSX içinde ${ts.jsxRenk.toplam} satırda ham renk`)
  if (ts.inlineStyle.toplam) ekle(3, 'tasarım sistemi', `${ts.inlineStyle.toplam} satır inline style — en çok: ${ts.inlineStyle.dosyalar.slice(0, 3).map(([d, n]) => `${path.basename(d)} ${n}`).join(', ')}`)
  if (ts.kesmeNoktasi.toplam) ekle(2, 'tasarım sistemi', `yerlesim.css dışında ${ts.kesmeNoktasi.toplam} @media kesme noktası (kural: yalnız yerlesim.css)`)
  if (ts.important.toplam) ekle(3, 'tasarım sistemi', `${ts.important.toplam} !important`)
  if (ts.tekrarliSecici.toplam) ekle(3, 'tasarım sistemi', `${ts.tekrarliSecici.toplam} seçici birden fazla CSS dosyasında tanımlı`)
  const k = statik.kalinti
  if (k.kamil.toplam) ekle(3, 'kalıntı', `"Kâmil" ${k.kamil.toplam} yerde geçiyor (maskot adı Çizbi)`)
  if (k.workersDev.toplam) ekle(2, 'kalıntı', `workers.dev adresi ${k.workersDev.toplam} yerde (kapalı yayın)`)
  if (k.eskiAlanAdi.toplam) ekle(2, 'kalıntı', `kivanchaleblioglu.com ${k.eskiAlanAdi.toplam} yerde (pasif alan adı)`)
  if (k.consoleLog.toplam) ekle(3, 'kalıntı', `${k.consoleLog.toplam} console.log`)
  if (k.todo.toplam) ekle(3, 'kalıntı', `${k.todo.toplam} TODO/FIXME`)
  if (k.localhost.toplam) ekle(2, 'kalıntı', `${k.localhost.toplam} localhost referansı`)
  if (statik.anahtarIzi.toplam) ekle(1, 'güvenlik', `Depoda gizli anahtar izi: ${statik.anahtarIzi.ornek.map((x) => `${x.dosya}:${x.satir}`).join(', ')}`)
  for (const f of statik.fonksiyonlar) {
    if (!f.authBasligi && !f.getUser) ekle(1, 'güvenlik', `Edge function ${f.ad}: kimlik doğrulama izi yok (Authorization/getUser)`)
    else if (!f.rolKontrolu && f.serviceRole) ekle(2, 'güvenlik', `Edge function ${f.ad}: service_role kullanıyor ama rol kontrolü görünmüyor`)
    if (f.corsYildiz) ekle(3, 'güvenlik', `Edge function ${f.ad}: CORS * (herhangi bir siteden çağrılabilir)`)
  }
  const e = statik.erisilebilirlikStatik
  if (e.altsizImg) ekle(2, 'erişilebilirlik', `${e.altsizImg} <img> alt'sız`)
  if (e.ikonDugmeEtiketsiz) ekle(2, 'erişilebilirlik', `${e.ikonDugmeEtiketsiz} ikon düğme aria-label'sız`)
  if (!statik.pwa.serviceWorker) ekle(2, 'çevrimdışı', 'Service worker / PWA kaydı görünmüyor')
}

/* ---------- Veri / RLS ---------- */
if (rls) {
  const anonAcik = rls.matris.filter((m) => m.ziyaretci?.sayi > 0)
  const tanitimVerisi = ['haftalik_kitap', 'haftalik_program', 'haftalik_soz']
  for (const m of anonAcik) ekle(tanitimVerisi.includes(m.tablo) ? 2 : 1, 'veri', `Ziyaretçi (anon) ${m.tablo} ${m.tur === 'v' ? 'görünümünden' : 'tablosundan'} ${m.ziyaretci.sayi} satır okuyabiliyor${tanitimVerisi.includes(m.tablo) ? ' (tanıtım içeriği olabilir — bilinçli mi, Tur 2 karar versin)' : ''}`)
  for (const s of rls.sizinti) {
    if (s.demoDigerini.sayi > 0 || s.digerDemoyu.sayi > 0) ekle(1, 'veri', `Öğrenciler arası sızıntı: ${s.tablo} (${s.sutun}) — öğrenci başka öğrencinin ${Math.max(s.demoDigerini.sayi ?? 0, s.digerDemoyu.sayi ?? 0)} satırını görüyor`)
  }
  const dolu = (v) => v && /satır|nesne|^\d/.test(v) && !/^0 satır|nesne\(0\)/.test(v)
  for (const r of rls.rpc) {
    if (dolu(r.ziyaretci)) ekle(1, 'veri', `RPC ${r.rpc}: ziyaretçi (anon) çağırınca ${r.ziyaretci} dönüyor`)
    else if (dolu(r.ogrenci)) ekle(1, 'veri', `RPC ${r.rpc}: öğrenci çağırınca ${r.ogrenci} dönüyor (koç/yönetici işi)`)
  }
  const bosKoc = rls.matris.filter((m) => m.koc?.hata && /permission denied/.test(m.koc.hata)).map((m) => m.tablo)
  if (bosKoc.length) ekle(3, 'veri', `Koç için grant yok (permission denied): ${bosKoc.slice(0, 6).join(', ')}`)
}
if (advisors) {
  for (const a of advisors.guvenlik ?? []) ekle(a.level === 'ERROR' ? 1 : 2, 'supabase', `Advisor güvenlik [${a.level}] ${a.title ?? a.name}${a.detail ? ' — ' + a.detail.slice(0, 90) : ''}`)
  for (const a of advisors.performans ?? []) ekle(3, 'supabase', `Advisor performans [${a.level}] ${a.title ?? a.name}${a.detail ? ' — ' + a.detail.slice(0, 90) : ''}`)
}

/* ---------- Ekranlar ---------- */
if (ekran) {
  for (const s of ekran.sonuclar) {
    const ad = `${s.rol} ${s.yol} @${s.genislik} ${s.motor}`
    if (s.hata) { ekle(1, 'ekran', `${ad}: yüklenemedi — ${s.hata.slice(0, 80)}`); continue }
    if (s.sonYol && s.sonYol !== s.yol && !s.yol.startsWith('/gozuyle')) ekle(2, 'ekran', `${ad}: ${s.sonYol} adresine düştü (rota tanınmıyor ya da yetki yok)`)
    for (const k of s.konsol.filter((x) => x.startsWith('pageerror'))) ekle(1, 'ekran', `${ad}: ${k.slice(0, 100)}`)
    if (s.konsol.some((x) => !x.startsWith('pageerror'))) ekle(2, 'ekran', `${ad}: konsol hatası — ${s.konsol.find((x) => !x.startsWith('pageerror')).slice(0, 90)}`)
    if (s.tasma > 0) ekle(2, 'ekran', `${ad}: yatay taşma ${s.tasma}px`)
    for (const b of s.basarisiz) ekle(2, 'ekran', `${ad}: başarısız istek ${b}`)
    for (const v of (s.axe ?? []).filter((v) => v.etki === 'critical' || v.etki === 'serious')) ekle(2, 'erişilebilirlik', `${ad}: axe ${v.id} (${v.etki}, ${v.adet} öğe) ${v.hedef ?? ''}`)
    const cokKucuk = (s.kucukHedef ?? []).filter((h) => Math.min(h.w, h.h) < 32)
    if (cokKucuk.length) ekle(2, 'dokunma', `${ad}: ${cokKucuk.length} hedef 32px altında (${cokKucuk.slice(0, 3).map((h) => `${h.etiket} ${h.w}×${h.h}`).join('; ')})`)
    else if (s.kucukHedef?.length) ekle(3, 'dokunma', `${ad}: ${s.kucukHedef.length} hedef 44px altında`)
    if (s.sure > 6000) ekle(3, 'performans', `${ad}: yükleme ${(s.sure / 1000).toFixed(1)} sn`)
    if (s.boy > 12000 && s.genislik === 'telefon' && s.motor === 'chromium') ekle(2, 'ekran', `${ad}: sayfa ${Math.round(s.boy / 1000)}k px uzunluğunda (${Math.round(s.boy / 844)} ekran boyu) — liste sayfalanmalı ya da katlanmalı`)
  }
}
for (const [ad, l] of Object.entries(lh)) {
  if (l.puan.performance < 70) ekle(2, 'performans', `Lighthouse ${ad}: performans ${l.puan.performance} (LCP ${l.lcp}, TBT ${l.tbt})`)
  if (l.puan.accessibility < 90) ekle(2, 'erişilebilirlik', `Lighthouse ${ad}: erişilebilirlik ${l.puan.accessibility}`)
  if ((l.puan['best-practices'] ?? 100) < 90) ekle(3, 'performans', `Lighthouse ${ad}: best practices ${l.puan['best-practices']}`)
  if ((l.puan.seo ?? 100) < 90) ekle(3, 'seo', `Lighthouse ${ad}: SEO ${l.puan.seo}`)
}

/* ---------- Yaz ---------- */
bulgular.sort((a, b) => a.onem - b.onem)
const say = (n) => bulgular.filter((b) => b.onem === n).length
const alanlar = [...new Set(bulgular.map((b) => b.alan))].map((a) => `${a} ${bulgular.filter((b) => b.alan === a).length}`).join(' · ')
const satir = (m) => (m ? (m.hata ? (/permission denied/.test(m.hata) ? 'izin yok' : 'hata') : String(m.sayi)) : '—')

let md = `# DENETİM — makine taraması (Tur 0)

Tarih: ${new Date().toISOString().slice(0, 10)} · Commit: ${commit} · Adres: ${ekran?.adres ?? rls?.adres ?? ''}
Yeniden üretmek için: \`bash denetim/tara.sh\` (ham çıktılar denetim/ham, görüntüler denetim/ekran — depoya girmez).

## Özet

Toplam ${bulgular.length} bulgu — **${say(1)} kritik**, ${say(2)} önemli, ${say(3)} hijyen.
Alanlar: ${alanlar || '—'}

Nasıl okunur: 1 kritik = veri/erişim/çökme, Tur 2'de (yargı) ilk bakılacaklar. 2 önemli = kalite ve uyum, Tur 2'de sıralanır. 3 hijyen = tartışmasız temizlik, Tur 1'de (mekanik) kapatılır.

## Kritik ve önemli bulgular
${bulgular.filter((b) => b.onem <= 2).map((b) => `- [${b.onem}] **${b.alan}** — ${b.metin}`).join('\n') || '- yok'}

## Hijyen bulguları (Tur 1)
${bulgular.filter((b) => b.onem === 3).map((b) => `- **${b.alan}** — ${b.metin}`).join('\n') || '- yok'}

## Yapı
- Build: ${buildHata ? 'BAŞARISIZ' : 'başarılı'}, ${buildUyari} uyarı
- Dist: ${distBoyut.trim().split('\n').slice(0, 6).join(' · ') || '—'}
- npm audit: ${Object.entries(auditSay).filter(([k]) => ['critical', 'high', 'moderate', 'low'].includes(k)).map(([k, v]) => `${k} ${v}`).join(', ') || '—'}
- knip: ${knipDosya} ölü dosya, ${knipExport} kullanılmayan export, ${knipDep} kullanılmayan paket
${knipDosya ? knip.files.map((f) => `  - ${path.relative(KOK, f)}`).join('\n') : ''}

## Tasarım sistemi ve hijyen (statik)
${statik ? `- CSS ${statik.cssSatir} satır / ${statik.dosyaSayisi.css} dosya; JSX/JS ${statik.dosyaSayisi.jsx} dosya; edge function ${statik.dosyaSayisi.edgeFn}
- Ham renk (hex) tema.css dışında: ${statik.tasarimSistemi.hexKacak.toplam} — ${statik.tasarimSistemi.hexKacak.dosyalar.map(([d, n]) => `${path.basename(d)} ${n}`).join(', ') || '—'}
- rgb()/hsl(): ${statik.tasarimSistemi.rgbKacak.toplam} · JSX'te renk: ${statik.tasarimSistemi.jsxRenk.toplam} · inline style: ${statik.tasarimSistemi.inlineStyle.toplam} · px (tema/yerlesim dışı, ince ayar hariç): ${statik.tasarimSistemi.pxKacak.toplam} · !important: ${statik.tasarimSistemi.important.toplam}
- @media yerlesim.css dışında: ${statik.tasarimSistemi.kesmeNoktasi.toplam}${statik.tasarimSistemi.kesmeNoktasi.ornek.length ? ' — ' + statik.tasarimSistemi.kesmeNoktasi.ornek.map((x) => `${path.basename(x.dosya)}:${x.satir}`).join(', ') : ''}
- Tekrarlı seçici: ${statik.tasarimSistemi.tekrarliSecici.toplam}${statik.tasarimSistemi.tekrarliSecici.ornek.length ? '\n' + statik.tasarimSistemi.tekrarliSecici.ornek.map((x) => `  - \`${x.secici}\` → ${x.dosyalar.map((d) => path.basename(d)).join(', ')}`).join('\n') : ''}
- Kalıntı: Kâmil ${statik.kalinti.kamil.toplam} · workers.dev ${statik.kalinti.workersDev.toplam} · eski alan adı ${statik.kalinti.eskiAlanAdi.toplam} · console.log ${statik.kalinti.consoleLog.toplam} · TODO ${statik.kalinti.todo.toplam} · localhost ${statik.kalinti.localhost.toplam}
${statik.kalinti.kamil.ornek.map((x) => `  - Kâmil: ${x.dosya}:${x.satir} — ${x.metin}`).join('\n')}
- En büyük dosyalar: ${statik.buyukDosyalar.slice(0, 6).map((x) => `${path.basename(x.dosya)} ${x.satir}`).join(', ')}
- Edge function'lar:
${statik.fonksiyonlar.map((f) => `  - ${f.ad}: ${f.satir} satır · auth başlığı ${f.authBasligi ? 'var' : 'YOK'} · getUser ${f.getUser ? 'var' : 'yok'} · rol kontrolü ${f.rolKontrolu ? 'var' : 'yok'} · service_role ${f.serviceRole ? 'var' : 'yok'} · CORS ${f.corsYildiz ? '*' : f.cors ? 'kısıtlı' : 'yok'}`).join('\n')}
- PWA: manifest ${statik.pwa.manifest ? 'var' : 'yok'}, service worker ${statik.pwa.serviceWorker ? 'var' : 'yok'}` : '- statik.json yok'}

## Veri erişimi (RLS matrisi — canlı, yalnız okuma)
${rls ? `Sütunlar: ziyaretçi (anon) · demo öğrenci · başka öğrenci (ornek.deniz) · demo koç. Sayı = okunabilen satır; "izin yok" = grant yok; 0 = RLS gizliyor.

| tablo | anon | öğrenci | başka öğr. | koç |
|---|---|---|---|---|
${rls.matris.map((m) => `| ${m.tablo} | ${satir(m.ziyaretci)} | ${satir(m.ogrenci)} | ${satir(m.digerOgrenci)} | ${satir(m.koc)} |`).join('\n')}

Öğrenciler arası sızıntı denemesi (öğrenci, diğer öğrencinin satırını filtreleyip sayıyor):
${rls.sizinti.map((s) => `- ${s.tablo} (${s.sutun}): demo→diğer ${satir(s.demoDigerini)}, diğer→demo ${satir(s.digerDemoyu)}`).join('\n') || '- sahip sütunlu tablo yok'}

RPC sondası (yalnız okuyan SECURITY DEFINER fonksiyonlar; beklenen hata ya da boş):
${rls.rpc.map((r) => `- ${r.rpc}: ziyaretçi → ${r.ziyaretci ?? '—'} · öğrenci → ${r.ogrenci ?? '—'}`).join('\n')}` : '- rls.json yok'}

## Supabase advisors
${advisors ? `- Güvenlik: ${advisors.guvenlik?.length ?? 0} · Performans: ${advisors.performans?.length ?? 0}
${[...(advisors.guvenlik ?? []).map((a) => `  - [güvenlik ${a.level}] ${a.title ?? a.name}: ${a.detail ?? ''}`.slice(0, 200)), ...(advisors.performans ?? []).map((a) => `  - [performans ${a.level}] ${a.title ?? a.name}: ${a.detail ?? ''}`.slice(0, 200))].join('\n')}` : '- advisors.json yok (MCP ile çekilir)'}

## Ekranlar (canlı, demo hesaplar)
${ekran ? `${ekran.sonuclar.length} yükleme: Chromium 390/820/1366 + WebKit 390. Görüntüler denetim/ekran/*.png (depoda değil).

| rol | yol | genişlik | motor | sn | boy | taşma | konsol | istek | axe c/s | <44px |
|---|---|---|---|---|---|---|---|---|---|---|
${ekran.sonuclar.map((s) => s.hata ? `| ${s.rol} | ${s.yol} | ${s.genislik} | ${s.motor} | HATA | | | ${s.hata.slice(0, 40)} | | | |` : `| ${s.rol} | ${s.yol}${s.sonYol && s.sonYol !== s.yol ? '→' + s.sonYol : ''} | ${s.genislik} | ${s.motor} | ${(s.sure / 1000).toFixed(1)} | ${s.boy ? Math.round(s.boy / 100) / 10 + 'k' : ''} | ${s.tasma > 0 ? s.tasma : ''} | ${s.konsol.length || ''} | ${s.basarisiz.length || ''} | ${s.axe ? `${s.axe.filter((v) => v.etki === 'critical').length}/${s.axe.filter((v) => v.etki === 'serious').length}` : ''} | ${s.kucukHedef ? s.kucukHedef.length : ''} |`).join('\n')}

axe kural özeti (tüm ekranlar): ${(() => { const m = {}; for (const s of ekran.sonuclar) for (const v of s.axe ?? []) m[`${v.id} (${v.etki})`] = (m[`${v.id} (${v.etki})`] ?? 0) + 1; return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ×${n}`).join(' · ') || 'temiz' })()}` : '- ekran.json yok'}

## Lighthouse (mobil)
${Object.entries(lh).map(([ad, l]) => `- ${ad}: performans ${l.puan.performance} · erişilebilirlik ${l.puan.accessibility} · best practices ${l.puan['best-practices']} · SEO ${l.puan.seo} · LCP ${l.lcp} · CLS ${l.cls} · TBT ${l.tbt} · ${l.boyut}`).join('\n') || '- çalışmadı'}

## Bu turda ölçülmeyenler (Tur 2'de elle/yargıyla)
- Yazma yetkileri (RLS insert/update/delete) — canlı veriye yazılmadı
- Veli hesabı (demo veli yok) ve /gozuyle akışının içi
- Telegram / SMS / mail kuyruğu / pg_cron işleri
- İş mantığının doğruluğu (karar kuyruğu, plan taslağı, aralıklı tekrar)
- Metin tonu ve yazım (Türkçe)
`
fs.writeFileSync(path.join(KOK, 'DENETIM.md'), md)
console.log(`DENETIM.md: ${bulgular.length} bulgu (${say(1)} kritik / ${say(2)} önemli / ${say(3)} hijyen)`)
console.log(bulgular.slice(0, 10).map((b, i) => `${i + 1}. [${b.onem}] ${b.alan}: ${b.metin}`).join('\n'))
