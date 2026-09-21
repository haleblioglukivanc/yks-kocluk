import { useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { AltSayfa } from './Ortak.jsx'
import { useMevsim } from '../lib/mevsim.js'
import { DenemeCizimi, YolCizimi } from '../ortak/KapiCizimleri.jsx'
import { belirtme, yonelme } from '../lib/turkce.js'

/* Öğrencinin koç ekranı v2 (22 Eylül 2026, Bekir'in onayladığı mokap). */

const pazartesi = () => {
  const d = new Date()
  const g = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - g)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const haftaSonu = (hb) => {
  const d = new Date(`${hb}T00:00:00`)
  d.setDate(d.getDate() + 6)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const bugunIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const net = (n) => String(Math.round(Number(n) * 100) / 100).replace('.', ',')
const sure = (dk) => (dk >= 60 ? `${Math.floor(dk / 60)} sa${dk % 60 ? ` ${dk % 60} dk` : ''}` : `${dk} dk`)

/** "Bu hafta": gösterge değil, dört cümle. */
export function HaftaOzeti({ ogrenciId, ad, onDenemeler, onKonular, tazele = 0 }) {
  const [v, setV] = useState(null)
  useEffect(() => {
    let iptal = false
    const hb = pazartesi()
    const bg = bugunIso()
    Promise.all([
      supabase.from('gorevler').select('tarih, durum, baslik, konular(ad)').eq('ogrenci_id', ogrenciId).gte('tarih', hb).lte('tarih', haftaSonu(hb)),
      supabase.from('seriler').select('guncel_seri').eq('ogrenci_id', ogrenciId).maybeSingle(),
      supabase.from('calisma_oturumlari').select('sure_dk, baslangic').eq('ogrenci_id', ogrenciId).gte('baslangic', `${hb}T00:00:00`),
      supabase.from('deneme_ozet').select('tarih, tur, toplam_net').eq('ogrenci_id', ogrenciId).order('tarih', { ascending: false }).limit(6),
      supabase.from('hata_defteri').select('sonraki_tekrar, ogrenildi').eq('ogrenci_id', ogrenciId),
      supabase.rpc('deneme_paneli', { p_ogrenci: ogrenciId, p_limit: 3 }),
    ]).then(([g, s, c, d, h, p]) => {
      if (iptal) return
      const gl = g.data ?? []
      const bugun = gl.filter((x) => x.tarih === bg)
      const sira = bugun.find((x) => x.durum !== 'tamamlandi')
      const dn = d.data ?? []
      const son = dn[0]
      const onceki = son ? dn.find((x, i) => i > 0 && x.tur === son.tur) : null
      setV({
        hafta: gl.length ? { top: gl.length, bit: gl.filter((x) => x.durum === 'tamamlandi').length } : null,
        bugunTop: bugun.length,
        bugunBit: bugun.filter((x) => x.durum === 'tamamlandi').length,
        sira: sira ? (sira.konular?.ad ?? sira.baslik) : null,
        seri: s.data?.guncel_seri ?? 0,
        dk: (c.data ?? []).reduce((a, x) => a + (x.sure_dk ?? 0), 0),
        son, fark: son && onceki ? Number(son.toplam_net) - Number(onceki.toplam_net) : null,
        tekrar: (h.data ?? []).filter((x) => !x.ogrenildi && x.sonraki_tekrar && x.sonraki_tekrar <= bg).length,
        zayif: p.data?.zayif?.[0]?.konu ?? null,
      })
    })
    return () => { iptal = true }
  }, [ogrenciId, tazele])
  if (!v) return <div className="oo-bekle" aria-busy="true" />
  const satirlar = [
    ['#D08A1E', v.hafta == null
      ? 'Bu hafta için henüz görev yok.'
      : <>Bu hafta <b>{v.hafta.top} işin {v.hafta.bit} tanesi</b> bitti.{v.bugunTop ? ` Bugün ${v.bugunTop} işin ${v.bugunBit} tanesi bitti${v.sira ? `, sırada ${v.sira}` : ''}.` : ' Bugün için görev yok.'}</>, null],
    ['#2D7A4E', v.seri > 1
      ? <><b>{v.seri} gündür</b> her gün çalışıyor.{v.dk ? <> Bu hafta sayaçla <b>{sure(v.dk)}</b>.</> : ' Sayacı bu hafta kullanmadı.'}</>
      : v.dk ? <>Bu hafta sayaçla <b>{sure(v.dk)}</b> çalıştı.</> : 'Bu hafta sayaçla çalışma kaydı yok.', null],
    ['#2E5BB8', v.son
      ? <>Son {String(v.son.tur).toUpperCase()} <b>{net(v.son.toplam_net)} net</b>{v.fark ? `, bir öncekinden ${net(Math.abs(v.fark))} ${v.fark > 0 ? 'fazla' : 'az'}` : ''}.</>
      : 'Henüz deneme girmedi.', ['Denemeler ›', onDenemeler]],
    ['#BE2847', v.tekrar || v.zayif
      ? <>{v.tekrar ? <>Hata defterinde <b>{v.tekrar} tekrar</b> bekliyor. </> : ''}{v.zayif ? `Denemelerde en çok ${v.zayif} konusunda kaçırıyor.` : ''}</>
      : 'Bekleyen tekrarı yok.', ['Konular ›', onKonular]],
  ]
  return (
    <section className="kp-bolum">
      <div className="kp-bolum-bas"><h2>Bu hafta</h2></div>
      <div className="kp-kart oo">
        {satirlar.map(([renk, metin, git], i) => (
          <div key={i} className="oo-satir">
            <i style={{ background: renk }} aria-hidden="true" />
            <span>{metin}</span>
            {git && <button type="button" className="oo-git" onClick={git[1]}>{git[0]}</button>}
          </div>
        ))}
      </div>
    </section>
  )
}

/** Denemeler ve Konular kapıları: öğrenci ana ekranındakilerin koç eşi. */
export function OgrenciKapilari({ ogrenciId, onDenemeler, onKonular }) {
  const mevsim = useMevsim()
  const [v, setV] = useState(null)
  useEffect(() => {
    let iptal = false
    Promise.all([
      supabase.from('deneme_ozet').select('tur, toplam_net').eq('ogrenci_id', ogrenciId).order('tarih', { ascending: false }).limit(4),
      supabase.from('konu_ilerleme').select('durum, koc_onayi').eq('ogrenci_id', ogrenciId),
    ]).then(([d, k]) => {
      if (iptal) return
      const kl = k.data ?? []
      setV({
        netler: (d.data ?? []).slice().reverse().map((x) => Number(x.toplam_net)),
        son: d.data?.[0] ?? null,
        toplam: kl.length,
        biten: kl.filter((x) => x.durum === 'tamamlandi').length,
        onay: kl.filter((x) => x.durum === 'tamamlandi' && !x.koc_onayi).length,
      })
    })
    return () => { iptal = true }
  }, [ogrenciId])
  return (
    <section className="ana-kapilar" aria-label="Denemeler ve Konular">
      <button type="button" className="ana-kapi" onClick={onDenemeler}>
        <DenemeCizimi mevsim={mevsim} netler={v?.netler ?? []} />
        <b>Denemeler</b>
        <span>{!v ? ' ' : v.son ? `Son ${String(v.son.tur).toUpperCase()} ${net(v.son.toplam_net)} net.` : 'Henüz deneme yok.'}</span>
      </button>
      <button type="button" className="ana-kapi" onClick={onKonular}>
        <YolCizimi mevsim={mevsim} oran={v?.toplam ? v.biten / v.toplam : 0} />
        <b>Konular</b>
        <span>{!v ? ' ' : `${v.toplam} konudan ${v.biten} tanesi bitti.${v.onay ? ` ${v.onay} tanesi onayını bekliyor.` : ''}`}</span>
      </button>
    </section>
  )
}

/** Haftayı hızlı kurmak: geçen haftayı kopyala, yarım kalanları yarına taşı, tekrarları boş günlere dağıt. */
export function HaftaToplu({ ogrenciId, onDegisti }) {
  const [bekliyor, setBekliyor] = useState(null)
  const [haber, setHaber] = useState('')
  async function calistir(ad, fn, sonuc) {
    setBekliyor(ad); setHaber('')
    const { data, error } = await supabase.rpc(fn, { p_ogrenci: ogrenciId, p_hafta_basi: pazartesi() })
    setBekliyor(null)
    if (error) { setHaber(hataMetni(error)); return }
    setHaber(sonuc(data ?? 0))
    onDegisti?.()
  }
  return (
    <div className="ht">
      <div className="ht-dugmeler">
        <button type="button" disabled={Boolean(bekliyor)} onClick={() => {
          if (!window.confirm('Geçen haftanın görevleri bu haftanın boş günlerine kopyalansın mı? Dolu günlere dokunulmaz.')) return
          calistir('kopya', 'koc_haftayi_kopyala', (n) => (n ? `${n} görev bu haftaya kopyalandı. Aşağıdaki haftadan günlere dokunup bakabilirsin.` : 'Kopyalanacak bir şey yok: bu haftanın günlerinde zaten görev var (geçen hafta daha önce kopyalanmış olabilir). Aşağıdaki haftadan günlere dokunup bakabilirsin.'))
        }}>{bekliyor === 'kopya' ? 'Kopyalanıyor…' : 'Geçen haftayı kopyala'}</button>
        <button type="button" disabled={Boolean(bekliyor)} onClick={() => {
          if (!window.confirm('Bu haftanın bugüne kadar bitmemiş görevleri yarına taşınsın mı?')) return
          calistir('tasi', 'koc_yarimlari_tasi', (n) => (n ? `${n} yarım görev yarına taşındı.` : 'Taşınacak yarım görev yok.'))
        }}>{bekliyor === 'tasi' ? 'Taşınıyor…' : 'Yarım kalanları yarına taşı'}</button>
        <button type="button" disabled={Boolean(bekliyor)} onClick={() => {
          if (!window.confirm('Bu haftanın boş günlerine (yarından itibaren) birer tekrar görevi yazılsın mı? Önce denemelerde en çok kaçırdığı konular gelir.')) return
          calistir('dagit', 'koc_tekrarlari_dagit', (n) => (n ? `${n} boş güne tekrar görevi yazıldı.` : 'Bu hafta boş gün yok ya da tekrar edilecek konu bulunamadı.'))
        }}>{bekliyor === 'dagit' ? 'Dağıtılıyor…' : 'Tekrarları boş günlere dağıt'}</button>
      </div>
      {haber && <p className="ht-haber" role="status">{haber}</p>}
    </div>
  )
}

/** Tepede açılan hızlı mesaj penceresi. */
export function HizliMesaj({ ogrenciId, ad, onKapat, onTumu }) {
  const [metin, setMetin] = useState('')
  const [son, setSon] = useState([])
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState('')
  const [ben, setBen] = useState(null)
  useEffect(() => {
    let iptal = false
    ;(async () => {
      const { data: o } = await supabase.auth.getSession()
      const id = o?.session?.user?.id
      if (iptal) return
      setBen(id)
      const { data } = await supabase.from('mesajlar').select('id, gonderen_id, icerik, olusturuldu')
        .or(`and(gonderen_id.eq.${id},alici_id.eq.${ogrenciId}),and(gonderen_id.eq.${ogrenciId},alici_id.eq.${id})`)
        .order('olusturuldu', { ascending: false }).limit(3)
      if (!iptal) setSon((data ?? []).reverse())
    })()
    return () => { iptal = true }
  }, [ogrenciId])
  async function gonder() {
    const icerik = metin.trim()
    if (!icerik || !ben) return
    setBekliyor(true); setHata('')
    const { error } = await supabase.from('mesajlar').insert({ gonderen_id: ben, alici_id: ogrenciId, icerik })
    setBekliyor(false)
    if (error) { setHata(hataMetni(error)); return }
    onKapat()
  }
  const ilk = String(ad).split(' ')[0]
  return (
    <AltSayfa baslik={`${yonelme(ilk)} mesaj`} onKapat={onKapat}>
      <div className="hm">
        {son.length > 0 && (
          <div className="hm-son">
            {son.map((m) => (
              <p key={m.id} className={m.gonderen_id === ben ? 'hm-balon hm-balon--ben' : 'hm-balon'}>{m.icerik}</p>
            ))}
          </div>
        )}
        <textarea className="yp-mesaj" rows={4} value={metin} onChange={(e) => setMetin(e.target.value)} placeholder={`${ilk} için bir şey yaz…`} aria-label="Mesaj" autoFocus />
        {hata && <p className="yp-hata">{hata}</p>}
        <button type="button" className="yp-birincil" disabled={bekliyor || !metin.trim()} onClick={gonder}>{bekliyor ? 'Gönderiliyor…' : 'Gönder'}</button>
        <button type="button" className="hm-tumu" onClick={onTumu}>Tüm yazışmayı aç ›</button>
      </div>
    </AltSayfa>
  )
}

export { belirtme }
