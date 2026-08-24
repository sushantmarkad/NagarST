import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { TicketCard } from '../components/cards/TicketCard';
import { LocationSelector } from '../components/common/LocationSelector';
import { formatCurrency } from '../utils/formatters';
import type { BusType } from '../types';
import {
  Ticket as TicketIcon,
  Plus,
  ShieldCheck,
  CheckCircle2,
  CreditCard,
  Smartphone,
} from 'lucide-react';

export const Tickets: React.FC = () => {
  const { language, t } = useLanguage();
  const { tickets, addTicket } = useApp();
  const [searchParams] = useSearchParams();

  const [isBuying, setIsBuying] = useState(false);
  const [source, setSource] = useState(
    searchParams.get('source') || (language === 'mr' ? 'मध्यवर्ती बस स्थानक (CBS)' : 'Central Bus Stand (CBS)')
  );
  const [destination, setDestination] = useState(
    searchParams.get('dest') || (language === 'mr' ? 'सावेडी बस टर्मिनस' : 'Savedi Bus Terminal')
  );
  const [passengerCount, setPassengerCount] = useState(1);
  const [busType, setBusType] = useState<BusType>('AC Express');
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'counter'>('upi');
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  const baseRatePerPassenger = busType === 'AC Express' ? 20 : busType === 'EV Metro Shuttle' ? 15 : 10;
  const baseFare = baseRatePerPassenger * passengerCount;
  const govTax = Math.round(baseFare * 0.1);
  const totalFare = baseFare + govTax;

  const handlePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    addTicket({
      sourceStop: source,
      destinationStop: destination,
      passengerCount,
      fare: totalFare,
      fareBreakup: {
        baseFare,
        govTax,
        discount: 0,
        total: totalFare,
      },
      busType,
    });
    setPurchaseSuccess(true);
    setTimeout(() => {
      setPurchaseSuccess(false);
      setIsBuying(false);
    }, 1500);
  };

  const activeTickets = tickets.filter((t) => t.status === 'active');
  const pastTickets = tickets.filter((t) => t.status !== 'active');

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0f3c5c] text-white flex items-center justify-center shadow-xs">
            <TicketIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-900 text-lg">
              {t('Digital Bus Tickets', 'डिजिटल बस तिकीट')}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {t('Instant QR tickets for Ahilyanagar city buses', 'अहिल्यानगर सिटी बससाठी इन्स्टंट QR तिकिटे')}
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsBuying(!isBuying)}
          className="px-5 py-2.5 bg-[#0f3c5c] text-white font-bold text-xs rounded-xl hover:bg-[#0a2a42] transition-colors shadow-2xs flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>{isBuying ? t('Cancel', 'रद्द करा') : t('Buy New Ticket', 'नवीन तिकीट खरेदी करा')}</span>
        </button>
      </div>

      {/* Ticket Purchase Form Wizard */}
      {isBuying && (
        <form onSubmit={handlePurchase} className="p-6 rounded-2xl bg-white border border-[#0f3c5c] ring-2 ring-[#0f3c5c]/10 shadow-lg space-y-4">
          <h3 className="font-extrabold text-slate-900 text-base border-b border-slate-100 pb-3">
            {t('Book Single / Group Transit Ticket', 'बस तिकीट बुकिंग')}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <LocationSelector
              label={t('Source Stop', 'प्रारंभ थांबा')}
              value={source}
              onChange={setSource}
              iconType="origin"
            />
            <LocationSelector
              label={t('Destination Stop', 'गंतव्य थांबा')}
              value={destination}
              onChange={setDestination}
              iconType="destination"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                {t('Passenger Count', 'प्रवाशांची संख्या')}
              </label>
              <div className="flex items-center gap-3">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setPassengerCount(num)}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                      passengerCount === num
                        ? 'bg-[#0f3c5c] text-white border-[#0f3c5c]'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                {t('Bus Category', 'बस प्रकार')}
              </label>
              <select
                value={busType}
                onChange={(e) => setBusType(e.target.value as BusType)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0f3c5c]"
              >
                <option value="AC Express">AC Express (₹20/head)</option>
                <option value="EV Metro Shuttle">EV Metro Shuttle (₹15/head)</option>
                <option value="Standard City">Standard City Bus (₹10/head)</option>
                <option value="Mini Bus">Mini Bus (₹10/head)</option>
              </select>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              {t('Payment Mode', 'पेमेंट पर्याय')}
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('upi')}
                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                  paymentMethod === 'upi'
                    ? 'border-[#0f3c5c] bg-blue-50/50 text-[#0f3c5c]'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>UPI / GPay / Paytm</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                  paymentMethod === 'card'
                    ? 'border-[#0f3c5c] bg-blue-50/50 text-[#0f3c5c]'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Debit / Credit Card</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('counter')}
                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                  paymentMethod === 'counter'
                    ? 'border-[#0f3c5c] bg-blue-50/50 text-[#0f3c5c]'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Transit Wallet</span>
              </button>
            </div>
          </div>

          {/* Fare Summary */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span>Base Fare ({passengerCount} passenger):</span>
              <span className="font-semibold">{formatCurrency(baseFare)}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Civic Transit Surcharge (10%):</span>
              <span className="font-semibold">{formatCurrency(govTax)}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-extrabold text-sm text-slate-900">
              <span>Total Fare Payable:</span>
              <span className="text-[#0f3c5c] text-base">{formatCurrency(totalFare)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={purchaseSuccess}
            className="w-full py-3 bg-[#0f3c5c] hover:bg-[#0a2a42] text-white font-extrabold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
          >
            {purchaseSuccess ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-bounce" />
                <span>{t('Ticket Generated Successfully!', 'तिकीट तयार झाले!')}</span>
              </>
            ) : (
              <span>
                {t('Pay ' + formatCurrency(totalFare) + ' & Generate Digital Ticket', 'पेमेंट करा आणि तिकीट मिळवा')}
              </span>
            )}
          </button>
        </form>
      )}

      {/* Active Tickets List */}
      <div className="space-y-3">
        <h3 className="font-extrabold text-slate-900 text-base">
          {t('Active Tickets', 'सक्रिय तिकिटे')} ({activeTickets.length})
        </h3>
        {activeTickets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeTickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        ) : (
          <div className="p-6 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
            {t('No active tickets found. Tap "Buy New Ticket" above.', 'कोणतेही सक्रिय तिकीट नाही.')}
          </div>
        )}
      </div>

      {/* Ticket History */}
      {pastTickets.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-extrabold text-slate-900 text-base">
            {t('Past Ticket History', 'मागील प्रवास इतिहास')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pastTickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
