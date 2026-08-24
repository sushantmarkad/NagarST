import React from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { FavoriteLocationCard } from '../components/cards/FavoriteLocationCard';
import { useNavigate } from 'react-router-dom';
import { Heart, Plus } from 'lucide-react';

export const Favorites: React.FC = () => {
  const { t } = useLanguage();
  const { favorites } = useApp();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
            {t('Saved Favorites', 'माझे आवडते थांबे व ठिकाणे')}
          </h2>
          <p className="text-xs text-slate-500">
            {t('Quick access to your daily commute destinations', 'तुमच्या दैनंदिन प्रवासाच्या ठिकाणांवर त्वरित जा')}
          </p>
        </div>

        <button
          onClick={() => alert(t('Add favorite feature: Search stop and click ❤️', 'आवडते ठिकाण जोडण्यासाठी थांबा शोधा व ❤️ दाबा'))}
          className="px-3.5 py-2 rounded-xl bg-[#0f3c5c] text-white text-xs font-bold hover:bg-[#0a2a42] transition-colors flex items-center gap-1.5 shadow-2xs"
        >
          <Plus className="w-4 h-4" />
          <span>{t('Add New', 'नवीन जोडा')}</span>
        </button>
      </div>

      {favorites.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <Heart className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-700">{t('No saved favorites yet', 'कोणतेही आवडते ठिकाण जतन केलेले नाही')}</h3>
          <p className="text-xs text-slate-500">
            {t('Tap the heart icon on any bus stop or route to save it here for 1-tap navigation.', 'कोणत्याही बस थांब्यावर किंवा मार्गावर हार्ट आयकॉन दाबा.')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {favorites.map((fav) => (
            <FavoriteLocationCard
              key={fav.id}
              favorite={fav}
              onNavigate={(f) => navigate(`/app/plan?to=${encodeURIComponent(f.title)}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
