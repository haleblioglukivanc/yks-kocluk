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
  const acilirRef = useRef(null)

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
        <button className="metin-dugme" onClick={() => setBas(haftaBasi(new Date()))}>Bu hafta</button>
      </div>

      <Uyari>{hata}</Uyari>

      {gorevler === null ? (
        <Yukleniyor />
      ) : (
        <>
          <div className="prg-ozet">
            <span className="prg-ozet-etiket">Tamamlanan iş</span>
            <span className="prg-ozet-sayi">{biten}/{toplam}</span>
            <div className="prg-cubuk"><div style={{ width: `${oran}%` }} /></div>
          </div>

          {/* Gün şeridi: öğrenci panelindeki şeritle aynı sınıflar */}
          <div className="hafta-serit" role="tablist" aria-label="Haftanın günleri">
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

          {/* Seçili günün planı. Bugünse başlık bandı amber tona geçer:
              hangi günde olduğu ilk bakışta okunsun. */}
          <section className={`prg-gun${seciliGun === bugun ? ' prg-gun--bugun' : ''}`}>
            <header className="prg-gun-basi">
              <div>
                <h4 className="prg-gun-ad">{gunAdi(seciliGun, { weekday: 'long' })}</h4>
                <span className="prg-gun-tarih">
                  {gunAdi(seciliGun, { day: 'numeric', month: 'long' })}
                </span>
              </div>
              <div className="prg-gun-sag">
                {seciliGun === bugun && <span className="prg-gun-bugun">bugün</span>}
                {gunSayimi.toplam > 0 && (
                  <span className="sayi prg-gun-sayac">{gunSayimi.biten}/{gunSayimi.toplam}</span>
                )}
              </div>
            </header>

            <div className="prg-gun-govde">
            {gunSayimi.toplam > 0 && (
              <div className="prg-gun-cubuk">
                <i style={{ width: `${Math.round((gunSayimi.biten / gunSayimi.toplam) * 100)}%` }} />
              </div>
            )}
            {gunListesi.length === 0 ? (
              <p className="prg-gun-bos">
                {duzenlenebilir
                  ? 'Bu güne henüz iş yazılmadı.'
                  : 'Bu gün boş — serbest çalışabilirsin.'}
              </p>
            ) : (
              <ul className="liste gorev-liste">
                {gunListesi.map((g) => {
                  const bitti = g.durum === 'tamamlandi'
                  const etiket = [g.dersler?.ad, g.konular?.ad, GOREV_TUR_KISA[g.tur]]
                    .filter(Boolean)
                    .join(' · ')
                  return (
                    <li key={g.id}>
                      <button
                        className={`gorev-satir prg-gorev${bitti ? ' gorev-satir--bitti' : ''}${
                          acikGorevId === g.id ? ' prg-gorev--acik' : ''
                        }`}
                        data-durum={GOREV_DURUM_ANLAMI[g.durum] ?? 'notr'}
                        onClick={() => gorevSec(g)}
                      >
                        <span className="nokta" aria-hidden="true" />
                        <span className="gorev-govde">
                          <span className="gorev-baslik">{g.baslik}</span>
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

          <p className="prg-ipucu">
            {saltOkunur
              ? 'Önizleme: işe dokunup ayrıntıyı görebilirsin, değişiklik yapılamaz.'
              : duzenlenebilir
                ? 'Bir güne dokun, o günün planı altta açılır. Yeşil işaretliler öğrencinin tamamladıklarıdır.'
                : 'İşe dokun: ne çözeceğini ve koçunun notunu gösterir.'}
          </p>

          {(rutinler.length > 0 || duzenlenebilir) && (
            <div className="prg-serbest">
              <div className="rutin-baslik">
                <h4>Hafta boyu tekrarlar</h4>
                {duzenlenebilir && (
                  <button
                    className="rutin-ekle"
                    onClick={() => onRutinEkle?.(anahtarlar)}
                    aria-label="Tekrar eden iş ekle"
                    title="Tekrar eden iş ekle"
                  >
                    +
                  </button>
                )}
              </div>
              <ul>
                {rutinler.length === 0 && duzenlenebilir && (
                  <li className="rutin-bos">
                    Haftanın çoğu gününe yazılan işler burada tek satırda toplanır.
                    Artıya dokunup ekleyin.
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
