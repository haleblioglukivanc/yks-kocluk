/**
 * Hedeflenen net ile gerçekleşen net karşılaştırması.
 * Hedef girilmemişse hiç görünmez; boş bir çubuk göstermek bilgi vermez.
 */
export default function HedefNet({ tyt, ayt, durum }) {
  const satirlar = [
    { ad: 'TYT', hedef: tyt, tavan: 120, d: durum?.tyt },
    { ad: 'AYT', hedef: ayt, tavan: 80, d: durum?.ayt },
  ].filter((s) => s.hedef != null)

  if (satirlar.length === 0) return null

  return (
    <div className="hedef-net">
      {satirlar.map((s) => {
        const hedef = Number(s.hedef)
        const son = s.d?.son_net != null ? Number(s.d.son_net) : null
        const enIyi = s.d?.en_yuksek_net != null ? Number(s.d.en_yuksek_net) : null
        const oran = son != null && hedef > 0 ? Math.min(100, (son / hedef) * 100) : 0
        const ulasti = son != null && son >= hedef

        return (
          <div key={s.ad} className="hedef-satir">
            <span className="hedef-ad">{s.ad}</span>

            <div className="hedef-cubuk" role="img"
                 aria-label={`${s.ad} hedefi ${hedef.toFixed(2)} net${son != null ? `, son deneme ${son.toFixed(2)} net` : ''}`}>
              <div className={`hedef-dolgu${ulasti ? ' hedef-dolgu--ulasti' : ''}`} style={{ width: `${oran}%` }} />
            </div>

            <span className="hedef-deger">
              {son != null ? (
                <>
                  <strong>{son.toFixed(2)}</strong>
                  <span className="hedef-bolen"> / </span>
                </>
              ) : (
                <span className="hedef-yok">— / </span>
              )}
              {hedef.toFixed(2)}
            </span>

            {enIyi != null && enIyi > (son ?? 0) && (
              <span className="hedef-eniyi">en iyi {enIyi.toFixed(2)}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
