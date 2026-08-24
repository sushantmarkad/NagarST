import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Globe } from 'lucide-react';

export const LanguageToggle: React.FC = () => {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      onClick={toggleLanguage}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
      title="Toggle Language / भाषा बदला"
    >
      <Globe className="w-3.5 h-3.5 text-slate-500" />
      <span>{language === 'en' ? 'मराठी' : 'English'}</span>
    </button>
  );
};
