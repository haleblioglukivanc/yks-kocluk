import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Uyari, Yukleniyor } from './Ortak.jsx'
import GunSeridi from '../ortak/GunSeridi.jsx'
import BosDurum from '../ortak/BosDurum.jsx'
import Bolum from '../ortak/Bolum.jsx'
import EylemDugmesi from '../ortak/EylemDugmesi.jsx'
import GorevSatiri from '../ortak/GorevSatiri.jsx'
import GorevKaynagi from './GorevKaynagi.jsx'
import {
  GOREV_TUR_ADI,
  GOREV_TUR_KISA,
} from '../lib/gorevTuru.js'
import { yerelGun, haftaBasi as haftaBasiHesapla } from '../lib/tarih.js'

const KISA_GUN = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

/* Gün metni ve hafta başı tek yerde: lib/tarih.js. Buradaki adlar
   DenemeFormu ve OgrenciDetay'da kullanıldığı için korunuyor. */
export const gunAnahtari = yerelGun
const haftaBasi = haftaBasiHesapla

/** Açık panelin kimliği. Değişince panel görünür alana kaydırılır. */
const acikTarihAnahtari = (acikSecim, secilen) => {
  const s = acikSecim ?? secilen
  if (!s) return null
  if (s.rutinGunler) return 'rutin'
  return `${s.tarih ?? ''}-${s.blok?.id ?? s.id ?? 'yeni'}`
}

const gunAdi = (anahtar, bicim) =>
  new Date(`${anahtar}T00:00:00`).toLocaleDateString('tr-TR', bicim)

/** Şeritteki her bloğun üstündeki küçük etiket: "14 – 20 Eyl". */
/* "Cuma, 18 Eylül" — seçili günün başlığı. */
const gunBasligi = (t) =>
  t
    ? new Date(`${t}T00:00:00`).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })
        .replace(/^(\d+ \S+) (\S+)$/, '$2, $1')
    : ''

const haftaAdi = (blok) => {
  const bicim = { day: 'numeric', month: 'short' }
  const bas = new Date(`${blok[0]}T00:00:00`)
  const son = new Date(`${blok[6]}T00:00:00`)
  const ayAyni = bas.getMonth() === son.getMonth()
  return `${bas.toLocaleDateString('tr-TR', ayAyni ? { day: 'numeric' } : bicim)} – ${son.toLocaleDateString('tr-TR', bicim)}`
}

function haftaGunleri(bas) {
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
  const [gorevler, setGorevler] = useState(null)
  const [hata, setHata] = useState('')
  // Öğrenci işe dokununca önce ayrıntı açılır; "bitti" oradan işaretlenir.
  // Doğrudan işaretlemek, koçun yazdığı notu ve hedefi görünmez kılıyordu.
  const [secilen, setSecilen] = useState(null)
  const [gunSecimi, setGunSecimi] = useState(null)
  /* Tekrarlar kapalı başlıyor: haftada bir kurulan bir şey, her gün
     bakılan bir şeyin önünde yer kaplamasın. */
  /* Şeridin yapışacağı nokta üst şeridin altı; yüksekliği cihaza ve
     güvenli alana göre değiştiği için ölçülüyor. */
  const [tepe, setTepe] = useState(0)
  const acilirRef = useRef(null)
  const kaydirakRef = useRef(null)

  useEffect(() => {
    const olc = () => setTepe(document.querySelector('.ust-serit')?.offsetHeight ?? 0)
    olc()
    window.addEventListener('resize', olc)
    return () => window.removeEventListener('resize', olc)
  }, [])

  /* Hafta gezinmesi ok düğmeleriyle değil, şeridi kaydırarak yapılıyor —
     öğrenci panelindeki HaftaSeridi ile aynı davranış. Üstteki "← Hafta
     14 Eyl – 20 Eyl → / Bu hafta" satırı bu yüzden kalktı.
     Kapsam: iki geçmiş hafta, bu hafta, üç sonraki hafta. */
  const GERI_HAFTA = 2
  const HAFTA_SAYISI = 6
  const seritBasi = useMemo(() => {
    const b = haftaBasi(new Date())
    return new Date(b.getFullYear(), b.getMonth(), b.getDate() - GERI_HAFTA * 7)
  }, [])

  const bloklar = useMemo(
    () =>
      Array.from({ length: HAFTA_SAYISI }, (_, h) =>
        haftaGunleri(
          new Date(seritBasi.getFullYear(), seritBasi.getMonth(), seritBasi.getDate() + h * 7),
        ).map(gunAnahtari),
      ),
    [seritBasi],
  )
  const anahtarlar = bloklar.flat()
  const ilk = anahtarlar[0]
  const son = anahtarlar[anahtarlar.length - 1]
  const bugun = gunAnahtari(new Date())

  const seciliGun = anahtarlar.includes(gunSecimi) ? gunSecimi : bugun

  /* Rutinler ve "rutin ekle" seçili günün haftasına ait: altı haftanın
     tamamına bakmak "haftada üç gün" ölçüsünü anlamsız kılardı. */
  const seciliHafta = bloklar.find((b) => b.includes(seciliGun)) ?? bloklar[GERI_HAFTA]

  /* Açılışta bu hafta görünsün: şerit soldaki geçmiş haftalardan
     başlıyor, o yüzden bir kez kaydırılıyor. */
  useEffect(() => {
    const kap = kaydirakRef.current
    const blok = kap?.children?.[GERI_HAFTA]
    if (kap && blok) kap.scrollLeft = blok.offsetLeft - kap.offsetLeft
  }, [gorevler === null])

  const yukle = useCallback(async () => {
    const { data, error } = await supabase
      .from('gorevler')
      .select(
        'id, tarih, periyot, tur, baslik, aciklama, hedef_adet, yapilan_adet, durum, ders_id, konu_id, kaynak_id, kaynak_aralik, baslangic_saat, bitis_saat, dersler(ad), konular(ad), kaynaklar(ad, bicim, url, dosya_yolu)',
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
  const gunListesi = hafta.filter((g) => g.tarih === seciliGun)

  /* Tekrarlar: aynı ad haftada üç ve daha fazla güne yazılmışsa bu bir
     rutindir; gün listesinde yine görünür ama burada haftaya yayılmış
     hâliyle tek satırda okunur. */
  const adHarita = new Map()
  for (const g of hafta.filter((g) => seciliHafta.includes(g.tarih))) {
    /* Anahtar işin adı (22 Eylül 2026): ders adına göre gruplanınca
       kopyalanan haftanın bütün Matematik işleri "tekrar" sanılıyordu. */
    const ad = (g.baslik ?? '').trim() || g.dersler?.ad || '—'
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
      <Uyari>{hata}</Uyari>

      {gorevler === null ? (
        <Yukleniyor />
      ) : (
        <>
          {/* Gün şeridi: öğrenci panelindeki kaydırılabilir şeritle aynı
              yapı. Haftalar yan yana, parmakla geçiliyor; şerit ekranın
              üstüne yapışıyor ki kaydırırken hangi gün seçili görünsün. */}
          <div
            className="prg-serit-kap"
            style={{ '--yapisma': `${tepe}px` }}
          >
            {/* Şeridin kendisi ortak bileşen: öğrencideki HaftaSeridi de
                bunu çiziyor. Koçta geçmişte kalan işler kırmızı sayılır. */}
            <GunSeridi
              kaydirakRef={kaydirakRef}
              etiket="Günler"
              haftalar={bloklar.map((blok) => ({ anahtar: blok[0], ad: haftaAdi(blok), gunler: blok }))}
              sayim={sayim}
              secili={seciliGun}
              bugun={bugun}
              onSec={setGunSecimi}
              gecikmeVurgusu
            />
          </div>

          {/* Seçili günün planı. Gün başlığı kaldırıldı: şeritteki seçili
              kutu zaten hangi gün olduğunu söylüyordu, altında ikinci kez
              "Pazartesi 14 Eylül 0/2" yazmak aynı bilginin tekrarıydı.
              Bugün olduğu kenar renginden okunuyor. */}
          {/* Gün artık kart değil (kural 1, 5): başlık, liste ya da tek
              cümlelik boş durum, tek eylem. */}
          <section className="prg-gun">
            <div className="prg-gun-basi">
              <h3 className="prg-gun-ad-baslik">{gunBasligi(seciliGun)}</h3>
              {duzenlenebilir && gunListesi.length > 0 && (
                <EylemDugmesi onClick={() => onHucreSec?.(null, seciliGun, null)}>+ İş ekle</EylemDugmesi>
              )}
            </div>
            {gunListesi.length === 0 ? (
              <BosDurum
                metin={
                  saltOkunur
                    ? 'Bu gün boş. Önizlemede değişiklik yapılamaz.'
                    : duzenlenebilir
                      ? 'Bu güne henüz iş yazılmadı.'
                      : 'Bu gün boş — serbest çalışabilirsin.'
                }
                eylem={duzenlenebilir ? '+ Bu güne iş ekle' : null}
                onEylem={duzenlenebilir ? () => onHucreSec?.(null, seciliGun, null) : null}
              />
            ) : (
              <ul className="liste gorev-liste">
                {gunListesi.map((g) => {
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
                  return (
                    <li key={g.id}>
                      <GorevSatiri
                        ad={ad}
                        etiket={etiket}
                        ders={g.dersler?.ad}
                        durum={g.durum}
                        sag={[g.hedef_adet != null && `${g.hedef_adet} soru`]}
                        acik={acikGorevId === g.id}
                        onClick={() => gorevSec(g)}
                      />
                    </li>
                  )
                })}
              </ul>
            )}

            {panelIcerik && !rutinPaneli && (
              <div className="prg-alt-panel" ref={acilirRef}>{panelIcerik}</div>
            )}
          </section>

          {(rutinler.length > 0 || duzenlenebilir) && (
            <Bolum
              cizgili
              baslik="Hafta boyu tekrarlar"
              sayi={rutinler.length || null}
              aciklama={
                rutinler.length === 0
                  ? 'Haftanın çoğu gününe yazılan işler burada tek satırda toplanır. Şu an yok.'
                  : null
              }
              eylem={duzenlenebilir ? '+ Ekle' : null}
              onEylem={() => onRutinEkle?.(seciliHafta)}
            >
              {rutinler.length > 0 && (
                <ul className="rutin-liste">
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
              )}
              {panelIcerik && rutinPaneli && (
                <div className="prg-alt-panel" ref={acilirRef}>{panelIcerik}</div>
              )}
            </Bolum>
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
