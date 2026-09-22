import { useCallback, useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { haftaBasi } from '../lib/hafta.js'

/* Haftalık izleme linkleri (22 Eylül 2026, Bekir mokabı onayladı).
   Koç öğrencinin haftasına link ekler; öğrenci linki uygulama dışında açar,
   izledikten sonra tiki kendisi atar (açıp açmadığı denetlenmez, geri
   alınabilir). Linkler güne değil haftaya ait: öğrencide her gün aynı yerde.
   Aynı bileşen iki ekranda: koçun öğrenci ekranı (rol="koc") ve öğrencinin
   Programım'ı (rol="ogrenci"). */

const GUN = ['Paz', 'Pzt', 'Salı', 'Çrş', 'Prş', 'Cuma', 'Cmt']
const saatYaz = (t) => {
  const d = new Date(t)
  return `${GUN[d.getDay()]} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
const alanAdi = (u) => { try { return new URL(u).hostname.replace(/^www\.|^m\./, '') } catch { return 'link' } }
const youtubeMu = (u) => /(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(alanAdi(u))

async function baslikBul(url) {
  if (!youtubeMu(url)) return null
  try {
    const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`)
    if (!r.ok) return null
    const j = await r.json()
    return j?.title ? String(j.title).slice(0, 200) : null
  } catch { return null }
}

function Kucuk({ url }) {
  const yt = youtubeMu(url)
  return (
    <span className={`hl-kucuk${yt ? ' hl-kucuk--yt' : ''}`} aria-hidden="true">
      {yt ? (
        <svg viewBox="0 0 24 24" width="16" height="16"><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>
      )}
    </span>
  )
}

export default function HaftalikLinkler({ ogrenciId, rol = 'ogrenci', saltOkunur = false }) {
  const koc = rol === 'koc'
  const hafta = haftaBasi()
  const [liste, setListe] = useState(null)
  const [hata, setHata] = useState('')
  const [url, setUrl] = useState('')
  const [not, setNot] = useState('')
  const [ekleniyor, setEkleniyor] = useState(false)

  const yukle = useCallback(async () => {
    if (!ogrenciId) return
    const { data, error } = await supabase.from('haftalik_link')
      .select('id, url, baslik, not_metni, izlendi')
      .eq('ogrenci_id', ogrenciId).eq('hafta_basi', hafta).eq('kapandi', false)
      .order('id')
    if (error) { setHata(hataMetni(error)); setListe([]); return }
    setListe(data ?? [])
  }, [ogrenciId, hafta])

  useEffect(() => { yukle() }, [yukle])

  async function ekle(e) {
    e.preventDefault()
    let u = url.trim()
    if (!u) return
    if (!/^https?:\/\//i.test(u)) u = `https://${u}`
    try { new URL(u) } catch { setHata('Bu bir link gibi görünmüyor.'); return }
    setEkleniyor(true); setHata('')
    const baslik = (await baslikBul(u)) ?? alanAdi(u)
    const { error } = await supabase.from('haftalik_link').insert({
      ogrenci_id: ogrenciId, hafta_basi: hafta, url: u, baslik,
      not_metni: not.trim() || null,
    })
    setEkleniyor(false)
    if (error) { setHata(hataMetni(error)); return }
    setUrl(''); setNot('')
    yukle()
  }

  async function sil(l) {
    const onceki = liste
    setListe((x) => x.filter((y) => y.id !== l.id))
    const { error } = await supabase.from('haftalik_link').delete().eq('id', l.id)
    if (error) { setListe(onceki); setHata(hataMetni(error)) }
  }

  async function tikle(l) {
    if (saltOkunur) return
    const yeni = !l.izlendi
    const onceki = liste
    setListe((x) => x.map((y) => (y.id === l.id ? { ...y, izlendi: yeni ? new Date().toISOString() : null } : y)))
    const { error } = await supabase.rpc('link_izledim', { p_id: l.id, p_izledi: yeni })
    if (error) { setListe(onceki); setHata(hataMetni(error)) }
  }

  if (liste === null) return null
  /* Öğrencide link yoksa bölüm hiç çizilmez. */
  if (!koc && liste.length === 0) return null

  const izlenen = liste.filter((l) => l.izlendi).length
  const n = liste.length

  const satir = (l) => {
    const alt = [alanAdi(l.url), l.not_metni].filter(Boolean).join(' · ')
    return (
      <div key={l.id} className="hl-satir">
        <Kucuk url={l.url} />
        <span className="hl-bilgi">
          <a href={l.url} target="_blank" rel="noopener noreferrer">{l.baslik}</a>
          <small>{alt}</small>
        </span>
        {koc ? (
          <>
            <span className={`hl-durum${l.izlendi ? ' hl-durum--ok' : ''}`}>{l.izlendi ? `İzledi · ${saatYaz(l.izlendi)}` : 'Bekliyor'}</span>
            <button type="button" className="hl-sil" aria-label={`${l.baslik} linkini kaldır`} onClick={() => sil(l)}>×</button>
          </>
        ) : (
          <button type="button" className="hl-tik" aria-pressed={Boolean(l.izlendi)} aria-label={`${l.baslik}: izledim`} onClick={() => tikle(l)} disabled={saltOkunur}>✓</button>
        )}
      </div>
    )
  }

  if (koc) {
    return (
      <section className="hl hl--koc" aria-label="Bu haftanın izlenecekleri">
        <header className="hl-bas">
          <h3>Bu haftanın izlenecekleri</h3>
          {n > 0 && <small>{izlenen}/{n} izlendi</small>}
        </header>
        {n > 0 && <div className="hl-kart">{liste.map(satir)}</div>}
        <form className="hl-ekle" onSubmit={ekle}>
          <input type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Link yapıştır" aria-label="İzlenecek link" />
          <input type="text" value={not} onChange={(e) => setNot(e.target.value)} placeholder="Kısa not (isteğe bağlı)" aria-label="Kısa not" maxLength={200} />
          <button type="submit" disabled={ekleniyor || !url.trim()}>{ekleniyor ? 'Ekleniyor…' : 'Ekle'}</button>
        </form>
        {hata && <p className="pb-hata" role="alert">{hata}</p>}
      </section>
    )
  }

  return (
    <section className="pb-kart hl" aria-label="Bu hafta izle">
      <div className="pb-bas"><span>BU HAFTA İZLE</span><span>{izlenen} / {n}</span></div>
      {liste.map(satir)}
      <p className="hl-ipucu">İzledikten sonra tikle, koçun görsün.</p>
      {hata && <p className="pb-hata" role="alert">{hata}</p>}
    </section>
  )
}
