/**
 * Marka işareti — HK monogramı.
 *
 * H'nin sağ dikeyi aynı zamanda K'nin gövdesidir; K'nin kolları doğal
 * yönde sağa açılır, hiçbir harf ters çevrilmez. O ortak dikey amber
 * çizilir: markanın tek imza hattı. Turuncu başka hiçbir yere girmez.
 *
 * Tek yerde durur ki üst şerit, giriş ekranı ve favicon aynı çizimi
 * paylaşsın; birinde yapılan düzeltme hepsinde geçerli olsun.
 *
 * Marka adı "HK" değildir. Adı "Kıvanç Haleblioğlu"; bu iki harf yalnızca
 * ikondur ve daima ismin ya da bir başlığın yanında durur.
 */
export function MarkaIsareti({ yukseklik = 20, sinif = '' }) {
  return (
    <svg
      className={sinif ? `marka-isaret ${sinif}` : 'marka-isaret'}
      viewBox="0 0 96 72"
      height={yukseklik}
      width={(yukseklik * 96) / 72}
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
        <path d="M14 36H50" />
        <path d="M50 36L78 8" />
        <path d="M50 36L80 64" />
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

export default MarkaIsareti
