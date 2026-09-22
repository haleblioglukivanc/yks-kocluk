import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { gunEkle, yerelIso } from '../lib/hafta.js'
import { dokunulduMu, temasMetni } from '../lib/temas.js'
import TopluDurtme from './TopluDurtme.jsx'
import { AltSayfa, Dugme } from './Ortak.jsx'
import { OgrenciFormu } from './OgrenciFormu.jsx'
import { useFotograf } from './Fotograf.jsx'

/* Öğrencilerim (22 Eylül 2026, Bekir'in onayladığı mokap). Ekranın sorusu
   "kime dokunmalıyım": satırda ders listesi yok. Her satırda bugünün
   ilerleme halkası, tek satır durum, 7 günlük ritim ve iki hızlı düğme
   (mesaj; Görüştük düğmesi yanlışlıkla basıldığı için kaldırıldı). Bugünün işleri tek tek öğrenci detayında.
   Eski listeden geri gelenler: arama, süzgeçler, toplu mesaj, gruplar. */

const GRUPLAR = [
  ['acil', 'Önce bunlar', 'var(--m-acil)'],
  ['izle', 'İzle', 'var(--m-dikkat)'],
  ['iyi', 'Yolunda', 'var(--m-yolunda)'],
]
const HALKA = { acil: 'var(--m-acil)', izle: 'var(--m-dikkat)', iyi: 'var(--m-yolunda)' }
const CEVRE = 2 * Math.PI * 21

function sonHareket(r) {
  if (!r?.son_aktiflik) return { metin: 'Henüz giriş yok', tur: 'dikkat', bugun: false }
  const t = new Date(r.son_aktiflik)
  const gunFarki = Math.floor((new Date(new Date().toDateString()) - new Date(t.toDateString())) / 86400000)
  /* son_aktiflik görünümde gün hassasiyetinde (::date); saat basmak hep
     "00:00" veriyordu (22 Eylül 2026). */
  if (gunFarki <= 0) return { metin: 'Bugün girdi', tur: 'iyi', bugun: true }
  if (gunFarki === 1) return { metin: 'Dün girdi', tur: 'notr', bugun: false }
  return { metin: `${gunFarki} gündür yok`, tur: 'dikkat', bugun: false }
}

/* Halkanın ortası: fotoğraf varsa o (tamamen inince belirir), yoksa baş harfler. */
function OgrenciBasi({ yol, ad }) {
  const foto = useFotograf(yol)
  const bas = ad.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toLocaleUpperCase('tr')
  return <span>{foto ? <img className="portre-foto" src={foto} alt="" /> : bas}</span>
}

export default function OgrenciNabzi({ onOgrenciAc, onMesaj, onEkle = true, seciliId = null, onIlk = null }) {
  const [veri, setVeri] = useState(null)
  const [hata, setHata] = useState('')
  const [arama, setArama] = useState('')
  const [suzgec, setSuzgec] = useState('tumu')
  const [topluAcik, setTopluAcik] = useState(false)
  /* Öğrenci ekle (22 Eylül 2026): eski listeyle birlikte kaybolmuştu;
     arama kutusunun yanına geri geldi. Form aynı (geçici şifre üretir). */
  const [ekleAcik, setEkleAcik] = useState(false)
  const [kataloglar, setKataloglar] = useState([])
  useEffect(() => {
    if (!ekleAcik || kataloglar.length) return
    supabase.from('kataloglar').select('id, ad, tur, seviye, alan').is('koc_id', null).order('sira').then(({ data }) => setKataloglar(data ?? []))
  }, [ekleAcik, kataloglar.length])

  const bugun = yerelIso(new Date())
  const ilk = gunEkle(bugun, -6)
  const gunler = useMemo(() => Array.from({ length: 7 }, (_, i) => gunEkle(ilk, i)), [ilk])

  const yukle = useCallback(async () => {
    const { data: oturum } = await supabase.auth.getSession()
    const benimId = oturum?.session?.user?.id
    if (!benimId) return
    const [o, r, t] = await Promise.all([
      supabase.from('ogrenciler').select('id, sinif, alan, aktif, profiller!ogrenciler_id_fkey(ad_soyad, fotograf_yolu)').eq('koc_id', benimId).eq('aktif', true),
      supabase.from('ogrenci_risk').select('ogrenci_id, risk_seviyesi, risk_ham, son_aktiflik').eq('koc_id', benimId),
      supabase.rpc('koc_temas_durumlari'),
    ])
    if (o.error) { setHata(hataMetni(o.error)); return }
    const idler = (o.data ?? []).map((x) => x.id)
    let gorevler = []
    if (idler.length) {
      const g = await supabase.from('gorevler').select('id, ogrenci_id, tarih, durum').in('ogrenci_id', idler).gte('tarih', ilk).lte('tarih', bugun)
      if (g.error) { setHata(hataMetni(g.error)); return }
      gorevler = g.data ?? []
    }
    setHata('')
    setVeri({
      ogrenciler: o.data ?? [],
      riskler: Object.fromEntries((r.data ?? []).map((x) => [x.ogrenci_id, x])),
      temaslar: Object.fromEntries((t.data ?? []).map((x) => [x.ogrenci_id, x])),
      gorevler,
    })
  }, [ilk, bugun])

  useEffect(() => { yukle() }, [yukle])

  const satirlar = useMemo(() => {
    if (!veri) return []
    return veri.ogrenciler
      .map((o) => {
        const risk = veri.riskler[o.id] ?? null
        const temas = veri.temaslar[o.id] ?? null
        const kendi = veri.gorevler.filter((g) => g.ogrenci_id === o.id)
        const bugunku = kendi.filter((g) => g.tarih === bugun)
        const biten = bugunku.filter((g) => g.durum === 'tamamlandi').length
        const ritim = gunler.map((gun) => {
          const liste = kendi.filter((g) => g.tarih === gun)
          const oran = liste.length ? liste.filter((g) => g.durum === 'tamamlandi').length / liste.length : 0
          if (!liste.length) return 'y'
          if (oran >= 0.8) return 't'
          if (gun === bugun) return 'n'
          return oran > 0 ? 'k' : 'b'
        })
        const son = sonHareket(risk)
        const seviye = risk?.risk_seviyesi ?? 'izle'
        return {
          o, id: o.id, ad: o.profiller?.ad_soyad ?? 'Öğrenci', risk, temas, seviye, son, ritim,
          biten, toplam: bugunku.length,
          dokunuldu: dokunulduMu(temas) && temas?.zaman && new Date(temas.zaman).toDateString() === new Date().toDateString(),
        }
      })
      .sort((a, b) => (b.risk?.risk_ham ?? -1) - (a.risk?.risk_ham ?? -1))
  }, [veri, gunler, bugun])

  const suzgecler = [
    ['tumu', 'Tümü', () => true],
    ['acil', 'Önce bunlar', (s) => s.seviye === 'acil'],
    ['girmedi', 'Bugün girmeyenler', (s) => !s.son.bugun],
    ['plansiz', 'Plansız', (s) => s.toplam === 0],
  ]
  const aktifSuzgec = suzgecler.find((x) => x[0] === suzgec)[2]
  const ilkId = satirlar[0]?.id ?? null
  useEffect(() => { if (ilkId) onIlk?.(ilkId) }, [ilkId]) // eslint-disable-line react-hooks/exhaustive-deps
  const aranan = arama.trim().toLocaleLowerCase('tr')
  const gorunen = satirlar.filter((s) => aktifSuzgec(s) && (!aranan || s.ad.toLocaleLowerCase('tr').includes(aranan)))
  /* Toplu mesaj: öncelikli ve bugün henüz dokunulmamış öğrenciler. Mesaj
     ya da görüşme kaydı olan öğrenciye ikinci kez gitmez. */
  const durtmeHedefi = satirlar.filter((s) => s.seviye === 'acil' && !dokunulduMu(s.temas)).map((s) => s.o)


  return (
    <div className="on2">
      <div className="on2-arac">
        <div className="on2-ara-satir">
        <label className="on2-ara">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></svg>
          <input type="search" value={arama} onChange={(e) => setArama(e.target.value)} placeholder="Öğrenci ara" aria-label="Öğrenci ara" />
        </label>
        {onEkle !== false && (
          <button type="button" className="on2-ekle" onClick={() => setEkleAcik(true)} aria-label="Öğrenci ekle">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            Ekle
          </button>
        )}
        </div>
        <div className="on2-suz" role="group" aria-label="Süzgeç">
          {suzgecler.map(([k, ad, f]) => (
            <button key={k} type="button" aria-pressed={suzgec === k} onClick={() => setSuzgec(k)}>
              {ad}<span>{satirlar.filter(f).length}</span>
            </button>
          ))}
        </div>
      </div>

      {ekleAcik && (
        <AltSayfa baslik="Öğrenci ekle" onKapat={() => setEkleAcik(false)} dugmeler={<Dugme tur="ikincil" onClick={() => setEkleAcik(false)}>Kapat</Dugme>}>
          <OgrenciFormu kataloglar={kataloglar} onEklendi={yukle} />
        </AltSayfa>
      )}
      {hata && <p className="ana-hata">{hata}</p>}

      {durtmeHedefi.length > 0 && !topluAcik && (
        <div className="on2-toplu">
          <p><b>{durtmeHedefi.length} öğrenciye</b> bugün henüz dokunulmadı. Hepsine aynı kısa mesajı gönder.</p>
          <button type="button" onClick={() => setTopluAcik(true)}>Toplu mesaj</button>
        </div>
      )}
      {topluAcik && (
        <TopluDurtme ogrenciler={durtmeHedefi} onKapat={() => setTopluAcik(false)} onGonderildi={() => { setTopluAcik(false); yukle() }} />
      )}

      {!veri && !hata ? (
        <div className="on2-grup" aria-busy="true"><div className="on2-bekle" /><div className="on2-bekle" /></div>
      ) : veri && veri.ogrenciler.length === 0 ? (
        <div className="gd-bos"><strong>Henüz öğrencin yok.</strong><span>Hesap menüsündeki Yönetim'den ilk öğrencini ekleyebilirsin.</span></div>
      ) : gorunen.length === 0 ? (
        <div className="gd-bos"><strong>Eşleşen öğrenci yok.</strong><span>Aramayı ya da süzgeci değiştir.</span></div>
      ) : (
        GRUPLAR.map(([seviye, ad, renk]) => {
          const liste = gorunen.filter((s) => (s.seviye === seviye) || (seviye === 'izle' && !['acil', 'iyi'].includes(s.seviye)))
          if (!liste.length) return null
          return (
            <section key={seviye} className="on2-grup" aria-label={ad}>
              <div className="on2-grup-bas"><i style={{ background: renk }} />{ad}</div>
              {liste.map((s) => {
                const oran = s.toplam ? s.biten / s.toplam : 0
                const temasYazi = s.dokunuldu ? temasMetni(s.temas) : null
                return (
                  <div key={s.id} className={`on2-satir${s.id === seciliId ? ' on2-satir--secili' : ''}`}>
                    <button type="button" className="on2-ac" onClick={() => onOgrenciAc?.(s.id)} aria-label={`${s.ad}, detayı aç`}>
                      <span className="on2-halka">
                        <svg viewBox="0 0 48 48" aria-hidden="true">
                          <circle cx="24" cy="24" r="21" fill="none" stroke="var(--m-yumusak)" strokeWidth="4" />
                          {oran > 0 && <circle cx="24" cy="24" r="21" fill="none" stroke={HALKA[s.seviye] ?? 'var(--m-vurgu)'} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${oran * CEVRE} ${CEVRE}`} transform="rotate(-90 24 24)" />}
                        </svg>
                        <OgrenciBasi yol={s.o.profiller?.fotograf_yolu} ad={s.ad} />
                      </span>
                      <span className="on2-yazi">
                        <b>{s.ad}</b>
                        <span className="on2-alt">
                          {temasYazi ? (
                            <em className="on2-yesil">{temasYazi}</em>
                          ) : (
                            <em className={s.son.tur === 'dikkat' ? 'on2-kirmizi' : s.son.tur === 'iyi' ? 'on2-yesil' : ''}>{s.son.metin}</em>
                          )}
                        </span>
                        <span className="on2-ritim">
                          <span className="on2-noktalar" aria-label="Son 7 gün">{s.ritim.map((d, i) => <i key={i} className={`on2-r on2-r--${d}`} />)}</span>
                          <span className="on2-bugun">{s.toplam ? <>bugün <b>{s.biten} / {s.toplam}</b> iş</> : 'bugün plan yok'}</span>
                        </span>
                      </span>
                    </button>
                    <span className="on2-eylem">
                      <button type="button" aria-label={`${s.ad.split(' ')[0]}'e mesaj`} onClick={() => onMesaj?.(s.id)}>
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h16v11H9l-5 4z" /></svg>
                      </button>
                    </span>
                  </div>
                )
              })}
            </section>
          )
        })
      )}

      <details className="on2-lejant">
        <summary>Halka ve noktalar ne anlatıyor?</summary>
        <p>Halka bugünün işlerinden ne kadarının bittiğini gösterir. Noktalar son 7 gün:</p>
        <div>
          <span><i className="on2-r on2-r--t" />günü tamamladı</span>
          <span><i className="on2-r on2-r--k" />kısmen</span>
          <span><i className="on2-r on2-r--b" />çalışmadı</span>
          <span><i className="on2-r on2-r--n" />bugün</span>
          <span><i className="on2-r on2-r--y" />plan yok</span>
        </div>
      </details>
    </div>
  )
}
