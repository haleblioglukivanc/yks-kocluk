import { useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Bos, Kart, Uyari, Yukleniyor } from '../bilesenler/Ortak.jsx'
import ProgramIzgarasi from '../bilesenler/ProgramIzgarasi.jsx'
import Rozetlerim from './Rozetlerim.jsx'

/* Koçun "öğrenci ne görüyor" sorusuna cevabı. Salt okunur:
   buradan hiçbir şey değiştirilemez, yanlışlıkla öğrenci adına
   görev tamamlanmasın diye. */

const TUR_ETIKET = {
  konu_anlatimi: 'Konu',
  soru_cozumu: 'Soru',
  tekrar: 'Tekrar',
  deneme: 'Deneme',
  okuma: 'Okuma',
  diger: 'Diğer',
}

const bugunAnahtari = () => new Date().toLocaleDateString('sv-SE')

export default function OgrenciGozuyle({ ogrenciId, onGeri }) {
  const [ogrenci, setOgrenci] = useState(null)
  const [gorevler, setGorevler] = useState(null)
  const [notlar, setNotlar] = useState([])
  const [hata, setHata] = useState('')

  useEffect(() => {
    let iptal = false
    ;(async () => {
      const [o, g, n] = await Promise.all([
        supabase
          .from('ogrenciler')
          .select('id, katalog_id, profiller!ogrenciler_id_fkey(ad_soyad)')
          .eq('id', ogrenciId)
          .maybeSingle(),
        supabase
          .from('gorevler')
          .select('id, baslik, tur, durum, hedef_adet, yapilan_adet, aciklama, dersler(ad)')
          .eq('ogrenci_id', ogrenciId)
          .eq('tarih', bugunAnahtari())
          .order('periyot', { nullsFirst: false }),
        supabase
          .from('koc_notlari')
          .select('id, icerik, olusturuldu')
          .eq('ogrenci_id', ogrenciId)
          .in('gorunurluk', ['ogrenci', 'veli'])
          .order('olusturuldu', { ascending: false })
          .limit(5),
      ])
      if (iptal) return
      if (o.error) setHata(hataMetni(o.error))
      setOgrenci(o.data)
      setGorevler(g.data ?? [])
      setNotlar(n.data ?? [])
    })()
    return () => {
      iptal = true
    }
  }, [ogrenciId])

  if (hata) {
    return (
      <Kart baslik="Açılmadı">
        <Uyari>{hata}</Uyari>
      </Kart>
    )
  }

  if (!ogrenci) return <Yukleniyor />

  const biten = (gorevler ?? []).filter((g) => g.durum === 'tamamlandi').length

  return (
    <div className="panel">
      <button className="metin-dugme geri-dugme" onClick={onGeri}>← Öğrenci listesi</button>

      <div className="gozuyle-serit">
        <strong>Öğrenci gözüyle</strong>
        <span>
          {ogrenci.profiller?.ad_soyad} bu ekranı böyle görüyor. Buradan değişiklik yapılamaz.
        </span>
      </div>

      <Kart
        baslik="Bugünün görevleri"
        altBaslik={gorevler?.length ? `${biten}/${gorevler.length} tamamlandı` : undefined}
      >
        {gorevler === null ? (
          <Yukleniyor />
        ) : gorevler.length === 0 ? (
          <Bos
            baslik="Bugün planında bir şey yok"
            aciklama="Öğrenci bugün boş bir ekran görüyor."
          />
        ) : (
          <ul className="liste">
            {gorevler.map((g) => (
              <li key={g.id} className={`liste-satir${g.durum === 'tamamlandi' ? ' gorev--bitti' : ''}`}>
                <div>
                  <span className="liste-ad">{g.baslik}</span>
                  <span className="liste-alt">
                    {[TUR_ETIKET[g.tur] ?? g.tur, g.dersler?.ad,
                      g.hedef_adet ? `${g.yapilan_adet ?? 0}/${g.hedef_adet}` : null]
                      .filter(Boolean).join(' · ')}
                  </span>
                  {g.aciklama && <span className="gorev-not">{g.aciklama}</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Kart>

      {notlar.length > 0 && (
        <Kart baslik="Öğrencinin gördüğü notların" altBaslik="Yalnızca paylaşıma açtıkların">
          <ul className="liste">
            {notlar.map((n) => (
              <li key={n.id} className="liste-satir">
                <div>
                  <span className="not-metin">{n.icerik}</span>
                  <span className="liste-alt">
                    {new Date(n.olusturuldu).toLocaleDateString('tr-TR')}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Kart>
      )}

      <Kart baslik="Haftalık programı" altBaslik="Öğrencinin gördüğü hâliyle">
        <ProgramIzgarasi ogrenci={ogrenci} duzenlenebilir={false} saltOkunur />
      </Kart>

      <Rozetlerim ogrenciId={ogrenciId} />
    </div>
  )
}
