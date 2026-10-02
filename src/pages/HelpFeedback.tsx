import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/FeedbackContext';
import { HelpCircle, PhoneCall, Send, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

export const HelpFeedback: React.FC = () => {
  const { t } = useLanguage();
  const toast = useToast();

  const [category, setCategory] = useState('missing_bus');
  const [busNumber, setBusNumber] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setBusNumber('');
      setDescription('');
      toast.success(
        t(
          'Your feedback ticket has been dispatched to Ahilyanagar Municipal Transit Support.',
          'तुमचा अभिप्राय / तक्रार नियंत्रण कक्षाकडे पाठवली गेली आहे.'
        ),
        t('Report Dispatched', 'तक्रार नोंदवली गेली')
      );
    }, 600);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="p-5 md:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#7847CB] text-white flex items-center justify-center shadow-sm shadow-[#7847CB]/30 shrink-0">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-900 text-base md:text-lg">
              {t('Help & Passenger Feedback', 'मदत आणि नागरिक अभिप्राय')}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {t('Report transit issues, missing buses, or submit feedback to Ahilyanagar Transit', 'अहिल्यानगर बस सेवेबाबत तक्रार अथवा अभिप्राय नोंदवा')}
            </p>
          </div>
        </div>
        <Badge variant="brand" size="md">24x7 Helpdesk</Badge>
      </div>

      {/* Emergency Control Helplines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Transit Control Room</span>
            <h4 className="font-black text-slate-900 text-base mt-0.5">0241-2345678</h4>
            <span className="text-xs text-slate-500">Dispatch Support</span>
          </div>
          <a
            href="tel:02412345678"
            className="px-4 py-2 bg-[#7847CB] text-white font-bold text-xs rounded-xl hover:bg-[#6336b3] transition-colors flex items-center gap-1.5 shadow-sm shadow-[#7847CB]/20"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Call Now</span>
          </a>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 block">Emergency & Women Safety</span>
            <h4 className="font-black text-slate-900 text-base mt-0.5">1091 / 112</h4>
            <span className="text-xs text-slate-500">Police Transit Response</span>
          </div>
          <a
            href="tel:1091"
            className="px-4 py-2 bg-rose-600 text-white font-bold text-xs rounded-xl hover:bg-rose-700 transition-colors flex items-center gap-1.5 shadow-sm shadow-rose-600/20"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Emergency</span>
          </a>
        </div>
      </div>

      {/* Report Issue Form */}
      <form onSubmit={handleSubmit} className="p-6 md:p-8 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
        <h3 className="font-extrabold text-slate-900 text-base border-b border-slate-100 pb-3">
          {t('Submit Issue Report / Feedback', 'तक्रार / अभिप्राय अर्ज')}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {t('Issue Category', 'तक्रार प्रकार')}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#7847CB] focus:ring-2 focus:ring-[#7847CB]/20"
            >
              <option value="missing_bus">Missing Bus / Trip Cancelled</option>
              <option value="incorrect_eta">Incorrect Live ETA Display</option>
              <option value="driver_behaviour">Driver / Conductor Conduct</option>
              <option value="cleanliness">Bus Vehicle Cleanliness</option>
              <option value="ticket_payment">Ticket Payment / Pass Issue</option>
              <option value="general_feedback">General Suggestion & Praise</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {t('Bus Number (Optional)', 'बस क्रमांक (ऐच्छिक)')}
            </label>
            <input
              type="text"
              value={busNumber}
              onChange={(e) => setBusNumber(e.target.value)}
              placeholder="e.g. Bus AH-24"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#7847CB] focus:ring-2 focus:ring-[#7847CB]/20"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            {t('Detailed Description', 'तपशीलवार माहिती')}
          </label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            placeholder="Please describe the issue or feedback with location and approximate time..."
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#7847CB] focus:ring-2 focus:ring-[#7847CB]/20"
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={isSubmitting}
          leftIcon={<Send className="w-4 h-4" />}
        >
          {t('Submit Report to Control Room', 'नियंत्रण कक्षाला पाठवा')}
        </Button>
      </form>

      {/* Frequently Asked Questions */}
      <div className="p-6 md:p-8 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
        <h3 className="font-extrabold text-slate-900 text-base border-b border-slate-100 pb-3">
          {t('Frequently Asked Questions (FAQ)', 'सतत विचारले जाणारे प्रश्न')}
        </h3>

        <div className="space-y-3 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <h5 className="font-bold text-slate-900">How do I show my digital ticket or pass to the bus conductor?</h5>
            <p className="text-slate-600 leading-relaxed">
              Open the "Tickets" or "Bus Pass" tab in your bottom bar and tap on your active ticket or pass to display the large verification QR code.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <h5 className="font-bold text-slate-900">Are student concession passes valid on all electric and AC buses?</h5>
            <p className="text-slate-600 leading-relaxed">
              Yes, monthly student concessional passes issued under the municipal student welfare scheme are valid across all municipal Ahilyanagar city bus routes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
