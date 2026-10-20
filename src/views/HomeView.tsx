import React, { useState, useEffect } from 'react';
import { Download, ArrowRight, TrendingUp, Calendar, Users, Ticket, MessageCircle, Send, Upload, ExternalLink, Copy, Bell, BadgeDollarSign, Sparkles, Trash2, X, Check, Gift, Coins, CheckCircle, XCircle, UserPlus, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, broadcastChange } from '../lib/supabase';
import { useSiteBranding, BRAND_ICON_PRESETS, renderBrandPresetIcon } from '../lib/branding';
import { ThemeStudioTriggerButton } from '../components/ThemeFontStudioModal';
import { useTactileTheme } from '../context/TactileThemeContext';
import { fetchUserPromoBonusFromSettings } from '../lib/platformFeatures';
import dynamic from 'next/dynamic';

const TeamSalaryView = dynamic(() => import('./TeamSalaryView').then(m => m.TeamSalaryView), { ssr: false });
const PromoRedeemModal = dynamic(() => import('../components/PromoRedeemModal').then(m => m.PromoRedeemModal), { ssr: false });

export function HomeView({ onNavigateToTab }: { onNavigateToTab?: (tab: 'home' | 'ads' | 'packages' | 'invite' | 'profile' | 'my-plans', subView?: string) => void }) {
  const branding = useSiteBranding();
  const { rgbLightEnabled: rgbEnabled, toggleRgbLight: toggleRgb } = useTactileTheme();
  const activePreset = BRAND_ICON_PRESETS.find((p) => p.key === branding.site_icon_preset) || BRAND_ICON_PRESETS[0];
  const [showTeamSalary, setShowTeamSalary] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentUsername, setCurrentUsername] = useState('');
  const [promoEarnings, setPromoEarnings] = useState(0);

  // Cached instant balance initialization to eliminate 0-balance flicker on page open
  const [balance, setBalance] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('user_cached_balance');
        if (cached) return Number(cached) || 0;
      } catch (e) {}
    }
    return 0;
  });
  const [totalEarnings, setTotalEarnings] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('user_cached_total_earnings');
        if (cached) return Number(cached) || 0;
      } catch (e) {}
    }
    return 0;
  });
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [referralEarnings, setReferralEarnings] = useState(0);
  const [activePlan, setActivePlan] = useState<any>(null);
  const [appSettings, setAppSettings] = useState({
    marquee_text: 'Welcome to Earning Hub! Start investing today and earn daily profits. Invite friends to get 10% commission!',
    whatsapp_link: 'https://chat.whatsapp.com',
    telegram_link: 'https://t.me',
    show_whatsapp: 'true',
    show_telegram: 'true',
    restrict_multiple_accounts: 'true',
    referral_bonus: '50',
    promo_feature_enabled: 'false'
  });

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [clearing, setClearing] = useState(false);

  const fetchNotifications = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;
      const userId = userData.user.id;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30);

      if (!error && data) {
        setNotifications(data);
        const unreadCount = data.filter((n: any) => !n.is_read).length;
        setUnreadNotificationsCount(unreadCount);
      } else if (error) {
        console.warn('Notifications fetch error:', error);
      }
    } catch (e) {
      console.error('Failed to fetch notifications:', e);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;
      const userId = userData.user.id;

      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadIds);

      if (!error) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadNotificationsCount(0);
      }
    } catch (e) {
      console.error('Failed to mark all as read:', e);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (!error) {
        setNotifications(prev => prev.filter(n => n.id !== id));
        setUnreadNotificationsCount(prev => {
          const wasUnread = !notifications.find(n => n.id === id)?.is_read;
          return wasUnread ? Math.max(0, prev - 1) : prev;
        });
      }
    } catch (e) {
      console.error('Failed to delete notification:', e);
    }
  };

  const clearAllNotifications = async () => {
    if (notifications.length === 0) return;
    if (!confirm('Are you sure you want to clear all notifications?')) return;
    setClearing(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;
      const userId = userData.user.id;

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId);

      if (!error) {
        setNotifications([]);
        setUnreadNotificationsCount(0);
      }
    } catch (e) {
      console.error('Failed to clear notifications:', e);
    } finally {
      setClearing(false);
    }
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'withdrawal_approved':
        return (
          <div className="h-9 w-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
            <CheckCircle size={18} />
          </div>
        );
      case 'withdrawal_rejected':
        return (
          <div className="h-9 w-9 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
            <XCircle size={18} />
          </div>
        );
      case 'new_member':
        return (
          <div className="h-9 w-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <UserPlus size={18} />
          </div>
        );
      case 'member_active':
        return (
          <div className="h-9 w-9 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
            <Sparkles size={18} />
          </div>
        );
      case 'daily_reward':
        return (
          <div className="h-9 w-9 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
            <Gift size={18} />
          </div>
        );
      case 'referral_bonus':
        return (
          <div className="h-9 w-9 bg-yellow-50 text-yellow-600 rounded-xl flex items-center justify-center shrink-0">
            <Coins size={18} />
          </div>
        );
      default:
        return (
          <div className="h-9 w-9 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center shrink-0">
            <Bell size={18} />
          </div>
        );
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchBalance();
    fetchNotifications();

    // Set up real-time subscriptions for instant updates across the app
    const channel = supabase
      .channel('home-realtime-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_plans' },
        () => {
          fetchBalance();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'daily_rewards' },
        () => {
          fetchBalance();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          fetchBalance();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deposits' },
        () => {
          fetchBalance();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => {
          fetchNotifications();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_settings' },
        () => {
          fetchSettings();
        }
      )
      .on(
        'broadcast',
        { event: 'db_change' },
        (payload) => {
          console.log('Home received real-time broadcast sync:', payload);
          fetchBalance();
          fetchSettings();
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await supabase.from('app_settings').select('*');
      if (data && data.length > 0) {
        const settingsMap: any = {};
        data.forEach(s => { settingsMap[s.setting_key] = s.setting_value; });
        setAppSettings(prev => ({ ...prev, ...settingsMap }));
      }
    } catch (e) {
      console.error('Failed to fetch settings:', e);
    }
  };

  const fetchBalance = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;
      
      const userId = userData.user.id;
      setCurrentUserId(userId);
      
      // Fetch active plan
      const { data: userPlans } = await supabase
        .from('user_plans')
        .select('*, plans(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (userPlans && userPlans.length > 0) {
        setActivePlan(userPlans[0]);
      }
      
      // Calculate from collected daily rewards
      const { data: profile } = await supabase
        .from('profiles')
        .select('balance, referral_code, username')
        .eq('id', userId)
        .single();

      if (profile?.username) {
        setCurrentUsername(profile.username);
      }

      // Fix: Get all user plan IDs to query rewards
      const { data: allUserPlans } = await supabase
        .from('user_plans')
        .select('id')
        .eq('user_id', userId);
      
      const userPlanIds = allUserPlans?.map(up => up.id) || [];

      const { data: rewards } = await supabase
        .from('daily_rewards')
        .select('reward_amount, collected_at')
        .in('user_plan_id', userPlanIds)
        .eq('status', 'collected');
        
      let totalRewards = 0;
      let todayRewards = 0;
      if (rewards && rewards.length > 0) {
        totalRewards = rewards.reduce((sum, r) => sum + Number(r.reward_amount), 0);
        
        const todayStr = new Date().toISOString().split('T')[0];
        todayRewards = rewards.filter((r: any) => r.collected_at?.startsWith(todayStr)).reduce((sum, r) => sum + Number(r.reward_amount), 0);
      }
      
      // Calculate from referral_collections table (Real money actually added to balance)
      let totalReferralBonus = 0;
      const { data: refCols } = await supabase
        .from('referral_collections')
        .select('amount')
        .eq('referrer_id', userId);
      
      if (refCols) {
        totalReferralBonus = refCols.reduce((sum, rc) => sum + Number(rc.amount), 0);
      }
      
      // Calculate from weekly_salary_collections
      let totalSalary = 0;
      const { data: salCols } = await supabase
        .from('weekly_salary_collections')
        .select('amount')
        .eq('user_id', userId);
        
      if (salCols) {
        totalSalary = salCols.reduce((sum, sc) => sum + Number(sc.amount), 0);
      }

      // Calculate from withdrawals (approved and pending)
      let totalWithdrawals = 0;
      const { data: withdrawalData } = await supabase
        .from('withdrawals')
        .select('amount')
        .eq('user_id', userId)
        .in('status', ['approved', 'pending']);
      
      if (withdrawalData) {
        totalWithdrawals = withdrawalData.reduce((sum, w) => sum + Number(w.amount), 0);
      }

      // Calculate from Promo / Gift Code redemptions
      const totalPromoBonus = await fetchUserPromoBonusFromSettings(userId);
      setPromoEarnings(totalPromoBonus);

      // Compute the actual balance: Daily Rewards + Salaries + Promo Codes - Withdrawals
      const realBalance = Math.max(0, totalRewards + totalSalary + totalPromoBonus - totalWithdrawals);
      
      const computedTotal = totalRewards + totalReferralBonus + totalSalary + totalPromoBonus;
      setTotalEarnings(computedTotal);
      setTodayEarnings(todayRewards);
      setReferralEarnings(totalReferralBonus);
      setBalance(realBalance);

      try {
        localStorage.setItem('user_cached_balance', String(realBalance));
        localStorage.setItem('user_cached_total_earnings', String(computedTotal));
      } catch (e) {}

      // Self-heal: Update profiles.balance in database if it is out of sync/polluted
      const currentDbBalance = Number(profile?.balance || 0);
      if (currentDbBalance !== realBalance) {
        await supabase
          .from('profiles')
          .update({ balance: realBalance })
          .eq('id', userId);
        await broadcastChange('profiles', 'update', { id: userId, balance: realBalance });
      }
    } catch (e) {
      console.error('Error fetching balance:', e);
    }
  };

  if (showTeamSalary) {
    return <TeamSalaryView onBack={() => setShowTeamSalary(false)} />;
  }

  return (
    <>
      <div className="p-3.5 sm:p-4 space-y-4 pb-20">
      {/* Header */}
      <div className="flex justify-between items-center gap-2 pt-1">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-green-400 via-orange-400 to-purple-500 p-[2px] shadow-sm shrink-0">
            <div 
              suppressHydrationWarning
              className={`w-full h-full rounded-full flex items-center justify-center overflow-hidden ${branding.site_icon_preset === 'custom_image' ? 'bg-white' : `bg-gradient-to-br ${activePreset.gradient}`}`}
            >
              {branding.site_icon_preset === 'custom_image' && branding.site_logo_url ? (
                <img
                  src={branding.site_logo_url}
                  alt={branding.site_name || 'Earning Hub'}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = 'https://ik.imagekit.io/19imy4f1u/lite_1783801856823_8COA8zmhu.webp';
                  }}
                  className="w-full h-full object-cover"
                />
              ) : (
                renderBrandPresetIcon(branding.site_icon_preset, 20, 'text-white')
              )}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-xl font-bold text-slate-800 leading-tight truncate">{branding.site_name}</h2>
            <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5">
              <p className="text-[11px] sm:text-xs text-slate-500 truncate max-w-[140px] sm:max-w-xs">{branding.site_description}</p>
              {activePlan ? (
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold border border-emerald-200 shrink-0">
                  {activePlan.plans?.name || 'Active'}
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200 shrink-0">
                  Free
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <ThemeStudioTriggerButton />
          <button
            type="button"
            onClick={() => window.location.reload()}
            title="Refresh Page"
            className="md:hidden w-9 h-9 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200/80 flex items-center justify-center transition-transform active:scale-95 cursor-pointer"
          >
            <RefreshCw size={16} />
          </button>
          <button
            type="button"
            onClick={() => {
              setShowNotificationsModal(true);
              markAllAsRead();
            }}
            className="relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-slate-700 hover:bg-slate-100 rounded-xl transition-transform active:scale-95 cursor-pointer"
          >
            <Bell size={20} strokeWidth={1.8} />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[9px] font-extrabold border border-white">
                {unreadNotificationsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Dark Banner Placeholder */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="w-full h-14 bg-[#0B0A10] rounded-[20px] shadow-sm border border-purple-500/30 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500"></div>
        <div className="absolute inset-0 flex items-center overflow-hidden pt-1">
          <div className="flex w-max animate-marquee text-white items-center gap-8 px-4 whitespace-nowrap">
            <div className="flex items-center gap-2">
              <span className="text-orange-400">✨</span>
              <span className="text-sm font-medium tracking-wide">{appSettings.marquee_text}</span>
            </div>
            <div className="flex items-center gap-2" aria-hidden="true">
              <span className="text-orange-400 ml-4">✨</span>
              <span className="text-sm font-medium tracking-wide">{appSettings.marquee_text}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* RGB Lighting Toggle Option */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#ff0055] via-[#00ffcc] to-[#ffcc00] p-[1.5px] shadow-sm flex items-center justify-center">
            <div className="w-full h-full bg-slate-50 rounded-[14px] flex items-center justify-center">
              <Sparkles className="text-emerald-500" size={18} />
            </div>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">RGB Border Lighting</p>
            <p className="text-[11px] text-slate-500 font-semibold leading-normal">Glow premium animated neon borders</p>
          </div>
        </div>
        <button 
          onClick={toggleRgb}
          aria-label="Toggle RGB border lighting"
          className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-300 focus:outline-none relative ${rgbEnabled ? 'bg-[#0F7A50]' : 'bg-slate-200'}`}
        >
          <motion.div 
            layout
            className="bg-white w-5 h-5 rounded-full shadow-md"
            animate={{ x: rgbEnabled ? 24 : 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        </button>
      </motion.div>

      {/* Main Responsive Grid Layout for Desktop vs Mobile */}
      {(() => {
        const showWhatsapp = appSettings.show_whatsapp !== 'false';
        const showTelegram = appSettings.show_telegram !== 'false';
        const showCommunityColumn = showWhatsapp || showTelegram;

        return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (Primary actions & statistics) */}
        <div className={`${showCommunityColumn ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-4`}>
          {/* Total Balance Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rgb-container shadow-lg"
          >
            <div className="bg-[#0F7A50] rounded-[22px] p-5 w-full h-full relative overflow-hidden">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-emerald-50/80 text-xs font-semibold tracking-wide uppercase">Current Balance</p>
                <div className="group relative z-20">
                  <div className="text-emerald-50/60 hover:text-white cursor-pointer transition-colors bg-white/10 rounded-full p-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                  </div>
                  <div className="absolute top-full left-0 mt-2 w-56 p-3 bg-slate-900 text-white text-[11px] rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 text-left shadow-xl leading-relaxed border border-white/10">
                    <p className="font-semibold text-emerald-400 mb-1">Available Balance vs Total Earnings</p>
                    <p className="mb-2"><strong className="text-white">Available Balance:</strong> The actual amount currently in your account that you can withdraw. It increases when you collect daily rewards and decreases when you withdraw.</p>
                    <p><strong className="text-white">Total Earnings:</strong> The total lifetime amount you've earned from all sources (Daily Rewards, Salary, Referral Commissions), regardless of withdrawals.</p>
                    <div className="w-3 h-3 bg-slate-900 border-l border-t border-white/10 rotate-45 absolute -top-1.5 left-3"></div>
                  </div>
                </div>
              </div>
              <h1 className="text-4xl font-black text-white tracking-tight mb-5">
                PKR {balance.toLocaleString()}
              </h1>
              
              <motion.button 
                onClick={() => onNavigateToTab?.('profile', 'withdraw')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-white/20 hover:bg-white/30 text-white font-medium py-3 rounded-2xl flex items-center justify-center gap-2 transition-colors border border-white/10"
              >
                <Download size={18} />
                Withdraw
              </motion.button>
            </div>
          </motion.div>

          {/* Team Salary System */}
          <motion.div 
            onClick={() => setShowTeamSalary(true)}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="rgb-container shadow-lg cursor-pointer group"
          >
            <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 rounded-[22px] p-5 flex items-center justify-between w-full h-full">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20">
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-white/20 border border-white/30 text-[10px] uppercase font-bold text-white rounded-md flex items-center gap-1">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                      NEW
                    </span>
                  </div>
                  <h3 className="text-white font-bold text-lg leading-tight">Team Salary System</h3>
                  <p className="text-white/80 text-[11px] font-medium mt-0.5">Earn up to PKR 13,000 every week</p>
                </div>
              </div>
              <ArrowRight className="text-white opacity-80 group-hover:opacity-100 group-hover:translate-x-1 transition-all" size={20} />
            </div>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Total Earnings */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rgb-container shadow-sm"
            >
              <div className="bg-white/95 backdrop-blur-md rounded-[22px] p-4 w-full h-full flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-slate-500 mb-3">
                  <TrendingUp size={16} strokeWidth={2} />
                  <span className="text-xs font-medium">Total Earnings</span>
                  <div className="group relative ml-auto">
                    <div className="text-slate-400 hover:text-slate-600 cursor-pointer transition-colors bg-slate-100 rounded-full p-0.5">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                    </div>
                    <div className="absolute bottom-full right-0 mb-2 w-48 p-2.5 bg-slate-900 text-white text-[10px] rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 text-center shadow-xl leading-relaxed">
                      <p className="font-semibold text-emerald-400 mb-1">Total Earnings</p>
                      <p>This includes all your daily rewards, team salary, and referral commissions combined.</p>
                      <div className="w-2 h-2 bg-slate-900 rotate-45 absolute -bottom-1 right-2"></div>
                    </div>
                  </div>
                </div>
                <p className="text-xl font-bold text-slate-800">PKR {totalEarnings.toLocaleString()}</p>
              </div>
            </motion.div>

            {/* Today Task Earning */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="rgb-container shadow-sm"
            >
              <div className="bg-white/95 backdrop-blur-md rounded-[22px] p-4 w-full h-full flex flex-col justify-between">
                <div className="flex items-center gap-2 text-slate-500 mb-3">
                  <Calendar size={16} strokeWidth={2} />
                  <span className="text-xs font-medium">Today Task Earning</span>
                </div>
                <p className="text-xl font-bold text-slate-800">PKR {todayEarnings.toLocaleString()}</p>
              </div>
            </motion.div>

            {/* Referral */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rgb-container shadow-sm"
            >
              <div className="bg-white/95 backdrop-blur-md rounded-[22px] p-4 w-full h-full flex flex-col justify-between">
                <div className="flex items-center gap-2 text-slate-500 mb-3">
                  <Users size={16} strokeWidth={2} />
                  <span className="text-xs font-medium">Referral</span>
                </div>
                <p className="text-xl font-bold text-slate-800">PKR {referralEarnings.toLocaleString()}</p>
              </div>
            </motion.div>

            {/* Promo Code */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="rgb-container shadow-sm"
            >
              <div className="bg-white/95 backdrop-blur-md rounded-[22px] p-4 w-full h-full flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2 text-slate-500 mb-2">
                  <div className="flex items-center gap-1.5">
                    <Ticket size={16} strokeWidth={2} />
                    <span className="text-xs font-medium">Promo Code</span>
                  </div>
                  {appSettings.promo_feature_enabled === 'true' ? (
                    promoEarnings > 0 && (
                      <span className="text-[10px] font-mono font-bold text-emerald-600 tabular-nums">
                        +Rs {promoEarnings}
                      </span>
                    )
                  ) : (
                    <span className="bg-slate-100 text-slate-500 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                      Coming Soon
                    </span>
                  )}
                </div>
                {appSettings.promo_feature_enabled === 'true' ? (
                  <button
                    type="button"
                    onClick={() => setShowPromoModal(true)}
                    className="w-full bg-[#0F7A50] hover:bg-[#0c6140] text-white text-xs font-bold py-2.5 rounded-xl transition-colors cursor-pointer active:scale-95"
                  >
                    Claim Promo Code
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="w-full bg-slate-100 text-slate-400 text-xs font-semibold py-2.5 rounded-xl cursor-not-allowed"
                  >
                    Claim Promo Code
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Right Column (Community channels & Info) */}
        {showCommunityColumn && (
          <div className="lg:col-span-5 space-y-4">
            {/* WhatsApp Banner */}
            {showWhatsapp && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="rgb-container shadow-md"
              >
                <div className="bg-[#138E46] rounded-[22px] p-5 w-full h-full text-white">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <MessageCircle size={20} fill="currentColor" />
                    </div>
                    <h3 className="font-bold text-lg">Join WhatsApp Channel</h3>
                  </div>
                  
                  <div className="flex gap-3 mb-4">
                    <motion.a 
                      href={appSettings.whatsapp_link || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 bg-white text-[#138E46] py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 shadow-sm"
                    >
                      <ExternalLink size={16} />
                      Join Channel
                    </motion.a>
                    <motion.button 
                      onClick={() => {
                        navigator.clipboard.writeText(appSettings.whatsapp_link || '');
                        alert('WhatsApp link copied!');
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 bg-[#e0f0e6] text-[#138E46] py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Copy size={16} />
                      Copy Link
                    </motion.button>
                  </div>

                  <p className="text-center text-sm font-medium leading-relaxed font-arabic" dir="rtl">
                    ہمارے واٹس ایپ چینل میں شامل ہوں، آپ کا فری پیکیج فعال ہو جائے گا
                  </p>
                </div>
              </motion.div>
            )}

            {/* Telegram Banner */}
            {showTelegram && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="rgb-container shadow-md"
              >
                <div className="bg-[#28A0D9] rounded-[22px] p-5 w-full h-full text-white">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <Send size={24} fill="currentColor" />
                    </div>
                    <div>
                      <span className="px-2 py-0.5 bg-white/20 border border-white/30 text-[10px] uppercase font-bold text-white rounded-md flex items-center gap-1 w-max mb-1">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                        FREE 50 PKR
                      </span>
                      <h3 className="font-bold text-lg">Telegram Reward</h3>
                    </div>
                  </div>

                  <p className="text-center text-sm font-medium leading-relaxed mb-5 font-arabic" dir="rtl">
                    سب کے لیے ایک اور 50 روپے کا گفٹ جلدی سے ہمارا یہ ٹیلیگرام چینل جوائن کریں اور سکرین شاٹ ایچ کریں اور 50 روپے ایک منٹ کے اندر مفت حاصل کریں
                  </p>
                  
                  <div className="space-y-3">
                    <motion.a 
                      href={appSettings.telegram_link || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full bg-white text-[#28A0D9] py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Send size={18} />
                      Join Telegram Channel
                    </motion.a>
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full bg-white/20 hover:bg-white/30 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm border border-white/20 transition-colors"
                    >
                      <Upload size={18} />
                      Upload Screenshot
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}

      </div>
        );
      })()}
      
      <div className="py-8 flex flex-col items-center justify-center border-t border-slate-100">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">
          Official Premium Platform
        </p>
        <p className="text-[12px] font-black text-[#0F7A50] uppercase tracking-tighter">
          Powered by Saqib
        </p>
      </div>
      
      <div className="h-4"></div> {/* Bottom Spacer */}
    </div>

    <AnimatePresence>
      {showNotificationsModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 50 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] border border-slate-100"
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold">
                  <Bell size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Alerts & Notifications</h3>
                  <p className="text-[10px] text-slate-500">Aap ke notifications aur updates</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={clearAllNotifications}
                    disabled={clearing}
                    className="text-xs text-rose-500 hover:text-rose-600 font-bold px-2.5 py-1.5 rounded-lg hover:bg-rose-50 transition-colors flex items-center gap-1"
                  >
                    <Trash2 size={13} />
                    Clear All
                  </motion.button>
                )}
                <button 
                  onClick={() => setShowNotificationsModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-3 min-h-[250px] max-h-[50vh]">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 text-2xl mb-4 border border-dashed border-slate-200">
                    📭
                  </div>
                  <h4 className="font-bold text-slate-700 text-sm">No Notifications Yet</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
                    Jab aap reward collect karenge ya referral join hoga tou yahan notification show ho ga.
                  </p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div 
                    key={notif.id}
                    className={`p-4 rounded-2xl border transition-all flex items-start gap-3 relative group ${
                      !notif.is_read 
                        ? 'bg-indigo-50/40 border-indigo-100/80 shadow-sm' 
                        : 'bg-white border-slate-100/80'
                    }`}
                  >
                    {getNotificationIcon(notif.type)}
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-800 text-xs sm:text-sm">{notif.title}</span>
                        <span className="text-[10px] text-slate-400 font-medium shrink-0">
                          {getRelativeTime(notif.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{notif.message}</p>
                    </div>

                    {/* Unread Glowing Dot - 'Lal Cheese' */}
                    {!notif.is_read && (
                      <span className="absolute top-4 right-10 w-2 h-2 bg-rose-500 rounded-full shadow-lg shadow-rose-500 animate-pulse" />
                    )}

                    {/* Delete single button */}
                    <button
                      onClick={() => deleteNotification(notif.id)}
                      className="absolute right-3 top-3.5 p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-400">
              <span>Total: {notifications.length} notifications</span>
              <button
                onClick={() => setShowNotificationsModal(false)}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-2 rounded-xl shadow-sm transition-all text-xs"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    <PromoRedeemModal
      isOpen={showPromoModal}
      onClose={() => setShowPromoModal(false)}
      userId={currentUserId}
      username={currentUsername}
      hasActivePlan={!!activePlan}
      onSuccessRedeem={() => {
        fetchBalance();
        fetchNotifications();
      }}
    />
  </>
  );
}
