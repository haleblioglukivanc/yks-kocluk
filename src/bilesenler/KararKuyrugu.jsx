import { metindenDers } from '../lib/dersGorunum.js'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import Sekmeler from '../ortak/Sekmeler.jsx'
import Bolum from '../ortak/Bolum.jsx'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Kart, Dugme, Uyari, Yukleniyor } from './Ortak.jsx'
import { Avatar } from './Fotograf.jsx'

/* Koçun günlük karar kuyruğu. Kararlar dört segmente ayrılır: acil, süresi
   dolacak, bugün, bu hafta. Koç tek kart görür ama şeritten istediği segmente
   atlayabilir. Aciliyet koça konan cevap süresinden değil, kartın türünden
   gelir. Kural: öneri hazır gelir, koç onaylar; öğrenciye giden metin karttan
   görünmeden hiçbir şey gönderilmez. */

const SEBEP = { bilgi: 'bilgi eksiği', dikkat: 'dikkat', sure: 'süre' }

const TIP_ETIKET = {
  risk: 'Kaybolan öğrenci',
  hafiflet: 'Hedef ayarı',
  gorusme: 'Acil görüşme',
  blok: 'Blok',
  konu: 'Konu onayı',
  analiz: 'Deneme analizi',
  plan: 'Haftalık plan',
  odeme: 'Ödeme',
  veli_ozet: 'Veli özeti',
  hedef: 'Hedef ayarı',
  tebrik: 'Tebrik',
  ilham: 'Kitap ve söz',
  konu_tekrar: 'Konu tekrarı',
  basvuru: 'Yeni başvuru',
}

const SEGMENT_ETIKET = { acil: 'Acil', pencere: 'Süreli', bugun: 'Bugün', hafta: 'Bu hafta' }
const SEGMENT_SIRA = ['acil', 'pencere', 'bugun', 'hafta']

function anahtar(k) {
  return `${k.tip}-${k.kaynak_id}`
}

export default function KararKuyrugu({ onOgrenciAc, sekmeYuvasi = null, kompakt = false }) {
  const [kartlar, setKartlar] = useState(null)
  const [bitenler, setBitenler] = useState([])
  const [verilen, setVerilen] = useState(0)
  const [segment, setSegment] = useState(null)
  const [odakKey, setOdakKey] = useState(null)
  const [hata, setHata] = useState('')

  /* Blok kartlarının bağlamında ders adı yok ("22:05 bloğu · Soru çözümü —
     Cümlede Anlam"); konu adından dersi buluyoruz. Katalog küçük, bir kez
     çekilir. */
  const [konuDers, setKonuDers] = useState(null)
  useEffect(() => {
    supabase.from('konular').select('ad, dersler(ad)').then(({ data }) => {
      const h = {}
      for (const k of data ?? []) if (k.ad && k.dersler?.ad) h[k.ad.toLocaleLowerCase('tr-TR')] = k.dersler.ad
      setKonuDers(h)
    })
  }, [])
  const dersBul = useCallback((baglam) => {
    const dogrudan = metindenDers(baglam)
    if (dogrudan || !konuDers) return dogrudan
    const k = String(baglam ?? '').toLocaleLowerCase('tr-TR')
    const konu = Object.keys(konuDers).find((ad) => k.includes(ad))
    return konu ? metindenDers(konuDers[konu]) : null
  }, [konuDers])

  const yukle = useCallback(async () => {
    const { data, error } = await supabase.rpc('koc_karar_kuyrugu', { p_limit: 12 })
    if (error) {
      setHata(hataMetni(error))
      setKartlar([])
      return
    }
    setKartlar(data ?? [])
    setBitenler([])
    setSegment(null)
    setOdakKey(null)
  }, [])

  useEffect(() => {
    yukle()
  }, [yukle])

  /* Sıradan bir kalem seçildiğinde kart yukarıda değişiyor ama telefonda
     ekran dışında kaldığı için hiçbir şey olmamış gibi görünüyordu. Açılan
     karta götür. Ekranda tek kaldırılmış kart olur (Ortak.jsx'teki kural),
     o yüzden hedef tekil. */
  useEffect(() => {
    if (!odakKey) return
    document
      .querySelector('.kart--kaldirilmis')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [odakKey])

  const kalanlar = useMemo(
    () => (kartlar ?? []).filter((k) => !bitenler.includes(anahtar(k))),
    [kartlar, bitenler],
  )

  /* Tebrik kuyruğa karışmıyor: iyi haber karar değil, en altta şerit olarak
     duruyor ki bekleyen işin önünü kesmesin. */
  const kutlamalar = useMemo(() => kalanlar.filter((k) => k.tip === 'tebrik'), [kalanlar])
  const isler = useMemo(() => kalanlar.filter((k) => k.tip !== 'tebrik'), [kalanlar])

  const sayilar = useMemo(() => {
    const s = {}
    for (const k of isler) s[k.segment] = (s[k.segment] ?? 0) + 1
    return s
  }, [isler])

  function bittiIsaretle(kart, sayildi) {
    setBitenler((b) => [...b, anahtar(kart)])
    setOdakKey(null)
    if (sayildi) setVerilen((v) => v + 1)
    /* Onaylanan veli özeti aynı sayfadaki "Veliye iletilecek" kutusuna düşer.
       İki bileşen kardeş; ortak durum kurmak yerine tek yönlü haber yeter. */
    if (sayildi && kart?.tip === 'veli_ozet') {
      window.dispatchEvent(new CustomEvent('veli-mesaji-eklendi'))
    }
    /* "Görüştük" denen öğrenci için yerine hedef kartı gelebilir; kuyruğu
       tazele ki koç aynı anda görsün. Kart geçiş animasyonu bitince. */
    if (sayildi && kart?.tip === 'risk') setTimeout(yukle, 450)
  }

  if (kartlar === null) return <Yukleniyor metin="Kararlar geliyor" satir={4} />

  const aktifSegment = segment && sayilar[segment] ? segment : isler[0]?.segment ?? null
  const odak =
    isler.find((k) => anahtar(k) === odakKey) ?? isler.find((k) => k.segment === aktifSegment)
  const sirada = odak ? isler.filter((k) => anahtar(k) !== anahtar(odak)) : []

  if (!odak) {
    return (
      <>
        <GorusmeSeridi />
        <div className="kuyruk-bitis kuyruk-bitis--duz">
          <span className="kuyruk-bitis-tik" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7" /></svg>
          </span>
          <p className="kuyruk-bitis-baslik">Bugünlük bu kadar.</p>
          <p className="kuyruk-bitis-alt">
            {verilen > 0 ? `${verilen} karar verdin.` : 'Bekleyen karar yok.'}
            {' '}Yeni bir şey düşerse burada görünür.
          </p>
        </div>
        <IyiHaber kartlar={kutlamalar} onBitti={bittiIsaretle} onHata={setHata} />
      </>
    )
  }

  return (
    <>
      {hata ? <Uyari>{hata}</Uyari> : null}

      <GorusmeSeridi />

      <SegmentSeridi
        yuva={sekmeYuvasi}
        sayilar={sayilar}
        aktif={odak.segment}
        onSec={(s) => {
          setSegment(s)
          setOdakKey(null)
        }}
      />

      {odak.tip === 'gorusme' ? (
        <GorusmeKarti
          key={anahtar(odak)}
          kart={odak}
          onOgrenciAc={onOgrenciAc}
          onBitti={(sayildi) => bittiIsaretle(odak, sayildi)}
          onHata={setHata}
        />
      ) : odak.tip === 'ilham' ? (
        <IlhamKarti
          key={anahtar(odak)}
          kart={odak}
          onOgrenciAc={onOgrenciAc}
          onBitti={(sayildi) => bittiIsaretle(odak, sayildi)}
          onHata={setHata}
        />
      ) : odak.tip === 'plan' ? (
        <PlanKarti
          key={anahtar(odak)}
          kart={odak}
          onOgrenciAc={onOgrenciAc}
          onBitti={(sayildi) => bittiIsaretle(odak, sayildi)}
          onHata={setHata}
        />
      ) : (
        <KuyrukKarti
          key={anahtar(odak)}
          kart={odak}
          onOgrenciAc={onOgrenciAc}
          onBitti={(sayildi) => bittiIsaretle(odak, sayildi)}
          onHata={setHata}
        />
      )}

      <Sirada kartlar={sirada} onSec={(k) => setOdakKey(anahtar(k))} dersBul={dersBul} kapali={kompakt} />
      <IyiHaber kartlar={kutlamalar} onBitti={bittiIsaretle} onHata={setHata} />
    </>
  )
}

/* Segment şeridi: hangi işin ne kadar beklediği tek bakışta. Acil varsa kuyruk
   kendiliğinden orada açılır; koç isterse başka segmente atlar. */
function SegmentSeridi({ yuva, sayilar, aktif, onSec }) {
  const gorunen = SEGMENT_SIRA.filter((s) => sayilar[s])
  if (gorunen.length < 2) return null
  /* Hap şerit yerine ortak alt çizgili sekmeler. Başlıkta yuva varsa
     koyu bloğun alt kenarına, yoksa zemine çizilir. */
  const sekmeler = (
    <Sekmeler
      varyant={yuva ? 'koyu' : 'acik'}
      etiket="Karar segmentleri"
      deger={aktif}
      onSec={onSec}
      secenekler={gorunen.map((s) => ({
        k: s,
        ad: SEGMENT_ETIKET[s],
        rozet: <span className="alt-sekme-sayi" data-segment={s}>{sayilar[s]}</span>,
      }))}
    />
  )
  return yuva ? createPortal(sekmeler, yuva) : sekmeler
}

/* Bekleyen kararlar tek satır halinde. Önce dört tanesi görünür, gerisi
   istendiğinde açılır; dokununca o karta atlanır. */
const basHarf = (ad) => (ad ?? '').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toLocaleUpperCase('tr-TR')

function Sirada({ kartlar, onSec, dersBul = metindenDers, kapali = false }) {
  const [hepsi, setHepsi] = useState(false)
  /* Ana sayfada sıra kapalı başlar: tek satır, dokununca açılır. Ekran
     aşağı doğru uzamasın (Bekir, 22 Eylül 2026). */
  const [acik, setAcik] = useState(!kapali)
  if (kartlar.length === 0) return null
  if (!acik)
    return (
      <button type="button" className="sirada-kapali" onClick={() => setAcik(true)}>
        <span><b>Sırada {kartlar.length} iş daha</b>{' '}{kartlar.slice(0, 3).map((k) => k.ad.split(' ')[0]).join(', ')}{kartlar.length > 3 ? '…' : ''}</span>
        <span className="sirada-kapali-ok" aria-hidden="true">›</span>
      </button>
    )
  const gosterilen = hepsi ? kartlar : kartlar.slice(0, 4)
  /* Kart değil bölüm (TASARIM-KURALLARI 8): zemine oturan başlık + liste.
     Renkli ders hapı yerine bağlam adın altında düz metin. */
  return (
    <Bolum
      baslik="Sırada"
      sayi={kartlar.length}
      eylem={kartlar.length > 4 ? (hepsi ? 'Kısalt' : 'Hepsi') : null}
      onEylem={() => setHepsi((a) => !a)}
    >
      <ul className="sirada-liste">
        {gosterilen.map((k) => {
          const ders = dersBul(k.baglam)
          const parcalar = String(k.baglam ?? '').split(' · ')
          const zamanMi = (p) => /bloğu|onayı|^\d\d[:.]\d\d/i.test(p)
          const zaman = parcalar.length > 1 ? (parcalar.find(zamanMi) ?? null) : null
          let baglam = parcalar.filter((p) => p !== zaman).join(' · ') || (k.baglam ?? '')
          /* Dersi bulunmuşsa "Ders · Konu"; tür ("Soru çözümü") düşer. */
          if (ders) {
            const konu = baglam.split(' — ').pop().replace(new RegExp(`^${ders.ad}\\s*·\\s*`, 'i'), '')
            baglam = `${ders.ad} · ${konu}`
          }
          const alt = [TIP_ETIKET[k.tip], zaman, baglam].filter(Boolean).join(' · ')
          return (
            <li key={anahtar(k)}>
              <button
                className="sirada-satir sirada-satir--dokun"
                data-segment={k.segment}
                onClick={() => onSec(k)}
              >
                <span className="sirada-av" aria-hidden="true">{basHarf(k.ad)}</span>
                <span className="sirada-kimlik">
                  <span className="sirada-ad">{k.ad}</span>
                  {alt && <small className="sirada-alt">{alt}</small>}
                </span>
                <span className="sirada-ok" aria-hidden="true">›</span>
              </button>
            </li>
          )
        })}
      </ul>
    </Bolum>
  )
}

/* İyi haberler kuyruğun altında ince bir şerit. Kutlama kartı tepede yer
   kaplayınca bekleyen iş aşağı itiliyordu. */
function IyiHaber({ kartlar, onBitti, onHata }) {
  const [bekliyor, setBekliyor] = useState(false)
  if (!kartlar || kartlar.length === 0) return null
  const kart = kartlar[0]

  async function gonder() {
    setBekliyor(true)
    onHata('')
    const { error } = await supabase.rpc('koc_karar_ver', {
      p_tip: kart.tip,
      p_kaynak_id: kart.kaynak_id,
      p_karar: 'onay',
      p_metin: kart.mesaj ?? null,
      p_secili: [],
    })
    setBekliyor(false)
    if (error) {
      onHata(hataMetni(error))
      return
    }
    onBitti(kart, true)
  }

  return (
    <div className="iyi-haber">
      <span className="iyi-haber-ic">
        <strong>{kart.ad}</strong> {kart.baglam}
        {kartlar.length > 1 ? ` · ${kartlar.length - 1} iyi haber daha` : ''}
      </span>
      <button className="metin-dugme" disabled={bekliyor} onClick={gonder}>
        Tebrik et
      </button>
    </div>
  )
}

/* ══ Acil görüşme ══
   Gün, saat ve süre tamamen koçun insiyatifinde; kart randevu kurulunca ya da
   telefonla görüşülüp kapatılınca kuyruktan düşer. Çakışma canlı kontrol
   edilir: koçun kendi saati sertçe kapalı, öğrencinin bloğu yalnızca uyarı. */

const SURELER = [15, 30, 45, 60]

function bugunISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function varsayilanSaat() {
  const d = new Date(Date.now() + 30 * 60 * 1000)
  d.setMinutes(d.getMinutes() <= 30 ? 30 : 60, 0, 0)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function GorusmeKarti({ kart, onOgrenciAc, onBitti, onHata }) {
  const [tarih, setTarih] = useState(bugunISO)
  const [saat, setSaat] = useState(varsayilanSaat)
  const [sure, setSure] = useState(30)
  const [cakisma, setCakisma] = useState(null)
  const [otele, setOtele] = useState(true)
  const [yaziyor, setYaziyor] = useState(false)
  const [metin, setMetin] = useState('')
  const [bekliyor, setBekliyor] = useState(false)
  const a = kart.aksiyonlar ?? {}

  /* Koç saati değiştirdikçe çakışma yeniden sorulur; yazarken her tuşta
     istek gitmesin diye kısa bir bekleme var. */
  useEffect(() => {
    if (!tarih || !saat) return undefined
    let gecerli = true
    const zaman = setTimeout(async () => {
      const { data, error } = await supabase.rpc('koc_gorusme_cakisma', {
        p_ogrenci_id: kart.ogrenci_id,
        p_tarih: tarih,
        p_saat: saat.length === 5 ? `${saat}:00` : saat,
        p_sure_dk: sure,
      })
      if (!gecerli) return
      setCakisma(error ? null : data)
    }, 300)
    return () => {
      gecerli = false
      clearTimeout(zaman)
    }
  }, [kart.ogrenci_id, tarih, saat, sure])

  const kocCak = cakisma?.koc ?? null
  const ogrCak = cakisma?.ogrenci ?? null

  async function kur() {
    setBekliyor(true)
    onHata('')
    const { data, error } = await supabase.rpc('koc_gorusme_kur', {
      p_talep_id: Number(kart.kaynak_id),
      p_tarih: tarih,
      p_saat: saat.length === 5 ? `${saat}:00` : saat,
      p_sure_dk: sure,
      p_otele: otele,
    })
    setBekliyor(false)
    if (error) {
      onHata(hataMetni(error))
      return
    }
    if (data?.durum === 'cakisma_koc') {
      setCakisma({ koc: data.cakisma, ogrenci: ogrCak })
      return
    }
    onBitti(true)
  }

  async function kapat(kapanis) {
    setBekliyor(true)
    onHata('')
    const { error } = await supabase.rpc('koc_gorusme_kapat', {
      p_talep_id: Number(kart.kaynak_id),
      p_kapanis: kapanis,
      p_metin: kapanis === 'mesaj' ? metin : null,
    })
    setBekliyor(false)
    if (error) {
      onHata(hataMetni(error))
      return
    }
    onBitti(true)
  }

  return (
    <Kart kaldirilmis>
      <div className="kuyruk-ust">
        <span className="kuyruk-tip" data-tip="gorusme">{TIP_ETIKET.gorusme}</span>
        <span className="kuyruk-sayac">haftalık hakkını kullandı</span>
      </div>

      <button className="kuyruk-kimlik" onClick={() => onOgrenciAc?.(kart.ogrenci_id)} title="Öğrenciyi aç">
        <Avatar yol={kart.fotograf_yolu} ad={kart.ad} boyut="kucuk" />
        <span>
          <span className="liste-ad">{kart.ad}</span>
          <span className="liste-alt">{kart.baglam}</span>
        </span>
      </button>

      {kart.mesaj ? <p className="kuyruk-mesaj">{kart.mesaj}</p> : null}
      <p className="kuyruk-oneri">{kart.oneri}</p>

      {yaziyor ? (
        <textarea
          className="kuyruk-alan"
          value={metin}
          rows={4}
          placeholder="Öğrenciye gidecek mesaj"
          onChange={(e) => setMetin(e.target.value)}
          aria-label="Öğrenciye gidecek mesaj"
        />
      ) : (
        <>
          <div className="randevu">
            <label className="randevu-alan">
              <span>Gün</span>
              <input type="date" value={tarih} min={bugunISO()} onChange={(e) => setTarih(e.target.value)} />
            </label>
            <label className="randevu-alan">
              <span>Saat</span>
              <input type="time" value={saat} step={300} onChange={(e) => setSaat(e.target.value)} />
            </label>
          </div>

          <div className="sure-secim" role="group" aria-label="Görüşme süresi">
            {SURELER.map((d) => (
              <button
                key={d}
                className="sure-dugme"
                aria-pressed={d === sure}
                onClick={() => setSure(d)}
              >
                {d} dk
              </button>
            ))}
          </div>

          {kocCak ? (
            <p className="cakisma cakisma--sert">
              <strong>Bu saat sende dolu.</strong> {kocCak.baslangic}–{kocCak.bitis} arası{' '}
              {kocCak.ad} ile görüşmen var. {kocCak.ilk_bos} sonrası boş.
            </p>
          ) : null}

          {ogrCak ? (
            <div className="cakisma cakisma--yumusak">
              <p>
                <strong>{kart.ad.split(' ')[0]} için çakışma var.</strong> {ogrCak.baslangic}{' '}
                {ogrCak.baslik}
                {ogrCak.sure_dk ? ` · ${ogrCak.sure_dk} dk` : ''}
              </p>
              <label className="oteleme">
                <input type="checkbox" checked={otele} onChange={() => setOtele((o) => !o)} />
                <span>Bloğu görüşme bitince başlat</span>
              </label>
            </div>
          ) : null}
        </>
      )}

      <div className="kuyruk-dugmeler">
        {yaziyor ? (
          <Dugme bekliyor={bekliyor} onClick={() => kapat('mesaj')}>Mesajı gönder</Dugme>
        ) : (
          <Dugme bekliyor={bekliyor || Boolean(kocCak)} onClick={kur}>{a.onay ?? 'Görüşmeyi kur'}</Dugme>
        )}
        <div className="kuyruk-alt-dugmeler">
          <button className="dugme dugme--ikincil" disabled={bekliyor} onClick={() => setYaziyor((y) => !y)}>
            {yaziyor ? 'Vazgeç' : (a.orta ?? 'Mesaj yaz')}
          </button>
          {!yaziyor ? (
            <button className="dugme dugme--ikincil" disabled={bekliyor} onClick={() => kapat('telefon')}>
              {a.sil ?? 'Görüştük, kapat'}
            </button>
          ) : null}
        </div>
      </div>
    </Kart>
  )
}

/* Koçun kendi görüşme günü. Görüşmesi olmayan günde hiç çıkmaz. */
function GorusmeSeridi() {
  const [hafta, setHafta] = useState(null)
  const [acik, setAcik] = useState(false)

  useEffect(() => {
    let gecerli = true
    supabase.rpc('koc_gorusme_haftasi', { p_gun: 7 }).then(({ data, error }) => {
      if (gecerli && !error) setHafta(data ?? [])
    })
    return () => {
      gecerli = false
    }
  }, [])

  if (!hafta || hafta.length === 0) return null
  const bugun = hafta[0]
  const ilerisi = hafta.slice(1).filter((g) => g.adet > 0)
  if (bugun.adet === 0 && ilerisi.length === 0) return null

  return (
    <div className="gorusme-serit">
      <div className="gorusme-serit-ic">
        <strong>
          {bugun.adet > 0
            ? `Bugün ${bugun.adet} görüşmen var`
            : `Bugün görüşmen yok · bu hafta ${ilerisi.reduce((t, g) => t + g.adet, 0)} görüşme`}
        </strong>
        <span>{bugun.adet > 0 ? bugun.ozet : ilerisi[0]?.ozet}</span>
      </div>
      {ilerisi.length > 0 ? (
        <button className="metin-dugme" onClick={() => setAcik((v) => !v)} aria-expanded={acik}>
          {acik ? 'Kapat' : 'Hafta'}
        </button>
      ) : null}
      {acik ? (
        <ul className="gorusme-hafta">
          {hafta.slice(1).map((g) => (
            <li key={g.tarih}>
              <span className="gorusme-gun">
                {new Date(`${g.tarih}T00:00:00`).toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric' })}
              </span>
              <span className="gorusme-ozet">{g.adet > 0 ? g.ozet : 'Görüşme yok'}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

/* ══ Haftalık plan taslağı ══
   Cuma akşamından itibaren, gelecek haftası boş olan öğrenci için çıkar.
   Yedi gün birden görünür: koç haftayı bir bütün olarak okur, ders dağılımı
   ancak böyle değerlendirilir. "Düzenle" ayrı bir modül açmaz — planı kurup
   mevcut program ızgarasına götürür, düzenleme orada yapılır. */

const GUN_KISA = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']

function PlanKarti({ kart, onOgrenciAc, onBitti, onHata }) {
  const [bekliyor, setBekliyor] = useState(false)
  const a = kart.aksiyonlar ?? {}
  const taslak = kart.ek ?? {}
  const gunler = taslak.gunler ?? []
  const ozet = taslak.ozet ?? {}

  async function karar(k) {
    setBekliyor(true)
    onHata('')
    const { data, error } = await supabase.rpc('koc_karar_ver', {
      p_tip: kart.tip,
      p_kaynak_id: kart.kaynak_id,
      p_karar: k,
      p_metin: null,
      p_secili: [],
    })
    setBekliyor(false)
    if (error) {
      onHata(hataMetni(error))
      return
    }
    onBitti(k !== 'ertele')
    if (data?.izgara) onOgrenciAc?.(kart.ogrenci_id)
  }

  return (
    <Kart kaldirilmis>
      <div className="kuyruk-ust">
        <span className="kuyruk-tip" data-tip={kart.tip}>{TIP_ETIKET.plan}</span>
      </div>

      <button className="kuyruk-kimlik" onClick={() => onOgrenciAc?.(kart.ogrenci_id)} title="Öğrenciyi aç">
        <Avatar yol={kart.fotograf_yolu} ad={kart.ad} boyut="kucuk" />
        <span>
          <span className="liste-ad">{kart.ad}</span>
          <span className="liste-alt">{kart.baglam}</span>
        </span>
      </button>

      <div className="plan-sayilar">
        <span className="plan-sayi">
          <strong>{ozet.tekrar ?? 0}</strong>tekrar
        </span>
        <span className="plan-sayi">
          <strong>{ozet.yeni ?? 0}</strong>yeni konu
        </span>
      </div>

      <p className="kuyruk-oneri">{kart.oneri}</p>

      <ul className="plan-gunler">
        {gunler.map((g) => {
          const isler = g.gorevler ?? []
          return (
            <li key={g.tarih} className="plan-gun">
              <span className="plan-gun-ad">
                {GUN_KISA[new Date(`${g.tarih}T00:00:00`).getDay()]}
              </span>
              <span className="plan-gun-isler">
                {isler.length === 0 ? (
                  <span className="plan-bos">Boş gün</span>
                ) : (
                  isler.map((i, n) => (
                    <span key={n} className="plan-is">
                      {i.ders} · {i.baslik}
                      {i.gerekce?.includes('gecikmiş') ? (
                        <em className="plan-gecikme">{i.gerekce}</em>
                      ) : null}
                    </span>
                  ))
                )}
              </span>
            </li>
          )
        })}
      </ul>

      <div className="kuyruk-dugmeler">
        <Dugme bekliyor={bekliyor} onClick={() => karar('onay')}>
          {a.onay ?? 'Planı kur'} · {ozet.toplam ?? 0} görev
        </Dugme>
        <div className="kuyruk-alt-dugmeler">
          <button className="dugme dugme--ikincil" disabled={bekliyor} onClick={() => karar('izgara')}>
            {a.orta ?? 'Düzenle'}
          </button>
          <button className="dugme dugme--ikincil" disabled={bekliyor} onClick={() => karar('ertele')}>
            {a.ertele ?? 'Ertele'}
          </button>
        </div>
      </div>
    </Kart>
  )
}

/* ══ Haftanın kitabı ve sözü ══
   Haftada tek kart, bütün öğrenciler satır satır. Sistem her öğrenciye
   kendi haftasına göre öneri getirir; koç tek dokunuşla hepsini onaylar
   ya da satırda kitabı/sözü kütüphaneden değiştirir. Onaylanmayan haftada
   öğrenci genel seçimi görür, ekran boş kalmaz. */

const TEMA_ETIKET = {
  odak: 'odak', sabir: 'sabır', emek: 'emek', merak: 'merak', cesaret: 'cesaret',
  baslangic: 'başlangıç', sureklilik: 'süreklilik', hata: 'hata', dinlenme: 'dinlenme',
  oz_sefkat: 'öz şefkat',
}
const ETIKET_AD = {
  kisa: 'kısa', orta: 'orta', uzun: 'uzun', tek_oturusta: 'tek oturuş', dunya_klasigi: 'dünya klasiği',
  turk_edebiyati: 'Türk edebiyatı', felsefe: 'felsefe', oyku: 'öykü', bilim: 'bilim',
  psikoloji: 'psikoloji', tatil_icin: 'tatil',
}
const kucuk = (m) => String(m ?? '').toLocaleLowerCase('tr-TR')

function IlhamKarti({ kart, onOgrenciAc, onBitti, onHata }) {
  const hafta = kart.ek?.hafta_basi
  const [satirlar, setSatirlar] = useState(() =>
    (kart.ek?.satirlar ?? []).map((r) => ({ ...r, koc: false, bitti: false })),
  )
  const [acik, setAcik] = useState(null) // { id, tur: 'kitap' | 'soz' }
  const [bekliyor, setBekliyor] = useState(false)
  const kalan = satirlar.filter((r) => !r.bitti)

  async function onayla(liste) {
    setBekliyor(true)
    onHata('')
    const { error } = await supabase.rpc('koc_ilham_onayla', {
      p_hafta_basi: hafta,
      p_secimler: liste.map((r) => ({
        ogrenci_id: r.ogrenci_id,
        kitap_id: r.kitap?.id ?? null,
        soz_id: r.soz?.id ?? null,
        koc: r.koc,
      })),
    })
    setBekliyor(false)
    if (error) {
      onHata(hataMetni(error))
      return
    }
    const idler = new Set(liste.map((r) => r.ogrenci_id))
    const yeni = satirlar.map((r) => (idler.has(r.ogrenci_id) ? { ...r, bitti: true } : r))
    setSatirlar(yeni)
    setAcik(null)
    if (yeni.every((r) => r.bitti)) onBitti(true)
  }

  function degistir(id, alan, deger) {
    setSatirlar((l) =>
      l.map((r) => (r.ogrenci_id === id ? { ...r, [alan]: deger, [`${alan}_gerekce`]: 'Koç seçti', koc: true } : r)),
    )
    setAcik(null)
  }

  return (
    <Kart kaldirilmis>
      <div className="kuyruk-ust">
        <span className="kuyruk-tip" data-tip="ilham">{TIP_ETIKET.ilham}</span>
        <span className="kuyruk-sayac">{kart.baglam}</span>
      </div>
      <p className="kuyruk-oneri">{kart.oneri}</p>

      <ul className="ilham-liste">
        {satirlar.map((r) => {
          const kitapAcik = acik?.id === r.ogrenci_id && acik.tur === 'kitap'
          const sozAcik = acik?.id === r.ogrenci_id && acik.tur === 'soz'
          return (
            <li key={r.ogrenci_id} className="ilham-satir" data-bitti={r.bitti || undefined}>
              <div className="ilham-ust">
                <button className="ilham-kimlik" onClick={() => onOgrenciAc?.(r.ogrenci_id)} title="Öğrenciyi aç">
                  <Avatar yol={r.fotograf_yolu} ad={r.ad} boyut="kucuk" />
                </button>
                <div className="ilham-govde">
                  <span className="liste-ad">{r.ad}</span>
                  <span className="ilham-kitap">
                    {r.kitap ? (
                      <>
                        <i>{r.kitap.ad}</i> — {r.kitap.yazar}
                        {r.kitap.sayfa ? ` · ${r.kitap.sayfa} sayfa` : ''}
                      </>
                    ) : (
                      'Uygun kitap kalmadı, listeden seç'
                    )}
                  </span>
                  {r.kitap_gerekce && <span className="ilham-neden">{r.kitap_gerekce}</span>}
                  <button
                    className="ilham-soz"
                    disabled={r.bitti}
                    aria-expanded={sozAcik}
                    onClick={() => setAcik(sozAcik ? null : { id: r.ogrenci_id, tur: 'soz' })}
                    title={r.soz?.metin}
                  >
                    Söz · {TEMA_ETIKET[r.soz?.tema] ?? 'seç'}
                    {r.soz_gerekce ? <span className="ilham-soz-neden"> · {kucuk(r.soz_gerekce)}</span> : null}
                  </button>
                </div>
                {r.bitti ? (
                  <span className="ilham-tamam" aria-label="Onaylandı">✓</span>
                ) : (
                  <div className="ilham-eylem">
                    <button
                      className="dugme dugme--ikincil ilham-degistir"
                      aria-expanded={kitapAcik}
                      onClick={() => setAcik(kitapAcik ? null : { id: r.ogrenci_id, tur: 'kitap' })}
                    >
                      Değiştir
                    </button>
                    <button
                      className="dugme dugme--ikincil ilham-onay"
                      aria-label={`${r.ad} için onayla`}
                      disabled={bekliyor || !r.kitap}
                      onClick={() => onayla([r])}
                    >
                      ✓
                    </button>
                  </div>
                )}
              </div>
              {kitapAcik && (
                <KitapSecici ogrenciId={r.ogrenci_id} seciliId={r.kitap?.id} onSec={(k) => degistir(r.ogrenci_id, 'kitap', k)} />
              )}
              {sozAcik && <SozSecici seciliId={r.soz?.id} onSec={(s) => degistir(r.ogrenci_id, 'soz', s)} />}
            </li>
          )
        })}
      </ul>

      <div className="kuyruk-dugmeler">
        <Dugme bekliyor={bekliyor} disabled={kalan.some((r) => !r.kitap)} onClick={() => onayla(kalan)}>
          {kalan.length === satirlar.length ? 'Hepsini onayla' : `Kalan ${kalan.length} öğrenciyi onayla`}
        </Dugme>
      </div>
    </Kart>
  )
}

/* Kütüphane küçük (yüz kitap civarı); bir kez çekilir, arama tarayıcıda. */
let kutuphaneOnbellek = null
function useKutuphane() {
  const [veri, setVeri] = useState(kutuphaneOnbellek)
  useEffect(() => {
    if (kutuphaneOnbellek) return
    Promise.all([
      supabase.from('haftalik_kitap').select('id, ad, yazar, sayfa, etiket, seviye, emoji').eq('aktif', true).order('ad'),
      supabase.from('haftalik_soz').select('id, metin, tema').eq('aktif', true).order('tema'),
    ]).then(([k, s]) => {
      kutuphaneOnbellek = { kitaplar: k.data ?? [], sozler: s.data ?? [] }
      setVeri(kutuphaneOnbellek)
    })
  }, [])
  return veri
}

function KitapSecici({ ogrenciId, seciliId, onSec }) {
  const kut = useKutuphane()
  const [ara, setAra] = useState('')
  const [gecmis, setGecmis] = useState(new Set())
  useEffect(() => {
    Promise.all([
      supabase.from('ogrenci_ilham').select('kitap_id').eq('ogrenci_id', ogrenciId),
      supabase.from('ogrenci_okuma').select('kitap_id').eq('ogrenci_id', ogrenciId),
    ]).then(([a, b]) => setGecmis(new Set([...(a.data ?? []), ...(b.data ?? [])].map((x) => x.kitap_id))))
  }, [ogrenciId])

  const liste = useMemo(() => {
    if (!kut) return []
    const q = kucuk(ara).trim()
    return kut.kitaplar
      .filter((k) => k.id !== seciliId)
      .filter((k) => !q || kucuk(`${k.ad} ${k.yazar} ${(k.etiket ?? []).map((e) => ETIKET_AD[e] ?? e).join(' ')}`).includes(q))
      .sort((a, b) => Number(gecmis.has(a.id)) - Number(gecmis.has(b.id)))
  }, [kut, ara, seciliId, gecmis])

  return (
    <div className="ilham-secici">
      <input
        className="ilham-ara"
        value={ara}
        onChange={(e) => setAra(e.target.value)}
        placeholder="Kitap, yazar ya da tür ara: bilim, öykü, kısa"
        aria-label="Kütüphanede ara"
        autoFocus
      />
      {!kut ? (
        <p className="ilham-neden">Kütüphane geliyor…</p>
      ) : (
        <ul className="ilham-secenekler">
          {liste.slice(0, 40).map((k) => (
            <li key={k.id}>
              <button className="ilham-secenek" onClick={() => onSec(k)} data-gecmis={gecmis.has(k.id) || undefined}>
                <span>
                  <i>{k.ad}</i> <span className="ilham-neden">— {k.yazar}{k.sayfa ? ` · ${k.sayfa} s.` : ''}</span>
                </span>
                <span className="ilham-neden">
                  {gecmis.has(k.id) ? 'daha önce verildi' : k.seviye === 'lgs' ? 'LGS' : ''}
                </span>
              </button>
            </li>
          ))}
          {liste.length === 0 && <li className="ilham-neden">Bu aramaya uyan kitap yok.</li>}
        </ul>
      )}
    </div>
  )
}

function SozSecici({ seciliId, onSec }) {
  const kut = useKutuphane()
  const [tema, setTema] = useState(null)
  if (!kut) return <p className="ilham-neden">Sözler geliyor…</p>
  const temalar = [...new Set(kut.sozler.map((s) => s.tema).filter(Boolean))]
  const liste = kut.sozler.filter((s) => s.id !== seciliId && (!tema || s.tema === tema))
  return (
    <div className="ilham-secici">
      <div className="ilham-temalar" role="group" aria-label="Söz teması">
        {temalar.map((t) => (
          <button key={t} className="sure-dugme" aria-pressed={t === tema} onClick={() => setTema(t === tema ? null : t)}>
            {TEMA_ETIKET[t] ?? t}
          </button>
        ))}
      </div>
      <ul className="ilham-secenekler">
        {liste.map((s) => (
          <li key={s.id}>
            <button className="ilham-secenek" onClick={() => onSec(s)}>
              <span>{s.metin}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function KuyrukKarti({ kart, onOgrenciAc, onBitti, onHata }) {
  const [metin, setMetin] = useState(kart.mesaj ?? '')
  const [duzenle, setDuzenle] = useState(false)
  const [bekliyor, setBekliyor] = useState(false)
  const a = kart.aksiyonlar ?? {}

  /* Deneme analizi kartında hata dağılımı ve önerilen görevler de var:
     koç kutucuklardan seçer, onay bu görevleri atar. */
  const oneriler = kart.ek?.oneriler ?? []
  const dagilim = kart.ek?.dagilim ?? null
  const [secili, setSecili] = useState(() =>
    oneriler.map((o, i) => (o.secili ? i : -1)).filter((i) => i >= 0),
  )

  async function karar(k) {
    setBekliyor(true)
    onHata('')
    const { error } = await supabase.rpc('koc_karar_ver', {
      p_tip: kart.tip,
      p_kaynak_id: kart.kaynak_id,
      p_karar: k,
      p_metin: kart.deger ?? (kart.mesaj != null ? metin : null),
      p_secili: k === 'onay' ? secili : [],
    })
    setBekliyor(false)
    if (error) {
      onHata(hataMetni(error))
      return
    }
    onBitti(k !== 'ertele')
  }

  function ortaya() {
    if (a.ortaKod === 'duzelt') {
      setDuzenle(true)
      return
    }
    karar(a.ortaKod)
  }

  return (
    <Kart kaldirilmis>
      <div className="kuyruk-ust">
        <span className="kuyruk-tip" data-tip={kart.tip}>
          {TIP_ETIKET[kart.tip] ?? kart.tip}
        </span>
      </div>


      <button className="kuyruk-kimlik" onClick={() => onOgrenciAc?.(kart.ogrenci_id)} title="Öğrenciyi aç">
        <Avatar yol={kart.fotograf_yolu} ad={kart.ad} boyut="kucuk" />
        <span>
          <span className="liste-ad">{kart.ad}</span>
          <span className="liste-alt">{kart.baglam}</span>
        </span>
      </button>

      <p className="kuyruk-oneri">{kart.oneri}</p>

      {kart.mesaj != null && !duzenle ? <p className="kuyruk-mesaj">{metin}</p> : null}

      {dagilim ? (
        <div className="analiz-dagilim" aria-label="Hata dağılımı">
          {['bilgi', 'dikkat', 'sure'].map((k) => (
            <span key={k} className={`analiz-dilim analiz-dilim--${k}`}>
              <strong>{dagilim[k] ?? 0}</strong>
              {SEBEP[k]}
            </span>
          ))}
        </div>
      ) : null}

      {oneriler.length > 0 ? (
        <>
          <p className="analiz-oneri-baslik">Önerilen görevler — seç ve ata</p>
          <ul className="analiz-oneriler">
            {oneriler.map((o, i) => (
              <li key={i}>
                <label className="analiz-oneri">
                  <input
                    type="checkbox"
                    checked={secili.includes(i)}
                    onChange={() =>
                      setSecili((v) => (v.includes(i) ? v.filter((x) => x !== i) : [...v, i]))
                    }
                  />
                  <span className="analiz-oneri-metin">
                    {o.baslik}
                    <small>
                      {o.ders} · {o.adet} yanlış · {SEBEP[o.sebep]}
                      {o.kaynak_ad ? ` · ${o.kaynak_ad}` : ''}
                    </small>
                  </span>
                  <span className="analiz-dk">{o.dk} dk</span>
                </label>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {kart.mesaj != null && duzenle ? (
        <textarea
          className="kuyruk-alan"
          value={metin}
          rows={5}
          onChange={(e) => setMetin(e.target.value)}
          aria-label="Gidecek metin"
        />
      ) : null}

      <div className="kuyruk-dugmeler">
        <Dugme bekliyor={bekliyor} onClick={() => karar('onay')}>
          {oneriler.length > 0
            ? `Onayla · ${secili.length} görev ata`
            : (a.onay ?? 'Onayla')}
        </Dugme>
        <div className="kuyruk-alt-dugmeler">
          {a.orta && !duzenle ? (
            <button className="dugme dugme--ikincil" disabled={bekliyor} onClick={ortaya}>
              {a.orta}
            </button>
          ) : null}
          <button className="dugme dugme--ikincil" disabled={bekliyor} onClick={() => karar('ertele')}>
            {a.ertele ?? 'Ertele'}
          </button>
          {a.sil ? (
            <button className="dugme dugme--ikincil" disabled={bekliyor} onClick={() => karar('sil')}>
              {a.sil}
            </button>
          ) : null}
        </div>
      </div>
    </Kart>
  )
}
