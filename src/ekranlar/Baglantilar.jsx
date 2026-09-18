import SekmeTepesi from '../bilesenler/SekmeTepesi.jsx'
import TelegramBaglanti from '../bilesenler/TelegramBaglanti.jsx'

/* Koçun kendi bağlantıları. Raporlar ekranındaydı; ayar olduğu için hesap
   menüsünden açılan ayrı bir ekrana ve Yönetim → Koçlar'a taşındı
   (Bekir, 18 Eylül 2026). Yönetim yetkisi olmayan koç buradan ulaşır. */
export default function Baglantilar() {
  return (
    <>
      <SekmeTepesi baslik='Bağlantılar' altBaslik='Telefonundan öğrencilerinle yazışma' />
      <TelegramBaglanti />
    </>
  )
}
