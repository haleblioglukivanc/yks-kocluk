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
export default function HaftalikIlham({ goster = 'hepsi', ogrenciId = null, bitirilebilir = false }) {
  const [veri, setVeri] = useState(null)
  const [tur, setTur] = useState(0)
  const [bekliyor, setBekliyor] = useState(false)
  const [haber, setHaber] = useState('')

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
    setTur((t) => t + 1)
  }

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

  const uzunluk = uzunlukEtiketi(veri.kitap_etiket)

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

            {bitirilebilir && (
              <button className="dugme dugme--ikincil hi-bitir" disabled={bekliyor} onClick={bitir}>
                {bekliyor ? 'Bir saniye…' : 'Bitirdim'}
              </button>
            )}
            {haber && <p className="hi-haber" role="status">{haber}</p>}
          </div>
        </article>
      )}

    </section>
  )
}
