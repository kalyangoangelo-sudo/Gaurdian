import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import { curiosity } from '../../api/client';

const QUICK_QS = [
  'What is cyberbullying and what can I do?',
  'How do I keep my information private online?',
  'Is it safe to be friends with people I meet online?',
  'How do I set digital boundaries?',
  'How do I get help if something bad happens online?',
];

export default function ChildCuriosity() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function handleAsk(q?: string) {
    const text = (q || question).trim();
    if (!text) return;
    setQuestion(text);
    setLoading(true);
    try {
      const res = await curiosity.ask(text);
      setResult(res);
    } catch (err: any) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pt-4 animate-fade-in">
      <button onClick={() => navigate('/')} className="text-teal-dark font-semibold text-sm mb-3">‹ {t('back')}</button>
      <h2 className="view-title">{t('curiosity_title')}</h2>
      <p className="view-subtitle">{t('curiosity_subtitle')}</p>

      <div className="p-3 bg-amber-50 border border-amber-400 rounded-xl text-sm text-navy mb-4">{t('curiosity_warning')}</div>

      <textarea
        className="input resize-y mb-3"
        rows={3}
        maxLength={500}
        placeholder={t('curiosity_placeholder')}
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />
      <button onClick={() => handleAsk()} disabled={loading || !question.trim()} className="btn-primary">{loading ? '...' : t('ask')}</button>

      {result && (
        <div className="mt-4 card">
          {result.suggestedAction === 'report' ? (
            <div>
              <p className="font-semibold text-red-500">{result.warning}</p>
              <button onClick={() => navigate('/report')} className="btn-danger mt-3">{t('report_harm')}</button>
            </div>
          ) : result.response ? (
            <div>
              <h3 className="font-bold text-navy mb-1">{t('curiosity_title')}</h3>
              <p className="text-sm text-navy whitespace-pre-wrap">{result.response}</p>
              <p className="text-xs text-gray-400 mt-2">Ref: {result.questionRef}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">{result.error || 'Question submitted for review.'}</p>
          )}
        </div>
      )}

      {/* Quick questions */}
      <div className="mt-6 space-y-2">
        {QUICK_QS.map((q, i) => (
          <button
            key={i}
            onClick={() => handleAsk(q)}
            className="w-full flex items-center gap-3 p-3.5 bg-white border border-gray-200 rounded-xl text-left text-sm text-navy hover:border-teal transition-colors"
          >
            {['⚠', '🔒', '👥', '🚧', '🆘'][i]} <span>{q}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
