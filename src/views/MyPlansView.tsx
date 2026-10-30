import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, broadcastChange } from '../lib/supabase';
import { secureApiCall } from '../lib/api';
import { parsePlansMetaJson } from '../lib/economics';
import { parseDailyTasksConfig, getTaskForDay, TaskVerificationConfig, DEFAULT_VERIFICATION_TASKS } from '../lib/platformFeatures';
import { motion, AnimatePresence } from 'motion/react';
import { Gift, Clock, CheckCircle2, AlertCircle, RefreshCw, Lock, Sparkles, Award, HelpCircle } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { CurrencySwitcherTrigger } from '../components/CurrencySwitcherModal';
import dynamic from 'next/dynamic';

const TaskVerificationModal = dynamic(
  () => import('../components/TaskVerificationModal').then((m) => m.TaskVerificationModal),
  { ssr: false }
);

// Sub-component to manage individual countdown timers efficiently
function LockedRewardCountdown({ availableAt, onUnlock }: { availableAt: string; onUnlock: () => void }) {
  const [timeLeft, setTimeLeft] = useState<{ hours: string; minutes: string; seconds: string } | null>(null);
  const onUnlockRef = useRef(onUnlock);

  // Keep ref up to date
  useEffect(() => {
    onUnlockRef.current = onUnlock;
  }, [onUnlock]);

  useEffect(() => {
    const calculateTime = () => {
      const difference = +new Date(availableAt) - +new Date();
      if (difference <= 0) {
        setTimeLeft(null);
        // Only call unlock if we were previously locked (to avoid loops)
        if (timeLeft !== null) {
          onUnlockRef.current();
        }
        return;
      }

      const totalSeconds = Math.floor(difference / 1000);
      const hrs = Math.floor(totalSeconds / 3600);
      const mins = Math.floor((totalSeconds % 3600) / 60);
      const secs = totalSeconds % 60;

      setTimeLeft({
        hours: hrs.toString().padStart(2, '0'),
        minutes: mins.toString().padStart(2, '0'),
        seconds: secs.toString().padStart(2, '0')
      });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [availableAt, onUnlock]);

  if (!timeLeft) {
    return <span className="text-[10px] font-bold text-emerald-600 animate-pulse">Unlocked!</span>;
  }

  return (
    <div className="flex flex-col items-center justify-center text-center mt-0.5">
      <span className="text-[9px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-0.5 mb-0.5">
        <Clock size={8} /> Claim in
      </span>
      <span className="text-[10px] font-mono font-bold text-rose-500 bg-rose-50 px-1 py-0.5 rounded border border-rose-100">
        {timeLeft.hours}:{timeLeft.minutes}:{timeLeft.seconds}
      </span>
    </div>
  );
}

export function MyPlansView() {
  const { format } = useCurrency();
  const [plans, setPlans] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedUserId = localStorage.getItem('last_active_user_id');
        const cached = localStorage.getItem('cached_my_plans_list');
        if (cached && storedUserId) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {}
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedUserId = localStorage.getItem('last_active_user_id');
        const cached = localStorage.getItem('cached_my_plans_list');
        if (cached && storedUserId && JSON.parse(cached).length > 0) return false;
      } catch (e) {}
    }
    return true;
  });
  const [collectingRewardId, setCollectingRewardId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [successClaimData, setSuccessClaimData] = useState<{ amount: number; day: number } | null>(null);
  const isFetchingRef = useRef(false);

  const [activeMembersCount, setActiveMembersCount] = useState(0);
  const [freeRewardDays, setFreeRewardDays] = useState<number>(1);
  const [taskConfig, setTaskConfig] = useState<TaskVerificationConfig>({
    require_task_before_claim: false,
    default_timer_seconds: 15,
    tasks: DEFAULT_VERIFICATION_TASKS,
  });
  const [pendingTaskClaim, setPendingTaskClaim] = useState<{ reward: any; planName: string } | null>(null);

  const fetchPlans = useCallback(async () => {
    if (isFetchingRef.current) return;
    try {
      isFetchingRef.current = true;
      if (plans.length === 0) setIsLoading(true);
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError || !userData?.user) return;
      
      setUserId(prev => {
        if (prev !== userData.user.id) return userData.user.id;
        return prev;
      });

      // Fetch free_reward_days, plans_meta_json & daily task config from app_settings
      let plansMetaMap: Record<number, any> = {};
      try {
        const { data: settingsRows } = await supabase
          .from('app_settings')
          .select('setting_key, setting_value')
          .in('setting_key', [
            'free_reward_days',
            'plans_meta_json',
            'require_task_before_claim',
            'task_default_timer_seconds',
            'daily_tasks_json',
          ]);
        if (settingsRows) {
          const sMap: Record<string, string> = {};
          settingsRows.forEach(r => { sMap[r.setting_key] = r.setting_value; });
          if (sMap['free_reward_days'] !== undefined && sMap['free_reward_days'] !== '') {
            const parsedDays = Number(sMap['free_reward_days']);
            if (!isNaN(parsedDays)) {
              setFreeRewardDays(Math.max(0, Math.min(30, parsedDays)));
            }
          }
          if (sMap['plans_meta_json']) {
            plansMetaMap = parsePlansMetaJson(sMap['plans_meta_json']);
          }
          setTaskConfig(parseDailyTasksConfig(sMap));
        }
      } catch (settingsErr) {
        console.warn('Could not fetch app_settings in MyPlansView, defaulting to 1:', settingsErr);
      }

      // Fetch user plans with plan details
      const { data: userPlansResult, error: plansError } = await supabase
        .from('user_plans')
        .select(`
          id,
          status,
          start_date,
          approved_at,
          created_at,
          plan:plans(id, plan_number, plan_price, daily_reward, thirty_day_reward, members_required)
        `)
        .eq('user_id', userData.user.id)
        .order('start_date', { ascending: true });

      if (plansError) throw plansError;
      let userPlans = userPlansResult || [];

      // --- SELF-HEALING SYSTEM FOR APPROVED DEPOSITS ---
      // If a deposit was approved but its user plan was never created, heal it immediately
      const { data: approvedDeposits } = await supabase
        .from('deposits')
        .select('*')
        .eq('user_id', userData.user.id)
        .eq('status', 'approved');

      let healedAny = false;
      if (approvedDeposits && approvedDeposits.length > 0) {
        const existingPlanIds = new Set(userPlans.map(p => p.id));
        
        for (const dep of approvedDeposits) {
          if (!existingPlanIds.has(dep.id)) {
            // Heal this! Find a valid payment method as fallback
            let pmId = dep.platform_method_id || dep.admin_payment_method_id;
            const { data: pmExists } = await supabase
              .from('payment_methods')
              .select('id')
              .eq('id', pmId || 0)
              .maybeSingle();

            if (!pmId || !pmExists) {
              const { data: pmList } = await supabase
                .from('payment_methods')
                .select('id')
                .limit(1);
              pmId = pmList && pmList.length > 0 ? pmList[0].id : 1;
            }

            // Insert the missing user plan using deposit id
            const { error: insertPlanErr } = await supabase
              .from('user_plans')
              .insert({
                id: dep.id,
                user_id: dep.user_id,
                plan_id: dep.plan_id,
                status: 'active',
                admin_payment_method_id: pmId,
                sender_account_name: dep.user_account_name || 'Unknown',
                sender_account_number: dep.user_account_number || 'Unknown',
                receipt_image_url: dep.screenshot_url || '',
                approved_at: dep.created_at || new Date().toISOString(),
                start_date: dep.created_at || new Date().toISOString()
              });

            if (!insertPlanErr) {
              healedAny = true;
              
              // Fetch plan details to calculate reward and write notification
              const { data: plan } = await supabase
                .from('plans')
                .select('*')
                .eq('id', dep.plan_id)
                .single();

              const dailyAmount = plan?.daily_reward || plan?.daily_return || ((plan?.plan_price || 250) * 0.05);
              const rewards = [];
              const now = new Date(dep.created_at || new Date());
              for (let i = 1; i <= 30; i++) {
                rewards.push({
                  user_plan_id: dep.id,
                  user_id: userData.user.id,
                  day_number: i,
                  status: 'pending',
                  reward_amount: dailyAmount,
                  available_at: new Date(now.getTime() + (i - 1) * 24 * 60 * 60 * 1000).toISOString()
                });
              }

              await supabase.from('daily_rewards').insert(rewards);

              // Also insert a notification client-side
              const planNameStr = plan?.name || `Plan ${plan?.plan_number || ''}`;
              await supabase.from('notifications').insert({
                user_id: userData.user.id,
                title: 'Plan Activated! 🎉',
                message: `Congratulations! Your plan "${planNameStr}" is approved. You can now start collecting your daily reward!`,
                type: 'member_active'
              });
            } else {
              console.error("Healer failed to insert user plan:", insertPlanErr);
            }
          }
        }
      }

      if (healedAny) {
        // Fetch plans again to show the updated list
        const { data: updatedPlans } = await supabase
          .from('user_plans')
          .select(`
            id,
            status,
            start_date,
            approved_at,
            created_at,
            plan:plans(id, plan_number, plan_price, daily_reward, thirty_day_reward, members_required)
          `)
          .eq('user_id', userData.user.id)
          .order('start_date', { ascending: true });
        
        if (updatedPlans) {
          userPlans = updatedPlans;
        }
      }
      // -------------------------------------------------
      
      // Calculate active team members
      let currentActiveMembers = 0;
      const { data: profile } = await supabase.from('profiles').select('referral_code').eq('id', userData.user.id).maybeSingle();
      if (profile?.referral_code) {
        const { data: referredUsers } = await supabase
          .from('profiles')
          .select('id, user_plans(status)')
          .eq('referred_by', profile.referral_code);
          
        if (referredUsers) {
          currentActiveMembers = referredUsers.filter(u => 
            u.user_plans?.some((p: any) => p.status === 'active' || p.status === 'completed')
          ).length;
        }
      }
      setActiveMembersCount(currentActiveMembers);

      // Fetch all rewards for these plans
      if (userPlans && userPlans.length > 0) {
        const planIds = userPlans.map(p => p.id);
        let { data: rewards, error: rewardsError } = await supabase
          .from('daily_rewards')
          .select('*')
          .in('user_plan_id', planIds)
          .order('day_number', { ascending: true });

        if (rewardsError) throw rewardsError;
        if (!rewards) rewards = [];

        let availableMembers = currentActiveMembers;

        const plansWithRewards = userPlans.map(p => {
          const required = (p.plan as any)?.members_required || 0;
          const isRequirementMet = availableMembers >= required;
          if (isRequirementMet) {
            availableMembers -= required;
          } else {
            availableMembers = 0;
          }
          
          const planDetails = (Array.isArray(p.plan) ? p.plan[0] : p.plan) as any;
          const planNum = Number(planDetails?.plan_number || 1);
          const meta = plansMetaMap[planNum] || {};
          const totalDays = Number(meta.total_days || planDetails?.total_days || 30);
          const customName = meta.name || planDetails?.name || `Plan ${planNum}`;
          const dailyAmount = planDetails?.daily_reward || ((planDetails?.plan_price || 250) * 0.05);

          const fullRewards = [];
          for (let i = 1; i <= totalDays; i++) {
            const existingReward = rewards.find(r => r.user_plan_id === p.id && r.day_number === i);
            if (existingReward) {
              fullRewards.push(existingReward);
            } else {
              fullRewards.push({
                id: `virtual_${p.id}_${i}`,
                user_plan_id: p.id,
                user_id: userData.user.id,
                day_number: i,
                status: 'pending',
                reward_amount: dailyAmount
              });
            }
          }

          return {
            ...p,
            plan: {
              ...planDetails,
              name: customName,
              total_days: totalDays
            },
            isRequirementMet,
            rewards: fullRewards
          };
        });

        setPlans(plansWithRewards);
        try {
          localStorage.setItem('cached_my_plans_list', JSON.stringify(plansWithRewards));
        } catch (e) {}
      } else {
        setPlans([]);
        try {
          localStorage.removeItem('cached_my_plans_list');
        } catch (e) {}
      }
    } catch (err) {
      console.error("Error fetching plans:", err);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [plans.length]);

  useEffect(() => {
    fetchPlans();

    // Set up real-time subscriptions for plans and rewards
    const channel = supabase
      .channel('plans-realtime-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_plans' },
        () => {
          fetchPlans();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'daily_rewards' },
        () => {
          fetchPlans();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          fetchPlans();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deposits' },
        () => {
          fetchPlans();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_settings' },
        () => {
          fetchPlans();
        }
      )
      .on(
        'broadcast',
        { event: 'db_change' },
        (payload) => {
          console.log('Plans view received real-time broadcast sync:', payload);
          fetchPlans();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPlans]);

  const handleCollect = async (reward: any) => {
    if (collectingRewardId) return;
    try {
      setCollectingRewardId(reward.id);
      
      // 1. Call Secure Backend API to validate timing, referrals & atomically credit balance
      const apiRes = await secureApiCall('/api/rewards/claim', {
        user_plan_id: reward.user_plan_id,
        day_number: reward.day_number,
      });

      if (!apiRes.ok) {
        throw new Error(apiRes.error || apiRes.message || 'Reward collection failed.');
      }

      await broadcastChange('daily_rewards', 'collect', { rewardId: reward.id, userId });

      // Update local state immediately
      setPlans(prev => prev.map(p => {
        if (p.id === reward.user_plan_id) {
          return {
            ...p,
            rewards: p.rewards.map((r: any) => 
              r.id === reward.id 
                ? { ...r, status: 'collected', collected_at: new Date().toISOString() } 
                : r
            )
          };
        }
        return p;
      }));

      // Trigger beautiful glowing celebration overlay
      setSuccessClaimData({
        amount: Number(reward.reward_amount),
        day: reward.day_number
      });

    } catch (err: any) {
      alert("Failed to collect reward: " + err.message);
    } finally {
      setCollectingRewardId(null);
      setPendingTaskClaim(null);
    }
  };

  const handleInitiateCollect = (reward: any, planName: string) => {
    if (collectingRewardId) return;
    if (taskConfig.require_task_before_claim) {
      setPendingTaskClaim({ reward, planName });
    } else {
      handleCollect(reward);
    }
  };

  const handleForceUnlock = useCallback((rewardId: string, planId: string) => {
    // Automatically triggers re-evaluation when timer hits 0
    setPlans(prev => prev.map(p => {
      if (p.id === planId) {
        return {
          ...p,
          rewards: p.rewards.map((r: any) => 
            r.id === rewardId ? { ...r, _isUnlockedByTimer: true } : r
          )
        };
      }
      return p;
    }));
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center space-y-3">
          <RefreshCw className="w-10 h-10 text-[#0F7A50] animate-spin mx-auto" />
          <p className="text-slate-500 text-sm font-medium">Syncing your daily rewards...</p>
        </div>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="p-6 text-center max-w-md mx-auto mt-20">
        <div className="w-20 h-20 bg-gradient-to-tr from-slate-50 to-slate-100 rounded-full flex items-center justify-center mx-auto mb-5 border border-slate-200/50 shadow-inner">
          <Gift className="w-10 h-10 text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">No Active Plans Yet</h2>
        <p className="text-slate-500 text-sm leading-relaxed mb-6">
          Your active earnings plans will appear here. Choose one of our premium plans to start generating daily payouts.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 pb-28">
      {/* Celebration Success Modal */}
      <AnimatePresence>
        {successClaimData && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-6 text-center shadow-2xl border border-emerald-100 max-w-xs w-full relative overflow-hidden"
            >
              {/* Confetti decoration */}
              <div className="absolute inset-0 pointer-events-none">
                <Sparkles className="absolute top-4 left-6 text-yellow-400 animate-bounce w-5 h-5" />
                <Sparkles className="absolute bottom-6 right-8 text-emerald-400 animate-pulse w-4 h-4" />
                <Sparkles className="absolute top-10 right-4 text-blue-400 animate-ping w-3 h-3" />
              </div>

              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-emerald-400 shadow-lg shadow-emerald-400/20">
                <Award className="w-8 h-8 text-emerald-600" />
              </div>
              
              <h3 className="text-xl font-black text-slate-900">Success!</h3>
              <p className="text-slate-500 text-xs mt-1">Day {successClaimData.day} Reward Claimed</p>
              
              <div className="my-5 py-3 px-4 bg-emerald-50 rounded-2xl border border-emerald-100 shadow-inner">
                <p className="text-[11px] text-emerald-600 font-bold uppercase tracking-wider">Added to Wallet</p>
                <p className="text-2xl font-black text-emerald-700">{format(successClaimData.amount)}</p>
              </div>

              <p className="text-emerald-600 text-xs font-semibold bg-emerald-50 py-1.5 px-3 rounded-full inline-flex items-center gap-1.5 mb-5 border border-emerald-200">
                <CheckCircle2 size={13} /> Payment successfully collected
              </p>

              <button 
                onClick={() => setSuccessClaimData(null)}
                className="w-full py-3 bg-[#0F7A50] hover:bg-[#0c6140] text-white font-bold rounded-xl shadow-md shadow-[#0F7A50]/20 transition-all text-sm active:scale-95"
              >
                Awesome!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Daily Task Link & Timer Verification Modal */}
      <TaskVerificationModal
        isOpen={!!pendingTaskClaim}
        onClose={() => setPendingTaskClaim(null)}
        task={getTaskForDay(pendingTaskClaim?.reward?.day_number || 1, taskConfig)}
        dayNumber={pendingTaskClaim?.reward?.day_number || 1}
        rewardAmount={Number(pendingTaskClaim?.reward?.reward_amount || 0)}
        planName={pendingTaskClaim?.planName}
        isCollecting={!!collectingRewardId}
        onVerifiedCollect={() => {
          if (pendingTaskClaim?.reward) {
            handleCollect(pendingTaskClaim.reward);
          }
        }}
      />

      <div className="flex justify-between items-center gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">My Active Earnings</h2>
          <p className="text-xs text-slate-500 mt-0.5">Collect your rewards every 24 hours</p>
        </div>
        <CurrencySwitcherTrigger />
      </div>
      
      <div className="space-y-6">
        {plans.map(plan => {
          const collectedCount = plan.rewards.filter((r: any) => r.status === 'collected').length;
          const pendingCount = plan.rewards.filter((r: any) => r.status === 'pending').length;
          
          return (
            <motion.div 
              key={plan.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm"
            >
              {/* Header Info */}
              <div className="bg-[#0F7A50] p-4 text-white relative overflow-hidden">
                <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pr-4">
                  <Award size={100} />
                </div>
                <div className="relative z-10">
                  <span className="text-[10px] font-bold uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-full backdrop-blur-sm">
                    ACTIVE PLAN
                  </span>
                  <h3 className="font-bold text-lg mt-1">{plan.plan?.name || `Plan ${plan.plan?.plan_number}`}</h3>
                  <div className="flex gap-4 mt-2 text-xs text-white/80">
                    <div>
                      Daily Reward: <span className="font-bold text-white">{format(plan.plan?.daily_reward)}</span>
                    </div>
                    <div className="w-px h-3 bg-white/30 my-auto"></div>
                    <div>
                      Collected: <span className="font-bold text-white">{collectedCount} / {plan.plan?.total_days || 30} Days</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Rewards Grid Box */}
              
              {/* Requirement Check Warning */}
              {!plan.isRequirementMet && (
                <div className="bg-rose-50 px-4 py-3 border-y border-rose-100 flex items-start gap-3">
                  <div className="bg-rose-100 p-1.5 rounded-full mt-0.5 shrink-0">
                    <AlertCircle size={16} className="text-rose-600" />
                  </div>
                  <div>
                    <h4 className="text-rose-800 text-[13px] font-bold">
                      {freeRewardDays > 0
                        ? `First ${freeRewardDays} ${freeRewardDays === 1 ? 'Day' : 'Days'} Unlocked Without Referrals!`
                        : 'Referral Requirement Not Met'}
                    </h4>
                    <p className="text-rose-600 text-[11px] leading-tight mt-0.5">
                      {freeRewardDays >= (plan.plan?.total_days || 30) ? (
                        <>All {plan.plan?.total_days || 30} days of rewards are unlocked without referral requirements.</>
                      ) : freeRewardDays > 0 ? (
                        <>
                          You can collect your first <strong>{freeRewardDays} {freeRewardDays === 1 ? 'day' : 'days'}</strong> reward (Day 1 available immediately!). To unlock <strong>Days {freeRewardDays + 1}–{plan.plan?.total_days || 30}</strong>, invite <strong>{plan.plan?.members_required} active referrals</strong> who purchase a plan.
                        </>
                      ) : (
                        <>
                          You need <strong>{plan.plan?.members_required} active referrals</strong> for this plan. Invite users who purchase a plan to unlock daily collections.
                        </>
                      )}
                    </p>
                  </div>
                </div>
              )}
              
              <div className="p-4 pb-8">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-slate-800 text-[14px] flex items-center gap-1.5">
                    <Clock size={16} className="text-[#0F7A50]" />
                    Reward Calendar ({plan.plan?.total_days || 30} Days)
                  </h4>
                  <div className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg tabular-nums">
                    Rs. {collectedCount * Number(plan.plan?.daily_reward)} Collected
                  </div>
                </div>
                
                {/* 30-Day Grid */}
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 min-h-[50px]">
                  {plan.rewards.length === 0 ? (
                    <div className="col-span-full py-8 text-center text-slate-400 text-xs italic">
                      Generating reward calendar...
                    </div>
                  ) : (
                    plan.rewards.map((reward: any) => {
                      const planStartDate = new Date(plan.start_date || plan.approved_at || plan.created_at || new Date());
                      // Use (day_number - 1) so Day 1 is available immediately (0 hours wait) when plan is activated
                      const computedAvailableAt = new Date(planStartDate.getTime() + (reward.day_number - 1) * 24 * 60 * 60 * 1000);
                      const availableAt = reward.available_at
                        ? new Date(Math.min(new Date(reward.available_at).getTime(), computedAvailableAt.getTime()))
                        : computedAvailableAt;

                      const isAvailableTime = availableAt <= new Date() && reward.status === 'pending';
                      const isEligibleByReferral = plan.isRequirementMet || reward.day_number <= freeRewardDays;
                      const isAvailableNow = isAvailableTime && isEligibleByReferral;
                      const isBlockedByReferrals = isAvailableTime && !isEligibleByReferral && reward.status === 'pending';
                      const isCollected = reward.status === 'collected';

                      return (
                        <div 
                          key={reward.id} 
                          className={`p-3 rounded-2xl border flex flex-col items-center justify-between min-h-[95px] relative transition-all ${
                            isCollected 
                              ? 'bg-emerald-50/70 border-emerald-200 shadow-sm shadow-emerald-500/5' 
                              : isAvailableNow 
                                ? 'bg-white border-2 border-amber-400 shadow-md shadow-amber-400/10 ring-4 ring-amber-400/5 animate-[pulse_2s_infinite]' 
                                : isBlockedByReferrals
                                  ? 'bg-rose-50/40 border-rose-200/80'
                                  : 'bg-slate-50 border-slate-200/80'
                          }`}
                        >
                          {/* Day indicator */}
                          <span className={`text-[10px] font-black tracking-wider uppercase tabular-nums ${
                            isCollected ? 'text-emerald-700' :
                            isAvailableNow ? 'text-amber-700' :
                            isBlockedByReferrals ? 'text-rose-600' :
                            'text-slate-400'
                          }`}>
                            Day {reward.day_number}
                          </span>

                          {/* Amount */}
                          <span className={`text-[12px] font-extrabold tabular-nums ${
                            isCollected ? 'text-emerald-600' :
                            isAvailableNow ? 'text-slate-800' :
                            isBlockedByReferrals ? 'text-rose-500' :
                            'text-slate-400'
                          }`}>
                            Rs. {reward.reward_amount}
                          </span>

                          {/* Direct action / countdown indicator */}
                          <div className="w-full flex justify-center mt-1">
                            {isCollected ? (
                              <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-0.5 bg-emerald-100/60 px-1.5 py-0.5 rounded-full">
                                <CheckCircle2 size={10} strokeWidth={3} /> Paid
                              </span>
                            ) : isAvailableNow ? (
                              <button 
                                onClick={() => handleInitiateCollect(reward, plan.plan?.name || `Plan ${plan.plan?.plan_number}`)}
                                disabled={collectingRewardId === reward.id}
                                className="w-full bg-[#0F7A50] hover:bg-[#0c6140] active:scale-95 text-[10px] font-bold py-1.5 px-2 rounded-lg text-white transition-all shadow-sm shadow-[#0F7A50]/20 cursor-pointer"
                              >
                                {collectingRewardId === reward.id ? '...' : taskConfig.require_task_before_claim ? 'Task & Claim' : 'Collect'}
                              </button>
                            ) : isBlockedByReferrals ? (
                              <span className="text-[9px] font-bold text-rose-600 flex items-center gap-0.5 bg-rose-100/70 px-1.5 py-0.5 rounded-md text-center leading-tight">
                                <Lock size={9} /> Need {plan.plan?.members_required} Ref
                              </span>
                            ) : (
                              <LockedRewardCountdown 
                                availableAt={availableAt.toISOString()} 
                                onUnlock={() => handleForceUnlock(reward.id, plan.id)} 
                              />
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Legend Guidelines */}
                <div className="mt-8 border-t border-slate-100 pt-5 flex flex-wrap gap-4 text-[11px] justify-center text-slate-500 pb-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-emerald-50 border border-emerald-200 rounded"></div>
                    <span>Collected (Green)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-white border-2 border-amber-400 rounded"></div>
                    <span>Available (Gold Pulse)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-rose-50 border border-rose-200 rounded"></div>
                    <span>Referrals Needed</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-slate-50 border border-slate-200 rounded"></div>
                    <span>Timer Locked (24h)</span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
