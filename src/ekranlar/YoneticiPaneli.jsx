import Sayan from '../bilesenler/Sayan.jsx'
import Sekmeler from '../ortak/Sekmeler.jsx'
import UstBlok from '../ortak/UstBlok.jsx'
import Bolum from '../ortak/Bolum.jsx'
import BosDurum from '../ortak/BosDurum.jsx'
import UyariSatiri from '../ortak/UyariSatiri.jsx'
import SifreSifirla from '../bilesenler/SifreSifirla.jsx'
import { useCallback, useEffect, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { Alan, Dugme, Uyari, Yukleniyor } from '../bilesenler/Ortak.jsx'
import { kullaniciOlustur } from '../lib/hesap.js'
import HaftalikTakvim from '../bilesenler/HaftalikTakvim.jsx'
import SosyalKutusu from '../bilesenler/SosyalKutusu.jsx'
import EpostaKaydi from '../bilesenler/EpostaKaydi.jsx'
import TelegramBaglanti from '../bilesenler/TelegramBaglanti.jsx'

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
        <p className="kpi-sayi"><Sayan deger={n.aktif_ogrenci} /></p>
        <p className={`kpi-alt ${n.yeni_ogrenci > 0 ? 'kpi-alt--iyi' : ''}`}>
          {n.yeni_ogrenci > 0 ? `bu hafta +${n.yeni_ogrenci}` : 'bu hafta yeni kayıt yok'}
        </p>
      </div>

      <div className={`kpi-kart ${n.kopan > 0 ? 'kpi-kart--sicak' : 'kpi-kart--serin'}`}>
        <p className="kpi-etiket">Sessiz öğrenci</p>
        <p className="kpi-sayi"><Sayan deger={n.kopan} /></p>
        <p className={`kpi-alt ${kopanFark > 0 ? 'kpi-alt--kotu' : 'kpi-alt--iyi'}`}>
          {n.kopan === 0 ? 'kimse 5 günü geçmedi' : '5 gün ve üzeri'}
        </p>
      </div>

      <div
        className={`kpi-kart ${hedefYuzde != null && hedefYuzde < 50 ? 'kpi-kart--sicak' : 'kpi-kart--serin'}`}
      >
        <p className="kpi-etiket">Haftalık hedefi tutturan</p>
        <p className="kpi-sayi">{hedefYuzde == null ? '—' : <Sayan on="%" deger={hedefYuzde} />}</p>
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
        <p className="kpi-sayi">{ozetYuzde == null ? '—' : <Sayan on="%" deger={ozetYuzde} />}</p>
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

/* Yöneticilik rolün değil, ayrı bir yetki: anahtar açılıp kapanıyor.
   Son yöneticiyi kapatmayı veritabanı engelliyor; buradaki hata mesajı
   oradan geliyor. */
function YoneticiAnahtari({ koc, onDegisti, onHata }) {
  const [bekliyor, setBekliyor] = useState(false)

  async function cevir() {
    setBekliyor(true)
    onHata('')
    const { error } = await supabase.rpc('yonetici_yetkisi', {
      p_kisi: koc.koc_id,
      p_ac: !koc.yonetici,
    })
    setBekliyor(false)
    if (error) {
      onHata(hataMetni(error))
      return
    }
    onDegisti()
  }

  return (
    <button
      type="button"
      role="switch"
      className={koc.yonetici ? 'yk-anahtar yk-anahtar--acik' : 'yk-anahtar'}
      onClick={cevir}
      disabled={bekliyor}
      aria-checked={koc.yonetici}
      aria-label={`${koc.ad_soyad} yönetici yetkisi`}
    >
      <span>Yönetici</span>
      <span className="yk-anahtar-kutu" aria-hidden="true" />
    </button>
  )
}

/* Koçlar tek listede: performans, yetki ve ekleme aynı yerde. Eskiden
   "Koçlar" ve "Koçlar ve yetkiler" iki ayrı kartta aynı kişileri iki kez
   sayıyordu (Yönetim turu, 19 Eylül 2026). */
function Koclar({ liste, onDegisti, benId }) {
  const [hata, setHata] = useState('')
  const [formAcik, setFormAcik] = useState(false)
  return (
    <Bolum
      baslik="Koçlar"
      sayi={liste?.length ?? 0}
      aciklama="Öğrenciye ne kadar hızlı dönüldüğü ve yetkiler tek listede."
      eylem={formAcik ? 'Kapat' : '+ Koç ekle'}
      onEylem={() => setFormAcik((a) => !a)}
    >
      {formAcik && <KocEkle onEklendi={onDegisti} />}
      <Uyari>{hata}</Uyari>
      {!liste?.length ? (
        <BosDurum metin="Kayıtlı koç yok." />
      ) : (
        <ul className="liste yk-koc-liste">
          {liste.map((k) => {
            const uyari = kocUyarisi(k)
            const ozetYuzde = yuzde(k.ozet_yayinda, k.ozet_hazir)
            return (
              <li key={k.koc_id} className="yk-koc">
                <div className="yk-koc-bas">
                  <span className="yk-koc-kimlik">
                    <span className="liste-ad">{k.ad_soyad}</span>
                    <span className="liste-alt">
                      {k.ogrenci_sayisi} öğrenci · bekleyen onay <b>{k.bekleyen_onay}</b> · yanıt {saatMetni(k.yanit_saat)} · veli özeti {ozetYuzde == null ? '—' : `%${ozetYuzde}`}
                    </span>
                  </span>
                  <YoneticiAnahtari koc={k} onDegisti={onDegisti} onHata={setHata} />
                </div>
                {uyari.length > 0 && <UyariSatiri durum="acil">{uyari.join(' · ')}</UyariSatiri>}
                {/* Kendi şifreni buradan değil hesap menüsünden değiştirirsin. */}
                {k.koc_id !== benId && <SifreSifirla kisiId={k.koc_id} ad={k.ad_soyad} />}
              </li>
            )
          })}
        </ul>
      )}
    </Bolum>
  )
}

function Risk({ liste, onOgrenciAc }) {
  return (
    <Bolum cizgili baslik="Önce bunlar" sayi={liste?.length || null} aciklama="Koçu henüz dokunmamış, kopma riskindeki öğrenciler.">
      {!liste?.length ? (
        <BosDurum metin="Şu an hiçbir öğrenci risk eşiğini geçmiş görünmüyor." />
      ) : (
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
              <span className="durum-yazi" data-durum={o.seviye === 'acil' ? 'uyari' : 'izle'}>
                ● {o.seviye === 'acil' ? 'Acil' : 'İzle'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Bolum>
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

/* Cron "succeeded" demesi isin yurudugu anlamina gelmiyor: gonderici
   anahtari bulamayinca sessizce vazgeciyordu ve kuyruk uc gun bekledi.
   Arka plan isleri artik kendi hatalarini private.sistem_gunlugu'ne
   yaziyor. Kart cron'un raporuna degil bu listeye bakiyor. */
function ayrintiMetni(a) {
  if (!a || typeof a !== 'object') return null
  const parcalar = Object.entries(a)
    .filter(([, d]) => d !== null && d !== undefined && typeof d !== 'object')
    .map(([k, d]) => `${k.replace(/_/g, ' ')}: ${d}`)
  return parcalar.length ? parcalar.join(' · ') : null
}

function kisaZaman(z) {
  if (!z) return ''
  return new Date(z).toLocaleString('tr-TR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

// Cron ifadesi yerine okunur zaman ("iki dakikada bir"); tanınmayan kalıp olduğu gibi kalır.
function cronOku(z) {
  const p = String(z ?? '').trim().split(/\s+/)
  if (p.length !== 5) return z ?? ''
  const [dk, sa, gun, ay, hg] = p
  const iki = (n) => String(n).padStart(2, '0')
  if (gun === '*' && ay === '*' && hg === '*') {
    if (dk === '*' && sa === '*') return 'dakikada bir'
    if (/^\*\/\d+$/.test(dk) && sa === '*') return `${dk.slice(2)} dakikada bir`
    if (/^\d+$/.test(dk) && sa === '*') return `saatte bir (:${iki(dk)})`
    if (/^\d+$/.test(dk) && /^\d+$/.test(sa)) return `her gün ${iki(sa)}:${iki(dk)}`
  }
  return z
}

const kisaSaat = (z) =>
  z ? new Date(z).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : null

function Sistem({ s }) {
  const mail = mailDurumu(s)
  const gunluk = s.gunluk ?? []
  const hata24s = Number(s.gunluk_hata_24s ?? 0)
  const [hepsi, setHepsi] = useState(false)
  const isler = s.isler ?? []
  const saglam = isler.filter((i) => i.etkin && i.son_durum === 'succeeded').length

  return (
    <>
      <Bolum
        baslik="Arka planda çalışanlar"
        sayi={isler.length}
        aciklama={`${saglam} çalıştı${isler.length - saglam ? ` · ${isler.length - saglam} dikkat` : ''}`}
      >
        <ul className="liste">
          {isler.map((i) => {
            const iyi = i.son_durum === 'succeeded' && i.etkin
            return (
              <li key={i.ad} className="liste-satir">
                <div>
                  <span className="liste-ad">{i.ad}</span>
                  <span className="liste-alt">
                    {cronOku(i.zamanlama)} · {i.son_zaman ? `son ${kisaSaat(i.son_zaman)}` : 'hiç çalışmadı'}
                  </span>
                </div>
                <span className="durum-yazi" data-durum={iyi ? 'iyi' : 'uyari'}>
                  ● {!i.etkin ? 'Kapalı' : i.son_durum === 'succeeded' ? 'Çalıştı' : (i.son_durum ?? 'Bilinmiyor')}
                </span>
              </li>
            )
          })}
          <li className="liste-satir">
            <div>
              <span className="liste-ad">E‑posta kuyruğu</span>
              <span className="liste-alt">
                {Object.entries(s.mail ?? {})
                  .map(([d, a]) => `${MAIL_ADI[d] ?? d}: ${a}`)
                  .join(' · ') || 'kuyruk boş'}
                {mail.not ? ` · ${mail.not}` : ''}
              </span>
            </div>
            <span className="durum-yazi" data-durum={mail.ton === 'iyi' ? 'iyi' : 'uyari'}>● {mail.etiket}</span>
          </li>
          <li className="liste-satir">
            <div>
              <span className="liste-ad">Çizbi olayları</span>
              <span className="liste-alt">
                son 7 günde {s.kalem_olay_7g} tetiklenme · {s.kalem_kapatilan_7g} tanesi kapatıldı
              </span>
            </div>
            <span className="durum-yazi" data-durum="iyi">● normal</span>
          </li>
        </ul>
      </Bolum>

      <Bolum
        cizgili
        baslik="Arka plan hataları"
        sayi={gunluk.length || null}
        eylem={gunluk.length > 3 ? (hepsi ? 'Kısalt' : `Tümü · ${gunluk.length}`) : null}
        onEylem={() => setHepsi((v) => !v)}
      >
        {gunluk.length === 0 ? (
          <BosDurum metin="Son 7 günde kayıt yok." />
        ) : (
          <>
            <UyariSatiri durum={hata24s > 0 ? 'acil' : 'izle'}>
              Son 24 saatte {hata24s} · son 7 günde {gunluk.length}
            </UyariSatiri>
            <ul className="liste">
              {(hepsi ? gunluk : gunluk.slice(0, 3)).map((g) => {
                const ayrinti = ayrintiMetni(g.ayrinti)
                return (
                  <li key={g.id} className="liste-satir">
                    <div>
                      <span className="liste-ad">{g.kaynak} · {kisaZaman(g.zaman)}</span>
                      <span className="liste-alt">{g.mesaj}{ayrinti ? ` (${ayrinti})` : ''}</span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </Bolum>
    </>
  )
}

function Vekalet({ liste }) {
  return (
    <Bolum cizgili baslik="Öğrenci adına yapılan işlemler" aciklama="Vekâlet modunda son 7 gün.">
      {!liste?.length ? (
        <BosDurum metin="Son bir haftada hiçbir koç öğrenci adına işlem yapmamış." />
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
    </Bolum>
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

      <Bolum
        baslik="Gecikenler"
        sayi={t.gecikenler?.length || null}
        aciklama={`${t.aktif_sozlesme} aktif sözleşme · açık bakiye ${para(t.acik_bakiye)}`}
      >
        {!t.gecikenler?.length ? (
          <BosDurum metin={`Geciken ödeme yok. Bu ay vadesi gelen ${para(t.bu_ay_vade)} tahsil edilmeyi bekliyor.`} />
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
      </Bolum>
    </>
  )
}

/* Koc hesabini yalnizca yonetici acabiliyor; kural sunucuda, bu form
   onun ekrandaki karsiligi. Gecici sifre bir kez gosteriliyor ve
   hicbir yere yazilmiyor: kaybolursa yenisi uretilir. */
function KocEkle({ onEklendi }) {
  const [adSoyad, setAdSoyad] = useState('')
  const [eposta, setEposta] = useState('')
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState(null)
  const [sonuc, setSonuc] = useState(null)

  async function gonder() {
    setHata(null)
    setBekliyor(true)
    try {
      const d = await kullaniciOlustur({ rol: 'koc', ad_soyad: adSoyad.trim(), eposta: eposta.trim() })
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

  if (sonuc) {
    return (
      <div className="form-kutu form-kutu--duz yk-sonuc">
        <p className="liste-ad">{sonuc.ad_soyad} eklendi</p>
        <p className="liste-alt">
          {sonuc.eposta} · geçici şifre <code className="kod-rozet">{sonuc.gecici_sifre}</code>
        </p>
        <p className="liste-alt">Şifre bir daha gösterilmiyor. Koça ilettikten sonra kapatabilirsin.</p>
        <Dugme tur="ikincil" onClick={() => setSonuc(null)}>Anladım</Dugme>
      </div>
    )
  }

  return (
    <div className="form-kutu form-kutu--duz">
      <Alan etiket="Ad soyad">
        <input value={adSoyad} onChange={(e) => setAdSoyad(e.target.value)} autoComplete="off" />
      </Alan>
      <Alan etiket="E‑posta" ipucu="Geçici şifre üretilir; koç ilk girişte kendi şifresini belirler.">
        <input type="email" value={eposta} onChange={(e) => setEposta(e.target.value)} autoComplete="off" />
      </Alan>
      <Uyari>{hata}</Uyari>
      <Dugme onClick={gonder} bekliyor={bekliyor} disabled={adSoyad.trim().length < 2 || !eposta.includes('@')}>
        Koç hesabı aç
      </Dugme>
    </div>
  )
}

const AYARLAR = [
  ['/konular', 'Konu öncelikleri', 'Sınıf geneli ağırlıklar ve toplu görev atama'],
  ['/kaynaklar', 'Kaynaklar', 'Kitap ve soru bankası kataloğu'],
]

function Ayarlar({ onGit }) {
  return (
    <Bolum cizgili baslik="Platform ayarları" aciklama="Koç ekranında görünmez.">
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
    </Bolum>
  )
}

/* Bütün öğrenciler tek tabloda. Koç ekranındaki liste kendi öğrencileriyle
   sınırlı; burası kurumun tamamı, koç filtresiyle. */
const RISK_ADI = { acil: 'Önce bunlar', izle: 'İzle', iyi: 'Yolunda', pasif: 'Pasif' }

function Ogrenciler({ liste, onOgrenciAc }) {
  const [koc, setKoc] = useState('')
  if (!liste?.length) {
    return (
      <Bolum baslik="Öğrenciler">
        <BosDurum metin="Kayıtlı öğrenci yok." />
      </Bolum>
    )
  }
  const koclar = [...new Set(liste.map((o) => o.koc))].sort()
  const suzulmus = koc ? liste.filter((o) => o.koc === koc) : liste

  return (
    <Bolum
      baslik="Öğrenciler"
      sayi={suzulmus.length}
      aciklama="Kurumun tamamı · satıra dokun, öğrenciye git."
      sag={
        koclar.length > 1 ? (
          <select className="yk-koc-suz" value={koc} onChange={(e) => setKoc(e.target.value)} aria-label="Koça göre süz">
            <option value="">Tüm koçlar</option>
            {koclar.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        ) : null
      }
    >
      <div className="yk-tablo-kap">
        <table className="yk-tablo">
          <thead>
            <tr>
              <th>Öğrenci</th><th>Koç</th><th>Tamamlama</th><th>Son net</th>
              <th>Gecikmiş</th><th>Ödeme</th><th>Durum</th>
            </tr>
          </thead>
          <tbody>
            {suzulmus.map((o) => (
              <tr key={o.ogrenciId} onClick={() => onOgrenciAc?.(o.ogrenciId)} tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && onOgrenciAc?.(o.ogrenciId)}>
                <td>{o.ad}</td>
                <td className="yk-sonuk">{o.koc}</td>
                <td className="yk-sayi">{o.tamamlama == null ? '—' : `%${o.tamamlama}`}</td>
                <td className="yk-sayi">{o.sonNet == null ? '—' : Number(o.sonNet).toFixed(2)}</td>
                <td className="yk-sayi">{o.gecikmis ?? 0}</td>
                <td className="yk-sayi">
                  {Number(o.gecikenTutar) > 0
                    ? `${new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(o.gecikenTutar)} ₺`
                    : '—'}
                </td>
                <td><span className="durum-yazi" data-durum={o.risk === 'acil' ? 'uyari' : o.risk === 'izle' ? 'izle' : 'iyi'}>
                  {RISK_ADI[o.risk] ?? o.risk}
                </span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Bolum>
  )
}

const SEKMELER = [
  ['koclar', 'Koçlar'],
  ['ogrenciler', 'Öğrenciler'],
  ['tahsilat', 'Tahsilat'],
  ['sosyal', 'Sosyal'],
  ['sistem', 'Sistem'],
]

export default function YoneticiPaneli({ profil, onOgrenciAc, onGit }) {
  // Acil e-postadaki bağlantı /yonetim#sosyal ile doğrudan bu sekmeyi açar.
  const [sekme, setSekme] = useState(() =>
    typeof window !== 'undefined' && window.location.hash === '#sosyal' ? 'sosyal' : 'koclar')
  const [sosyal, setSosyal] = useState(null)

  // Sekme rozeti: panel açılınca bir kez; Sosyal sekmesi açıkken bileşen günceller.
  useEffect(() => {
    supabase.rpc('sosyal_bekleyen').then(({ data }) => { if (data) setSosyal(data) })
  }, [])
  const [veri, setVeri] = useState(null)
  const [hata, setHata] = useState(null)

  const yukle = useCallback(async () => {
    const [nabiz, koclar, risk, sistem, vekalet, tahsilat, ogrenciler] = await Promise.all([
      supabase.rpc('yonetici_nabzi'),
      supabase.rpc('yonetici_koc_performansi'),
      supabase.rpc('yonetici_risk_listesi', { p_limit: 5 }),
      supabase.rpc('yonetici_sistem_durumu'),
      supabase.rpc('yonetici_vekalet_kayitlari', { p_limit: 8 }),
      supabase.rpc('yonetici_tahsilat_ozeti'),
      supabase.rpc('yonetici_ogrenci_listesi'),
    ])
    const ilkHata = [nabiz, koclar, risk, sistem, vekalet, tahsilat, ogrenciler].find((c) => c.error)
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
      ogrenciler: ogrenciler.data,
    })
  }, [])

  useEffect(() => {
    yukle()
  }, [yukle])

  return (
    <>
      {/* Tek koyu blok: başlık + sekmeler (TASARIM-KURALLARI 3–4). */}
      <UstBlok sinif="rapor-tepe" etiket="Yönetim" sekmeli>
        <h1 className="rt-baslik">Yönetim</h1>
        <p className="rt-alt">
          Kurum geneli · {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' })}
        </p>
        <Sekmeler
          varyant="koyu"
          etiket="Yönetim bölümleri"
          deger={sekme}
          onSec={setSekme}
          secenekler={SEKMELER.map(([k, ad]) => ({
            k,
            ad,
            rozet:
              k === 'sosyal' && sosyal?.bekleyen > 0 ? (
                <span className={sosyal.acil ? 'sekme-rozet sekme-rozet--acil' : 'sekme-rozet'}
                  aria-label={`${sosyal.bekleyen} bekleyen${sosyal.acil ? `, ${sosyal.acil} acil` : ''}`}>
                  {sosyal.bekleyen}
                </span>
              ) : null,
          }))}
        />
      </UstBlok>

      {hata && (
        <Uyari>{`Veri gelmedi: ${hata}`}</Uyari>
      )}

      {!veri && !hata && <Yukleniyor metin="Kurum verisi geliyor" satir={4} />}

      {veri && (
        <>
          <Nabiz n={veri.nabiz} />

          {/* Tek uzun sayfaydı; dokuz kart alt alta diziliyordu. Yönetim
              ayda bir açılan yoğun bir ekran, sekme onu okunur kılıyor. */}

          {sekme === 'koclar' && (
            <>
              <Koclar liste={veri.koclar} onDegisti={yukle} benId={profil.id} />
              {/* Koçun kendi bağlantısı (Raporlar'dan taşındı). */}
              <TelegramBaglanti />
            </>
          )}

          {sekme === 'ogrenciler' && (
            <>
              <Ogrenciler liste={veri.ogrenciler} onOgrenciAc={onOgrenciAc} />
              <Risk liste={veri.risk} onOgrenciAc={onOgrenciAc} />
            </>
          )}

          {sekme === 'tahsilat' && <Tahsilat t={veri.tahsilat} onOgrenciAc={onOgrenciAc} />}

          {sekme === 'sosyal' && <SosyalKutusu onSayac={setSosyal} />}

          {sekme === 'sistem' && (
            <>
              <Sistem s={veri.sistem} />
              {/* Posta kaydı ve elle gönderim (Raporlar'dan taşındı). */}
              <EpostaKaydi />
              <Vekalet liste={veri.vekalet} />
              {/* Haftalik Ilham takvimi icerik kuratorlugu: koc gorunen hali
                  okuyor, 12 haftalik plani yonetici kuruyor. */}
              <HaftalikTakvim />
              <Ayarlar onGit={onGit} />
            </>
          )}
        </>
      )}
    </>
  )
}
