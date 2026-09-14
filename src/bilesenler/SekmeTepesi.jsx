/**
 * Bugün ve Rapor dışındaki sekmelerin koyu tepesi: yalnız başlık ve tek
 * satır açıklama. Rapor tepesiyle (RaporTepesi) aynı yüzeyi ve yazıyı
 * kullanır; gösterge kutusu yoktur. Böylece hangi sekmeye geçilirse
 * geçilsin ekranın "kafası" aynı yerde, aynı renkte durur; ilk kart
 * dikişe oturur.
 */
export default function SekmeTepesi({ baslik, altBaslik, eylem = null }) {
  return (
    <section className="hero-yuzey rt" aria-label={baslik}>
      <div className="rt-satir">
        <div>
          <h1 className="rt-baslik">{baslik}</h1>
          {altBaslik && <p className="rt-alt">{altBaslik}</p>}
        </div>
        {eylem}
      </div>
    </section>
  )
}
