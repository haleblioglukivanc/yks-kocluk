/* Koçun öğrenciyle son teması (mesaj, toplu mesaj, telefon, yüz yüze).
   Durum veritabanında hesaplanıyor (private.temas_durumu); burada yalnız
   ekrana yazılacak cümle kuruluyor. Liste, öğrenci kartı ve Çizbi aynı
   cümleyi okusun diye tek yerde. */

/** Koç bu öğrenciye dokundu, sıra bekleyen değil. */
export const DOKUNULDU = ['atildi', 'yanit', 'hareket', 'gorusuldu']

export const dokunulduMu = (t) => DOKUNULDU.includes(t?.durum)

function saat(zaman) {
  if (!zaman) return ''
  const z = new Date(zaman)
  const hm = z.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  const bugun = new Date()
  const dun = new Date(bugun)
  dun.setDate(bugun.getDate() - 1)
  if (z.toDateString() === bugun.toDateString()) return hm
  if (z.toDateString() === dun.toDateString()) return `dün ${hm}`
  return z.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })
}

/** Satıra yazılacak tek cümle; temas yoksa null. */
export function temasMetni(t) {
  if (!t) return null
  const s = saat(t.zaman)
  switch (t.durum) {
    case 'atildi':
      return `Mesaj atıldı · ${s}`
    case 'yanit':
      return 'Mesajına yanıt verdi'
    case 'hareket':
      return 'Mesajdan sonra görev bitirdi'
    case 'gorusuldu':
      return `${t.tur === 'yuz_yuze' ? 'Yüz yüze' : 'Telefonda'} görüşüldü · ${s}`
    case 'hareketsiz':
      return 'Mesaja rağmen hareket yok'
    default:
      return null
  }
}
