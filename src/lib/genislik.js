import { useEffect, useState } from 'react'

/* Kesme noktaları yerlesim.css ile aynı: geniş = 64rem (1024px). Yalnız
   yerleşimin JSX'te dallanması gereken yerde (iki sütun) kullanılır;
   görsel her şey CSS'te kalır. */
const SORGU = '(min-width: 64rem)'

export function useGenisEkran() {
  const [genis, setGenis] = useState(() => window.matchMedia?.(SORGU).matches ?? false)
  useEffect(() => {
    const mq = window.matchMedia(SORGU)
    const dinle = (e) => setGenis(e.matches)
    mq.addEventListener('change', dinle)
    return () => mq.removeEventListener('change', dinle)
  }, [])
  return genis
}
