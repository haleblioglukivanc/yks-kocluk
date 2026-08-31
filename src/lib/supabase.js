import { createClient } from '@supabase/supabase-js'

// Bu iki değer tarayıcıya gönderilir ve gizli değildir.
// Yayınlanabilir (publishable) anahtar yalnızca RLS politikalarının
// izin verdiği kadarını görebilir. service_role anahtarı buraya ASLA konmaz.
// Ortam değişkeni tanımlıysa o kullanılır.
const ADRES =
  import.meta.env.VITE_SUPABASE_URL ?? 'https://sjcovxnhardtvmvooqpn.supabase.co'

const ANAHTAR =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  'sb_publishable_Swk1FAALfXmSSyQKkdH7HQ_Jb6OsJVo'

export const supabase = createClient(ADRES, ANAHTAR, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

/** Postgres hata mesajlarını kullanıcıya gösterilebilir hâle getirir. */
/* Ses tonu: sistem dili yok. Ne olduğu ve ne yapılacağı tek cümlede,
   suçlamadan. Ham mesaj konsola gider, ekrana çıkmaz — "row-level security"
   bir öğrencinin görmesi gereken bir şey değil. */
export function hataMetni(hata) {
  if (!hata) return 'Bir şey ters gitti, tekrar dener misin?'
  const m = hata.message ?? String(hata)
  const kod = hata.code ?? ''
  if (import.meta.env.DEV) console.warn('hata', kod, m)

  if (m.includes('Invalid login credentials')) return 'E-posta ya da şifre yanlış görünüyor.'
  if (m.includes('User already registered')) return 'Bu e-postayla zaten bir hesap var.'
  if (m.includes('Password should be at least')) return 'Şifre en az 6 karakter olmalı.'
  if (m.includes('Email not confirmed')) return 'Önce e-postandaki doğrulama bağlantısına tıklaman gerekiyor.'
  if (m.includes('Failed to fetch') || m.includes('NetworkError') || m.includes('Load failed'))
    return 'Bağlantı kopmuş gibi. İnterneti kontrol edip tekrar dene.'
  if (m.includes('JWT') || m.includes('session') || kod === 'PGRST301')
    return 'Oturumun zaman aşımına uğradı. Çıkıp tekrar girmen yeterli.'
  if (m.includes('row-level security') || kod === '42501')
    return 'Bunu değiştirme yetkin yok. Koçunla konuşman gerekiyor.'
  if (kod === '23505' || m.includes('duplicate key')) return 'Bu kayıt zaten var.'
  if (kod === '23503' || m.includes('foreign key')) return 'Bağlı olduğu kayıt bulunamadı, sayfayı yenileyip tekrar dene.'
  if (kod === '23514' || m.includes('check constraint')) return 'Girdiğin değer kabul edilen aralığın dışında.'
  if (kod === 'PGRST116' || m.includes('multiple (or no) rows')) return 'Aradığın kayıt bulunamadı.'
  if (m.includes('Too Many Requests') || kod === '429') return 'Çok hızlı gittik, birkaç saniye sonra tekrar dene.'
  return 'Bir şey ters gitti, tekrar dener misin? Devam ederse koçuna haber ver.'
}
