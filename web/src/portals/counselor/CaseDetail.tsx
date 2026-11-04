import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import { cases, REFERRAL_SERVICES, RESPONSE_TEMPLATES } from '../../api/client';

export default function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [caseData, setCaseData] = useState<any>(null);
  const [action, setAction] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [audit, setAudit] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  useEffect(() => {
    if (id) loadCase();
  }, [id]);

  async function loadCase() {
    try {
      const [c, a] = await Promise.all([cases.detail(id!), cases.audit(id!)]);
      setCaseData(c);
      setAudit(a);
    } catch {}
  }

  async function doAction(type: string, body: any) {
    try {
      if (type === 'assess') await cases.assess(id!, body.humanPriority);
      else if (type === 'status') await cases.status(id!, body.status);
      else if (type === 'note') await cases.note(id!, body.note);
      else if (type === 'refer') await cases.refer(id!, body.service);
      else if (type === 'respond') {
        const tpl = RESPONSE_TEMPLATES.find(t => t.id === selectedTemplate);
        await cases.response(id!, tpl?.body || body.response, selectedTemplate || undefined);
      }
      setAction(null); setNote(''); setSelectedTemplate(null);
      loadCase();
    } catch {}
  }

  function fmtDate(iso: string) { try { return new Date(iso).toLocaleString(); } catch { return iso; } }

  if (!caseData) return <div className="pt-8 text-center text-gray-500">Loading…</div>;

  const pri = caseData.humanPriority || caseData.priority;

  return (
    <div className="pt-4 animate-fade-in">
      <button onClick={() => navigate('/counselor/dashboard')} className="text-teal-dark font-semibold text-sm mb-3">← Back to queue</button>
      <h2 className="view-title">Case {caseData.caseRef}</h2>
      <div className="flex flex-wrap gap-4 text-sm text-gray-500 mt-1 mb-5">
        <span>Category: <strong className="text-navy">{caseData.category}</strong></span>
        <span>Status: <strong className="text-navy">{caseData.status}</strong></span>
        <span>Priority: <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${pri === 'CRITICAL' ? 'bg-red-500 text-white' : pri === 'HIGH' ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-600'}`}>{pri}</span></span>
        {caseData.anonymous && <span>Anonymous</span>}
      </div>

      {/* AI Assessment */}
      {caseData.aiResult && (
        <div className="card mb-4 border-l-4 border-teal">
          <h3 className="font-bold text-navy text-sm uppercase mb-2">{t('ai_assessment')}</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Suggested Priority</span><span className="font-semibold text-navy">{caseData.aiResult.suggestedPriority}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Human Review</span><span className="font-semibold text-navy">{caseData.aiResult.requiresHumanReview ? 'Yes ⚠' : 'No'}</span></div>
            {caseData.aiResult.confidence != null && <div className="flex justify-between"><span className="text-gray-500">Confidence</span><span className="font-semibold text-navy">{Math.round((caseData.aiResult.confidence || 0) * 100)}%</span></div>}
            {caseData.aiResult.criticalSafetyFlag && <div className="text-red-500 font-semibold">⚠ CRITICAL SAFETY INDICATOR DETECTED</div>}
            {caseData.aiResult.indicators?.length > 0 && <div className="text-xs text-gray-500 pt-1">{caseData.aiResult.indicators.join(', ')}</div>}
          </div>
        </div>
      )}

      {/* Report Content */}
      <div className="card mb-4">
        <h3 className="font-bold text-navy text-sm uppercase mb-2">Report Content <span className="font-normal text-gray-400">(PII tokenized)</span></h3>
        <p className="text-sm text-navy whitespace-pre-wrap">{caseData.description || 'No description provided'}</p>
        {caseData.encryptedTokenMap && <p className="text-xs text-gray-400 italic mt-2">🔒 Personally identifiable information has been tokenized and encrypted.</p>}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {['assess', 'status', 'note', 'refer', 'respond', 'audit'].map(a => (
          <button key={a} onClick={() => setAction(action === a ? null : a)}
            className={`px-4 py-2 rounded-xl border text-sm font-semibold transition-colors ${action === a ? 'bg-teal text-white border-teal' : 'bg-white border-gray-200 text-navy hover:border-teal'}`}>
            {a === 'assess' ? t('set_priority') : a === 'status' ? t('change_status') : a === 'note' ? t('add_note') : a === 'refer' ? t('refer_case') : a === 'respond' ? t('send_response') : t('audit_trail')}
          </button>
        ))}
      </div>

      {/* Action panels */}
      {action === 'assess' && (
        <div className="card mb-4">
          <select className="input mb-3" defaultValue="" onChange={(e) => doAction('assess', { humanPriority: e.target.value })}>
            <option value="" disabled>Select priority…</option>
            <option value="CRITICAL">CRITICAL</option><option value="HIGH">HIGH</option><option value="STANDARD">STANDARD</option>
          </select>
        </div>
      )}
      {action === 'status' && (
        <div className="card mb-4">
          <select className="input mb-3" defaultValue={caseData.status} onChange={(e) => doAction('status', { status: e.target.value })}>
            {['Submitted','Awaiting Assessment','Under Review','Action Required','Referred','Follow-up Pending','Resolved','Closed'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}
      {action === 'note' && (
        <div className="card mb-4">
          <textarea className="input resize-y mb-3" rows={4} placeholder="Internal note (not visible to child)…" value={note} onChange={(e) => setNote(e.target.value)} />
          <button onClick={() => doAction('note', { note })} disabled={!note.trim()} className="btn-primary" style={{ width: 'auto', display: 'inline-block' }}>{t('add_note')}</button>
        </div>
      )}
      {action === 'refer' && (
        <div className="card mb-4">
          <select className="input mb-3" defaultValue="" onChange={(e) => doAction('refer', { service: e.target.value || undefined })}>
            <option value="">Auto-assign</option>
            {REFERRAL_SERVICES.map(s => <option key={s} value={s}>{s} (SIMULATED)</option>)}
          </select>
          <p className="text-xs text-amber-600">⚠️ SIMULATED — No real agency is contacted.</p>
        </div>
      )}
      {action === 'respond' && (
        <div className="card mb-4">
          {RESPONSE_TEMPLATES.map(tpl => (
            <div key={tpl.id} onClick={() => setSelectedTemplate(tpl.id)}
              className={`p-3 border rounded-xl cursor-pointer mb-2 transition-colors ${selectedTemplate === tpl.id ? 'border-teal bg-teal/5' : 'border-gray-200 hover:border-teal'}`}>
              <p className="text-sm font-bold text-navy">{tpl.title}</p>
              <p className="text-xs text-gray-500 mt-1">{tpl.body.substring(0, 100)}…</p>
            </div>
          ))}
          <button onClick={() => doAction('respond', {})} disabled={!selectedTemplate} className="btn-primary" style={{ width: 'auto', display: 'inline-block' }}>{t('send_response')}</button>
        </div>
      )}
      {action === 'audit' && (
        <div className="card mb-4">
          <h3 className="font-bold text-navy text-sm uppercase mb-2">{t('audit_trail')} ({audit.length} entries)</h3>
          {audit.map((a, i) => (
            <div key={i} className="py-2 border-b border-gray-100 last:border-0">
              <span className="text-sm font-semibold text-navy">{a.action}</span>
              <span className="text-xs text-gray-500"> by {a.by} — {fmtDate(a.at)}</span>
              {a.status && <span className="text-xs text-gray-400"> → {a.status}</span>}
              {a.service && <span className="text-xs text-gray-400"> → {a.service}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Notes */}
      {caseData.notes?.length > 0 && (
        <div className="card mb-4">
          <h3 className="font-bold text-navy text-sm uppercase mb-2">Internal Notes ({caseData.notes.length})</h3>
          {caseData.notes.map((n: any, i: number) => (
            <div key={i} className="py-2 border-b border-gray-100 last:border-0">
              <p className="text-sm text-navy">{n.text}</p>
              <p className="text-xs text-gray-500">By: {n.by} — {fmtDate(n.at)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Referrals */}
      {caseData.referrals?.length > 0 && (
        <div className="card">
          <h3 className="font-bold text-navy text-sm uppercase mb-2">Referrals ({caseData.referrals.length})</h3>
          {caseData.referrals.map((r: any, i: number) => (
            <div key={i} className="p-3 bg-amber-50 border border-amber-400 rounded-xl mb-2">
              <p className="font-semibold text-sm text-navy">{r.service} — {r.referralId}</p>
              <p className="text-xs text-amber-600 font-semibold">⚠️ SIMULATED — Not sent to a real agency.</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
