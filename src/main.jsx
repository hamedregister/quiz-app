import React from 'react'
import ReactDOM from 'react-dom/client'

function App() {
  return (
    <div style={{ textAlign: 'center', marginTop: '50px', fontFamily: 'sans-serif' }}>
      <h1>وب اپلیکیشن آزمون ساز آنلاین</h1>
      <p>این پروژه با موفقیت روی گیت‌هاب پیجز منتشر شد و به سوبابیس متصل است.</p>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
