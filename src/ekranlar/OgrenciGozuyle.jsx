import { useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Kart, Uyari, Yukleniyor } from '../bilesenler/Ortak.jsx'
import ProgramIzgarasi from '../bilesenler/ProgramIzgarasi.jsx'
import GunHedefleri from '../bilesenler/GunHedefleri.jsx'
import GunlukRutinler from '../bilesenler/GunlukRutinler.jsx'
import BugunCozulen from '../bilesenler/BugunCozulen.jsx'
import DenemePaneli from '../bilesenler/DenemePaneli.jsx'
import Rozetlerim from './Rozetlerim.jsx'

/* Koçun "öğrenci ne görüyor" sorusuna cevabı. Salt okunur:
   buradan hiçbir şey değiştirilemez, yanlışlıkla öğrenci adına
   görev tamamlanmasın diye. */

export default function OgrenciGozuyle({ ogrenciId, onGeri }) {
  const [ogrenci, setOgrenci] = useState(null)
  const [gun, setGun] = useState(null)
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
        /* Öğrencinin kendi ekranıyla aynı veri, aynı gün hesabı: tarihi
           cihazdan değil sunucudan alıyoruz ki iki ekran ayrışmasın. */
        supabase.rpc('ogrenci_gunluk_ozet', { p_ogrenci: ogrenciId }),
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
      else if (g.error) setHata(hataMetni(g.error))
      setOgrenci(o.data)
      setGun(g.data ?? null)
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

  return (
    <div className="panel">
      <button className="metin-dugme geri-dugme" onClick={onGeri}>← Öğrenci listesi</button>

      <div className="gozuyle-serit">
        <strong>Öğrenci gözüyle</strong>
        <span>
          {ogrenci.profiller?.ad_soyad} bu ekranı böyle görüyor. Buradan değişiklik yapılamaz.
        </span>
      </div>

      {gun === null ? (
        <Yukleniyor />
      ) : (
        <>
          <GunHedefleri gorevler={gun.gorevler} saltOkunur />
          <GunlukRutinler
            ogrenciId={ogrenciId}
            rutinler={gun.rutinler}
            haftaBasi={gun.haftaBasi}
            bugun={gun.bugun}
            saltOkunur
          />
          <BugunCozulen
            ogrenciId={ogrenciId}
            kayitlar={gun.bugunSoru}
            tarih={gun.bugun}
            saltOkunur
          />
        </>
      )}

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

      <DenemePaneli ogrenciId={ogrenciId} />

      <Kart baslik="Haftalık programı" altBaslik="Öğrencinin gördüğü hâliyle">
        <ProgramIzgarasi ogrenci={ogrenci} duzenlenebilir={false} saltOkunur />
      </Kart>

      <Rozetlerim ogrenciId={ogrenciId} />
    </div>
  )
}
