import { useTranslation } from '../i18n';

export default function LanguageToggle() {
  const { t, toggleLang, lang } = useTranslation();

  return (
    <button
      onClick={toggleLang}
      className="px-4 py-1.5 bg-teal text-white rounded-full text-sm font-semibold hover:bg-teal-dark transition-colors"
      aria-label="Switch language"
    >
      {t('switch_lang')}
    </button>
  );
}
