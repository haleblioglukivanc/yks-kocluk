import { useCallback, useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Dugme, Uyari, Yukleniyor } from './Ortak.jsx'
import Bolum from '../ortak/Bolum.jsx'
import BosDurum from '../ortak/BosDurum.jsx'

/* ═══════════════════════════════════════════════════════════════
   Haftalık ilham takvimi — yalnızca koç/yönetici görür.

   Önümüzdeki haftalarda hangi kitap ve sözün çıkacağını gösterir,
   istenen haftayı elle değiştirmeye izin verir. Kayıt silinince
   o hafta otomatik rotasyona geri döner.

   Yazma yetkisini RLS veriyor (private.koc_yetkisi_var); burada
   ayrıca rol kontrolü yapmıyoruz, öğrenciye zaten bu ekran açılmıyor.
   ═══════════════════════════════════════════════════════════════ */

const tarihYaz = (t) =>
  new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' }).format(new Date(t))

export default function HaftalikTakvim() {
  const [haftalar, setHaftalar] = useState(null)
  const [kitaplar, setKitaplar] = useState([])
  const [sozler, setSozler] = useState([])
  const [acik, setAcik] = useState(null) // "yil-hafta"
  const [secim, setSecim] = useState({ kitap: '', soz: '' })
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState('')

  const yukle = useCallback(async () => {
    const { data, error } = await supabase.rpc('haftalik_ilham_takvim', { p_hafta: 12 })
    if (error) {
      setHata(hataMetni(error))
      setHaftalar([])
      return
    }
    setHaftalar(data ?? [])
  }, [])

  useEffect(() => {
    yukle()
    ;(async () => {
      const { data: k } = await supabase
        .from('haftalik_kitap')
        .select('id, ad, yazar, sayfa')
        .eq('aktif', true)
        .order('ad')
      setKitaplar(k ?? [])

      const { data: s } = await supabase
        .from('haftalik_soz')
        .select('id, metin')
        .eq('aktif', true)
        .order('sira')
      setSozler(s ?? [])
    })()
  }, [yukle])

  const ac = (h) => {
    const anahtar = `${h.iso_yil}-${h.iso_hafta}`
    if (acik === anahtar) {
      setAcik(null)
      return
    }
    setAcik(anahtar)
    setSecim({ kitap: String(h.kitap_id ?? ''), soz: String(h.soz_id ?? '') })
    setHata('')
  }

  const kaydet = async (h) => {
    setBekliyor(true)
    setHata('')
    const { error } = await supabase.rpc('haftalik_ilham_ata', {
      p_iso_yil: h.iso_yil,
      p_iso_hafta: h.iso_hafta,
      p_kitap_id: secim.kitap ? Number(secim.kitap) : null,
      p_soz_id: secim.soz ? Number(secim.soz) : null,
      p_not: null,
    })
    if (error) setHata(hataMetni(error))
    else {
      setAcik(null)
      await yukle()
    }
    setBekliyor(false)
  }

  const otomatigeDon = async (h) => {
    setBekliyor(true)
    setHata('')
    const { error } = await supabase
      .from('haftalik_program')
      .delete()
      .eq('iso_yil', h.iso_yil)
      .eq('iso_hafta', h.iso_hafta)
    if (error) setHata(hataMetni(error))
    else {
      setAcik(null)
      await yukle()
    }
    setBekliyor(false)
  }

  return (
    /* Kart değil bölüm; haftalar tek beyaz yüzeyde çizgiyle ayrılır
       (TASARIM-KURALLARI 1). Elle seçilen hafta hap değil düz yazı. */
    <Bolum
      baslik="Haftalık ilham takvimi"
      sayi={haftalar?.length || null}
      aciklama="Önümüzdeki 12 hafta. Bir haftaya dokunup kitabı ya da sözü değiştirebilirsin."
    >
      <Uyari>{hata}</Uyari>

      {haftalar === null ? (
        <Yukleniyor />
      ) : haftalar.length === 0 ? (
        <BosDurum metin="Takvim boş: kitap ve söz havuzunda aktif kayıt yok gibi görünüyor." />
      ) : (
        <ul className="liste hit-liste">
          {haftalar.map((h, i) => {
            const anahtar = `${h.iso_yil}-${h.iso_hafta}`
            const buHafta = i === 0
            return (
              <li key={anahtar} className="hit-satir">
                <button
                  type="button"
                  className="hit-bas"
                  onClick={() => ac(h)}
                  aria-expanded={acik === anahtar}
                >
                  <span className="hit-tarih">
                    {tarihYaz(h.hafta_basi)}
                    {buHafta && <em className="hit-simdi">bu hafta</em>}
                  </span>
                  <span className="hit-icerik">
                    <span className="hit-kitap">
                      <span aria-hidden="true">{h.kitap_emoji}</span> {h.kitap_ad}
                      {h.kitap_sayfa ? ` · ${h.kitap_sayfa} s.` : ''}
                    </span>
                    <span className="hit-soz">
                      <span aria-hidden="true">{h.soz_emoji}</span> {h.soz_metin}
                    </span>
                  </span>
                  {h.elle_secildi && <span className="durum-yazi" data-durum="izle">elle</span>}
                </button>

                {acik === anahtar && (
                  <div className="hit-duzen">
                    <label className="alan">
                      <span className="alan-etiket">Kitap</span>
                      <select
                        value={secim.kitap}
                        onChange={(e) => setSecim((s) => ({ ...s, kitap: e.target.value }))}
                      >
                        <option value="">Otomatik seçilsin</option>
                        {kitaplar.map((k) => (
                          <option key={k.id} value={k.id}>
                            {k.ad} — {k.yazar}
                            {k.sayfa ? ` (${k.sayfa} s.)` : ''}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="alan">
                      <span className="alan-etiket">Söz</span>
                      <select
                        value={secim.soz}
                        onChange={(e) => setSecim((s) => ({ ...s, soz: e.target.value }))}
                      >
                        <option value="">Otomatik seçilsin</option>
                        {sozler.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.metin.length > 70 ? `${s.metin.slice(0, 70)}…` : s.metin}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="hit-eylem">
                      <Dugme bekliyor={bekliyor} onClick={() => kaydet(h)}>
                        Kaydet
                      </Dugme>
                      {h.elle_secildi && (
                        <button type="button" className="metin-dugme" disabled={bekliyor} onClick={() => otomatigeDon(h)}>
                          Otomatiğe dön
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Bolum>
  )
}
