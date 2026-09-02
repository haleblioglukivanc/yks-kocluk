import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { Alan, Bos, Dugme, Kart, Rozet, Uyari, Yukleniyor } from '../bilesenler/Ortak.jsx'
import { kullaniciOlustur } from '../lib/hesap.js'
import HaftalikTakvim from '../bilesenler/HaftalikTakvim.jsx'

/* Koç paneli "bugün ne oluyor" sorusuna cevap veriyor. Burası başka bir
   soruya cevap veriyor: sistem çalışıyor mu, nereden sızdırıyor.

   Bu yüzden ekrandaki asıl nesne öğrenci değil koç. Öğrenci listesi de
   var ama koç adıyla birlikte: yönetici için soru "kim düşüyor" değil,
   "kimin öğrencisi düşüyor".

   Bütün veriler yonetici_* RPC'lerinden geliyor; her biri sunucuda
   private.yonetici_mi() ile kilitli. Ekranın gizlenmesi yetmez, veri de
   kapalı olmalı. */

const SAAT_ESIGI = 24 // bir günü geçen bekleme uyarı sayılıyor
const YANITSIZ_ESIGI = 1

function saatMetni(s) {
  if (s == null) return '—'
  if (s < 1) return '<1sa'
  if (s < 48) return `${Math.round(s)}sa`
  return `${Math.round(s / 24)}g`
}

/* Para her yerde ayni okunmali: kurus yok, binlik ayraci var.
   Tutarlar buyuk ve alt alta; ondalik hem yer kapliyor hem hizayi bozuyor. */
const paraBicimi = new Intl.NumberFormat('tr-TR', {
  style: 'currency', currency: 'TRY', maximumFractionDigits: 0,
})
const para = (t) => paraBicimi.format(Number(t ?? 0))

function yuzde(pay, payda) {
  if (!payda) return null
  return Math.round((100 * pay) / payda)
}

/* Bir koçun satırında uyarı çıkması için somut bir gecikme lazım.
   "Skoru düşük" demek yerine ne olduğunu yazıyoruz: yönetici sayıya
   değil, konuşulacak konuya ihtiyaç duyuyor. */
function kocUyarisi(k) {
  const sebep = []
  if (k.bekleyen_onay > 0 && k.onay_en_eski_saat >= SAAT_ESIGI) {
    sebep.push(`${k.bekleyen_onay} konu onayı bekliyor, en eskisi ${saatMetni(k.onay_en_eski_saat)}`)
  }
  if (k.yanitsiz_mesaj >= YANITSIZ_ESIGI) {
    sebep.push(`${k.yanitsiz_mesaj} mesaj yanıtsız`)
  }
  const acik = k.ozet_hazir - k.ozet_yayinda
  if (acik > 0) sebep.push(`${acik} veli özeti yayınlanmadı`)
  if (k.sessiz_ogrenci > 0) sebep.push(`${k.sessiz_ogrenci} öğrenci 5 gündür sessiz`)
  return sebep
}

function Nabiz({ n }) {
  const hedefYuzde = yuzde(n.hedef_tutturan, n.hedefi_olan)
  const ozetYuzde = yuzde(n.ozet_yayinlanan, n.ozet_hazirlanan)
  const ozetFark =
    ozetYuzde != null && n.ozet_onceki_yuzde != null ? ozetYuzde - n.ozet_onceki_yuzde : null
  const kopanFark = n.kopan - n.kopan_onceki

  return (
    <div className="kpi-satir">
      <div className="kpi-kart kpi-kart--serin">
        <p className="kpi-etiket">Aktif öğrenci</p>
        <p className="kpi-sayi">{n.aktif_ogrenci}</p>
        <p className={`kpi-alt ${n.yeni_ogrenci > 0 ? 'kpi-alt--iyi' : ''}`}>
          {n.yeni_ogrenci > 0 ? `bu hafta +${n.yeni_ogrenci}` : 'bu hafta yeni kayıt yok'}
        </p>
      </div>

      <div className={`kpi-kart ${n.kopan > 0 ? 'kpi-kart--sicak' : 'kpi-kart--serin'}`}>
        <p className="kpi-etiket">Sessiz öğrenci</p>
        <p className="kpi-sayi">{n.kopan}</p>
        <p className={`kpi-alt ${kopanFark > 0 ? 'kpi-alt--kotu' : 'kpi-alt--iyi'}`}>
          {n.kopan === 0 ? 'kimse 5 günü geçmedi' : '5 gün ve üzeri'}
        </p>
      </div>

      <div
        className={`kpi-kart ${hedefYuzde != null && hedefYuzde < 50 ? 'kpi-kart--sicak' : 'kpi-kart--serin'}`}
      >
        <p className="kpi-etiket">Haftalık hedefi tutturan</p>
        <p className="kpi-sayi">{hedefYuzde == null ? '—' : `%${hedefYuzde}`}</p>
        <p className="kpi-alt">
          {n.hedefi_olan === 0
            ? 'hedef tanımlı öğrenci yok'
            : `${n.hedef_tutturan}/${n.hedefi_olan} öğrenci`}
        </p>
      </div>

      <div
        className={`kpi-kart ${ozetYuzde != null && ozetYuzde < 90 ? 'kpi-kart--sicak' : 'kpi-kart--serin'}`}
      >
        <p className="kpi-etiket">Veli özeti yayınlanan</p>
        <p className="kpi-sayi">{ozetYuzde == null ? '—' : `%${ozetYuzde}`}</p>
        <p className={`kpi-alt ${ozetFark < 0 ? 'kpi-alt--kotu' : ozetFark > 0 ? 'kpi-alt--iyi' : ''}`}>
          {n.ozet_hazirlanan === 0
            ? 'bu haftanın taslakları henüz yok'
            : ozetFark == null
              ? `${n.ozet_yayinlanan}/${n.ozet_hazirlanan} taslak`
              : `geçen haftaya göre ${ozetFark > 0 ? '+' : ''}${ozetFark}`}
        </p>
      </div>
    </div>
  )
}

function Koclar({ liste }) {
  if (!liste?.length) {
    return (
      <Kart baslik="Koçlar" altBaslik="Öğrenciye ne kadar hızlı dönülüyor">
        <Bos baslik="Kayıtlı koç yok" />
      </Kart>
    )
  }

  return (
    <Kart baslik="Koçlar" altBaslik="Öğrenciye ne kadar hızlı dönülüyor">
      <ul className="liste">
        {liste.map((k) => {
          const uyari = kocUyarisi(k)
          const ozetYuzde = yuzde(k.ozet_yayinda, k.ozet_hazir)
          return (
            <li key={k.koc_id} className="yk-koc">
              <span className="liste-ad">{k.ad_soyad}</span>
              <span className="yk-yuk">{k.ogrenci_sayisi} öğrenci</span>
              <div className="yk-olcum">
                <span>
                  Bekleyen onay<b>{k.bekleyen_onay}</b>
                </span>
                <span>
                  Yanıt<b>{saatMetni(k.yanit_saat)}</b>
                </span>
                <span>
                  Veli özeti<b>{ozetYuzde == null ? '—' : `%${ozetYuzde}`}</b>
                </span>
              </div>
              {uyari.length > 0 && <p className="yk-uyari">{uyari.join(' · ')}</p>}
            </li>
          )
        })}
      </ul>
    </Kart>
  )
}

function Risk({ liste, onOgrenciAc }) {
  if (!liste?.length) {
    return (
      <Kart baslik="Kopma riski" altBaslik="Koçu henüz dokunmamış öğrenciler">
        <Bos
          baslik="Listede kimse yok"
          aciklama="Şu an hiçbir öğrenci risk eşiğini geçmiş görünmüyor."
        />
      </Kart>
    )
  }

  return (
    <Kart baslik="Kopma riski" altBaslik="Koçu henüz dokunmamış öğrenciler">
      <ul className="liste">
        {liste.map((o) => (
          <li key={o.ogrenci_id} className="liste-satir">
            <button className="yk-baglanti" onClick={() => onOgrenciAc(o.ogrenci_id)}>
              <span className="liste-ad">{o.ad_soyad}</span>
              <span className="liste-alt">
                {o.sessiz_gun > 0 ? `${o.sessiz_gun} gündür kayıt yok` : 'seri kırıldı'}
                {o.koc_adi ? ` · ${o.koc_adi}` : ''}
              </span>
            </button>
            <Rozet ton={o.seviye === 'acil' ? 'uyari' : 'izle'}>{o.seviye}</Rozet>
          </li>
        ))}
      </ul>
    </Kart>
  )
}

const MAIL_ADI = {
  bekliyor: 'Kuyrukta',
  gonderiliyor: 'Gönderiliyor',
  gonderildi: 'Gönderildi',
  hata: 'Hata',
  iptal: 'İptal',
}

/* Kuyrugun sagligi cron'un raporundan okunamaz: gonderici anahtari
   bulamayinca sessizce vazgeciyor ve cron yine "basarili" diyor. Tek
   guvenilir olcu, en eski bekleyen kaydin yasi. */
const KUYRUK_ESIGI_SAAT = 1

function mailDurumu(s) {
  const bekleme = s.mail_bekleme_saat
  if (bekleme == null) return { ton: 'iyi', etiket: 'normal', not: null }
  if (s.servis_anahtari_var === false) {
    return {
      ton: 'uyari',
      etiket: 'durdu',
      not: 'Vault içinde servis_anahtari yok; gönderici hiç çağrılmıyor.',
    }
  }
  if (bekleme >= KUYRUK_ESIGI_SAAT) {
    return {
      ton: 'uyari',
      etiket: 'takıldı',
      not: `En eski kayıt ${saatMetni(bekleme)} bekliyor.`,
    }
  }
  return { ton: 'iyi', etiket: 'normal', not: null }
}

function Sistem({ s }) {
  const mail = mailDurumu(s)

  return (
    <Kart baslik="Sistem" altBaslik="Arka planda çalışanlar">
      <ul className="liste">
        {(s.isler ?? []).map((i) => (
          <li key={i.ad} className="liste-satir">
            <div>
              <span className="liste-ad">{i.ad}</span>
              <span className="liste-alt">
                {i.zamanlama}
                {i.son_zaman ? ` · son ${new Date(i.son_zaman).toLocaleString('tr-TR')}` : ' · hiç çalışmadı'}
              </span>
            </div>
            <Rozet ton={i.son_durum === 'succeeded' && i.etkin ? 'iyi' : 'uyari'}>
              {!i.etkin ? 'kapalı' : i.son_durum === 'succeeded' ? 'çalıştı' : (i.son_durum ?? 'bilinmiyor')}
            </Rozet>
          </li>
        ))}

        <li className="liste-satir">
          <div>
            <span className="liste-ad">E‑posta kuyruğu</span>
            <span className="liste-alt">
              {Object.entries(s.mail ?? {})
                .map(([d, a]) => `${MAIL_ADI[d] ?? d}: ${a}`)
                .join(' · ') || 'kuyruk boş'}
            </span>
            {mail.not && <span className="yk-uyari yk-uyari--satir">{mail.not}</span>}
          </div>
          <Rozet ton={mail.ton}>{mail.etiket}</Rozet>
        </li>

        <li className="liste-satir">
          <div>
            <span className="liste-ad">Kâmil olayları</span>
            <span className="liste-alt">
              son 7 günde {s.kalem_olay_7g} tetiklenme · {s.kalem_kapatilan_7g} tanesi kapatıldı
            </span>
          </div>
          <Rozet ton="iyi">normal</Rozet>
        </li>
      </ul>
    </Kart>
  )
}

function Vekalet({ liste }) {
  return (
    <Kart baslik="Öğrenci adına yapılan işlemler" altBaslik="Vekâlet modunda son 7 gün">
      {!liste?.length ? (
        <Bos
          baslik="Kayıt yok"
          aciklama="Son bir haftada hiçbir koç öğrenci adına işlem yapmamış."
        />
      ) : (
        <ul className="liste">
          {liste.map((v, i) => (
            <li key={i} className="liste-satir">
              <div>
                <span className="liste-ad">
                  {v.yapan} → {v.ogrenci}
                </span>
                <span className="liste-alt">
                  {v.ne}
                  {v.adet > 1 ? ` · ${v.adet} kayıt` : ''} ·{' '}
                  {new Date(v.zaman).toLocaleString('tr-TR')}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Kart>
  )
}

function Tahsilat({ t, onOgrenciAc }) {
  const fark = Number(t.bu_ay_tahsil) - Number(t.gecen_ay_tahsil)
  return (
    <>
      <div className="kpi-satir">
        <div className="kpi-kart kpi-kart--serin">
          <p className="kpi-etiket">Bu ay tahsil edilen</p>
          <p className="kpi-sayi kpi-sayi--para">{para(t.bu_ay_tahsil)}</p>
          <p className={`kpi-alt ${fark < 0 ? 'kpi-alt--kotu' : fark > 0 ? 'kpi-alt--iyi' : ''}`}>
            geçen ay {para(t.gecen_ay_tahsil)}
          </p>
        </div>
        <div className={`kpi-kart ${t.geciken_adet > 0 ? 'kpi-kart--sicak' : 'kpi-kart--serin'}`}>
          <p className="kpi-etiket">Geciken</p>
          <p className="kpi-sayi kpi-sayi--para">{para(t.geciken_tutar)}</p>
          <p className={`kpi-alt ${t.geciken_adet > 0 ? 'kpi-alt--kotu' : 'kpi-alt--iyi'}`}>
            {t.geciken_adet > 0
              ? `${t.geciken_kisi} öğrenci · ${t.geciken_adet} taksit`
              : 'geciken yok'}
          </p>
        </div>
      </div>

      <Kart
        baslik="Tahsilat"
        altBaslik={`${t.aktif_sozlesme} aktif sözleşme · açık bakiye ${para(t.acik_bakiye)}`}
      >
        {!t.gecikenler?.length ? (
          <Bos
            baslik="Geciken ödeme yok"
            aciklama={`Bu ay vadesi gelen ${para(t.bu_ay_vade)} tahsil edilmeyi bekliyor.`}
          />
        ) : (
          <ul className="liste">
            {t.gecikenler.map((g) => (
              <li key={g.ogrenci_id} className="liste-satir">
                <button className="yk-baglanti" onClick={() => onOgrenciAc(g.ogrenci_id)}>
                  <span className="liste-ad">{g.ogrenci}</span>
                  <span className="liste-alt">
                    {g.taksit > 1 ? `${g.taksit} taksit · en eskisi ` : ''}
                    {g.gun} gün gecikti
                  </span>
                </button>
                <span className="yk-tutar">{para(g.kalan)}</span>
              </li>
            ))}
          </ul>
        )}
      </Kart>
    </>
  )
}

/* Koc hesabini yalnizca yonetici acabiliyor; kural sunucuda, bu form
   onun ekrandaki karsiligi. Gecici sifre bir kez gosteriliyor ve
   hicbir yere yazilmiyor: kaybolursa yenisi uretilir. */
function KocEkle({ liste, onEklendi }) {
  const [acik, setAcik] = useState(false)
  const [adSoyad, setAdSoyad] = useState('')
  const [eposta, setEposta] = useState('')
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState(null)
  const [sonuc, setSonuc] = useState(null)

  async function gonder() {
    setHata(null)
    setBekliyor(true)
    try {
      const d = await kullaniciOlustur({
        rol: 'koc',
        ad_soyad: adSoyad.trim(),
        eposta: eposta.trim(),
      })
      setSonuc(d)
      setAdSoyad('')
      setEposta('')
      await onEklendi()
    } catch (e) {
      setHata(e.message ?? 'Koç eklenemedi.')
    } finally {
      setBekliyor(false)
    }
  }

  return (
    <Kart
      baslik="Koçlar ve yetkiler"
      altBaslik={`${liste.length} kişi`}
      eylem={
        <button className="dugme dugme--ikincil dugme--ufak" onClick={() => setAcik((a) => !a)}>
          {acik ? 'Kapat' : 'Koç ekle'}
        </button>
      }
    >
      <ul className="liste">
        {liste.map((k) => (
          <li key={k.koc_id} className="liste-satir">
            <div>
              <span className="liste-ad">{k.ad_soyad}</span>
              <span className="liste-alt">
                {k.rol === 'yonetici' ? 'Yönetici · koçluk da yapıyor' : 'Koç'} ·{' '}
                {k.ogrenci_sayisi} öğrenci
              </span>
            </div>
          </li>
        ))}
      </ul>

      {acik && (
        <div className="yk-form">
          <Alan etiket="Ad soyad">
            <input value={adSoyad} onChange={(e) => setAdSoyad(e.target.value)} autoComplete="off" />
          </Alan>
          <Alan
            etiket="E‑posta"
            ipucu="Geçici şifre üretilir; koç ilk girişte kendi şifresini belirler."
          >
            <input
              type="email"
              value={eposta}
              onChange={(e) => setEposta(e.target.value)}
              autoComplete="off"
            />
          </Alan>
          <Uyari>{hata}</Uyari>
          <Dugme
            onClick={gonder}
            bekliyor={bekliyor}
            disabled={adSoyad.trim().length < 2 || !eposta.includes('@')}
          >
            Koç hesabı aç
          </Dugme>
        </div>
      )}

      {sonuc && (
        <div className="yk-sonuc">
          <p className="liste-ad">{sonuc.ad_soyad} eklendi</p>
          <p className="liste-alt">
            {sonuc.eposta} · geçici şifre <code className="kod-rozet">{sonuc.gecici_sifre}</code>
          </p>
          <p className="liste-alt">
            Şifre bir daha gösterilmiyor. Koça ilettikten sonra bu kutuyu kapatabilirsin.
          </p>
          <button className="dugme dugme--ikincil dugme--ufak" onClick={() => setSonuc(null)}>
            Anladım
          </button>
        </div>
      )}
    </Kart>
  )
}

const AYARLAR = [
  ['/raporlar', 'Rapor ve e‑posta', 'Veli ve öğrenci raporlarının gönderim düzeni'],
  ['/konular', 'Konu öncelikleri', 'Sınıf geneli ağırlıklar ve toplu görev atama'],
  ['/kaynaklar', 'Kaynaklar', 'Kitap ve soru bankası kataloğu'],
]

function Ayarlar({ onGit }) {
  return (
    <Kart baslik="Platform ayarları" altBaslik="Koç ekranında görünmez">
      <ul className="liste">
        {AYARLAR.map(([yol, ad, not]) => (
          <li key={yol} className="liste-satir">
            <button className="yk-baglanti" onClick={() => onGit(yol)}>
              <span className="liste-ad">{ad}</span>
              <span className="liste-alt">{not}</span>
            </button>
            <span className="yk-ok" aria-hidden="true">
              ›
            </span>
          </li>
        ))}
      </ul>
    </Kart>
  )
}

export default function YoneticiPaneli({ profil, onOgrenciAc, onGit }) {
  const [veri, setVeri] = useState(null)
  const [hata, setHata] = useState(null)

  const yukle = useCallback(async () => {
    const [nabiz, koclar, risk, sistem, vekalet, tahsilat] = await Promise.all([
      supabase.rpc('yonetici_nabzi'),
      supabase.rpc('yonetici_koc_performansi'),
      supabase.rpc('yonetici_risk_listesi', { p_limit: 5 }),
      supabase.rpc('yonetici_sistem_durumu'),
      supabase.rpc('yonetici_vekalet_kayitlari', { p_limit: 8 }),
      supabase.rpc('yonetici_tahsilat_ozeti'),
    ])
    const ilkHata = [nabiz, koclar, risk, sistem, vekalet, tahsilat].find((c) => c.error)
    if (ilkHata) {
      setHata(ilkHata.error.message)
      return
    }
    setVeri({
      nabiz: nabiz.data,
      koclar: koclar.data,
      risk: risk.data,
      sistem: sistem.data,
      vekalet: vekalet.data,
      tahsilat: tahsilat.data,
    })
  }, [])

  useEffect(() => {
    yukle()
  }, [yukle])

  return (
    <>
      <div className="yk-basi">
        <div>
          <h1 className="yk-ad">{profil.ad_soyad}</h1>
          <p className="yk-gun">
            {new Date().toLocaleDateString('tr-TR', {
              day: 'numeric',
              month: 'long',
              weekday: 'long',
            })}
          </p>
        </div>
      </div>

      {hata && (
        <Kart baslik="Veri gelmedi">
          <p className="kart-alt">{hata}</p>
        </Kart>
      )}

      {!veri && !hata && <Yukleniyor metin="Kurum verisi geliyor" satir={4} />}

      {veri && (
        <>
          <Nabiz n={veri.nabiz} />
          <Koclar liste={veri.koclar} />
          <Risk liste={veri.risk} onOgrenciAc={onOgrenciAc} />
          <Tahsilat t={veri.tahsilat} onOgrenciAc={onOgrenciAc} />
          <Sistem s={veri.sistem} />
          <Vekalet liste={veri.vekalet} />

          {/* Haftalik Ilham takvimi icerik kuratorlugu: koc gorunen hali
              okuyor, 12 haftalik plani yonetici kuruyor. */}
          <HaftalikTakvim />

          <KocEkle liste={veri.koclar} onEklendi={yukle} />
          <Ayarlar onGit={onGit} />
        </>
      )}
    </>
  )
}
