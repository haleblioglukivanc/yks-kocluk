import { useCallback, useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Bos, Dugme, Kart, Uyari, Yukleniyor } from '../bilesenler/Ortak.jsx'

/* Koç burada veliye ne gideceğine karar verir. Sayılar veriden gelir,
   yorumu koç yazar. Yayınlanana kadar veli hiçbir şey görmez. */

const TREND_YAZI = { yukseliyor: 'yükseliyor', sabit: 'sabit', dusuyor: 'düşüyor' }
const saatDakika = (dk = 0) => (dk >= 60 ? `${Math.floor(dk / 60)} sa ${dk % 60} dk` : `${dk} dk`)

// Koçun boş sayfayla karşılaşmaması için başlangıç cümlesi.
// Kopyala-yapıştır olmasın diye bilerek eksik bırakılıyor.
function taslakYorum(k) {
  if ((k.devam ?? 0) >= 80) return `${k.ad} bu hafta planına büyük ölçüde uydu. `
  if ((k.devam ?? 0) >= 50) return `${k.ad} bu hafta planının bir kısmını tamamladı. `
  return `${k.ad} bu hafta planın gerisinde kaldı. `
}

export default function VeliOzetKuyrugu() {
  const [kayitlar, setKayitlar] = useState(null)
  const [gonderilen, setGonderilen] = useState([])
  const [yorumlar, setYorumlar] = useState({})
  const [islemde, setIslemde] = useState(null)
  const [hata, setHata] = useState('')
  const [bilgi, setBilgi] = useState('')

  const yukle = useCallback(async () => {
    const { data, error } = await supabase.rpc('veli_ozet_kuyrugu')

    if (error) {
      setHata(hataMetni(error))
      setKayitlar([])
      return
    }
    const liste = data ?? []
    setKayitlar(liste)
    setYorumlar(Object.fromEntries(liste.map((k) => [k.id, k.yorum ?? taslakYorum(k)])))

    /* Kuyruk yalnızca bekleyenleri gösteriyordu; hepsi yayınlanınca ekran
       bomboş kalıyor ve "hiç veri yok" gibi okunuyordu. Son gönderilenleri
       de listeliyoruz: koç veliye ne gittiğini görebilsin. */
    const { data: g } = await supabase
      .from('veli_haftalik_ozet')
      .select('id, hafta_baslangic, koc_yorumu, yayin_zamani, ogrenci_id, ogrenciler(profiller!ogrenciler_id_fkey(ad_soyad))')
      .eq('yayinlandi', true)
      .order('yayin_zamani', { ascending: false })
      .limit(5)
    setGonderilen(g ?? [])
  }, [])

  useEffect(() => {
    yukle()
  }, [yukle])

  async function taslakUret() {
    setIslemde('uret')
    setHata('')
    setBilgi('')
    const { data, error } = await supabase.rpc('veli_ozeti_hazirla')
    setIslemde(null)
    if (error) {
      setHata(hataMetni(error))
      return
    }
    setBilgi(data > 0 ? `${data} taslak hazırlandı.` : 'Güncellenecek taslak çıkmadı.')
    await yukle()
  }

  async function yayinla(kayit) {
    const yorum = (yorumlar[kayit.id] ?? '').trim()
    if (yorum.length < 10) {
      setHata('Yayınlamadan önce birkaç cümle yaz. Veli sadece bunu görecek.')
      return
    }
    setIslemde(kayit.id)
    setHata('')
    const { error } = await supabase
      .from('veli_haftalik_ozet')
      .update({ koc_yorumu: yorum, yayinlandi: true, yayin_zamani: new Date().toISOString() })
      .eq('id', kayit.id)
    setIslemde(null)
    if (error) {
      setHata(hataMetni(error))
      return
    }
    setBilgi(`${kayit.ad} için özet yayınlandı.`)
    setKayitlar((m) => m.filter((k) => k.id !== kayit.id))
    await yukle()
  }

  return (
    <Kart
      baslik='Veli özetleri'
      altBaslik='Yayınlamadan önce veli hiçbir şey görmez'
      eylem={
        <Dugme tur='ikincil' onClick={taslakUret} bekliyor={islemde === 'uret'}>
          Bu haftayı hazırla
        </Dugme>
      }
    >
      <Uyari>{hata}</Uyari>
      <Uyari tur='bilgi'>{bilgi}</Uyari>

      {kayitlar === null ? (
        <Yukleniyor />
      ) : kayitlar.length === 0 ? (
        <Bos
          baslik={gonderilen.length ? 'Bekleyen özet yok' : 'Kuyruk boş'}
          aciklama={
            gonderilen.length
              ? 'Hazırlanan her özet veliye gönderildi. Yeni hafta için taslak üretebilirsin.'
              : 'Bu haftanın taslaklarını hazırlayarak başla.'
          }
        />
      ) : (
        kayitlar.map((k) => (
          <div key={k.id} className='ozet-kayit'>
            <span className='liste-ad'>{k.ad}</span>
            <span className='liste-alt'>
              Uyum %{k.devam ?? 0} · {saatDakika(k.dakika)} ·{' '}
              {TREND_YAZI[k.trend] ?? 'sabit'}
            </span>
            <textarea
              rows={3}
              aria-label={`${k.ad} için veliye gidecek not`}
              placeholder='İki üç cümle yeterli.'
              value={yorumlar[k.id] ?? ''}
              onChange={(e) => setYorumlar((m) => ({ ...m, [k.id]: e.target.value }))}
            />
            <Dugme onClick={() => yayinla(k)} bekliyor={islemde === k.id}>
              Veliye yayınla
            </Dugme>
          </div>
        ))
      )}

      {gonderilen.length > 0 && (
        <div className='gonderilen'>
          <h3 className='gonderilen-baslik'>Veliye gönderilenler</h3>
          {gonderilen.map((g) => (
            <div key={g.id} className='gonderilen-satir'>
              <span className='liste-ad'>{g.ogrenciler?.profiller?.ad_soyad ?? 'Öğrenci'}</span>
              <span className='liste-alt'>
                {new Date(g.hafta_baslangic).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}{' '}
                haftası
                {g.yayin_zamani
                  ? ` · ${new Date(g.yayin_zamani).toLocaleDateString('tr-TR')} tarihinde gönderildi`
                  : ''}
              </span>
              <p className='gonderilen-yorum'>{g.koc_yorumu}</p>
            </div>
          ))}
        </div>
      )}
    </Kart>
  )
}
