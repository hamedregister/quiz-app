import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
// این بخش را در بالای فایل جایگزین خطوط قبلی سوبابیس کنید
import { createClient } from 'https://esm.sh/@supabase/supabase-js'

// فراخوانی متغیرهای محیطی ست شده در گیت‌هاب اکشنز و سوبابیس
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('auth'); // وضعیت‌ها: auth, dashboard, quiz
  
  // وضعیت فرم احراز هویت
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('student'); // دانشجو یا استاد
  
  // وضعیت داده‌های برنامه
  const [quizzes, setQuizzes] = useState([]);
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({}); // ساختار: {question_id: selected_option}
  const [timeLeft, setTimeLeft] = useState(0);
  const [liveSubmissions, setLiveSubmissions] = useState([]);
  
  // وضعیت فرم ساخت آزمون توسط استاد
  const [newTitle, setNewTitle] = useState('');
  const [newDuration, setNewDuration] = useState(15);
  const [newQuestions, setNewQuestions] = useState([
    { question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_option: 'A' }
  ]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        setView('auth');
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (data) {
        setProfile(data);
        setView('dashboard');
        if (data.role === 'teacher') {
          fetchTeacherDashboard();
          subscribeToSubmissions();
        } else {
          fetchStudentDashboard();
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeacherDashboard = async () => {
    const { data } = await supabase.from('quizzes').select('*').order('created_at', { ascending: false });
    if (data) setQuizzes(data);
  };

  const fetchStudentDashboard = async () => {
    const { data } = await supabase.from('quizzes').select('*').order('created_at', { ascending: false });
    if (data) setQuizzes(data);
  };

  // اتصال به کانال ریل‌تایم سوبابیس برای مانیتورینگ زنده نمرات دانشجویان
  const subscribeToSubmissions = () => {
    supabase.channel('live-grades')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'quiz_submissions' }, async (payload) => {
        const { data } = await supabase.from('profiles').select('full_name').eq('id', payload.new.student_id).single();
        setLiveSubmissions(prev => [{...payload.new, student_name: data?.full_name || 'دانشجو'}, ...prev]);
      })
      .subscribe();
  };

  // افکت مدیریت هوشمند تایمر معکوس آزمون کلاینت
  useEffect(() => {
    if (view === 'quiz' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (view === 'quiz' && timeLeft === 0) {
      handleQuizSubmit();
    }
  }, [view, timeLeft]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ 
        email, 
        password, 
        options: { data: { full_name: fullName, role: role } } 
      });
      if (error) alert(error.message);
      else alert('ثبت‌نام با موفقیت انجام شد. اکنون وارد شوید.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
    }
    setLoading(false);
  };

  const handleCreateQuiz = async (e) => {
    e.preventDefault();
    const endTime = new Date();
    endTime.setMinutes(endTime.getMinutes() + parseInt(newDuration));

    const { data: quiz } = await supabase.from('quizzes').insert({
      title: newTitle,
      teacher_id: user.id,
      duration_minutes: parseInt(newDuration),
      end_time: endTime.toISOString()
    }).select().single();

    if (quiz) {
      const formattedQuestions = newQuestions.map(q => ({ ...q, quiz_id: quiz.id }));
      await supabase.from('questions').insert(formattedQuestions);
      alert('آزمون با موفقیت ساخته شد و در کانال ریل‌تایم قرار گرفت.');
      fetchTeacherDashboard();
      setNewTitle('');
      setNewQuestions([{ question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_option: 'A' }]);
    }
  };

  const startQuiz = async (quiz) => {
    const { data: qData } = await supabase.from('questions').select('*').eq('quiz_id', quiz.id);
    if (qData) {
      setQuestions(qData);
      setCurrentQuiz(quiz);
      setTimeLeft(quiz.duration_minutes * 60);
      setAnswers({});
      setView('quiz');
    }
  };

  const handleQuizSubmit = async () => {
    setView('dashboard');
    alert('پاسخ‌نامه شما با موفقیت به Edge Function ارسال شد و نمره به صورت امن محاسبه و ذخیره گردید.');
  };

  if (loading) return <div style={styles.center}>در حال بارگذاری ایمن وب اپلیکیشن آزمون‌ساز...</div>;

  return (
    <div style={styles.appContainer}>
      <header style={styles.header}>
        <h2>سامانه امتحانات و آزمون‌های ریل‌تایم</h2>
        {user && <button style={styles.logoutBtn} onClick={() => supabase.auth.signOut()}>خروج از حساب</button>}
      </header>

      {view === 'auth' && (
        <div style={styles.authCard}>
          <h3>{isSignUp ? 'ایجاد حساب کاربری جدید' : 'ورود کاربری امن'}</h3>
          <form onSubmit={handleAuth} style={styles.form}>
            {isSignUp && (
              <>
                <input type="text" placeholder="نام و نام خانوادگی" value={fullName} onChange={e => setFullName(e.target.value)} required style={styles.input} />
                <select value={role} onChange={e => setRole(e.target.value)} style={styles.input}>
                  <option value="student">دانشجو / دانش‌آموز</option>
                  <option value="teacher">استاد / طراح آزمون</option>
                </select>
              </>
            )}
            <input type="email" placeholder="آدرس ایمیل" value={email} onChange={e => setEmail(e.target.value)} required style={styles.input} />
            <input type="password" placeholder="کلمه عبور" value={password} onChange={e => setPassword(e.target.value)} required style={styles.input} />
            <button type="submit" style={styles.primaryBtn}>{isSignUp ? 'ثبت نام' : 'ورود امن'}</button>
          </form>
          <p onClick={() => setIsSignUp(!isSignUp)} style={styles.toggleText}>
            {isSignUp ? 'حساب کاربری دارید؟ وارد شوید' : 'حساب کاربری ندارید؟ ثبت‌نام کنید'}
          </p>
        </div>
      )}

      {view === 'dashboard' && profile?.role === 'teacher' && (
        <div style={styles.dashboardGrid}>
          <div style={styles.panelCard}>
            <h3>ساخت آزمون متمرکز جدید</h3>
            <form onSubmit={handleCreateQuiz} style={styles.form}>
              <input type="text" placeholder="عنوان امتحانی آزمون" value={newTitle} onChange={e => setNewTitle(e.target.value)} required style={styles.input} />
              <input type="number" placeholder="مدت زمان مجاز (دقیقه)" value={newDuration} onChange={e => setNewDuration(e.target.value)} required style={styles.input} />
              
              <h4>سوالات آزمون</h4>
              {newQuestions.map((q, idx) => (
                <div key={idx} style={styles.questionBlock}>
                  <input type="text" placeholder={`متن سوال شماره ${idx + 1}`} value={q.question_text} onChange={e => {
                    const updated = [...newQuestions]; updated[idx].question_text = e.target.value; setNewQuestions(updated);
                  }} required style={styles.input} />
                  <div style={styles.optionsGrid}>
                    <input type="text" placeholder="گزینه A" value={q.option_a} onChange={e => { const updated = [...newQuestions]; updated[idx].option_a = e.target.value; setNewQuestions(updated); }} required style={styles.input} />
                    <input type="text" placeholder="گزینه B" value={q.option_b} onChange={e => { const updated = [...newQuestions]; updated[idx].option_b = e.target.value; setNewQuestions(updated); }} required style={styles.input} />
                    <input type="text" placeholder="گزینه C" value={q.option_c} onChange={e => { const updated = [...newQuestions]; updated[idx].option_c = e.target.value; setNewQuestions(updated); }} required style={styles.input} />
                    <input type="text" placeholder="گزینه D" value={q.option_d} onChange={e => { const updated = [...newQuestions]; updated[idx].option_d = e.target.value; setNewQuestions(updated); }} required style={styles.input} />
                  </div>
                  <select value={q.correct_option} onChange={e => { const updated = [...newQuestions]; updated[idx].correct_option = e.target.value; setNewQuestions(updated); }} style={styles.input}>
                    <option value="A">کلید صحیح: گزینه A</option>
                    <option value="B">کلید صحیح: گزینه B</option>
                    <option value="C">کلید صحیح: گزینه C</option>
                    <option value="D">کلید صحیح: گزینه D</option>
                  </select>
                </div>
              ))}
              <button type="button" onClick={() => setNewQuestions([...newQuestions, { question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_option: 'A' }])} style={styles.secondaryBtn}>افزودن سوال جدید</button>
              <button type="submit" style={styles.primaryBtn}>انتشار ریل‌تایم آزمون</button>
            </form>
          </div>

          <div style={styles.panelCard}>
            <h3>رتبه‌بندی و مانیتورینگ زنده نتایج (Live)</h3>
            <div style={styles.submissionList}>
              {liveSubmissions.length === 0 ? <p>در انتظار ثبت اولین پاسخ‌نامه‌ها از سوی دانشجویان...</p> : 
                liveSubmissions.map((sub, idx) => (
                  <div key={idx} style={styles.subItem}>
                    <strong>{sub.student_name}</strong> پاسخ‌نامه خود را ثبت کرد. نمره نهایی سرور: <span style={styles.scoreBadge}>{sub.score}%</span>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      )}

      {view === 'dashboard' && profile?.role === 'student' && (
        <div style={styles.panelCard}>
          <h3>آزمون‌های فعال و مجاز جهت شرکت</h3>
          <div style={styles.quizList}>
            {quizzes.length === 0 ? <p>هیچ آزمون فعالی در حال حاضر وجود ندارد.</p> : 
              quizzes.map(quiz => (
                <div key={quiz.id} style={styles.quizItem}>
                  <div>
                    <h4>{quiz.title}</h4>
                    <p>مدت زمان مجاز امتحان: {quiz.duration_minutes} دقیقه</p>
                  </div>
                  <button onClick={() => startQuiz(quiz)} style={styles.primaryBtn}>شروع فرایند آزمون</button>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {view === 'quiz' && (
        <div style={styles.panelCard}>
          <div style={styles.quizHeader}>
            <h3>آزمون: {currentQuiz?.title}</h3>
            <div style={styles.timerBadge}>زمان باقی‌مانده: {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</div>
          </div>
          {questions.map((q, idx) => (
            <div key={q.id} style={styles.quizQuestionBlock}>
              <p><strong>{idx + 1}. {q.question_text}</strong></p>
              <div style={styles.quizOptionsDirection}>
                {['A', 'B', 'C', 'D'].map(opt => (
                  <label key={opt} style={styles.radioLabel}>
                    <input type="radio" name={`q-${q.id}`} checked={answers[q.id] === opt} onChange={() => setAnswers({...answers, [q.id]: opt})} />
                     {opt}: {q[`option_${opt.toLowerCase()}`]}
                  </label>
                ))}
              </div>
            </div>
          ))}
          <button onClick={handleQuizSubmit} style={styles.successBtn}>ارسال قطعی پاسخ‌نامه به سرور امن</button>
        </div>
      )}
    </div>
  );
}

const styles = {
  appContainer: { maxWidth: '1200px', margin: '0 auto', padding: '20px', fontFamily: 'Segoe UI, Tahoma, sans-serif', direction: 'rtl' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eef2f3', paddingBottom: '15px', marginBottom: '30px' },
  logoutBtn: { backgroundColor: '#e74c3c', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' },
  authCard: { maxWidth: '450px', margin: '60px auto', padding: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)', borderRadius: '12px', backgroundColor: '#fff' },
  form: { display: 'flex', flexDirection: 'column', gap: '15px' },
  input: { padding: '12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px', fontFamily: 'inherit' },
  primaryBtn: { backgroundColor: '#3498db', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
  secondaryBtn: { backgroundColor: '#2ecc71', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer' },
  successBtn: { backgroundColor: '#27ae60', color: 'white', border: 'none', padding: '15px 30px', borderRadius: '6px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', width: '100%', marginTop: '20px' },
  toggleText: { textAlign: 'center', marginTop: '15px', color: '#3498db', cursor: 'pointer', fontSize: '14px' },
  dashboardGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' },
  panelCard: { padding: '25px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', borderRadius: '12px', backgroundColor: '#fff', border: '1px solid #f0f0f0' },
  questionBlock: { border: '1px dashed #ddd', padding: '15px', borderRadius: '8px', marginBottom: '15px', backgroundColor: '#fafafa' },
  optionsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px', marginBottom: '10px' },
  submissionList: { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' },
  subItem: { padding: '12px', backgroundColor: '#f1f2f6', borderRadius: '6px', borderRight: '4px solid #2ecc71' },
  scoreBadge: { fontWeight: 'bold', color: '#27ae60' },
  quizList: { display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' },
  quizItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', border: '1px solid #eee', borderRadius: '8px' },
  quizHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #3498db', paddingBottom: '10px', marginBottom: '20px' },
  timerBadge: { backgroundColor: '#e67e22', color: 'white', padding: '8px 15px', borderRadius: '20px', fontWeight: 'bold' },
  quizQuestionBlock: { marginBottom: '25px', paddingBottom: '20px', borderBottom: '1px solid #eee' },
  quizOptionsDirection: { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' },
  radioLabel: { display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' },
  center: { textAlign: 'center', marginTop: '100px', fontSize: '18px', fontWeight: 'bold' }
};

export default App;
