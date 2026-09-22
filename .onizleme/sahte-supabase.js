export const supabase = { storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: '' } }), remove: async () => ({}), upload: async () => ({}) }) }, from: () => ({ update: () => ({ eq: async () => ({}) }) }) }
export const KURTARMA_ANAHTARI = 'x'; export function hataMetni(h) { return String(h) }
