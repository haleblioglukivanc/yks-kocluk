import { useCallback, useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { ogrenciVerisiniIndir } from '../lib/disaAktar.js'
import { Alan, Dugme, Uyari, Yukleniyor } from './Ortak.jsx'
import Bolum from '../ortak/Bolum.jsx'
import BosDurum from '../ortak/BosDurum.jsx'
import EylemDugmesi from '../ortak/EylemDugmesi.jsx'

/**
 * KVKK talepleri: kişi verisini görmek/indirmek, silinmesini, düzeltilmesini
 * ya da iznini geri çekmek isteyenlerin izi. Talep elle kaydedilir (telefon,
 * e-posta, dilekçe…); sonuçlanınca kapatılır. Dışa aktarma talebinde öğrenci
 * seçiliyse veri buradan JSON olarak indirilir.
 */
const TUR = {
  disa_aktarma: 'Verimi görmek / indirmek',
  silme: 'Verimin silinmesi',
  duzeltme: 'Düzeltme',
  izin_geri_cekme: 'İzni geri çekme',
  bilgi: 'Bilgi talebi',
  diger: 'Diğer',
}
const KANAL = { telefon: 'Telefon', eposta: 'E-posta', whatsapp: 'WhatsApp', yuz_yuze: 'Yüz yüze', dilekce: 'Dilekçe', diger: 'Diğer' }
const DURUM = { acik: ['izle', 'Açık'], tamamlandi: ['iyi', 'Tamamlandı'], reddedildi: ['sonuk', 'Reddedildi'] }

export default function KvkkTalepleri({ ogrenciler }) {
  const [liste, setListe] = useState(null)
  const [form, setForm] = useState(false)
  const [hata, setHata] = useState('')

  const yukle = useCallback(async () => {
    const { data, error } = await supabase
      .from('kvkk_talepleri')
      .select('id, olusturuldu, tur, kisi_ad, ogrenci_id, kanal, not_metni, durum, sonuclandi, sonuc_notu')
      .order('olusturuldu', { ascending: false })
      .limit(100)
    if (error) setHata(hataMetni(error))
    setListe(data ?? [])
  }, [])
  useEffect(() => {
    yukle()
  }, [yukle])

  async function sonuclandir(id, durum) {
    const { error } = await supabase.from('kvkk_talepleri').update({ durum, sonuclandi: new Date().toISOString() }).eq('id', id)
    if (error) setHata(hataMetni(error))
    else yukle()
  }

  async function indir(ogrenciId) {
    setHata('')
    try {
      await ogrenciVerisiniIndir(ogrenciId)
    } catch (e) {
      setHata(hataMetni(e))
    }
  }

  const ogrAd = (id) => ogrenciler?.find((o) => o.ogrenciId === id)?.ad
  return (
    <Bolum
      cizgili
      baslik="KVKK talepleri"
      sayi={liste?.filter((t) => t.durum === 'acik').length || null}
      aciklama="Veri görme, silme, düzeltme ve izin geri çekme talepleri. Yasal süre 30 gün."
      eylem={form ? 'Kapat' : '+ Talep kaydet'}
      onEylem={() => setForm((f) => !f)}
    >
      <Uyari>{hata}</Uyari>
      {form && <TalepFormu ogrenciler={ogrenciler} onKaydedildi={() => { setForm(false); yukle() }} />}
      {liste === null ? (
        <Yukleniyor />
      ) : liste.length === 0 ? (
        <BosDurum metin="Kayıtlı talep yok." />
      ) : (
        <ul className="liste">
          {liste.map((t) => {
            const gun = Math.floor((Date.now() - new Date(t.olusturuldu)) / 86400000)
            return (
              <li key={t.id} className="liste-satir kvkk-satir">
                <div>
                  <span className="liste-ad">{TUR[t.tur]} · {t.kisi_ad}</span>
                  <span className="liste-alt">
                    {new Date(t.olusturuldu).toLocaleDateString('tr-TR')} · {KANAL[t.kanal] ?? '—'}
                    {t.ogrenci_id ? ` · ${ogrAd(t.ogrenci_id) ?? 'öğrenci'}` : ''}
                    {t.durum === 'acik' ? ` · ${gun} gün oldu` : ''}
                    {t.not_metni ? ` · ${t.not_metni}` : ''}
                  </span>
                  {t.durum === 'acik' && (
                    <div className="kvkk-eylem">
                      {t.tur === 'disa_aktarma' && t.ogrenci_id && (
                        <EylemDugmesi ikon="kopya" onClick={() => indir(t.ogrenci_id)}>Veriyi indir</EylemDugmesi>
                      )}
                      <EylemDugmesi ikon="ok" onClick={() => sonuclandir(t.id, 'tamamlandi')}>Tamamlandı</EylemDugmesi>
                      <button type="button" className="metin-dugme" onClick={() => sonuclandir(t.id, 'reddedildi')}>Reddet</button>
                    </div>
                  )}
                </div>
                <span className="durum-yazi" data-durum={t.durum === 'acik' && gun >= 25 ? 'uyari' : DURUM[t.durum][0]}>
                  ● {DURUM[t.durum][1]}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </Bolum>
  )
}

function TalepFormu({ ogrenciler, onKaydedildi }) {
  const [tur, setTur] = useState('disa_aktarma')
  const [kisi, setKisi] = useState('')
  const [ogrenci, setOgrenci] = useState('')
  const [kanal, setKanal] = useState('telefon')
  const [not, setNot] = useState('')
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState('')

  async function kaydet() {
    setHata('')
    if (kisi.trim().length < 2) return setHata('Talep eden kişinin adını yaz.')
    setBekliyor(true)
    const { data: u } = await supabase.auth.getUser()
    const { error } = await supabase.from('kvkk_talepleri').insert({
      tur, kisi_ad: kisi.trim(), ogrenci_id: ogrenci || null, kanal, not_metni: not.trim() || null,
      kaydeden_id: u?.user?.id ?? null,
    })
    setBekliyor(false)
    if (error) return setHata(hataMetni(error))
    onKaydedildi()
  }

  return (
    <div className="form-kutu form-kutu--duz">
      <Alan etiket="Talep">
        <select value={tur} onChange={(e) => setTur(e.target.value)}>
          {Object.entries(TUR).map(([k, a]) => <option key={k} value={k}>{a}</option>)}
        </select>
      </Alan>
      <Alan etiket="Talep eden" ipucu="Örn. Ayşe Yılmaz (veli)">
        <input value={kisi} onChange={(e) => setKisi(e.target.value)} />
      </Alan>
      <div className="alan-ikili">
        <Alan etiket="İlgili öğrenci" ipucu="İsteğe bağlı">
          <select value={ogrenci} onChange={(e) => setOgrenci(e.target.value)}>
            <option value="">—</option>
            {(ogrenciler ?? []).map((o) => <option key={o.ogrenciId} value={o.ogrenciId}>{o.ad}</option>)}
          </select>
        </Alan>
        <Alan etiket="Kanal">
          <select value={kanal} onChange={(e) => setKanal(e.target.value)}>
            {Object.entries(KANAL).map(([k, a]) => <option key={k} value={k}>{a}</option>)}
          </select>
        </Alan>
      </div>
      <Alan etiket="Not" ipucu="İsteğe bağlı">
        <textarea rows={2} value={not} onChange={(e) => setNot(e.target.value)} />
      </Alan>
      <Uyari>{hata}</Uyari>
      <Dugme onClick={kaydet} bekliyor={bekliyor}>Talebi kaydet</Dugme>
    </div>
  )
}
