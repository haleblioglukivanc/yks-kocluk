// Renk temaları. Anahtar adları renk.js ile aynı (lacivert = zemin, turuncu = vurgu ...),
// böylece şablonlar temadan habersiz çalışır. Hiçbiri siyaha yakın açılmaz (kapak kuralı).
import { R } from './renk.js'

export const TEMALAR = {
  gece: { ...R, balonMetin: R.beyaz, ad: 'Gece' },
  krem: { ...R, lacivert: '#f6f1e8', lacivert2: '#fffdf8', kenar: '#e3dccd', balon: '#e9e2d3', balonMetin: '#101a38',
    beyaz: '#101a38', acikMavi: '#4a5570', soluk: '#7a8398', turuncu: '#e2581a', turuncuA: '#c2410c', mercan: '#d6224a',
    mavi: '#f2b38a', ad: 'Krem' },
  orman: { ...R, lacivert: '#0f3a33', lacivert2: '#15493f', kenar: '#2a6b5d', balon: '#1d5a4e', balonMetin: '#ffffff',
    turuncu: '#f5a524', turuncuA: '#ffc857', mercan: '#e76f51', acikMavi: '#cde8df', soluk: '#8fb8ab', mavi: '#2a9d8f', ad: 'Orman' },
  murdum: { ...R, lacivert: '#35122f', lacivert2: '#4a1a42', kenar: '#6e2b62', balon: '#5a2150', balonMetin: '#ffffff',
    turuncu: '#ff7a59', turuncuA: '#ffa98f', mercan: '#e0284f', acikMavi: '#f1d5ea', soluk: '#c29bb8', mavi: '#8e3b86', ad: 'Mürdüm' },
  gok: { ...R, lacivert: '#1a3fb0', lacivert2: '#2450c8', kenar: '#4b73e0', balon: '#2f5ad6', balonMetin: '#ffffff',
    turuncu: '#ffb020', turuncuA: '#ffd166', mercan: '#ff5a5f', acikMavi: '#dbe5ff', soluk: '#a9bcf5', mavi: '#6c8cff', ad: 'Gök' },
}
