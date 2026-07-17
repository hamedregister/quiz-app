import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';

// ۱. تنظیمات اولیه سوبابیس
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

function MainApp() {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null); 
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserRole(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchUserRole(session.user.id);
      else {
        setRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setRole(data?.role || 'student');
    } catch (err) {
      console.error("Error fetching role:", err);
      setRole('student'); 
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(`خطا در ورود: ${error.message}`);
    setLoading(false);
  };

  const handleLogout = () => {
    supabase.auth.signOut().then(() => {
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    });
  };

  if (!session) {
    return (
      <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', direction: 'rtl', background: '#fff', color: '#000', fontFamily: 'Tahoma, sans-serif' }}>
        <h2 style={{ textAlign: 'center' }}>ورود به سامانه آزمون</h2>
        {loading && <p style={{ color: 'blue', textAlign: 'center' }}>در حال پردازش...</p>}
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '15px' }}>
            <label>ایمیل:</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label>رمز عبور:</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box' }} />
          </div>
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            ورود
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Tahoma, sans-serif', direction: 'rtl', background: '#fff', color: '#000' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
        <span>کاربر: {session.user?.email} ({role === 'teacher' ? 'استاد' : 'دانشجو'})</span>
        <button onClick={handleLogout} style={{ padding: '5px 10px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>خروج</button>
      </header>

      <main style={{ marginTop: '20px' }}>
        {role === 'teacher' ? (
          <TeacherDashboard userId={session.user?.id} />
        ) : (
          <StudentDashboard userId={session.user?.id} />
        )}
      </main>
    </div>
  );
}

// ==========================================
// کامپوننت داشبورد استاد
// ==========================================
// ==========================================
// کامپوننت داشبورد استاد (نسخه اصلاح شده با لیست آزمون‌ها)
// ==========================================
function TeacherDashboard({ userId }) {
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(10); 
  const [questions, setQuestions] = useState([{ q: '', a: '', b: '', c: '', d: '', correct: 'a' }]);
  const [loading, setLoading] = useState(false);
  const [myQuizzes, setMyQuizzes] = useState([]); // وضعیت ذخیره آزمون‌های استاد

  // فراخوانی آزمون‌ها به محض لود شدن داشبورد استاد
  useEffect(() => {
    if (userId) {
      fetchMyQuizzes();
    }
  }, [userId]);

  const fetchMyQuizzes = async () => {
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select(`
          id,
          title,
          start_time,
          end_time,
          questions (id)
        `)
        .eq('created_by', userId)
        .order('start_time', { ascending: false });

      if (error) throw error;
      setMyQuizzes(data || []);
    } catch (err) {
      console.error('Error fetching teacher quizzes:', err);
    }
  };

  const handleAddQuestion = () => {
    setQuestions([...questions, { q: '', a: '', b: '', c: '', d: '', correct: 'a' }]);
  };

  const handleQuestionChange = (index, field, value) => {
    const updated = [...questions];
    updated[index][field] = value;
    setQuestions(updated);
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

    setLoading(true);
    try {
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + parseInt(duration) * 60000);

      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .insert([{ title, start_time: startTime.toISOString(), end_time: endTime.toISOString(), created_by: userId }])
        .select();
      
      if (quizError) throw quizError;

      const createdQuizId = quizData[0].id;
      const optionMapping = { 'a': 'A', 'b': 'B', 'c': 'C', 'd': 'D' };

      const questionsToInsert = questions.map(item => ({
        quiz_id: createdQuizId,
        question_text: item.q,
        option_a: item.a,
        option_b: item.b,
        option_c: item.c,
        option_d: item.d,
        correct_option: optionMapping[item.correct] || item.correct
      }));

      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questionsToInsert);

      if (questionsError) throw questionsError;

      alert('آزمون و تمامی سوالات آن با موفقیت منتشر شدند!');
      setTitle('');
      setDuration(10);
      setQuestions([{ q: '', a: '', b: '', c: '', d: '', correct: 'a' }]);
      fetchMyQuizzes(); // به‌روزرسانی لیست آزمون‌ها پس از ساخت آزمون جدید
    } catch (err) {
      console.error(err);
      alert(`خطا در ایجاد آزمون: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
      {/* بخش سمت راست: فرم ساخت آزمون */}
      <div>
        <h2>ساخت آزمون جدید</h2>
        <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '6px', marginBottom: '20px', border: '1px solid #ddd' }}>
          <div style={{ marginBottom: '10px' }}>
            <label>عنوان آزمون: </label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} style={{ padding: '6px', width: '250px' }} />
          </div>
          <div>
            <label>مدت زمان آزمون (دقیقه): </label>
            <input type="number" value={duration} onChange={e => setDuration(e.target.value)} style={{ padding: '6px', width: '80px' }} />
          </div>
        </div>

        <h3>سوالات آزمون</h3>
        {questions.map((item, index) => (
          <div key={index} style={{ border: '1px solid #ddd', padding: '15px', marginBottom: '15px', borderRadius: '6px', background: '#fff' }}>
            <h4>سوال {index + 1}</h4>
            <input type="text" placeholder="صورت سوال" value={item.q} onChange={e => handleQuestionChange(index, 'q', e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '10px', boxSizing: 'border-box' }} />
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <input type="text" placeholder="گزینه الف (A)" value={item.a} onChange={e => handleQuestionChange(index, 'a', e.target.value)} style={{ padding: '6px' }} />
              <input type="text" placeholder="گزینه ب (B)" value={item.b} onChange={e => handleQuestionChange(index, 'b', e.target.value)} style={{ padding: '6px' }} />
              <input type="text" placeholder="گزینه ج (C)" value={item.c} onChange={e => handleQuestionChange(index, 'c', e.target.value)} style={{ padding: '6px' }} />
              <input type="text" placeholder="گزینه د (D)" value={item.d} onChange={e => handleQuestionChange(index, 'd', e.target.value)} style={{ padding: '6px' }} />
            </div>

            <div style={{ marginTop: '10px' }}>
              <label>گزینه صحیح: </label>
              <select value={item.correct} onChange={e => handleQuestionChange(index, 'correct', e.target.value)} style={{ padding: '4px' }}>
                <option value="a">گزینه الف (A)</option>
                <option value="b">گزینه ب (B)</option>
                <option value="c">گزینه ج (C)</option>
                <option value="d">گزینه د (D)</option>
              </select>
            </div>
          </div>
        ))}

        <button onClick={handleAddQuestion} style={{ padding: '8px 15px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginLeft: '10px' }}>افزودن سوال جدید</button>
        <button onClick={handleCreateQuiz} disabled={loading} style={{ padding: '8px 20px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          {loading ? 'در حال ثبت...' : 'انتشار نهایی آزمون'}
        </button>
      </div>

      {/* بخش سمت چپ: لیست آزمون‌های ایجاد شده */}
      <div>
        <h2>آزمون‌های تعریف شده شما</h2>
        {myQuizzes.length === 0 ? (
          <p style={{ color: '#666' }}>هنوز آزمونی توسط شما ایجاد نشده است.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', direction: 'rtl', textAlign: 'right' }}>
              <thead>
                <tr style={{ background: '#f1f1f1', borderBottom: '2px solid #ccc' }}>
                  <th style={{ padding: '10px', border: '1px solid #ddd' }}>عنوان آزمون</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd' }}>تعداد سوالات</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd' }}>وضعیت زمان</th>
                </tr>
              </thead>
              <tbody>
                {myQuizzes.map((quiz) => {
                  const isExpired = new Date(quiz.end_time) < new Date();
                  return (
                    <tr key={quiz.id} style={{ borderBottom: '1px solid #ddd' }}>
                      <td style={{ padding: '10px', border: '1px solid #ddd', fontWeight: 'bold' }}>{quiz.title}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>{quiz.questions?.length || 0}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd', color: isExpired ? 'red' : 'green' }}>
                        {isExpired ? 'پایان یافته' : 'در دسترس / فعال'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// کامپوننت داشبورد دانشجو
// ==========================================
function StudentDashboard({ userId }) {
  const [quizzes, setQuizzes] = useState([]);
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({}); 
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAvailableQuizzes();
  }, []);

  const fetchAvailableQuizzes = async () => {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
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

  const startQuiz = async (quiz) => {
    if (!quiz || !quiz.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', quiz.id);

      if (error) throw error;

      if (!data || data.length === 0) {
        alert('این آزمون سوالی ندارد!');
        return;
      }

      const endTimeParsed = Date.parse(quiz.end_time);
      const nowParsed = Date.now();
      const durationInSeconds = Math.floor((endTimeParsed - nowParsed) / 1000);

      setTimeLeft(durationInSeconds > 0 ? durationInSeconds : 0);
      setQuestions(data);
      setAnswers({});
      setCurrentQuiz(quiz);
    } catch (error) {
      console.error(error);
      alert('خطا در بارگذاری سوالات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentQuiz || timeLeft <= 0) {
      if (currentQuiz && timeLeft === 0) {
        alert('زمان قانونی آزمون به پایان رسید!');
        handleSubmitQuiz();
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, currentQuiz]);

  const handleSubmitQuiz = async () => {
  if (!currentQuiz) return;
  setLoading(true);

  try {
    // هماهنگ‌سازی دقیق با ساختار جدول شما
    const submissionData = {
      quiz_id: currentQuiz.id,
      student_id: userId, // تغییر نام کلید به student_id مطابق دیتابیس شما
      answers: answers,
      status: 'submitted' // تغییر وضعیت از در جریان به ثبت شده
    };

    const { error } = await supabase
      .from('quiz_submissions')
      .insert([submissionData]);

    if (error) throw error;

    alert('پاسخ‌های شما با موفقیت ثبت شد.');
    setCurrentQuiz(null);
    setQuestions([]);
    fetchAvailableQuizzes();
  } catch (error) {
    console.error(error);
    alert(`خطا در ثبت نهایی آزمون: ${error.message}`);
  } finally {
    setLoading(false);
  }
};

  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (currentQuiz) {
    return (
      <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #eee' }}>
        <h2>{currentQuiz.title || 'آزمون جاری'}</h2>
        <div style={{ color: 'red', fontWeight: 'bold', marginBottom: '20px' }}>زمان باقی‌مانده: {formatTime(timeLeft)}</div>
        
        {questions.map((q, index) => {
          if (!q) return null;
          return (
            <div key={q.id || index} style={{ marginBottom: '20px', borderBottom: '1px dashed #eee', paddingBottom: '15px' }}>
              <p><strong>سوال {index + 1}:</strong> {q.question_text || 'بدون متن سوال'}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                {['A', 'B', 'C', 'D'].map(opt => {
                  const optionValue = q[`option_${opt.toLowerCase()}`] || q[`option_${opt}`] || q[opt] || 'بدون گزینه';
                  return (
                    <label key={opt} style={{ cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name={`question-${q.id}`}
                        value={opt}
                        checked={answers[q.id] === opt}
                        onChange={() => setAnswers({ ...answers, [q.id]: opt })} 
                        style={{ marginLeft: '8px' }}
                      />
                      {opt}: {optionValue}
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}

        <button onClick={handleSubmitQuiz} disabled={loading} style={{ padding: '10px 25px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '16px' }}>
          {loading ? 'در حال ارسال...' : 'پایان و ارسال آزمون'}
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2>آزمون‌های فعال سیستم</h2>
      {quizzes.length === 0 ? (
        <p>در حال حاضر آزمون باز و فعالی پیدا نشد.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {quizzes.map(quiz => (
            <li key={quiz.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9f9f9', padding: '15px', marginBottom: '10px', borderRadius: '6px', border: '1px solid #ddd' }}>
              <div>
                <strong>{quiz.title}</strong>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>پایان: {quiz.end_time ? new Date(quiz.end_time).toLocaleTimeString('fa-IR') : 'نامشخص'}</div>
              </div>
              <button onClick={() => startQuiz(quiz)} disabled={loading} style={{ padding: '6px 15px', background: '#17a2b8', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                شروع آزمون
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ==========================================
// اتصال نهایی به المان root در فایل HTML (تزریق به صفحه)
// ==========================================
const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <MainApp />
    </React.StrictMode>
  );
}
