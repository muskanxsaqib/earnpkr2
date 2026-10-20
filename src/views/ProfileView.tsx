import React, { useState, useEffect } from 'react';
import { Download, ArrowUpRight, Wallet, KeyRound, Mail, LogOut, ChevronRight, ArrowLeft, Inbox, User, Share2, Copy, CheckCircle2, Clock, MessageSquare, Palette, Ticket } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, broadcastChange } from '../lib/supabase';
import { secureApiCall } from '../lib/api';
const AdminView = React.lazy(() => import('./AdminView').then(m => ({ default: m.AdminView })));
import { AdminSecurityGate } from '../components/AdminSecurityGate';
import { ThemeStudioTriggerButton, ThemeFontStudioModal } from '../components/ThemeFontStudioModal';
import { PromoRedeemModal } from '../components/PromoRedeemModal';
import {
  fetchUserPromoBonusFromSettings,
  parseWithdrawalRuleConfig,
  calculateWithdrawalBreakdown,
  checkWithdrawalScheduleOpen,
  WithdrawalRuleConfig,
} from '../lib/platformFeatures';
import { useTactileTheme } from '../context/TactileThemeContext';
import { APP_THEMES_CATALOG } from '../types/themeCatalog';
import { APP_FONT_PACKS } from '../types/fontCatalog';

type SubView = 'main' | 'withdraw' | 'withdrawal_history' | 'deposit_history' | 'balance_history' | 'change_password' | 'recovery_email' | 'admin' | 'feedback' | 'admin_messages';

export function ProfileView({ onLogout, initialSubView = 'main' }: { onLogout?: () => void; initialSubView?: SubView }) {
  const [currentView, setCurrentView] = useState<SubView>(initialSubView);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showThemeStudio, setShowThemeStudio] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [promoFeatureEnabled, setPromoFeatureEnabled] = useState(false);
  const [hasActivePlan, setHasActivePlan] = useState(false);
  const { theme, font, soundEnabled, allowUserThemeSwitcher } = useTactileTheme();
  const activeThemeItem = APP_THEMES_CATALOG.find((t) => t.id === theme) || APP_THEMES_CATALOG[0];
  const activeFontItem = APP_FONT_PACKS.find((f) => f.id === font) || APP_FONT_PACKS[0];
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [adminMessagesCount, setAdminMessagesCount] = useState<number>(0);

  useEffect(() => {
    if (initialSubView) {
      setCurrentView(initialSubView);
    }
  }, [initialSubView]);

  useEffect(() => {
    if (!profile?.id) return;

    const fetchMessagesCount = async () => {
      try {
        const { count, error } = await supabase
          .from('admin_messages')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile.id)
          .eq('is_broadcast', false)
          .eq('is_read', false);

        if (!error && count !== null) {
          setAdminMessagesCount(count);
        }
      } catch (err) {
        console.error('Error fetching admin messages count:', err);
      }
    };

    fetchMessagesCount();

    const channel = supabase
      .channel('profile-admin-messages-count-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_messages', filter: `user_id=eq.${profile.id}` },
        () => {
          fetchMessagesCount();
        }
      )
      .on(
        'broadcast',
        { event: 'db_change' },
        (payload) => {
          if (payload && payload.payload) {
            const { table, data } = payload.payload;
            if (table === 'admin_messages' && (data?.user_id === profile.id || data?.is_broadcast)) {
              fetchMessagesCount();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (user) {
          let resolvedProfile: any = null;

          // 1. Primary: Fetch through secure backend route (bypasses RLS recursion)
          if (session?.access_token) {
            try {
              const res = await fetch('/api/user/profile', {
                headers: { Authorization: `Bearer ${session.access_token}` },
              });
              if (res.ok) {
                const json = await res.json().catch(() => null);
                if (json?.ok && json.profile) {
                  resolvedProfile = json.profile;
                }
              }
            } catch (apiErr) {
              console.warn('API profile fetch error:', apiErr);
            }
          }

          // 2. Secondary fallback: Direct Supabase client query
          if (!resolvedProfile) {
            const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
            if (data) {
              resolvedProfile = data;
            }
          }

          // 3. Fallback: Clean user metadata (never append random suffixes like _ujdn_3)
          if (!resolvedProfile) {
            const cleanUsername = user.user_metadata?.username || user.email?.split('@')[0] || 'user';
            resolvedProfile = {
              id: user.id,
              username: cleanUsername,
              email: user.email || '',
              phone: user.user_metadata?.phone || '',
              referral_code: user.user_metadata?.referral_code || '61E81A',
              role: ['saqibsaqqibsaqib@gmail.com', 'saqib242saqib@gmail.com'].includes(user.email || '') ? 'admin' : 'user',
              balance: 0,
            };
          }

          setProfile(resolvedProfile);
          const { count: planCount } = await supabase
            .from('user_plans')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .in('status', ['active', 'completed']);
          setHasActivePlan((planCount || 0) > 0);

          const { data: promoSetting } = await supabase
            .from('app_settings')
            .select('setting_value')
            .eq('setting_key', 'promo_feature_enabled')
            .maybeSingle();
          setPromoFeatureEnabled(promoSetting?.setting_value === 'true');
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();

    // Setup real-time subscriptions for profile details
    const channel = supabase
      .channel('profile-realtime-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          fetchProfile();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_plans' },
        () => {
          fetchProfile();
        }
      )
      .on(
        'broadcast',
        { event: 'db_change' },
        (payload) => {
          console.log('Profile view received real-time broadcast sync:', payload);
          fetchProfile();
        }
      )
      .subscribe();

    // Setup background auto-polling every 60 seconds as fallback
    const intervalId = setInterval(fetchProfile, 600000); // Refresh every 10 minutes

    return () => {
      clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, []);

  if (currentView === 'withdraw') return <WithdrawView onBack={() => setCurrentView('main')} profile={profile} />;
  if (currentView === 'withdrawal_history') return <HistoryView title="Withdrawal History" type="withdrawal_history" emptyText="No withdrawals yet" onBack={() => setCurrentView('main')} />;
  if (currentView === 'deposit_history') return <HistoryView title="Deposit History" type="deposit_history" emptyText="No deposits yet" onBack={() => setCurrentView('main')} />;
  if (currentView === 'balance_history') return <HistoryView title="Balance History" type="balance_history" emptyText="No balance history yet" onBack={() => setCurrentView('main')} />;
  if (currentView === 'change_password') return <ChangePasswordView onBack={() => setCurrentView('main')} />;
  if (currentView === 'recovery_email') return <RecoveryEmailView onBack={() => setCurrentView('main')} />;
  if (currentView === 'feedback') return <FeedbackView onBack={() => setCurrentView('main')} profile={profile} />;
  if (currentView === 'admin_messages') return <AdminMessagesView onBack={() => setCurrentView('main')} profile={profile} onMessagesRead={() => setAdminMessagesCount(0)} />;
  if (currentView === 'admin') return (
    <div className="relative">
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
        <button 
          onClick={() => {
            setCurrentView('main');
            setIsAdminUnlocked(false);
            sessionStorage.removeItem('admin_gate_unlocked');
          }} 
          className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
        >
          <ArrowLeft size={20} />
        </button>
        <span className="font-semibold text-slate-800">Back to Profile</span>
      </div>
      <div className="pt-14">
        {isAdminUnlocked ? (
          <React.Suspense fallback={
            <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 bg-slate-50">
              <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
              <p className="text-sm font-semibold text-slate-600">Loading Secure Dashboard Components...</p>
              <p className="text-xs text-slate-400 mt-1">Fetching authorized administrator resources...</p>
            </div>
          }>
            <AdminView />
          </React.Suspense>
        ) : (
          <AdminSecurityGate onUnlock={() => setIsAdminUnlocked(true)} />
        )}
      </div>
    </div>
  );

  return (
    <>
    <motion.div 
      initial={{ opacity: 0, y: 15, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="p-4 space-y-4 pb-12 bg-slate-50 min-h-full"
    >
      <div className="pt-1 mb-2 flex justify-between items-center gap-2">
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Profile</h2>
        <div className="flex items-center gap-2">
          <ThemeStudioTriggerButton />
          <div className="flex items-center gap-1.5 bg-emerald-50 text-[#0F7A50] border border-emerald-100 px-2.5 py-1 rounded-full text-[11px] font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Auto Update Active
          </div>
        </div>
      </div>

      {/* User Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rgb-container shadow-md"
      >
        <div className="bg-white rounded-[22px] p-4 flex items-center justify-between w-full h-full relative overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#0F7A50] rounded-full flex items-center justify-center shrink-0">
               <User size={30} className="text-white" strokeWidth={1.5} />
            </div>
            <div className="overflow-hidden">
              {loading ? (
                <div className="h-4 bg-slate-200 rounded w-24 mb-2 animate-pulse"></div>
              ) : (
                <h3 className="text-base font-bold text-slate-800 truncate">{profile?.username || 'User'}</h3>
              )}
              
              {loading ? (
                <div className="h-3 bg-slate-200 rounded w-32 mb-2 animate-pulse"></div>
              ) : (
                <p className="text-[13px] text-slate-500 truncate mb-1.5">{profile?.email || 'Loading...'}</p>
              )}
              
              <div className="flex items-center gap-2">
                 <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Ref Code:</span>
                 {loading ? (
                   <div className="h-4 bg-slate-200 rounded w-12 animate-pulse"></div>
                 ) : (
                   <span className="text-[13px] font-bold text-[#0F7A50] bg-[#e8f3ef] px-2 py-0.5 rounded-md">{profile?.referral_code || '---'}</span>
                 )}
              </div>
            </div>
          </div>
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowShareModal(true)}
            className="w-10 h-10 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center text-slate-600 hover:text-[#0F7A50] hover:bg-[#e8f3ef] transition-colors"
          >
            <Share2 size={18} />
          </motion.button>
        </div>
      </motion.div>

      {/* Withdraw Button */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rgb-container shadow-sm cursor-pointer"
      >
        <button 
          onClick={() => setCurrentView('withdraw')}
          className="w-full bg-white rounded-[22px] p-4 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <Download size={20} className="text-[#0F7A50]" strokeWidth={2} />
            <span className="font-semibold text-slate-800 text-[15px]">Withdraw</span>
          </div>
          <ChevronRight size={18} className="text-slate-400" />
        </button>
      </motion.div>

      {/* Admin Button */}
      {profile?.role === 'admin' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="rgb-container shadow-sm cursor-pointer"
        >
          <button 
            onClick={() => setCurrentView('admin')}
            className="w-full bg-indigo-50 rounded-[22px] p-4 flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-3">
              <User size={20} className="text-indigo-600" strokeWidth={2} />
              <span className="font-semibold text-indigo-900 text-[15px]">Admin Dashboard</span>
            </div>
            <ChevronRight size={18} className="text-indigo-400" />
          </button>
        </motion.div>
      )}

      {/* Theme, Fonts & Tactile Sound Studio Card */}
      {allowUserThemeSwitcher && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.19 }}
          className="rgb-container shadow-sm cursor-pointer"
        >
          <button
            type="button"
            onClick={() => setShowThemeStudio(true)}
            className="w-full bg-white rounded-[22px] p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center shrink-0">
                <Palette size={20} className="text-emerald-600" />
              </div>
              <div className="min-w-0">
                <span className="font-semibold text-slate-800 text-[15px] block truncate">
                  Theme, Fonts &amp; Sound Studio
                </span>
                <span className="text-[11px] font-medium text-slate-500 block truncate">
                  {activeThemeItem.shortLabel} · {activeFontItem.shortLabel} · {soundEnabled ? 'Sound ON' : 'Muted'}
                </span>
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-400 shrink-0" />
          </button>
        </motion.div>
      )}
      <ThemeFontStudioModal isOpen={showThemeStudio} onClose={() => setShowThemeStudio(false)} />

      {/* Redeem Promo / Gift Code Card (Only visible when enabled by Admin) */}
      {promoFeatureEnabled && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.195 }}
          className="rgb-container shadow-sm cursor-pointer"
        >
          <button
            type="button"
            onClick={() => setShowPromoModal(true)}
            className="w-full bg-white rounded-[22px] p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center shrink-0">
                <Ticket size={20} className="text-amber-600" />
              </div>
              <div className="min-w-0">
                <span className="font-semibold text-slate-800 text-[15px] block truncate">
                  Redeem Promo / Gift Code
                </span>
                <span className="text-[11px] font-medium text-slate-500 block truncate">
                  Enter voucher code to claim instant PKR bonus
                </span>
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-400 shrink-0" />
          </button>
        </motion.div>
      )}

      <PromoRedeemModal
        isOpen={showPromoModal}
        onClose={() => setShowPromoModal(false)}
        userId={profile?.id || ''}
        username={profile?.username}
        hasActivePlan={hasActivePlan}
        onSuccessRedeem={(amt) => {
          setProfile((prev: any) =>
            prev ? { ...prev, balance: (Number(prev.balance) || 0) + amt } : prev
          );
        }}
      />

      {/* History Section */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="pt-2">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">History</p>
        <div className="rgb-container shadow-sm">
          <div className="bg-white rounded-[22px] overflow-hidden flex flex-col gap-[1px] bg-slate-100 w-full h-full">
            {[
              { icon: Download, label: 'Withdrawal History', id: 'withdrawal_history' },
              { icon: ArrowUpRight, label: 'Deposit History', id: 'deposit_history' },
              { icon: Wallet, label: 'Balance History', id: 'balance_history' },
            ].map((item, idx) => (
              <button 
                key={idx}
                onClick={() => setCurrentView(item.id as SubView)}
                className="w-full bg-white p-4 flex items-center justify-between transition-colors hover:bg-slate-50 text-left"
              >
                <div className="flex items-center gap-3">
                  <item.icon size={20} className="text-[#0F7A50]" strokeWidth={2} />
                  <span className="font-semibold text-slate-800 text-[15px]">{item.label}</span>
                </div>
                <ChevronRight size={18} className="text-slate-400" />
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Account Section */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="pt-2">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">Account</p>
        <div className="rgb-container shadow-sm mb-4">
          <div className="bg-white rounded-[22px] overflow-hidden flex flex-col gap-[1px] bg-slate-100 w-full h-full">
            {[
              { icon: KeyRound, label: 'Change Password', id: 'change_password' },
              { icon: User, label: 'Add Recovery Email', id: 'recovery_email' },
              { icon: MessageSquare, label: 'Feedback & Support', id: 'feedback' },
              { icon: Mail, label: 'Messages from Admin', id: 'admin_messages' },
            ].map((item, idx) => (
              <button 
                key={idx}
                onClick={() => {
                  if (item.id === 'admin_messages') {
                    setAdminMessagesCount(0);
                  }
                  setCurrentView(item.id as SubView);
                }}
                className="w-full bg-white p-4 flex items-center justify-between transition-colors hover:bg-slate-50 text-left"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <item.icon size={20} className="text-[#0F7A50] shrink-0" strokeWidth={2} />
                  <span className="font-semibold text-slate-800 text-[15px] truncate">{item.label}</span>
                  {item.id === 'admin_messages' && adminMessagesCount > 0 && (
                    <span className="bg-rose-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full ml-auto mr-1">
                      {adminMessagesCount}
                    </span>
                  )}
                </div>
                <ChevronRight size={18} className="text-slate-400 shrink-0" />
              </button>
            ))}
          </div>
        </div>

        <motion.div
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="rgb-container shadow-sm"
        >
          <button 
            onClick={onLogout}
            className="w-full bg-white rounded-[22px] p-4 flex items-center justify-center gap-2 transition-colors hover:bg-rose-50"
          >
            <LogOut size={18} className="text-rose-500" strokeWidth={2} />
            <span className="font-semibold text-rose-500 text-[15px]">Logout</span>
          </button>
        </motion.div>
      </motion.div>
    </motion.div>

    <AnimatePresence>
      {showShareModal && profile && (
        <ShareModal onClose={() => setShowShareModal(false)} code={profile.referral_code} username={profile.username} />
      )}
    </AnimatePresence>
    </>
  );
}

function WithdrawView({ onBack, profile }: { onBack: () => void, profile: any }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('EasyPaisa');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingWithdrawal, setPendingWithdrawal] = useState<any | null>(null);
  const [withdrawConfig, setWithdrawConfig] = useState<WithdrawalRuleConfig>(() =>
    parseWithdrawalRuleConfig({})
  );

  useEffect(() => {
    const checkPendingWithdrawal = async () => {
      try {
        // Fetch withdrawal fee, limits & open hours settings from app_settings
        const { data: settingsRows } = await supabase
          .from('app_settings')
          .select('setting_key, setting_value')
          .in('setting_key', [
            'withdrawal_rules_enabled',
            'min_withdraw_amount',
            'min_withdrawal',
            'max_withdraw_amount',
            'withdraw_fee_percent',
            'withdraw_fee_fixed',
            'withdraw_schedule_enabled',
            'withdraw_open_hour',
            'withdraw_close_hour',
            'withdraw_allowed_days',
            'withdraw_closed_message',
          ]);

        if (settingsRows && settingsRows.length > 0) {
          const sMap: Record<string, string> = {};
          settingsRows.forEach((r: any) => {
            sMap[r.setting_key] = r.setting_value;
          });
          setWithdrawConfig(parseWithdrawalRuleConfig(sMap));
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('withdrawals')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1);

          if (data && data.length > 0) {
            setPendingWithdrawal(data[0]);
          } else {
            setPendingWithdrawal(null);
          }
        }
      } catch (e) {
        console.error("Error checking pending withdrawal:", e);
      }
    };

    checkPendingWithdrawal();

    const channel = supabase
      .channel('withdraw-realtime-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'withdrawals' },
        () => {
          checkPendingWithdrawal();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_settings' },
        () => {
          checkPendingWithdrawal();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const [totalBalance, setTotalBalance] = useState(0);

  useEffect(() => {
    const calculateRealBalance = async () => {
      if (!profile?.id) return;
      try {
        // Fetch all user plans
        const { data: allUserPlans } = await supabase
          .from('user_plans')
          .select('id')
          .eq('user_id', profile.id);
        
        const userPlanIds = allUserPlans?.map(up => up.id) || [];
        
        // Sum collected daily rewards
        const { data: rewards } = await supabase
          .from('daily_rewards')
          .select('reward_amount')
          .in('user_plan_id', userPlanIds)
          .eq('status', 'collected');
          
        const totalRewards = rewards?.reduce((sum, r) => sum + Number(r.reward_amount), 0) || 0;
        
        // Sum weekly salary collections
        const { data: salCols } = await supabase
          .from('weekly_salary_collections')
          .select('amount')
          .eq('user_id', profile.id);
          
        const totalSalary = salCols?.reduce((sum, sc) => sum + Number(sc.amount), 0) || 0;

        // Sum Promo / Gift code redemptions
        const totalPromoBonus = await fetchUserPromoBonusFromSettings(profile.id);
        
        // Sum approved and pending withdrawals
        const { data: withdrawalData } = await supabase
          .from('withdrawals')
          .select('amount')
          .eq('user_id', profile.id)
          .in('status', ['approved', 'pending']);
          
        const totalWithdrawals = withdrawalData?.reduce((sum, w) => sum + Number(w.amount), 0) || 0;
        
        const realBalance = Math.max(0, totalRewards + totalSalary + totalPromoBonus - totalWithdrawals);
        setTotalBalance(realBalance);
        
        // Keep DB updated/synced
        const currentDbBalance = Number(profile?.balance || 0);
        if (currentDbBalance !== realBalance) {
          await supabase
            .from('profiles')
            .update({ balance: realBalance })
            .eq('id', profile.id);
          await broadcastChange('profiles', 'update', { id: profile.id, balance: realBalance });
        }
      } catch (e) {
        console.error('Error calculating real balance:', e);
        setTotalBalance(Number(profile?.balance || 0));
      }
    };
    calculateRealBalance();
  }, [profile]);

  const balance = totalBalance;
  const minWithdrawAmount = withdrawConfig.min_withdraw_amount;
  const maxWithdrawAmount = withdrawConfig.max_withdraw_amount;
  const scheduleStatus = checkWithdrawalScheduleOpen(withdrawConfig);
  const feeBreakdown = calculateWithdrawalBreakdown(parseFloat(amount) || 0, withdrawConfig);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (pendingWithdrawal) {
      setError('Aap ki ek withdrawal request pehle se pending hai. Meharbani karke us ke process hone ka intezar karein.');
      return;
    }

    if (!scheduleStatus.isOpen) {
      setError(scheduleStatus.reason);
      return;
    }

    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      setError('Sahi amount enter karein.');
      return;
    }

    if (withdrawAmount < minWithdrawAmount) {
      setError(`Minimum withdrawal request amount ${minWithdrawAmount} PKR hai.`);
      return;
    }

    if (withdrawConfig.withdrawal_rules_enabled && withdrawAmount > maxWithdrawAmount) {
      setError(`Maximum single withdrawal limit ${maxWithdrawAmount.toLocaleString()} PKR hai.`);
      return;
    }

    if (withdrawAmount > balance) {
      setError(`Aap ke paas kafi balance nahi hai. Aap ka total balance PKR ${balance.toFixed(2)} hai.`);
      return;
    }

    if (!accountNumber.trim()) {
      setError('Account / Mobile number enter karna zaroori hai.');
      return;
    }

    if (!accountName.trim()) {
      setError('Account holder name enter karna zaroori hai.');
      return;
    }

    const breakdown = calculateWithdrawalBreakdown(withdrawAmount, withdrawConfig);
    const enrichedAccountName =
      breakdown.totalFee > 0
        ? `${accountName.trim()} (Net: Rs ${breakdown.netReceivable} | Fee: Rs ${breakdown.totalFee})`
        : accountName.trim();

    setLoading(true);
    try {
      // Call Secure Backend API to validate schedule, limits, fee & deduct balance
      const apiRes = await secureApiCall('/api/withdrawals/request', {
        amount: withdrawAmount,
        method: method,
        account_number: accountNumber.trim(),
        account_name: accountName.trim(),
      });

      if (!apiRes.ok) {
        throw new Error(apiRes.error || apiRes.message || 'Withdrawal request failed.');
      }

      await broadcastChange('withdrawals', 'insert', { user_id: profile.id, amount: withdrawAmount });
      await broadcastChange('profiles', 'update', { id: profile.id, balance: apiRes.new_balance });

      setSuccess(
        breakdown.totalFee > 0
          ? `Your withdrawal request of PKR ${withdrawAmount} (Net Receivable: PKR ${breakdown.netReceivable} after PKR ${breakdown.totalFee} service fee) is pending and will be processed within 24 hours.`
          : 'Your withdrawal request is pending. You will receive your withdrawal request within 24 hours.'
      );
      setAmount('');
      setAccountNumber('');
      setAccountName('');
    } catch (err: any) {
      console.error('Withdrawal error:', err);
      setError(err.message || 'Withdrawal request create karne mein masla aya. Dobara koshish karein.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="min-h-full bg-slate-50 p-4 space-y-5 pb-20"
    >
      <button onClick={onBack} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors pt-2">
        <ArrowLeft size={18} />
        <span className="text-[13px] font-medium">Back</span>
      </button>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Withdraw</h2>
        {withdrawConfig.withdrawal_rules_enabled && withdrawConfig.withdraw_schedule_enabled && (
          <div
            className={`px-3 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${
              scheduleStatus.isOpen
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            <Clock size={13} />
            <span>{scheduleStatus.isOpen ? `Open · ${scheduleStatus.scheduleBadge}` : `Closed · ${scheduleStatus.scheduleBadge}`}</span>
          </div>
        )}
      </div>

      {withdrawConfig.withdrawal_rules_enabled && !scheduleStatus.isOpen && (
        <div className="bg-amber-50 text-amber-800 text-xs font-semibold p-4 rounded-xl border border-amber-200 leading-relaxed">
          ⏰ {scheduleStatus.reason}
        </div>
      )}

      <div className="flex gap-3">
        <div className="flex-1 bg-[#0F7A50] rounded-xl p-4 text-white shadow-sm">
          <p className="text-[11px] font-medium text-white/90 mb-1">Current Balance</p>
          <p className="text-xl font-bold font-mono tabular-nums">PKR {balance.toFixed(2)}</p>
        </div>
        <div className="flex-1 bg-[#e8fbf3] border border-[#a2ecd0] rounded-xl p-4 text-[#0F7A50] shadow-sm">
          <p className="text-[11px] font-medium mb-1">Withdrawable</p>
          <p className="text-xl font-bold font-mono tabular-nums">PKR {balance.toFixed(2)}</p>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-700 text-xs font-semibold p-4 rounded-xl border border-rose-100 leading-relaxed">
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 text-emerald-800 text-xs font-semibold p-4 rounded-xl border border-emerald-100 leading-relaxed space-y-1 shadow-sm">
          <p className="text-[13px] font-bold text-emerald-900">✅ Request Submitted!</p>
          <p>{success}</p>
        </div>
      )}

      {pendingWithdrawal && (
        <div className="bg-amber-50 text-amber-800 text-xs font-semibold p-4 rounded-xl border border-amber-100 leading-relaxed shadow-sm flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-[13px] font-bold text-amber-900">
            <Clock size={16} className="animate-pulse text-amber-500" />
            <span>Withdrawal Request Pending (Process Mein Hai)</span>
          </div>
          <p className="text-[12px] font-medium text-slate-600 leading-relaxed">
            Aap ne <span className="font-bold text-amber-800 font-mono tabular-nums">PKR {Number(pendingWithdrawal.amount).toFixed(2)}</span> ki withdrawal request ki hui hai jo ke abhi review mein hai. Please 24 hours tak intezar karein. Aap dobara request nahi kar sakte jab tak purani request approve ya reject na ho jaye.
          </p>
          <div className="text-[10px] text-slate-400 mt-1">
            Requested At: {new Date(pendingWithdrawal.created_at).toLocaleString()}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[13px] font-medium text-slate-800 mb-1.5">Amount (PKR)</label>
          <input 
            type="number" 
            required
            min={minWithdrawAmount}
            max={withdrawConfig.withdrawal_rules_enabled ? maxWithdrawAmount : undefined}
            disabled={!!pendingWithdrawal || !scheduleStatus.isOpen}
            placeholder={
              withdrawConfig.withdrawal_rules_enabled
                ? `Min ${minWithdrawAmount} — Max ${maxWithdrawAmount.toLocaleString()} PKR`
                : `Min ${minWithdrawAmount} PKR`
            } 
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[15px] font-mono tabular-nums focus:outline-none focus:border-[#0F7A50] focus:ring-1 focus:ring-[#0F7A50] transition-shadow placeholder:text-slate-400 font-medium text-slate-800 disabled:bg-slate-100 disabled:text-slate-400"
          />
          {withdrawConfig.withdrawal_rules_enabled && (
            <div className="flex flex-wrap justify-between items-center text-[11px] text-slate-500 mt-1.5 px-1 font-mono tabular-nums">
              <span>Min: {minWithdrawAmount} PKR · Max: {maxWithdrawAmount.toLocaleString()} PKR</span>
              <span>
                Fee: {withdrawConfig.withdraw_fee_percent}%
                {withdrawConfig.withdraw_fee_fixed > 0 ? ` + Rs ${withdrawConfig.withdraw_fee_fixed}` : ''}
              </span>
            </div>
          )}
        </div>

        {/* Live Net Payout Breakdown Card (Only shown when Custom Withdrawal Rules are enabled and fee > 0) */}
        {withdrawConfig.withdrawal_rules_enabled &&
          (withdrawConfig.withdraw_fee_percent > 0 || withdrawConfig.withdraw_fee_fixed > 0) &&
          feeBreakdown.requestedAmount > 0 && (
          <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 space-y-2 text-xs font-mono tabular-nums">
            <div className="flex justify-between text-slate-600">
              <span className="font-sans">Requested Withdrawal:</span>
              <span className="font-bold text-slate-800">PKR {feeBreakdown.requestedAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-rose-600">
              <span className="font-sans">
                Service Fee ({withdrawConfig.withdraw_fee_percent}%
                {withdrawConfig.withdraw_fee_fixed > 0 ? ` + Rs ${withdrawConfig.withdraw_fee_fixed}` : ''}):
              </span>
              <span className="font-bold">-PKR {feeBreakdown.totalFee.toLocaleString()}</span>
            </div>
            <div className="pt-2 border-t border-slate-100 flex justify-between text-sm font-black text-[#0F7A50]">
              <span className="font-sans">Net Receivable Amount:</span>
              <span>PKR {feeBreakdown.netReceivable.toLocaleString()}</span>
            </div>
          </div>
        )}

        <div>
          <label className="block text-[13px] font-medium text-slate-800 mb-1.5">Withdrawal Method</label>
          <div className="relative">
            <select 
              value={method}
              disabled={!!pendingWithdrawal || !scheduleStatus.isOpen}
              onChange={e => setMethod(e.target.value)}
              className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-4 py-3 text-[15px] focus:outline-none focus:border-[#0F7A50] focus:ring-1 focus:ring-[#0F7A50] transition-shadow text-slate-800 font-medium disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="EasyPaisa">EasyPaisa</option>
              <option value="JazzCash">JazzCash</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
            <ChevronRight size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-slate-800 mb-1.5">Account / Mobile Number</label>
          <input 
            type="text" 
            required
            disabled={!!pendingWithdrawal || !scheduleStatus.isOpen}
            placeholder="e.g. 03000000000"
            value={accountNumber}
            onChange={e => setAccountNumber(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[15px] focus:outline-none focus:border-[#0F7A50] focus:ring-1 focus:ring-[#0F7A50] transition-shadow text-slate-800 font-medium disabled:bg-slate-100 disabled:text-slate-400"
          />
        </div>

        <div>
          <label className="block text-[13px] font-medium text-slate-800 mb-1.5">Account Holder Name</label>
          <input 
            type="text" 
            required
            disabled={!!pendingWithdrawal || !scheduleStatus.isOpen}
            placeholder="e.g. Your Name"
            value={accountName}
            onChange={e => setAccountName(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[15px] focus:outline-none focus:border-[#0F7A50] focus:ring-1 focus:ring-[#0F7A50] transition-shadow text-slate-800 font-medium disabled:bg-slate-100 disabled:text-slate-400"
          />
        </div>

        <button 
          type="submit"
          disabled={loading || !!pendingWithdrawal || !scheduleStatus.isOpen}
          className="w-full bg-[#0F7A50] hover:bg-[#0c6140] disabled:bg-slate-300 text-white font-semibold py-3.5 rounded-xl shadow-sm transition-colors mt-2 text-[15px]"
        >
          {loading
            ? 'Processing...'
            : pendingWithdrawal
            ? 'Withdrawal Pending...'
            : !scheduleStatus.isOpen
            ? 'Withdrawals Currently Closed'
            : feeBreakdown.requestedAmount > 0
            ? `Request Withdrawal (Receive Rs. ${feeBreakdown.netReceivable.toLocaleString()})`
            : 'Request Withdrawal'}
        </button>
        
        <div className="bg-slate-100/80 p-3.5 rounded-xl border border-slate-200/50 text-center">
          <p className="text-[11px] text-slate-500 font-medium leading-normal">
            Withdrawal request receive hone ke baad <strong>24 hours</strong> ke andar aap ke account mein transfer kar di jaye gi.
          </p>
        </div>
      </form>
    </motion.div>
  );
}

function HistoryView({ title, type, emptyText, onBack }: { title: string, type: 'withdrawal_history' | 'deposit_history' | 'balance_history', emptyText: string, onBack: () => void }) {
  const [withdrawalItems, setWithdrawalItems] = useState<any[]>([]);
  const [depositItems, setDepositItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (type === 'withdrawal_history') {
        let { data, error } = await supabase
          .from('withdrawals')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error && (error.code === 'PGRST205' || error.message?.includes('withdrawals'))) {
          // Table doesn't exist, read from localStorage
          const localData = JSON.parse(localStorage.getItem('local_withdrawals') || '[]');
          data = localData.filter((w: any) => w.user_id === user.id);
          error = null;
        }

        if (!error && data) {
          setWithdrawalItems(data);
        }
      } else if (type === 'deposit_history') {
        const { data, error } = await supabase
          .from('deposits')
          .select('*, plans(plan_number, plan_price), payment_methods(method_name)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!error && data) {
          setDepositItems(data);
        }
      }
    } catch (e) {
      console.error('Failed to fetch history:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();

    // Listen for changes
    const channel = supabase
      .channel('history-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: type === 'withdrawal_history' ? 'withdrawals' : 'deposits' }, () => {
        fetchHistory();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [type]);

  const totalApprovedWithdrawal = withdrawalItems
    .filter(item => item.status === 'approved')
    .reduce((sum, item) => sum + Number(item.amount), 0);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="min-h-full bg-slate-50 p-4 space-y-4 pb-20"
    >
      <button onClick={onBack} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors pt-2">
        <ArrowLeft size={18} />
        <span className="text-[13px] font-medium">Back</span>
      </button>

      <h2 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h2>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-100 shadow-sm min-h-[200px]">
          <div className="w-8 h-8 border-3 border-slate-200 border-t-[#0F7A50] rounded-full animate-spin mb-3"></div>
          <p className="text-xs text-slate-400 font-medium">History load ho rahi hai...</p>
        </div>
      ) : (
        <>
          {type === 'withdrawal_history' && (
            <div className="bg-[#0F7A50] rounded-2xl p-4 text-white shadow-sm mb-4">
              <p className="text-[11px] font-medium text-white/90 mb-1">Total Withdrawal</p>
              <p className="text-2xl font-bold mb-1">PKR {totalApprovedWithdrawal.toFixed(2)}</p>
              <p className="text-[10px] text-white/80">Sum of approved withdrawals</p>
            </div>
          )}

          {type === 'withdrawal_history' && withdrawalItems.length > 0 && (
            <div className="space-y-3">
              {withdrawalItems.map(item => (
                <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-bold text-[15px] text-slate-900">PKR {Number(item.amount).toFixed(2)}</p>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      item.status === 'approved' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                        : item.status === 'rejected'
                        ? 'bg-rose-50 text-rose-700 border border-rose-100'
                        : 'bg-amber-50 text-amber-700 border border-amber-100 animate-pulse'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="text-[13px] text-slate-600 mb-1 font-medium">{item.method} ({item.account_number})</p>
                  <p className="text-[11px] text-slate-400 font-medium">{new Date(item.created_at).toLocaleString()}</p>
                  {item.status === 'pending' && (
                    <p className="text-[10px] text-amber-600 font-semibold bg-amber-50/50 p-2 rounded-lg border border-amber-100/50 mt-2">
                      ⚠️ Your withdrawal request is pending. You will receive your withdrawal request within 24 hours.
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {type === 'deposit_history' && depositItems.length > 0 && (
            <div className="space-y-3">
              {depositItems.map(item => (
                <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-bold text-[15px] text-slate-900">PKR {Number(item.plans?.plan_price || 0).toFixed(2)}</p>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      item.status === 'approved' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                        : item.status === 'rejected'
                        ? 'bg-rose-50 text-rose-700 border border-rose-100'
                        : 'bg-amber-50 text-amber-700 border border-amber-100'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="text-[13px] text-slate-600 font-medium">Plan {item.plans?.plan_number || ''} via {item.payment_methods?.method_name || 'E-Wallet'}</p>
                  <p className="text-[12px] text-slate-500 font-medium mb-1">Sender: {item.user_account_number} ({item.user_account_name})</p>
                  <p className="text-[11px] text-slate-400 font-medium">{new Date(item.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}

          {((type === 'balance_history') || 
             (type === 'withdrawal_history' && withdrawalItems.length === 0) || 
             (type === 'deposit_history' && depositItems.length === 0)) && (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center shadow-sm min-h-[200px]">
              <Inbox size={32} className="text-slate-500 mb-3" strokeWidth={1.5} />
              <p className="text-[15px] text-slate-500 font-semibold">{emptyText}</p>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}

function ChangePasswordView({ onBack }: { onBack: () => void }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleUpdate = async () => {
    setMessage({ type: '', text: '' });
    if (!newPassword || !confirmPassword) {
      setMessage({ type: 'error', text: 'Please fill both fields.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }

    try {
      setIsUpdating(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setMessage({ type: 'success', text: 'Password updated successfully!' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="min-h-full bg-slate-50 p-4 space-y-5"
    >
      <button onClick={onBack} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors pt-2">
        <ArrowLeft size={18} />
        <span className="text-[13px] font-medium">Back</span>
      </button>

      <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Change Password</h2>

      <div className="space-y-4">
        {message.text && (
          <div className={`p-3 rounded-xl text-sm font-medium ${message.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
            {message.text}
          </div>
        )}
        
        <div>
          <label className="block text-[13px] font-medium text-slate-900 mb-1.5">New Password</label>
          <input 
            type="password" 
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[15px] focus:outline-none focus:border-[#0F7A50] focus:ring-1 focus:ring-[#0F7A50] transition-shadow"
          />
        </div>

        <div>
          <label className="block text-[13px] font-medium text-slate-900 mb-1.5">Confirm Password</label>
          <input 
            type="password" 
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[15px] focus:outline-none focus:border-[#0F7A50] focus:ring-1 focus:ring-[#0F7A50] transition-shadow"
          />
        </div>

        <button 
          onClick={handleUpdate}
          disabled={isUpdating}
          className="w-full bg-[#0F7A50] hover:bg-[#0c6140] text-white font-semibold py-3.5 rounded-xl shadow-sm transition-colors mt-2 disabled:opacity-50"
        >
          {isUpdating ? 'Updating...' : 'Update Password'}
        </button>
      </div>
    </motion.div>
  );
}

function RecoveryEmailView({ onBack }: { onBack: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="min-h-full bg-slate-50 p-4 space-y-4"
    >
      <button onClick={onBack} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors pt-2">
        <ArrowLeft size={18} />
        <span className="text-[13px] font-medium">Back</span>
      </button>

      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-1.5">Add Recovery Email</h2>
        <p className="text-[14px] text-slate-500 leading-relaxed">This Gmail will be used to recover your password if you forget it.</p>
      </div>

      <div className="space-y-4 pt-2">
        <div>
          <label className="block text-[13px] font-medium text-slate-900 mb-1.5">Recovery Gmail</label>
          <input 
            type="email" 
            placeholder="yourname@gmail.com"
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[15px] focus:outline-none focus:border-[#0F7A50] focus:ring-1 focus:ring-[#0F7A50] transition-shadow placeholder:text-slate-400"
          />
        </div>

        <button className="w-full bg-[#0F7A50] hover:bg-[#0c6140] text-white font-semibold py-3.5 rounded-xl shadow-sm transition-colors mt-2">
          Save Recovery Email
        </button>
      </div>
    </motion.div>
  );
}

function ShareModal({ onClose, code, username }: { onClose: () => void, code: string, username: string }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}?ref=${code}`;

  const handleCopy = () => {
    const shareText = `🚀 ${username || 'Your friend'} invited you to join Earning Hub and earn 3x money! Start earning daily rewards today. 👇 Click the link below to join:\n${shareUrl}`;
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, y: "100%" }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-xl"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-slate-800">Share Profile</h3>
          <button onClick={onClose} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors">
            <span className="text-lg leading-none">&times;</span>
          </button>
        </div>

        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 bg-[#0F7A50] rounded-full flex items-center justify-center shrink-0 mb-3 border-4 border-[#e8f3ef]">
             <User size={36} className="text-white" strokeWidth={1.5} />
          </div>
          <h4 className="text-lg font-bold text-slate-800">{username}</h4>
          <p className="text-sm text-slate-500">Earning Hub</p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6">
           <p className="text-[11px] font-semibold uppercase text-slate-500 mb-2">Your unique link</p>
           <div className="flex items-center gap-2">
             <div className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2.5 overflow-hidden">
               <p className="text-[13px] font-medium text-slate-800 truncate">{shareUrl}</p>
             </div>
             <motion.button 
               whileHover={{ scale: 1.05 }}
               whileTap={{ scale: 0.95 }}
               onClick={handleCopy}
               className={`h-[42px] px-4 rounded-xl flex items-center justify-center transition-colors ${copied ? 'bg-emerald-500 text-white' : 'bg-[#0F7A50] text-white'}`}
             >
               {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
             </motion.button>
           </div>
        </div>

        <button 
           onClick={() => {
             const shareText = `🚀 ${username || 'Your friend'} invited you to join Earning Hub and earn 3x money! Start earning daily rewards today. 👇 Click the link below to join:\n${shareUrl}`;
             if (navigator.share) {
               navigator.share({
                 title: 'Join Earning Hub',
                 text: `🚀 ${username || 'Your friend'} invited you to join Earning Hub and earn 3x money! Start earning daily rewards today. 👇 Click the link below to join:`,
                 url: shareUrl,
               }).catch((err) => console.error('Error sharing:', err));
             } else {
               handleCopy();
             }
           }}
           className="w-full bg-[#0F7A50] text-white font-semibold py-3.5 rounded-xl shadow-sm hover:bg-[#0c6140] transition-colors flex items-center justify-center gap-2"
        >
          <Share2 size={18} />
          Share via...
        </button>
      </motion.div>
    </div>
  );
}

function FeedbackView({ onBack, profile }: { onBack: () => void, profile: any }) {
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [feedbacksList, setFeedbacksList] = useState<any[]>([]);

  const fetchFeedbacks = async () => {
    try {
      const { data, error } = await supabase
        .from('feedbacks')
        .select('*')
        .eq('user_id', profile?.id)
        .order('created_at', { ascending: false });
      if (!error && data) {
        setFeedbacksList(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (profile?.id) {
      fetchFeedbacks();
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) {
      setError('Feedback message cannot be empty.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const { error: insertErr } = await supabase.from('feedbacks').insert({
        user_id: profile.id,
        message: feedback.trim()
      });
      if (insertErr) throw insertErr;

      setSuccess('Aap ka feedback successfully submit ho gaya hai. Shukriya!');
      setFeedback('');
      fetchFeedbacks();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Feedback submit karne mein masla aya.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="min-h-full bg-slate-50 p-4 space-y-5 pb-20"
    >
      <button onClick={onBack} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors pt-2">
        <ArrowLeft size={18} />
        <span className="text-[13px] font-medium">Back</span>
      </button>

      <div>
        <h2 className="text-2xl font-bold text-[#0F7A50] tracking-tight mb-1.5">User Feedback</h2>
        <p className="text-[14px] text-slate-500 leading-relaxed">Apna qeemti feedback ya masla niche likhein aur submit karein.</p>
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-700 text-xs font-semibold p-4 rounded-xl border border-rose-100 leading-relaxed">
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 text-emerald-800 text-xs font-semibold p-4 rounded-xl border border-emerald-100 leading-relaxed space-y-1 shadow-sm">
          <p className="text-[13px] font-bold text-emerald-900">✅ Shukriya!</p>
          <p>{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[13px] font-medium text-slate-800 mb-1.5">Feedback Message / Issue</label>
          <textarea 
            required
            rows={4}
            placeholder="Apna feedback, sawal, ya app se mutaliq koi masla yahan likhein..." 
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-[15px] focus:outline-none focus:border-[#0F7A50] focus:ring-1 focus:ring-[#0F7A50] transition-shadow placeholder:text-slate-400 font-medium text-slate-800"
          />
        </div>

        <button 
          type="submit"
          disabled={loading}
          className="w-full bg-[#0F7A50] hover:bg-[#0c6140] disabled:bg-slate-300 text-white font-semibold py-3.5 rounded-xl shadow-sm transition-colors text-[15px]"
        >
          {loading ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </form>

      <div className="pt-2">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">Your Past Feedbacks</p>
        {feedbacksList.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-400 text-xs">
            Aap ne abhi tak koi feedback submit nahi kiya.
          </div>
        ) : (
          <div className="space-y-3">
            {feedbacksList.map((item) => (
              <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <p className="text-slate-800 text-[14px] font-medium leading-relaxed whitespace-pre-wrap">{item.message}</p>
                <div className="text-[11px] text-slate-400 font-medium mt-2 flex justify-between">
                  <span>{new Date(item.created_at).toLocaleString()}</span>
                  <span className="text-[#0F7A50] font-semibold">Submitted</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function AdminMessagesView({ onBack, profile, onMessagesRead }: { onBack: () => void; profile: any; onMessagesRead?: () => void }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;

    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('admin_messages')
          .select('*')
          .eq('user_id', profile.id)
          .eq('is_broadcast', false)
          .order('created_at', { ascending: false });

        if (!error && data) {
          setMessages(data);
          onMessagesRead?.();

          // Mark unread messages as read
          const unreadIds = data.filter((m: any) => !m.is_read).map((m: any) => m.id);
          if (unreadIds.length > 0) {
            await supabase
              .from('admin_messages')
              .update({ is_read: true })
              .in('id', unreadIds);
          }
        }
      } catch (err) {
        console.error('Error fetching admin messages:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('user-admin-messages')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_messages', filter: `user_id=eq.${profile.id}` },
        () => {
          fetchMessages();
        }
      )
      .on(
        'broadcast',
        { event: 'db_change' },
        (payload) => {
          if (payload && payload.payload) {
            const { table, data } = payload.payload;
            if (table === 'admin_messages' && (data?.user_id === profile.id || data?.is_broadcast)) {
              fetchMessages();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="min-h-full bg-slate-50 p-4 space-y-5 pb-20"
    >
      <button onClick={onBack} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors pt-2">
        <ArrowLeft size={18} />
        <span className="text-[13px] font-medium">Back</span>
      </button>

      <div>
        <h2 className="text-2xl font-bold text-[#0F7A50] tracking-tight mb-1.5">Admin Messages</h2>
        <p className="text-[14px] text-slate-500 leading-relaxed">Admin ki taraf se bhejay gaye messages yahan dekhain.</p>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-4 border-[#0F7A50] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : messages.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-slate-400 text-sm shadow-sm flex flex-col items-center justify-center min-h-[220px]">
          <Mail className="w-10 h-10 text-slate-300 mb-3" />
          <p className="font-bold text-slate-600">No Messages Yet</p>
          <p className="text-xs text-slate-400 mt-1">Admin ki taraf se abhi tak koi message nahi aya.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-3 relative overflow-hidden border-l-4 border-l-[#0F7A50]">
              <div className="flex justify-between items-center text-xs text-slate-400 font-medium">
                <span className="bg-emerald-50 text-[#0F7A50] font-bold px-2 py-0.5 rounded-lg">From: Admin</span>
                <span>{new Date(msg.created_at).toLocaleString()}</span>
              </div>
              <p className="text-slate-800 text-[14px] leading-relaxed font-medium whitespace-pre-wrap bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100">
                {msg.message}
              </p>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

