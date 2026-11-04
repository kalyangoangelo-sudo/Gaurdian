import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../i18n';

/**
 * Persistent floating "Report Harm" button.
 * Visible on every child-facing screen.
 */
export default function ReportHarmButton() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <button
      onClick={() => navigate('/report')}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-6 py-3.5 bg-red-500 text-white rounded-full font-bold shadow-lg hover:bg-red-600 hover:-translate-y-0.5 active:scale-95 transition-all"
      aria-label={t('report_harm')}
    >
      <span className="text-lg">⚠</span>
      <span className="hidden sm:inline">{t('report_harm')}</span>
    </button>
  );
}
