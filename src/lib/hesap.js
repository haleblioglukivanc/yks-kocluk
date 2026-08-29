import { supabase } from './supabase.js'

/**
 * Hesap açar (öğrenci veya veli).
 *
 * Edge Function üzerinden yapılır: hesap açmak service_role anahtarını
 * gerektirir, o anahtar veritabanının tamamına sınırsız erişim verir ve
 * tarayıcıya asla inmemelidir.
 */
export async function kullaniciOlustur(govde) {
  const { data: oturum } = await supabase.auth.getSession()
  if (!oturum?.session?.access_token) throw new Error('Oturum bulunamadı.')

  const { data, error } = await supabase.functions.invoke('kullanici-olustur', { body: govde })
  if (error) {
    // Fonksiyonun kendi hata gövdesi varsa onu göster
    let mesaj = error.message
    try {
      const g = await error.context?.json()
      if (g?.hata) mesaj = g.hata
    } catch {
      /* gövde okunamadı, genel mesaj kalsın */
    }
    throw new Error(mesaj)
  }
  return data
}
