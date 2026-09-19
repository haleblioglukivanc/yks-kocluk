import { useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Bos, Uyari } from './Ortak.jsx'

/* Kataloğu olmayan öğrencide "iş ekle", program ve konu yolu boş kalıyordu;
   koç "Kayıt sekmesine git, düzenle, seç" yolunu bilmek zorundaydı
   (Bekir telefonda takıldı, 19 Eylül 2026). Artık boş durumun içinde
   seçiliyor; seçim öğrencinin kaydına yazılır, Kayıt'tan değiştirilebilir.

   Seçimden sonra 'ogrenci-guncellendi' olayı yayılır; OgrenciDetay öğrenciyi
   yeniden yükler, açık olan form kataloğuyla kendiliğinden devam eder. */

export const OGRENCI_GUNCELLENDI = 'ogrenci-guncellendi'

export default function KatalogSec({ ogrenciId }) {
  const [kataloglar, setKataloglar] = useState(null)
  const [bekleyen, setBekleyen] = useState(null)
  const [hata, setHata] = useState('')

  useEffect(() => {
    supabase
      .from('kataloglar')
      .select('id, ad')
      .is('koc_id', null)
      .order('sira')
      .then(({ data }) => setKataloglar(data ?? []))
  }, [])

  async function sec(id) {
    if (bekleyen) return
    setBekleyen(id)
    setHata('')
    const { error } = await supabase.from('ogrenciler').update({ katalog_id: id }).eq('id', ogrenciId)
    if (error) {
      setHata(hataMetni(error))
      setBekleyen(null)
      return
    }
    window.dispatchEvent(new CustomEvent(OGRENCI_GUNCELLENDI, { detail: ogrenciId }))
  }

  return (
    <Bos
      ruh={null}
      baslik="Önce sınav türünü seç"
      aciklama="Dersler ve konular bu seçime göre gelir. Sonra Kayıt'tan değiştirebilirsin."
    >
      <Uyari>{hata}</Uyari>
      <div className="katalog-sec">
        {(kataloglar ?? []).map((k) => (
          <button
            key={k.id}
            type="button"
            className="dugme dugme--ikincil"
            disabled={Boolean(bekleyen)}
            onClick={() => sec(k.id)}
          >
            {bekleyen === k.id ? 'Bir saniye…' : k.ad}
          </button>
        ))}
      </div>
    </Bos>
  )
}
