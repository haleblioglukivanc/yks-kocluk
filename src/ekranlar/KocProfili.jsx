import { useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import AnaTepe from '../ortak/AnaTepe.jsx'
import { PortreCizimi } from '../ortak/KapiCizimleri.jsx'
import { FotografYukle, useFotograf } from '../bilesenler/Fotograf.jsx'
import { MevsimSecici } from '../bilesenler/HesapYapragi.jsx'
import { kurulumuGoster, useKurulum } from '../pwa/KurulumDaveti.jsx'
import { kur, yenidenYukle } from '../pwa/pwa.js'
import { useBildirim } from '../pwa/bildirim.js'

/* Koçun profil sayfası (22 Eylül 2026, Bekir): köşedeki KH düğmesi ve alttan
   açılan hesap menüsü yerine tam sayfa. Ana ekranda Kıvanç'ın fotoğraf
   çerçevesine ya da selamına dokununca açılır; çerçeveye yeniden dokununca
   ana ekrana döner (öğrenci profiliyle aynı mantık). Üstte kendi bilgileri
   (fotoğraf, ad, telefon, e-posta), altında menüler. */

const ok = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
)

function Satir({ baslik, alt = null, sag = ok, onClick, tehlike = false, disabled = false }) {
  return (
    <button type="button" className={tehlike ? 'kp-satir kp-satir--tehlike' : 'kp-satir'} onClick={onClick} disabled={disabled}>
      <span className="kp-satir-yazi"><b>{baslik}</b>{alt && <span>{alt}</span>}</span>
      {sag && <span className="kp-satir-sag">{sag}</span>}
    </button>
  )
}

function Bolum({ baslik, eylem = null, children }) {
  return (
    <section className="kp-bolum">
      <div className="kp-bolum-bas"><h2>{baslik}</h2>{eylem}</div>
      <div className="kp-kart">{children}</div>
    </section>
  )
}

export default function KocProfili({ profil, eposta, tepe = {}, yonetimdeMi, onSapka, onCikis, onGit, onYenile }) {
  const [duzenle, setDuzenle] = useState(false)
  const [ad, setAd] = useState(profil.ad_soyad ?? '')
  const [telefon, setTelefon] = useState(profil.telefon ?? '')
  const [bekliyor, setBekliyor] = useState(false)
  const [hata, setHata] = useState('')
  const foto = useFotograf(profil.fotograf_yolu)
  const kurulum = useKurulum()
  const bildirim = useBildirim()
  const yonetici = profil.yonetici === true
  const bas = (profil.ad_soyad ?? '').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toLocaleUpperCase('tr')

  const BILDIRIM = {
    acik: ['Açık', () => bildirim.kapat()],
    kapali: ['Kapalı', () => bildirim.ac()],
    engelli: ['Telefon ayarlarından aç', null],
    kurulum: ['Önce ana ekrana ekle', () => kurulumuGoster()],
  }
  const bildirimSatiri = BILDIRIM[bildirim.durum]

  async function kaydet() {
    setBekliyor(true)
    setHata('')
    const { error } = await supabase.from('profiller').update({ ad_soyad: ad.trim(), telefon: telefon.trim() || null }).eq('id', profil.id)
    setBekliyor(false)
    if (error) { setHata(hataMetni(error)); return }
    setDuzenle(false)
    await onYenile?.()
  }

  return (
    <div className="ana-sayfa kp">
      <AnaTepe
        selam={profil.ad_soyad ?? 'Profil'}
        tarih={new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^(\d+ \S+) (\S+)$/, '$2, $1')}
        {...tepe}
        altBaslik={yonetici ? 'Koç · Yönetici' : 'Koç'}
        durum={<span className="od-durum od-durum--profil"><i />Profil</span>}
        sagCizim={(mevsim) => (
          <button type="button" className="od-portre" onClick={tepe.onGeri} aria-label="Ana ekrana dön">
            <PortreCizimi mevsim={mevsim} foto={foto} bas={bas} durum={null} idEk="koc" />
          </button>
        )}
      />

      <div className="ana-govde ana-govde--dar kp-govde">
        <Bolum
          baslik="Bilgilerim"
          eylem={<button type="button" className="kp-kalem" onClick={() => { setDuzenle((d) => !d); setAd(profil.ad_soyad ?? ''); setTelefon(profil.telefon ?? ''); setHata('') }}>{duzenle ? 'Vazgeç' : 'Düzenle'}</button>}
        >
          <div className="kp-foto">
            <FotografYukle ogrenciId={profil.id} mevcutYol={profil.fotograf_yolu} ad={profil.ad_soyad} onDegisti={onYenile} />
          </div>
          {duzenle ? (
            <div className="kp-form">
              <label className="alan"><span className="alan-etiket">Ad soyad</span><input value={ad} onChange={(e) => setAd(e.target.value)} autoComplete="name" /></label>
              <label className="alan"><span className="alan-etiket">Telefon</span><input value={telefon} onChange={(e) => setTelefon(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="05xx xxx xx xx" /></label>
              {hata && <p className="kp-hata">{hata}</p>}
              <button type="button" className="kp-kaydet" onClick={kaydet} disabled={bekliyor || ad.trim().length < 3}>{bekliyor ? 'Kaydediliyor…' : 'Kaydet'}</button>
            </div>
          ) : (
            <>
              <div className="kp-bilgi"><span>Ad soyad</span><b>{profil.ad_soyad || '—'}</b></div>
              <div className="kp-bilgi"><span>Telefon</span><b className={profil.telefon ? '' : 'kp-sonuk'}>{profil.telefon || 'Girilmemiş'}</b></div>
              <div className="kp-bilgi"><span>E-posta</span><b>{eposta || '—'}</b></div>
            </>
          )}
        </Bolum>

        <Bolum baslik="Görünüm">
          <div className="kp-ic"><MevsimSecici /></div>
        </Bolum>

        <Bolum baslik="Koçluk araçları">
          <Satir baslik="Konu öncelikleri" alt="Hangi konular önce çalışılsın" onClick={() => onGit('/konular')} />
          <Satir baslik="Kaynaklar" alt="Kitaplar ve öğrencilere verilenler" onClick={() => onGit('/kaynaklar')} />
          <Satir baslik="Telegram bağlantısı" alt="Bildirimleri Telegram'dan da al" onClick={() => onGit('/baglantilar')} />
        </Bolum>

        <Bolum baslik="Uygulama">
          {bildirimSatiri && (
            <Satir baslik="Bildirimler" sag={<em>{bildirimSatiri[0]}</em>} onClick={bildirimSatiri[1] ?? undefined} disabled={bildirim.mesgul || !bildirimSatiri[1]} />
          )}
          {kurulum.kurulabilir && (
            <Satir baslik="Uygulamayı yükle" alt="Ana ekrana ekle" onClick={() => { if (kurulum.istem) kur(); else kurulumuGoster() }} />
          )}
          <Satir baslik="Uygulamayı yenile" alt="Eski sürüm takılı kaldıysa" sag={null} onClick={yenidenYukle} />
        </Bolum>

        <Bolum baslik="Hesap">
          <Satir baslik="Şifremi değiştir" onClick={() => onGit('/sifre')} />
          {yonetici && (
            <Satir baslik={yonetimdeMi ? 'Koç görünümüne dön' : 'Yönetim paneli'} alt="Koçlar, öğrenciler, veliler, sistem" onClick={() => onSapka(yonetimdeMi ? 'koc' : 'yonetici')} />
          )}
          <Satir baslik="Çıkış yap" sag={null} tehlike onClick={onCikis} />
        </Bolum>

        <p className="kp-surum">sürüm {__DERLEME__}</p>
      </div>
    </div>
  )
}
