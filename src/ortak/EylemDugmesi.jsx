/**
 * İkincil eylem (TASARIM-KURALLARI 6): başında ikon olan hafif dolgulu düğme.
 * Ekrandaki tek dolu düğme ile düz yazı arasındaki düzey: fark edilir ama
 * bağırmaz. İkon verilmezse metinden çıkarılır: "+ …" → artı, "Düzenle" →
 * kalem, "Gönder" → uçak. Metnin başındaki "+" ikona dönüşür.
 */
const IKON = {
  ekle: <path d="M12 5v14M5 12h14" />,
  kalem: <path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" />,
  gonder: <path d="M4 12 20 4l-6 16-3-7-7-1z" />,
  kapat: <path d="M6 6l12 12M18 6 6 18" />,
  ok: <path d="m9 6 6 6-6 6" />,
  anahtar: <path d="M15 7a4 4 0 1 1-3.9 4.9L4 19v-3h3v-3h3l1.1-1.1A4 4 0 0 1 15 7zm1.5 2.5h.01" />,
  kopya: <path d="M9 9h11v11H9zM5 15H4V4h11v1" />,
  saat: <path d="M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 9v4l2 2M9 2h6" />,
  goz: <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />,
}

function ikonBul(metin) {
  const m = String(metin ?? '').trim().toLocaleLowerCase('tr-TR')
  if (m.startsWith('+')) return 'ekle'
  if (m.startsWith('düzenle')) return 'kalem'
  if (m.includes('gönder')) return 'gonder'
  if (m === 'kapat' || m === 'vazgeç' || m === 'gizle' || m === 'kısalt') return 'kapat'
  if (m.startsWith('hepsi') || m.startsWith('tümü') || m === 'göster') return 'ok'
  return null
}

export default function EylemDugmesi({ children, ikon, onClick, disabled, tur = 'ton', sinif = '' }) {
  const ad = ikon === undefined ? ikonBul(children) : ikon
  const metin = typeof children === 'string' ? children.replace(/^\+\s*/, '') : children
  return (
    <button
      type="button"
      className={`eylem-dugmesi eylem-dugmesi--${tur}${sinif ? ` ${sinif}` : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      {ad && IKON[ad] && (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
             strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {IKON[ad]}
        </svg>
      )}
      <span>{metin}</span>
    </button>
  )
}
