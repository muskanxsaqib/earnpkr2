import React, { useState, useEffect, useCallback } from 'react';
import { Lock, ExternalLink, Clock, CheckCircle2, Play, Globe, MessageCircle, Send, Sparkles, Award, RefreshCw, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase, broadcastChange } from '../lib/supabase';
import { parsePlansMetaJson } from '../lib/economics';
import {
  parseDailyTasksConfig,
  getTaskForDay,
  TaskVerificationConfig,
  DEFAULT_VERIFICATION_TASKS,
  DailyVerificationTask,
} from '../lib/platformFeatures';
import { TaskVerificationModal } from '../components/TaskVerificationModal';
import { useCurrency } from '../context/CurrencyContext';

export function AdsView({ onNavigateToPackages }: { onNavigateToPackages: () => void }) {
  const { format } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [activePlans, setActivePlans] = useState<any[]>([]);
  const [readyRewards, setReadyRewards] = useState<Array<{ reward: any; planName: string; planNumber: number }>>([]);
  const [taskConfig, setTaskConfig] = useState<TaskVerificationConfig>({
    require_task_before_claim: false,
    default_timer_seconds: 15,
    tasks: DEFAULT_VERIFICATION_TASKS,
  });
  const [pendingTaskClaim, setPendingTaskClaim] = useState<{ reward: any; planName: string } | null>(null);
  const [collectingId, setCollectingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchDailyTasksData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) return;
      setUserId(user.id);

      let freeDays = 1;
      let plansMetaMap: Record<number, any> = {};
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
        settingsRows.forEach((r: any) => {
          sMap[r.setting_key] = r.setting_value;
        });
        if (sMap['free_reward_days'] !== undefined && sMap['free_reward_days'] !== '') {
          const parsed = Number(sMap['free_reward_days']);
          if (!isNaN(parsed)) freeDays = Math.max(0, Math.min(30, parsed));
        }
        if (sMap['plans_meta_json']) {
          plansMetaMap = parsePlansMetaJson(sMap['plans_meta_json']);
        }
        setTaskConfig(parseDailyTasksConfig(sMap));
      }

      // Active referrals count
      let activeRefCount = 0;
      const { data: profile } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.referral_code) {
        const { data: referred } = await supabase
          .from('profiles')
          .select('id, user_plans(status)')
          .eq('referred_by', profile.referral_code);
        if (referred) {
          activeRefCount = referred.filter((u: any) =>
            u.user_plans?.some((p: any) => p.status === 'active' || p.status === 'completed')
          ).length;
        }
      }

      const { data: userPlans } = await supabase
        .from('user_plans')
        .select('id, status, start_date, approved_at, created_at, plan:plans(id, plan_number, plan_price, daily_reward, members_required)')
        .eq('user_id', user.id)
        .order('start_date', { ascending: true });

      const list = userPlans || [];
      setActivePlans(list);

      if (list.length > 0) {
        const planIds = list.map((p: any) => p.id);
        const { data: rewardsData } = await supabase
          .from('daily_rewards')
          .select('*')
          .in('user_plan_id', planIds)
          .order('day_number', { ascending: true });

        const allRewards = rewardsData || [];
        let remainingRefs = activeRefCount;
        const claimable: Array<{ reward: any; planName: string; planNumber: number }> = [];

        list.forEach((up: any) => {
          const pInfo = Array.isArray(up.plan) ? up.plan[0] : up.plan;
          const planNum = Number(pInfo?.plan_number || 1);
          const meta = plansMetaMap[planNum] || {};
          const totalDays = Number(meta.total_days || 30);
          const planName = meta.name || `Plan ${planNum}`;
          const reqRefs = Number(pInfo?.members_required || 0);
          const isReqMet = remainingRefs >= reqRefs;
          if (isReqMet) remainingRefs -= reqRefs;
          else remainingRefs = 0;

          const startDate = new Date(up.start_date || up.approved_at || up.created_at || new Date());
          const dailyAmt = Number(pInfo?.daily_reward || 20);

          for (let d = 1; d <= totalDays; d++) {
            const existing = allRewards.find((r: any) => r.user_plan_id === up.id && r.day_number === d);
            const rewardObj = existing || {
              id: `virtual_${up.id}_${d}`,
              user_plan_id: up.id,
              user_id: user.id,
              day_number: d,
              status: 'pending',
              reward_amount: dailyAmt,
            };

            if (rewardObj.status === 'pending') {
              const computedAvail = new Date(startDate.getTime() + (d - 1) * 24 * 60 * 60 * 1000);
              const availAt = rewardObj.available_at
                ? new Date(Math.min(new Date(rewardObj.available_at).getTime(), computedAvail.getTime()))
                : computedAvail;
              const isTimeReady = availAt <= new Date();
              const isRefReady = isReqMet || d <= freeDays;

              if (isTimeReady && isRefReady) {
                claimable.push({ reward: rewardObj, planName, planNumber: planNum });
              }
            }
          }
        });

        setReadyRewards(claimable);
      } else {
        setReadyRewards([]);
      }
    } catch (e) {
      console.error('Error loading Daily Tasks:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDailyTasksData();
  }, [fetchDailyTasksData]);

  const handleVerifiedCollect = async (reward: any) => {
    if (collectingId) return;
    try {
      setCollectingId(reward.id);
      if (String(reward.id).startsWith('virtual_')) {
        const { error } = await supabase.from('daily_rewards').upsert(
          {
            user_plan_id: reward.user_plan_id,
            user_id: reward.user_id,
            day_number: reward.day_number,
            reward_amount: reward.reward_amount,
            status: 'collected',
            collected_at: new Date().toISOString(),
            available_at: new Date().toISOString(),
          },
          { onConflict: 'user_plan_id,day_number' }
        );
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('daily_rewards')
          .update({ status: 'collected', collected_at: new Date().toISOString() })
          .eq('id', reward.id)
          .eq('status', 'pending');
        if (error) throw error;
      }

      if (userId) {
        const { data: prof } = await supabase.from('profiles').select('balance').eq('id', userId).maybeSingle();
        const nextBal = (Number(prof?.balance) || 0) + Number(reward.reward_amount || 0);
        await supabase.from('profiles').update({ balance: nextBal }).eq('id', userId);
      }

      await broadcastChange('daily_rewards', 'collect', { rewardId: reward.id, userId });
      setSuccessMsg(`Day ${reward.day_number} Task Verified! ${format(reward.reward_amount)} aap ke wallet mein jama ho gaye.`);
      setPendingTaskClaim(null);
      fetchDailyTasksData();
    } catch (err: any) {
      alert('Failed to claim task reward: ' + err.message);
    } finally {
      setCollectingId(null);
    }
  };

  const renderTaskCategoryIcon = (cat: DailyVerificationTask['category']) => {
    switch (cat) {
      case 'youtube':
        return <Play size={16} className="text-rose-600" />;
      case 'whatsapp':
        return <MessageCircle size={16} className="text-emerald-600" />;
      case 'telegram':
        return <Send size={16} className="text-sky-600" />;
      case 'tiktok':
        return <Sparkles size={16} className="text-purple-600" />;
      default:
        return <Globe size={16} className="text-indigo-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-80">
        <RefreshCw className="w-8 h-8 text-[#0F7A50] animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 space-y-5 pb-24"
    >
      <TaskVerificationModal
        isOpen={!!pendingTaskClaim}
        onClose={() => setPendingTaskClaim(null)}
        task={getTaskForDay(pendingTaskClaim?.reward?.day_number || 1, taskConfig)}
        dayNumber={pendingTaskClaim?.reward?.day_number || 1}
        rewardAmount={Number(pendingTaskClaim?.reward?.reward_amount || 0)}
        planName={pendingTaskClaim?.planName}
        isCollecting={!!collectingId}
        onVerifiedCollect={() => {
          if (pendingTaskClaim?.reward) {
            handleVerifiedCollect(pendingTaskClaim.reward);
          }
        }}
      />

      <div className="pt-1 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Daily Tasks</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {taskConfig.require_task_before_claim
              ? 'Watch partner links & complete countdown timer to claim daily plan rewards'
              : 'Complete tasks daily to boost your earnings'}
          </p>
        </div>
        {activePlans.length > 0 && (
          <span className="text-xs font-mono font-bold text-[#0F7A50] tabular-nums">
            {readyRewards.length} Ready
          </span>
        )}
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {activePlans.length === 0 ? (
        <div className="bg-white rounded-[20px] p-8 shadow-sm border border-slate-100 flex flex-col items-center text-center">
          <div className="w-14 h-14 bg-[#e8f3ef] rounded-full flex items-center justify-center mb-4">
            <Lock size={24} className="text-[#0F7A50]" strokeWidth={2} />
          </div>

          <h3 className="text-slate-800 font-bold text-lg mb-1">No active package</h3>
          <p className="text-slate-500 text-sm font-medium mb-6 max-w-sm">
            Buy a package to start earning from daily tasks!
          </p>

          <button
            type="button"
            onClick={onNavigateToPackages}
            className="bg-[#0F7A50] hover:bg-[#0c6140] text-white font-semibold py-2.5 px-6 rounded-xl transition-colors text-sm shadow-sm cursor-pointer"
          >
            Buy Package
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {readyRewards.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-800">All Unlocked Daily Rewards Collected!</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Aap aaj ka unlocked daily reward collect kar chuke hain. Agla reward 24 hours timer mukammal hone par unlock hoga.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {readyRewards.map((item) => {
                const task = getTaskForDay(item.reward.day_number, taskConfig);
                return (
                  <div
                    key={item.reward.id}
                    className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0">
                        {taskConfig.require_task_before_claim ? (
                          renderTaskCategoryIcon(task.category)
                        ) : (
                          <Award size={18} className="text-[#0F7A50]" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
                          <span>{item.planName}</span>
                          <span>·</span>
                          <span>Day {item.reward.day_number}</span>
                          {taskConfig.require_task_before_claim && (
                            <>
                              <span>·</span>
                              <span className="font-mono tabular-nums flex items-center gap-1 text-amber-600">
                                <Clock size={12} /> {task.timer_seconds}s Timer
                              </span>
                            </>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-slate-900">
                          {taskConfig.require_task_before_claim
                            ? task.title
                            : `${item.planName} — Day ${item.reward.day_number} Daily Reward`}
                        </h4>
                        <p className="text-xs font-mono font-extrabold text-[#0F7A50] tabular-nums">
                          Reward: {format(item.reward.reward_amount)}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (taskConfig.require_task_before_claim) {
                          setPendingTaskClaim({ reward: item.reward, planName: item.planName });
                        } else {
                          handleVerifiedCollect(item.reward);
                        }
                      }}
                      className="px-4 py-2.5 rounded-xl bg-[#0F7A50] hover:bg-[#0c6140] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer shrink-0"
                    >
                      {taskConfig.require_task_before_claim ? (
                        <>
                          <ShieldCheck size={15} />
                          <span>Verify Task &amp; Claim {format(item.reward.reward_amount)}</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={15} />
                          <span>Collect {format(item.reward.reward_amount)}</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Official Partner Tasks Directory (Only shown when Task Verification is turned ON by Admin) */}
      {taskConfig.require_task_before_claim && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Active Platform Verification Links</h3>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              {taskConfig.tasks.filter((t) => t.is_active).length} Tasks
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {taskConfig.tasks
              .filter((t) => t.is_active)
              .map((t, i) => (
                <div key={t.id} className="py-3 first:pt-1 last:pb-1 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center shrink-0">
                      {renderTaskCategoryIcon(t.category)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{t.title}</p>
                      <p className="text-[11px] text-slate-500 font-mono tabular-nums">
                        Step {i + 1} · Watch {t.timer_seconds}s
                      </p>
                    </div>
                  </div>
                  <a
                    href={t.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 shrink-0"
                  >
                    <ExternalLink size={12} /> Visit
                  </a>
                </div>
              ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
