import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Uyari, Yukleniyor } from './Ortak.jsx'
import GorevKaynagi from './GorevKaynagi.jsx'
import {
  GOREV_TUR_ADI,
  GOREV_TUR_KISA,
  GOREV_DURUM_ANLAMI,
  GOREV_DURUM_ROZETI,
} from '../lib/gorevTuru.js'
import { yerelGun, haftaBasi as haftaBasiHesapla } from '../lib/tarih.js'
import { dersGorunumu } from '../lib/dersGorunum.js'

export const KISA_GUN = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

/* Gün metni ve hafta başı tek yerde: lib/tarih.js. Buradaki adlar
   DenemeFormu ve OgrenciDetay'da kullanıldığı için korunuyor. */
export const gunAnahtari = yerelGun
export const haftaBasi = haftaBasiHesapla

/** Açık panelin kimliği. Değişince panel görünür alana kaydırılır. */
const acikTarihAnahtari = (acikSecim, secilen) => {
  const s = acikSecim ?? secilen
  if (!s) return null
  if (s.rutinGunler) return 'rutin'
  return `${s.tarih ?? ''}-${s.blok?.id ?? s.id ?? 'yeni'}`
}

const gunAdi = (anahtar, bicim) =>
  new Date(`${anahtar}T00:00:00`).toLocaleDateString('tr-TR', bicim)

export function haftaGunleri(bas) {
  return Array.from({ length: 7 }, (_, i) => {
    const t = new Date(bas)
    t.setDate(bas.getDate() + i)
    return t
  })
}

/**
 * Haftalık program — gün bazlı.
 *
 * Eskiden satırlar zaman dilimi, sütunlar gündü. Koçluk saat bazlı
 * yürümüyor: "salı 14—16 arası" diye bir plan yok, "salı şu üç iş" var.
 * O yüzden saat kolonu kalktı; üstte yedi günlük şerit, altında seçili
 * günün listesi. Şerit öğrenci panelindeki HaftaSeridi ile aynı sınıfları
 * kullanır, iki taraf aynı görünsün diye.
 */
export default function ProgramIzgarasi({
  ogrenci,
  duzenlenebilir,
  onHucreSec,
  onRutinEkle,
  saltOkunur,
  acikSecim,
  panel,
}) {
  const [bas, setBas] = useState(() => haftaBasi(new Date()))
  const [gorevler, setGorevler] = useState(null)
  const [hata, setHata] = useState('')
  // Öğrenci işe dokununca önce ayrıntı açılır; "bitti" oradan işaretlenir.
  // Doğrudan işaretlemek, koçun yazdığı notu ve hedefi görünmez kılıyordu.
  const [secilen, setSecilen] = useState(null)
  const [gunSecimi, setGunSecimi] = useState(null)
  /* Tekrarlar kapalı başlıyor: haftada bir kurulan bir şey, her gün
     bakılan bir şeyin önünde yer kaplamasın. */
  const [tekrarAcik, setTekrarAcik] = useState(false)
  /* Şeridin yapışacağı nokta üst şeridin altı; yüksekliği cihaza ve
     güvenli alana göre değiştiği için ölçülüyor. */
  const [tepe, setTepe] = useState(0)
  const acilirRef = useRef(null)

  useEffect(() => {
    const olc = () => setTepe(document.querySelector('.ust-serit')?.offsetHeight ?? 0)
    olc()
    window.addEventListener('resize', olc)
    return () => window.removeEventListener('resize', olc)
  }, [])

  const gunler = haftaGunleri(bas)
  const anahtarlar = gunler.map(gunAnahtari)
  const ilk = anahtarlar[0]
  const son = anahtarlar[6]
  const bugun = gunAnahtari(new Date())

  /* Hafta değişince seçim o haftaya taşınır: bugün o haftadaysa bugün,
     değilse pazartesi. Ayrı bir effect'e gerek yok. */
  const seciliGun = anahtarlar.includes(gunSecimi)
    ? gunSecimi
    : anahtarlar.includes(bugun)
      ? bugun
      : ilk

  const yukle = useCallback(async () => {
    const { data, error } = await supabase
      .from('gorevler')
      .select(
        'id, tarih, periyot, tur, baslik, aciklama, hedef_adet, yapilan_adet, durum, kaynak_aralik, dersler(ad), konular(ad), kaynaklar(ad, bicim, url, dosya_yolu)',
      )
      .eq('ogrenci_id', ogrenci.id)
      .gte('tarih', ilk)
      .lte('tarih', son)
      .order('durum')
      .order('periyot', { nullsFirst: false })
      .order('id')
    if (error) setHata(hataMetni(error))
    setGorevler(data ?? [])
  }, [ogrenci.id, ilk, son])

  useEffect(() => { yukle() }, [yukle])

  // Panel açılınca ekranda görünür olsun; klavye açılan telefonlarda şart.
  const acilirAnahtar = acikTarihAnahtari(acikSecim, secilen)
  useEffect(() => {
    if (!acilirAnahtar) return
    acilirRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [acilirAnahtar])

  async function bittiIsaretle(g, yapilan) {
    const yeni = g.durum === 'tamamlandi' ? 'bekliyor' : 'tamamlandi'
    const guncelleme = { durum: yeni }
    if (yapilan != null) guncelleme.yapilan_adet = yapilan
    const { error } = await supabase.from('gorevler').update(guncelleme).eq('id', g.id)
    if (error) {
      setHata(hataMetni(error))
      return
    }
    setSecilen(null)
    yukle()
  }

  const hafta = gorevler ?? []
  const sayim = Object.fromEntries(
    anahtarlar.map((t) => {
      const l = hafta.filter((g) => g.tarih === t)
      return [t, { toplam: l.length, biten: l.filter((g) => g.durum === 'tamamlandi').length }]
    }),
  )
  const toplam = hafta.length
  const biten = hafta.filter((g) => g.durum === 'tamamlandi').length
  const oran = toplam ? Math.round((biten / toplam) * 100) : 0
  const gunListesi = hafta.filter((g) => g.tarih === seciliGun)
  const gunSayimi = sayim[seciliGun] ?? { toplam: 0, biten: 0 }

  /* Tekrarlar: aynı ad haftada üç ve daha fazla güne yazılmışsa bu bir
     rutindir; gün listesinde yine görünür ama burada haftaya yayılmış
     hâliyle tek satırda okunur. */
  const adHarita = new Map()
  for (const g of hafta) {
    const ad = g.dersler?.ad ?? g.baslik
    if (!adHarita.has(ad)) adHarita.set(ad, [])
    adHarita.get(ad).push(g)
  }
  const rutinler = [...adHarita.entries()]
    .filter(([, liste]) => new Set(liste.map((g) => g.tarih)).size >= 3)
    .map(([ad, liste]) => ({
      ad,
      gorevler: liste.slice().sort((a, b) => a.tarih.localeCompare(b.tarih)),
      biten: liste.filter((g) => g.durum === 'tamamlandi').length,
    }))

  const panelIcerik = secilen ? (
    <BlokAyrinti
      blok={secilen}
      saltOkunur={saltOkunur}
      onKapat={() => setSecilen(null)}
      onBitir={(yapilan) => bittiIsaretle(secilen, yapilan)}
    />
  ) : (acikSecim ? panel : null)

  // Rutin ekleme paneli listenin değil, tekrarlar bölümünün altında açılır.
  const rutinPaneli = Boolean(acikSecim?.rutinGunler)
  const acikGorevId = acikSecim?.blok?.id ?? secilen?.id ?? null

  function gorevSec(g) {
    if (duzenlenebilir) onHucreSec?.(g, g.tarih, null)
    else setSecilen(g)
  }

  return (
    <div className="prg">
      <div className="prg-basi">
        <div className="prg-hafta">
          <button
            className="ok-dugme"
            onClick={() => setBas(new Date(bas.getFullYear(), bas.getMonth(), bas.getDate() - 7))}
            aria-label="Önceki hafta"
          >←</button>
          <div className="prg-hafta-orta">
            <span className="prg-hafta-etiket">Hafta</span>
            <span className="prg-hafta-tarih">
              {gunler[0].toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} –{' '}
              {gunler[6].toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
            </span>
          </div>
          <button
            className="ok-dugme"
            onClick={() => setBas(new Date(bas.getFullYear(), bas.getMonth(), bas.getDate() + 7))}
            aria-label="Sonraki hafta"
          >→</button>
        </div>
        <div className="prg-basi-sag">
          <span className="prg-ozet-sayi" title="Bu hafta tamamlanan iş">{biten}/{toplam}</span>
          <button className="metin-dugme" onClick={() => setBas(haftaBasi(new Date()))}>Bu hafta</button>
        </div>
      </div>

      <Uyari>{hata}</Uyari>

      {gorevler === null ? (
        <Yukleniyor />
      ) : (
        <>
          {/* Haftalık ilerleme tek çizgi: "Tamamlanan iş 0/2" satırı
              başlığa taşındı, burada yalnızca çubuk kaldı. */}
          <div className="prg-cubuk"><div style={{ width: `${oran}%` }} /></div>

          {/* Gün şeridi ekranın üstüne yapışıyor: gün başlığı kaldırıldığı
              için hangi gündeyiz bilgisini kaydırırken de şerit taşıyor.
              Yapışma noktası üst şeridin altı, yüksekliği ölçülerek. */}
          <div
            className="hafta-serit hafta-serit--yapisik"
            style={{ '--yapisma': `${tepe}px` }}
            role="tablist"
            aria-label="Haftanın günleri"
          >
            {anahtarlar.map((t, i) => {
              const s = sayim[t] ?? { toplam: 0, biten: 0 }
              const bugunMu = t === bugun
              const gecmis = t < bugun
              return (
                <button
                  key={t}
                  role="tab"
                  aria-selected={t === seciliGun}
                  className={`hafta-gun${t === seciliGun ? ' hafta-gun--secili' : ''}${
                    bugunMu ? ' hafta-gun--bugun' : ''
                  }${gecmis ? ' hafta-gun--gecmis' : ''}`}
                  onClick={() => setGunSecimi(t)}
                >
                  <span className="hafta-gun-ad">{KISA_GUN[i]}</span>
                  <span className="hafta-gun-no">{Number(t.slice(8, 10))}</span>
                  <span className="hafta-gun-sayi" aria-label={`${s.biten}/${s.toplam} iş`}>
                    {s.toplam === 0 ? '—' : `${s.biten}/${s.toplam}`}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Seçili günün planı. Gün başlığı kaldırıldı: şeritteki seçili
              kutu zaten hangi gün olduğunu söylüyordu, altında ikinci kez
              "Pazartesi 14 Eylül 0/2" yazmak aynı bilginin tekrarıydı.
              Bugün olduğu kenar renginden okunuyor. */}
          <section className={`prg-gun${seciliGun === bugun ? ' prg-gun--bugun' : ''}`}>
            <div className="prg-gun-govde">
            {gunSayimi.toplam > 0 && (
              <div className="prg-gun-cubuk">
                <i style={{ width: `${Math.round((gunSayimi.biten / gunSayimi.toplam) * 100)}%` }} />
              </div>
            )}
            {gunListesi.length === 0 ? (
              <p className="prg-gun-bos">
                {saltOkunur
                  ? 'Bu gün boş. Önizlemede değişiklik yapılamaz.'
                  : duzenlenebilir
                    ? 'Bu güne henüz iş yazılmadı. Şeritten başka bir güne dokunabilir ya da aşağıdan iş ekleyebilirsin.'
                    : 'Bu gün boş — serbest çalışabilirsin.'}
              </p>
            ) : (
              <ul className="liste gorev-liste">
                {gunListesi.map((g) => {
                  const bitti = g.durum === 'tamamlandi'
                  /* Başlıkta "Soru çözümü — Cümlede Anlam", altındaki
                     etikette "Türkçe · Cümlede Anlam · Soru" yazıyordu:
                     konu da tür de iki kere. Başlık konunun adı, alt
                     satır dersi ve türü söylüyor. */
                  const ad = g.konular?.ad ?? g.dersler?.ad ?? g.baslik
                  const etiket = [
                    g.konular?.ad ? g.dersler?.ad : null,
                    GOREV_TUR_KISA[g.tur],
                  ]
                    .filter(Boolean)
                    .join(' · ')
                  /* Ders rengi: aynı günde üç ayrı ders varken hangisinin
                     hangisi olduğu adı okumadan görünsün. Renk büyük
                     yüzey olmuyor — solda ince şerit ve etiketin soluk
                     zemini; mavi/kırmızı/yeşilin anlamı bozulmuyor. */
                  const ders = dersGorunumu(g.dersler?.ad)
                  return (
                    <li key={g.id}>
                      <button
                        className={`gorev-satir prg-gorev${bitti ? ' gorev-satir--bitti' : ''}${
                          acikGorevId === g.id ? ' prg-gorev--acik' : ''
                        }`}
                        data-durum={GOREV_DURUM_ANLAMI[g.durum] ?? 'notr'}
                        style={{ '--ders-renk': ders.renk }}
                        onClick={() => gorevSec(g)}
                      >
                        <span className="nokta" aria-hidden="true" />
                        <span className="gorev-govde">
                          <span className="gorev-baslik">{ad}</span>
                          {etiket && <span className="gorev-etiket">{etiket}</span>}
                          {GOREV_DURUM_ROZETI[g.durum] && (
                            <span className="rozet gorev-durum">{GOREV_DURUM_ROZETI[g.durum]}</span>
                          )}
                        </span>
                        {g.hedef_adet != null && (
                          <span className="gorev-adet">{g.hedef_adet} soru</span>
                        )}
                        <span className="prg-gorev-ok" aria-hidden="true">›</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}

            {duzenlenebilir && (
              <button
                className="dugme dugme--ikincil prg-gorev-ekle"
                onClick={() => onHucreSec?.(null, seciliGun, null)}
              >
                Bu güne iş ekle
              </button>
            )}

            {panelIcerik && !rutinPaneli && (
              <div className="prg-alt-panel" ref={acilirRef}>{panelIcerik}</div>
            )}
            </div>
          </section>

          {(rutinler.length > 0 || duzenlenebilir) && (
            <div className="prg-serbest">
              <div className="rutin-baslik">
                <button
                  className="rutin-ac"
                  onClick={() => setTekrarAcik((a) => !a)}
                  aria-expanded={tekrarAcik || rutinPaneli}
                >
                  <span className="rutin-ok" aria-hidden="true">{tekrarAcik || rutinPaneli ? '▾' : '▸'}</span>
                  <h4>Hafta boyu tekrarlar</h4>
                  <span className="rutin-sayi">{rutinler.length || '—'}</span>
                </button>
                {duzenlenebilir && (
                  <button
                    className="rutin-ekle"
                    onClick={() => {
                      setTekrarAcik(true)
                      onRutinEkle?.(anahtarlar)
                    }}
                    aria-label="Tekrar eden iş ekle"
                    title="Tekrar eden iş ekle"
                  >
                    +
                  </button>
                )}
              </div>
              <ul hidden={!tekrarAcik && !rutinPaneli}>
                {rutinler.length === 0 && duzenlenebilir && (
                  <li className="rutin-bos">
                    Haftanın çoğu gününe yazılan işler burada tek satırda toplanır.
                  </li>
                )}
                {rutinler.map((r) => (
                  <li key={r.ad} className="rutin">
                    <div className="rutin-basi">
                      <span className="rutin-ad">{r.ad}</span>
                      <span className="rutin-sayi">{r.biten}/{r.gorevler.length}</span>
                    </div>
                    <div className="rutin-gunler">
                      {r.gorevler.map((g) => (
                        <button
                          key={g.id}
                          className={`rutin-gun${g.durum === 'tamamlandi' ? ' rutin-gun--bitti' : ''}`}
                          title={g.baslik}
                          onClick={() => gorevSec(g)}
                        >
                          {new Date(g.tarih).toLocaleDateString('tr-TR', { weekday: 'short' })}
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
              {panelIcerik && rutinPaneli && (
                <div className="prg-alt-panel" ref={acilirRef}>{panelIcerik}</div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}


/** Öğrencinin bloğa dokununca gördüğü ayrıntı: hangi konu, kaç soru,
 *  koçun notu. Bitirme de buradan yapılır. */
function BlokAyrinti({ blok, saltOkunur, onKapat, onBitir }) {
  const [yapilan, setYapilan] = useState(
    blok.yapilan_adet != null ? String(blok.yapilan_adet) : '',
  )
  const bitti = blok.durum === 'tamamlandi'

  return (
    <div className="blok-ayrinti">
      <header className="hucre-basi">
        <div>
          <span className="hucre-gun">{blok.baslik}</span>
          <span className="hucre-saat">
            {[blok.dersler?.ad, blok.konular?.ad, GOREV_TUR_ADI[blok.tur] ?? blok.tur]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </div>
        <button className="metin-dugme" onClick={onKapat}>Kapat</button>
      </header>

      {blok.hedef_adet != null && (
        <p className="blok-hedef">
          Hedef: <strong>{blok.hedef_adet}</strong> soru
        </p>
      )}

      <GorevKaynagi
        gorev={{
          kaynak_ad: blok.kaynaklar?.ad,
          kaynak_bicim: blok.kaynaklar?.bicim,
          kaynak_url: blok.kaynaklar?.url,
          kaynak_dosya: blok.kaynaklar?.dosya_yolu,
          kaynak_aralik: blok.kaynak_aralik,
        }}
      />
      {blok.aciklama && <p className="gorev-not">{blok.aciklama}</p>}

      {!saltOkunur && (
        <div className="blok-eylem">
          {blok.hedef_adet != null && (
            <label className="alan">
              <span className="alan-etiket">Kaç tane çözdün?</span>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                max="999"
                value={yapilan}
                onChange={(e) => setYapilan(e.target.value)}
                placeholder="0"
              />
            </label>
          )}
          <button
            className="dugme dugme--birincil"
            onClick={() => onBitir(yapilan === '' ? null : Number(yapilan))}
          >
            {bitti ? 'Geri al' : 'Bitirdim'}
          </button>
        </div>
      )}
    </div>
  )
}
