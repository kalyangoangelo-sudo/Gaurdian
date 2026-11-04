import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../auth/AuthContext';
import { organizations, subscriptions, health } from '../../api/client';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [orgs, setOrgs] = useState<any[]>([]);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [orgForm, setOrgForm] = useState({ name: '', type: 'school', plan: 'free', email: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/admin'); return; }
    health.check().then(setSystemHealth).catch(() => {});
    setLoading(false);
  }, [user]);

  async function handleRegister() {
    try {
      const res = await organizations.register(orgForm.name, orgForm.type, orgForm.plan, orgForm.email);
      if (orgForm.plan !== 'free') await subscriptions.create(res.id, orgForm.plan);
      setOrgs(prev => [...prev, res]);
      setOrgForm({ name: '', type: 'school', plan: 'free', email: '' });
    } catch {}
  }

  async function handlePlanChange(orgId: string, plan: string) {
    try { await subscriptions.changePlan(orgId, plan); } catch {}
  }

  async function handleBilling(orgId: string) {
    try {
      const sub = await subscriptions.get(orgId);
      if (sub.price === 0) { alert('No billing required for free plan.'); return; }
      const bill = await subscriptions.billing(orgId);
      alert(`SIMULATED billing: ${bill.reference}\nAmount: ${bill.amount} ${bill.currency}`);
    } catch (err: any) { alert(err.message); }
  }

  if (loading) return <div className="pt-8 text-center text-gray-500">Loading…</div>;

  return (
    <div className="pt-4 animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h2 className="view-title">{t('admin_dashboard')}</h2>
        <button onClick={() => { logout(); navigate('/'); }} className="btn-ghost">{t('logout')}</button>
      </div>

      {/* System health */}
      {systemHealth && (
        <div className="card mb-4">
          <h3 className="font-bold text-navy mb-2">{t('system_health')}</h3>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-700">🟢 {systemHealth.status}</span>
            <span className="text-xs text-gray-500">{new Date(systemHealth.timestamp).toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Register org */}
      <div className="card mb-4">
        <h3 className="font-bold text-navy mb-3">{t('register_org')}</h3>
        <input className="input mb-3" placeholder={t('org_name')} value={orgForm.name} onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })} />
        <div className="flex gap-3 mb-3">
          <select className="input" style={{ width: 'auto' }} value={orgForm.type} onChange={(e) => setOrgForm({ ...orgForm, type: e.target.value })}>
            <option value="school">School</option><option value="ngo">NGO</option><option value="government">Government</option><option value="private">Private</option>
          </select>
          <select className="input" style={{ width: 'auto' }} value={orgForm.plan} onChange={(e) => setOrgForm({ ...orgForm, plan: e.target.value })}>
            <option value="free">Free</option><option value="family">Family Premium</option><option value="school-starter">School Starter</option><option value="institutional">Institutional</option>
          </select>
        </div>
        <input className="input mb-3" placeholder={t('org_email')} value={orgForm.email} onChange={(e) => setOrgForm({ ...orgForm, email: e.target.value })} />
        <button onClick={handleRegister} disabled={!orgForm.name} className="btn-primary" style={{ width: 'auto', display: 'inline-block' }}>{t('register')}</button>
      </div>

      {/* Org list */}
      {orgs.length > 0 && (
        <div className="card">
          <h3 className="font-bold text-navy mb-3">{t('organizations')} ({orgs.length})</h3>
          <div className="space-y-2">
            {orgs.map((org) => (
              <div key={org.id} className="flex justify-between items-center p-3 bg-cream rounded-xl">
                <div>
                  <p className="font-semibold text-sm text-navy">{org.name}</p>
                  <p className="text-xs text-teal-dark">{org.plan} — {org.type} — {org.status}</p>
                </div>
                <div className="flex gap-2">
                  <select className="input" style={{ width: 'auto', padding: '0.3rem 0.6rem', fontSize: '0.7rem' }}
                    defaultValue="" onChange={(e) => e.target.value && handlePlanChange(org.id, e.target.value)}>
                    <option value="">{t('change_plan')}…</option>
                    <option value="free">Free</option><option value="family">Family</option><option value="school-starter">School</option><option value="institutional">Institutional</option>
                  </select>
                  <button onClick={() => handleBilling(org.id)} className="px-3 py-1.5 bg-navy text-white rounded-lg text-xs font-semibold">{t('billing')}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4 text-center">⚠️ Simulated payments only. Admins cannot access confidential child reports.</p>
    </div>
  );
}
