import { supabase } from './supabase.js'
import { kalemNeDesin, olayKaydiOlustur } from './kalem-kurallari.js'

/**
 * Kâmil'in ne diyeceğini belirler.
 *
 * Önemli: bugün gösterilmiş ama kapatılmamış bir mesaj varsa yenisi
 * üretilmez, duran mesaj geri döner. Aksi halde mesaj bir kez görünüp
 * ilk sayfa yenilemesinde kayboluyordu.
 */
export async function kalemiCalistir({ profilId, rol, ad, veri }) {
  const simdi = new Date()
  const gunBasi = new Date(simdi.getFullYear(), simdi.getMonth(), simdi.getDate())

  const [gecmis, ayar] = await Promise.all([
    supabase
      .from('kalem_olaylari')
      .select('id, kural_kodu, ruh, mesaj, gosterildi, kapatildi_mi')
      .eq('profil_id', profilId)
      .order('gosterildi', { ascending: false })
      .limit(80),
    supabase
      .from('kalem_ayarlari')
      .select('sessiz_bitis, gunluk_limit')
      .eq('profil_id', profilId)
      .maybeSingle(),
  ])

  const kayitlar = gecmis.data ?? []
  const sessizBitis = ayar.data?.sessiz_bitis ? new Date(ayar.data.sessiz_bitis) : null
  if (sessizBitis && sessizBitis > simdi) return []

  const gunlukLimit = ayar.data?.gunluk_limit ?? 2

  // Bugün gösterilmiş ve henüz kapatılmamış mesajlar hâlâ geçerli
  const acikOlanlar = kayitlar.filter(
    (k) => new Date(k.gosterildi) >= gunBasi && !k.kapatildi_mi,
  )
  if (acikOlanlar.length > 0) {
    return acikOlanlar.slice(0, gunlukLimit).map((k) => ({
      id: k.id,
      kod: k.kural_kodu,
      ruh: k.ruh ?? 'bekliyor',
      mesaj: k.mesaj,
    }))
  }

  const sonGosterim = {}
  for (const k of kayitlar) {
    if (!sonGosterim[k.kural_kodu]) sonGosterim[k.kural_kodu] = new Date(k.gosterildi)
  }
  const bugunGosterilen = kayitlar.filter((k) => new Date(k.gosterildi) >= gunBasi).length

  const baglam = { rol, ad, saat: simdi.getHours(), gunIlkGirisMi: bugunGosterilen === 0 }
  if (rol === 'ogrenci') baglam.ogrenci = veri
  else if (rol === 'veli') baglam.veli = veri
  else baglam.koc = veri

  const olaylar = kalemNeDesin(
    baglam,
    { sonGosterim, buOturumdaGosterilen: bugunGosterilen, sessizBitis, gunlukLimit },
    simdi,
  )
  if (olaylar.length === 0) return []

  const { data: yazilan } = await supabase
    .from('kalem_olaylari')
    .insert(olaylar.map((o) => olayKaydiOlustur(profilId, o)))
    .select('id, kural_kodu')

  // Kapatma işlemi için satır kimliğini mesaja iliştir
  return olaylar.map((o) => ({
    ...o,
    id: (yazilan ?? []).find((y) => y.kural_kodu === o.kod)?.id ?? null,
  }))
}

/** Kapatılan mesaj bir daha o gün geri gelmez. */
export async function kalemiKapat(olay) {
  if (!olay?.id) return
  await supabase.from('kalem_olaylari').update({ kapatildi_mi: true }).eq('id', olay.id)
}
