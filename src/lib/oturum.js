import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase.js'

/**
 * Oturumu ve profili tek yerden yönetir.
 * durum: 'yukleniyor' | 'cikis' | 'hazir'
 */
export function useOturum() {
  const [durum, setDurum] = useState('yukleniyor')
  const [kullanici, setKullanici] = useState(null)
  const [profil, setProfil] = useState(null)

  const profiliCek = useCallback(async (id) => {
    const { data, error } = await supabase
      .from('profiller')
      .select('id, rol, ad_soyad')
      .eq('id', id)
      .maybeSingle()
    if (error) {
      console.error('Profil okunamadı:', error)
      return null
    }
    return data
  }, [])

  const yenile = useCallback(async () => {
    const { data } = await supabase.auth.getUser()
    if (!data?.user) {
      setKullanici(null)
      setProfil(null)
      setDurum('cikis')
      return
    }
    setKullanici(data.user)
    setProfil(await profiliCek(data.user.id))
    setDurum('hazir')
  }, [profiliCek])

  useEffect(() => {
    let iptal = false

    supabase.auth.getSession().then(async ({ data }) => {
      if (iptal) return
      const u = data.session?.user ?? null
      if (!u) {
        setDurum('cikis')
        return
      }
      setKullanici(u)
      const p = await profiliCek(u.id)
      if (iptal) return
      setProfil(p)
      setDurum('hazir')
    })

    const { data: abone } = supabase.auth.onAuthStateChange(async (_olay, oturum) => {
      const u = oturum?.user ?? null
      if (!u) {
        setKullanici(null)
        setProfil(null)
        setDurum('cikis')
        return
      }
      setKullanici(u)
      setProfil(await profiliCek(u.id))
      setDurum('hazir')
    })

    return () => {
      iptal = true
      abone.subscription.unsubscribe()
    }
  }, [profiliCek])

  const cikisYap = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  return { durum, kullanici, profil, yenile, cikisYap }
}
