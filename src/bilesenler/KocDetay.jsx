import { useCallback, useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { kullaniciSil } from '../lib/hesap.js'
import { Alan, AltSayfa, Dugme, Uyari, Yukleniyor } from './Ortak.jsx'
import Bolum from '../ortak/Bolum.jsx'
import BosDurum from '../ortak/BosDurum.jsx'
import EylemDugmesi from '../ortak/EylemDugmesi.jsx'
import SifreSifirla from './SifreSifirla.jsx'

/**
 * Koç detayı (Yönetim → Koçlar → satır). TESPIT-YONETIM.md 2.2:
 * bilgiler (e-posta, başlangıç, son giriş, durum, kapasite, branş, iç not),
 * öğrencileri ve başka koça aktarma, hesap işlemleri. Yalnız yönetici;
 * yetki RPC'lerde (private.yonetici_mi).
 */
export const DURUM_ADI = { aktif: 'Aktif', izinde: 'İzinde', ayrildi: 'Ayrıldı' }

const tarih = (t) => (t ? new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—')
const zaman = (t) =>
  t ? new Date(t).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : 'hiç girmedi'

export default function KocDetay({ kocId, koclar, benId, onKapat, onDegisti }) {
  const [d, setD] = useState(null)
  const [hata, setHata] = useState('')
  const [duzenle, setDuzenle] = useState(false)

  const yukle = useCallback(async () => {
    const { data, error } = await supabase.rpc('yonetici_koc_detay', { p_koc: kocId })
    if (error) setHata(hataMetni(error))
    else setD(data)
  }, [kocId])

  useEffect(() => {
    yukle()
  }, [yukle])

  async function tazele() {
    await yukle()
    onDegisti?.()
  }

  return (
    <AltSayfa
      baslik={d?.ad_soyad ?? 'Koç'}
      altBaslik={d ? `${DURUM_ADI[d.durum] ?? d.durum}${d.yonetici ? ' · yönetici' : ''} · ${d.ogrenciler.filter((o) => o.aktif).length} aktif öğrenci` : ''}
      onKapat={onKapat}
      sinif="koc-detay"
    >
      <Uyari>{hata}</Uyari>
      {!d ? (
        <Yukleniyor satir={4} />
      ) : (
        <>
          <Bolum baslik="Bilgiler" eylem={duzenle ? 'Vazgeç' : 'Düzenle'} onEylem={() => setDuzenle((v) => !v)}>
            {duzenle ? (
              <BilgiFormu d={d} onKaydedildi={async () => { setDuzenle(false); await tazele() }} />
            ) : (
              <dl className="kunye">
                {[
                  ['E-posta', d.eposta ?? '—'],
                  ['Telefon', d.telefon ?? '—'],
                  ['Durum', DURUM_ADI[d.durum] ?? d.durum],
                  ['Başlangıç', tarih(d.baslangic)],
                  ['Son giriş', zaman(d.son_giris)],
                  ['Kapasite', d.kapasite ? `${d.ogrenciler.filter((o) => o.aktif).length} / ${d.kapasite} öğrenci` : 'Sınır yok'],
                  ['Branş', d.brans ?? '—'],
                  ['İç not', d.ic_not ?? '—'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            )}
          </Bolum>

          <Ogrencileri d={d} koclar={koclar} onAktarildi={tazele} />

          <Bolum cizgili baslik="Hesap">
            {d.id === benId ? (
              <p className="bolum-aciklama">Kendi şifreni hesap menüsündeki “Şifremi değiştir”den yenilersin.</p>
            ) : (
              <SifreSifirla kisiId={d.id} ad={d.ad_soyad} />
            )}
          </Bolum>

          {d.id !== benId && <Kaldir d={d} onKaldirildi={() => { onDegisti?.(); onKapat() }} />}
        </>
      )}
    </AltSayfa>
  )
}

function BilgiFormu({ d, onKaydedildi }) {
  const [ad, setAd] = useState(d.ad_soyad ?? '')
  const [telefon, setTelefon] = useState(d.telefon ?? '')
  const [durum, setDurum] = useState(d.durum ?? 'aktif')
  const [baslangic, setBaslangic] = useState(d.baslangic ?? '')
  const [kapasite, setKapasite] = useState(d.kapasite ?? '')
  const [brans, setBrans] = useState(d.brans ?? '')
  const [not, setNot] = useState(d.ic_not ?? '')
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState('')

  async function kaydet() {
    setHata('')
    setBekliyor(true)
    const { error } = await supabase.rpc('yonetici_koc_guncelle', {
      p_koc: d.id,
      p_ad: ad,
      p_telefon: telefon,
      p_durum: durum,
      p_baslangic: baslangic || null,
      p_kapasite: kapasite === '' ? null : Number(kapasite),
      p_brans: brans,
      p_not: not,
    })
    setBekliyor(false)
    if (error) return setHata(hataMetni(error))
    await onKaydedildi()
  }

  return (
    <div className="form-kutu form-kutu--duz">
      <Alan etiket="Ad soyad"><input value={ad} onChange={(e) => setAd(e.target.value)} /></Alan>
      <Alan etiket="Telefon" ipucu="İsteğe bağlı">
        <input type="tel" inputMode="tel" value={telefon} onChange={(e) => setTelefon(e.target.value)} placeholder="05XX XXX XX XX" />
      </Alan>
      <div className="alan-ikili">
        <Alan etiket="Durum">
          <select value={durum} onChange={(e) => setDurum(e.target.value)}>
            {Object.entries(DURUM_ADI).map(([k, a]) => <option key={k} value={k}>{a}</option>)}
          </select>
        </Alan>
        <Alan etiket="Başlangıç">
          <input type="date" value={baslangic} onChange={(e) => setBaslangic(e.target.value)} />
        </Alan>
      </div>
      <div className="alan-ikili">
        <Alan etiket="Kapasite" ipucu="En fazla öğrenci; boş = sınır yok">
          <input type="number" inputMode="numeric" min="1" max="500" value={kapasite} onChange={(e) => setKapasite(e.target.value)} />
        </Alan>
        <Alan etiket="Branş" ipucu="Örn. Sayısal, LGS">
          <input value={brans} onChange={(e) => setBrans(e.target.value)} />
        </Alan>
      </div>
      <Alan etiket="İç not" ipucu="Yalnız yöneticiler görür">
        <textarea rows={3} value={not} onChange={(e) => setNot(e.target.value)} />
      </Alan>
      {durum === 'ayrildi' && (
        <p className="bolum-aciklama">Ayrıldı olarak işaretlemek için önce aktif öğrencileri başka koça aktar.</p>
      )}
      <Uyari>{hata}</Uyari>
      <Dugme onClick={kaydet} bekliyor={bekliyor}>Kaydet</Dugme>
    </div>
  )
}

/* Öğrencileri seç → hedef koç → aktar. Koç ayrılırken ya da yük dağıtılırken. */
function Ogrencileri({ d, koclar, onAktarildi }) {
  const [secili, setSecili] = useState([])
  const [hedef, setHedef] = useState('')
  const [acik, setAcik] = useState(false)
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState('')
  const [bilgi, setBilgi] = useState('')
  const hedefler = (koclar ?? []).filter((k) => k.koc_id !== d.id && k.durum !== 'ayrildi')

  async function aktar() {
    setHata('')
    setBekliyor(true)
    const { data, error } = await supabase.rpc('yonetici_ogrenci_aktar', { p_ogrenciler: secili, p_hedef: hedef })
    setBekliyor(false)
    if (error) return setHata(hataMetni(error))
    const ad = hedefler.find((k) => k.koc_id === hedef)?.ad_soyad
    setBilgi(`${data} öğrenci ${ad ?? 'yeni koça'} aktarıldı.`)
    setSecili([])
    setAcik(false)
    await onAktarildi()
  }

  return (
    <Bolum
      cizgili
      baslik="Öğrencileri"
      sayi={d.ogrenciler.length || null}
      eylem={d.ogrenciler.length ? (acik ? 'Vazgeç' : 'Aktar') : null}
      onEylem={() => { setAcik((v) => !v); setSecili([]) }}
    >
      <Uyari tur="bilgi">{bilgi}</Uyari>
      {d.ogrenciler.length === 0 ? (
        <BosDurum metin="Bu koçun öğrencisi yok." />
      ) : (
        <ul className="liste koc-ogrenciler">
          {d.ogrenciler.map((o) => (
            <li key={o.id} className="liste-satir">
              {acik ? (
                <label className="onay koc-ogrenci-sec">
                  <input
                    type="checkbox"
                    checked={secili.includes(o.id)}
                    onChange={() => setSecili((s) => (s.includes(o.id) ? s.filter((x) => x !== o.id) : [...s, o.id]))}
                  />
                  <span>{o.ad}</span>
                </label>
              ) : (
                <div>
                  <span className="liste-ad">{o.ad}</span>
                  <span className="liste-alt">
                    {o.sinif ? (o.sinif === 13 ? 'Mezun' : `${o.sinif}. sınıf`) : '—'}
                    {o.kayit ? ` · kayıt ${tarih(o.kayit)}` : ''}
                  </span>
                </div>
              )}
              {!o.aktif && <span className="durum-yazi" data-durum="sonuk">pasif</span>}
            </li>
          ))}
        </ul>
      )}
      {acik && (
        <div className="form-kutu form-kutu--duz">
          <Alan etiket="Hangi koça" ipucu={`${secili.length} öğrenci seçili`}>
            <select value={hedef} onChange={(e) => setHedef(e.target.value)}>
              <option value="">Koç seç</option>
              {hedefler.map((k) => (
                <option key={k.koc_id} value={k.koc_id}>
                  {k.ad_soyad}{k.kapasite ? ` (${k.ogrenci_sayisi}/${k.kapasite})` : ''}
                </option>
              ))}
            </select>
          </Alan>
          <p className="bolum-aciklama">Görevleri, denemeleri, notları ve ödeme planı da yeni koça geçer; eski koç erişimi hemen kaybeder.</p>
          <Uyari>{hata}</Uyari>
          <EylemDugmesi ikon="ok" onClick={aktar} disabled={!hedef || secili.length === 0 || bekliyor}>
            {bekliyor ? 'Aktarılıyor…' : `${secili.length} öğrenciyi aktar`}
          </EylemDugmesi>
        </div>
      )}
    </Bolum>
  )
}

/* Koçu tamamen kaldırma: yalnız öğrencisi kalmamışsa. Ayrılan koç için
   önce "Ayrıldı" durumu önerilir; kayıt tarihçe olarak kalır. */
function Kaldir({ d, onKaldirildi }) {
  const [acik, setAcik] = useState(false)
  const [yazilan, setYazilan] = useState('')
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState('')
  const ogrenciVar = d.ogrenciler.length > 0

  async function sil() {
    setHata('')
    setBekliyor(true)
    try {
      await kullaniciSil(d.id)
      onKaldirildi()
    } catch (e) {
      setHata(e.message ?? 'Silinemedi.')
      setBekliyor(false)
    }
  }

  return (
    <Bolum cizgili baslik="Tehlikeli bölge" sinif="tehlike-bolum">
      <p className="bolum-aciklama">
        {ogrenciVar
          ? 'Koçun öğrencisi varken hesabı silinemez. Ayrılan koç için durumu “Ayrıldı” yapmak kaydı korur.'
          : 'Koç ayrıldıysa durumu “Ayrıldı” yapmak yeterli; silmek geri alınamaz.'}
      </p>
      {!ogrenciVar && !acik && (
        <button type="button" className="tehlike-yazi-dugme" onClick={() => setAcik(true)}>Koç hesabını sil</button>
      )}
      {acik && (
        <div className="form-kutu form-kutu--duz">
          <Alan etiket="Onaylamak için koçun adını yaz" ipucu={d.ad_soyad}>
            <input value={yazilan} onChange={(e) => setYazilan(e.target.value)} autoComplete="off" />
          </Alan>
          <Uyari>{hata}</Uyari>
          <button
            type="button"
            className="dugme dugme--tehlike"
            disabled={bekliyor || yazilan.trim().toLocaleLowerCase('tr') !== d.ad_soyad.trim().toLocaleLowerCase('tr')}
            onClick={sil}
          >
            {bekliyor ? 'Siliniyor…' : 'Kalıcı olarak sil'}
          </button>
        </div>
      )}
    </Bolum>
  )
}
