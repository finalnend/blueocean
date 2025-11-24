import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language.startsWith('zh') ? 'en' : 'zh';
    i18n.changeLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="px-3 py-1 rounded border border-white/30 hover:bg-white/10 transition-colors text-sm"
      title="Switch Language"
    >
      {i18n.language.startsWith('zh') ? 'EN' : '中文'}
    </button>
  );
}