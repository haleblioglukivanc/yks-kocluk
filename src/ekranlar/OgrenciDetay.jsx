import { useCallback, useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Alan, Bos, Dugme, Kart, Rozet, Uyari, Yukleniyor } from '../bilesenler/Ortak.jsx'
import { Avatar, FotografYukle } from '../bilesenler/Fotograf.jsx'
import ProgramIzgarasi, { PERIYOTLAR, gunAnahtari } from '../bilesenler/ProgramIzgarasi.jsx'
import HedefNet from '../bilesenler/HedefNet.jsx'

const ALAN_ADI = { sayisal: 'Sayısal', esit_agirlik: 'Eşit Ağırlık', sozel: 'Sözel', dil: 'Dil' }
const TUR_ADI = {
  konu_anlatimi: 'Konu anlatımı',
  soru_cozumu: 'Soru çözümü',
  tekrar: 'Tekrar',
  deneme: 'Deneme',
  okuma: 'Okuma',
  diger: 'Diğer',
}
const DURUM_ADI = { bekliyor: 'Bekliyor', devam: 'Devam ediyor', tamamlandi: 'Tamamlandı', atlandi: 'Atlandı' }
const ILERLEME_ADI = {
  baslanmadi: 'Başlanmadı',
  calisiliyor: 'Çalışılıyor',
  tamamlandi: 'Tamamlandı',
  tekrar_gerekli: 'Tekrar gerekli',
}

export default function OgrenciDetay({ ogrenciId, onGeri }) {
  const [ogrenci, setOgrenci] = useState(null)
  const [netDurumu, setNetDurumu] = useState(null)
  const [kataloglar, setKataloglar] = useState([])
  const [sekme, setSekme] = useState('program')
  const [duzenle, setDuzenle] = useState(false)
  const [hata, setHata] = useState('')

  const yukle = useCallback(async () => {
    const { data, error } = await supabase
      .from('ogrenciler')
      .select(
        'id, koc_id, alan, sinif, katalog_id, aktif, hedef_universite, hedef_bolum, hedef_tyt_net, hedef_ayt_net, kayit_tarihi, profiller!ogrenciler_id_fkey(ad_soyad, telefon, fotograf_yolu), kataloglar(id, ad)',
      )
      .eq('id', ogrenciId)
      .maybeSingle()
    if (error) setHata(hataMetni(error))
    setOgrenci(data)

    const { data: nd } = await supabase
      .from('ogrenci_net_durumu')
      .select('tur, son_net, en_yuksek_net')
      .eq('ogrenci_id', ogrenciId)
    setNetDurumu(Object.fromEntries((nd ?? []).map((x) => [x.tur, x])))
  }, [ogrenciId])

  useEffect(() => {
    yukle()
    supabase
      .from('kataloglar')
      .select('id, ad, alan, seviye')
      .is('koc_id', null)
      .order('sira')
      .then(({ data }) => setKataloglar(data ?? []))
  }, [yukle])

  if (hata) return <Uyari>{hata}</Uyari>
  if (!ogrenci) return <Yukleniyor />

  const ad = ogrenci.profiller?.ad_soyad ?? 'İsimsiz'

  return (
    <div className="panel">
      <button className="metin-dugme geri" onClick={onGeri}>
        ← Öğrenci listesi
      </button>

      <Kart>
        <div className="kimlik">
          <Avatar yol={ogrenci.profiller?.fotograf_yolu} ad={ad} boyut="buyuk" />
          <div className="kimlik-metin">
            <h2 className="kimlik-ad">{ad}</h2>
            <p className="kimlik-alt">
              {[
                ogrenci.sinif ? (ogrenci.sinif === 13 ? 'Mezun' : `${ogrenci.sinif}. sınıf`) : null,
                ogrenci.alan ? ALAN_ADI[ogrenci.alan] : null,
                ogrenci.kataloglar?.ad,
              ]
                .filter(Boolean)
                .join(' · ') || 'Bilgi girilmemiş'}
            </p>
            {(ogrenci.hedef_universite || ogrenci.hedef_bolum) && (
              <p className="kimlik-hedef">
                Hedef: {[ogrenci.hedef_universite, ogrenci.hedef_bolum].filter(Boolean).join(' · ')}
              </p>
            )}
            <HedefNet
              tyt={ogrenci.hedef_tyt_net}
              ayt={ogrenci.hedef_ayt_net}
              durum={netDurumu}
            />
            {!ogrenci.aktif && <Rozet ton="sonuk">Pasif</Rozet>}
          </div>
          <Dugme tur="ikincil" onClick={() => setDuzenle((v) => !v)}>
            {duzenle ? 'Kapat' : 'Düzenle'}
          </Dugme>
        </div>

        {duzenle ? (
          <BilgiFormu
            ogrenci={ogrenci}
            kataloglar={kataloglar}
            onKaydedildi={async () => {
              setDuzenle(false)
              await yukle()
            }}
          />
        ) : (
          <dl className="kunye">
            <div>
              <dt>Telefon</dt>
              <dd>{ogrenci.profiller?.telefon || 'Belirtilmedi'}</dd>
            </div>
            <div>
              <dt>Kayıt</dt>
              <dd>{new Date(ogrenci.kayit_tarihi).toLocaleDateString('tr-TR')}</dd>
            </div>
            <div>
              <dt>Durum</dt>
              <dd>{ogrenci.aktif ? 'Aktif' : 'Pasif'}</dd>
            </div>
          </dl>
        )}
      </Kart>

      <nav className="sekmeler sekmeler--genis">
        {[
          ['program', 'Program'],
          ['denemeler', 'Denemeler'],
          ['konular', 'Konular'],
        ].map(([k, e]) => (
          <button
            key={k}
            className={sekme === k ? 'sekme sekme--etkin' : 'sekme'}
            onClick={() => setSekme(k)}
          >
            {e}
          </button>
        ))}
      </nav>

      {sekme === 'program' && <Program ogrenci={ogrenci} />}
      {sekme === 'denemeler' && <Denemeler ogrenci={ogrenci} />}
      {sekme === 'konular' && <Konular ogrenci={ogrenci} />}
    </div>
  )
}

/* ─────────────────────────── Bilgi düzenleme ─────────────────────────── */

function BilgiFormu({ ogrenci, kataloglar, onKaydedildi }) {
  const [ad, setAd] = useState(ogrenci.profiller?.ad_soyad ?? '')
  const [telefon, setTelefon] = useState(ogrenci.profiller?.telefon ?? '')
  const [katalogId, setKatalogId] = useState(ogrenci.katalog_id ? String(ogrenci.katalog_id) : '')
  const [sinif, setSinif] = useState(ogrenci.sinif ? String(ogrenci.sinif) : '')
  const [alan, setAlan] = useState(ogrenci.alan ?? '')
  const [uni, setUni] = useState(ogrenci.hedef_universite ?? '')
  const [bolum, setBolum] = useState(ogrenci.hedef_bolum ?? '')
  const [tytNet, setTytNet] = useState(ogrenci.hedef_tyt_net ?? '')
  const [aytNet, setAytNet] = useState(ogrenci.hedef_ayt_net ?? '')
  const [aktif, setAktif] = useState(ogrenci.aktif)
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState('')

  async function kaydet() {
    setHata('')
    if (ad.trim().length < 2) {
      setHata('Ad soyad en az 2 karakter olmalı.')
      return
    }
    if (tytNet !== '' && (Number(tytNet) < 0 || Number(tytNet) > 120)) {
      setHata('Hedef TYT net 0 ile 120 arasında olmalı.')
      return
    }
    if (aytNet !== '' && (Number(aytNet) < 0 || Number(aytNet) > 80)) {
      setHata('Hedef AYT net 0 ile 80 arasında olmalı.')
      return
    }
    setBekliyor(true)
    try {
      const { error: pHata } = await supabase
        .from('profiller')
        .update({ ad_soyad: ad.trim(), telefon: telefon.trim() || null })
        .eq('id', ogrenci.id)
      if (pHata) throw pHata

      const { error: oHata } = await supabase
        .from('ogrenciler')
        .update({
          katalog_id: katalogId ? Number(katalogId) : null,
          sinif: sinif ? Number(sinif) : null,
          alan: alan || null,
          hedef_universite: uni.trim() || null,
          hedef_bolum: bolum.trim() || null,
          hedef_tyt_net: tytNet === '' ? null : Number(tytNet),
          hedef_ayt_net: aytNet === '' ? null : Number(aytNet),
          aktif,
        })
        .eq('id', ogrenci.id)
      if (oHata) throw oHata

      await onKaydedildi()
    } catch (e) {
      setHata(hataMetni(e))
    } finally {
      setBekliyor(false)
    }
  }

  return (
    <div className="form-kutu">
      <FotografYukle
        ogrenciId={ogrenci.id}
        mevcutYol={ogrenci.profiller?.fotograf_yolu}
        ad={ad}
        onDegisti={onKaydedildi}
      />

      <Alan etiket="Ad soyad">
        <input value={ad} onChange={(e) => setAd(e.target.value)} />
      </Alan>
      <Alan etiket="Telefon" ipucu="İsteğe bağlı">
        <input value={telefon} onChange={(e) => setTelefon(e.target.value)} placeholder="05XX XXX XX XX" />
      </Alan>
      <Alan etiket="Konu kataloğu">
        <select value={katalogId} onChange={(e) => setKatalogId(e.target.value)}>
          <option value="">Seçilmedi</option>
          {kataloglar.map((k) => (
            <option key={k.id} value={k.id}>
              {k.ad}
            </option>
          ))}
        </select>
      </Alan>
      <Alan etiket="Sınıf">
        <select value={sinif} onChange={(e) => setSinif(e.target.value)}>
          <option value="">Belirtilmedi</option>
          {[8, 9, 10, 11, 12].map((s) => (
            <option key={s} value={s}>
              {s}. sınıf
            </option>
          ))}
          <option value="13">Mezun</option>
        </select>
      </Alan>
      <Alan etiket="Alan">
        <select value={alan} onChange={(e) => setAlan(e.target.value)}>
          <option value="">Belirtilmedi</option>
          {Object.entries(ALAN_ADI).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </Alan>
      <Alan etiket="Hedef üniversite">
        <input value={uni} onChange={(e) => setUni(e.target.value)} placeholder="İsteğe bağlı" />
      </Alan>
      <Alan etiket="Hedef bölüm">
        <input value={bolum} onChange={(e) => setBolum(e.target.value)} placeholder="İsteğe bağlı" />
      </Alan>

      <div className="ikili">
        <Alan etiket="Hedef TYT net" ipucu="0 – 120">
          <input type="number" min="0" max="120" step="0.25" inputMode="decimal"
                 value={tytNet} onChange={(e) => setTytNet(e.target.value)} placeholder="Örn. 105" />
        </Alan>
        <Alan etiket="Hedef AYT net" ipucu="0 – 80">
          <input type="number" min="0" max="80" step="0.25" inputMode="decimal"
                 value={aytNet} onChange={(e) => setAytNet(e.target.value)} placeholder="Örn. 62" />
        </Alan>
      </div>
      <label className="onay">
        <input type="checkbox" checked={aktif} onChange={(e) => setAktif(e.target.checked)} />
        <span>
          Aktif öğrenci
          <em>Pasife alınan öğrenci listede soluk görünür, verisi silinmez.</em>
        </span>
      </label>

      <Uyari>{hata}</Uyari>
      <Dugme onClick={kaydet} bekliyor={bekliyor}>
        Değişiklikleri kaydet
      </Dugme>
    </div>
  )
}

/* ─────────────────────────── Program ─────────────────────────── */

function Program({ ogrenci }) {
  const [secim, setSecim] = useState(null) // { blok, tarih, periyot }
  const [tazele, setTazele] = useState(0)

  return (
    <Kart baslik="Haftalık program" altBaslik="Zaman dilimine göre">
      <ProgramIzgarasi
        key={tazele}
        ogrenci={ogrenci}
        duzenlenebilir
        onHucreSec={(blok, tarih, periyot) => setSecim({ blok, tarih, periyot })}
      />

      {secim && (
        <HucreDuzenle
          ogrenci={ogrenci}
          secim={secim}
          onKapat={() => setSecim(null)}
          onDegisti={() => {
            setSecim(null)
            setTazele((t) => t + 1)
          }}
        />
      )}
    </Kart>
  )
}

/** Bir hücreye ders atar ya da mevcut bloğu düzenler/siler. */
function HucreDuzenle({ ogrenci, secim, onKapat, onDegisti }) {
  const { blok, tarih, periyot } = secim
  const gun = new Date(tarih).toLocaleDateString('tr-TR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
  const saat = periyot ? PERIYOTLAR[periyot - 1] : 'Gün boyu'

  async function sil() {
    await supabase.from('gorevler').delete().eq('id', blok.id)
    onDegisti()
  }

  return (
    <div className="hucre-panel">
      <header className="hucre-basi">
        <div>
          <span className="hucre-gun">{gun}</span>
          <span className="hucre-saat">{saat}</span>
        </div>
        <button className="metin-dugme" onClick={onKapat}>Kapat</button>
      </header>

      {blok ? (
        <div className="hucre-mevcut">
          <div>
            <span className="liste-ad">{blok.baslik}</span>
            <span className="liste-alt">
              {[blok.dersler?.ad, blok.konular?.ad, TUR_ADI[blok.tur],
                blok.hedef_adet ? `${blok.yapilan_adet}/${blok.hedef_adet}` : null]
                .filter(Boolean).join(' · ')}
            </span>
          </div>
          <Dugme tur="ikincil" onClick={sil}>Bloğu sil</Dugme>
        </div>
      ) : (
        <GorevFormu
          ogrenci={ogrenci}
          tarih={tarih}
          periyot={periyot}
          onEklendi={onDegisti}
        />
      )}
    </div>
  )
}

/* ─────────────────────────── Denemeler ─────────────────────────── */

function Denemeler({ ogrenci }) {
  const [liste, setListe] = useState(null)
  const [formAcik, setFormAcik] = useState(false)
  const [hata, setHata] = useState('')

  const yukle = useCallback(async () => {
    const { data, error } = await supabase
      .from('deneme_ozet')
      .select('id, tarih, tur, yayin, ad, toplam_net, toplam_dogru, toplam_yanlis')
      .eq('ogrenci_id', ogrenci.id)
      .order('tarih', { ascending: false })
    if (error) setHata(hataMetni(error))
    setListe(data ?? [])
  }, [ogrenci.id])

  useEffect(() => {
    yukle()
  }, [yukle])

  async function sil(id) {
    const { error } = await supabase.from('denemeler').delete().eq('id', id)
    if (error) setHata(hataMetni(error))
    else yukle()
  }

  const enIyi = liste?.length ? Math.max(...liste.map((d) => Number(d.toplam_net))) : 0

  return (
    <Kart
      baslik="Denemeler"
      altBaslik={liste ? `${liste.length} kayıt` : undefined}
      eylem={
        <Dugme tur="ikincil" onClick={() => setFormAcik((v) => !v)}>
          {formAcik ? 'Kapat' : 'Deneme ekle'}
        </Dugme>
      }
    >
      <Uyari>{hata}</Uyari>

      {formAcik && (
        <DenemeFormu
          ogrenci={ogrenci}
          onEklendi={() => {
            setFormAcik(false)
            yukle()
          }}
        />
      )}

      {liste === null ? (
        <Yukleniyor />
      ) : liste.length === 0 ? (
        <Bos baslik="Deneme kaydı yok" aciklama="İlk denemeyi ekleyince net değişimi burada görünür." />
      ) : (
        <ul className="liste">
          {liste.map((d) => (
            <li key={d.id} className="liste-satir">
              <div>
                <span className="liste-ad">
                  {d.ad || `${d.tur.toUpperCase()} denemesi`}
                  {Number(d.toplam_net) === enIyi && enIyi > 0 && (
                    <Rozet ton="notr">En yüksek</Rozet>
                  )}
                </span>
                <span className="liste-alt">
                  {new Date(d.tarih).toLocaleDateString('tr-TR')}
                  {d.yayin ? ` · ${d.yayin}` : ''} · {d.toplam_dogru}D {d.toplam_yanlis}Y
                </span>
              </div>
              <div className="net-rozet">
                <strong>{Number(d.toplam_net).toFixed(2)}</strong>
                <span>net</span>
              </div>
              <button className="sil-dugme" onClick={() => sil(d.id)} aria-label="Sil">
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </Kart>
  )
}

function DenemeFormu({ ogrenci, onEklendi }) {
  const [tarih, setTarih] = useState(gunAnahtari(new Date()))
  const [tur, setTur] = useState('tyt')
  const [yayin, setYayin] = useState('')
  const [dersler, setDersler] = useState([])
  const [sonuc, setSonuc] = useState({})
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState('')

  useEffect(() => {
    if (!ogrenci.katalog_id) return
    supabase
      .from('dersler')
      .select('id, ad, kapsam')
      .eq('katalog_id', ogrenci.katalog_id)
      .order('sira')
      .then(({ data }) => setDersler(data ?? []))
  }, [ogrenci.katalog_id])

  const uygun = dersler.filter(
    (d) => d.kapsam === 'tyt_ayt' || d.kapsam === tur || tur === 'brans',
  )

  function yaz(dersId, alan, deger) {
    setSonuc((o) => ({ ...o, [dersId]: { ...(o[dersId] ?? {}), [alan]: deger } }))
  }

  const toplamNet = uygun.reduce((t, d) => {
    const s = sonuc[d.id] ?? {}
    const dg = Number(s.dogru ?? 0)
    const yn = Number(s.yanlis ?? 0)
    return t + (dg - yn / 4)
  }, 0)

  async function kaydet() {
    setHata('')
    const girilen = uygun.filter((d) => {
      const s = sonuc[d.id] ?? {}
      return s.dogru || s.yanlis || s.bos
    })
    if (girilen.length === 0) {
      setHata('En az bir ders için sonuç girin.')
      return
    }

    setBekliyor(true)
    try {
      const { data: deneme, error: dHata } = await supabase
        .from('denemeler')
        .insert({
          ogrenci_id: ogrenci.id,
          koc_id: ogrenci.koc_id,
          tarih,
          tur,
          yayin: yayin.trim() || null,
        })
        .select('id')
        .single()
      if (dHata) throw dHata

      const satirlar = girilen.map((d) => ({
        deneme_id: deneme.id,
        ders_id: d.id,
        dogru: Number(sonuc[d.id]?.dogru ?? 0),
        yanlis: Number(sonuc[d.id]?.yanlis ?? 0),
        bos: Number(sonuc[d.id]?.bos ?? 0),
      }))
      const { error: sHata } = await supabase.from('deneme_sonuclari').insert(satirlar)
      if (sHata) {
        await supabase.from('denemeler').delete().eq('id', deneme.id)
        throw sHata
      }

      onEklendi()
    } catch (e) {
      setHata(hataMetni(e))
    } finally {
      setBekliyor(false)
    }
  }

  return (
    <div className="form-kutu">
      <div className="ucul">
        <Alan etiket="Tarih">
          <input type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} />
        </Alan>
        <Alan etiket="Tür">
          <select value={tur} onChange={(e) => setTur(e.target.value)}>
            <option value="tyt">TYT</option>
            <option value="ayt">AYT</option>
            <option value="brans">Branş</option>
          </select>
        </Alan>
        <Alan etiket="Yayın">
          <input value={yayin} onChange={(e) => setYayin(e.target.value)} placeholder="İsteğe bağlı" />
        </Alan>
      </div>

      {uygun.length === 0 ? (
        <Uyari tur="bilgi">
          Bu öğrenciye katalog atanmamış ya da seçilen türde ders yok.
        </Uyari>
      ) : (
        <div className="sonuc-tablo">
          <div className="sonuc-basi">
            <span>Ders</span>
            <span>Doğru</span>
            <span>Yanlış</span>
            <span>Boş</span>
            <span>Net</span>
          </div>
          {uygun.map((d) => {
            const s = sonuc[d.id] ?? {}
            const net = Number(s.dogru ?? 0) - Number(s.yanlis ?? 0) / 4
            return (
              <div key={d.id} className="sonuc-satir">
                <span className="sonuc-ders">{d.ad}</span>
                {['dogru', 'yanlis', 'bos'].map((alan) => (
                  <input
                    key={alan}
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={s[alan] ?? ''}
                    onChange={(e) => yaz(d.id, alan, e.target.value)}
                    placeholder="0"
                  />
                ))}
                <span className="sonuc-net">{net ? net.toFixed(2) : '—'}</span>
              </div>
            )
          })}
          <div className="sonuc-toplam">
            <span>Toplam net</span>
            <strong>{toplamNet.toFixed(2)}</strong>
          </div>
        </div>
      )}

      <Uyari>{hata}</Uyari>
      <Dugme onClick={kaydet} bekliyor={bekliyor} disabled={uygun.length === 0}>
        Denemeyi kaydet
      </Dugme>
    </div>
  )
}

/* ─────────────────────────── Konular ─────────────────────────── */

function Konular({ ogrenci }) {
  const [dersler, setDersler] = useState(null)
  const [acikDers, setAcikDers] = useState(null)
  const [konular, setKonular] = useState([])
  const [ilerleme, setIlerleme] = useState({})
  const [hata, setHata] = useState('')

  useEffect(() => {
    if (!ogrenci.katalog_id) {
      setDersler([])
      return
    }
    supabase
      .from('dersler')
      .select('id, ad, kapsam, konular(count)')
      .eq('katalog_id', ogrenci.katalog_id)
      .order('sira')
      .then(({ data }) => setDersler(data ?? []))
  }, [ogrenci.katalog_id])

  const dersAc = useCallback(
    async (dersId) => {
      if (acikDers === dersId) {
        setAcikDers(null)
        return
      }
      setAcikDers(dersId)
      const [k, i] = await Promise.all([
        supabase.from('konular').select('id, ad, unite').eq('ders_id', dersId).order('sira'),
        supabase.from('konu_ilerleme').select('konu_id, durum').eq('ogrenci_id', ogrenci.id),
      ])
      setKonular(k.data ?? [])
      setIlerleme(Object.fromEntries((i.data ?? []).map((x) => [x.konu_id, x.durum])))
    },
    [acikDers, ogrenci.id],
  )

  async function durumYaz(konuId, durum) {
    const { error } = await supabase
      .from('konu_ilerleme')
      .upsert({ ogrenci_id: ogrenci.id, konu_id: konuId, durum, guncellendi: new Date().toISOString() })
    if (error) setHata(hataMetni(error))
    else setIlerleme((o) => ({ ...o, [konuId]: durum }))
  }

  if (dersler === null) return <Kart baslik="Konular"><Yukleniyor /></Kart>

  return (
    <Kart baslik="Konu ilerlemesi" altBaslik={ogrenci.kataloglar?.ad}>
      <Uyari>{hata}</Uyari>
      {dersler.length === 0 ? (
        <Bos baslik="Katalog atanmamış" aciklama="Bilgileri düzenleyip bir katalog seçin." />
      ) : (
        <ul className="ders-liste">
          {dersler.map((d) => (
            <li key={d.id}>
              <button className="ders-satir" onClick={() => dersAc(d.id)} aria-expanded={acikDers === d.id}>
                <span className="liste-ad">{d.ad}</span>
                <span className="liste-alt">{d.kapsam.replace('_', '+').toUpperCase()}</span>
                <span className="sayi">{d.konular?.[0]?.count ?? 0} konu</span>
              </button>

              {acikDers === d.id && (
                <ul className="konu-liste">
                  {konular.map((k) => (
                    <li key={k.id}>
                      <span className="konu-ad">
                        {k.ad}
                        {k.unite && <span className="konu-unite">{k.unite}</span>}
                      </span>
                      <select
                        value={ilerleme[k.id] ?? 'baslanmadi'}
                        onChange={(e) => durumYaz(k.id, e.target.value)}
                        className={`ilerleme ilerleme--${ilerleme[k.id] ?? 'baslanmadi'}`}
                      >
                        {Object.entries(ILERLEME_ADI).map(([kk, vv]) => (
                          <option key={kk} value={kk}>
                            {vv}
                          </option>
                        ))}
                      </select>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </Kart>
  )
}
