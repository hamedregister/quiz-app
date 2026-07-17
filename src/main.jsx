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
        <TeacherDashboard userId={session.user.id} />
      ) : (
        <StudentDashboard userId={session.user.id} />
      )}
    </div>
  );
}

// --- داشبورد استاد ---
// --- داشبورد استاد اصلاح‌شده ---
function TeacherDashboard({ userId }) {
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
    if (!title.trim()) {
      alert('لطفاً عنوان آزمون را وارد کنید.');
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const item = questions[i];
      if (!item.q.trim() || !item.a.trim() || !item.b.trim() || !item.c.trim() || !item.d.trim()) {
        alert(`لطفاً تمام گزینه‌ها و صورت سوال شماره ${i + 1} را کامل کنید.`);
        return;
      }
    }

    try {
      console.log("در حال ساخت ردیف آزمون به همراه شناسه استاد...");
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + parseInt(duration) * 60000);

      // مرحله اول: ثبت آزمون با پر کردن فیلد created_by
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .insert([
          { 
            title, 
            start_time: startTime.toISOString(), 
            end_time: endTime.toISOString(),
            created_by: userId // شناسه کاربری استاد در اینجا قرار می‌گیرد
          }
        ])
        .select();
      
      if (quizError) {
        console.error("Quiz Insertion Error:", quizError);
        alert(`خطا در ایجاد آزمون: ${quizError.message}`);
        return;
      }

      const createdQuizId = quizData[0].id;
      console.log(`آزمون ساخته شد. شناسه: ${createdQuizId}. ارسال سوالات...`);

      // مرحله دوم: ثبت سوالات متصل به آزمون
      // مپ کردن حروف الف، ب، ج، د (یا a, b, c, d) به اعداد 1 تا 4 برای دیتابیس
      const optionMapping = { 'a': 'A', 'b': 'B', 'c': 'C', 'd': 'D' };
      
      const questionsToInsert = questions.map(item => ({
        quiz_id: createdQuizId,
        question_text: item.q,
        option_a: item.a,
        option_b: item.b,
        option_c: item.c,
        option_d: item.d,
        correct_option: optionMapping[item.correct] || item.correct // اگر دیتابیس عدد بخواهد تبدیل می‌شود
      }));

      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questionsToInsert);

      if (questionsError) {
        console.error("Questions Insertion Error:", questionsError);
        alert(`آزمون ساخته شد ولی سوالات ثبت نشدند: ${questionsError.message}`);
        return;
      }

      alert('آزمون و تمامی سوالات آن با موفقیت منتشر شدند!');
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
upabase
        .from('quizzes')
        .select('*')
        .gt('end_time', now)
        .order('start_time', { ascending: true });

      if (error) throw error;
      setQuizzes(data || []);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    }
  };

  // ۲. شروع آزمون و دریافت سوالات مربوط به آن
  const startQuiz = async (quiz) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', quiz.id);

      if (error) throw error;

      if (!data || data.length === 0) {
        alert('این آزمون هیچ سوالی ندارد!');
        return;
      }

      setCurrentQuiz(quiz);
      setQuestions(data);
      setAnswers({});

      // محاسبه زمان باقی‌مانده بر اساس زمان پایان آزمون (به ثانیه)
      const durationInSeconds = Math.floor((new Date(quiz.end_time) - new Date()) / 1000);
      setTimeLeft(durationInSeconds > 0 ? durationInSeconds : 0);

    } catch (error) {
      console.error('Error starting quiz:', error);
      alert('خطا در بارگذاری سوالات آزمون');
    } finally {
      setLoading(false);
    }
  };

  // تایمر معکوس آزمون
  useEffect(() => {
    if (!currentQuiz || timeLeft <= 0) {
      if (currentQuiz && timeLeft === 0) {
        alert('زمان آزمون به پایان رسید!');
        handleSubmitQuiz();
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, currentQuiz]);

  // ۳. ثبت نهایی پاسخ‌های دانشجو در دیتابیس

const handleSubmitQuiz = async () => {
  if (!currentQuiz) return;
  setLoading(true);

  try {
    // آماده‌سازی دقیق payload برای جدول quiz_submissions
    const submissionData = {
      user_id: userId,
      quiz_id: currentQuiz.id,
      // شیء answers دقیقاً به فرمت { "question_id_1": "A", "question_id_2": "C" } ذخیره می‌شود
      answers: answers, 
      submitted_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('quiz_submissions') // استفاده از نام دقیق جدول شما
      .insert([submissionData]);

    if (error) throw error;

    alert('پاسخ‌های شما با موفقیت در سیستم ثبت شد.');
    setCurrentQuiz(null);
    setQuestions([]);
    fetchAvailableQuizzes();
  } catch (error) {
    console.error('Error submitting quiz:', error);
    alert(`خطا در ثبت آزمون: ${error.message}`);
  } finally {
    setLoading(false);
  }
};

  // فرمت کردن زمان به شکل MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (currentQuiz) {
    return (
      <div className="quiz-container">
        <h2>{currentQuiz.title}</h2>
        <div className="timer">زمان باقی‌مانده: {formatTime(timeLeft)}</div>
        
        {questions.map((q, index) => (
          <div key={q.id} className="question-block">
            <p><strong>سوال {index + 1}:</strong> {q.question_text}</p>
            <div className="options">
              {['A', 'B', 'C', 'D'].map(opt => (
                <label key={opt} className="option-label">
                  <input
                    type="radio"
                    name={`question-${q.id}`}
                    value={opt}
                    checked={answers[q.id] === opt}
                    // ذخیره با همان حروف بزرگ A, B, C, D که دیتابیس دوست دارد
                    onChange={() => setAnswers({ ...answers, [q.id]: opt })} 
                  />
                  {q[`option_${opt.toLowerCase()}`]}
                </label>
              ))}
            </div>
          </div>
        ))}

        <button onClick={handleSubmitQuiz} disabled={loading} className="btn-submit">
          {loading ? 'در حال ثبت...' : 'پایان و ارسال آزمون'}
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <h2>آزمون‌های فعال و در دسترس</h2>
      {quizzes.length === 0 ? (
        <p>در حال حاضر هیچ آزمون فعالی وجود ندارد.</p>
      ) : (
        <ul className="quiz-list">
          {quizzes.map(quiz => (
            <li key={quiz.id} className="quiz-item">
              <div>
                <strong>{quiz.title}</strong>
                <span className="quiz-date"> پایان: {new Date(quiz.end_time).toLocaleTimeString('fa-IR')}</span>
              </div>
              <button onClick={() => startQuiz(quiz)} disabled={loading} className="btn-start">
                شروع آزمون
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default StudentDashboard;

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}
