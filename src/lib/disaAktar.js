import { supabase } from './supabase.js'

/** KVKK: öğrencinin bütün kayıtlarını JSON dosyası olarak indirir. */
export async function ogrenciVerisiniIndir(ogrenciId) {
  const { data, error } = await supabase.rpc('yonetici_ogrenci_disa_aktar', { p_ogrenci: ogrenciId })
  if (error) throw error
  const ad = String(data?.profil?.ad_soyad ?? 'ogrenci')
    .toLocaleLowerCase('tr-TR').replace(/[^a-z0-9çğıöşü]+/gi, '-').replace(/^-|-$/g, '')
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `kvkk-${ad}-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}
