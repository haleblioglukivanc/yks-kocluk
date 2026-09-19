import { useEffect, useState } from 'react'
import EylemDugmesi from '../ortak/EylemDugmesi.jsx'
import { supabase, hataMetni } from '../lib/supabase.js'
import { dersGorunumu } from '../lib/dersGorunum.js'
import { Kart, Uyari } from './Ortak.jsx'
import GorevKaynagi from './GorevKaynagi.jsx'
import { SAYAC_SURELERI, bicimle, kalanMs, useSayac, useSayacTiki, varsayilanDk } from '../lib/sayac.jsx'
import { GOREV_TUR_OGRENCI } from '../lib/gorevTuru.js'
import { Kalem } from './Kalem.jsx'
import { cizbiKutlasin, azHareket } from '../lib/canli.js'

/* '10:00:00' -> '10:00' */
const saatKisa = (t) => (t ? String(t).slice(0, 5) : '')

/**
 * Bugün'ün merkezi: tek görev, tek düğme.
 *
 * Eskiden sayaç ayrı bir karttı ve görev listesinin üstünde üç süre
 * düğmesiyle duruyordu; öğrenci önce süre seçiyor, sonra listeden hangi
 * işe bakacağını buluyordu. Burada sıra tersine döndü: kart sıradaki işi
 * söyler, "Başla" o iş için sayacı açar. Sayaç çalışırken aynı kart
 * halkaya dönüşür — iki kart değil, bir kartın iki hâli.
 *
 * Süre görevden gelmiyor (gorevler tablosunda süre yok); türe göre
 * varsayılan seçiliyor, yanında iki alternatif duruyor.
 *
 * Öğrenci panelinde dokunulabilir, vekalette de aynı bileşen çizilir.
 */

function Halka({ durum }) {
  const kalan = kalanMs(durum)
  const oran = 1 - kalan / (durum.hedefDk * 60000)
  const C = 2 * Math.PI * 52
  return (
    <div className="sayac-halka">
      <svg viewBox="0 0 120 120" width="150" height="150" role="img"
           aria-label={`Kalan süre ${bicimle(kalan)}`}>
        <circle cx="60" cy="60" r="52" fill="none" stroke="var(--cizgi)" strokeWidth="8" />
        <circle cx="60" cy="60" r="52" fill="none" stroke="var(--ders-renk, var(--marka-amber))" strokeWidth="8"
                strokeLinecap="round" strokeDasharray={C}
                strokeDashoffset={C * (1 - oran)} transform="rotate(-90 60 60)" />
        <text x="60" y="67" textAnchor="middle" fontSize="23" fill="currentColor">
          {bicimle(kalan)}
        </text>
      </svg>
      {/* Halkanın yanında çalışan Çizbi: sayaç yalnız sayı değil, biri
          seninle çalışıyor hissi. Gövdesi yıpranma ile kısalıyor. */}
      <span className={durum.calisiyor ? 'sayac-cizbi sayac-cizbi--calisiyor' : 'sayac-cizbi'} aria-hidden="true">
        <Kalem ruh={durum.calisiyor ? 'bilendi' : 'uyku'} boyut={44} />
      </span>
    </div>
  )
}

export default function SiradakiKart({ gorevler, onDegisti, saltOkunur = false, serit = null, bugunMu = true, gunAdi = 'Günün hedefi' }) {
  const sayac = useSayac()
  const durum = sayac?.durum ?? null
  useSayacTiki(!!durum?.calisiyor)

  /* Atlama oturumluk: sayfa yenilenince sıra başa döner. Kalıcı olsaydı
     "atlandı" durumuna yazmak gerekirdi, o da koçun raporuna girerdi. */
  const [atlanan, setAtlanan] = useState([])
  /* Öğrencinin kendi seçimi. Sistem sıradaki işi tahmin ediyor ama o an
     canı başka bir işi çekebilir; listeden bir işe dokununca o iş öne
     geçer. Seçim oturumluk: iş bitince ya da sayfa yenilenince sıra
     kendi kuralına döner. */
  const [secim, setSecim] = useState(null)
  /* Blok gecikince açılan küçük panel: ek süre ya da mazeret. */
  const [talep, setTalep] = useState(null) // 'ek_sure' | 'mazeret'
  const [talepMetni, setTalepMetni] = useState('')
  const [ekDk, setEkDk] = useState(30)
  const [talepGitti, setTalepGitti] = useState(false)
  const [hata, setHata] = useState('')
  /* Mikro-etüt: gün sıfır kapanmasın diye akşam çıkan beş dakikalık teklif.
     Kalıcı bir "5 dk" düğmesi koymadık — her zaman duran beş dakika, kırk
     beş dakikalık işin kaçış kapısına dönüşüyor. */
  const [bugunDakika, setBugunDakika] = useState(null)
  const [mikroKapali, setMikroKapali] = useState(false)
  /* Bitirme koreografisi: kart sağa uçar, tik patlar, sıradaki kart
     gelir. Veri yazımı uçuşun sonuna denk gelir ki liste boşluk atlamasın. */
  const [ucan, setUcan] = useState(null)
  const [tik, setTik] = useState(0)
  /* Kartta süre önce seçilir, büyük düğme o süreyle başlatır. Seçim işe
     bağlı: başka işe geçince o işin varsayılan süresine döner. */
  const [sure, setSure] = useState(null)
  /* Bitenler tek satır; dokununca açılır (geri almak için). */
  const [bitenAcik, setBitenAcik] = useState(false)

  /* Bugün sayaç çalıştırılmış ama görev işaretlenmemiş olabilir; öyle bir
     günü "hiç çalışılmadı" saymak haksızlık olur. Onun için oturumlara da
     bakıyoruz. */
  useEffect(() => {
    if (!bugunMu || saltOkunur) {
      setBugunDakika(0)
      return undefined
    }
    let gecerli = true
    const gunBasi = new Date()
    gunBasi.setHours(0, 0, 0, 0)
    supabase
      .from('calisma_oturumlari')
      .select('sure_dk')
      .gte('baslangic', gunBasi.toISOString())
      .then(({ data }) => {
        if (gecerli) setBugunDakika((data ?? []).reduce((t, o) => t + (o.sure_dk ?? 0), 0))
      })
    return () => {
      gecerli = false
    }
  }, [bugunMu, saltOkunur, gorevler])

  const tumu = gorevler ?? []
  /* Görüşme bir çalışma değil: sayacı, atlanması, tamamlanması yok. Günde
     görünür ama sıradaki iş seçilirken hesaba katılmaz. */
  const liste = tumu.filter((g) => g.tur !== 'gorusme')
  /* Koç saat verdiğinde sıra saatten belli olur ve öğrencinin sırada
     duran iş budur. Ama kilitli değil (Eylül 2026'da değişti): saatli
     günde de öğrenci listeden başka bir işe dokunup ona geçebilir.
     Saat bir öneri ve düzen, bir yasak değil. */
  const saatli = liste.some((g) => g.baslangic_saat)
  const bekleyen = liste.filter((g) => g.durum !== 'tamamlandi')
  const calisan = durum?.gorevId ? liste.find((g) => g.id === durum.gorevId) : null
  const secilen = secim ? bekleyen.find((g) => g.id === secim) : null
  const sira =
    secilen ??
    (saatli
      ? (bekleyen[0] ?? null)
      : (bekleyen.find((g) => !atlanan.includes(g.id)) ?? bekleyen[0] ?? null))

  /* Iki yonlu: isaretlemek kadar geri almak da gerekiyor. Ogrenci yanlis
     tikleyebilir ya da bitirdigi bir konuyu tekrar calismak isteyebilir;
     tek yonlu bir tik, yanlisi duzeltmenin yolunu kapatiyordu. */
  async function durumYaz(g, bittiMi) {
    if (saltOkunur) return
    const { error } = await supabase
      .from('gorevler')
      .update({ durum: bittiMi ? 'tamamlandi' : 'bekliyor' })
      .eq('id', g.id)
    if (error) {
      setHata(hataMetni(error))
      return
    }
    setHata('')
    onDegisti?.()
  }

  const tamamla = (g) => durumYaz(g, true)
  async function tamamlaKutla(g) {
    if (saltOkunur) return
    if (azHareket()) { await durumYaz(g, true); return }
    setUcan(g.id)
    setTik((n) => n + 1)
    cizbiKutlasin()
    await new Promise((r) => setTimeout(r, 240))
    await durumYaz(g, true)
    setUcan(null)
  }

  async function talepGonder(gorevId, tur) {
    const { error } = await supabase.rpc('blok_talebi_ac', {
      p_gorev_id: gorevId,
      p_tur: tur,
      p_mesaj: talepMetni.trim() || null,
      p_ek_dk: tur === 'ek_sure' ? ekDk : null,
    })
    if (error) {
      setHata(hataMetni(error))
      return
    }
    setHata('')
    setTalep(null)
    setTalepMetni('')
    setTalepGitti(true)
  }

  /* Gunun butun isleri, sirada duran haric. Hem sira varken hem de gun
     bittiginde ayni liste ciziliyor: eskiden "hepsi bitti" hali listeyi
     hic gostermiyordu ve bitirilen isler ekrandan kayboluyordu. */
  /* Bugün (B tasarımı, 19 Eylül 2026): sıradaki işler numaralı, tiksiz.
     Bir işin bittiğini yalnız üstteki kart söyler; listeden yapmadan tik
     atma kapısı kapalı. Bitenler altta, geri alınabilir. */
  function Sira({ haric }) {
    const bekleyenler = bekleyen.filter((g) => g.id !== haric)
    const bitenler = liste.filter((g) => g.durum === 'tamamlandi')
    if (bekleyenler.length === 0 && bitenler.length === 0) return null
    const ad = (g) => g.konu || g.baslik || GOREV_TUR_OGRENCI[g.tur] || 'Çalışma'
    return (
      <div className="sb-liste">
        {bekleyenler.length > 0 && (
          <>
            <div className="sb-liste-bas">
              <h3>Sırada</h3>
              <p>Canın hangisini çekiyorsa ona dokun</p>
            </div>
            <ul className="sb-sira">
              {bekleyenler.map((g, i) => {
                const alt = [
                  g.baslangic_saat && saatKisa(g.baslangic_saat),
                  g.ders,
                  GOREV_TUR_OGRENCI[g.tur],
                  `${varsayilanDk(g.tur)}\u00a0dk`,
                ].filter(Boolean).join(' · ')
                return (
                  <li key={g.id} style={{ '--ders-renk': dersGorunumu(g.ders).renk }}>
                    <button
                      className="sb-satir"
                      disabled={saltOkunur}
                      onClick={() => { setSecim(g.id); setSure(null) }}
                      aria-label={`${ad(g)} işine geç`}
                    >
                      <span className="sb-no" aria-hidden="true">{i + (haric ? 2 : 1)}</span>
                      <span className="sb-metin">
                        <span className="sb-ad">{ad(g)}</span>
                        <span className="sb-alt">{alt}</span>
                      </span>
                      <span className="sb-gec" aria-hidden="true">Buna geç</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        )}
        {bitenler.length > 0 && (
          <div className="sb-bitenler">
            <button
              type="button"
              className="sb-bitenler-ac"
              aria-expanded={bitenAcik}
              onClick={() => setBitenAcik((a) => !a)}
            >
              <span className="sb-bitti-ikon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
              </span>
              <span>Bitenler · {bitenler.length}</span>
              <svg className="sb-ok" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
            </button>
            {bitenAcik && (
              <ul>
                {bitenler.map((g) => (
                  <li key={g.id}>
                    <span className="sb-bitti-ad">{ad(g)}</span>
                    {g.koc_isaretledi && <span className="sk-koc">Koçun işaretledi</span>}
                    {!saltOkunur && (
                      <button className="sb-geri" onClick={() => durumYaz(g, false)} aria-label={`${ad(g)} geri al`}>
                        Geri al
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    )
  }

  function Kalanlar({ haric }) {
    const satirlar = liste.filter((g) => g.id !== haric)
    if (satirlar.length === 0) return null
    return (
      <ul className="siradaki-kalanlar">
        {satirlar.map((g) => {
          const bitti = g.durum === 'tamamlandi'
          /* Ders rengi koç ekranındakiyle aynı kaynaktan: iki tarafta
             aynı ders aynı renkte görünsün. */
          const ders = dersGorunumu(g.ders)
          return (
            <li
              key={g.id}
              className={bitti ? 'sk-satir sk-satir--bitti' : 'sk-satir'}
              style={{ '--ders-renk': ders.renk }}
            >
              <button
                className="sk-tik"
                role="checkbox"
                aria-checked={bitti}
                aria-label={`${g.baslik || g.konu || 'Görev'}${bitti ? ' geri al' : ' tamamlandı'}`}
                disabled={saltOkunur}
                onClick={() => durumYaz(g, !bitti)}
              >
                <svg viewBox="0 0 12 12" aria-hidden="true">
                  <path d="M2 6.2 4.6 8.8 10 3.4" fill="none" stroke="currentColor"
                        strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {bitti ? (
                <>
                  {g.baslangic_saat && <span className="sk-saat">{saatKisa(g.baslangic_saat)}</span>}
                  <span className="sk-ad">
                    {g.baslik || [g.ders, g.konu].filter(Boolean).join(' · ')}
                  </span>
                  {/* Tiki koç attıysa öğrenci bunu bilmeli: kendi yapmadığı
                      bir işin bitmiş görünmesi açıklanmadan bırakılmaz. */}
                  {g.koc_isaretledi ? (
                    <span className="sk-koc">Koçun işaretledi</span>
                  ) : (
                    g.ders && <span className="sk-ders">{g.ders}</span>
                  )}
                </>
              ) : (
                /* Saatli günde de dokunulabilir: sıra saatten belli oluyor
                   ama öğrenci istediği işe geçebiliyor. */
                <button
                  className="sk-sec"
                  onClick={() => setSecim(g.id)}
                  aria-label={`${g.baslik || g.konu || 'Görev'} işine geç`}
                >
                  {g.baslangic_saat && <span className="sk-saat">{saatKisa(g.baslangic_saat)}</span>}
                  <span className="sk-ad">
                    {g.baslik || [g.ders, g.konu].filter(Boolean).join(' · ')}
                  </span>
                  {g.ders && <span className="sk-ders">{g.ders}</span>}
                </button>
              )}
            </li>
          )
        })}
      </ul>
    )
  }

  /* ── Sayaç çalışıyor: aynı kart halkaya dönüşür ── */
  if (durum) {
    const baslik = calisan
      ? calisan.baslik || [calisan.ders, calisan.konu].filter(Boolean).join(' · ')
      : 'Serbest çalışma'
    return (
      <Kart sinif="siradaki" baslik={baslik} altBaslik={`${durum.hedefDk} dk`}>
        {serit}
        <div style={calisan?.ders ? { '--ders-renk': dersGorunumu(calisan.ders).renk } : undefined}>
          <Halka durum={durum} />
        </div>
        <div className="sayac-dugmeler">
          {durum.calisiyor ? (
            <button className="dugme dugme--ikincil" onClick={sayac.duraklat}>Duraklat</button>
          ) : (
            <button className="dugme dugme--ikincil" onClick={sayac.devam}>Devam et</button>
          )}
          <button className="dugme dugme--birincil" onClick={sayac.bitir}>Bitir ve kaydet</button>
        </div>
        {!durum.calisiyor && <p className="kart-alt">Duraklattın. Süre işlemiyor.</p>}
      </Kart>
    )
  }

  /* ── Bugün değil: geçmiş ya da gelecek bir gün seçilmiş ──
     Aynı kart o günü gösterir; başla düğmesi yok, çünkü sayaç yalnız
     bugünün işine basılır. Başlık güne göre değişir ki öğrenci hangi
     güne baktığını kaybetmesin. */
  /* Başka bir gün seçildiyse ve o günün bekleyen işi varsa aynı büyük kart
     açılır (19 Eylül 2026): öğrenci geçmişte kalan işi de, ilerideki işi de
     buradan başlatıp bitirebilir. Boş ya da tamamen bitmiş gün sade kalır. */
  if (!bugunMu && !sira) {
    return (
      <Kart
        sinif="siradaki"
        baslik={gunAdi}
        altBaslik={liste.length === 0 ? 'Bu gün için plan yok' : 'Bu günün hepsi bitti'}
      >
        {serit}
        <Uyari>{hata}</Uyari>
        {liste.length === 0 ? (
          <p className="kart-alt">Koçun bu güne bir şey koymamış.</p>
        ) : (
          <Sira haric={null} />
        )}
      </Kart>
    )
  }

  /* ── Serbest: görev yok ya da hepsi bitti ── */
  if (!sira) {
    const hepsiBitti = liste.length > 0
    if (hepsiBitti) {
      return (
        <section className="siradaki-bolum" aria-label="Bugünün hedefi">
          {serit}
          <Uyari>{hata}</Uyari>
          <div className="siradaki-odak siradaki-odak--b siradaki-odak--bitti siradaki-odak--gir">
            <div className="sb-ust"><span className="sb-simdi">Bugün</span></div>
            <h2 className="siradaki-baslik">Bugünün hepsi bitti.</h2>
            <p className="siradaki-alt">İstersen serbest çalış, sayaç sayar. Sonra günü tamamla.</p>
            <div className="sb-secenek">
              {SAYAC_SURELERI.map((dk) => (
                <button key={dk} className="sb-cip" onClick={() => sayac?.basla(dk)}>{`${dk} dk`}</button>
              ))}
            </div>
          </div>
          <Uyari tur="bilgi">{sayac?.uyari}</Uyari>
          <Sira haric={null} />
        </section>
      )
    }
    return (
      <Kart sinif="siradaki" baslik="Bugün için plan yok" altBaslik="Sayaçla serbest çalışabilirsin.">
        {serit}
        {/* Sayaç seçenekleri başlığın yanında sıkışmıyor; açıklamanın altında
            saat ikonlu ikincil düğmeler (TASARIM-KURALLARI 6). */}
        <div className="sayac-secim">
          {SAYAC_SURELERI.map((dk) => (
            <EylemDugmesi key={dk} ikon="saat" onClick={() => sayac?.basla(dk)}>{`${dk} dk`}</EylemDugmesi>
          ))}
        </div>
        <Uyari tur="bilgi">{sayac?.uyari}</Uyari>
      </Kart>
    )
  }

  /* ── Sıradaki iş ── */
  /* Blok başlangıcından 15 dakika geçtiyse gecikmiş sayılır; sunucudaki
     kontrol de aynı payı kullanıyor, iki taraf aynı anda konuşsun. */
  const dakika = (t) => {
    if (!t) return null
    const [sa, dk] = String(t).split(':').map(Number)
    return sa * 60 + dk
  }
  const simdiDk = (() => { const n = new Date(); return n.getHours() * 60 + n.getMinutes() })()
  const basDk = dakika(sira.baslangic_saat)
  const bitDk = dakika(sira.bitis_saat)
  /* İki ayrı durum: saat hâlâ sürüyor ama başlanmadı, ya da saat
     tamamen geçti. Eskiden ikisine de "saati geçti" deniyordu; oysa
     20:26'da 21:10'a kadar süren bir çalışmada geçen bir şey yok. */
  /* Panel saatinde açılmıyor: çalışmanın başlamasından 15 dakika sonra
     geliyor. Sunucudaki kontrol de aynı payı kullanıyor; ekran ile
     bildirim aynı anda konuşsun. Saatinde gelen bir uyarı, öğrenci
     kitabını açarken sitem etmiş olurdu. */
  const GECIKME_PAYI_DK = 15
  const basSaatiGecti = basDk !== null && simdiDk >= basDk + GECIKME_PAYI_DK
  const suresiDoldu = bitDk !== null && simdiDk > bitDk
  const gecikti = basSaatiGecti
  const varsayilan = varsayilanDk(sira.tur)
  const seciliDk = sure?.id === sira.id ? sure.dk : varsayilan
  const etiket = [sira.ders, sira.konu].filter(Boolean).join(' · ')
  const tur = GOREV_TUR_OGRENCI[sira.tur]
  const kalanSoru =
    sira.hedef_adet && sira.hedef_adet > 0
      ? Math.max(0, sira.hedef_adet - (sira.yapilan_adet ?? 0))
      : null
  const tamBaslik =
    sira.baslik + (kalanSoru !== null && !/\d/.test(sira.baslik) ? ` — ${kalanSoru} soru` : '')
  /* Başlık "Tür — Konu" kalıbındaysa kartta büyük yazı konu olur, tür
     sağ üstte zaten yazıyor. Koçun kendi yazdığı başlık olduğu gibi kalır. */
  const kalipMi = sira.konu && sira.baslik && sira.baslik.trim().endsWith(`— ${sira.konu}`) &&
    kalanSoru === null
  const baslik = kalipMi ? sira.konu : tamBaslik || etiket || tur || 'Çalışma'
  const ustEtiket = !bugunMu ? gunAdi : sira.baslangic_saat
    ? `${saatKisa(sira.baslangic_saat)}${sira.bitis_saat ? `–${saatKisa(sira.bitis_saat)}` : ''}`
    : secilen ? 'Seçtiğin iş' : 'Şimdi'

  /* Teklif akşam saatinde, o gün hiçbir işaret yokken ve yapılacak iş
     dururken çıkar. Sayaç çalışıyorsa zaten çalışılıyor demektir. */
  const mikroTeklif =
    bugunMu && !saltOkunur && !durum && !mikroKapali &&
    bugunDakika === 0 &&
    new Date().getHours() >= 19 &&
    bekleyen.length > 0 &&
    !liste.some((g) => g.durum === 'tamamlandi')

  return (
    <section className="siradaki-bolum" aria-label="Bugünün hedefi">
      {serit}
      <Uyari>{hata}</Uyari>
      <Uyari tur="bilgi">{sayac?.uyari}</Uyari>
      {/* B tasarımı (19 Eylül 2026): kartın tamamı dersin koyu renginde,
          öğrenci okumadan "şimdi Felsefe" der. Büyük yuvarlak düğme seçili
          süreyle başlatır; süre yanında küçük seçenek. */}
      <div
        key={sira.id}
        className={`siradaki-odak siradaki-odak--b${ucan === sira.id ? ' siradaki-odak--ucus' : ' siradaki-odak--gir'}`}
        style={{ '--ders-renk': dersGorunumu(sira.ders).renk }}
      >
      {tik > 0 && (
        <span key={tik} className="bitti-tik" aria-hidden="true">
          ✓
          {Array.from({ length: 12 }, (_, i) => (
            <i key={i} style={{ '--a': `${i * 30}deg`, '--r': `${56 + (i % 3) * 22}px` }} />
          ))}
        </span>
      )}
      <div className="sb-ust">
        <span className="sb-simdi">{[ustEtiket, sira.ders].filter(Boolean).join(' · ')}</span>
        {tur && <span className="sb-tur">{tur}</span>}
      </div>
      <h2 className="siradaki-baslik">{baslik}</h2>
      {!sira.ders && etiket && <p className="siradaki-alt">{etiket}</p>}
      <GorevKaynagi gorev={sira} />
      {sira.aciklama && <p className="siradaki-not">{sira.aciklama}</p>}

      {mikroTeklif ? (
        <div className="mikro">
          <p className="mikro-soru">Bugün hiç işaret yok. Beş dakikan var mı?</p>
          <button className="dugme dugme--birincil mikro-basla" onClick={() => sayac?.basla(5, sira.id)}>
            Beş dakika başla
          </button>
          <p className="mikro-not">
            Beş dakika sonunda durabilirsin, beş soru bile yeter. Gün sıfır kapanmasın.
          </p>
          <div className="mikro-alt">
            <button className="dugme dugme--ikincil" onClick={() => setMikroKapali(true)}>
              Tamamını yapacağım
            </button>
            <button className="metin-dugme" onClick={() => setMikroKapali(true)}>
              Bugünlük bitti
            </button>
          </div>
        </div>
      ) : (
      <div className="sb-baslat">
        <button
          className="sb-oynat"
          disabled={saltOkunur}
          onClick={() => sayac?.basla(seciliDk, sira.id)}
          aria-label={`Çalışmaya başla, ${seciliDk} dakika`}
        >
          <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true"><path d="M8 4.5v15l12-7.5z" /></svg>
        </button>
        <div className="sb-sure">
          <p className="sb-sure-metin">{seciliDk} dakika</p>
          <div className="sb-secenek" role="group" aria-label="Süre">
            {SAYAC_SURELERI.map((dk) => (
              <button
                key={dk}
                className={dk === seciliDk ? 'sb-cip sb-cip--secili' : 'sb-cip'}
                aria-pressed={dk === seciliDk}
                disabled={saltOkunur}
                onClick={() => setSure({ id: sira.id, dk })}
              >
                {dk}
              </button>
            ))}
          </div>
        </div>
      </div>
      )}
      {/* Blok saati geçtiyse öğrencinin iki çıkışı var. İkisi de koçun
          önüne düşer; öğrenci kendi başına bloğu değiştiremez ama
          sessiz de kalmak zorunda değil. */}
      {bugunMu && saatli && gecikti && !talepGitti && (
        <div className="blok-talep">
          {talep === null ? (
            <>
              <p className="blok-talep-soru">
                {suresiDoldu
                  ? 'Bu çalışmanın saati geçti. Bir şey mi oldu?'
                  : 'Henüz başlamadın. Bir şey mi oldu?'}
              </p>
              <div className="blok-talep-dugmeler">
                <button className="dugme dugme--ikincil dugme--ufak" onClick={() => setTalep('ek_sure')}>
                  Ek süre iste
                </button>
                <button className="dugme dugme--ikincil dugme--ufak" onClick={() => setTalep('mazeret')}>
                  Mazeret bildir
                </button>
              </div>
            </>
          ) : (
            <>
              {talep === 'ek_sure' && (
                <div className="blok-talep-sure">
                  {[15, 30, 60].map((dk) => (
                    <button
                      key={dk}
                      className={`dugme dugme--ufak ${ekDk === dk ? 'dugme--birincil' : 'dugme--ikincil'}`}
                      onClick={() => setEkDk(dk)}
                    >
                      {dk} dk
                    </button>
                  ))}
                </div>
              )}
              <input
                className="blok-talep-metin"
                value={talepMetni}
                onChange={(e) => setTalepMetni(e.target.value)}
                placeholder={talep === 'ek_sure' ? 'Kısa bir not (isteğe bağlı)' : 'Ne oldu? Tek cümle yeter.'}
              />
              <div className="blok-talep-dugmeler">
                <button className="metin-dugme" onClick={() => { setTalep(null); setTalepMetni('') }}>
                  Vazgeç
                </button>
                <button
                  className="dugme dugme--birincil dugme--ufak"
                  disabled={talep === 'mazeret' && !talepMetni.trim()}
                  onClick={() => talepGonder(sira.id, talep)}
                >
                  Koçuna gönder
                </button>
              </div>
            </>
          )}
        </div>
      )}
      {talepGitti && <p className="blok-talep-bilgi">Koçuna iletildi.</p>}

      <div className="sb-alt-eylem">
        <button className="sb-hafif" disabled={saltOkunur} onClick={() => tamamlaKutla(sira)}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
          Bitirdim
        </button>
        {/* Sonraya bırakmak saatli günde de açık: sıra kilitli değil. */}
        {bekleyen.length > 1 && (
          <button className="sb-hafif" onClick={() => { setSecim(null); setSure(null); setAtlanan((a) => [...a, sira.id]) }}>
            Sonra yaparım
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
          </button>
        )}
      </div>
      </div>

      <Sira haric={sira.id} />
    </section>
  )
}
