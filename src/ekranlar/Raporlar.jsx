import { useCallback, useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Bos, Dugme, Kart, Rozet, Uyari, Yukleniyor } from '../bilesenler/Ortak.jsx'
import SinifOzeti from '../bilesenler/SinifOzeti.jsx'
import TelegramBaglanti from '../bilesenler/TelegramBaglanti.jsx'
import HaftalikIlham from '../bilesenler/HaftalikIlham.jsx'

/* Koçun "bu dönem ne oldu" sorusunun tek cevabı.
   Aynı veri hem ekranda görünür hem mail olarak gider; iki ayrı
   hesap yapılmıyor ki rapor ile mail birbirini tutsun. */

const GUN_KISA = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']

function yerelIso(d) {
  const t = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return t.toISOString().slice(0, 10)
}

function gunEkle(iso, n) {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + n)
  return yerelIso(d)
}

/** Haftanın pazartesisi. Türkiye'de hafta pazartesi başlıyor. */
function haftaBasi(d) {
  const k = (d.getDay() + 6) % 7
  return gunEkle(yerelIso(d), -k)
}

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

const DURUM_YAZI = {
  bekliyor: 'sırada',
  gonderiliyor: 'gönderiliyor',
  gonderildi: 'gönderildi',
  hata: 'hata',
  iptal: 'iptal',
}

const TIP_YAZI = {
  veli_haftalik: 'Veli · haftalık',
  koc_gunluk: 'Koç · günlük',
  koc_haftalik: 'Koç · haftalık',
  ogrenci_haftalik: 'Öğrenci · haftalık',
}

/** Günlük çalışmayı tek bakışta gösteren minik sütun grafiği. */
function GunlukGrafik({ gunler }) {
  if (!gunler?.length) return null
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
        {gunler.map((g, i) => {
          const h = Math.round((g.dakika / enYuksek) * (yukseklik - 4))
          return (
            <rect
              key={g.tarih}
              x={i * (sutun + bosluk)}
              y={yukseklik - h}
              width={sutun}
              height={Math.max(h, g.dakika > 0 ? 2 : 1)}
              rx='1'
              fill={g.dakika > 0 ? 'var(--dolgu)' : 'var(--kare, #e3e8f0)'}
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

export default function Raporlar({ onOgrenciAc, onGit, bekleyenOzet = 0 }) {
  const [aralik, setAralik] = useState('hafta')
  const [[bas, bit], setTarih] = useState(() => aralikHesapla('hafta'))
  const [veri, setVeri] = useState(null)
  const [gecmis, setGecmis] = useState(null)
  const [islemde, setIslemde] = useState(null)
  const [hata, setHata] = useState('')
  const [bilgi, setBilgi] = useState('')

  const yukle = useCallback(async () => {
    setVeri(null)
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

  const gecmisiYukle = useCallback(async () => {
    const { data } = await supabase
      .from('mail_kuyrugu')
      .select('id, rapor_tipi, konu, durum, hata_mesaji, gonderildi_zaman, olusturuldu')
      .order('olusturuldu', { ascending: false })
      .limit(12)
    setGecmis(data ?? [])
  }, [])

  useEffect(() => {
    yukle()
  }, [yukle])

  useEffect(() => {
    gecmisiYukle()
  }, [gecmisiYukle])

  function aralikSec(ad) {
    setAralik(ad)
    if (ad !== 'ozel') setTarih(aralikHesapla(ad))
  }

  /** Kuyruğa atar, sonra kuyruğu hemen boşaltması için göndericiyi dürter. */
  async function kuyrugaAt() {
    setIslemde('gonder')
    setHata('')
    setBilgi('')

    const tekGun = bas === bit
    const { error } = await supabase.rpc('koc_raporu_gonder', {
      p_tip: tekGun ? 'koc_gunluk' : 'koc_haftalik',
      p_baslangic: bas,
      p_bitis: bit,
    })

    if (error) {
      setIslemde(null)
      setHata(hataMetni(error))
      return
    }

    const { data, error: fnHata } = await supabase.functions.invoke('rapor-mail')
    setIslemde(null)

    if (fnHata) {
      setBilgi('Rapor kuyruğa alındı ama gönderici yanıt vermedi. Aşağıdaki listeden durumu izleyebilirsin.')
    } else if (data?.basarisiz > 0) {
      setHata('Gönderim başarısız. Aşağıdaki geçmişte hata mesajı yazıyor.')
    } else {
      setBilgi('Rapor e-posta olarak gönderildi.')
    }
    await gecmisiYukle()
  }

  async function testMaili() {
    setIslemde('test')
    setHata('')
    setBilgi('')
    const { data, error } = await supabase.functions.invoke('rapor-mail', {
      body: { test: true },
    })
    setIslemde(null)
    if (error || data?.tamam === false) {
      setHata(`Mail altyapısı yanıt vermedi: ${data?.hata ?? error?.message ?? 'bilinmeyen hata'}`)
      return
    }
    setBilgi(`Test maili ${data?.alici ?? 'gönderen adrese'} yollandı.`)
  }

  const g = veri?.genel ?? {}
  const ogrenciler = veri?.ogrenciler ?? []
  const enUzun = Math.max(...ogrenciler.map((o) => o.dakika ?? 0), 1)

  return (
    <>
      {/* Sınıfın haftalık bakışı panelden buraya indi: KPI + net trendi. */}
      <SinifOzeti />

      {/* Alt çubuktan inen ekranlar. Günlük değil, arada bir kullanılan işler. */}
      <Kart baslik='Araçlar'>
        <ul className='liste arac-listesi'>
          {[
            ['/konular', 'Konu öncelikleri', 'Katalogdaki konuların ağırlığı ve sırası'],
            ['/kaynaklar', 'Kaynaklar', 'Konulara bağlı kitap, video ve soru bankaları'],
            ['/veli-ozetleri', 'Veli özetleri', bekleyenOzet > 0 ? `${bekleyenOzet} özet onay bekliyor` : 'Haftalık veli özetleri'],
          ].map(([yol, ad, not]) => (
            <li key={yol} className='liste-satir'>
              <button className='arac-satir' onClick={() => onGit?.(yol)}>
                <span>
                  <span className='liste-ad'>{ad}</span>
                  <span className='liste-alt'>{not}</span>
                </span>
                {yol === '/veli-ozetleri' && bekleyenOzet > 0 && (
                  <span className='arac-rozet' aria-hidden='true'>{bekleyenOzet}</span>
                )}
                <svg viewBox='0 0 24 24' width='16' height='16' fill='none' stroke='currentColor'
                     strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
                  <path d='m9 6 6 6-6 6' />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      </Kart>

      {/* Telefon değişir, hesap kaybolur. Bunlar geliştiriciye sorulacak
          şeyler değil: koç kendi bağlantısını buradan kurar ve koparır. */}
      <TelegramBaglanti />

      <Kart
        baslik='Raporlar'
        altBaslik='Seçtiğin dönemin toplu görüntüsü'
        eylem={
          <Dugme tur='ikincil' onClick={yukle} disabled={veri === null}>
            Yenile
          </Dugme>
        }
      >
        <div className='tur-secim'>
          {ARALIKLAR.map(([ad, etiket]) => (
            <button
              key={ad}
              className={aralik === ad ? 'tur-cip tur-cip--etkin' : 'tur-cip'}
              onClick={() => aralikSec(ad)}
            >
              {etiket}
            </button>
          ))}
        </div>

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
        <Uyari tur='bilgi'>{bilgi}</Uyari>

        {veri === null ? (
          <Yukleniyor />
        ) : veri === false ? (
          <Bos baslik='Rapor alınamadı' aciklama='Yenile diyerek tekrar dene.' />
        ) : (
          <>
            <div className='kpi-satir rapor-kpi'>
              <div className='kpi-kart'>
                <p className='kpi-etiket'>Toplam çalışma</p>
                <p className='kpi-sayi'>{saatDakika(g.toplam_dakika ?? 0)}</p>
                <p className='kpi-alt'>{veri.gun_sayisi} günde</p>
              </div>
              <div className='kpi-kart'>
                <p className='kpi-etiket'>Görev tamamlama</p>
                <p className='kpi-sayi'>
                  {g.tamamlama_yuzdesi == null ? '—' : `%${g.tamamlama_yuzdesi}`}
                </p>
                <p
                  className={
                    (g.tamamlama_yuzdesi ?? 0) >= 60 ? 'kpi-alt kpi-alt--iyi' : 'kpi-alt kpi-alt--kotu'
                  }
                >
                  {g.gorev_tamam ?? 0} / {g.gorev_toplam ?? 0} görev
                </p>
              </div>
              <div className='kpi-kart'>
                <p className='kpi-etiket'>Öğrenci</p>
                <p className='kpi-sayi'>{g.ogrenci_sayisi ?? 0}</p>
                <p className='kpi-alt'>
                  {ogrenciler.filter((o) => (o.dakika ?? 0) > 0).length} tanesi çalıştı
                </p>
              </div>
              <div className='kpi-kart'>
                <p className='kpi-etiket'>Deneme</p>
                <p className='kpi-sayi'>{g.deneme_sayisi ?? 0}</p>
                <p className='kpi-alt'>bu dönemde girildi</p>
              </div>
            </div>

            <GunlukGrafik gunler={veri.gunluk} />
          </>
        )}
      </Kart>

      <Kart baslik='Öğrenci dağılımı' altBaslik='Çalışma süresine göre sıralı'>
        {veri === null ? (
          <Yukleniyor />
        ) : ogrenciler.length === 0 ? (
          <Bos baslik='Aktif öğrenci yok' />
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
                      <div className='hedef-cubuk rapor-cubuk'>
                        <div
                          className='hedef-dolgu'
                          style={{ width: `${Math.round(((o.dakika ?? 0) / enUzun) * 100)}%` }}
                        />
                      </div>
                    </div>
                    {durgun ? (
                      <Rozet ton='uyari'>durgun</Rozet>
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
      </Kart>

      <Kart
        baslik='E-posta gönderimi'
        altBaslik='Veli raporları özet yayınlanınca kendiliğinden gider'
      >
        <div className='rapor-eylemler'>
          <Dugme onClick={kuyrugaAt} bekliyor={islemde === 'gonder'} disabled={!veri}>
            Bu raporu bana gönder
          </Dugme>
          <Dugme tur='ikincil' onClick={testMaili} bekliyor={islemde === 'test'}>
            Test maili
          </Dugme>
        </div>

        {gecmis === null ? (
          <Yukleniyor />
        ) : gecmis.length === 0 ? (
          <Bos
            baslik='Henüz mail gitmedi'
            aciklama='Önce test maili göndererek altyapının çalıştığını doğrula.'
          />
        ) : (
          <ul className='liste rapor-gecmis'>
            {gecmis.map((m) => (
              <li key={m.id} className='liste-satir'>
                <div className='rapor-satir-metin'>
                  <span className='liste-ad'>{m.konu}</span>
                  <span className='liste-alt'>
                    {TIP_YAZI[m.rapor_tipi] ?? m.rapor_tipi} ·{' '}
                    {new Date(m.gonderildi_zaman ?? m.olusturuldu).toLocaleString('tr-TR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {m.durum === 'hata' && m.hata_mesaji && (
                    <span className='rapor-hata'>{m.hata_mesaji}</span>
                  )}
                </div>
                <Rozet
                  ton={m.durum === 'hata' ? 'uyari' : m.durum === 'gonderildi' ? 'notr' : 'sonuk'}
                >
                  {DURUM_YAZI[m.durum] ?? m.durum}
                </Rozet>
              </li>
            ))}
          </ul>
        )}
      </Kart>

      {/* Öğrencilere ve velilere o hafta ne gittiğini koçun da görmesi
          gerekiyor; aynı bileşen, aynı veri. */}
      <HaftalikIlham />
    </>
  )
}
