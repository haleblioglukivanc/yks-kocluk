import Islerim from '../bilesenler/Islerim.jsx'
import OgrenciDenemeleri from '../bilesenler/OgrenciDenemeleri.jsx'
import { TekrarSatiri } from '../bilesenler/HataDefteri.jsx'
import { gunGorevleri } from '../bilesenler/HaftaSeridi.jsx'
import { KisiPortresi, YolCizimi, DenemeCizimi } from '../ortak/KapiCizimleri.jsx'
import { useEffect, useRef, useState } from 'react'
import { supabase, hataMetni } from '../lib/supabase.js'
import { kutlamaKontrol } from '../lib/kutlama.js'
import KutlamaKatmani from '../bilesenler/KutlamaKatmani.jsx'
import { Uyari, Yukleniyor } from '../bilesenler/Ortak.jsx'
import AnaTepe from '../ortak/AnaTepe.jsx'
import AcilGorusme from '../bilesenler/AcilGorusme.jsx'
import { Kapilar } from '../bilesenler/OgrenciAnaParcalari.jsx'
import { aksanStili } from '../lib/sekmeAksani.js'
import SiradakiKart from '../bilesenler/SiradakiKart.jsx'
import { GunGorusmesi } from '../bilesenler/AcilGorusme.jsx'
import { useKocMesaji } from '../bilesenler/KocMesaji.jsx'
import { SayacSaglayici } from '../lib/sayac.jsx'
import GunuKapat from '../bilesenler/GunuKapat.jsx'
import { Kart } from '../bilesenler/Ortak.jsx'
import HedefNet from '../bilesenler/HedefNet.jsx'
import RaporTepesi from '../bilesenler/RaporTepesi.jsx'
import SekmeTepesi from '../bilesenler/SekmeTepesi.jsx'
import HaftalikIlham from '../bilesenler/HaftalikIlham.jsx'
import Okuduklarim from '../bilesenler/Okuduklarim.jsx'
import OgrenciKaynaklari from '../bilesenler/OgrenciKaynaklari.jsx'
import Rozetlerim from './Rozetlerim.jsx'
import KonuHaritasi from './KonuHaritasi.jsx'
import UstBlok from '../ortak/UstBlok.jsx'
import Bolum from '../ortak/Bolum.jsx'


/* Sekme tek yoldan yönetilir: kabuktaki alt çubuk. Öğrenci kendi
   hesabında da, koç gözle bakarken de yol sekmeye çevrilip `sekme` /
   `onSekme` ile buraya geliyor. Panelin içinde ikinci bir sekme şeridi
   yok edildi: kabukta yapılan her gezinme değişikliği iki tarafta
   birden geçerli olsun diye tek gezinme bırakıldı. */

/* Kural motoru eski sekme adlarıyla yönlendirebilir; hepsi bir yere gider. */
/* Ben sekmesi kalktı: seri Yol'da, hedefe göre net Denemeler'de,
   haftanın sözü Bugün'ün sonunda. Eski adlar yine bir yere gider. */
/* "Cuma, 18 Eylül" — şeridin üstündeki gün başlığı. */
const gunBasligi = (t) =>
  t
    ? new Date(`${t}T00:00:00`).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })
        .replace(/^(\d+ \S+) (\S+)$/, '$2, $1')
    : 'Bugün'

/* Tepedeki tek cümle: bugünün işi kaç, ne kadar kaldı. */
function gunOzeti(ozet) {
  if (!ozet) return ' '
  const top = ozet.bugunToplamGorev ?? (ozet.gorevler ?? []).length
  const biten = ozet.bugunTamamlanan ?? (ozet.gorevler ?? []).filter((g) => g.durum === 'tamamlandi').length
  if (!top) return 'Bugün için plan yok. İstersen Yol’dan bir konu seç.'
  if (biten >= top) return 'Bugünün bütün işleri bitti.'
  if (!biten) return `Bugün ${top} işin var.`
  return `${top} işten ${biten} tanesi bitti, ${top - biten} tane kaldı.`
}

const SEKME_ESLE = { program: 'bugun', rozetler: 'konular', ben: 'konular' }

export default function OgrenciPaneli({
  profil,
  ogrenciId,
  vekaleten = false,
  sekme: disSekme,
  onSekme: disOnSekme,
  onGit,
  tepe = {},
}) {
  /* Vekalet: koç öğrencinin panelini onun verisiyle açar. Kendi JWT'siyle
     kalır; yetkiyi RLS (private.ogrencim_mi) verir, yazılan satırlara
     islem_yapan damgası düşer. */
  const hedefId = ogrenciId ?? profil.id
  const [kayit, setKayit] = useState(null)
  const [denemeler, setDenemeler] = useState([])
  const [netDurumu, setNetDurumu] = useState(null)
  const [icSekme, setIcSekme] = useState('bugun')
  const kontrollu = typeof disOnSekme === 'function'
  const sekme = kontrollu ? (disSekme ?? 'bugun') : icSekme
  const setSekme = (k) => {
    const hedef = SEKME_ESLE[k] ?? k
    if (kontrollu) disOnSekme(hedef)
    else setIcSekme(hedef)
  }
  const [hata, setHata] = useState('')
  const [ozet, setOzet] = useState(null)
  const [ozetGeldi, setOzetGeldi] = useState(false)
  const [tazele, setTazele] = useState(0)
  const [kutlamalar, setKutlamalar] = useState([])
  const [kapatAcik, setKapatAcik] = useState(false)
  /* Gün kapandığında Yol'a geçilir ve bugün çalışılan ders açık gelir:
     günün sonunda öğrencinin göreceği şey, bugün nereyi geçtiği. */
  const [odakDers, setOdakDers] = useState(null)
  /* Hafta şeridi artık görev kartının başlığı: seçili gün burada tutuluyor,
     o günün listesi de şeritten buraya geliyor ve aynı karta besleniyor. */
  const [seciliGun, setSeciliGun] = useState(null)
  const [gunVerisi, setGunVerisi] = useState(null)
  /* İşlerim'de bir güne dokununca (7 gün / 30 gün) o günün işleri gelir;
     Şimdi kartı ve liste o güne geçer. null: bugün. */
  const [gunSayaci, setGunSayaci] = useState(0)
  const [ekleTetik, setEkleTetik] = useState(0)
  /* Yol sayfasının tepesi: kaç konu bitti, sıradaki durak, seri. */
  const [yolOzeti, setYolOzeti] = useState(null)
  useEffect(() => {
    if (sekme !== 'konular' || !kayit?.id) return
    let iptal = false
    Promise.all([
      supabase.from('konu_ilerleme').select('durum, guncellendi, konular(ad, dersler(ad))').eq('ogrenci_id', kayit.id),
      supabase.from('seriler').select('guncel_seri, en_uzun_seri, son_aktif_gun').eq('ogrenci_id', kayit.id).maybeSingle(),
    ]).then(([k, sr]) => {
      if (iptal) return
      const l = k.data ?? []
      const simdi = l.filter((x) => x.durum === 'calisiliyor').sort((a, b) => ((a.guncellendi ?? '') < (b.guncellendi ?? '') ? 1 : -1))[0]
      setYolOzeti({ toplam: l.length, biten: l.filter((x) => x.durum === 'tamamlandi').length, siradaki: simdi?.konular?.ad ?? null, siradakiDers: simdi?.konular?.dersler?.ad ?? null, seri: sr.data?.guncel_seri ?? 0, enUzun: sr.data?.en_uzun_seri ?? 0 })
    })
    return () => { iptal = true }
  }, [sekme, kayit?.id, tazele])
  useEffect(() => {
    if (!seciliGun || !kayit?.id || seciliGun === ozet?.bugun) { setGunVerisi(null); return }
    let iptal = false
    gunGorevleri(kayit.id, seciliGun).then((liste) => {
      if (iptal) return
      setGunVerisi({
        tarih: seciliGun,
        liste,
        bugunMu: false,
        ad: new Date(`${seciliGun}T00:00:00`).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }),
        yenile: () => setGunSayaci((n) => n + 1),
      })
    }).catch(() => {})
    return () => { iptal = true }
  }, [seciliGun, kayit?.id, ozet?.bugun, gunSayaci])
  /* Koçun okunmamış mesajı başlıkta çıkar. Vekalette de görünür (koç
     öğrencinin ne gördüğünü görsün) ama kapatmak okundu işaretlemez. */
  const kocMesaji = useKocMesaji(hedefId, true, vekaleten)

  /* Kutlama, ilk açılışta değil yalnızca bir eylemden sonra bakılır.
     Bayrak yenile() ile kalkar, özet tazelendikten sonra tüketilir —
     böylece konfeti patladığında panel zaten güncel sayıyı gösteriyor. */
  const kutlamaBekliyor = useRef(false)
  const yenile = () => {
    kutlamaBekliyor.current = true
    setTazele((n) => n + 1)
  }

  useEffect(() => {
    ;(async () => {
      const { data: o, error } = await supabase
        .from('ogrenciler')
        .select(
          'id, koc_id, alan, sinif, katalog_id, hedef_universite, hedef_bolum, hedef_tyt_net, hedef_ayt_net, profiller!ogrenciler_id_fkey(ad_soyad, fotograf_yolu), kataloglar(ad)',
        )
        .eq('id', hedefId)
        .maybeSingle()
      if (error) {
        setHata(hataMetni(error))
        return
      }
      setKayit(o)

      /* Üç sorgu birbirinden bağımsız; paralel gidiyor. Sırayla giderken
         Bugün özeti en sona kalıyor, "Bugün için plan yok" görünüp sonra
         görevler ve hafta şeridi gelince kart büyüyordu. */
      const [{ data: d }, { data: nd }, { data: bugun }] = await Promise.all([
        supabase
          .from('deneme_ozet')
          .select('id, tarih, tur, yayin, toplam_net')
          .eq('ogrenci_id', hedefId)
          .order('tarih', { ascending: false })
          .limit(8),
        supabase
          .from('ogrenci_net_durumu')
          .select('tur, son_net, en_yuksek_net')
          .eq('ogrenci_id', hedefId),
        supabase.rpc('ogrenci_bugun_ozeti', { p_ogrenci_id: hedefId }),
      ])
      setDenemeler(d ?? [])
      setNetDurumu(Object.fromEntries((nd ?? []).map((x) => [x.tur, x])))
      // Çizbi artık uygulama kabuğunda, köşede duruyor; burada sadece veri
      if (bugun) setOzet(bugun)
      // Özet gelmese de iskelet takılı kalmasın; eski boş hal çizilir.
      setOzetGeldi(true)

      // Vekaletteyken çağırmıyoruz: RPC auth.uid()'e bakar, koç öğrenci
      // olmadığı için zaten boş dönerdi — boşuna gidip gelmesin.
      if (kutlamaBekliyor.current) {
        kutlamaBekliyor.current = false
        if (!vekaleten) {
          const yeni = await kutlamaKontrol()
          if (yeni.length) setKutlamalar(yeni)
        }
      }
    })()
  }, [hedefId, tazele, vekaleten])

  if (hata) return <Uyari>{hata}</Uyari>
  if (!kayit) return <Yukleniyor />
  const ilkAdi = ((vekaleten ? null : profil?.ad_soyad) ?? kayit.profiller?.ad_soyad ?? '').split(' ')[0]


  return (
    <>
      <SayacSaglayici ogrenciId={kayit.id} onKaydedildi={yenile}>
      {sekme === 'denemeler' && (() => {
        /* Denemeler (22 Eylül 2026 mokabı): ortak sahneli tepe, sağda kara tahta. */
        const son = denemeler?.[0] ?? null
        const onceki = son ? denemeler.find((d, i) => i > 0 && d.tur === son.tur) : null
        const fark = son && onceki ? Number(son.toplam_net) - Number(onceki.toplam_net) : null
        const hedefNet = son?.tur === 'ayt' ? kayit.hedef_ayt_net : kayit.hedef_tyt_net
        const net = (n) => Number(n).toFixed(2).replace(/0$/, '').replace(/,?\.?0$/, '').replace('.', ',')
        const ozetMetni = !son
          ? 'İlk denemeni ekle, net çizgin başlasın.'
          : `Son ${String(son.tur).toUpperCase()} ${net(son.toplam_net)} net.${hedefNet ? (Number(hedefNet) > Number(son.toplam_net) ? ` Hedefine ${net(Number(hedefNet) - Number(son.toplam_net))} net kaldı.` : ' Hedefini geçtin.') : ''}`
        const netler = [...(denemeler ?? [])].filter((d) => d.tur === son?.tur).slice(0, 4).reverse().map((d) => Number(d.toplam_net))
        return (
          <AnaTepe
            selam="Denemeler"
            tarih={gunBasligi(ozet?.bugun)}
            ozet={ozetMetni}
            {...(vekaleten ? {} : tepe)}
            onGeri={() => setSekme('bugun')}
            durum={fark ? <span className={`od-durum ${fark > 0 ? 'od-durum--iyi' : 'od-durum--acil'}`}><i />{fark > 0 ? '▲' : '▼'} {net(Math.abs(fark))} net {fark > 0 ? 'arttı' : 'düştü'}</span> : null}
            sagCizim={(mevsim) => <DenemeCizimi mevsim={mevsim} zemin={false} netler={netler} />}
          />
        )
      })()}
      {sekme === 'konular' && (
        /* Yol (22 Eylül 2026 mokabı): ortak sahneli tepe, sağda büyük dağ. */
        <AnaTepe
          selam="Yol"
          tarih={gunBasligi(ozet?.bugun)}
          ozet={!yolOzeti ? ' ' : yolOzeti.toplam === 0 ? 'Konu konu nerede olduğun, sıradaki durak.' : `${yolOzeti.toplam} konudan ${yolOzeti.biten}'${yolOzeti.biten === 1 ? 'i' : 'u'} bitti.${yolOzeti.siradaki ? ` Sıradaki durak ${yolOzeti.siradaki}.` : ''}`}
          {...(vekaleten ? {} : tepe)}
          onGeri={() => setSekme('bugun')}
          durum={yolOzeti && yolOzeti.seri > 0 ? <span className="od-durum od-durum--seri"><i />{yolOzeti.seri === 1 ? 'Bugün çalıştın' : `${yolOzeti.seri} gündür her gün çalışıyorsun`}</span> : null}
          sagCizim={(mevsim) => <YolCizimi mevsim={mevsim} zemin={false} oran={yolOzeti?.toplam ? yolOzeti.biten / yolOzeti.toplam : 0} />}
        />
      )}
      {sekme === 'bugun' && (
        /* Ortak iskelet (21 Eylül 2026): koçla aynı tepe. Acil görüşme
           tepenin sağ üstünde; hafta şeridi tepenin hemen altında. */
        <AnaTepe
          selam={ilkAdi ? `Merhaba ${ilkAdi}` : 'Merhaba'}
          tarih={gunBasligi(seciliGun ?? ozet?.bugun)}
          ozet={gunOzeti(ozet)}
          ekDugme={<AcilGorusme ogrenciId={hedefId} saltOkunur={vekaleten} />}
          {...(vekaleten ? {} : tepe)}
          /* Öğrencinin kendi fotoğraf çerçevesi; çerçeve ya da selam profili açar
             (22 Eylül 2026, koçla aynı). Koç gözüyle bakarken yok. */
          onBaslik={vekaleten ? null : tepe?.onProfil}
          sagCizim={vekaleten || !tepe?.onProfil ? null : (mevsim) => (
            <button type="button" className="od-portre" onClick={tepe.onProfil} aria-label="Profilim">
              <KisiPortresi mevsim={mevsim} yol={tepe.fotoYolu} bas={tepe.hesapHarf} idEk="ograna" />
            </button>
          )}
        />
      )}

      <div className="sekme-govde" style={aksanStili()}>
      {sekme === 'bugun' && !ozetGeldi ? (
        /* Bugün özeti gelene kadar Sıradaki kartı + Günü tamamla kadar yer.
           Boş liste gösterilirse öğrenci bir an "plan yok" okuyordu. */
        <Kart sinif='bugun-bekliyor'>
          <Yukleniyor satir={4} />
        </Kart>
      ) : sekme === 'bugun' ? (
        <div className="ana-govde ana-govde--ogrenci">
          {/* Yeni düzen (22 Eylül 2026, mokap v2): önce Yol / Denemeler kapıları,
              sonra İşlerim (Bugün / 7 gün / 30 gün). Hafta şeridi, koçun notu,
              ayrı Gidişat ve Kaynaklarım ana ekrandan kalktı. */}
          <Kapilar ogrenciId={kayit.id} denemeler={denemeler} onYol={() => setSekme('konular')} onDenemeler={() => setSekme('denemeler')} />
          <Islerim ogrenciId={kayit.id} bugun={ozet?.bugun} haftaBasi={ozet?.haftaBasi} tazele={tazele} secili={seciliGun} onGunSec={setSeciliGun}>
          <section className="ana-bolum simdi" aria-label="Şimdi">
            <GunGorusmesi gorevler={gunVerisi?.bugunMu === false ? gunVerisi.liste : ozet?.gorevler} />
            <SiradakiKart
              gorevler={gunVerisi?.bugunMu === false ? gunVerisi.liste : ozet?.gorevler}
              bugunMu={gunVerisi?.bugunMu !== false}
              gunAdi={gunVerisi?.bugunMu === false ? gunVerisi.ad : 'Bugünün hedefi'}
              onDegisti={gunVerisi?.bugunMu === false ? gunVerisi.yenile : yenile}
            />
            {/* Rutin ve çözülen soru Günü tamamla akışında; burada yalnız kapı. */}
            {!vekaleten && gunVerisi?.bugunMu !== false && <TekrarSatiri ogrenciId={kayit.id} />}
            {ozet?.bugun && gunVerisi?.bugunMu !== false && (
              <button
                className={`gunu-kapat-dugme${ozet.gunKapandi ? ' gunu-kapat-dugme--kapali' : ''}`}
                onClick={() => setKapatAcik(true)}
              >
                {ozet.gunKapandi ? (
                  <>
                    <strong>Gün tamamlandı ✓</strong>
                    <span>Rutin ya da soru düzeltmek için dokun</span>
                  </>
                ) : (
                  <>
                    <strong>Günü tamamla</strong>
                    <span>Rutinler, çözülen soru ve günün özeti</span>
                  </>
                )}
              </button>
            )}
          </section>
          </Islerim>
          <HaftalikIlham ogrenciId={kayit.id} bitirilebilir={!vekaleten && profil?.rol === 'ogrenci'} kisa />
        </div>
      ) : sekme === 'konular' ? (
        <>
          <div className="ana-govde ana-govde--dar od-govde yol-govde">
          <KonuHaritasi profilId={kayit.id} odakDers={odakDers ?? yolOzeti?.siradakiDers ?? null} yeni />
          {/* Seri tepede; kitaplar ve kaynaklar altta kısa listeler. */}
          <Okuduklarim ogrenciId={kayit.id} />
          {/* Kaynaklarım ana ekrandan buraya taşındı (22 Eylül 2026). */}
          <OgrenciKaynaklari ogrenciId={kayit.id} rol="ogrenci" bugunDersler={[...new Set((ozet?.gorevler ?? []).map((g) => g.ders).filter(Boolean))]} />
          </div>
        </>
      ) : (
        <>
          <div className="ana-govde ana-govde--dar od-govde eski-ic dn-govde">
          {/* Denemeler v2 (22 Eylül 2026): Deneme ekle · Son denemen · Tekrar
              etmen gerekenler · Bütün denemelerin. */}
          {!vekaleten && (
            <button type="button" className="dn-ekle" onClick={() => setEkleTetik((n) => n + 1)}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
              Deneme ekle
            </button>
          )}
          <OgrenciDenemeleri
            ogrenciId={kayit.id}
            katalogId={kayit.katalog_id}
            hedefTyt={kayit.hedef_tyt_net}
            hedefAyt={kayit.hedef_ayt_net}
            duzenlenebilir={!vekaleten}
            ekleTetik={ekleTetik}
          />
          </div>
        </>
      )}
      </div>
      </SayacSaglayici>

      <GunuKapat
        acik={kapatAcik}
        onKapat={() => setKapatAcik(false)}
        onTamamlandi={() => {
          setKapatAcik(false)
          /* Bugün bitirilen işlerden konusu olan sonuncusu: patikada
             canlanacak durak onun dersinde. Konusu olan iş yoksa
             (yalnız deneme çözülmüş olabilir) Yol yine açılır, ders
             seçimi kendi kuralına düşer. */
          const bugunku = [...(ozet?.gorevler ?? [])]
            .filter((g) => g.durum === 'tamamlandi' && g.ders && g.konu)
            .pop()
          setOdakDers(bugunku?.ders ?? null)
          setSekme('konular')
        }}
        ogrenciId={kayit.id}
        katalogId={kayit.katalog_id}
        ozet={ozet}
        onDegisti={yenile}
      />

      <KutlamaKatmani kutlamalar={kutlamalar} kapandi={() => setKutlamalar([])} />
    </>
  )
}
