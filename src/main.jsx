import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';

// ۱. خواندن متغیرهای محیطی از Vite
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// مکانیزم دفاعی: اگر متغیرها خالی باشند، کلاینت سوبابیس را نمی‌سازیم تا برنامه کرش نکند
let supabase = null;
let envError = false;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.includes("your-") || SUPABASE_ANON_KEY.includes("your-")) {
  envError = true;
} else {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(!envError); // اگر خطا داریم، نیازی به لودینگ دیتابیس نیست
  const [view, setView] = useState('auth'); // auth, teacher, student

  // بررسی وضعیت لاگین در شروع برنامه
  useEffect(() => {
    if (envError || !supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    }).catch(err => {
      console.error("Auth error:", err);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // نمایش خطای متغیرهای محیطی به جای صفحه سفید
  if (envError) {
    return (
      <div style={{ maxWidth: '500px', margin: '100px auto', padding: '30px', border: '2px solid #e74c3c', borderRadius: '8px', backgroundColor: '#fdf2f2', fontFamily: 'sans-serif', direction: 'rtl', textAlign: 'center' }}>
        <h3 style={{ color: '#c0392b' }}>⚠️ خطای پیکربندی متغیرهای محیطی</h3>
        <p style={{ color: '#555', lineHeight: '1.6' }}>
          متغیرهای اتصال به سوبابیس پیدا نشدند یا نامعتبر هستند. لطفا مطمئن شوید که 
          <code style={{ background: '#eee', padding: '2px 6px', borderRadius: '4px', margin: '0 4px' }}>VITE_SUPABASE_URL</code> و 
          <code style={{ background: '#eee', padding: '2px 6px', borderRadius: '4px', margin: '0 4px' }}>VITE_SUPABASE_ANON_KEY</code> 
          را در بخش Repository Secrets در گیت‌هاب تعریف کرده‌اید.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif', direction: 'rtl' }}>
        <h3>در حال بارگذاری ایمن وب اپلیکیشن آزمون‌ساز...</h3>
      </div>
    );
  }

  // کدهای مربوط به رندر داشبوردها و بخش احراز هویت
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif', direction: 'rtl' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: '15px' }}>
        <h2>سامانه آزمون‌ساز آنلاین (استاد / دانشجو)</h2>
        {session && <button onClick={() => supabase.auth.signOut()} style={{ padding: '8px 12px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>خروج</button>}
      </header>
      
      {/* در اینجا کامپوننت‌های اصلی بر اساس وضعیت session و نقش کاربر رندر می‌شوند */}
      <div style={{ marginTop: '30px', textAlign: 'center' }}>
        <p>اتصال به سوبابیس با موفقیت برقرار شد. در حال حاضر آماده توسعه بخش‌های داخلی دیتابیس هستیم.</p>
      </div>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}
