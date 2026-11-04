import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import { reports } from '../../api/client';

export default function ChildStatus() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [caseRef, setCaseRef] = useState('');
  const [recovery, setRecovery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  async function handleCheck() {
    setError('');
    setLoading(true);
    try {
      const res = await reports.checkStatus(caseRef.toUpperCase(), recovery.trim());
      setResult(res);
    } catch (err: any) {
      setError(t('invalid_credentials'));
    } finally {
      setLoading(false);
    }
  }

  function fmtDate(iso: string) {
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  }

  return (
    <div className="pt-4 animate-fade-in">
      <button onClick={() => navigate('/')} className="text-teal-dark font-semibold text-sm mb-3">‹ {t('back')}</button>
      <h2 className="view-title">{t('status_title')}</h2>

      <div className="mb-4">
        <label className="label" htmlFor="cr">{t('enter_case_ref')}</label>
        <input id="cr" className="input" value={caseRef} onChange={(e) => setCaseRef(e.target.value)} maxLength={20} autoComplete="off" />
      </div>
      <div className="mb-4">
        <label className="label" htmlFor="rs">{t('enter_recovery')}</label>
        <textarea id="rs" className="input resize-y" rows={3} value={recovery} onChange={(e) => setRecovery(e.target.value)} maxLength={200} autoComplete="off" />
      </div>

      <button onClick={handleCheck} disabled={loading || !caseRef || !recovery} className="btn-primary">{loading ? '...' : t('check')}</button>

      {error && <div className="mt-3 p-3 bg-red-50 rounded-xl text-red-600 text-sm font-semibold">{error}</div>}

      {result && (
        <div className="mt-5 card space-y-3">
          {[
            { label: t('status_label'), value: result.status },
            { label: t('category_label'), value: result.category },
            { label: t('submitted_label'), value: fmtDate(result.createdAt) },
            { label: t('updated_label'), value: fmtDate(result.updatedAt) },
          ].map((r, i) => (
            <div key={i} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
              <span className="text-sm text-gray-500 font-semibold">{r.label}</span>
              <span className="text-sm text-navy font-medium">{r.value}</span>
            </div>
          ))}
          {result.response && (
            <div className="p-4 bg-green-50 rounded-xl">
              <span className="text-sm text-gray-500 font-semibold block mb-1">{t('response_label')}</span>
              <span className="text-sm text-navy whitespace-pre-wrap">{result.response}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
