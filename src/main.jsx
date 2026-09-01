import { Component, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
/* Sıra önemli: tema.css renkleri tanımlar, sistem.css o renklerin
   ne zaman kullanılacağını, index.css yalnızca yerleşimi. */
import './tema.css'
import './sistem.css'
import './index.css'

/* Telefonda geliştirici konsolu yok. Bir bileşen patladığında React bütün
   ağacı söküyor ve geriye bembeyaz bir ekran kalıyor — "site gitti" hissi
   tam olarak bu. Sınır, hatayı ekrana yazıp uygulamayı ayakta tutuyor. */
class HataSiniri extends Component {
  constructor(props) {
    super(props)
    this.state = { hata: null }
  }

  static getDerivedStateFromError(hata) {
    return { hata }
  }

  render() {
    if (!this.state.hata) return this.props.children
    return (
      <div className="cokme">
        <h1>Bir şey ters gitti</h1>
        <p>Ekran çizilirken hata çıktı. Aşağıdaki metni iletmek sorunu bulmayı kolaylaştırır.</p>
        <pre className="cokme-iz">{String(this.state.hata?.stack || this.state.hata)}</pre>
        <p className="cokme-sur">sürüm {__DERLEME__}</p>
        <div className="cokme-dugmeler">
          <button className="dugme dugme--birincil" onClick={() => window.location.reload()}>
            Yeniden dene
          </button>
          <button
            className="dugme dugme--ikincil"
            onClick={() => {
              window.location.search = '?sifirla=1'
            }}
          >
            Önbelleği temizle
          </button>
        </div>
      </div>
    )
  }
}

/* Kurtarma yolu: adresin sonuna ?sifirla=1 eklenince service worker'ları
   kaldırıp bütün önbellekleri siliyoruz. Eski bir service worker artık var
   olmayan dosyaları sunmaya çalıştığında sayfa hiç açılmıyor; telefonda
   bunu temizlemenin başka yolu yok. */
async function sifirla() {
  const kok = document.getElementById('root')
  if (kok) kok.textContent = 'Önbellek temizleniyor…'
  try {
    if ('serviceWorker' in navigator) {
      const kayitlar = await navigator.serviceWorker.getRegistrations()
      await Promise.all(kayitlar.map((k) => k.unregister()))
    }
    if (window.caches) {
      const adlar = await caches.keys()
      await Promise.all(adlar.map((a) => caches.delete(a)))
    }
  } catch {
    /* Temizlik yapılamasa da yönlendirmeye devam: en kötü ihtimalle
       kullanıcı aynı yerde kalır, daha kötü bir duruma düşmez. */
  }
  window.location.replace(window.location.pathname)
}

if (new URLSearchParams(window.location.search).has('sifirla')) {
  sifirla()
} else {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <HataSiniri>
        <App />
      </HataSiniri>
    </StrictMode>,
  )
}
