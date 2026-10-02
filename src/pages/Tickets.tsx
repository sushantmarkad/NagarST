import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/FeedbackContext';
import { TicketCard } from '../components/cards/TicketCard';
import { LocationSelector } from '../components/common/LocationSelector';
import { formatCurrency } from '../utils/formatters';
import type { BusType } from '../types';
import {
  Ticket as TicketIcon,
  Plus,
  ShieldCheck,
  CreditCard,
  Smartphone,
  CheckCircle2,
  X
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';

export const Tickets: React.FC = () => {
  const { language, t } = useLanguage();
  const { tickets, addTicket } = useApp();
  const toast = useToast();
  const [searchParams] = useSearchParams();

  const [isBuying, setIsBuying] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [source, setSource] = useState(
    searchParams.get('source') || (language === 'mr' ? 'मध्यवर्ती बस स्थानक (CBS)' : 'Central Bus Stand (CBS)')
  );
  const [destination, setDestination] = useState(
    searchParams.get('dest') || (language === 'mr' ? 'सावेडी बस टर्मिनस' : 'Savedi Bus Terminal')
  );
  const [passengerCount, setPassengerCount] = useState(1);
  const [busType, setBusType] = useState<BusType>('AC Express');
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'counter'>('upi');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const baseRatePerPassenger = busType === 'AC Express' ? 20 : busType === 'EV Metro Shuttle' ? 15 : 10;
  const baseFare = baseRatePerPassenger * passengerCount;
  const govTax = Math.round(baseFare * 0.1);
  const totalFare = baseFare + govTax;

  const handlePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      const ticket = addTicket({
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

      setIsSubmitting(false);
      setIsBuying(false);
      setActiveTab('active');
      toast.success(
        t(
          `Ticket ${ticket.ticketCode} issued successfully! Show QR code to bus conductor.`,
          `तिकीट ${ticket.ticketCode} तयार झाले! बस वाहकाला QR कोड दाखवा.`
        ),
        t('Ticket Booked', 'तिकीट बुक झाले')
      );
    }, 600);
  };

  const activeTickets = tickets.filter((t) => t.status === 'active');
  const pastTickets = tickets.filter((t) => t.status !== 'active');

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      
      {/* 1. HEADER BANNER */}
      <div className="p-5 md:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#7847CB] text-white flex items-center justify-center shadow-sm shadow-[#7847CB]/30 shrink-0">
            <TicketIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-900 text-base md:text-lg">
              {t('Digital Bus Tickets', 'डिजिटल बस तिकीट')}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {t('Instant QR tickets for Ahilyanagar city buses with automatic fare validation', 'अहिल्यानगर सिटी बससाठी इन्स्टंट QR तिकिटे')}
            </p>
          </div>
        </div>

        <Button
          onClick={() => setIsBuying(!isBuying)}
          leftIcon={isBuying ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          variant={isBuying ? 'outline' : 'primary'}
          size="md"
        >
          {isBuying ? t('Close Form', 'बंद करा') : t('Book New Ticket', 'नवीन तिकीट बुक करा')}
        </Button>
      </div>

      {/* 2. TICKET PURCHASE FORM MODAL / PANEL */}
      {isBuying && (
        <form onSubmit={handlePurchase} className="p-6 rounded-3xl bg-white border border-[#7847CB]/30 ring-4 ring-[#7847CB]/5 shadow-xl space-y-5 animate-in fade-in zoom-in-98">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm md:text-base">
                {t('Issue Paperless City Transit Ticket', 'बस तिकीट बुकिंग')}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('Select your journey origin and destination stop in Ahilyanagar', 'प्रारंभ व गंतव्य थांबा निवडा')}
              </p>
            </div>
            <Badge variant="brand" size="sm">MSRTC Standard</Badge>
          </div>

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
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                {t('Passenger Count', 'प्रवाशांची संख्या')}
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setPassengerCount(num)}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                      passengerCount === num
                        ? 'bg-[#7847CB] text-white border-[#7847CB] shadow-xs shadow-[#7847CB]/30'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                {t('Bus Category', 'बस प्रकार')}
              </label>
              <select
                value={busType}
                onChange={(e) => setBusType(e.target.value as BusType)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#7847CB] focus:ring-2 focus:ring-[#7847CB]/20"
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
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              {t('Payment Mode', 'पेमेंट पद्धत')}
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'upi', label: 'UPI / QR', icon: Smartphone },
                { id: 'card', label: 'Debit / Card', icon: CreditCard },
                { id: 'counter', label: 'Conductor Cash', icon: ShieldCheck },
              ].map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                      paymentMethod === m.id
                        ? 'bg-purple-50/80 border-[#7847CB] text-[#7847CB] font-bold shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[11px]">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fare Summary & Submit */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs text-slate-500 block">
                {passengerCount} {passengerCount === 1 ? 'Commuter' : 'Commuters'} • {busType}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl md:text-2xl font-black text-slate-900 tabular-nums">
                  {formatCurrency(totalFare)}
                </span>
                <span className="text-[10px] text-slate-400">incl. municipal cess</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="md" onClick={() => setIsBuying(false)}>
                {t('Cancel', 'रद्द करा')}
              </Button>
              <Button type="submit" size="md" isLoading={isSubmitting}>
                {t('Pay & Generate QR Ticket', 'पैसे द्या व तिकीट मिळवा')}
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* 3. TICKETS LIST WITH TABS (Active vs History) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('active')}
              className={`pb-3 text-xs md:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'active'
                  ? 'border-[#7847CB] text-[#7847CB]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>{t('Active Tickets', 'सक्रिय तिकिटे')}</span>
              <span className="px-2 py-0.5 rounded-full bg-purple-100 text-[#7847CB] text-[10px] font-bold">
                {activeTickets.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`pb-3 text-xs md:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'history'
                  ? 'border-[#7847CB] text-[#7847CB]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>{t('Travel History', 'मागील प्रवास')}</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                {pastTickets.length}
              </span>
            </button>
          </div>
        </div>

        {activeTab === 'active' && (
          activeTickets.length === 0 ? (
            <EmptyState
              icon={TicketIcon}
              title={t('No active tickets right now', 'सध्या कोणतेही सक्रिय तिकीट नाही')}
              description={t(
                'Book a digital ticket before boarding the bus to avoid queues and exact change hassles.',
                'रांगा टाळण्यासाठी व कॅशलेस प्रवासासाठी डिजिटल तिकीट बुक करा.'
              )}
              actionText={t('Book a Ticket', 'तिकीट बुक करा')}
              onAction={() => setIsBuying(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeTickets.map((tkt) => (
                <TicketCard key={tkt.id} ticket={tkt} />
              ))}
            </div>
          )
        )}

        {activeTab === 'history' && (
          pastTickets.length === 0 ? (
            <EmptyState
              icon={TicketIcon}
              title={t('No past trip records found', 'कोणताही मागील प्रवास रेकॉर्ड नाही')}
              description={t(
                'Your completed journeys and past receipts will appear here.',
                'तुमचा पूर्ण झालेला प्रवास येथे दिसेल.'
              )}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pastTickets.map((tkt) => (
                <TicketCard key={tkt.id} ticket={tkt} />
              ))}
            </div>
          )
        )}
      </div>

    </div>
  );
};
