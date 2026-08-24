import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { AHILYANAGAR_LOCATIONS, type TransitLocation } from '../../data/ahilyanagarLocations';
import { useLanguage } from '../../context/LanguageContext';

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

  const filteredLocations = AHILYANAGAR_LOCATIONS.filter(
    (loc) =>
      loc.name.toLowerCase().includes(query.toLowerCase()) ||
      loc.nameMarathi.includes(query)
  );

  const handleSelect = (loc: TransitLocation) => {
    const displayName = language === 'mr' ? loc.nameMarathi : loc.name;
    setQuery(displayName);
    onChange(displayName);
    setIsOpen(false);
  };

  const handleUseCurrentLocation = () => {
    const name = language === 'mr' ? 'माझे वर्तमान स्थान (CBS चौक)' : 'Current Location (CBS Chowk)';
    setQuery(name);
    onChange(name);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {iconType === 'origin' ? (
            <div className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-blue-100" />
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
          placeholder={placeholder || (language === 'mr' ? 'स्थान शोधा...' : 'Search location...')}
          className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f3c5c] focus:bg-white transition-all"
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
            className="w-full text-left px-3 py-2 text-xs font-semibold text-[#0f3c5c] bg-slate-50 hover:bg-slate-100 flex items-center gap-2 border-b border-slate-100"
          >
            <Navigation className="w-3.5 h-3.5 text-[#0f3c5c]" />
            <span>{language === 'mr' ? 'वर्तमान स्थान वापरा' : 'Use Current Location'}</span>
          </button>

          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {language === 'mr' ? 'अहिल्यानगरमधील प्रमुख ठिकाणे' : 'Popular Ahilyanagar Stops'}
          </div>

          {filteredLocations.length > 0 ? (
            filteredLocations.map((loc) => (
              <button
                key={loc.id}
                type="button"
                onClick={() => handleSelect(loc)}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between transition-colors border-b border-slate-50 last:border-0"
              >
                <div>
                  <div className="font-medium text-slate-900">
                    {language === 'mr' ? loc.nameMarathi : loc.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    {language === 'mr' ? loc.name : loc.nameMarathi}
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 capitalize">
                  {loc.category}
                </span>
              </button>
            ))
          ) : (
            <div className="px-3 py-3 text-xs text-slate-500 text-center">
              {language === 'mr' ? 'कोणतेही ठिकाण सापडले नाही' : 'No matching stops found'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
