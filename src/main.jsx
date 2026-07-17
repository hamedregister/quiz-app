import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';

function App() {
  // شبیه‌سازی وضعیت ورود برای تست بالا آمدن قالب
  const [view, setView] = useState('auth'); 
  const [isSignUp, setIsSignUp] = useState(false);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', fontFamily: 'Tahoma, sans-serif', direction: 'rtl' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eef2f3', paddingBottom: '15px', marginBottom: '30px' }}>
        <h2>سامانه امتحانات و آزمون‌های ریل‌تایم (نسخه کلاینت)</h2>
      </header>

      <div style={{ maxWidth: '450px', margin: '60px auto', padding: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)', borderRadius: '12px', backgroundColor: '#fff', border: '1px solid #eee' }}>
        <h3>{isSignUp ? 'ایجاد حساب کاربری جدید' : 'ورود کاربری امن'}</h3>
        <form style={{ display: 'flex', flexDirection: 'column', gap: '15px' }} onSubmit={(e) => e.preventDefault()}>
          {isSignUp && <input type="text" placeholder="نام و نام خانوادگی" style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ccc' }} />}
          <input type="email" placeholder="آدرس ایمیل" style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ccc' }} />
          <input type="password" placeholder="کلمه عبور" style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ccc' }} />
          <button type="submit" style={{ backgroundColor: '#3498db', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            {isSignUp ? 'ثبت نام' : 'ورود امن'}
          </button>
        </form>
        <p onClick={() => setIsSignUp(!isSignUp)} style={{ textAlign: 'center', marginTop: '15px', color: '#3498db', cursor: 'pointer', fontSize: '14px' }}>
          {isSignUp ? 'حساب کاربری دارید؟ وارد شوید' : 'حساب کاربری ندارید؟ ثبت‌نام کنید'}
        </p>
      </div>
    </div>
  );
}

// رندر مستقیم روی المان روت بدون هیچ لایه اضافی
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}
