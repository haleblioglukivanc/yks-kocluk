import { useCallback, useEffect, useState } from 'react'
import { useMaskotDevrildiMi } from '../lib/maskotNobeti.js'
import { supabase } from '../lib/supabase.js'
import Kalem, { KALEM_ADI } from './Kalem.jsx'
import { kalemiCalistir, kalemiKapat } from '../lib/kalemMotoru.js'

/**
 * Kâmil ekranın sağ alt köşesinde durur.
 * Söyleyecek sözü varsa balonu açık gelir; kapatınca karakter kalır,
 * ona dokununca son sözünü tekrar gösterir.
 */

const KOC_ROLLERI = ['koc', 'yonetici']

// Boşta beklerken ruh hâli çok yavaş dönsün: canlı dursun ama
// göz ucuyla bakan birini rahatsız etmesin.
const BOSTA = ['bekliyor', 'bekliyor', 'bekliyor', 'dusunuyor', 'bekliyor', 'sasirdi']

export default function KalemKosede({ profil }) {
  const ekrandaMaskotVar = useMaskotDevrildiMi()
  const [olay, setOlay] = useState(null)
  const [acik, setAcik] = useState(false)
  const [bostaRuh, setBostaRuh] = useState('bekliyor')

  const yukle = useCallback(async () => {
    if (!profil?.id) return
    /* Ekranda zaten bir Kâmil varsa buradan hiç sorgu atma: yoksa kural
       motoru ikinci kez çalışıp kalem_olaylari'na çift kayıt atıyor ve
       gunluk_limit tek girişte tükeniyor. */
    if (ekrandaMaskotVar) return
    const kocMu = KOC_ROLLERI.includes(profil.rol)

    let veri = null
    if (kocMu) {
      const { data } = await supabase.rpc('koc_panel_ozeti')
      if (!data) return
      veri = {
        toplamOgrenci: data.toplamOgrenci ?? 0,
        aktifOgrenci: data.aktifOgrenci ?? 0,
        riskliOgrenciler: data.riskliOgrenciler ?? [],
        bekleyenVeliOzeti: data.bekleyenVeliOzeti ?? 0,
        okunmamisMesaj: data.okunmamisMesaj ?? 0,
        buHaftaGirilenDeneme: data.buHaftaGirilenDeneme ?? 0,
        sinifNetDegisimi: data.sinifNetDegisimi,
        yeniSeriKuranlar: data.yeniSeriKuranlar ?? [],
      }
    } else if (profil.rol === 'ogrenci') {
      const { data } = await supabase.rpc('ogrenci_bugun_ozeti')
      if (!data) return
      veri = data
    } else {
      const { data } = await supabase.rpc('veli_ozetim')
      const ilk = (data ?? [])[0]
      veri = { yeniOzetVarMi: Boolean(ilk), ogrenciAdi: ilk?.ogrenciAdi ?? '' }
    }

    const olaylar = await kalemiCalistir({
      profilId: profil.id,
      rol: kocMu ? 'koc' : profil.rol,
      ad: profil.ad_soyad,
      veri,
    })

    if (olaylar.length) {
      setOlay(olaylar[0])
      setAcik(true)
    }
  }, [profil?.id, profil?.rol, profil?.ad_soyad, ekrandaMaskotVar])

  useEffect(() => {
    yukle()
  }, [yukle])

  // Boşta hafif ruh hâli değişimi
  useEffect(() => {
    if (acik) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let n = 0
    const t = setInterval(() => {
      n = (n + 1) % BOSTA.length
      setBostaRuh(BOSTA[n])
    }, 9000)
    return () => clearInterval(t)
  }, [acik])

  /* Konu yolu gibi ekranlar Kâmil'i kendi içinde gösteriyor; köşedeki
     kopya orada fazlalık olur. */
  if (!profil || ekrandaMaskotVar) return null

  const ruh = acik && olay ? olay.ruh : bostaRuh

  function kapat() {
    kalemiKapat(olay)
    setAcik(false)
  }

  return (
    <div className="kalem-kose">
      {acik && olay && (
        <div className="kalem-kabarcik" role="status" aria-live="polite">
          <p className="kalem-kabarcik-ad">{KALEM_ADI}</p>
          <p className="kalem-kabarcik-metin">{olay.mesaj}</p>
          <button className="kalem-kabarcik-kapat" onClick={kapat}>
            Tamam
          </button>
        </div>
      )}

      <button
        className="kalem-tetik"
        aria-label={acik ? `${KALEM_ADI} konuşuyor` : `${KALEM_ADI} ile konuş`}
        aria-expanded={acik}
        onClick={() => setAcik((a) => !a)}
      >
        <Kalem ruh={ruh} boyut={58} />
      </button>
    </div>
  )
}
