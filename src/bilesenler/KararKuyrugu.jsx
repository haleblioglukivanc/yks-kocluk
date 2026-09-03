import { useCallback, useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Kart, Dugme, Uyari, Yukleniyor } from './Ortak.jsx'
import { Avatar } from './Fotograf.jsx'
import BugunCalisanlar from './BugunCalisanlar.jsx'

/* Koçun günlük karar kuyruğu. Risk, konu onayı, deneme analizi, veli özeti ve
   hedef ayarı tek sırada akar; koç bir kart görür, karar verir, sıradaki gelir.
   Önceki dağınık kuyruklar (RiskRadari / AnalizKuyrugu / OnayKuyrugu /
   VeliOzetKuyrugu) bunun yerini alır. Kural: öneri hazır gelir, koç onaylar;
   öğrenciye giden metin karttan görünmeden hiçbir şey gönderilmez. */

const TIP_ETIKET = {
  risk: 'Kaybolan öğrenci',
  konu: 'Konu onayı',
  analiz: 'Deneme analizi',
  veli_ozet: 'Veli özeti',
  hedef: 'Hedef ayarı',
}

export default function KararKuyrugu({ onOgrenciAc }) {
  const [kartlar, setKartlar] = useState(null)
  const [sira, setSira] = useState(0)
  const [toplam, setToplam] = useState(0)
  const [verilen, setVerilen] = useState(0)
  const [hata, setHata] = useState('')

  const yukle = useCallback(async () => {
    const { data, error } = await supabase.rpc('koc_karar_kuyrugu', { p_limit: 12 })
    if (error) {
      setHata(hataMetni(error))
      setKartlar([])
      return
    }
    setKartlar(data ?? [])
    setToplam((data ?? []).length)
    setSira(0)
  }, [])

  useEffect(() => {
    yukle()
  }, [yukle])

  if (kartlar === null) return <Yukleniyor metin="Kararlar geliyor" satir={4} />

  const kart = kartlar[sira]

  if (!kart) {
    return (
      <>
        <Kart>
          <div className="kuyruk-bitis">
            <p className="kuyruk-bitis-baslik">Bugünlük bitti</p>
            <p className="kuyruk-bitis-alt">
              {verilen > 0 ? `${verilen} karar verdin.` : 'Bekleyen karar yok.'}
              {' '}Yeni bir şey olursa Kâmil söyler.
            </p>
          </div>
        </Kart>
        {/* Boş ekran boş kalmasın: kim bugün girdi, kim çalışıyor. */}
        <BugunCalisanlar onOgrenciAc={onOgrenciAc} />
      </>
    )
  }

  return (
    <>
      {hata ? <Uyari>{hata}</Uyari> : null}
      <KuyrukKarti
        key={`${kart.tip}-${kart.kaynak_id}`}
        kart={kart}
        kalan={toplam - sira}
        ilerleme={toplam ? Math.round((sira / toplam) * 100) : 0}
        onOgrenciAc={onOgrenciAc}
        onBitti={(sayildi) => {
          if (sayildi) setVerilen((v) => v + 1)
          setSira((s) => s + 1)
        }}
        onHata={setHata}
      />
      <Sirada kartlar={kartlar.slice(sira + 1)} />
    </>
  )
}

/* Bekleyen kararlar: açılışta yalnız sayı, dokununca liste. Kart tek
   tek geldiği için koç sırada ne olduğunu göremiyordu. */
function Sirada({ kartlar }) {
  const [acik, setAcik] = useState(false)
  if (kartlar.length === 0) return null
  return (
    <Kart
      duz
      baslik="Sırada"
      eylem={
        <button className="metin-dugme" onClick={() => setAcik((a) => !a)} aria-expanded={acik}>
          {acik ? 'Kapat' : `${kartlar.length} karar daha`}
        </button>
      }
    >
      {acik && (
        <ul className="sirada-liste">
          {kartlar.map((k) => (
            <li key={`${k.tip}-${k.kaynak_id}`} className="sirada-satir">
              <span className="kuyruk-tip" data-tip={k.tip}>{TIP_ETIKET[k.tip] ?? k.tip}</span>
              <span className="sirada-ad">{k.ad}</span>
            </li>
          ))}
        </ul>
      )}
    </Kart>
  )
}

function KuyrukKarti({ kart, kalan, ilerleme, onOgrenciAc, onBitti, onHata }) {
  const [metin, setMetin] = useState(kart.mesaj ?? '')
  const [duzenle, setDuzenle] = useState(false)
  const [bekliyor, setBekliyor] = useState(false)
  const a = kart.aksiyonlar ?? {}

  async function karar(k) {
    setBekliyor(true)
    onHata('')
    const { error } = await supabase.rpc('koc_karar_ver', {
      p_tip: kart.tip,
      p_kaynak_id: kart.kaynak_id,
      p_karar: k,
      p_metin: kart.deger ?? (kart.mesaj != null ? metin : null),
    })
    setBekliyor(false)
    if (error) {
      onHata(hataMetni(error))
      return
    }
    onBitti(k !== 'ertele')
  }

  function ortaya() {
    if (a.ortaKod === 'duzelt') {
      setDuzenle(true)
      return
    }
    karar(a.ortaKod)
  }

  return (
    <Kart kaldirilmis>
      <div className="kuyruk-ust">
        <span className="kuyruk-tip" data-tip={kart.tip}>
          {TIP_ETIKET[kart.tip] ?? kart.tip}
        </span>
        <span className="kuyruk-sayac">{kalan} karar kaldı</span>
      </div>

      <div className="kuyruk-cubuk" aria-hidden="true">
        <div className="kuyruk-cubuk-dolu" style={{ width: `${ilerleme}%` }} />
      </div>

      <button className="kuyruk-kimlik" onClick={() => onOgrenciAc?.(kart.ogrenci_id)} title="Öğrenciyi aç">
        <Avatar yol={kart.fotograf_yolu} ad={kart.ad} boyut="kucuk" />
        <span>
          <span className="liste-ad">{kart.ad}</span>
          <span className="liste-alt">{kart.baglam}</span>
        </span>
      </button>

      <p className="kuyruk-oneri">{kart.oneri}</p>

      {kart.mesaj != null && !duzenle ? <p className="kuyruk-mesaj">{metin}</p> : null}

      {kart.mesaj != null && duzenle ? (
        <textarea
          className="kuyruk-alan"
          value={metin}
          rows={5}
          onChange={(e) => setMetin(e.target.value)}
          aria-label="Gidecek metin"
        />
      ) : null}

      <div className="kuyruk-dugmeler">
        <Dugme bekliyor={bekliyor} onClick={() => karar('onay')}>
          {a.onay ?? 'Onayla'}
        </Dugme>
        <div className="kuyruk-alt-dugmeler">
          {a.orta && !duzenle ? (
            <button className="dugme dugme--ikincil" disabled={bekliyor} onClick={ortaya}>
              {a.orta}
            </button>
          ) : null}
          <button className="dugme dugme--ikincil" disabled={bekliyor} onClick={() => karar('ertele')}>
            {a.ertele ?? 'Ertele'}
          </button>
        </div>
      </div>
    </Kart>
  )
}
