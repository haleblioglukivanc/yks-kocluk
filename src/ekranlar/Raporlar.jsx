import { useCallback, useEffect, useState } from 'react'
import { useGenisEkran } from '../lib/genislik.js'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Uyari, Yukleniyor } from '../bilesenler/Ortak.jsx'
import UstBlok from '../ortak/UstBlok.jsx'
import Sekmeler from '../ortak/Sekmeler.jsx'
import Bolum from '../ortak/Bolum.jsx'
import BosDurum from '../ortak/BosDurum.jsx'
import UyariSatiri from '../ortak/UyariSatiri.jsx'
import Sayan from '../bilesenler/Sayan.jsx'
import SinifOzeti from '../bilesenler/SinifOzeti.jsx'
import { gunEkle, haftaBasi, yerelIso } from '../lib/hafta.js'
import HaftalikIlham from '../bilesenler/HaftalikIlham.jsx'

/* Koçun "bu dönem ne oldu" sorusunun tek cevabı.
   Aynı veri hem ekranda görünür hem mail olarak gider; iki ayrı
   hesap yapılmıyor ki rapor ile mail birbirini tutsun. */

const GUN_KISA = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']

const ARALIKLAR = [
  ['bugun', 'Bugün'],
  ['hafta', 'Bu hafta'],
  ['ay', 'Son 30 gün'],
  ['ozel', 'Özel'],
]

function aralikHesapla(ad) {
  const bugun = yerelIso(new Date())
  if (ad === 'bugun') return [bugun, bugun]
  if (ad === 'hafta') return [haftaBasi(new Date()), bugun]
  return [gunEkle(bugun, -29), bugun]
}

const saatDakika = (dk = 0) =>
  dk >= 60 ? `${Math.floor(dk / 60)} sa ${dk % 60} dk` : `${dk} dk`

/** Günlük çalışmayı tek bakışta gösteren minik sütun grafiği. */
function GunlukGrafik({ gunler }) {
  if (!gunler?.length) return null
  // Hiç çalışma yoksa boş eksen çizilmez: boş grafik "bozuk" okunuyor.
  if (!gunler.some((g) => g.dakika > 0)) {
    return <BosDurum metin="Öğrenciler sayaç başlattıkça günlük süreler burada çubuk olur." />
  }
  const enYuksek = Math.max(...gunler.map((g) => g.dakika), 1)
  const genislik = 300
  const yukseklik = 72
  const bosluk = 2
  const sutun = Math.max(2, genislik / gunler.length - bosluk)
  const seyrek = gunler.length > 10

  return (
    <div className='rapor-grafik'>
      <svg
        className='net-grafik'
        viewBox={`0 0 ${genislik} ${yukseklik}`}
        preserveAspectRatio='none'
        role='img'
        aria-label='Günlere göre toplam çalışma süresi'
      >
        <line x1='0' y1={yukseklik - 0.5} x2={genislik} y2={yukseklik - 0.5} stroke='var(--cizgi)' strokeWidth='1' />
        {gunler.map((g, i) => {
          const h = Math.round((g.dakika / enYuksek) * (yukseklik - 4))
          return (
            <rect
              key={g.tarih}
              className='cubuk-dolgu'
              x={i * (sutun + bosluk)}
              y={yukseklik - h}
              width={sutun}
              height={Math.max(h, g.dakika > 0 ? 2 : 1)}
              rx={g.dakika > 0 ? 3 : 1}
              fill={g.dakika > 0 ? 'var(--dolgu)' : 'var(--cizgi)'}
            />
          )
        })}
      </svg>
      <div className='rapor-grafik-etiket'>
        {gunler.map((g, i) => (
          <span key={g.tarih}>
            {!seyrek || i % Math.ceil(gunler.length / 6) === 0
              ? GUN_KISA[new Date(`${g.tarih}T00:00:00`).getDay()]
              : ''}
          </span>
        ))}
      </div>
    </div>
  )
}

const RISK_ADI = { acil: 'Önce bunlar', izle: 'İzle', iyi: 'Yolunda', pasif: 'Pasif' }
const RISK_TONU = { acil: 'uyari', izle: 'izle', iyi: 'iyi', pasif: 'notr' }

/* Risk dağılımı artık ayrı kart değil, Öğrenciler bölümünde tek satır:
   üç renkli nokta, üç sayı. */
function RiskSatiri({ riskler }) {
  if (riskler == null) return null
  const say = { iyi: 0, izle: 0, acil: 0 }
  for (const r of Object.values(riskler)) {
    if (r.risk_seviyesi in say) say[r.risk_seviyesi] += 1
  }
  return (
    <p className='risk-satiri'>
      <span data-durum='iyi'>{say.iyi} yolunda</span>
      <span data-durum='izle'>{say.izle} izle</span>
      <span data-durum='acil'>{say.acil} önce bu</span>
    </p>
  )
}

const tarihYaz = (t) => new Date(`${t}T00:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })

export default function Raporlar({ onOgrenciAc, onGit }) {
  const genis = useGenisEkran()
  const [riskler, setRiskler] = useState(null)
  const [aralik, setAralik] = useState('hafta')
  const [[bas, bit], setTarih] = useState(() => aralikHesapla('hafta'))
  const [veri, setVeri] = useState(null)
  const [hata, setHata] = useState('')

  const yukle = useCallback(async () => {
    setVeri(null)
    supabase
      .from('ogrenci_risk')
      .select('ogrenci_id, risk_seviyesi, gecikmis_gorev, net_farki, tamamlama_yuzdesi')
      .then(({ data: r }) => setRiskler(Object.fromEntries((r ?? []).map((x) => [x.ogrenci_id, x]))))

    const { data, error } = await supabase.rpc('rapor_ozeti', {
      p_baslangic: bas,
      p_bitis: bit,
    })
    if (error) {
      setHata(hataMetni(error))
      setVeri(false)
      return
    }
    setHata('')
    setVeri(data)
  }, [bas, bit])

  useEffect(() => {
    yukle()
  }, [yukle])


  function aralikSec(ad) {
    setAralik(ad)
    if (ad !== 'ozel') setTarih(aralikHesapla(ad))
  }

  const g = veri?.genel ?? {}
  const ogrenciler = veri?.ogrenciler ?? []

  const calisan = ogrenciler.filter((o) => (o.dakika ?? 0) > 0).length
  const acilVar = riskler ? Object.values(riskler).some((r) => r.risk_seviyesi === 'acil') : false
  const iyi = (g.tamamlama_yuzdesi ?? 0) >= 60 && !acilVar
  const donem = bas === bit ? tarihYaz(bas) : `${tarihYaz(bas)} – ${tarihYaz(bit)}`

  return (
    <>
      {/* Tek üst blok: dönemin tek sayısı, üç özet, durum ve dönem sekmeleri
          (TASARIM-KURALLARI 3–4). Eskiden üstte haftalık gösterge, altta
          dönemlik KPI kutuları vardı; iki farklı yüzde çelişiyordu. */}
      <UstBlok sinif='rapor-tepe' etiket='Rapor' sekmeli>
        <h1 className='rt-baslik'>Rapor</h1>
        <p className='rt-alt'>{donem}</p>
        {veri ? (
          <UyariSatiri durum={iyi ? 'iyi' : 'izle'}>{iyi ? 'Yolunda' : 'Dikkat'}</UyariSatiri>
        ) : null}
        <Sekmeler
          varyant='koyu'
          etiket='Dönem'
          deger={aralik}
          onSec={aralikSec}
          secenekler={ARALIKLAR.map(([k, ad]) => ({ k, ad }))}
        />
      </UstBlok>

      {aralik === 'ozel' && (
        <div className='rapor-tarih'>
          <input
            type='date'
            value={bas}
            max={bit}
            aria-label='Başlangıç tarihi'
            onChange={(e) => setTarih([e.target.value, bit])}
          />
          <span className='rapor-tire'>–</span>
          <input
            type='date'
            value={bit}
            min={bas}
            aria-label='Bitiş tarihi'
            onChange={(e) => setTarih([bas, e.target.value])}
          />
        </div>
      )}

      <Uyari>{hata}</Uyari>

      {/* Dört ölçü kartı (Bekir, 18 Eylül: "güzeldi, tasarımı bozmuyordu").
          Zeminde tek katman; sayılar üst blokta tekrar edilmiyor. */}
      <div className='kpi-satir rapor-kpi' aria-busy={veri === null}>
        <div className='kpi-kart'>
          <p className='kpi-etiket'>Toplam çalışma</p>
          <p className='kpi-sayi'>{veri ? saatDakika(g.toplam_dakika ?? 0) : '–'}</p>
          <p className='kpi-alt'>{veri ? `${veri.gun_sayisi} günde` : '\u00a0'}</p>
        </div>
        <div className='kpi-kart'>
          <p className='kpi-etiket'>Görev tamamlama</p>
          <p className='kpi-sayi'>
            {veri && g.tamamlama_yuzdesi != null ? <Sayan on='%' deger={g.tamamlama_yuzdesi} /> : '–'}
          </p>
          <p className={veri && (g.tamamlama_yuzdesi ?? 0) >= 60 ? 'kpi-alt kpi-alt--iyi' : 'kpi-alt kpi-alt--kotu'}>
            {veri ? `${g.gorev_tamam ?? 0} / ${g.gorev_toplam ?? 0} görev` : '\u00a0'}
          </p>
        </div>
        <div className='kpi-kart'>
          <p className='kpi-etiket'>Öğrenci</p>
          <p className='kpi-sayi'>{veri ? <Sayan deger={g.ogrenci_sayisi ?? 0} /> : '–'}</p>
          <p className='kpi-alt'>{veri ? `${calisan} tanesi çalıştı` : '\u00a0'}</p>
        </div>
        <div className='kpi-kart'>
          <p className='kpi-etiket'>Deneme</p>
          <p className='kpi-sayi'>{veri ? <Sayan deger={g.deneme_sayisi ?? 0} /> : '–'}</p>
          <p className='kpi-alt'>bu dönemde girildi</p>
        </div>
      </div>

      <div className='rapor-izgara'>
        <div className='rapor-ana'>
          <Bolum baslik='Günlük çalışma'>
            {veri === null ? (
              <div className='rapor-grafik rapor-grafik--bekliyor' aria-hidden='true' />
            ) : veri === false ? (
              <BosDurum metin='Rapor alınamadı. Dönemi yeniden seçerek tekrar dene.' />
            ) : (
              <GunlukGrafik gunler={veri.gunluk} />
            )}
          </Bolum>

          <SinifOzeti />

          <Bolum
            cizgili
            baslik='Öğrenciler'
            sayi={veri ? ogrenciler.length : null}
            aciklama={genis ? 'Satıra tıkla, öğrenciye git.' : 'Çalışma süresine göre sıralı.'}
          >
            <RiskSatiri riskler={riskler} />
            {veri === null ? (
              <Yukleniyor />
            ) : ogrenciler.length === 0 ? (
              <BosDurum metin='Aktif öğrenci yok.' />
            ) : genis ? (
              /* Geniş ekranda tablo: on iki öğrencinin dönemi tek bakışta. */
              <div className='yk-tablo-kap'>
                <table className='yk-tablo'>
                  <thead>
                    <tr>
                      <th>Öğrenci</th><th>Çalışma</th><th>Tamamlama</th>
                      <th>Son net</th><th>Değişim</th><th>Gecikmiş</th><th>Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ogrenciler.map((o) => {
                      const r = riskler?.[o.ogrenci_id] ?? {}
                      const fark = r.net_farki == null ? null : Number(r.net_farki)
                      return (
                        <tr
                          key={o.ogrenci_id}
                          tabIndex={0}
                          onClick={() => onOgrenciAc?.(o.ogrenci_id)}
                          onKeyDown={(e) => e.key === 'Enter' && onOgrenciAc?.(o.ogrenci_id)}
                        >
                          <td>{o.ad_soyad}</td>
                          <td className='yk-sayi'>{saatDakika(o.dakika ?? 0)}</td>
                          <td className='yk-sayi'>{o.yuzde == null ? '—' : `%${o.yuzde}`}</td>
                          <td className='yk-sayi'>{o.son_net == null ? '—' : o.son_net}</td>
                          <td className={`yk-sayi${fark ? (fark > 0 ? ' rd-yukari' : ' rd-asagi') : ''}`}>
                            {fark == null || fark === 0 ? '—' : `${fark > 0 ? '▲' : '▼'} ${Math.abs(fark).toFixed(2)}`}
                          </td>
                          <td className='yk-sayi'>{r.gecikmis_gorev ?? 0}</td>
                          <td>
                            <span className='durum-yazi' data-durum={RISK_TONU[r.risk_seviyesi] ?? 'notr'}>
                              {RISK_ADI[r.risk_seviyesi] ?? '—'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <ul className='liste'>
                {ogrenciler.map((o) => {
                  const durgun = (o.dakika ?? 0) === 0
                  return (
                    <li key={o.ogrenci_id}>
                      <button
                        className='ogrenci-satir rapor-satir'
                        onClick={() => onOgrenciAc?.(o.ogrenci_id)}
                      >
                        <div className='rapor-satir-metin'>
                          <span className='liste-ad'>{o.ad_soyad}</span>
                          <span className='liste-alt'>
                            {saatDakika(o.dakika ?? 0)} · {o.gorev_tamam}/{o.gorev_toplam} görev
                            {o.son_net != null && ` · son net ${o.son_net}`}
                          </span>
                        </div>
                        {durgun ? (
                          <span className='durum-yazi' data-durum='uyari'>durgun</span>
                        ) : (
                          <span className='hedef-deger'>
                            <strong>{o.yuzde == null ? '—' : `%${o.yuzde}`}</strong>
                          </span>
                        )}
                        <span className='ok' aria-hidden='true'>›</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </Bolum>
        </div>

        <div className='rapor-yan'>
          {/* E-posta kaydı Yönetim → Sistem'e, Telegram Yönetim → Koçlar'a,
              Araçlar hesap menüsüne taşındı: Raporlar yalnız "bak" ekranı. */}
          <Bolum baslik='Bu hafta giden' aciklama='Öğrencilere ve velilere bu hafta giden kitap ve söz.'>
            <HaftalikIlham />
          </Bolum>
        </div>
      </div>
    </>
  )
}
