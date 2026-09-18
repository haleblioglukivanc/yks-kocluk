import { useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Uyari, Yukleniyor } from './Ortak.jsx'
import Bolum from '../ortak/Bolum.jsx'
import BosDurum from '../ortak/BosDurum.jsx'

/* Yönetim → Teknik: kim, ne zaman, kime ne yaptı. Hesap açma/silme, şifre
   sıfırlama/değiştirme, yetki, koç durumu, öğrenci aktarma. */
const OLAY = {
  hesap_acildi: 'Hesap açıldı',
  hesap_silindi: 'Hesap silindi',
  sifre_sifirlandi: 'Şifre sıfırlandı',
  sifre_degistirdi: 'Şifresini değiştirdi',
  yetki_verildi: 'Yönetici yetkisi verildi',
  yetki_alindi: 'Yönetici yetkisi alındı',
  koc_durumu: 'Koç durumu değişti',
  ogrenci_aktarildi: 'Öğrenci aktarıldı',
}
const DURUM = { aktif: 'Aktif', izinde: 'İzinde', ayrildi: 'Ayrıldı' }

function ayrinti(g) {
  const a = g.ayrinti ?? {}
  if (g.olay === 'ogrenci_aktarildi') return `${a.eski_koc ?? '—'} → ${a.yeni_koc ?? '—'}`
  if (g.olay === 'koc_durumu') return `${DURUM[a.eski] ?? a.eski} → ${DURUM[a.yeni] ?? a.yeni}`
  if (g.olay === 'hesap_acildi' && a.rol) return a.rol
  return null
}

export default function ErisimGunlugu() {
  const [liste, setListe] = useState(null)
  const [hepsi, setHepsi] = useState(false)
  const [hata, setHata] = useState('')

  useEffect(() => {
    supabase.rpc('yonetici_erisim_gunlugu', { p_limit: 50 }).then(({ data, error }) => {
      if (error) setHata(hataMetni(error))
      setListe(data ?? [])
    })
  }, [])

  const gosterilen = liste ? (hepsi ? liste : liste.slice(0, 6)) : []
  return (
    <Bolum
      cizgili
      baslik="Erişim günlüğü"
      sayi={liste?.length || null}
      aciklama="Hesap, şifre ve yetki değişiklikleri."
      eylem={liste && liste.length > 6 ? (hepsi ? 'Kısalt' : `Tümü · ${liste.length}`) : null}
      onEylem={() => setHepsi((v) => !v)}
    >
      <Uyari>{hata}</Uyari>
      {liste === null ? (
        <Yukleniyor />
      ) : liste.length === 0 ? (
        <BosDurum metin="Henüz kayıt yok. Günlük 19 Eylül 2026'dan itibaren tutuluyor." />
      ) : (
        <ul className="liste">
          {gosterilen.map((g) => {
            const ek = ayrinti(g)
            return (
              <li key={g.id} className="liste-satir">
                <div>
                  <span className="liste-ad">{OLAY[g.olay] ?? g.olay} · {g.hedef ?? '—'}</span>
                  <span className="liste-alt">
                    {new Date(g.zaman).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    {' · '}{g.yapan ?? 'sistem'}{ek ? ` · ${ek}` : ''}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Bolum>
  )
}
