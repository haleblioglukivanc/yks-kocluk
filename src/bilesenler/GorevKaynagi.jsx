/**
 * Görevin altındaki kaynak satırı.
 *
 * Öğrenci zaten göreve bakıyor; "neyden çalışacağım" sorusunun cevabı
 * ayrı bir ekranda değil, burada duruyor. Bağlantıysa dokunulabilir,
 * basılı kitapsa düz metin.
 *
 * Tek bileşen: günün hedefleri, haftalık ızgara ve koçun öğrenci
 * gözüyle ekranı aynı satırı kullanıyor.
 */

const IKON = { dosya: '📄', baglanti: '🔗', basili: '📕' }

export default function GorevKaynagi({ gorev }) {
  const ad = gorev?.kaynak_ad
  if (!ad) return null

  const adres =
    gorev.kaynak_bicim === 'baglanti'
      ? gorev.kaynak_url
      : gorev.kaynak_bicim === 'dosya'
        ? gorev.kaynak_dosya
        : null

  const govde = (
    <>
      <span aria-hidden="true">{IKON[gorev.kaynak_bicim] ?? '📄'}</span>
      <span className="gorev-kaynak-ad">{ad}</span>
      {gorev.kaynak_aralik && (
        <span className="gorev-kaynak-aralik">{gorev.kaynak_aralik}</span>
      )}
    </>
  )

  /* Dokunuş görevi tamamlamış saymasın: satır kendi olayını durduruyor. */
  return adres ? (
    <a
      className="gorev-kaynak gorev-kaynak--bag"
      href={adres}
      target="_blank"
      rel="noreferrer noopener"
      onClick={(e) => e.stopPropagation()}
    >
      {govde}
    </a>
  ) : (
    <span className="gorev-kaynak">{govde}</span>
  )
}
