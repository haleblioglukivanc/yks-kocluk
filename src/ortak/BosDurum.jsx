/**
 * Boş durum (kural 5): bir cümle ve en fazla tek düğme. Kart yok.
 */
export default function BosDurum({ metin, eylem, onEylem }) {
  return (
    <div className="bos-durum">
      <p className="bos-durum-metin">{metin}</p>
      {eylem && onEylem && (
        <button type="button" className="dugme dugme--birincil bos-durum-eylem" onClick={onEylem}>
          {eylem}
        </button>
      )}
    </div>
  )
}
