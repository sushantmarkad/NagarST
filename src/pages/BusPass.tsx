import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/FeedbackContext';
import { PassCard } from '../components/cards/PassCard';
import { formatCurrency } from '../utils/formatters';
import { CreditCard, Plus, CheckCircle2, ShieldCheck, Sparkles, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';

export const BusPass: React.FC = () => {
  const { t } = useLanguage();
  const { passes, addPass } = useApp();
  const toast = useToast();

  const [isApplying, setIsApplying] = useState(false);
  const [passType, setPassType] = useState<'daily' | 'weekly' | 'monthly_general' | 'monthly_student'>('monthly_student');
  const [holderName, setHolderName] = useState('Aditya Rahul Pawar');
  const [institution, setInstitution] = useState('New Arts & Commerce College, Ahilyanagar');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setIsSubmitting(true);

    setTimeout(() => {
      const pass = addPass({
        passType,
        title: passType === 'monthly_student' ? 'Monthly Student Unlimited Pass' : 'City Transit Pass',
        titleMarathi: passType === 'monthly_student' ? 'मासिक विद्यार्थी अमर्याद पास' : 'दैनिक शहर प्रवास पास',
        holderName,
        holderId: `CITIZEN-${Math.floor(1000 + Math.random() * 9000)}`,
        institutionOrOrg: passType === 'monthly_student' ? institution : undefined,
        validUntil: passType === 'daily' ? 'Tomorrow' : '30 Sep 2026',
        fare: getPassFare(),
      });

      setIsSubmitting(false);
      setIsApplying(false);
      toast.success(
        t(
          `Pass ${pass.passCode} activated successfully! Valid for unlimited city rides.`,
          `पास ${pass.passCode} सक्रिय झाला! अमर्याद शहर प्रवासासाठी वैध.`
        ),
        t('Pass Issued', 'पास मंजूर झाला')
      );
    }, 600);
  };

  const activePasses = passes.filter((p) => p.status === 'active');

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      
      {/* 1. HEADER */}
      <div className="p-5 md:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#7847CB] text-white flex items-center justify-center shadow-sm shadow-[#7847CB]/30 shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-900 text-base md:text-lg">
              {t('Digital Transit Passes & Concessions', 'डिजिटल बस पास आणि सवलती')}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {t('Unlimited daily, student, and monthly municipal travel passes', 'अमर्याद दैनिक, विद्यार्थी व मासिक शहर बस पास')}
            </p>
          </div>
        </div>

        <Button
          onClick={() => setIsApplying(!isApplying)}
          leftIcon={isApplying ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          variant={isApplying ? 'outline' : 'primary'}
          size="md"
        >
          {isApplying ? t('Close Form', 'बंद करा') : t('Apply for Pass', 'नवीन पास अर्ज करा')}
        </Button>
      </div>

      {/* 2. PASS APPLICATION FORM */}
      {isApplying && (
        <form onSubmit={handleApply} className="p-6 rounded-3xl bg-white border border-[#7847CB]/30 ring-4 ring-[#7847CB]/5 shadow-xl space-y-5 animate-in fade-in zoom-in-98">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm md:text-base">
                {t('Ahilyanagar Municipal Bus Pass Issuance', 'अहिल्यानगर महानगरपालिका बस पास अर्ज')}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('Instant digital issuance with verifiable conductor QR scan', 'कंडक्टर पडताळणीसाठी डिजिटल क्यूआर पास')}
              </p>
            </div>
            <Badge variant="brand" size="sm">Govt Concession</Badge>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              {t('Select Pass Tier', 'पास प्रकार निवडा')}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { id: 'daily', name: 'Daily Unlimited', mr: 'दैनिक अमर्याद', price: 50, days: '1 Day' },
                { id: 'weekly', name: 'Weekly Commute', mr: 'साप्ताहिक पास', price: 250, days: '7 Days' },
                { id: 'monthly_student', name: 'Student Monthly', mr: 'विद्यार्थी मासिक (५०% सवलत)', price: 400, days: '30 Days' },
                { id: 'monthly_general', name: 'General Citizen', mr: 'सर्वसामान्य मासिक', price: 800, days: '30 Days' },
              ].map((tier) => (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => setPassType(tier.id as any)}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    passType === tier.id
                      ? 'bg-purple-50/80 border-[#7847CB] ring-2 ring-[#7847CB]/20 shadow-xs'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-xs font-bold text-slate-900 block">{tier.name}</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">{tier.mr}</span>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-sm font-black text-[#7847CB]">{formatCurrency(tier.price)}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">{tier.days}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {t('Pass Holder Full Name', 'पासधारकाचे पूर्ण नाव')}
              </label>
              <input
                type="text"
                required
                value={holderName}
                onChange={(e) => setHolderName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#7847CB] focus:ring-2 focus:ring-[#7847CB]/20"
              />
            </div>

            {passType === 'monthly_student' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {t('College / School Name', 'शाळा किंवा महाविद्यालयाचे नाव')}
                </label>
                <input
                  type="text"
                  required
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#7847CB] focus:ring-2 focus:ring-[#7847CB]/20"
                />
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs text-slate-500 block">{t('Total Pass Amount', 'एकूण रक्कम')}</span>
              <span className="text-xl md:text-2xl font-black text-slate-900 tabular-nums">
                {formatCurrency(getPassFare())}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="md" onClick={() => setIsApplying(false)}>
                {t('Cancel', 'रद्द करा')}
              </Button>
              <Button type="submit" size="md" isLoading={isSubmitting}>
                {t('Pay & Activate Digital Pass', 'पैसे भरा व पास सुरू करा')}
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* 3. ACTIVE PASSES */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
          {t('Active Transit Passes', 'सक्रिय बस पास')} ({activePasses.length})
        </h3>

        {activePasses.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title={t('No active passes found', 'कोणताही सक्रिय पास नाही')}
            description={t(
              'Save up to 50% on everyday city travel with student and commuter monthly passes.',
              'विद्यार्थी आणि मासिक पाससह दैनंदिन प्रवासावर ५०% पर्यंत बचत करा.'
            )}
            actionText={t('Get a Pass', 'पास मिळवा')}
            onAction={() => setIsApplying(true)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activePasses.map((pass) => (
              <PassCard key={pass.id} pass={pass} />
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
