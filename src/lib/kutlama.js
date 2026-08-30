import { supabase } from './supabase.js'

/* Kutlama kontrolü sunucuda idempotenttir: aynı olay kural_kodu ile
   bir kez döner, sayfa yenilense de konfeti tekrar patlamaz.
   Hatası kullanıcıya gösterilmez — kutlama gelmezse akış bozulmasın. */

export async function kutlamaKontrol() {
  const { data, error } = await supabase.rpc('kutlama_kontrol')
  if (error) {
    console.warn('kutlama_kontrol', error.message)
    return []
  }
  return data?.kutlamalar ?? []
}
