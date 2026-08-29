import { supabase } from './supabase.js'
import { kalemNeDesin, olayKaydiOlustur } from './kalem-kurallari.js'

/**
 * Kâmil'in bağlamını hazırlar, kuralları çalıştırır ve gösterilen
 * mesajları kaydeder. Hangi kuralın işe yaradığı sonradan ölçülebilsin diye.
 */
export async function kalemiCalistir({ profilId, rol, ad, veri }) {
  const simdi = new Date()
  const gunBasi = new Date(simdi.getFullYear(), simdi.getMonth(), simdi.getDate())

  const [gecmis, ayar] = await Promise.all([
    supabase
      .from('kalem_olaylari')
      .select('kural_kodu, gosterildi')
      .eq('profil_id', profilId)
      .order('gosterildi', { ascending: false })
      .limit(80),
    supabase
      .from('kalem_ayarlari')
      .select('sessiz_bitis, gunluk_limit')
      .eq('profil_id', profilId)
      .maybeSingle(),
  ])

  const sonGosterim = {}
  for (const s of gecmis.data ?? []) {
    if (!sonGosterim[s.kural_kodu]) sonGosterim[s.kural_kodu] = new Date(s.gosterildi)
  }
  const bugunGosterilen = (gecmis.data ?? []).filter(
    (s) => new Date(s.gosterildi) >= gunBasi,
  ).length

  const baglam = { rol, ad, saat: simdi.getHours(), gunIlkGirisMi: bugunGosterilen === 0 }
  if (rol === 'ogrenci') baglam.ogrenci = veri
  else if (rol === 'veli') baglam.veli = veri
  else baglam.koc = veri

  const olaylar = kalemNeDesin(
    baglam,
    {
      sonGosterim,
      buOturumdaGosterilen: bugunGosterilen,
      sessizBitis: ayar.data?.sessiz_bitis ? new Date(ayar.data.sessiz_bitis) : null,
      gunlukLimit: ayar.data?.gunluk_limit ?? 2,
    },
    simdi,
  )

  if (olaylar.length) {
    await supabase
      .from('kalem_olaylari')
      .insert(olaylar.map((o) => olayKaydiOlustur(profilId, o)))
  }
  return olaylar
}
