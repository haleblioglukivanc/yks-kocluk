import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Kart, Uyari, Yukleniyor } from './Ortak.jsx'
import './SosyalKutusu.css'

/* Sosyal Gelen Kutusu: Instagram DM/yorumları ve YouTube yorumları tek listede.
   Hiçbir yanıt onaysız gitmez. Kriz/istismar her zaman en üstte; onlar için
   sunucu ayrıca e-posta atar (sosyal_acil_bildir). Liste sosyal_kutusu(),
   atla/geri al sosyal_karar() RPC'si; gönderme sosyal-yanit fonksiyonunda,
   çünkü platform anahtarı orada. */

const KATEGORI = {
  kriz: 'Kriz', istismar: 'İstismar', bilgi: 'Bilgi / fiyat', ders: 'Ders', psikoloji: 'Psikoloji',
  net: 'Net', hakaret: 'Spam', tesekkur: 'Teşekkür', diger: 'Diğer',
}
const ACIL = new Set(['kriz', 'istismar'])
const BEKLEYEN = new Set(['bekliyor', 'yanitsiz', 'hata'])

const FILTRELER = [
  ['bekleyen', 'Bekleyen', (m) => BEKLEYEN.has(m.durum)],
  ['tumu', 'Tümü', () => true],
  ['instagram', 'Instagram', (m) => m.platform === 'instagram'],
  ['youtube', 'YouTube', (m) => m.platform === 'youtube'],
  ['acil', 'Acil', (m) => ACIL.has(m.kategori)],
]

function once(t) {
  const dk = Math.max(0, Math.round((Date.now() - new Date(t).getTime()) / 60000))
  if (dk < 1) return 'şimdi'
  if (dk < 60) return `${dk} dk önce`
  const sa = Math.round(dk / 60)
  if (sa < 24) return `${sa} sa önce`
  return new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
}

function PlatformIkon({ platform }) {
  return platform === 'youtube' ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="4" /><path d="M10 9l5 3-5 3z" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.8" />
    </svg>
  )
}

function Mesaj({ m, onDegisti }) {
  const acil = ACIL.has(m.kategori)
  const [metin, setMetin] = useState(m.taslak ?? '')
  const [isleniyor, setIsleniyor] = useState(false)
  const [hata, setHata] = useState(m.durum === 'hata' ? m.hata : '')
  const kaynak = `${m.platform === 'youtube' ? 'YouTube' : 'Instagram'} ${m.tur === 'dm' ? 'DM' : 'yorum'}`
  const kim = m.gonderen_ad ? `@${m.gonderen_ad}` : m.tur === 'dm' ? 'Mesaj isteği' : 'Adsız'

  const gonder = async () => {
    setIsleniyor(true); setHata('')
    const { data, error } = await supabase.functions.invoke('sosyal-yanit', {
      body: { islem: 'gonder', id: m.id, metin },
    })
    setIsleniyor(false)
    if (error || !data?.ok) {
      let ileti = data?.hata
      try { ileti = ileti ?? (await error?.context?.json())?.hata } catch { /* yoksay */ }
      setHata(ileti ?? hataMetni(error))
      return
    }
    onDegisti()
  }
  const karar = async (islem) => {
    setIsleniyor(true); setHata('')
    const { error } = await supabase.rpc('sosyal_karar', { p_id: m.id, p_islem: islem })
    setIsleniyor(false)
    if (error) return setHata(hataMetni(error))
    onDegisti()
  }

  if (!BEKLEYEN.has(m.durum)) {
    const gitti = m.durum === 'gonderildi'
    return (
      <li className="sk-satir">
        <span className={`sk-cip ${gitti ? 'sk-cip--iyi' : ''}`}>{gitti ? 'Gönderildi' : 'Atlandı'}</span>
        <span className="sk-satir-metin">
          <PlatformIkon platform={m.platform} /> {kim}: {gitti ? m.gonderilen : m.mesaj}
        </span>
        {m.durum === 'atlandi' && (
          <button className="sk-bag" onClick={() => karar('geri_al')} disabled={isleniyor}>Geri al</button>
        )}
      </li>
    )
  }

  return (
    <li>
      <article className={acil ? 'sk-kart sk-kart--acil' : 'sk-kart'}>
        {acil && (
          <p className="sk-acil">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3l9.5 17h-19z" /><path d="M12 10v4" /><path d="M12 17.5v.01" />
            </svg>
            Hemen bak. Sana e-posta gönderildi. Yanıt yapay zekâ değil, sabit metin.
          </p>
        )}
        <header className="sk-bas">
          <span className={`sk-cip sk-cip--${m.platform}`}><PlatformIkon platform={m.platform} /> {kaynak}</span>
          <strong>{kim}</strong>
          <span className={acil ? 'sk-cip sk-cip--acil' : 'sk-cip'}>{KATEGORI[m.kategori] ?? m.kategori}</span>
          {m.deneme && <span className="sk-cip sk-cip--deneme">Deneme</span>}
          <span className="sk-zaman">{once(m.olusturma)}</span>
        </header>
        {m.baglam && <p className="sk-baglam">{m.baglam}</p>}
        <blockquote className="sk-mesaj">{m.mesaj}</blockquote>

        {m.taslak != null ? (
          <>
            <label className="sk-alan">
              <span>{acil ? 'Sabit güvenli yanıt' : 'Yanıt taslağı (düzenleyebilirsin)'}</span>
              <textarea rows={3} value={metin} onChange={(e) => setMetin(e.target.value)} />
            </label>
            <Uyari>{hata}</Uyari>
            <div className="sk-dugmeler">
              <button className={acil ? 'sk-gonder sk-gonder--acil' : 'sk-gonder'} onClick={gonder}
                disabled={isleniyor || !metin.trim()}>
                {isleniyor ? 'Gönderiliyor…' : acil ? 'Sabit yanıtı gönder' : m.durum === 'hata' ? 'Tekrar dene' : 'Gönder'}
              </button>
              <button className="sk-atla" onClick={() => karar('atla')} disabled={isleniyor}>Atla</button>
            </div>
          </>
        ) : (
          <>
            <p className="sk-not">Yanıt önerilmiyor. Platformda gizlemeyi düşünebilirsin.</p>
            <Uyari>{hata}</Uyari>
            <div className="sk-dugmeler">
              <button className="sk-atla" onClick={() => karar('atla')} disabled={isleniyor}>Tamam, kaldır</button>
            </div>
          </>
        )}
      </article>
    </li>
  )
}

export default function SosyalKutusu({ onSayac }) {
  const [liste, setListe] = useState(null)
  const [hata, setHata] = useState('')
  const [filtre, setFiltre] = useState('bekleyen')

  const yukle = useCallback(async () => {
    const { data, error } = await supabase.rpc('sosyal_kutusu')
    if (error) return setHata(hataMetni(error))
    setHata('')
    setListe(data ?? [])
  }, [])

  useEffect(() => { yukle() }, [yukle])
  // Sekme açıkken yeni gelenler için dakikada bir tazele
  useEffect(() => {
    const t = setInterval(yukle, 60000)
    return () => clearInterval(t)
  }, [yukle])

  const ozet = useMemo(() => {
    const l = liste ?? []
    const bekleyen = l.filter((m) => BEKLEYEN.has(m.durum))
    const bugun = new Date().toDateString()
    return {
      bekleyen: bekleyen.length,
      acil: bekleyen.filter((m) => ACIL.has(m.kategori)).length,
      yanitlanan: l.filter((m) => m.durum === 'gonderildi' && m.karar_zaman &&
        new Date(m.karar_zaman).toDateString() === bugun).length,
    }
  }, [liste])

  useEffect(() => { if (liste) onSayac?.({ bekleyen: ozet.bekleyen, acil: ozet.acil }) }, [liste, ozet, onSayac])

  const gorunen = useMemo(() => {
    const uyan = FILTRELER.find(([k]) => k === filtre)[2]
    return (liste ?? []).filter(uyan).sort((a, b) =>
      (ACIL.has(b.kategori) && BEKLEYEN.has(b.durum)) - (ACIL.has(a.kategori) && BEKLEYEN.has(a.durum)) ||
      BEKLEYEN.has(b.durum) - BEKLEYEN.has(a.durum) ||
      new Date(b.olusturma) - new Date(a.olusturma))
  }, [liste, filtre])

  return (
    <Kart
      baslik="Sosyal Gelen Kutusu"
      altBaslik="Instagram mesaj ve yorumları ile YouTube yorumları. Hiçbir yanıt onayın olmadan gitmez."
      eylem={liste && (
        <div className="sk-ozet">
          <div><strong>{ozet.bekleyen}</strong><span>bekleyen</span></div>
          <div><strong className="sk-ozet--iyi">{ozet.yanitlanan}</strong><span>bugün yanıtlanan</span></div>
          <div><strong className={ozet.acil ? 'sk-ozet--acil' : ''}>{ozet.acil}</strong><span>acil</span></div>
        </div>
      )}
    >
      {hata && <Uyari>{hata}</Uyari>}
      {!liste && !hata && <Yukleniyor metin="Mesajlar geliyor" satir={4} />}
      {liste && (
        <>
          <div className="sk-filtreler" role="group" aria-label="Filtre">
            {FILTRELER.map(([k, ad, uyan]) => (
              <button key={k} aria-pressed={filtre === k} className={filtre === k ? 'sk-filtre sk-filtre--etkin' : 'sk-filtre'}
                onClick={() => setFiltre(k)}>
                {ad} <span>{liste.filter(uyan).length}</span>
              </button>
            ))}
          </div>
          {gorunen.length === 0 ? (
            <p className="sk-bos">Bu filtrede bekleyen bir şey yok. Yeni mesajlar geldikçe burada belirir.</p>
          ) : (
            <ul className="sk-liste">
              {gorunen.map((m) => <Mesaj key={`${m.id}-${m.durum}`} m={m} onDegisti={yukle} />)}
            </ul>
          )}
        </>
      )}
    </Kart>
  )
}
