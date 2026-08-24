import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { HelpCircle, PhoneCall, Send, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const HelpFeedback: React.FC = () => {
  const { t } = useLanguage();

  const [category, setCategory] = useState('missing_bus');
  const [busNumber, setBusNumber] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setBusNumber('');
      setDescription('');
    }, 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-100">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-900 text-lg">
              {t('Help & Passenger Feedback', 'मदत आणि नागरिक अभिप्राय')}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {t('Report transit issues, missing buses, or submit feedback to Ahilyanagar Transit', 'अहिल्यानगर बस सेवेबाबत तक्रार अथवा अभिप्राय नोंदवा')}
            </p>
          </div>
        </div>
      </div>

      {/* Emergency Control Helplines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Transit Control Room</span>
            <h4 className="font-extrabold text-slate-900 text-sm">0241-2345678</h4>
            <span className="text-xs text-slate-500">24x7 Helpline Support</span>
          </div>
          <a
            href="tel:02412345678"
            className="px-3.5 py-2 bg-[#0f3c5c] text-white font-bold text-xs rounded-xl hover:bg-[#0a2a42] transition-colors flex items-center gap-1.5"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Call Now</span>
          </a>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 block">Women Safety Helpline</span>
            <h4 className="font-extrabold text-slate-900 text-sm">1091 / 112</h4>
            <span className="text-xs text-slate-500">Immediate Police Assistance</span>
          </div>
          <a
            href="tel:1091"
            className="px-3.5 py-2 bg-rose-600 text-white font-bold text-xs rounded-xl hover:bg-rose-700 transition-colors flex items-center gap-1.5"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Emergency</span>
          </a>
        </div>
      </div>

      {/* Report Issue Form */}
      <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-extrabold text-slate-900 text-base border-b border-slate-100 pb-3">
          {t('Submit Issue Report / Feedback', 'तक्रार / अभिप्राय अर्ज')}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              {t('Issue Category', 'तक्रार प्रकार')}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0f3c5c]"
            >
              <option value="missing_bus">Missing Bus / Trip Cancelled</option>
              <option value="incorrect_eta">Incorrect Live ETA Display</option>
              <option value="driver_behaviour">Driver / Conductor Rash Driving or Conduct</option>
              <option value="cleanliness">Bus Vehicle Cleanliness</option>
              <option value="ticket_payment">Ticket Payment / Pass Issue</option>
              <option value="general_feedback">General Suggestion & Praise</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              {t('Bus Number (Optional)', 'बस क्रमांक (ऐच्छिक)')}
            </label>
            <input
              type="text"
              value={busNumber}
              onChange={(e) => setBusNumber(e.target.value)}
              placeholder="e.g. Bus 12 (MH-16-AZ-4091)"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0f3c5c]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            {t('Detailed Description', 'तपशीलवार माहिती')}
          </label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            placeholder="Please describe the issue or feedback with location and time..."
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0f3c5c]"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitted}
          className="w-full py-3 bg-[#0f3c5c] hover:bg-[#0a2a42] text-white font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
        >
          {isSubmitted ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-bounce" />
              <span>{t('Feedback Submitted to Transit Authority!', 'अभिप्राय सादर झाला!')}</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>{t('Submit Report', 'तक्रार पाठवा')}</span>
            </>
          )}
        </button>
      </form>

      {/* Frequently Asked Questions */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-extrabold text-slate-900 text-base border-b border-slate-100 pb-3">
          {t('Frequently Asked Questions (FAQ)', 'सतत विचारले जाणारे प्रश्न')}
        </h3>

        <div className="space-y-3 text-xs">
          {[
            {
              q: 'How does digital bus ticketing work on Ahilyanagar buses?',
              a: 'Select your source and destination stop, choose passenger count, and generate a QR ticket. Show the QR code to the conductor or scan at the validator upon boarding.',
            },
            {
              q: 'What are the rules for Monthly Student Pass concession?',
              a: 'Students enrolled in accredited Ahilyanagar schools or colleges are eligible for a 50% discount. Valid Student ID proof is required during pass creation.',
            },
            {
              q: 'How accurate is the live GPS tracking data?',
              a: 'Live tracking updates every 5 to 10 seconds based on onboard GPS transponders installed across Ahilyanagar city buses.',
            },
          ].map((faq, idx) => (
            <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <h5 className="font-bold text-slate-900">{faq.q}</h5>
              <p className="text-slate-600 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
