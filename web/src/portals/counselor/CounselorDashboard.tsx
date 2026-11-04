import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../auth/AuthContext';
import { cases } from '../../api/client';

export default function CounselorDashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [caseList, setCaseList] = useState<any[]>([]);
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/counselor'); return; }
    loadCases();
  }, [user]);

  async function loadCases() {
    setLoading(true);
    try { setCaseList(await cases.list()); } catch {} finally { setLoading(false); }
  }

  const filtered = caseList
    .filter(c => !priorityFilter || (c.humanPriority || c.priority) === priorityFilter)
    .filter(c => !statusFilter || c.status === statusFilter)
    .sort((a, b) => {
      const order: Record<string, number> = { CRITICAL: 0, HIGH: 1, STANDARD: 2 };
      return (order[a.humanPriority || a.priority] ?? 3) - (order[b.humanPriority || b.priority] ?? 3);
    });

  function fmtDate(iso: string) { try { return new Date(iso).toLocaleDateString(); } catch { return iso; } }

  return (
    <div className="pt-4 animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h2 className="view-title">{t('case_queue')}</h2>
        <div className="flex items-center gap-3">
          <button onClick={loadCases} className="text-xl text-navy hover:text-teal" title="Refresh">↻</button>
          <button onClick={() => navigate('/counselor/curiosity')} className="btn-ghost">{t('curiosity_review')}</button>
          <button onClick={() => { logout(); navigate('/'); }} className="btn-ghost">{t('logout')}</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select className="input" style={{ width: 'auto' }} value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
          <option value="">All priorities</option>
          <option value="CRITICAL">CRITICAL</option>
          <option value="HIGH">HIGH</option>
          <option value="STANDARD">STANDARD</option>
        </select>
        <select className="input" style={{ width: 'auto' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {['Submitted','Awaiting Assessment','Under Review','Action Required','Referred','Follow-up Pending','Resolved','Closed'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Case list */}
      {loading ? <div className="text-center text-gray-500 py-8">Loading…</div> : filtered.length === 0 ? (
        <div className="text-center text-gray-500 py-8">No cases match the current filters.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => {
            const pri = c.humanPriority || c.priority;
            return (
              <button key={c.id} onClick={() => navigate(`/counselor/case/${c.id}`)}
                className="w-full flex flex-col gap-1 p-3.5 bg-white border border-gray-200 rounded-xl text-left hover:border-teal hover:shadow-sm transition-all">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-sm font-bold text-navy">{c.caseRef}</span>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${pri === 'CRITICAL' ? 'bg-red-500 text-white' : pri === 'HIGH' ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-600'}`}>{pri}</span>
                    {c.humanPriority && <span className="text-xs text-red-500">↺ overridden</span>}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">{c.category}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-cream border border-gray-200">{c.status}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>{fmtDate(c.createdAt)}</span>
                  {c.anonymous && <span>Anonymous</span>}
                  {c.aiResult?.requiresHumanReview && <span className="text-red-500">⚠ AI review flag</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
