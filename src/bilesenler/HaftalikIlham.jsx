import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

/* ═══════════════════════════════════════════════════════════════
   Haftanın kitabı + haftanın sözü

   Tek bileşen üç yerde çalışır: öğrenci paneli (Bugün sekmesinin
   sonu), veli paneli ve tanıtım sayfası. Renkler --yuzey / --cizgi /
   --murekkep üzerinden okunur; koyu panelde `.uygulama` bu
   değişkenleri yeniden tanımladığı için ayrı bir koyu sürüm yazmaya
   gerek yok — bir düzelttiğimizde hepsi bir anda düzelir.

   Seçimi sunucu yapar: koçun o hafta öğrenci için onayladığı kitap/söz
   varsa o gelir (ogrenci_ilham), yoksa ISO hafta numarasından herkes için
   aynı genel seçim. Veli ve tanıtım yalnız genel seçimi görür.
   ═══════════════════════════════════════════════════════════════ */

/** Toplam okuma süresini "günde 15 dk ile kaç gün" hâline çevirir. */
const gunSayisi = (dakika, gunluk = 15) => Math.max(1, Math.round((dakika ?? 0) / gunluk))

const UZUNLUK = {
  tek_oturusta: 'Tek oturuşta biter',
  kisa: 'Kısa',
  orta: 'Orta uzunlukta',
  uzun: 'Uzun',
}

function uzunlukEtiketi(etiketler) {
  const e = etiketler ?? []
  if (e.includes('tek_oturusta')) return UZUNLUK.tek_oturusta
  for (const k of ['kisa', 'orta', 'uzun']) if (e.includes(k)) return UZUNLUK[k]
  return null
}

/* goster: 'hepsi' | 'kitap' | 'soz'. Öğrencide ikisi Bugün'ün sonunda: söz,
   altında okuduğu kitap. Kitap haftaya değil öğrenciye bağlı; "Bitirdim"
   deyene kadar aynı kalır (ogrenci_okuma). Veli, rapor ve tanıtım genel
   seçimi görür. */
export default function HaftalikIlham({ goster = 'hepsi', ogrenciId = null, bitirilebilir = false, kisa = false }) {
  const [acik, setAcik] = useState(false)
  const [veri, setVeri] = useState(null)
  const [tur, setTur] = useState(0)
  const [bekliyor, setBekliyor] = useState(false)
  const [haber, setHaber] = useState('')
  const [ilerleme, setIlerleme] = useState(null)
  const [puanlanacak, setPuanlanacak] = useState(null) // { id, ad }
  const [puan, setPuan] = useState(0)

  /* Öğrenci "Bitirdim" der: kitap geçmişe yazılır, sıradaki kitap sunucuda
     atanır, koça haber gider. Yeni kitap aynı kutuda yerini alır. */
  async function bitir() {
    if (!veri?.kitap_id) return
    setBekliyor(true)
    const { data, error } = await supabase.rpc('ogrenci_kitap_bitir', { p_kitap_id: veri.kitap_id })
    setBekliyor(false)
    if (error) {
      setHaber('Kaydedilemedi, birazdan tekrar dene.')
      return
    }
    setHaber(`${data?.biten ?? 'Kitap'} bitti · koçuna haber verildi`)
    setPuanlanacak({ id: veri.kitap_id, ad: data?.biten ?? veri.kitap_ad })
    setPuan(0)
    setTur((t) => t + 1)
    window.dispatchEvent(new CustomEvent('okuma-degisti'))
  }

  /* Bitirdikten sonra isteğe bağlı yıldız; atlanırsa hiçbir şey olmaz. */
  async function puanla(v) {
    if (!puanlanacak) return
    setPuan(v)
    const { error } = await supabase.rpc('ogrenci_kitap_puanla', { p_kitap_id: puanlanacak.id, p_puan: v })
    if (!error) window.dispatchEvent(new CustomEvent('okuma-degisti'))
  }

  /* Okunan sayfa (Günü tamamla'da girilir) kutuda ilerleme olarak görünür. */
  useEffect(() => {
    if (!ogrenciId) return undefined
    const yukle = () =>
      supabase.rpc('ogrenci_okuma_ozeti', { p_ogrenci: ogrenciId }).then(({ data }) => setIlerleme(data?.simdiki ?? null))
    yukle()
    window.addEventListener('okuma-degisti', yukle)
    return () => window.removeEventListener('okuma-degisti', yukle)
  }, [ogrenciId, tur])

  useEffect(() => {
    let iptal = false
    ;(async () => {
      const { data, error } = await supabase.rpc(
        'haftalik_ilham',
        ogrenciId ? { p_ogrenci: ogrenciId } : {},
      )
      if (iptal || error) return
      if (data && data.length) setVeri(data[0])
    })()
    return () => {
      iptal = true
    }
  }, [ogrenciId, tur])

  /* Veri gelmeden hiç yer kaplamıyoruz. İskelet gösterip sonra
     kaybolmak sayfayı zıplatır; bu kutu kritik bilgi değil, sessizce
     gelsin. */
  if (!veri) return null

  const okunan = ilerleme && ilerleme.kitap_id === veri.kitap_id ? ilerleme.okunan ?? 0 : 0
  const sayfa = veri.kitap_sayfa ?? 0
  const bittiGibi = sayfa > 0 && okunan >= sayfa

  const uzunluk = uzunlukEtiketi(veri.kitap_etiket)

  /* Ana ekranda tek satır (22 Eylül 2026): kapak, "Bu haftanın kitabı", ad;
     dokununca söz ve kitabın tamamı açılır. */
  /* Ana ekranda iki kısa satır (Bekir, 22 Eylül 2026): haftanın kitabı ve
     haftanın sözü. Kitabın iç ayrıntısı yok; kitap satırına dokununca
     kitabın tamamı (Bitirdim dahil) açılır. */
  if (kisa && !acik) {
    return (
      <div className="hi-kisa-kap">
        <button type="button" className="hi-kisa" onClick={() => setAcik(true)} aria-label={`Bu haftanın kitabı: ${veri.kitap_ad}. Ayrıntıyı aç`}>
          {veri.kitap_kapak_url ? <img className="hi-kisa-kapak" src={veri.kitap_kapak_url} alt="" loading="lazy" /> : <span className="hi-kisa-kapak hi-kisa-kapak--bos" aria-hidden="true" />}
          <span className="hi-kisa-yazi"><small>Haftanın kitabı</small>{veri.kitap_ad}</span>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
        </button>
        {veri.soz_metin && (
          <div className="hi-kisa hi-kisa--soz">
            <span className="hi-kisa-tirnak" aria-hidden="true">“</span>
            <span className="hi-kisa-yazi"><small>Haftanın sözü{veri.soz_kaynak ? ` · ${veri.soz_kaynak}` : ''}</small>{veri.soz_metin}</span>
          </div>
        )}
      </div>
    )
  }


  return (
    <section className="haftalik-ilham" aria-label="Haftanın kitabı ve sözü">
      {/* Söz önce, kitap altında (Bekir, 19 Eylül 2026). */}
      {goster !== 'kitap' && veri.soz_metin && (
        <article className="hi-kutu hi-kutu--soz">
          <span className="hi-em" aria-hidden="true">
            {veri.soz_emoji}
          </span>
          <div className="hi-govde">
            <p className="hi-etiket">Haftanın sözü</p>
            <blockquote className="hi-soz">{veri.soz_metin}</blockquote>
            {/* Kaynak yalnızca atfı doğrulanmışsa geliyor; sunucu
                doğrulanmamış sözlerde null döndürüyor. */}
            {veri.soz_kaynak && <cite className="hi-kaynak">{veri.soz_kaynak}</cite>}
          </div>
        </article>
      )}
      {goster !== 'soz' && veri.kitap_ad && (
        <article className="hi-kutu hi-kutu--kitap">
          <span className="hi-em" aria-hidden="true">
            {veri.kitap_emoji}
          </span>
          <div className="hi-govde">
            <p className="hi-etiket">{ogrenciId ? 'Okuduğun kitap' : 'Haftanın kitabı'}</p>

            {veri.kitap_kapak_url && (
              <img className="hi-kapak" src={veri.kitap_kapak_url} alt="" loading="lazy" />
            )}

            <h3 className="hi-ad">{veri.kitap_ad}</h3>
            <p className="hi-yazar">
              {veri.kitap_yazar}
              {veri.kitap_yil ? ` · ${veri.kitap_yil}` : ''}
            </p>

            <p className="hi-neden">{veri.kitap_neden}</p>

            {veri.kitap_alinti && <blockquote className="hi-alinti">{veri.kitap_alinti}</blockquote>}

            <div className="hi-rozetler">
              {uzunluk && <span className="hi-rozet">{uzunluk}</span>}
              {veri.kitap_sayfa > 0 && <span className="hi-rozet">{veri.kitap_sayfa} sayfa</span>}
              {veri.kitap_sure_dk > 0 && (
                <span className="hi-rozet">
                  günde 15 dk ile ~{gunSayisi(veri.kitap_sure_dk)} gün
                </span>
              )}
            </div>

            {ogrenciId && okunan > 0 && (
              <div className="hi-ilerleme" aria-label={`${okunan} / ${sayfa} sayfa okundu`}>
                <div className="hi-cubuk">
                  <i style={{ width: `${sayfa ? Math.min(100, Math.round((okunan / sayfa) * 100)) : 0}%` }} />
                </div>
                <small>
                  {sayfa ? `${Math.min(okunan, sayfa)}/${sayfa} sayfa` : `${okunan} sayfa`}
                </small>
              </div>
            )}

            {bitirilebilir && (
              <button
                className={`dugme ${bittiGibi ? 'dugme--birincil' : 'dugme--ikincil'} hi-bitir`}
                disabled={bekliyor}
                onClick={bitir}
              >
                {bekliyor ? 'Bir saniye…' : 'Bitirdim'}
              </button>
            )}
            {haber && <p className="hi-haber" role="status">{haber}</p>}
            {bitirilebilir && puanlanacak && (
              <div className="hi-puan">
                <span>{puanlanacak.ad} nasıldı?</span>
                <span className="hi-yildizlar" role="group" aria-label="Kitaba puan ver">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <button
                      key={v}
                      className={v <= puan ? 'hi-yildiz hi-yildiz--dolu' : 'hi-yildiz'}
                      aria-label={`${v} yıldız`}
                      aria-pressed={v <= puan}
                      onClick={() => puanla(v)}
                    >
                      ★
                    </button>
                  ))}
                </span>
              </div>
            )}
          </div>
        </article>
      )}

    </section>
  )
}
