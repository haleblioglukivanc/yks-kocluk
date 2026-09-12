import { useEffect, useState } from 'react'
import { GOREV_TUR_KISA } from '../lib/gorevTuru.js'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Bos, Kart, Uyari } from './Ortak.jsx'
import GorevKaynagi from './GorevKaynagi.jsx'

/* Günün hedefleri. Öğrenci panelinde dokunulabilir, koçun "öğrenci gözüyle"
   ekranında salt okunur — iki ekranın aynı dosyadan çizilmesi, birinde
   yapılan düzeltmenin diğerinde unutulmasını engelliyor. */


export default function GunHedefleri({ gorevler: gelen, saltOkunur = false, onDegisti, baslik = 'Günün hedefleri' }) {
  const [gorevler, setGorevler] = useState(gelen ?? [])
  const [hata, setHata] = useState('')

  useEffect(() => {
    setGorevler(gelen ?? [])
  }, [gelen])

  const biten = gorevler.filter((g) => g.durum === 'tamamlandi').length

  /* Dokunuşun beklememesi için önce ekran değişir, sonra sunucuya yazılır.
     Hata olursa geri alınır. */
  async function degistir(gorev, bittiMi) {
    if (saltOkunur) return
    const onceki = gorevler
    setGorevler((m) =>
      m.map((g) => (g.id === gorev.id ? { ...g, durum: bittiMi ? 'tamamlandi' : 'bekliyor' } : g)),
    )
    const { error } = await supabase
      .from('gorevler')
      .update({ durum: bittiMi ? 'tamamlandi' : 'bekliyor' })
      .eq('id', gorev.id)
    if (error) {
      setGorevler(onceki)
      setHata(hataMetni(error))
      return
    }
    setHata('')
    onDegisti?.()
  }

  return (
    <Kart
      baslik={baslik}
      eylem={
        gorevler.length ? (
          <span className="hedef-sayac">
            {biten}/{gorevler.length}
          </span>
        ) : null
      }
    >
      <Uyari>{hata}</Uyari>

      {gorevler.length === 0 ? (
        <Bos
          baslik={baslik === 'Günün hedefleri' ? 'Bugün planında bir şey yok' : 'Bu gün için plan yok'}
          aciklama={
            saltOkunur
              ? 'Öğrenci bugün boş bir ekran görüyor.'
              : 'Sayaçla serbest çalışabilir ya da dinlenebilirsin.'
          }
        />
      ) : (
        <>
          {/* Yüzde çubuğu yerine hedef başına bir baloncuk: kaç tane kaldığı
              sayılabiliyor, "%60" soyut kalıyordu. */}
          <div className="baloncuk-serit" aria-hidden="true">
            {gorevler.map((g) => (
              <span
                key={g.id}
                className={`baloncuk${g.durum === 'tamamlandi' ? ' baloncuk--dolu' : ''}`}
              />
            ))}
          </div>

          <ul className="liste gorev-liste">
            {gorevler.map((g) => {
              const bitti = g.durum === 'tamamlandi'
              const etiket = [g.ders, g.konu].filter(Boolean).join(' · ')
              return (
                <li key={g.id} className={`gorev-satir${bitti ? ' gorev-satir--bitti' : ''}`}>
                  <button
                    className="gorev-tik"
                    role="checkbox"
                    aria-checked={bitti}
                    aria-label={`${g.baslik} tamamlandı`}
                    disabled={saltOkunur}
                    onClick={() => degistir(g, !bitti)}
                  >
                    <svg viewBox="0 0 12 12" aria-hidden="true">
                      <path
                        d="M2 6.2l2.6 2.6L10 3.4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  <div className="gorev-govde">
                    <span className="gorev-baslik">{g.baslik}</span>
                    {(etiket || g.tur) && (
                      <span className="gorev-etiket">{etiket || GOREV_TUR_KISA[g.tur] || g.tur}</span>
                    )}
                    <GorevKaynagi gorev={g} />
                    {g.aciklama && <span className="gorev-not">{g.aciklama}</span>}
                  </div>
                  {/* Adet başlığın içinde değil sağda: listede alt alta
                      hizalanıyor, başlık da kısalıyor. */}
                  {g.hedef_adet != null && (
                    <span className="gorev-adet">{g.hedef_adet} soru</span>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}
    </Kart>
  )
}
