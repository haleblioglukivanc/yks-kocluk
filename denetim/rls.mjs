/* RLS matrisi: canlı veritabanında, gerçek hesaplarla, yalnız OKUMA.
   Her açık tablo/görünüm için dört kimlik: ziyaretçi (anon), demo öğrenci,
   başka öğrenci (ornek.deniz), demo koç. Sayım head isteğiyle alınır,
   veri indirilmez. Ek olarak öğrenciler arası sızıntı denenir.
   Çıktı: ham/rls.json ve ham/kimlik.json (ekran.mjs id'leri buradan alır). */
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const KOK = path.resolve(new URL('..', import.meta.url).pathname)
const HAM = path.join(KOK, 'denetim', 'ham')
fs.mkdirSync(HAM, { recursive: true })

const istemciKaynak = fs.readFileSync(path.join(KOK, 'src/lib/supabase.js'), 'utf8')
const ADRES = process.env.VITE_SUPABASE_URL ?? istemciKaynak.match(/https:\/\/[a-z]+\.supabase\.co/)[0]
const ANON = process.env.VITE_SUPABASE_ANON_KEY ?? istemciKaynak.match(/(sb_publishable_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9_.-]{40,})/)[0]

const HESAPLAR = {
  ziyaretci: null,
  ogrenci: ['demo.ogrenci@khkocluk.com', 'Demo2026!ux'],
  digerOgrenci: ['ornek.deniz@khkocluk.com', 'Ornek2026!ux'],
  koc: ['demo.koc@khkocluk.com', 'Demo2026!ux'],
}

const istemci = () => createClient(ADRES, ANON, { auth: { persistSession: false, autoRefreshToken: false } })

/* PostgREST OpenAPI: açık şemadaki tablo/görünüm ve sütun adları */
const api = await fetch(`${ADRES}/rest/v1/`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } }).then((r) => r.json())
let tablolar = Object.entries(api.definitions ?? {}).map(([ad, t]) => ({ ad, sutunlar: Object.keys(t.properties ?? {}) }))
const rpcler = Object.keys(api.paths ?? {}).filter((p) => p.startsWith('/rpc/')).map((p) => p.slice(5))
/* OpenAPI artık gizli anahtar istiyor; yedek: MCP ile çekilen liste (ad|tür|rls|politikalar).
   Sütunlar aşağıda, oturumlardan biriyle tek satır okunarak keşfedilir. */
const listeDosyasi = path.join(HAM, 'tablolar.txt')
if (!tablolar.length && fs.existsSync(listeDosyasi)) {
  tablolar = fs.readFileSync(listeDosyasi, 'utf8').trim().split('\n').map((l) => {
    const [ad, tur, rls, politika] = l.split('|')
    return { ad, tur, rls: rls === 't', politika, sutunlar: [] }
  })
}

const oturumlar = {}
const kimlik = {}
for (const [rol, hesap] of Object.entries(HESAPLAR)) {
  const c = istemci()
  if (hesap) {
    const { data, error } = await c.auth.signInWithPassword({ email: hesap[0], password: hesap[1] })
    if (error) {
      console.error(`giriş başarısız (${rol}): ${error.message}`)
      continue
    }
    kimlik[rol] = data.user.id
  }
  oturumlar[rol] = c
}

async function say(c, tablo, filtre) {
  let q = c.from(tablo).select('*', { count: 'exact', head: true })
  if (filtre) q = q.eq(filtre[0], filtre[1])
  const { count, error } = await q
  if (error) return { hata: `${error.code ?? ''} ${error.message}`.trim().slice(0, 80) }
  return { sayi: count }
}

const matris = []
for (const t of tablolar) {
  if (!t.sutunlar.length) {
    for (const rol of ['koc', 'ogrenci', 'digerOgrenci']) {
      if (!oturumlar[rol]) continue
      const { data } = await oturumlar[rol].from(t.ad).select('*').limit(1)
      if (data?.[0]) { t.sutunlar = Object.keys(data[0]); break }
    }
  }
  const satir = { tablo: t.ad, tur: t.tur, politika: t.politika, sutun: t.sutunlar.length }
  for (const rol of Object.keys(oturumlar)) satir[rol] = await say(oturumlar[rol], t.ad)
  matris.push(satir)
}

/* Öğrenciler arası sızıntı: öğrenci, başka öğrencinin satırlarını görebiliyor mu?
   ogrenci_id / ogrenci / kullanici_id / profil_id gibi sütunlar üzerinden. */
const sahipSutunlari = ['ogrenci_id', 'ogrenci', 'kullanici_id', 'profil_id', 'id', 'gonderen_id', 'alici_id', 'koc_id']
const sizinti = []
if (oturumlar.ogrenci && oturumlar.digerOgrenci && kimlik.ogrenci && kimlik.digerOgrenci) {
  for (const t of tablolar) {
    const sutun = sahipSutunlari.find((s) => t.sutunlar.includes(s))
    if (!sutun) continue
    const [aDigerinden, bDigerinden] = await Promise.all([
      say(oturumlar.ogrenci, t.ad, [sutun, kimlik.digerOgrenci]),
      say(oturumlar.digerOgrenci, t.ad, [sutun, kimlik.ogrenci]),
    ])
    sizinti.push({ tablo: t.ad, sutun, demoDigerini: aDigerinden, digerDemoyu: bDigerinden })
  }
}

/* RPC sondası: yalnız OKUYAN SECURITY DEFINER fonksiyonlar, ziyaretçi ve öğrenci olarak.
   Beklenen: hata ya da boş. Satır dönüyorsa yetki kaçağı. (Yazan fonksiyonlar bilerek dışarıda.) */
const bugun = new Date().toISOString().slice(0, 10)
const SONDA = [
  ['yonetici_ogrenci_listesi', {}],
  ['yonetici_risk_listesi', { p_limit: 5 }],
  ['analiz_taslaklari', { p_limit: 5 }],
  ['koc_karar_kuyrugu', { p_limit: 5 }],
  ['odeme_ozeti', { p_ogrenci: kimlik.digerOgrenci }],
  ['anket_egrisi', { p_ogrenci: kimlik.digerOgrenci }],
  ['koc_gorusme_haftasi', { p_gun: 0 }],
  ['ogrenci_gorusme_hakki', { p_ogrenci_id: kimlik.digerOgrenci }],
  ['telegram_durumum', {}],
  ['sistem_gunlugu_son', { p_adet: 3 }],
  ['yonetici_nabzi', {}],
]
const rpcSonuc = []
for (const [ad, param] of SONDA) {
  const kayit = { rpc: ad }
  for (const rol of ['ziyaretci', 'ogrenci']) {
    if (!oturumlar[rol]) continue
    const { data, error } = await oturumlar[rol].rpc(ad, param)
    kayit[rol] = error ? `hata ${error.code ?? ''}`.trim() : Array.isArray(data) ? `${data.length} satır` : data == null ? 'boş' : typeof data === 'object' ? `nesne(${Object.keys(data).length})` : String(data).slice(0, 30)
  }
  rpcSonuc.push(kayit)
}
for (const r of rpcler) if (!SONDA.some(([ad]) => ad === r)) rpcSonuc.push({ rpc: r, ziyaretci: 'sondalanmadı' })

const sonuc = { tarih: new Date().toISOString(), adres: ADRES, tabloSayisi: tablolar.length, kimlik: Object.keys(kimlik), matris, sizinti, rpc: rpcSonuc }
fs.writeFileSync(path.join(HAM, 'rls.json'), JSON.stringify(sonuc, null, 2))
fs.writeFileSync(path.join(HAM, 'kimlik.json'), JSON.stringify(kimlik, null, 2))

const anonAcik = matris.filter((m) => m.ziyaretci?.sayi > 0).map((m) => m.tablo)
const sizan = sizinti.filter((s) => s.demoDigerini.sayi > 0 || s.digerDemoyu.sayi > 0).map((s) => s.tablo)
const rpcKacak = rpcSonuc.filter((r) => /satır|nesne|^\d/.test(r.ziyaretci ?? '') && !/^0 satır|nesne\(0\)/.test(r.ziyaretci) || /satır|nesne|^\d/.test(r.ogrenci ?? '') && !/^0 satır|nesne\(0\)/.test(r.ogrenci)).map((r) => `${r.rpc}[z:${r.ziyaretci}|ö:${r.ogrenci}]`)
console.log(`rls: ${tablolar.length} tablo, anon'a açık ${anonAcik.length} (${anonAcik.join(', ') || '-'}), öğrenciler arası sızıntı ${sizan.length} (${sizan.join(', ') || '-'}), rpc sondası ${rpcSonuc.length} → dolu dönen ${rpcKacak.length} (${rpcKacak.join(' ') || '-'})`)
