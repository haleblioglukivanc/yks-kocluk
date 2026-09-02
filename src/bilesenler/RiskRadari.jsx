import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { Bos, Kart, Rozet, Yukleniyor } from './Ortak.jsx'
import { Avatar } from './Fotograf.jsx'

/* Deneme düzeni YKS koçluğunun belkemiği. Üç hafta deneme girmeyen
   öğrenci sessiz sayılmasa bile geride kalıyordur. */
const DENEME_BOSLUGU_GUN = 21

/**
 * Bir öğrencinin neden listede olduğunu tek cümleyle söyler.
 * Üç sebebi birden yazmak listeyi okunmaz yapıyordu.
 *
 * Sıra kasıtlı: en başta koçun kendi eksiği duruyor. Risk görünümü
 * "öğrenci yapmadı"yı ölçüyor; plan hiç yazılmadıysa yapılacak bir şey
 * yoktur ve eksik öğrencinin değildir.
 */
function neden(o) {
  if (o.planYok) return { metin: 'Plan yazılmamış', tur: 'koc' }
  if (o.hic_baslamadi || o.gun_gecti == null) return { metin: 'Henüz hiç başlamadı', tur: 'risk' }
  if (o.gun_gecti >= 3) return { metin: `${o.gun_gecti} gündür sessiz`, tur: 'risk' }
  if (o.denemeGun == null) return { metin: 'Hiç deneme girmemiş', tur: 'deneme' }
  if (o.denemeGun >= DENEME_BOSLUGU_GUN) {
    return { metin: `${Math.floor(o.denemeGun / 7)} haftadır deneme yok`, tur: 'deneme' }
  }
  if ((o.gecikmis_gorev ?? 0) >= 3) return { metin: `${o.gecikmis_gorev} görev bekliyor`, tur: 'risk' }
  if (Number(o.net_farki ?? 0) <= -4) return { metin: 'Son denemede net düştü', tur: 'risk' }
  return { metin: `Tamamlama %${o.tamamlama_yuzdesi ?? 0}`, tur: 'risk' }
}

export default function RiskRadari({ onOgrenciAc, onGit }) {
  const [satirlar, setSatirlar] = useState(null)

  const yukle = useCallback(async () => {
    const bugun = new Date().toISOString().slice(0, 10)

    const [risk, plan, deneme] = await Promise.all([
      supabase
        .from('ogrenci_risk')
        .select(
          'ogrenci_id, ad_soyad, risk_skoru, risk_seviyesi, gun_gecti, hic_baslamadi, tamamlama_yuzdesi, gecikmis_gorev, net_farki, dun_tam, eksik_ust_uste',
        )
        .order('risk_skoru', { ascending: false }),
      // İleri tarihli görevi olan öğrenciler
      supabase.from('gorevler').select('ogrenci_id').gte('tarih', bugun),
      supabase.from('denemeler').select('ogrenci_id, tarih').order('tarih', { ascending: false }),
    ])

    const planliOlanlar = new Set((plan.data ?? []).map((g) => g.ogrenci_id))

    /* ogrenci_risk görünümünde fotoğraf yok; profillerden tek sorguyla
       alınır. Radar da listeyle aynı Avatar bileşenini çizsin. */
    const idler = (risk.data ?? []).map((r) => r.ogrenci_id)
    const { data: prof } = idler.length
      ? await supabase.from('profiller').select('id, fotograf_yolu').in('id', idler)
      : { data: [] }
    const foto = Object.fromEntries((prof ?? []).map((p) => [p.id, p.fotograf_yolu]))

    // Her öğrencinin en son denemesi; liste zaten tarihe göre azalan.
    const sonDeneme = {}
    for (const d of deneme.data ?? []) {
      if (!sonDeneme[d.ogrenci_id]) sonDeneme[d.ogrenci_id] = d.tarih
    }

    const simdi = new Date(bugun)
    setSatirlar(
      (risk.data ?? []).map((o) => ({
        ...o,
        fotograf_yolu: foto[o.ogrenci_id] ?? null,
        planYok: !planliOlanlar.has(o.ogrenci_id),
        denemeGun: sonDeneme[o.ogrenci_id]
          ? Math.round((simdi - new Date(sonDeneme[o.ogrenci_id])) / 864e5)
          : null,
      })),
    )
  }, [])

  useEffect(() => {
    yukle()
  }, [yukle])

  /* Listeye üç yoldan girilir: risk görünümü, koçun yazmadığı plan,
     ya da uzayan deneme boşluğu. Son ikisi risk skoruna hiç yansımıyor. */
  const dikkat = (satirlar ?? [])
    .filter(
      (o) =>
        o.risk_seviyesi !== 'iyi' ||
        o.planYok ||
        o.denemeGun == null ||
        o.denemeGun >= DENEME_BOSLUGU_GUN,
    )
    .sort((a, b) => (b.planYok ? 1 : 0) - (a.planYok ? 1 : 0))
    .slice(0, 8)

  return (
    <Kart baslik="Bugün kime bakmalı" altBaslik="Eksik plan, sessizlik, deneme boşluğu ve net düşüşü">
      {satirlar === null ? (
        <Yukleniyor />
      ) : dikkat.length === 0 ? (
        <Bos
          baslik="Kimse listede değil"
          aciklama="İyi giden bir öğrenciye kısa bir not yazmak için iyi bir gün."
        />
      ) : (
        <ul className="liste liste--kartli">
          {dikkat.map((o) => {
            const s = neden(o)
            const rozetMetni =
              s.tur === 'koc'
                ? 'plan yok'
                : s.tur === 'deneme'
                  ? 'deneme'
                  : o.risk_seviyesi === 'acil'
                    ? 'acil'
                    : 'izle'
            return (
              <li key={o.ogrenci_id} className="ogrenci-sarmal">
                <button className="ogrenci-satir" onClick={() => onOgrenciAc(o.ogrenci_id)}>
                  <Avatar yol={o.fotograf_yolu} ad={o.ad_soyad} boyut="kucuk" />
                  <div>
                    <span className="liste-ad">{o.ad_soyad}</span>
                    <span className="liste-alt">{s.metin}</span>
                  </div>
                  <Rozet ton={s.tur === 'koc' || o.risk_seviyesi === 'acil' ? 'uyari' : 'notr'}>
                    {rozetMetni}
                  </Rozet>
                </button>

                {/* Liste bir rapor değil, yapılacaklar. Her satır tek
                    dokunuşla eyleme dönüşmeli. */}
                <button
                  className="satir-eylem"
                  onClick={() => onGit?.('/mesajlar')}
                  aria-label={`${o.ad_soyad} — mesaj yaz`}
                  title="Mesaj yaz"
                >
                  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor"
                       strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 5h16v11H8l-4 3.5V5Z" />
                  </svg>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Kart>
  )
}
