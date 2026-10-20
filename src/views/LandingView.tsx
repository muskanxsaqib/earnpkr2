import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowRight,
  LogIn,
  UserPlus,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  Users,
  Wallet,
  Clock,
  Award,
  Flame,
  Rocket,
  Diamond,
  Crown,
  Briefcase,
  ChevronRight,
  ChevronDown,
  Zap,
  HelpCircle,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import {
  useSiteBranding,
  BRAND_ICON_PRESETS,
  renderBrandPresetIcon,
} from '../lib/branding';
import { INVESTMENT_PLANS as fallbackPlans } from '../data';
import {
  parsePlansMetaJson,
  mergePlanWithMeta,
  PLAN_THEMES,
} from '../lib/economics';
import { ProfitCalculator } from '../components/ProfitCalculator';
import { ThemeStudioTriggerButton } from '../components/ThemeFontStudioModal';

interface LandingViewProps {
  onOpenAuth: (mode: 'login' | 'register') => void;
}

const LIVE_PAYOUT_FEED = [
  { user: 'Ali_Raza786', action: 'withdrew Rs. 1,700', via: 'EasyPaisa', time: 'Just now' },
  { user: 'Zainab_Khan', action: 'activated Standard Plan', via: 'Rs. 700', time: '1m ago' },
  { user: 'Hamza_Official', action: 'withdrew Rs. 3,450', via: 'JazzCash', time: '2m ago' },
  { user: 'Usman_Malik', action: 'claimed Rs. 250 Referral Bonus', via: 'Instant', time: '3m ago' },
  { user: 'Ayesha_Noor', action: 'withdrew Rs. 2,600', via: 'EasyPaisa', time: '4m ago' },
  { user: 'Bilal_Ahmed99', action: 'activated Gold Plan', via: 'Rs. 1,000', time: '5m ago' },
  { user: 'Saad_24', action: 'collected Rs. 500 Team Salary', via: 'Level 1', time: '6m ago' },
];

const LivePayoutTicker = React.memo(function LivePayoutTicker() {
  const [tickerIndex, setTickerIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % LIVE_PAYOUT_FEED.length);
    }, 3400);
    return () => clearInterval(timer);
  }, []);

  const currentTicker = LIVE_PAYOUT_FEED[tickerIndex];

  return (
    <div className="mb-4 sm:mb-6 flex justify-center lg:justify-start">
      <div className="w-full sm:w-auto max-w-md bg-white/10 border border-white/15 rounded-2xl px-3 py-2 flex items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shrink-0" />
          <div className="text-[11px] sm:text-xs text-slate-200 truncate">
            <span className="font-black text-white">{currentTicker.user}</span>{' '}
            <span>{currentTicker.action}</span>{' '}
            <span className="text-emerald-400 font-bold">({currentTicker.via})</span>
          </div>
        </div>
        <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded-md shrink-0">
          {currentTicker.time}
        </span>
      </div>
    </div>
  );
});

export function LandingView({ onOpenAuth }: LandingViewProps) {
  const branding = useSiteBranding();
  const activePreset =
    BRAND_ICON_PRESETS.find((p) => p.key === branding.site_icon_preset) ||
    BRAND_ICON_PRESETS[0];
  const isCustomImg = branding.site_icon_preset === 'custom_image';

  const [plans, setPlans] = useState<any[]>([]);
  const [referralBonus, setReferralBonus] = useState<number>(50);
  const [minWithdraw, setMinWithdraw] = useState<number>(100);
  const [freeRewardDays, setFreeRewardDays] = useState<number>(1);
  const [hasReferralCode, setHasReferralCode] = useState<string | null>(null);
  const [planFilter, setPlanFilter] = useState<'all' | 'starter' | 'popular' | 'vip'>('all');
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref') || localStorage.getItem('referred_by');
    if (ref) {
      setHasReferralCode(ref);
    }

    const fetchPublicData = async () => {
      try {
        const [{ data: plansData }, { data: settingsData }] = await Promise.all([
          supabase.from('plans').select('*').order('plan_number', { ascending: true }),
          supabase
            .from('app_settings')
            .select('setting_key, setting_value')
            .in('setting_key', [
              'plans_meta_json',
              'referral_bonus',
              'base_member_plan_price',
              'min_withdraw_amount',
              'min_withdrawal',
              'free_reward_days',
            ]),
        ]);

        const settingsMap: Record<string, string> = {};
        (settingsData || []).forEach((s: any) => {
          if (s?.setting_key) settingsMap[s.setting_key] = String(s.setting_value ?? '');
        });

        const refBonus = Number(settingsMap['referral_bonus']) || 50;
        const basePrice = Number(settingsMap['base_member_plan_price']) || 250;
        const minW =
          Number(settingsMap['min_withdraw_amount'] || settingsMap['min_withdrawal']) || 100;
        const freeDays =
          settingsMap['free_reward_days'] !== undefined && settingsMap['free_reward_days'] !== ''
            ? Number(settingsMap['free_reward_days'])
            : 1;

        setReferralBonus(refBonus);
        setMinWithdraw(minW);
        setFreeRewardDays(isNaN(freeDays) ? 1 : freeDays);

        const metaMap = parsePlansMetaJson(settingsMap['plans_meta_json']);
        const rawList = plansData && plansData.length > 0 ? plansData : fallbackPlans;
        const merged = rawList
          .map((p: any, idx: number) => mergePlanWithMeta(p, idx, metaMap, refBonus, basePrice))
          .filter((p: any) => p.is_active !== false);

        setPlans(merged);
      } catch {
        const metaMap = parsePlansMetaJson('{}');
        const merged = fallbackPlans.map((p: any, idx: number) =>
          mergePlanWithMeta(p, idx, metaMap, 50, 250)
        );
        setPlans(merged);
      }
    };

    fetchPublicData();
  }, []);

  const filteredPlans = useMemo(() => {
    if (planFilter === 'starter') {
      return plans.filter((p) => Number(p.investAmount) <= 700);
    }
    if (planFilter === 'popular') {
      return plans.filter((p) => Number(p.investAmount) > 700 && Number(p.investAmount) <= 2000);
    }
    if (planFilter === 'vip') {
      return plans.filter((p) => Number(p.investAmount) > 2000);
    }
    return plans;
  }, [plans, planFilter]);

  const renderPlanIcon = (iconName: string, className: string) => {
    switch (iconName) {
      case 'flame':
        return <Flame className={className} />;
      case 'rocket':
        return <Rocket className={className} />;
      case 'diamond':
        return <Diamond className={className} />;
      case 'crown':
        return <Crown className={className} />;
      case 'briefcase':
        return <Briefcase className={className} />;
      default:
        return <Flame className={className} />;
    }
  };

  const showHeroImage =
    branding.landing_show_hero_image !== 'false' && Boolean(branding.landing_hero_image?.trim());
  const showLiveTicker = branding.landing_show_live_ticker !== 'false';
  const showStats = branding.landing_show_stats !== 'false';
  const showAbout = branding.landing_show_about !== 'false';
  const showSteps = branding.landing_show_steps !== 'false';
  const showPlans = branding.landing_show_plans !== 'false';
  const showCalculator = branding.landing_show_calculator !== 'false';
  const showFaq = branding.landing_show_faq !== 'false';

  const faqs = [
    {
      q: 'Daily reward kab aur kaise milta hai?',
      a: `Jaise hi aapka plan activate hota hai, Day 1 ka reward foran (0 hours par) unlock ho jata hai! Uske baad har 24 ghante baad aap "My Plans" tab mein click kar ke apna fixed daily reward collect kar sakte hain.`,
    },
    {
      q: 'Referral bonus aur Team Salary kaise milti hai?',
      a: `Jab aap apne referral link se kisi dost ko invite karte hain aur woh koi bhi plan activate karta hai, aapko foran flat Rs. ${referralBonus} referral bonus milta hai. Iske ilawa active team banne par 6 levels tak extra Team Salary milti hai.`,
    },
    {
      q: 'EasyPaisa aur JazzCash mein withdrawal ki limit kya hai?',
      a: `Minimum withdrawal sirf Rs. ${minWithdraw} hai. Aap किसी bhi waqt apni rakam EasyPaisa ya JazzCash account mein withdraw kar sakte hain.`,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col pb-22 md:pb-0 selection:bg-emerald-500 selection:text-white overflow-x-hidden">
      {/* Smooth Mobile-First Sticky Top Navigation Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="w-full max-w-none mx-auto px-2.5 sm:px-6 lg:px-10 xl:px-14 h-14 sm:h-18 flex items-center justify-between gap-2">
          {/* Left: Website Logo, Name & Tagline */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-indigo-600 p-[2px] shadow-sm shadow-emerald-500/20 shrink-0">
              <div
                className={`w-full h-full rounded-[10px] sm:rounded-[14px] flex items-center justify-center overflow-hidden ${
                  isCustomImg ? 'bg-white' : `bg-gradient-to-br ${activePreset.gradient}`
                }`}
              >
                {isCustomImg && branding.site_logo_url ? (
                  <img
                    src={branding.site_logo_url}
                    alt={branding.site_name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  renderBrandPresetIcon(activePreset.key, 18, 'text-white')
                )}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h1 className="text-[13px] sm:text-lg font-black tracking-tight text-slate-900 truncate">
                  {branding.site_name}
                </h1>
                <span className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-extrabold uppercase tracking-wider shrink-0">
                  <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" /> Verified
                </span>
              </div>
              <p className="text-[10px] sm:text-xs font-semibold text-slate-500 truncate">
                {branding.site_tagline || branding.site_description}
              </p>
            </div>
          </div>

          {/* Right: Theme Studio Trigger + Login & Register Buttons */}
          <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
            <ThemeStudioTriggerButton />
            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="inline-flex items-center justify-center gap-1 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-[11px] sm:text-sm text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200/90 transition-transform active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <LogIn className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{branding.landing_login_btn_text || 'Login'}</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenAuth('register')}
              className="inline-flex items-center justify-center gap-1 px-2.5 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold text-[11px] sm:text-sm text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-sm shadow-emerald-600/25 transition-transform active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <UserPlus className="w-3.5 h-3.5 shrink-0" />
              <span>{branding.landing_register_btn_text || 'Register'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Referral Invite Banner if user clicked a referral link */}
      {hasReferralCode && (
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 text-white px-3 py-2 text-center text-[11px] sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <span className="truncate">
            Special Invite Code: <span className="underline font-black">{hasReferralCode}</span>
          </span>
          <button
            type="button"
            onClick={() => onOpenAuth('register')}
            className="ml-1 px-2.5 py-0.5 rounded-md bg-white text-emerald-700 font-black text-[10px] sm:text-xs hover:bg-emerald-50 transition-colors shrink-0 cursor-pointer"
          >
            Join Team
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Banner Section with Zero-Lag GPU Ambient Backdrop */}
        <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white pt-4 pb-8 sm:py-14 lg:py-16 px-3.5 sm:px-6 lg:px-8">
          {/* Static Ambient Glows (No CPU/GPU blur animation loop) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 12% 18%, rgba(16, 185, 129, 0.22) 0%, transparent 45%), radial-gradient(circle at 88% 35%, rgba(99, 102, 241, 0.18) 0%, transparent 45%)',
            }}
          />

          <div className="w-full max-w-none mx-auto px-1 sm:px-4 lg:px-6 relative z-10">
            {/* Live Payout & Activity Ticker Pill (Isolated Memo Component) */}
            {showLiveTicker && <LivePayoutTicker />}

            <div
              className={`grid grid-cols-1 ${
                showHeroImage ? 'lg:grid-cols-12' : 'lg:grid-cols-1 max-w-4xl mx-auto text-center'
              } gap-5 sm:gap-8 lg:gap-12 items-center`}
            >
              {/* Left Column: Text & CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className={showHeroImage ? 'lg:col-span-7 space-y-3.5 sm:space-y-5' : 'space-y-3.5 sm:space-y-5'}
              >
                {branding.landing_badge && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.08 }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[10px] sm:text-xs font-extrabold uppercase tracking-wider max-w-full ${
                      !showHeroImage ? 'mx-auto' : ''
                    }`}
                  >
                    <Zap className="w-3 h-3 text-amber-400 shrink-0" />
                    <span className="truncate">{branding.landing_badge}</span>
                  </motion.div>
                )}

                <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.2] sm:leading-[1.15] text-white">
                  {branding.landing_title || branding.site_name}
                </h2>

                <p className="text-xs sm:text-base text-emerald-300/95 font-semibold leading-relaxed">
                  {branding.site_description}
                </p>

                {showAbout && branding.landing_about && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="bg-white/6 border border-white/12 rounded-2xl p-3.5 sm:p-5 text-left backdrop-blur-xs"
                  >
                    <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] sm:text-xs font-black uppercase tracking-wider mb-1">
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>About {branding.site_name}</span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                      {branding.landing_about}
                    </p>
                  </motion.div>
                )}

                {/* Primary Hero CTA Buttons - Fitted 2-Col on Mobile */}
                <div
                  className={`grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5 sm:gap-3 pt-1 ${
                    !showHeroImage ? 'sm:justify-center' : ''
                  }`}
                >
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onOpenAuth('register')}
                    className="col-span-1 inline-flex items-center justify-center gap-1.5 px-4 sm:px-6 py-3 sm:py-3.5 rounded-2xl font-black text-xs sm:text-base text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                    <span className="truncate">{branding.landing_register_btn_text || 'Register Now'}</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onOpenAuth('login')}
                    className="col-span-1 inline-flex items-center justify-center gap-1.5 px-4 sm:px-6 py-3 sm:py-3.5 rounded-2xl font-bold text-xs sm:text-base text-white bg-white/10 hover:bg-white/15 border border-white/15 transition-all cursor-pointer"
                  >
                    <LogIn className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0" />
                    <span className="truncate">{branding.landing_login_btn_text || 'Login Account'}</span>
                  </motion.button>

                  {showPlans && (
                    <a
                      href="#earning-plans"
                      className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1 px-4 py-2.5 sm:py-3.5 rounded-xl font-bold text-xs sm:text-sm text-emerald-300 hover:text-white bg-white/5 sm:bg-transparent border border-white/10 sm:border-0 transition-colors"
                    >
                      <span>Explore {plans.length} Reward Packages</span>
                      <ChevronRight className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </motion.div>

              {/* Right Column: Animated Floating Hero Showcase Image */}
              {showHeroImage && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.45, delay: 0.1 }}
                  className="lg:col-span-5"
                >
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-white/15 shadow-2xl bg-slate-800 aspect-16/10 sm:aspect-4/3"
                  >
                    <img
                      src={branding.landing_hero_image}
                      alt={branding.site_name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent flex flex-col justify-end p-3 sm:p-5">
                      <div className="bg-slate-900/90 backdrop-blur-md border border-white/15 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
                            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] sm:text-xs font-black text-white truncate">
                              Instant Daily Reward System
                            </p>
                            <p className="text-[10px] sm:text-[11px] text-slate-300 truncate">
                              EasyPaisa & JazzCash Supported
                            </p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-emerald-500 text-white font-black text-[10px] sm:text-[11px] shrink-0">
                          24/7 Active
                        </span>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </div>

            {/* Optional Stats / Platform Highlights Strip - Staggered 2x2 Grid on Mobile */}
            {showStats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mt-6 sm:mt-10 pt-5 sm:pt-8 border-t border-white/10">
                {[
                  {
                    icon: <Clock className="w-4 h-4 sm:w-5 sm:h-5" />,
                    iconBg: 'bg-emerald-500/20 text-emerald-400',
                    title: 'Day 1 Instant',
                    sub:
                      freeRewardDays > 0
                        ? `${freeRewardDays} Day(s) Free Unlock`
                        : 'Daily Fixed Return',
                  },
                  {
                    icon: <Users className="w-4 h-4 sm:w-5 sm:h-5" />,
                    iconBg: 'bg-indigo-500/20 text-indigo-400',
                    title: `Rs. ${referralBonus} Bonus`,
                    sub: 'Per Active Invite',
                  },
                  {
                    icon: <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />,
                    iconBg: 'bg-amber-500/20 text-amber-400',
                    title: `Rs. ${minWithdraw} Min`,
                    sub: 'EasyPaisa & JazzCash',
                  },
                  {
                    icon: <Award className="w-4 h-4 sm:w-5 sm:h-5" />,
                    iconBg: 'bg-rose-500/20 text-rose-400',
                    title: '6 Team Levels',
                    sub: 'Team Salary Bonus',
                  },
                ].map((stat, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.06, duration: 0.3 }}
                    className="bg-white/6 border border-white/10 rounded-2xl p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3.5"
                  >
                    <div
                      className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl ${stat.iconBg} flex items-center justify-center shrink-0`}
                    >
                      {stat.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-lg font-black text-white truncate">
                        {stat.title}
                      </p>
                      <p className="text-[10px] sm:text-xs text-slate-400 truncate">{stat.sub}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Customizable 3-Step Guide Section */}
        {showSteps && (
          <section className="py-8 sm:py-14 px-3.5 sm:px-8 lg:px-12 xl:px-16 w-full max-w-none mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-5 sm:mb-10">
              <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                Simple 3-Step Process
              </span>
              <h3 className="text-xl sm:text-3xl font-black text-slate-900 mt-2">
                How You Earn on {branding.site_name}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Start earning daily rewards in minutes with fast local mobile withdrawals.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6">
              {[
                {
                  num: '01',
                  badgeCls: 'bg-emerald-50 text-emerald-600 border-emerald-100',
                  title: branding.landing_step1_title,
                  desc: branding.landing_step1_desc,
                },
                {
                  num: '02',
                  badgeCls: 'bg-indigo-50 text-indigo-600 border-indigo-100',
                  title: branding.landing_step2_title,
                  desc: branding.landing_step2_desc,
                },
                {
                  num: '03',
                  badgeCls: 'bg-amber-50 text-amber-600 border-amber-100',
                  title: branding.landing_step3_title,
                  desc: branding.landing_step3_desc,
                },
              ].map((step, i) => (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.35 }}
                  className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-xs flex md:block items-start gap-3.5"
                >
                  <div
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl ${step.badgeCls} flex items-center justify-center font-black text-sm sm:text-lg sm:mb-4 border shrink-0`}
                  >
                    {step.num}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm sm:text-lg font-black text-slate-900 mb-1">
                      {step.title}
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Live Investment / Reward Plans Showcase with Smooth Filter Tabs */}
        {(showPlans || showCalculator) && (
          <section
            id="earning-plans"
            className="py-8 sm:py-14 px-3.5 sm:px-8 lg:px-12 xl:px-16 bg-slate-100/70 border-y border-slate-200/80"
          >
            <div className="w-full max-w-none mx-auto space-y-5 sm:space-y-8">
              {showPlans && (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                    <div>
                      <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg">
                        Official Reward Packages
                      </span>
                      <h3 className="text-xl sm:text-3xl font-black text-slate-900 mt-2">
                        Choose Your Earning Plan ({plans.length})
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                        Compare package prices, daily fixed returns, and total user payouts.
                      </p>
                    </div>

                    {/* Smooth Animated Mobile Category Filter Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
                      {[
                        { key: 'all', label: `All (${plans.length})` },
                        { key: 'starter', label: 'Starter (≤700)' },
                        { key: 'popular', label: 'Popular' },
                        { key: 'vip', label: 'VIP High Return' },
                      ].map((tab) => {
                        const active = planFilter === tab.key;
                        return (
                          <button
                            key={tab.key}
                            type="button"
                            onClick={() => setPlanFilter(tab.key as any)}
                            className={`relative px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-colors cursor-pointer ${
                              active
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
                            }`}
                          >
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Animated Plans Grid - 2 Columns on Mobile, 3 on LG, 4 on XL, 5 on 2XL */}
                  <motion.div
                    layout
                    className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5 sm:gap-5"
                  >
                    <AnimatePresence mode="popLayout">
                      {filteredPlans.map((plan: any, index: number) => {
                        const theme =
                          PLAN_THEMES.find((t) => t.key === plan.themeKey) ||
                          PLAN_THEMES[index % PLAN_THEMES.length];
                        const gradientClasses = `${theme.from || 'from-emerald-500'} ${theme.to || 'to-teal-600'}`;
                        const totalDays = plan.totalDays || 30;
                        const thirtyDayReward =
                          plan.thirty_day_reward || plan.dailyReturn * totalDays;
                        const refBonusTotal = (plan.requiredReferrals || 0) * referralBonus;
                        const totalUserReward =
                          plan.user_total_reward || thirtyDayReward + refBonusTotal;
                        const planNum = plan.plan_number || index + 1;

                        return (
                          <motion.div
                            layout
                            key={plan.id || planNum}
                            initial={{ opacity: 0, scale: 0.95, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.92 }}
                            transition={{
                              type: 'spring',
                              stiffness: 280,
                              damping: 24,
                              delay: Math.min(index * 0.03, 0.2),
                            }}
                            whileHover={{ y: -4 }}
                            className="group bg-white rounded-2xl sm:rounded-[24px] border border-slate-200/90 shadow-xs hover:shadow-xl transition-shadow overflow-hidden flex flex-col justify-between relative"
                          >
                            <div>
                              {/* Premium Gradient Card Top Header (Fitted for 2-Col Mobile) */}
                              <div
                                className={`relative p-3 sm:p-5 bg-gradient-to-r ${gradientClasses} text-white overflow-hidden`}
                              >
                                <div className="absolute -right-6 -top-6 w-20 h-20 rounded-full bg-white/15 blur-xl pointer-events-none" />

                                <div className="relative z-10 flex items-center justify-between gap-1.5 mb-1.5 sm:mb-2">
                                  <div className="flex items-center gap-1 min-w-0">
                                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-black/25 backdrop-blur-md border border-white/20 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-white shrink-0">
                                      <Sparkles className="w-2.5 h-2.5 text-amber-300 shrink-0" />
                                      Plan #{planNum}
                                    </span>
                                    {plan.badge_tag && (
                                      <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black uppercase tracking-wider shadow-sm shrink-0">
                                        {plan.badge_tag}
                                      </span>
                                    )}
                                    {!plan.badge_tag && planNum >= 8 && (
                                      <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-white text-slate-900 text-[9px] font-black uppercase tracking-wider">
                                        VIP
                                      </span>
                                    )}
                                  </div>

                                  <div className="w-7 h-7 sm:w-11 sm:h-11 rounded-lg sm:rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-inner shrink-0">
                                    {renderPlanIcon(
                                      plan.icon || 'flame',
                                      'w-3.5 h-3.5 sm:w-5 sm:h-5 text-white drop-shadow-xs'
                                    )}
                                  </div>
                                </div>

                                <div className="relative z-10">
                                  <h4 className="text-xs sm:text-lg font-black tracking-tight text-white drop-shadow-xs truncate">
                                    {plan.name || `Plan ${planNum}`}
                                  </h4>
                                  <div className="mt-0.5 sm:mt-1 flex items-baseline flex-wrap gap-1">
                                    <span className="text-[9px] sm:text-[11px] font-extrabold uppercase tracking-wider text-white/90">
                                      Rs.
                                    </span>
                                    <span className="text-base sm:text-2xl font-black tracking-tight text-white drop-shadow-xs">
                                      {Number(plan.investAmount).toLocaleString()}
                                    </span>
                                    <span className="text-[9px] sm:text-[11px] font-bold text-white bg-black/20 px-1.5 py-0.5 rounded-md ml-auto sm:ml-1">
                                      {totalDays}d
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Desktop Quick Summary Strip (Hidden on narrow mobile 2-col to keep cards sleek) */}
                              <div className="hidden sm:block px-4 pt-3.5">
                                <div className="grid grid-cols-3 bg-slate-50 rounded-2xl py-2 px-2 border border-slate-200/70 text-center">
                                  <div>
                                    <p className="text-[9px] uppercase text-slate-400 font-extrabold tracking-wider">
                                      Invest
                                    </p>
                                    <p className="font-black text-xs text-slate-800 mt-0.5">
                                      Rs. {Number(plan.investAmount).toLocaleString()}
                                    </p>
                                  </div>
                                  <div className="border-x border-slate-200/80">
                                    <p className="text-[9px] uppercase text-slate-400 font-extrabold tracking-wider">
                                      Daily
                                    </p>
                                    <p className="font-black text-xs text-emerald-600 mt-0.5">
                                      Rs. {Number(plan.dailyReturn).toLocaleString()}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-[9px] uppercase text-slate-400 font-extrabold tracking-wider">
                                      Total
                                    </p>
                                    <p className="font-black text-xs text-indigo-600 mt-0.5">
                                      Rs. {Number(totalUserReward).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Card Detailed Specs (Compact on Mobile 2-Col, Spacious on Desktop) */}
                              <div className="p-2.5 sm:p-4 space-y-1.5 sm:space-y-2 text-[10px] sm:text-xs">
                                <div className="flex items-center justify-between py-0.5 sm:py-1 border-b border-slate-100">
                                  <span className="text-slate-500 font-semibold flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 hidden sm:inline" />
                                    <span>Daily</span>
                                  </span>
                                  <span className="font-black text-emerald-600">
                                    Rs. {Number(plan.dailyReturn).toLocaleString()}/d
                                  </span>
                                </div>
                                <div className="flex items-center justify-between py-0.5 sm:py-1 border-b border-slate-100">
                                  <span className="text-slate-500 font-semibold flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 hidden sm:inline" />
                                    <span>{totalDays}d Return</span>
                                  </span>
                                  <span className="font-extrabold text-slate-800">
                                    Rs. {Number(thirtyDayReward).toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between py-0.5 sm:py-1 border-b border-slate-100">
                                  <span className="text-slate-500 font-semibold flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-indigo-500 shrink-0 hidden sm:inline" />
                                    <span>Members</span>
                                  </span>
                                  <span className="font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                                    {plan.requiredReferrals} Req
                                  </span>
                                </div>
                                <div className="flex items-center justify-between py-0.5 sm:py-1 border-b border-slate-100">
                                  <span className="text-slate-500 font-semibold flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-amber-500 shrink-0 hidden sm:inline" />
                                    <span>Ref Bonus</span>
                                  </span>
                                  <span className="font-extrabold text-amber-600">
                                    +Rs. {Number(refBonusTotal).toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between bg-emerald-50/80 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-emerald-100 mt-1">
                                  <span className="text-slate-800 font-black text-[10px] sm:text-xs">
                                    Total
                                  </span>
                                  <span className="font-black text-xs sm:text-base text-emerald-700">
                                    Rs. {Number(totalUserReward).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="px-2.5 sm:px-4 pb-2.5 sm:pb-4">
                              <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => onOpenAuth('register')}
                                className={`w-full py-2 sm:py-2.5 px-2.5 sm:px-4 rounded-xl bg-gradient-to-r ${gradientClasses} hover:opacity-95 text-white font-black text-[11px] sm:text-xs flex items-center justify-center gap-1 sm:gap-1.5 shadow-sm transition-all cursor-pointer`}
                              >
                                <span className="truncate">Activate Plan</span>
                                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                              </motion.button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </motion.div>
                </>
              )}

              {/* Interactive Profit Calculator */}
              {showCalculator && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="pt-2 sm:pt-4"
                >
                  <ProfitCalculator />
                </motion.div>
              )}
            </div>
          </section>
        )}

        {/* Smooth Accordion FAQ Section for Mobile Visitors */}
        {showFaq && (
          <section className="py-8 sm:py-14 px-3.5 sm:px-8 lg:px-12 xl:px-16 w-full max-w-6xl mx-auto">
            <div className="text-center mb-5 sm:mb-8">
              <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-extrabold uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                <HelpCircle className="w-3.5 h-3.5" /> Quick Answers
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
                Frequently Asked Questions
              </h3>
            </div>

            <div className="space-y-2.5 sm:space-y-3">
              {faqs.map((item, idx) => {
                const isOpen = openFaqIdx === idx;
                return (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                      className="w-full px-4 py-3.5 text-left flex items-center justify-between gap-3 cursor-pointer"
                    >
                      <span className="text-xs sm:text-sm font-black text-slate-800">
                        {item.q}
                      </span>
                      <motion.div
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </motion.div>
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-3.5 pt-0.5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                            {item.a}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* Bottom CTA & Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 sm:py-10 px-4 sm:px-8 lg:px-12 xl:px-16 border-t border-slate-800">
        <div className="w-full max-w-none mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3">
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center overflow-hidden ${
                isCustomImg ? 'bg-white' : `bg-gradient-to-br ${activePreset.gradient}`
              }`}
            >
              {isCustomImg && branding.site_logo_url ? (
                <img
                  src={branding.site_logo_url}
                  alt={branding.site_name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                renderBrandPresetIcon(activePreset.key, 18, 'text-white')
              )}
            </div>
            <div>
              <p className="text-sm font-black text-white">{branding.site_name}</p>
              <p className="text-[11px] sm:text-xs text-slate-400">
                {branding.site_description} • © {new Date().getFullYear()} All rights reserved.
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={() => onOpenAuth('login')}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              {branding.landing_login_btn_text || 'Login'}
            </button>
            <button
              onClick={() => onOpenAuth('register')}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              {branding.landing_register_btn_text || 'Register Now'}
            </button>
          </div>
        </div>
      </footer>

      {/* Mobile Sticky Bottom Quick-Action Bar (Visible on Mobile Only) */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-lg border-t border-slate-200 px-3 py-2.5 shadow-[0_-8px_25px_rgba(0,0,0,0.08)]">
        <div className="grid grid-cols-2 gap-2.5 max-w-md mx-auto">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onOpenAuth('login')}
            className="py-2.5 px-4 rounded-xl font-bold text-xs text-slate-800 bg-slate-100 active:bg-slate-200 border border-slate-200/90 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogIn className="w-4 h-4 text-emerald-600" />
            <span>{branding.landing_login_btn_text || 'Login'}</span>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onOpenAuth('register')}
            className="py-2.5 px-4 rounded-xl font-black text-xs text-white bg-gradient-to-r from-emerald-600 to-teal-600 active:opacity-90 shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>{branding.landing_register_btn_text || 'Register Now'}</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
}
