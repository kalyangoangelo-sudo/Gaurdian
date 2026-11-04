import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../auth/AuthContext';
import { requests, safesignal, pairing, heartbeat } from '../../api/client';

export default function ParentDashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [reqList, setReqList] = useState<any[]>([]);
  const [signals, setSignals] = useState<any[]>([]);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [deviceOnline, setDeviceOnline] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/parent'); return; }
    Promise.all([
      requests.list().then(r => setReqList(r.requests || [])).catch(() => {}),
      safesignal.list('parent-1').then(setSignals).catch(() => {}),
      heartbeat.status('child-1').then((d) => setDeviceOnline(d?.status === 'ACTIVE')).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [user]);

  async function handleGenerateCode() {
    try { const res = await pairing.generate(); setPairingCode(res.code); } catch {}
  }

  async function handleDecide(id: string, decision: 'approved' | 'denied') {
    try { await requests.decide(id, decision); const res = await requests.list(); setReqList(res.requests || []); } catch {}
  }

  function fmtDate(iso: string) { try { return new Date(iso).toLocaleString(); } catch { return iso; } }

  if (loading) return <div className="pt-8 text-center text-gray-500">Loading…</div>;

  return (
    <div className="pt-4 animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h2 className="view-title">{t('parent_dashboard')}</h2>
        <button onClick={() => { logout(); navigate('/'); }} className="btn-ghost">{t('logout')}</button>
      </div>

      {/* Device status */}
      <div className="card mb-4">
        <h3 className="font-bold text-navy mb-2">{t('device_status')}</h3>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${deviceOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {deviceOnline ? '🟢 Active' : '🔴 Offline'}
          </span>
        </div>
      </div>

      {/* Pairing */}
      <div className="card mb-4">
        <h3 className="font-bold text-navy mb-2">{t('pairing_code')}</h3>
        {pairingCode ? (
          <div className="text-center">
            <p className="text-3xl font-bold text-teal-dark tracking-widest">{pairingCode}</p>
            <p className="text-sm text-gray-500 mt-1">Share this code with your child. Expires in 30 minutes.</p>
          </div>
        ) : (
          <button onClick={handleGenerateCode} className="btn-primary" style={{ width: 'auto', display: 'inline-block' }}>Generate Pairing Code</button>
        )}
      </div>

      {/* Access requests */}
      <div className="card mb-4">
        <h3 className="font-bold text-navy mb-3">{t('access_requests')}</h3>
        {reqList.length === 0 ? (
          <p className="text-sm text-gray-500">No access requests.</p>
        ) : (
          <div className="space-y-2">
            {reqList.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3 bg-cream rounded-xl">
                <div>
                  <p className="text-sm font-semibold text-navy truncate max-w-[200px]">{r.url}</p>
                  <p className="text-xs text-gray-500">{fmtDate(r.createdAt)}</p>
                </div>
                {r.status === 'pending' ? (
                  <div className="flex gap-2">
                    <button onClick={() => handleDecide(r.id, 'approved')} className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-semibold">{t('approve')}</button>
                    <button onClick={() => handleDecide(r.id, 'denied')} className="px-3 py-1.5 bg-gray-300 text-navy rounded-lg text-sm font-semibold">{t('deny')}</button>
                  </div>
                ) : (
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${r.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{r.status}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SafeSignal reports */}
      <div className="card">
        <h3 className="font-bold text-navy mb-3">{t('safe_signal')}</h3>
        {signals.length === 0 ? (
          <p className="text-sm text-gray-500">No SafeSignal reports.</p>
        ) : (
          <div className="space-y-2">
            {signals.map((s) => (
              <div key={s.id} className="p-3 bg-cream rounded-xl">
                <div className="flex justify-between">
                  <span className="text-sm font-semibold text-navy">{s.category}</span>
                  <span className="text-xs text-gray-500">{fmtDate(s.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{s.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-4 text-center">Parents cannot access confidential child reports. SafeSignal is a separate, transparent feature.</p>
    </div>
  );
}
