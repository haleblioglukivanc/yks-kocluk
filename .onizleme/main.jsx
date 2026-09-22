import { createRoot } from 'react-dom/client'
import '../src/tema.css'; import '../src/sistem.css'; import '../src/index.css'; import '../src/mevsim.css'
import { PortreCizimi, TabelaCizimi } from '../src/ortak/KapiCizimleri.jsx'
const q = new URLSearchParams(location.search); const m = q.get('mevsim') || 'yaz'
createRoot(document.getElementById('kok')).render(
  <div style={{ background: '#cfe4f5', padding: 40, minHeight: '100vh' }}>
    <div className="ana-tepe-cizim" style={{ position: 'relative', top: 0, right: 0, width: 140 }}>
      <PortreCizimi mevsim={m} bas="K" idEk="p" />
    </div>
    <div style={{ height: 60 }} />
    <div className="ana-tepe-cizim" style={{ position: 'relative', top: 0, right: 0, width: 140 }}>
      <TabelaCizimi mevsim={m} zemin={false} canli ogrenciler={[{bas:'A'},{bas:'B'}]} />
    </div>
  </div>)
