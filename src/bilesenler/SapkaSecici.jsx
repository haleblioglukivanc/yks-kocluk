/* Kıvanç hem kurumu yönetiyor hem koçluk yapıyor. İki iş aynı ekranda
   birleşince koç paneli yönetim kartlarıyla doluyordu; ayırmak yetmez,
   hangi sıfatla bakıldığı da görünmeli.

   Bu yüzden geçiş gizli bir menüde değil, panelin en üstünde: hangi
   şapkanın takılı olduğu her zaman ekranda yazıyor.

   Yalnız yöneticide çizilir. Koç rolünde tek şapka var, seçici de
   olmamalı — tek seçenekli bir seçici bilgi taşımaz. */
export default function SapkaSecici({ aktif, onGit }) {
  const secenekler = [
    ['koc', '/', 'Koç'],
    ['yonetim', '/yonetim', 'Yönetici'],
  ]

  return (
    <div className="sapka-secici" role="group" aria-label="Görünüm">
      {secenekler.map(([kod, yol, ad]) => (
        <button
          key={kod}
          type="button"
          aria-pressed={aktif === kod}
          onClick={() => aktif !== kod && onGit(yol)}
        >
          {ad}
        </button>
      ))}
    </div>
  )
}
