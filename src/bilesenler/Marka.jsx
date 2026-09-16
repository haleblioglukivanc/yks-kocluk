/**
 * Marka işareti — KH monogramı.
 *
 * K'nin kolları sağa açılıp H'nin sol dikeyine değer; o ortak dikey amber
 * çizilir, markanın tek imza hattı budur. Harfler ismin okunuş sırasında:
 * Kıvanç Hoca. Turuncu başka hiçbir yere girmez.
 *
 * Tek yerde durur ki üst şerit, giriş ekranı ve favicon aynı çizimi
 * paylaşsın; birinde yapılan düzeltme hepsinde geçerli olsun. Depo dışında
 * kullanılacak dosyalar (baskı, sosyal medya, banner) marka/ klasöründedir;
 * yeniden çizilmez, oradan alınır.
 *
 * Marka adı "KH" değildir. Adı "Kıvanç Hoca"; iki harf de oradan gelir
 * ve ismin okunuş sırasındadır (Kıvanç + Hoca). Soyadı halka açık yüzeylerde kullanılmaz; yalnızca
 * sözleşme ve fatura gibi resmî yerlerde geçer. Bu iki harf yalnızca
 * ikondur ve daima ismin ya da bir başlığın yanında durur.
 */
export function MarkaIsareti({ yukseklik = 20, sinif = '' }) {
  return (
    <svg
      className={sinif ? `marka-isaret ${sinif}` : 'marka-isaret'}
      viewBox="0 0 100 72"
      height={yukseklik}
      width={(yukseklik * 100) / 72}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <g
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 8V64" />
        <path d="M14 36L48 8" />
        <path d="M14 36L48 64" />
        <path d="M50 36H86" />
        <path d="M86 8V64" />
      </g>
      <path
        className="marka-akt"
        d="M50 8V64"
        strokeWidth="9"
        strokeLinecap="round"
      />
    </svg>
  )
}

