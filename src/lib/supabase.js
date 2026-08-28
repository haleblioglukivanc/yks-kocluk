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
export function hataMetni(hata) {
  if (!hata) return 'Bilinmeyen bir hata oluştu.'
  const m = hata.message ?? String(hata)
  if (m.includes('Invalid login credentials')) return 'E-posta veya şifre hatalı.'
  if (m.includes('User already registered')) return 'Bu e-posta zaten kayıtlı.'
  if (m.includes('Password should be at least'))
    return 'Şifre en az 6 karakter olmalı.'
  if (m.includes('Email not confirmed'))
    return 'E-postanızı doğrulamanız gerekiyor.'
  return m
}
