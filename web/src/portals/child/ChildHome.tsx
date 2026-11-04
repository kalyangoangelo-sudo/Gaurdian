import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n';

export default function ChildHome() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const actions = [
    { view: '/report', icon: '⚠', label: t('report_harm'), primary: true },
    { view: '/status', icon: '📋', label: t('check_status') },
    { view: '/curiosity', icon: '💬', label: t('curiosity_corner') },
    { view: '/learn', icon: '📚', label: t('learn') },
    { view: '/plans', icon: '📋', label: t('plans') },
  ];

  return (
    <div className="pt-6 animate-fade-in">
      {/* Hero */}
      <div className="text-center py-8">
        <div className="text-6xl mb-2">🛡</div>
        <h1 className="text-3xl font-bold text-navy">{t('app_name')}</h1>
        <p className="text-teal-dark font-semibold mt-1">{t('tagline')}</p>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-3 my-6">
        {actions.map((a) => (
          <button
            key={a.view}
            onClick={() => navigate(a.view)}
            className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all hover:shadow-md active:scale-[0.98] text-left ${
              a.primary
                ? 'bg-red-500 border-red-500 text-white hover:bg-red-600'
                : 'bg-white border-gray-200 hover:border-teal text-navy'
            }`}
          >
            <span className="text-2xl">{a.icon}</span>
            <span className="text-base font-semibold">{a.label}</span>
          </button>
        ))}
      </div>

      {/* Emergency banner */}
      <div className="p-4 bg-amber-50 border border-amber-400 rounded-xl text-center">
        <strong className="block text-navy text-sm mb-1">{t('emergency_help')}</strong>
        <span className="text-sm text-gray-600">{t('emergency_call')}</span>
      </div>
    </div>
  );
}
