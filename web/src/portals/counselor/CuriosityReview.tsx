import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../auth/AuthContext';
import { curiosity } from '../../api/client';

const TEMPLATES = [
  { key: 'bullying', label: 'Bullying response' },
  { key: 'privacy', label: 'Privacy response' },
  { key: 'friends', label: 'Online friends response' },
  { key: 'boundaries', label: 'Boundaries response' },
  { key: 'help', label: 'How to get help response' },
  { key: 'general', label: 'General response' },
];

export default function CuriosityReview() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/counselor'); return; }
    loadQuestions();
  }, [user]);

  async function loadQuestions() {
    setLoading(true);
    try { setQuestions(await curiosity.pending()); } catch {} finally { setLoading(false); }
  }

  async function handleRespond(id: string, templateKey?: string, customResponse?: string) {
    try { await curiosity.respond(id, customResponse || '', templateKey); loadQuestions(); } catch {}
  }

  async function handleCategorize(id: string, category: string) {
    try { await curiosity.categorize(id, category); } catch {}
  }

  function fmtDate(iso: string) { try { return new Date(iso).toLocaleString(); } catch { return iso; } }

  return (
    <div className="pt-4 animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h2 className="view-title">{t('curiosity_review')}</h2>
        <div className="flex items-center gap-3">
          <button onClick={loadQuestions} className="text-xl text-navy hover:text-teal">↻</button>
          <button onClick={() => navigate('/counselor/dashboard')} className="btn-ghost">{t('case_queue')}</button>
          <button onClick={() => { logout(); navigate('/'); }} className="btn-ghost">{t('logout')}</button>
        </div>
      </div>

      {loading ? <div className="text-center text-gray-500 py-8">Loading…</div> : questions.length === 0 ? (
        <div className="text-center text-gray-500 py-8">No pending questions.</div>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <div key={q.id} className={`card ${q.isSeriousFlag ? 'border-l-4 border-red-500' : ''}`}>
              <p className="text-sm text-navy font-medium mb-1">{q.question}</p>
              <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-3">
                <span>Ref: {q.questionRef}</span>
                <span>Category: {q.category}</span>
                <span>{fmtDate(q.createdAt)}</span>
                {q.isSeriousFlag && <span className="text-red-500 font-semibold">⚠ FLAGGED</span>}
              </div>
              {q.aiAssessment?.indicators?.length > 0 && (
                <p className="text-xs text-gray-400 mb-2">AI: {q.aiAssessment.indicators.join(', ')}</p>
              )}

              <div className="flex flex-wrap gap-2 mt-3">
                <select className="input" style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                  defaultValue="" onChange={(e) => e.target.value && handleCategorize(q.id, e.target.value)}>
                  <option value="">Categorize…</option>
                  {['bullying','privacy','friends','boundaries','help','general'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select className="input" style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                  defaultValue="" onChange={(e) => e.target.value && handleRespond(q.id, e.target.value)}>
                  <option value="">Respond with template…</option>
                  {TEMPLATES.map(tpl => <option key={tpl.key} value={tpl.key}>{tpl.label}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
