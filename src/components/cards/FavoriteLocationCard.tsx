import React from 'react';
import type { FavoriteItem } from '../../types';
import { Home, Briefcase, GraduationCap, Bus as BusIcon, MapPin, ArrowUpRight } from 'lucide-react';

interface FavoriteLocationCardProps {
  favorite: FavoriteItem;
  onNavigate?: (fav: FavoriteItem) => void;
}

export const FavoriteLocationCard: React.FC<FavoriteLocationCardProps> = ({
  favorite,
  onNavigate,
}) => {
  const renderIcon = () => {
    switch (favorite.icon) {
      case 'home':
        return <Home className="w-4 h-4 text-blue-600" />;
      case 'work':
        return <Briefcase className="w-4 h-4 text-emerald-600" />;
      case 'school':
        return <GraduationCap className="w-4 h-4 text-purple-600" />;
      case 'bus':
        return <BusIcon className="w-4 h-4 text-[#0f3c5c]" />;
      default:
        return <MapPin className="w-4 h-4 text-rose-600" />;
    }
  };

  return (
    <div className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-2xs transition-all flex items-center justify-between">
      <div
        onClick={() => onNavigate?.(favorite)}
        className="flex items-center gap-3 flex-1 cursor-pointer"
      >
        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
          {renderIcon()}
        </div>
        <div>
          <h4 className="font-bold text-slate-900 text-sm">{favorite.title}</h4>
          <p className="text-xs text-slate-500 font-medium truncate">{favorite.subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {favorite.quickEta && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
            {favorite.quickEta}
          </span>
        )}
        <button
          onClick={() => onNavigate?.(favorite)}
          className="p-1.5 text-[#0f3c5c] hover:bg-slate-100 rounded-lg transition-colors"
          title="Plan route to favorite"
        >
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
