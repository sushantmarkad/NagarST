import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useApp } from '../../context/AppContext';

interface LocationSelectorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  iconType?: 'origin' | 'destination';
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  label,
  value,
  onChange,
  placeholder,
  iconType = 'destination',
}) => {
  const { language } = useLanguage();
  const { stops } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Use real database stops from Supabase
  const searchList = stops.map(s => ({
    id: s.id,
    name: s.name,
    nameMarathi: s.nameMarathi || s.name,
    category: 'Municipal Stop',
  }));

  const filteredLocations = searchList.filter(
    (loc) =>
      loc.name.toLowerCase().includes(query.toLowerCase()) ||
      loc.nameMarathi.includes(query)
  );

  const handleSelect = (loc: { id: string; name: string; nameMarathi: string }) => {
    const displayName = language === 'mr' ? loc.nameMarathi : loc.name;
    setQuery(displayName);
    onChange(displayName);
    setIsOpen(false);
  };

  const handleUseCurrentLocation = () => {
    const name = language === 'mr' ? 'माझे वर्तमान स्थान (Central Station)' : 'Current Location (Central Station)';
    setQuery(name);
    onChange(name);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
        {label}
      </label>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {iconType === 'origin' ? (
            <div className="w-2.5 h-2.5 rounded-full border-2 border-[#7847CB] bg-white" />
          ) : (
            <MapPin className="w-4 h-4 text-rose-500" />
          )}
        </div>
        <input
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
            setIsOpen(true);
          }}
          placeholder={placeholder || (language === 'mr' ? 'थांबा शोधा...' : 'Search stop in Ahilyanagar...')}
          className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7847CB] focus:bg-white transition-all"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              onChange('');
            }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-slate-600"
          >
            ×
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto py-1 text-sm">
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            className="w-full text-left px-3 py-2 text-xs font-semibold text-[#7847CB] bg-purple-50/50 hover:bg-purple-50 flex items-center gap-2 border-b border-slate-100"
          >
            <Navigation className="w-3.5 h-3.5 text-[#7847CB]" />
            <span>{language === 'mr' ? 'वर्तमान स्थान वापरा' : 'Use Current Location'}</span>
          </button>

          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {language === 'mr' ? 'अहिल्यानगरमधील अधिकृत बस थांबे' : 'Official Ahilyanagar Bus Stops'} ({filteredLocations.length})
          </div>

          {filteredLocations.length > 0 ? (
            filteredLocations.map((loc) => (
              <button
                key={loc.id}
                type="button"
                onClick={() => handleSelect(loc)}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between transition-colors border-b border-slate-50 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <div>
                    <span className="font-semibold text-slate-900 block text-xs">
                      {language === 'mr' ? loc.nameMarathi : loc.name}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                  {loc.category}
                </span>
              </button>
            ))
          ) : (
            <div className="px-3 py-4 text-center text-slate-400 text-xs">
              {language === 'mr' ? 'कोणताही थांबा आढळला नाही' : 'No matching municipal stop found'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
