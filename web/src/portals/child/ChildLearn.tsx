import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import { lessons } from '../../api/client';

export default function ChildLearn() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [lessonList, setLessonList] = useState<any[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [openLesson, setOpenLesson] = useState<any>(null);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizResult, setQuizResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    lessons.list().then((data) => {
      setLessonList(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function openLessonDetail(id: string) {
    if (openId === id) { setOpenId(null); setOpenLesson(null); return; }
    setOpenId(id);
    setOpenLesson(null);
    setQuizResult(null);
    try {
      const lang = localStorage.getItem('gl_lang') || 'en';
      const detail = await lessons.detail(id, lang);
      setOpenLesson(detail);
      setQuizAnswers(new Array(detail.quiz?.length || 0).fill(-1));
    } catch {}
  }

  function submitQuiz() {
    if (!openLesson?.quiz) return;
    let score = 0;
    openLesson.quiz.forEach((q: any, i: number) => { if (quizAnswers[i] === q.correctAnswer) score++; });
    const passed = score >= Math.ceil(openLesson.quiz.length * 0.6);
    setQuizResult(`Score: ${score}/${openLesson.quiz.length} — ${passed ? 'Passed!' : 'Try again'}`);
  }

  if (loading) return <div className="pt-8 text-center text-gray-500">Loading lessons…</div>;

  return (
    <div className="pt-4 animate-fade-in">
      <button onClick={() => navigate('/')} className="text-teal-dark font-semibold text-sm mb-3">‹ {t('back')}</button>
      <h2 className="view-title">{t('learn_title')}</h2>
      <p className="view-subtitle">{t('learn_subtitle')}</p>

      <div className="space-y-3">
        {lessonList.map((l) => (
          <div key={l.id}>
            <button
              onClick={() => openLessonDetail(l.id)}
              className="w-full flex items-start gap-4 p-4 bg-white border border-gray-200 rounded-2xl text-left hover:border-teal hover:shadow-sm transition-all"
            >
              <span className="text-2xl">{l.category === 'safety' ? '🛡' : '📚'}</span>
              <div className="flex-1">
                <h3 className="font-bold text-navy">{l.title}</h3>
                <p className="text-sm text-gray-500 line-clamp-2">{l.description}</p>
                {l.hasQuiz && <span className="text-xs text-teal-dark">📋 Quiz available</span>}
              </div>
              <span className="text-xl text-gray-300">{openId === l.id ? '⌃' : '›'}</span>
            </button>

            {openId === l.id && openLesson && (
              <div className="mt-2 p-4 bg-cream rounded-2xl border border-gray-100">
                <p className="text-sm text-navy whitespace-pre-wrap mb-3">{openLesson.content}</p>
                {openLesson.quiz && openLesson.quiz.length > 0 && (
                  <div className="mt-3 p-3 bg-white rounded-xl">
                    <strong className="text-sm font-bold text-navy">Quick Check</strong>
                    {openLesson.quiz.map((q: any, qi: number) => (
                      <div key={qi} className="mt-3">
                        <p className="text-sm font-semibold text-navy">{q.question}</p>
                        {q.options.map((opt: string, oi: number) => (
                          <label key={oi} className="flex items-center gap-2 py-1 text-sm cursor-pointer">
                            <input
                              type="radio"
                              name={`quiz-${openLesson.id}-${qi}`}
                              checked={quizAnswers[qi] === oi}
                              onChange={() => setQuizAnswers(prev => { const n = [...prev]; n[qi] = oi; return n; })}
                              className="accent-teal-dark"
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    ))}
                    <button onClick={submitQuiz} className="btn-primary mt-3" style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.8rem' }}>Submit Quiz</button>
                    {quizResult && <p className="mt-2 text-sm font-semibold">{quizResult}</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
