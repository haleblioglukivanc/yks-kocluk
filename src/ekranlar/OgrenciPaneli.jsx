import { iyelik } from '../lib/turkce.js'
import Islerim from '../bilesenler/Islerim.jsx'
import OgrenciDenemeleri from '../bilesenler/OgrenciDenemeleri.jsx'
import { BugunRutinler, BugunUnutma } from '../bilesenler/ProgramBugun.jsx'
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
/* Tepedeki tek cümle (22 Eylül 2026): sabah dünü anlatır, gün içinde anı,
   hepsi bitince kapanışı. Ayrı gün sonu raporu yok. */
function gunOzeti(ozet, dun = null) {
  if (!ozet) return ' '
  const top = ozet.bugunToplamGorev ?? (ozet.gorevler ?? []).length
  const biten = ozet.bugunTamamlanan ?? (ozet.gorevler ?? []).filter((g) => g.durum === 'tamamlandi').length
  const sira = (ozet.gorevler ?? []).find((g) => g.durum !== 'tamamlandi')
  const sirada = sira ? ` Sırada ${sira.konu ?? sira.baslik}.` : ''
  if (!top) return 'Bugün için plan yok. İstersen Yol’dan bir konu seç.'
  if (biten >= top) return 'Bugünün bütün işleri bitti. Yarın görüşürüz.'
  if (!biten) {
    const dunCumle = dun && dun.toplam > 0
      ? `Dün ${dun.toplam} işinden ${dun.biten === dun.toplam ? 'hepsini' : `${dun.biten} tanesini`} bitirdin${dun.soru ? ` ve ${dun.soru} soru çözdün` : ''}. `
      : ''
    return `${dunCumle}Bugün ${top} işin var.${dunCumle ? '' : sirada}`
  }
  return `${top} işinden ${biten} tanesi bitti.${sirada}`
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
  /* Dünün kısa özeti: sabah tepedeki cümle için. */
  const [dunOzeti, setDunOzeti] = useState(null)
  useEffect(() => {
    if (!kayit?.id || !ozet?.bugun) return
    let iptal = false
    const d = new Date(`${ozet.bugun}T00:00:00`); d.setDate(d.getDate() - 1)
    const dun = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    Promise.all([
      supabase.from('gorevler').select('durum').eq('ogrenci_id', kayit.id).eq('tarih', dun),
      supabase.from('soru_kayitlari').select('dogru, yanlis, bos').eq('ogrenci_id', kayit.id).eq('tarih', dun),
    ]).then(([g, k]) => {
      if (iptal) return
      const l = g.data ?? []
      setDunOzeti({ toplam: l.length, biten: l.filter((x) => x.durum === 'tamamlandi').length, soru: (k.data ?? []).reduce((a, x) => a + (x.dogru ?? 0) + (x.yanlis ?? 0) + (x.bos ?? 0), 0) })
    })
    return () => { iptal = true }
  }, [kayit?.id, ozet?.bugun])
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
            {...tepe}
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
          {...tepe}
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
          ozet={gunOzeti(ozet, dunOzeti)}
          {...tepe}
          ekDugme={vekaleten ? null : <>{tepe.ekDugme}<AcilGorusme ogrenciId={hedefId} saltOkunur={vekaleten} /></>}
          durum={vekaleten ? <span className="od-durum od-durum--vekalet"><i />{ilkAdi ? `${iyelik(ilkAdi)} gözünden bakıyorsun` : 'Öğrencinin gözünden bakıyorsun'}</span> : undefined}
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
          {(() => {
            /* Programım · Bugün (22 Eylül 2026): günün tamamı tek sayfada;
               "Günü tamamla" kalktı. İlerleme = koçun işleri + her gün
               yapılanlar; hepsi bitince kutlama. */
            const bugunMu = gunVerisi?.bugunMu !== false
            const gorevler = bugunMu ? (ozet?.gorevler ?? []) : (gunVerisi?.liste ?? [])
            const gi = ozet?.haftaBasi && ozet?.bugun ? Math.round((new Date(`${ozet.bugun}T00:00:00`) - new Date(`${ozet.haftaBasi}T00:00:00`)) / 86400000) : -1
            const rutinler = bugunMu ? (ozet?.rutinler ?? []) : []
            const toplam = gorevler.length + rutinler.length
            const biten = gorevler.filter((g) => g.durum === 'tamamlandi').length + rutinler.filter((r) => r.gunler?.[gi]).length
            const hepsi = bugunMu && toplam > 0 && biten === toplam
            return (
              <>
                {toplam > 0 && (
                  <div className="pb-ilerleme" aria-label={`${toplam} işten ${biten} tanesi bitti`}>
                    <span>{biten} / {toplam} bitti</span>
                    <span className="pb-cubuk"><s style={{ width: `${(biten / toplam) * 100}%` }} /></span>
                  </div>
                )}
                {hepsi && (
                  <div className="pb-kutlama" role="status">
                    <b>Bugünün hepsi bitti ✓</b>
                    <span>{ozet?.calismaDkBugun ? `${Math.floor(ozet.calismaDkBugun / 60) ? `${Math.floor(ozet.calismaDkBugun / 60)} saat ` : ''}${ozet.calismaDkBugun % 60} dakika çalıştın, ` : ''}{gorevler.length} işi ve {rutinler.length} alışkanlığını bitirdin. Yarın görüşürüz.</span>
                  </div>
                )}
                <section className="pb-kart pb-koc" aria-label="Koçunun verdiği işler">
                  <div className="pb-bas"><span>KOÇUNUN VERDİĞİ İŞLER</span><span>{gorevler.filter((g) => g.durum === 'tamamlandi').length} / {gorevler.length}</span></div>
                  <div className="ana-bolum simdi">
                    <GunGorusmesi gorevler={gorevler} />
                    <SiradakiKart
                      gorevler={gorevler}
                      bugunMu={bugunMu}
                      gunAdi={bugunMu ? 'Bugünün hedefi' : gunVerisi.ad}
                      onDegisti={bugunMu ? yenile : gunVerisi.yenile}
                    />
                  </div>
                </section>
                {bugunMu && (
                  <BugunRutinler ogrenciId={kayit.id} rutinler={ozet?.rutinler} haftaBasi={ozet?.haftaBasi} bugun={ozet?.bugun} onDegisti={yenile} saltOkunur={vekaleten} />
                )}
                {bugunMu && ozet?.bugun && (
                  <BugunUnutma ogrenciId={kayit.id} katalogId={kayit.katalog_id} bugun={ozet.bugun} soruKayitlari={ozet?.bugunSoru} onDegisti={yenile} saltOkunur={vekaleten} />
                )}
              </>
            )
          })()}
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


      <KutlamaKatmani kutlamalar={kutlamalar} kapandi={() => setKutlamalar([])} />
    </>
  )
}
