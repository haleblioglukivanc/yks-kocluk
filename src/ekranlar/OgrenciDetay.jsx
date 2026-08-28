import { useCallback, useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Alan, Bos, Dugme, Kart, Rozet, Uyari, Yukleniyor } from '../bilesenler/Ortak.jsx'

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

/** Yerel saate göre YYYY-MM-DD. toISOString kullanılmaz: UTC'ye kayar. */
const gunAnahtari = (t) => t.toLocaleDateString('sv-SE')

function haftaBasi(tarih) {
  const t = new Date(tarih)
  const gun = (t.getDay() + 6) % 7 // pazartesi = 0
  t.setDate(t.getDate() - gun)
  t.setHours(0, 0, 0, 0)
  return t
}

function haftaGunleri(bas) {
  return Array.from({ length: 7 }, (_, i) => {
    const t = new Date(bas)
    t.setDate(bas.getDate() + i)
    return t
  })
}

export default function OgrenciDetay({ ogrenciId, onGeri }) {
  const [ogrenci, setOgrenci] = useState(null)
  const [kataloglar, setKataloglar] = useState([])
  const [sekme, setSekme] = useState('program')
  const [duzenle, setDuzenle] = useState(false)
  const [hata, setHata] = useState('')

  const yukle = useCallback(async () => {
    const { data, error } = await supabase
      .from('ogrenciler')
      .select(
        'id, koc_id, alan, sinif, katalog_id, aktif, hedef_universite, hedef_bolum, kayit_tarihi, profiller!ogrenciler_id_fkey(ad_soyad, telefon), kataloglar(id, ad)',
      )
      .eq('id', ogrenciId)
      .maybeSingle()
    if (error) setHata(hataMetni(error))
    setOgrenci(data)
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

      <Kart
        baslik={ad}
        altBaslik={[
          ogrenci.sinif ? (ogrenci.sinif === 13 ? 'Mezun' : `${ogrenci.sinif}. sınıf`) : null,
          ogrenci.alan ? ALAN_ADI[ogrenci.alan] : null,
          ogrenci.kataloglar?.ad,
        ]
          .filter(Boolean)
          .join(' · ')}
        eylem={
          <Dugme tur="ikincil" onClick={() => setDuzenle((v) => !v)}>
            {duzenle ? 'Kapat' : 'Bilgileri düzenle'}
          </Dugme>
        }
      >
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
              <dt>Hedef</dt>
              <dd>
                {[ogrenci.hedef_universite, ogrenci.hedef_bolum].filter(Boolean).join(' · ') ||
                  'Belirtilmedi'}
              </dd>
            </div>
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
  const [aktif, setAktif] = useState(ogrenci.aktif)
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState('')

  async function kaydet() {
    setHata('')
    if (ad.trim().length < 2) {
      setHata('Ad soyad en az 2 karakter olmalı.')
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
  const [bas, setBas] = useState(() => haftaBasi(new Date()))
  const [gorevler, setGorevler] = useState(null)
  const [formGun, setFormGun] = useState(null)
  const [hata, setHata] = useState('')

  const gunler = haftaGunleri(bas)
  const ilk = gunAnahtari(gunler[0])
  const son = gunAnahtari(gunler[6])

  const yukle = useCallback(async () => {
    const { data, error } = await supabase
      .from('gorevler')
      .select('id, tarih, tur, baslik, hedef_adet, yapilan_adet, durum, dersler(ad), konular(ad)')
      .eq('ogrenci_id', ogrenci.id)
      .gte('tarih', ilk)
      .lte('tarih', son)
      .order('tarih')
      .order('id')
    if (error) setHata(hataMetni(error))
    setGorevler(data ?? [])
  }, [ogrenci.id, ilk, son])

  useEffect(() => {
    yukle()
  }, [yukle])

  async function durumDegistir(g) {
    const sirada = { bekliyor: 'devam', devam: 'tamamlandi', tamamlandi: 'atlandi', atlandi: 'bekliyor' }
    const { error } = await supabase
      .from('gorevler')
      .update({ durum: sirada[g.durum] })
      .eq('id', g.id)
    if (error) setHata(hataMetni(error))
    else yukle()
  }

  async function sil(id) {
    const { error } = await supabase.from('gorevler').delete().eq('id', id)
    if (error) setHata(hataMetni(error))
    else yukle()
  }

  const bugun = gunAnahtari(new Date())

  return (
    <Kart
      baslik="Haftalık program"
      altBaslik={`${gunler[0].toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} – ${gunler[6].toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}`}
      eylem={
        <div className="hafta-gezinme">
          <button
            className="ok-dugme"
            onClick={() => setBas(new Date(bas.getFullYear(), bas.getMonth(), bas.getDate() - 7))}
            aria-label="Önceki hafta"
          >
            ←
          </button>
          <button className="metin-dugme" onClick={() => setBas(haftaBasi(new Date()))}>
            Bu hafta
          </button>
          <button
            className="ok-dugme"
            onClick={() => setBas(new Date(bas.getFullYear(), bas.getMonth(), bas.getDate() + 7))}
            aria-label="Sonraki hafta"
          >
            →
          </button>
        </div>
      }
    >
      <Uyari>{hata}</Uyari>

      {gorevler === null ? (
        <Yukleniyor />
      ) : (
        <div className="hafta">
          {gunler.map((g) => {
            const anahtar = gunAnahtari(g)
            const gunun = gorevler.filter((x) => x.tarih === anahtar)
            return (
              <section key={anahtar} className={`gun${anahtar === bugun ? ' gun--bugun' : ''}`}>
                <header className="gun-basi">
                  <span className="gun-ad">
                    {g.toLocaleDateString('tr-TR', { weekday: 'long' })}
                    <span className="gun-tarih">{g.getDate()}</span>
                  </span>
                  <button
                    className="metin-dugme"
                    onClick={() => setFormGun(formGun === anahtar ? null : anahtar)}
                  >
                    {formGun === anahtar ? 'Kapat' : '+ Görev'}
                  </button>
                </header>

                {formGun === anahtar && (
                  <GorevFormu
                    ogrenci={ogrenci}
                    tarih={anahtar}
                    onEklendi={() => {
                      setFormGun(null)
                      yukle()
                    }}
                  />
                )}

                {gunun.length === 0 ? (
                  <p className="gun-bos">Görev yok</p>
                ) : (
                  <ul className="gorev-liste">
                    {gunun.map((g2) => (
                      <li key={g2.id} className={`gorev gorev--${g2.durum}`}>
                        <button
                          className="gorev-kutu"
                          onClick={() => durumDegistir(g2)}
                          aria-label={`Durum: ${DURUM_ADI[g2.durum]}`}
                          title={DURUM_ADI[g2.durum]}
                        />
                        <div className="gorev-metin">
                          <span className="gorev-baslik">{g2.baslik}</span>
                          <span className="gorev-alt">
                            {[
                              g2.dersler?.ad,
                              g2.konular?.ad,
                              TUR_ADI[g2.tur],
                              g2.hedef_adet ? `${g2.yapilan_adet}/${g2.hedef_adet}` : null,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        </div>
                        <button className="sil-dugme" onClick={() => sil(g2.id)} aria-label="Sil">
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )
          })}
        </div>
      )}
    </Kart>
  )
}

function GorevFormu({ ogrenci, tarih, onEklendi }) {
  const [dersler, setDersler] = useState([])
  const [konular, setKonular] = useState([])
  const [dersId, setDersId] = useState('')
  const [konuId, setKonuId] = useState('')
  const [tur, setTur] = useState('soru_cozumu')
  const [baslik, setBaslik] = useState('')
  const [hedef, setHedef] = useState('')
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

  useEffect(() => {
    if (!dersId) {
      setKonular([])
      setKonuId('')
      return
    }
    supabase
      .from('konular')
      .select('id, ad')
      .eq('ders_id', Number(dersId))
      .order('sira')
      .then(({ data }) => setKonular(data ?? []))
  }, [dersId])

  async function ekle() {
    setHata('')
    const secilenKonu = konular.find((k) => String(k.id) === konuId)
    const secilenDers = dersler.find((d) => String(d.id) === dersId)
    const son = baslik.trim() || secilenKonu?.ad || secilenDers?.ad || TUR_ADI[tur]

    setBekliyor(true)
    try {
      const { error } = await supabase.from('gorevler').insert({
        ogrenci_id: ogrenci.id,
        koc_id: ogrenci.koc_id,
        tarih,
        ders_id: dersId ? Number(dersId) : null,
        konu_id: konuId ? Number(konuId) : null,
        tur,
        baslik: son,
        hedef_adet: hedef ? Number(hedef) : null,
      })
      if (error) throw error
      onEklendi()
    } catch (e) {
      setHata(hataMetni(e))
    } finally {
      setBekliyor(false)
    }
  }

  return (
    <div className="form-kutu form-kutu--dar">
      {!ogrenci.katalog_id && (
        <Uyari tur="bilgi">
          Bu öğrenciye katalog atanmamış. Ders ve konu seçmek için önce bilgileri düzenleyin.
        </Uyari>
      )}

      <div className="ikili">
        <Alan etiket="Ders">
          <select value={dersId} onChange={(e) => setDersId(e.target.value)}>
            <option value="">Seçilmedi</option>
            {dersler.map((d) => (
              <option key={d.id} value={d.id}>
                {d.ad} ({d.kapsam.replace('_', '+').toUpperCase()})
              </option>
            ))}
          </select>
        </Alan>
        <Alan etiket="Konu">
          <select value={konuId} onChange={(e) => setKonuId(e.target.value)} disabled={!dersId}>
            <option value="">Seçilmedi</option>
            {konular.map((k) => (
              <option key={k.id} value={k.id}>
                {k.ad}
              </option>
            ))}
          </select>
        </Alan>
      </div>

      <div className="ikili">
        <Alan etiket="Tür">
          <select value={tur} onChange={(e) => setTur(e.target.value)}>
            {Object.entries(TUR_ADI).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Alan>
        <Alan etiket="Hedef adet" ipucu="Soru sayısı, sayfa vb.">
          <input
            type="number"
            min="1"
            value={hedef}
            onChange={(e) => setHedef(e.target.value)}
            placeholder="40"
          />
        </Alan>
      </div>

      <Alan etiket="Başlık" ipucu="Boş bırakılırsa konu adı kullanılır">
        <input value={baslik} onChange={(e) => setBaslik(e.target.value)} placeholder="Örn. Türev testi" />
      </Alan>

      <Uyari>{hata}</Uyari>
      <Dugme onClick={ekle} bekliyor={bekliyor}>
        Görevi ekle
      </Dugme>
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
