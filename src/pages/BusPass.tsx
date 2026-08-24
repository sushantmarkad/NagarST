import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { PassCard } from '../components/cards/PassCard';
import { formatCurrency } from '../utils/formatters';
import { CreditCard, Plus, CheckCircle2 } from 'lucide-react';

export const BusPass: React.FC = () => {
  const { t } = useLanguage();
  const { passes, addPass } = useApp();

  const [isApplying, setIsApplying] = useState(false);
  const [passType, setPassType] = useState<'daily' | 'weekly' | 'monthly_general' | 'monthly_student'>('monthly_student');
  const [holderName, setHolderName] = useState('Aditya Rahul Pawar');
  const [institution, setInstitution] = useState('New Arts & Commerce College, Ahilyanagar');
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  const getPassFare = () => {
    switch (passType) {
      case 'daily':
        return 50;
      case 'weekly':
        return 250;
      case 'monthly_student':
        return 400;
      case 'monthly_general':
        return 800;
    }
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    addPass({
      passType,
      title: passType === 'monthly_student' ? 'Monthly Student Unlimited Pass' : 'City Transit Pass',
      titleMarathi: passType === 'monthly_student' ? 'मासिक विद्यार्थी अमर्याद पास' : 'दैनिक शहर प्रवास पास',
      holderName,
      holderId: `CITIZEN-${Math.floor(1000 + Math.random() * 9000)}`,
      institutionOrOrg: passType === 'monthly_student' ? institution : undefined,
      validUntil: passType === 'daily' ? 'Tomorrow' : '30 Sep 2026',
      fare: getPassFare(),
    });
    setAppliedSuccess(true);
    setTimeout(() => {
      setAppliedSuccess(false);
      setIsApplying(false);
    }, 1500);
  };

  const activePasses = passes.filter((p) => p.status === 'active');

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0f3c5c] text-white flex items-center justify-center shadow-xs">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-900 text-lg">
              {t('Digital Bus Pass Subscriptions', 'डिजिटल बस पास सदस्यता')}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {t('Unlimited city bus travel across Ahilyanagar routes', 'अहिल्यानगर शहरात अमर्याद प्रवास पास')}
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsApplying(!isApplying)}
          className="px-5 py-2.5 bg-[#0f3c5c] text-white font-bold text-xs rounded-xl hover:bg-[#0a2a42] transition-colors shadow-2xs flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>{isApplying ? t('Cancel', 'रद्द करा') : t('Buy / Renew Pass', 'नवीन पास खरेदी करा')}</span>
        </button>
      </div>

      {/* Pass Store Pricing Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { type: 'daily', title: 'Daily Unlimited', fare: 50, desc: '24 hours unlimited travel on all city buses' },
          { type: 'weekly', title: 'Weekly Pass', fare: 250, desc: '7 days unlimited commute across Ahilyanagar' },
          { type: 'monthly_student', title: 'Monthly Student Pass', fare: 400, desc: 'Special 50% concession for students with ID' },
          { type: 'monthly_general', title: 'Monthly General', fare: 800, desc: '30 days unlimited transit across all routes' },
        ].map((plan) => (
          <div
            key={plan.type}
            onClick={() => {
              setPassType(plan.type as any);
              setIsApplying(true);
            }}
            className={`p-4 rounded-2xl border bg-white hover:border-[#0f3c5c] hover:shadow-md transition-all cursor-pointer space-y-2 ${
              passType === plan.type && isApplying ? 'border-[#0f3c5c] ring-2 ring-[#0f3c5c]/10' : 'border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#0f3c5c]">{plan.title}</span>
              <span className="text-base font-extrabold text-slate-900">{formatCurrency(plan.fare)}</span>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">{plan.desc}</p>
            <button className="w-full py-1.5 bg-slate-100 hover:bg-[#0f3c5c] hover:text-white font-bold text-xs rounded-lg transition-colors text-center">
              Select Plan
            </button>
          </div>
        ))}
      </div>

      {/* Apply Form Modal/Wizard */}
      {isApplying && (
        <form onSubmit={handleApply} className="p-6 rounded-2xl bg-white border border-[#0f3c5c] ring-2 ring-[#0f3c5c]/10 shadow-lg space-y-4">
          <h3 className="font-extrabold text-slate-900 text-base border-b border-slate-100 pb-3">
            {t('Apply for Bus Pass', 'बस पाससाठी अर्ज')}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                {t('Pass Holder Name', 'धारकाचे नाव')}
              </label>
              <input
                type="text"
                value={holderName}
                onChange={(e) => setHolderName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0f3c5c]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                {t('Selected Pass Plan', 'निवडलेला पास प्रकार')}
              </label>
              <select
                value={passType}
                onChange={(e) => setPassType(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0f3c5c]"
              >
                <option value="daily">Daily Pass (₹50)</option>
                <option value="weekly">Weekly Pass (₹250)</option>
                <option value="monthly_student">Monthly Student Concession Pass (₹400)</option>
                <option value="monthly_general">Monthly General Pass (₹800)</option>
              </select>
            </div>
          </div>

          {passType === 'monthly_student' && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                {t('Educational Institution Name', 'शाळा / कॉलेजचे नाव')}
              </label>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0f3c5c]"
              />
            </div>
          )}

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-semibold">
            <span>Pass Subscription Fee:</span>
            <span className="text-base font-extrabold text-[#0f3c5c]">{formatCurrency(getPassFare())}</span>
          </div>

          <button
            type="submit"
            disabled={appliedSuccess}
            className="w-full py-3 bg-[#0f3c5c] hover:bg-[#0a2a42] text-white font-extrabold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
          >
            {appliedSuccess ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-bounce" />
                <span>{t('Bus Pass Issued Successfully!', 'बस पास इश्यू झाला!')}</span>
              </>
            ) : (
              <span>{t('Pay ' + formatCurrency(getPassFare()) + ' & Issue Pass Now', 'पेमेंट करा आणि पास इश्यू करा')}</span>
            )}
          </button>
        </form>
      )}

      {/* Active Passes Section */}
      <div className="space-y-3">
        <h3 className="font-extrabold text-slate-900 text-base">
          {t('Your Active Bus Passes', 'तुमचे सक्रिय पास')} ({activePasses.length})
        </h3>
        {activePasses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activePasses.map((pass) => (
              <PassCard key={pass.id} pass={pass} onRenew={() => setIsApplying(true)} />
            ))}
          </div>
        ) : (
          <div className="p-6 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
            {t('No active passes. Select a plan above to issue a digital pass.', 'कोणतेही सक्रिय पास नाहीत.')}
          </div>
        )}
      </div>
    </div>
  );
};
