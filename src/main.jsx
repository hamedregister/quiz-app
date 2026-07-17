import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null); // 'teacher' | 'student'
  
  // فیلدهای فرم احراز هویت
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [selectedRole, setSelectedRole] = useState('student');

  useEffect(() => {
    // ۱. بررسی نشست فعلی هنگام لود اولیه صفحه
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleUserSession(session);
    });

    // ۲. رصد تغییرات وضعیت احراز هویت
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleUserSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleUserSession = (session) => {
    if (session) {
      setSession(session);
      // استخراج دقیق نقش از متادیتای کاربر
      const userRole = session.user?.user_metadata?.role;
      if (userRole) {
        setRole(userRole);
      } else {
        setRole('student');
      }
    } else {
      setSession(null);
      setRole(null);
    }
    setLoading(false);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: { role: selectedRole }
        }
      });
      
      if (error) {
        alert(error.message);
      } else {
        alert('ثبت‌نام با موفقیت انجام شد! اکنون می‌توانید وارد شوید.');
        setIsSignUp(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '100px', fontFamily: 'sans-serif' }}>در حال بارگذاری ایمن وب‌اپلیکیشن آزمون‌ساز...</div>;
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif', direction: 'rtl' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: '15px', marginBottom: '20px' }}>
        <h2>سامانه آزمون‌های آنلاین و ریل‌تایم</h2>
        {session && (
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <span>کاربر: {session.user.email} ({role === 'teacher' ? 'استاد' : 'دانشجو'})</span>
            <button onClick={() => supabase.auth.signOut()} style={{ padding: '6px 12px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>خروج</button>
          </div>
        )}
      </header>

      {!session ? (
        <div style={{ maxWidth: '400px', margin: '50px auto', padding: '25px', border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <h3>{isSignUp ? 'ثبت‌نام حساب جدید' : 'ورود به سامانه آزمون'}</h3>
          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '15px' }}>
            <input type="email" placeholder="ایمیل" value={email} onChange={e => setEmail(e.target.value)} required style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
            <input type="password" placeholder="رمز عبور" value={password} onChange={e => setPassword(e.target.value)} required style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
            
            {isSignUp && (
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center', margin: '5px 0' }}>
                <label>نقش شما:</label>
                <label><input type="radio" name="role" value="student" checked={selectedRole === 'student'} onChange={() => setSelectedRole('student')} /> دانشجو</label>
                <label><input type="radio" name="role" value="teacher" checked={selectedRole === 'teacher'} onChange={() => setSelectedRole('teacher')} /> استاد</label>
              </div>
            )}
            
            <button type="submit" style={{ padding: '10px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
              {isSignUp ? 'ایجاد حساب' : 'ورود امن'}
            </button>
          </form>
          <p onClick={() => setIsSignUp(!isSignUp)} style={{ color: '#3498db', textAlign: 'center', marginTop: '15px', cursor: 'pointer', fontSize: '14px' }}>
            {isSignUp ? 'قبلاً ثبت نام کرده‌اید؟ ورود' : 'حساب کاربری ندارید؟ ثبت نام آنلاین'}
          </p>
        </div>
      ) : role === 'teacher' ? (
        <TeacherDashboard />
      ) : (
        <StudentDashboard userId={session.user.id} />
      )}
    </div>
  );
}

// --- داشبورد استاد ---
// --- داشبورد استاد اصلاح‌شده ---
function TeacherDashboard() {
  const [quizzes, setQuizzes] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(10); // دقیقه
  const [questions, setQuestions] = useState([{ q: '', a: '', b: '', c: '', d: '', correct: 'a' }]);

  useEffect(() => {
    fetchQuizzes();
    
    // فعال‌سازی مانیتورینگ ریل‌تایم برای پاسخ‌های ارسالی دانشجویان
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'submissions' }, payload => {
        setSubmissions(prev => [payload.new, ...prev]);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const fetchQuizzes = async () => {
    const { data } = await supabase.from('quizzes').select('*').order('created_at', { ascending: false });
    if (data) setQuizzes(data);
  };

  const addQuestionField = () => {
    setQuestions([...questions, { q: '', a: '', b: '', c: '', d: '', correct: 'a' }]);
  };

  const handleCreateQuiz = async () => {
    // چک کردن ولیدیشن به صورت دستی و با پیام مشخص
    if (!title.trim()) {
      alert('لطفاً عنوان آزمون را وارد کنید.');
      return;
    }

    // بررسی اینکه فیلدهای سوالات خالی نباشند
    for (let i = 0; i < questions.length; i++) {
      const item = questions[i];
      if (!item.q.trim() || !item.a.trim() || !item.b.trim() || !item.c.trim() || !item.d.trim()) {
        alert(`لطفاً تمام گزینه‌ها و صورت سوال شماره ${i + 1} را کامل کنید.`);
        return;
      }
    }

    try {
      console.log("برقراری ارتباط با سوبابیس برای ثبت آزمون...");
      const { data, error } = await supabase
        .from('quizzes')
        .insert([{ title, duration: parseInt(duration), questions }]);
      
      if (error) {
        console.error("Supabase Database Error:", error);
        alert(`خطا در ذخیره دیتابیس: ${error.message}\nکد خطا: ${error.code}`);
        return;
      }

      alert('آزمون با موفقیت ساخته و منتشر شد.');
      setTitle('');
      setDuration(10);
      setQuestions([{ q: '', a: '', b: '', c: '', d: '', correct: 'a' }]);
      fetchQuizzes();
    } catch (err) {
      console.error("Unexpected Error:", err);
      alert('یک خطای غیرمنتظره رخ داد: ' + err.message);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
      <div>
        <h3>🛠️ طراحی و ساخت آزمون جدید</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#f9f9f9', padding: '20px', borderRadius: '8px' }}>
          <input type="text" placeholder="عنوان آزمون (مثلا: میان‌ترم رباتیک)" value={title} onChange={e => setTitle(e.target.value)} style={{ padding: '8px' }} />
          <input type="number" placeholder="مدت زمان (دقیقه)" value={duration} onChange={e => setDuration(e.target.value)} style={{ padding: '8px' }} />
          
          <h4>سوالات آزمون:</h4>
          {questions.map((q, idx) => (
            <div key={idx} style={{ padding: '10px', background: '#fff', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '10px' }}>
              <input type="text" placeholder={`صورت سوال ${idx + 1}`} value={q.q} onChange={e => { const updated = [...questions]; updated[idx].q = e.target.value; setQuestions(updated); }} style={{ width: '95%', marginBottom: '5px', padding: '5px' }} />
              <input type="text" placeholder="گزینه الف" value={q.a} onChange={e => { const updated = [...questions]; updated[idx].a = e.target.value; setQuestions(updated); }} style={{ width: '45%', margin: '2px' }} />
              <input type="text" placeholder="گزینه ب" value={q.b} onChange={e => { const updated = [...questions]; updated[idx].b = e.target.value; setQuestions(updated); }} style={{ width: '45%', margin: '2px' }} />
              <input type="text" placeholder="گزینه ج" value={q.c} onChange={e => { const updated = [...questions]; updated[idx].c = e.target.value; setQuestions(updated); }} style={{ width: '45%', margin: '2px' }} />
              <input type="text" placeholder="گزینه د" value={q.d} onChange={e => { const updated = [...questions]; updated[idx].d = e.target.value; setQuestions(updated); }} style={{ width: '45%', margin: '2px' }} />
              <div style={{ marginTop: '5px' }}>
                <label>گزینه صحیح: </label>
                <select value={q.correct} onChange={e => { const updated = [...questions]; updated[idx].correct = e.target.value; setQuestions(updated); }}>
                  <option value="a">الف</option>
                  <option value="b">ب</option>
                  <option value="c">ج</option>
                  <option value="d">د</option>
                </select>
              </div>
            </div>
          ))}
          <button type="button" onClick={addQuestionField} style={{ padding: '5px', backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>➕ افزودن سوال بعدی</button>
          <button type="button" onClick={handleCreateQuiz} style={{ padding: '10px', backgroundColor: '#34495e', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', marginTop: '10px', cursor: 'pointer' }}>🚀 انتشار نهایی آزمون</button>
        </div>
      </div>

      <div>
        <h3>📊 رصد آنلاین و ریل‌تایم نتایج دانشجویان</h3>
        <div style={{ background: '#ecf0f1', padding: '15px', borderRadius: '8px', minHeight: '300px' }}>
          {submissions.length === 0 ? <p style={{ color: '#7f8c8d' }}>هنوز هیچ پاسخی به صورت زنده ثبت نشده است...</p> : (
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
              <thead>
                <tr style={{ background: '#bdc3c7' }}>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>شناسه دانشجو</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>شناسه آزمون</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>نمره نهایی</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub, i) => (
                  <tr key={i} style={{ textAlign: 'center' }}>
                    <td style={{ padding: '8px', border: '1px solid #ddd', fontSize: '12px' }}>{sub.student_id}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{sub.quiz_id}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', color: '#27ae60', fontWeight: 'bold' }}>{sub.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// --- داشبورد دانشجو ---
function StudentDashboard({ userId }) {
  const [quizzes, setQuizzes] = useState([]);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    fetchAvailableQuizzes();
  }, []);

  useEffect(() => {
    if (timeLeft <= 0 && activeQuiz) {
      handleSubmitQuiz();
      return;
    }
    if (!activeQuiz) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, activeQuiz]);

  const fetchAvailableQuizzes = async () => {
    const { data } = await supabase.from('quizzes').select('*');
    if (data) setQuizzes(data);
  };

  const startQuiz = (quiz) => {
    setActiveQuiz(quiz);
    setTimeLeft(quiz.duration * 60);
    setAnswers({});
  };

  const handleSubmitQuiz = async () => {
    let score = 0;
    activeQuiz.questions.forEach((q, idx) => {
      if (answers[idx] === q.correct) score += 1;
    });

    const finalScore = ((score / activeQuiz.questions.length) * 20).toFixed(2);

    const { error } = await supabase.from('submissions').insert([
      { quiz_id: activeQuiz.id, student_id: userId, score: parseFloat(finalScore), answers }
    ]);

    if (!error) {
      alert(`آزمون شما با موفقیت ثبت شد. نمره‌ شما: ${finalScore} از ۲۰`);
      setActiveQuiz(null);
    } else {
      alert('خطا در ثبت آزمون: ' + error.message);
    }
  };

  if (activeQuiz) {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    return (
      <div style={{ background: '#fff', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', background: '#f1c40f', padding: '10px 20px', borderRadius: '6px', marginBottom: '20px', fontWeight: 'bold' }}>
          <span>عنوان آزمون: {activeQuiz.title}</span>
          <span style={{ color: timeLeft < 60 ? '#e74c3c' : '#000' }}>
            ⏱️ زمان باقی‌مانده: {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
          </span>
        </div>

        {activeQuiz.questions.map((q, idx) => (
          <div key={idx} style={{ marginBottom: '20px', padding: '15px', borderBottom: '1px solid #eee' }}>
            <p style={{ fontWeight: 'bold' }}>{idx + 1}. {q.q}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginRight: '15px' }}>
              <label><input type="radio" name={`q-${idx}`} checked={answers[idx] === 'a'} onChange={() => setAnswers({...answers, [idx]: 'a'})} /> الف) {q.a}</label>
              <label><input type="radio" name={`q-${idx}`} checked={answers[idx] === 'b'} onChange={() => setAnswers({...answers, [idx]: 'b'})} /> ب) {q.b}</label>
              <label><input type="radio" name={`q-${idx}`} checked={answers[idx] === 'c'} onChange={() => setAnswers({...answers, [idx]: 'c'})} /> ج) {q.c}</label>
              <label><input type="radio" name={`q-${idx}`} checked={answers[idx] === 'd'} onChange={() => setAnswers({...answers, [idx]: 'd'})} /> د) {q.d}</label>
            </div>
          </div>
        ))}

        <button onClick={handleSubmitQuiz} style={{ padding: '12px 25px', backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', float: 'left' }}>
          پایان آزمون و ثبت نهایی
        </button>
        <div style={{ clear: 'both' }}></div>
      </div>
    );
  }

  return (
    <div>
      <h3>✍️ آزمون‌های فعال و در دسترس</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', marginTop: '15px' }}>
        {quizzes.length === 0 ? <p>هیچ آزمونی در حال حاضر تعریف نشده است.</p> : quizzes.map(quiz => (
          <div key={quiz.id} style={{ border: '1px solid #e0e0e0', padding: '15px', borderRadius: '8px', backgroundColor: '#fafafa' }}>
            <h4>{quiz.title}</h4>
            <p style={{ color: '#666', fontSize: '14px' }}>⏱️ مدت زمان آزمون: {quiz.duration} دقیقه</p>
            <button onClick={() => startQuiz(quiz)} style={{ width: '100%', padding: '8px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              شروع فرآیند آزمون
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}
