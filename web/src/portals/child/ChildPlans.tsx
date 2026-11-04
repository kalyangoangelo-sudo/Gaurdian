import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import { organizations } from '../../api/client';
import { useState } from 'react';

const PLAN_DATA = [
  { key: 'free', nameKey: 'plan_free', priceKey: 'plan_free_price', features: ['Anonymous reporting', 'Case status checking', 'Safety guidance', 'English + Luganda'], badge: 'Always free' },
  { key: 'family', nameKey: 'plan_family', priceKey: 'plan_family_price', features: ['Everything in Free, plus:', 'Real-time SafeSignal alerts', 'Content filtering', 'Device heartbeat', 'Parent-child pairing'], badge: null },
  { key: 'school', nameKey: 'plan_school', priceKey: 'plan_school_price', features: ['Everything in Family, plus:', 'Up to 50 students', 'Caseworker access', 'Teacher-assisted reporting', 'School dashboard'], badge: null },
  { key: 'ngo', nameKey: 'plan_ngo', priceKey: 'plan_ngo_price', features: ['Everything in School, plus:', 'Unlimited profiles', 'Custom integrations', 'Training and onboarding', 'SLA guarantee'], badge: null },
];

export default function ChildPlans() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [showDemo, setShowDemo] = useState(false);
  const [demoName, setDemoName] = useState('');
  const [demoEmail, setDemoEmail] = useState('');
  const [demoSent, setDemoSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submitDemo() {
    setLoading(true);
    try {
      await organizations.demoRequest(demoName, demoEmail);
      setDemoSent(true);
    } catch {} finally { setLoading(false); }
  }

  return (
    <div className="pt-4 animate-fade-in">
      <button onClick={() => navigate('/')} className="text-teal-dark font-semibold text-sm mb-3">‹ {t('back')}</button>
      <h2 className="view-title">{t('plans_title')}</h2>
      <p className="view-subtitle">{t('plans_subtitle')}</p>

      <div className="space-y-4">
        {PLAN_DATA.map((p) => (
          <div key={p.key} className={`card relative ${p.key === 'family' ? 'border-teal' : ''}`}>
            {p.badge && <span className="absolute -top-2.5 right-4 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">{p.badge}</span>}
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold text-navy">{t(p.nameKey)}</h3>
              <span className="text-sm font-semibold text-teal-dark">{t(p.priceKey)}</span>
            </div>
            <ul className="space-y-1">
              {p.features.map((f, i) => (
                <li key={i} className="text-sm text-gray-600 pl-5 relative">
                  <span className="absolute left-0 text-green-600 font-bold">✓</span> {f}
                </li>
              ))}
            </ul>
            {p.key !== 'free' && (
              <button onClick={() => setShowDemo(true)} className="btn-ghost mt-3">{t('request_demo')}</button>
            )}
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-gray-500 mt-4">{t('simulated_label')}</p>

      {showDemo && !demoSent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setShowDemo(false)}>
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">{t('request_demo')}</h3>
            <input className="input mb-3" placeholder="Your name" value={demoName} onChange={(e) => setDemoName(e.target.value)} />
            <input className="input mb-3" placeholder="Your email" value={demoEmail} onChange={(e) => setDemoEmail(e.target.value)} />
            <button onClick={submitDemo} disabled={loading || !demoName || !demoEmail} className="btn-primary">{loading ? '...' : t('request_demo')}</button>
          </div>
        </div>
      )}
      {demoSent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setShowDemo(false)}>
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-navy font-semibold">Thank you! We will contact you within 1–2 business days.</p>
            <button onClick={() => setShowDemo(false)} className="btn-primary mt-4">{t('done')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
