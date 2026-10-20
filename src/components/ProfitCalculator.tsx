import React, { useState, useEffect } from 'react';
import { Calculator, Users, Calendar, Award, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { INVESTMENT_PLANS as fallbackPlans } from '../data';
import { parsePlansMetaJson, mergePlanWithMeta } from '../lib/economics';

export function ProfitCalculator() {
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [referralBonusRate, setReferralBonusRate] = useState(50);
  const [extraReferrals, setExtraReferrals] = useState(0);

  useEffect(() => {
    const fetchLivePlans = async () => {
      let refBonus = 50;
      let baseMemberPrice = 250;
      let plansMetaMap: Record<number, any> = {};
      try {
        const { data: settingsRows } = await supabase
          .from('app_settings')
          .select('setting_key, setting_value')
          .in('setting_key', ['referral_bonus', 'base_member_plan_price', 'plans_meta_json']);
        if (settingsRows) {
          const sMap: Record<string, string> = {};
          settingsRows.forEach(r => { sMap[r.setting_key] = r.setting_value; });
          if (sMap['referral_bonus']) refBonus = Number(sMap['referral_bonus']) || 50;
          if (sMap['base_member_plan_price']) baseMemberPrice = Number(sMap['base_member_plan_price']) || 250;
          if (sMap['plans_meta_json']) plansMetaMap = parsePlansMetaJson(sMap['plans_meta_json']);
        }
      } catch (e) {
        console.warn('ProfitCalculator settings fetch warning:', e);
      }
      setReferralBonusRate(refBonus);

      try {
        const { data: plansData } = await supabase
          .from('plans')
          .select('*')
          .order('plan_number', { ascending: true });
        if (plansData && plansData.length > 0) {
          const enriched = plansData
            .map((p, idx) => mergePlanWithMeta(p, idx, plansMetaMap, refBonus, baseMemberPrice))
            .filter(p => p.is_active !== false);
          if (enriched.length > 0) {
            setPlans(enriched);
            return;
          }
        }
      } catch (e) {
        console.warn('ProfitCalculator plans fetch warning:', e);
      }

      // Fallback
      setPlans(
        fallbackPlans.map((fp, idx) => ({
          plan_number: idx + 1,
          name: fp.name,
          plan_price: fp.investAmount,
          daily_reward: fp.dailyReturn,
          total_days: fp.totalDays,
          thirty_day_reward: fp.dailyReturn * fp.totalDays,
          members_required: fp.requiredReferrals,
          user_total_reward: (fp.dailyReturn * fp.totalDays) + (fp.requiredReferrals * refBonus)
        }))
      );
    };

    fetchLivePlans();

    const channelName = `profit-calc-sync-${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plans' }, fetchLivePlans)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, fetchLivePlans)
      .on('broadcast', { event: 'db_change' }, fetchLivePlans)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const activeList = plans.length > 0 ? plans : fallbackPlans.map((fp, idx) => ({
    plan_number: idx + 1,
    name: fp.name,
    plan_price: fp.investAmount,
    daily_reward: fp.dailyReturn,
    total_days: fp.totalDays,
    thirty_day_reward: fp.dailyReturn * fp.totalDays,
    members_required: fp.requiredReferrals,
    user_total_reward: (fp.dailyReturn * fp.totalDays) + (fp.requiredReferrals * referralBonusRate)
  }));

  const safeIdx = Math.min(selectedIdx, activeList.length - 1);
  const currentPlan = activeList[safeIdx] || activeList[0];

  const planPrice = Number(currentPlan?.plan_price || 250);
  const dailyReward = Number(currentPlan?.daily_reward || 20);
  const totalDays = Number(currentPlan?.total_days || 30);
  const cycleReward = Number(currentPlan?.thirty_day_reward || (dailyReward * totalDays));
  const reqMembers = Number(currentPlan?.members_required || 3);
  const totalMembers = reqMembers + extraReferrals;
  const referralBonus = totalMembers * referralBonusRate;
  const totalUserPayout = cycleReward + referralBonus;

  return (
    <div className="rgb-container shadow-md">
      <div className="bg-white rounded-[22px] p-5 w-full h-full">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-[#0F7A50] rounded-lg">
              <Calculator size={18} />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-slate-800 leading-tight">Live Plan Profit Calculator</h3>
              <p className="text-[11px] text-slate-400">Synced with official platform plans & referral rules</p>
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-[#0F7A50] px-2.5 py-1 rounded-lg border border-emerald-100">
            +{referralBonusRate} PKR / Invite
          </span>
        </div>

        <div className="space-y-4">
          {/* Plan Selector Pills */}
          <div>
            <div className="flex justify-between text-[12px] font-semibold mb-2">
              <span className="text-slate-500">Select Plan</span>
              <span className="text-[#0F7A50] font-bold">
                {currentPlan?.name || `Plan ${currentPlan?.plan_number}`} — Rs. {planPrice.toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max={Math.max(0, activeList.length - 1)}
              step="1"
              value={safeIdx}
              onChange={(e) => setSelectedIdx(Number(e.target.value))}
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#0F7A50]"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-medium mt-1">
              <span>{activeList[0]?.name || 'Plan 1'} (Rs. {Number(activeList[0]?.plan_price || 250).toLocaleString()})</span>
              <span>{activeList[activeList.length - 1]?.name || 'Max Plan'} (Rs. {Number(activeList[activeList.length - 1]?.plan_price || 5000).toLocaleString()})</span>
            </div>
          </div>

          {/* Extra Referrals Slider */}
          <div>
            <div className="flex justify-between text-[12px] font-semibold mb-1.5">
              <span className="text-slate-500 flex items-center gap-1">
                <Users size={13} className="text-indigo-500" />
                Invited Active Members (Min {reqMembers} req.)
              </span>
              <span className="text-indigo-600 font-bold tabular-nums">
                {totalMembers} Members (+Rs. {referralBonus.toLocaleString()})
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="30"
              step="1"
              value={extraReferrals}
              onChange={(e) => setExtraReferrals(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>

          {/* Breakdown Grid */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
              <p className="text-[10px] text-slate-400 font-semibold uppercase mb-0.5">Daily Return</p>
              <p className="text-[14px] font-black text-[#0F7A50] tabular-nums">Rs. {dailyReward.toLocaleString()}</p>
              <p className="text-[9px] text-slate-400">for {totalDays} days</p>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
              <p className="text-[10px] text-slate-400 font-semibold uppercase mb-0.5">{totalDays}-Day Reward</p>
              <p className="text-[14px] font-black text-slate-800 tabular-nums">Rs. {cycleReward.toLocaleString()}</p>
              <p className="text-[9px] text-slate-400">Daily × {totalDays}</p>
            </div>
            <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100 text-center">
              <p className="text-[10px] text-emerald-700 font-semibold uppercase mb-0.5">Total Payout</p>
              <p className="text-[14px] font-black text-[#0F7A50] tabular-nums">Rs. {totalUserPayout.toLocaleString()}</p>
              <p className="text-[9px] text-emerald-600 font-medium">incl. Rs. {referralBonus} bonus</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
