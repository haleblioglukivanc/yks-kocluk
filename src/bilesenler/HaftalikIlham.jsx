import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

/* ═══════════════════════════════════════════════════════════════
   Haftanın kitabı + haftanın sözü

   Tek bileşen üç yerde çalışır: öğrenci paneli (Bugün sekmesinin
   sonu), veli paneli ve tanıtım sayfası. Renkler --yuzey / --cizgi /
   --murekkep üzerinden okunur; koyu panelde `.uygulama` bu
   değişkenleri yeniden tanımladığı için ayrı bir koyu sürüm yazmaya
   gerek yok — bir düzelttiğimizde hepsi bir anda düzelir.

   Seçimi sunucu yapar: public.haftalik_ilham() ISO hafta numarasından
   deterministik olarak seçer, yani sayfa yenilendiğinde değişmez ve
   bütün öğrenciler aynı haftada aynı şeyi görür.
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

export default function HaftalikIlham() {
  const [veri, setVeri] = useState(null)

  useEffect(() => {
    let iptal = false
    ;(async () => {
      const { data, error } = await supabase.rpc('haftalik_ilham')
      if (iptal || error) return
      if (data && data.length) setVeri(data[0])
    })()
    return () => {
      iptal = true
    }
  }, [])

  /* Veri gelmeden hiç yer kaplamıyoruz. İskelet gösterip sonra
     kaybolmak sayfayı zıplatır; bu kutu kritik bilgi değil, sessizce
     gelsin. */
  if (!veri) return null

  const uzunluk = uzunlukEtiketi(veri.kitap_etiket)

  return (
    <section className="haftalik-ilham" aria-label="Haftanın kitabı ve sözü">
      {veri.kitap_ad && (
        <article className="hi-kutu hi-kutu--kitap">
          <span className="hi-em" aria-hidden="true">
            {veri.kitap_emoji}
          </span>
          <div className="hi-govde">
            <p className="hi-etiket">Haftanın kitabı</p>

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
          </div>
        </article>
      )}

      {veri.soz_metin && (
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
    </section>
  )
}
