import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Kart, Dugme, Uyari, Yukleniyor } from './Ortak.jsx'
import { Avatar } from './Fotograf.jsx'
import BugunCalisanlar from './BugunCalisanlar.jsx'

/* Koçun günlük karar kuyruğu. Kararlar dört segmente ayrılır: acil, süresi
   dolacak, bugün, bu hafta. Koç tek kart görür ama şeritten istediği segmente
   atlayabilir. Aciliyet koça konan cevap süresinden değil, kartın türünden
   gelir. Kural: öneri hazır gelir, koç onaylar; öğrenciye giden metin karttan
   görünmeden hiçbir şey gönderilmez. */

const SEBEP = { bilgi: 'bilgi eksiği', dikkat: 'dikkat', sure: 'süre' }

const TIP_ETIKET = {
  risk: 'Kaybolan öğrenci',
  gorusme: 'Acil görüşme',
  blok: 'Blok',
  konu: 'Konu onayı',
  analiz: 'Deneme analizi',
  veli_ozet: 'Veli özeti',
  hedef: 'Hedef ayarı',
  tebrik: 'Tebrik',
}

const SEGMENT_ETIKET = { acil: 'Acil', pencere: 'Süreli', bugun: 'Bugün', hafta: 'Bu hafta' }
const SEGMENT_SIRA = ['acil', 'pencere', 'bugun', 'hafta']

function anahtar(k) {
  return `${k.tip}-${k.kaynak_id}`
}

export default function KararKuyrugu({ onOgrenciAc }) {
  const [kartlar, setKartlar] = useState(null)
  const [bitenler, setBitenler] = useState([])
  const [verilen, setVerilen] = useState(0)
  const [segment, setSegment] = useState(null)
  const [odakKey, setOdakKey] = useState(null)
  const [hata, setHata] = useState('')

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
        <Kart>
          <div className="kuyruk-bitis">
            <p className="kuyruk-bitis-baslik">Bugünlük bitti</p>
            <p className="kuyruk-bitis-alt">
              {verilen > 0 ? `${verilen} karar verdin.` : 'Bekleyen karar yok.'}
              {' '}Yeni bir şey olursa Çizbi söyler.
            </p>
          </div>
        </Kart>
        <IyiHaber kartlar={kutlamalar} onBitti={bittiIsaretle} onHata={setHata} />
        {/* Boş ekran boş kalmasın: kim bugün girdi, kim çalışıyor. */}
        <BugunCalisanlar onOgrenciAc={onOgrenciAc} />
      </>
    )
  }

  return (
    <>
      {hata ? <Uyari>{hata}</Uyari> : null}

      <GorusmeSeridi />

      <SegmentSeridi
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
      ) : (
        <KuyrukKarti
          key={anahtar(odak)}
          kart={odak}
          onOgrenciAc={onOgrenciAc}
          onBitti={(sayildi) => bittiIsaretle(odak, sayildi)}
          onHata={setHata}
        />
      )}

      <Sirada kartlar={sirada} onSec={(k) => setOdakKey(anahtar(k))} />
      <IyiHaber kartlar={kutlamalar} onBitti={bittiIsaretle} onHata={setHata} />
    </>
  )
}

/* Segment şeridi: hangi işin ne kadar beklediği tek bakışta. Acil varsa kuyruk
   kendiliğinden orada açılır; koç isterse başka segmente atlar. */
function SegmentSeridi({ sayilar, aktif, onSec }) {
  const gorunen = SEGMENT_SIRA.filter((s) => sayilar[s])
  if (gorunen.length < 2) return null
  return (
    <div className="segment-serit" role="tablist" aria-label="Karar segmentleri">
      {gorunen.map((s) => (
        <button
          key={s}
          role="tab"
          aria-selected={s === aktif}
          className="segment-sekme"
          data-segment={s}
          onClick={() => onSec(s)}
        >
          {SEGMENT_ETIKET[s]}
          <span className="segment-adet">{sayilar[s]}</span>
        </button>
      ))}
    </div>
  )
}

/* Bekleyen kararlar tek satır halinde. Önce dört tanesi görünür, gerisi
   istendiğinde açılır; dokununca o karta atlanır. */
function Sirada({ kartlar, onSec }) {
  const [hepsi, setHepsi] = useState(false)
  if (kartlar.length === 0) return null
  const gosterilen = hepsi ? kartlar : kartlar.slice(0, 4)
  return (
    <Kart
      duz
      baslik="Sırada"
      eylem={
        kartlar.length > 4 ? (
          <button className="metin-dugme" onClick={() => setHepsi((a) => !a)} aria-expanded={hepsi}>
            {hepsi ? 'Kısalt' : `Hepsi · ${kartlar.length}`}
          </button>
        ) : null
      }
    >
      <ul className="sirada-liste">
        {gosterilen.map((k) => (
          <li key={anahtar(k)}>
            <button
              className="sirada-satir sirada-satir--dokun"
              data-segment={k.segment}
              onClick={() => onSec(k)}
            >
              <span className="sirada-ad">{k.ad}</span>
              <span className="sirada-baglam">{k.baglam}</span>
            </button>
          </li>
        ))}
      </ul>
    </Kart>
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
