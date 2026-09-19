import { Component, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { baslat, yenidenYukle } from './pwa/pwa.js'
/* Sıra önemli: tema.css renkleri tanımlar, sistem.css o renklerin
   ne zaman kullanılacağını, index.css yalnızca yerleşimi. */
import './tema.css'
import './sistem.css'
import './index.css'
import './yerlesim.css'
/* Ortak bileşenler en son: kurallar burada tek yerde. */
import './ortak/ortak.css'

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
            onClick={yenidenYukle}
          >
            Önbelleği temizle
          </button>
        </div>
      </div>
    )
  }
}

/* PWA React'ten önce başlar: kurulum izni çok erken geliyor (pwa.js).
   Kurtarma (?sifirla=1) index.html'deki betikte; o çalışıyorsa uygulama
   açılmaz, sayfa temizlenip kendini yeniden yükler. */
baslat()

if (!window.__sifirlaniyor) {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <HataSiniri>
        <App />
      </HataSiniri>
    </StrictMode>,
  )
}
