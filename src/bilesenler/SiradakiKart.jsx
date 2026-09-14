import { useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { dersGorunumu } from '../lib/dersGorunum.js'
import { Kart, Uyari } from './Ortak.jsx'
import GorevKaynagi from './GorevKaynagi.jsx'
import { SAYAC_SURELERI, bicimle, kalanMs, useSayac, useSayacTiki, varsayilanDk } from '../lib/sayac.jsx'
import { GOREV_TUR_OGRENCI } from '../lib/gorevTuru.js'

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
        <circle cx="60" cy="60" r="52" fill="none" stroke="var(--marka-amber)" strokeWidth="8"
                strokeLinecap="round" strokeDasharray={C}
                strokeDashoffset={C * (1 - oran)} transform="rotate(-90 60 60)" />
        <text x="60" y="67" textAnchor="middle" fontSize="23" fill="currentColor">
          {bicimle(kalan)}
        </text>
      </svg>
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
      <Kart baslik={baslik} altBaslik={`${durum.hedefDk} dk`}>
        {serit}
        <Halka durum={durum} />
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
  if (!bugunMu) {
    return (
      <Kart
        baslik={gunAdi}
        altBaslik={
          liste.length === 0
            ? 'Bu gün için plan yok'
            : `${liste.length - bekleyen.length}/${liste.length} iş`
        }
      >
        {serit}
        <Uyari>{hata}</Uyari>
        {liste.length === 0 ? (
          <p className="kart-alt">Koçun bu güne bir şey koymamış.</p>
        ) : (
          <Kalanlar haric={null} />
        )}
      </Kart>
    )
  }

  /* ── Serbest: görev yok ya da hepsi bitti ── */
  if (!sira) {
    const hepsiBitti = liste.length > 0
    return (
      <Kart
        baslik={hepsiBitti ? 'Bugünün hepsi bitti' : 'Bugün için plan yok'}
        altBaslik={hepsiBitti ? 'İstersen serbest çalış, sayaç sayar.' : 'Sayaçla serbest çalışabilirsin.'}
        eylem={
          <div className="sayac-secim">
            {SAYAC_SURELERI.map((dk) => (
              <button key={dk} className="dugme dugme--ikincil dugme--ufak" onClick={() => sayac?.basla(dk)}>
                {dk} dk
              </button>
            ))}
          </div>
        }
      >
        {serit}
        <Uyari tur="bilgi">{sayac?.uyari}</Uyari>
        {/* Gün bitince de liste duruyor: bitirilen işler ekrandan
            kaybolmuyor, tikine tekrar dokunup geri alınabiliyor. */}
        <Kalanlar haric={null} />
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
  const digerler = SAYAC_SURELERI.filter((dk) => dk !== varsayilan)
  const etiket = [sira.ders, sira.konu].filter(Boolean).join(' · ')
  const tur = GOREV_TUR_OGRENCI[sira.tur]
  const kalanSoru =
    sira.hedef_adet && sira.hedef_adet > 0
      ? Math.max(0, sira.hedef_adet - (sira.yapilan_adet ?? 0))
      : null
  const baslik =
    sira.baslik + (kalanSoru !== null && !/\d/.test(sira.baslik) ? ` — ${kalanSoru} soru` : '')

  return (
    <section className="kart siradaki" aria-label="Bugünün hedefi">
      {serit}
      <Uyari>{hata}</Uyari>
      <Uyari tur="bilgi">{sayac?.uyari}</Uyari>
      <div className="siradaki-odak">
      <p className="siradaki-sira">
        {sira.baslangic_saat
          ? `${saatKisa(sira.baslangic_saat)}${sira.bitis_saat ? ` – ${saatKisa(sira.bitis_saat)}` : ''}`
          : secilen ? 'Seçtiğin iş' : 'Sırada'}
      </p>
      <h2 className="siradaki-baslik">{baslik}</h2>
      {(etiket || tur) && (
        <p className="siradaki-alt">{[etiket, tur].filter(Boolean).join(' · ')}</p>
      )}
      <GorevKaynagi gorev={sira} />
      {sira.aciklama && <p className="siradaki-not">{sira.aciklama}</p>}

      <div className="siradaki-eylem">
        <button
          className="dugme dugme--birincil siradaki-basla"
          disabled={saltOkunur}
          onClick={() => sayac?.basla(varsayilan, sira.id)}
        >
          ▶ Çalışmaya başla · {varsayilan} dk
        </button>
        {digerler.map((dk) => (
          <button
            key={dk}
            className="dugme dugme--ikincil dugme--ufak"
            disabled={saltOkunur}
            onClick={() => sayac?.basla(dk, sira.id)}
            aria-label={`${dk} dakika başla`}
          >
            {dk}
          </button>
        ))}
      </div>
      {/* Blok saati geçtiyse öğrencinin iki çıkışı var. İkisi de koçun
          önüne düşer; öğrenci kendi başına bloğu değiştiremez ama
          sessiz de kalmak zorunda değil. */}
      {saatli && gecikti && !talepGitti && (
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

      <div className="siradaki-ikincil">
        <button className="metin-dugme" disabled={saltOkunur} onClick={() => tamamla(sira)}>
          ✓ Tamamla
        </button>
        {/* Atla saatli günde de açık: sıra artık kilitli değil. */}
        {bekleyen.length > 1 && (
          <button className="metin-dugme" onClick={() => { setSecim(null); setAtlanan((a) => [...a, sira.id]) }}>
            Atla ›
          </button>
        )}
      </div>
      </div>

      <Kalanlar haric={sira.id} />
    </section>
  )
}
