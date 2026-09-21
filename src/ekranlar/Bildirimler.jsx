import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { Yukleniyor } from '../bilesenler/Ortak.jsx'
import AnaTepe from '../ortak/AnaTepe.jsx'
import { CanCizimi } from '../ortak/KapiCizimleri.jsx'

/**
 * Bildirimler: kullanıcıdan bir şey bekleyen her olay tek listede.
 *
 * Koç için okunmamış mesajlar + karar kuyruğundaki kartlar (kaybolan
 * öğrenci, konu onayı, deneme analizi, veli özeti). Öğrenci ve veli için
 * şimdilik yalnız mesajlar; koç mesajı ve rozet gibi olaylar sonraki
 * adımda buraya eklenecek. Her satıra dokununca ilgili ekrana gidilir.
 */
const TIP = {
  risk: { etiket: 'Kaybolan öğrenci', durum: 'acil' },
  konu: { etiket: 'Konu onayı', durum: 'izle' },
  analiz: { etiket: 'Deneme analizi', durum: 'izle' },
  veli_ozet: { etiket: 'Veli özeti', durum: 'izle' },
  hedef: { etiket: 'Hedef ayarı', durum: 'notr' },
}

const ikon = {
  viewBox: '0 0 24 24',
  width: 18,
  height: 18,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}
const IKON = {
  mesaj: <path d="M4 5h16v11H9l-5 4z" />,
  risk: <><circle cx="12" cy="12" r="8" /><path d="M12 8v4M12 16h.01" /></>,
  konu: <path d="M5 12l4 4 10-10" />,
  analiz: <path d="M4 18l5-6 4 3 7-9" />,
  veli_ozet: <><rect x="5" y="4" width="14" height="16" rx="2" /><path d="M8 9h8M8 13h6" /></>,
  hedef: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /></>,
}

export default function Bildirimler({ profil, onGit, tepe = null }) {
  const [liste, setListe] = useState(null)
  const kocMu = profil.rol === 'koc'

  useEffect(() => {
    let iptal = false
    ;(async () => {
      const olaylar = []
      const { data: kutu } = await supabase.rpc('mesaj_kutum')
      for (const k of kutu ?? []) {
        if ((k.okunmamis ?? 0) > 0) {
          olaylar.push({
            id: `mesaj-${k.id}`,
            tip: 'mesaj',
            durum: 'eylem',
            baslik: `${k.ad} sana yazdı`,
            alt: k.sonMesaj || `${k.okunmamis} okunmamış mesaj`,
            zaman: k.sonZaman,
            yol: `/mesajlar/${k.id}`,
            bekliyor: true,
          })
        }
      }
      /* Bildirim kuyruğu şimdiye kadar yalnızca telefona push gönderiyordu;
         uygulama içinde hiçbir yerde görünmüyordu. Push izni verilmemişse
         bildirim hiç ulaşmıyordu. Artık aynı kayıtlar burada da duruyor. */
      /* Okunmuşlar da listeleniyor. Yalnızca okunmamışları çekince ekran
         ikinci açılışta boşalıyordu: bildirim okunmuş olabilir ama yok
         olmamalı, geriye dönüp bakılabilmeli. Zil sayısı temizleniyor,
         liste duruyor; okunmuşlar soluk görünüyor. */
      const birHaftaOnce = new Date(Date.now() - 7 * 86400000).toISOString()
      const { data: kuyrukBildirim } = await supabase
        .from('bildirim_kuyrugu')
        .select('id, tip, baslik, govde, yol, olusturuldu, okundu_mu')
        .gte('olusturuldu', birHaftaOnce)
        .order('olusturuldu', { ascending: false })
        .limit(30)
      for (const b of kuyrukBildirim ?? []) {
        olaylar.push({
          id: `bildirim-${b.id}`,
          tip: b.tip,
          durum: b.okundu_mu ? 'okundu' : b.tip === 'blok_kacirildi' ? 'eylem' : 'notr',
          yeni: !b.okundu_mu,
          baslik: b.baslik,
          alt: b.govde || '',
          zaman: b.olusturuldu,
          yol: b.yol || '/',
        })
      }

      if (kocMu) {
        const { data: kuyruk } = await supabase.rpc('koc_karar_kuyrugu', { p_limit: 20 })
        for (const kart of kuyruk ?? []) {
          const t = TIP[kart.tip] ?? { etiket: kart.tip, durum: 'notr' }
          olaylar.push({
            id: `karar-${kart.tip}-${kart.ogrenci_id}`,
            tip: kart.tip,
            durum: t.durum,
            baslik: `${kart.ad} · ${t.etiket}`,
            alt: kart.baglam || kart.oneri || '',
            zaman: null,
            yol: '/yapilacaklar',
            bekliyor: true,
          })
        }
      }
      olaylar.sort((a, b) => (b.zaman ?? '') > (a.zaman ?? '') ? 1 : -1)
      if (!iptal) setListe(olaylar)

      /* Ekran açıldıysa bildirimler görülmüş sayılır; zil de temizlenir. */
      const okunmamislar = (kuyrukBildirim ?? []).filter((b) => !b.okundu_mu).map((b) => b.id)
      if (okunmamislar.length > 0) {
        await supabase.from('bildirim_kuyrugu').update({ okundu_mu: true }).in('id', okunmamislar)
      }
    })()
    return () => { iptal = true }
  }, [kocMu])

  /* Mevsimsel tasarım (22 Eylül 2026, Bekir: "aynı dille doğrudan yap"):
     ortak sahneli tepe, sağda direğe asılı çan (üstünde bekleyen sayısı).
     Liste ikiye ayrılır: senden bir şey bekleyenler (okunmamış mesaj,
     karar kartı) ve son 7 günün bildirimleri (okunmuşlar soluk). */
  const bekleyen = (liste ?? []).filter((o) => o.bekliyor)
  const gecmis = (liste ?? []).filter((o) => !o.bekliyor)
  const yeniSayi = (liste ?? []).filter((o) => o.bekliyor || o.yeni).length
  const baslik = profil.rol === 'ogrenci' ? 'Gelen kutusu' : 'Bildirimler'
  const ozet = liste === null ? ' ' : bekleyen.length ? `Senden bir şey bekleyen ${bekleyen.length} olay var.` : 'Bekleyen bir şey yok.'

  const satir = (o) => (
    <button key={o.id} type="button" className={`bl-satir bl-satir--${o.durum}${o.yeni ? ' bl-satir--yeni' : ''}`} onClick={() => onGit(o.yol)}>
      <span className="bl-simge"><svg {...ikon}>{IKON[o.tip] ?? IKON.mesaj}</svg></span>
      <span className="bl-yazi">
        <b>{o.baslik}</b>
        {o.alt && <span>{o.alt}</span>}
      </span>
      {o.zaman && <small>{zamanYaz(o.zaman)}</small>}
    </button>
  )

  return (
    <div className="ana-sayfa bl">
      <AnaTepe
        selam={baslik}
        tarih={new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^(\d+ \S+) (\S+)$/, '$2, $1')}
        ozet={ozet}
        {...(tepe ?? {})}
        sagCizim={(mevsim) => <CanCizimi mevsim={mevsim} sayi={yeniSayi} />}
      />
      <div className="ana-govde ana-govde--dar bl-govde">
        {liste === null ? (
          <Yukleniyor />
        ) : liste.length === 0 ? (
          <div className="gd-bos"><strong>Bekleyen bir şey yok.</strong><span>Yeni bir şey olursa çan çalar.</span></div>
        ) : (
          <>
            {bekleyen.length > 0 && (
              <section className="bl-grup" aria-label="Senden bekleyenler">
                <div className="on2-grup-bas"><i style={{ background: 'var(--m-acil)' }} />Senden bekleyenler</div>
                {bekleyen.map(satir)}
              </section>
            )}
            {gecmis.length > 0 && (
              <section className="bl-grup" aria-label="Son 7 gün">
                <div className="on2-grup-bas"><i style={{ background: 'var(--m-soluk)' }} />Son 7 gün</div>
                {gecmis.map(satir)}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function zamanYaz(iso) {
  const t = new Date(iso)
  const bugun = new Date()
  const ayniGun = t.toDateString() === bugun.toDateString()
  if (ayniGun) return t.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  const dun = new Date(bugun); dun.setDate(dun.getDate() - 1)
  if (t.toDateString() === dun.toDateString()) return 'Dün'
  return t.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
}
