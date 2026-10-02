import React from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/FeedbackContext';
import { FavoriteLocationCard } from '../components/cards/FavoriteLocationCard';
import { useNavigate } from 'react-router-dom';
import { Heart, Plus, MapPin } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';

export const Favorites: React.FC = () => {
  const { t } = useLanguage();
  const { favorites } = useApp();
  const toast = useToast();
  const navigate = useNavigate();

  const handleAddNew = () => {
    toast.info(
      t(
        'To add a favorite, search any bus stop or route and click the heart icon.',
        'आवडते ठिकाण जोडण्यासाठी थांबा शोधा व ❤️ दाबा.'
      ),
      t('How to Save Places', 'ठिकाण कसे जतन करावे')
    );
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg md:text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
            {t('Saved Places & Frequent Stops', 'माझे आवडते थांबे व ठिकाणे')}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('Quick 1-tap access to your daily Ahilyanagar destinations', 'तुमच्या दैनंदिन प्रवासाच्या ठिकाणांवर त्वरित जा')}
          </p>
        </div>

        <Button
          size="sm"
          onClick={handleAddNew}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          {t('Add New', 'नवीन जोडा')}
        </Button>
      </div>

      {favorites.length === 0 ? (
        <EmptyState
          icon={Heart}
          title={t('No saved favorites yet', 'कोणतेही आवडते ठिकाण जतन केलेले नाही')}
          description={t(
            'Save your home, office, college or nearest bus stop to check arrival times with one tap.',
            'घर, कॉलेज किंवा ऑफिसचा थांबा जतन करा आणि एका क्लिकमध्ये बस वेळ पहा.'
          )}
          actionText={t('Browse Bus Routes', 'बस मार्ग पहा')}
          onAction={() => navigate('/app/routes')}
        />
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
