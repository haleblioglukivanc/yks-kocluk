import { useEffect, useMemo, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Avatar } from './Fotograf.jsx'
import { dersGorunumu } from '../lib/dersGorunum.js'
import { gunEkle, yerelIso } from '../lib/hafta.js'

/* "Öğrencilerim" — koç ana sayfasının akış bölümü (21 Eylül 2026).
   Eski Öğrenciler sekmesinin listesi ile "bugünün tablosu" tek yerde:
   her satırda bugünün işleri canlı, yanında son 7 günün ritmi.
   Ritim noktası: dolu = günü tamamladı (%80+), halka = kısmen,
   ince halka = plan vardı çalışmadı, çizgi = o gün plan yok. */

const GUN = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']

function sonHareket(r) {
  if (!r?.son_aktiflik) return { metin: 'Henüz giriş yok', tur: 'dikkat' }
  const t = new Date(r.son_aktiflik)
  const bugun = new Date()
  const gunFarki = Math.floor((new Date(bugun.toDateString()) - new Date(t.toDateString())) / 86400000)
  if (gunFarki <= 0) {
    return { metin: `Bugün ${t.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`, tur: 'iyi' }
  }
  if (gunFarki === 1) return { metin: 'Dün girdi', tur: 'notr' }
  return { metin: `${gunFarki} gündür giriş yok`, tur: 'dikkat' }
}

export default function OgrenciNabzi({ onOgrenciAc }) {
  const [veri, setVeri] = useState(null)
  const [hata, setHata] = useState('')
  const [arama, setArama] = useState('')
  const [suzgec, setSuzgec] = useState('tumu')

  const bugun = yerelIso(new Date())
  const ilk = gunEkle(bugun, -6)
  const gunler = useMemo(() => Array.from({ length: 7 }, (_, i) => gunEkle(ilk, i)), [ilk])

  useEffect(() => {
    let iptal = false
    ;(async () => {
      const { data: oturum } = await supabase.auth.getSession()
      const benimId = oturum?.session?.user?.id
      if (!benimId) return
      const [o, r] = await Promise.all([
        supabase
          .from('ogrenciler')
          .select('id, sinif, alan, aktif, profiller!ogrenciler_id_fkey(ad_soyad, fotograf_yolu)')
          .eq('koc_id', benimId)
          .eq('aktif', true),
        supabase
          .from('ogrenci_risk')
          .select('ogrenci_id, risk_seviyesi, risk_ham, son_aktiflik')
          .eq('koc_id', benimId),
      ])
      if (o.error) {
        if (!iptal) setHata(hataMetni(o.error))
        return
      }
      const idler = (o.data ?? []).map((x) => x.id)
      let gorevler = []
      if (idler.length) {
        const g = await supabase
          .from('gorevler')
          .select('id, ogrenci_id, tarih, tur, baslik, durum, hedef_adet, yapilan_adet, dersler(ad), konular(ad)')
          .in('ogrenci_id', idler)
          .gte('tarih', ilk)
          .lte('tarih', bugun)
          .order('id')
        if (g.error) {
          if (!iptal) setHata(hataMetni(g.error))
          return
        }
        gorevler = g.data ?? []
      }
      if (iptal) return
      setHata('')
      setVeri({
        ogrenciler: o.data ?? [],
        riskler: Object.fromEntries((r.data ?? []).map((x) => [x.ogrenci_id, x])),
        gorevler,
      })
    })()
    return () => { iptal = true }
  }, [ilk, bugun])

  const satirlar = useMemo(() => {
    if (!veri) return []
    return veri.ogrenciler
      .map((o) => {
        const risk = veri.riskler[o.id] ?? null
        const kendi = veri.gorevler.filter((g) => g.ogrenci_id === o.id)
        const bugunku = kendi.filter((g) => g.tarih === bugun)
        const ritim = gunler.map((gun) => {
          const liste = kendi.filter((g) => g.tarih === gun)
          const oran = liste.length ? liste.filter((g) => g.durum === 'tamamlandi').length / liste.length : 0
          const bugunMu = gun === bugun
          let d = 'y'
          if (liste.length) d = oran >= 0.8 ? 't' : bugunMu ? 'n' : oran > 0 ? 'k' : 'b'
          const ad = GUN[new Date(`${gun}T00:00:00`).getDay()]
          const aciklama = { y: 'plan yok', t: 'tamamladı', k: 'kısmen', b: 'çalışmadı', n: 'sürüyor' }[d]
          return { gun, d, etiket: `${ad}: ${aciklama}` }
        })
        const biten = bugunku.filter((g) => g.durum === 'tamamlandi').length
        return {
          id: o.id,
          ad: o.profiller?.ad_soyad ?? 'Öğrenci',
          foto: o.profiller?.fotograf_yolu ?? null,
          risk,
          son: sonHareket(risk),
          bugunku,
          biten,
          toplam: bugunku.length,
          ritim,
        }
      })
      .sort((a, b) => (b.risk?.risk_ham ?? -1) - (a.risk?.risk_ham ?? -1))
  }, [veri, gunler, bugun])

  const aranan = arama.trim().toLocaleLowerCase('tr')
  const gorunen = satirlar.filter(
    (s) =>
      (suzgec === 'tumu' || ['acil', 'izle'].includes(s.risk?.risk_seviyesi)) &&
      (!aranan || s.ad.toLocaleLowerCase('tr').includes(aranan)),
  )

  return (
    <section className="ana-bolum ana-kart ogrenci-nabzi" aria-label="Öğrencilerim">
      <div className="ana-bolum-bas">
        <div className="ana-bolum-baslik">
          <h2>Öğrencilerim</h2>
          <p>Bugünün işleri canlı; noktalar son 7 günün ritmi.</p>
        </div>
        <div className="on-arac">
          {satirlar.length > 6 && (
          <label className="on-ara">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" />
              <path d="M16 16l4 4" />
            </svg>
            <input
              type="search"
              value={arama}
              onChange={(e) => setArama(e.target.value)}
              placeholder="Öğrenci ara"
              aria-label="Öğrenci ara"
            />
          </label>
          )}
          <div className="ana-anahtar" role="group" aria-label="Süzgeç">
            <button type="button" aria-pressed={suzgec === 'tumu'} onClick={() => setSuzgec('tumu')}>Tümü</button>
            <button type="button" aria-pressed={suzgec === 'dikkat'} onClick={() => setSuzgec('dikkat')}>Dikkat</button>
          </div>
        </div>
      </div>

      {hata && <p className="ana-hata">{hata}</p>}

      {!veri && !hata ? (
        <div className="on-liste" aria-busy="true">
          {[0, 1, 2].map((i) => <div key={i} className="on-satir on-satir--bekle" />)}
        </div>
      ) : veri && veri.ogrenciler.length === 0 ? (
        <div className="gd-bos">
          <strong>Henüz öğrencin yok.</strong>
          <span>Hesap menüsündeki Yönetim'den ilk öğrencini ekleyebilirsin.</span>
        </div>
      ) : (
        <div className="on-liste">
          <div className="on-baslik" aria-hidden="true">
            <span>Öğrenci</span>
            <span>Bugünün işleri</span>
            <span>Son 7 gün</span>
            <span>Bugün</span>
          </div>
          {gorunen.map((s) => (
            <button key={s.id} type="button" className="on-satir" onClick={() => onOgrenciAc?.(s.id)}>
              <span className="on-kim">
                <Avatar yol={s.foto} ad={s.ad} boyut="orta" />
                <span className="on-kim-yazi">
                  <b>{s.ad}</b>
                  <span className={`on-son on-son--${s.son.tur}`}>{s.son.metin}</span>
                </span>
              </span>
              <span className="on-isler">
                {s.bugunku.length === 0 ? (
                  <span className="on-bos">Bugün için plan yok</span>
                ) : (
                  s.bugunku.map((g) => {
                    const ders = g.dersler?.ad ?? null
                    const ad = g.konular?.ad || g.baslik || ders || 'Çalışma'
                    const bitti = g.durum === 'tamamlandi'
                    const kismen = !bitti && (g.yapilan_adet ?? 0) > 0
                    return (
                      <span key={g.id} className={`on-is${bitti ? ' on-is--bitti' : kismen ? ' on-is--kismen' : ''}`}>
                        {bitti ? (
                          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="var(--m-yolunda)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-label="bitti">
                            <path d="M5 12.5l4.5 4.5L19 7" />
                          </svg>
                        ) : (
                          <i className={kismen ? 'on-nokta on-nokta--canli' : 'on-nokta'} aria-label={kismen ? 'sürüyor' : 'bekliyor'} />
                        )}
                        <i className="on-ders" style={{ background: dersGorunumu(ders).renk }} aria-hidden="true" />
                        {ad}
                      </span>
                    )
                  })
                )}
              </span>
              <span className="on-ritim" role="img" aria-label={`Son 7 gün: ${s.ritim.map((r) => r.etiket).join(', ')}`}>
                <i className="on-ritim-cizgi" aria-hidden="true" />
                {s.ritim.map((r) => <i key={r.gun} className={`on-r on-r--${r.d}`} />)}
              </span>
              <span className="on-bugun">
                <b>{s.toplam ? `${s.biten} / ${s.toplam}` : '—'}</b>
                <span className="on-cubuk"><span style={{ width: s.toplam ? `${Math.round((s.biten / s.toplam) * 100)}%` : 0 }} /></span>
              </span>
            </button>
          ))}
          {gorunen.length === 0 && <p className="on-bos on-bos--satir">Bu süzgece uyan öğrenci yok.</p>}
          <div className="on-aciklama" aria-hidden="true">
            <span><i className="on-r on-r--t" />günü tamamladı</span>
            <span><i className="on-r on-r--k" />kısmen</span>
            <span><i className="on-r on-r--b" />çalışmadı</span>
            <span><i className="on-r on-r--n" />bugün, sürüyor</span>
            <span><i className="on-r on-r--y" />plan yok</span>
          </div>
        </div>
      )}
    </section>
  )
}
