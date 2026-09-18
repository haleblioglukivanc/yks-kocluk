/**
 * Hafta şeridi — koçta da öğrencide de tek bileşen (kural 9, B.1).
 *
 * Görünüm burada; veri çağıranda. Koç (ProgramIzgarasi) ve öğrenci
 * (HaftaSeridi) aynı şeridi çizer, fark yalnız prop'larla gelir.
 *
 * haftalar:        [{ anahtar, ad?, gunler: ['2026-09-14', …] }]
 * sayim:           { [tarih]: { toplam, biten } }
 * gecikmeVurgusu:  geçmişte bitmemiş iş kalan günün sayısı kırmızı yazılır
 *                  (koç görünümü; öğrenciye suçlayıcı sinyal verilmez)
 * damga:           günün bütün işleri bitince ✓ damgası
 */
const KISA_GUN = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

export default function GunSeridi({
  haftalar,
  sayim = {},
  secili,
  bugun,
  onSec,
  gecikmeVurgusu = false,
  damga = false,
  kaydirakRef,
  etiket = 'Haftanın günleri',
}) {
  return (
    <div className="hafta-kaydirak" ref={kaydirakRef} role="tablist" aria-label={etiket}>
      {haftalar.map((h) => (
        <div className="gun-seridi-hafta" key={h.anahtar}>
          {h.ad && <span className="gun-seridi-ad">{h.ad}</span>}
          <div className="hafta-serit">
            {h.gunler.map((t, i) => {
              const s = sayim[t] ?? { toplam: 0, biten: 0 }
              const bugunMu = t === bugun
              const gecmis = bugun ? t < bugun : false
              const tam = s.toplam > 0 && s.biten === s.toplam
              const geciken = gecikmeVurgusu && gecmis && s.toplam > s.biten
              return (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={t === secili}
                  className={[
                    'hafta-gun',
                    t === secili && 'hafta-gun--secili',
                    bugunMu && 'hafta-gun--bugun',
                    gecmis && 'hafta-gun--gecmis',
                    geciken && 'hafta-gun--geciken',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => onSec?.(t)}
                >
                  <span className="hafta-gun-ad">{KISA_GUN[i]}</span>
                  <span className="hafta-gun-no">{Number(t.slice(8, 10))}</span>
                  <span className="hafta-gun-sayi" aria-label={`${s.biten}/${s.toplam} iş`}>
                    {s.toplam === 0 ? '·' : `${s.biten}/${s.toplam}`}
                  </span>
                  {damga && tam && (
                    <span className="hafta-damga" style={{ animationDelay: `${i * 70}ms` }} aria-hidden="true">
                      ✓
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
