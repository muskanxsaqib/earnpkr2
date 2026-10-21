import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Trophy, Users, Sparkles, CheckCircle2 } from 'lucide-react';
import { supabase, broadcastChange } from '../lib/supabase';
import { TEAM_REWARD_LEVELS, getRewardLevels } from '../lib/rewardLevels';
import { useCurrency } from '../context/CurrencyContext';

export function TeamSalaryView({ onBack }: { onBack: () => void }) {
  const { format } = useCurrency();
  const [currentTeam, setCurrentTeam] = useState(0);
  const [claimedLevels, setClaimedLevels] = useState<number[]>([]);
  const [isCollecting, setIsCollecting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [referralBonus, setReferralBonus] = useState(50);
  const [rewardLevels, setRewardLevels] = useState<any[]>(TEAM_REWARD_LEVELS);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);

          // Fetch all app settings at once
          let refBonus = 50;
          let settingsMap: Record<string, string> = {};
          try {
            const { data: settingsData } = await supabase
              .from('app_settings')
              .select('*');
            if (settingsData) {
              settingsData.forEach(s => {
                settingsMap[s.setting_key] = s.setting_value;
              });
              if (settingsMap['referral_bonus']) {
                refBonus = Number(settingsMap['referral_bonus']) || 50;
              }
            }
          } catch (err) {
            console.error('Error fetching app settings:', err);
          }
          setReferralBonus(refBonus);
          
          const resolvedLevels = getRewardLevels(settingsMap, refBonus);
          setRewardLevels(resolvedLevels);
          
          // Fetch claims
          const { data: collections } = await supabase
            .from('weekly_salary_collections')
            .select('level')
            .eq('user_id', user.id);
            
          if (collections) {
            setClaimedLevels(collections.map(c => c.level));
          }

          const { data: profile } = await supabase.from('profiles').select('referral_code').eq('id', user.id).maybeSingle();
          if (profile?.referral_code) {
            // Fetch active members
            const { data: members } = await supabase
              .from('profiles')
              .select('id, user_plans(status)')
              .eq('referred_by', profile.referral_code);
            
            if (members) {
              const activeMembers = members.filter(m => 
                m.user_plans?.some((p: any) => p.status === 'active' || p.status === 'completed')
              );
              setCurrentTeam(activeMembers.length);
            }
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchData();

    const channel = supabase
      .channel('salary-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'weekly_salary_collections' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleCollectReward = async (levelIdx: number, amount: number) => {
    if (!userId || isCollecting) return;
    
    if (claimedLevels.includes(levelIdx)) {
      alert("You have already collected this reward!");
      return;
    }

    try {
      setIsCollecting(true);

      // Record collection (this acts as a one-time milestone claim due to unique constraint)
      const { error: insertError } = await supabase.from('weekly_salary_collections').insert({
        user_id: userId,
        level: levelIdx,
        amount: amount
      });

      if (insertError) {
        if (insertError.code === '23505') {
          alert("You have already collected this reward!");
          setClaimedLevels(prev => [...prev, levelIdx]);
        } else {
          throw insertError;
        }
      } else {
        // Update user balance
        const { data: profile } = await supabase.from('profiles').select('balance').eq('id', userId).single();
        if (profile) {
          const newBalance = (Number(profile.balance) || 0) + amount;
          await supabase.from('profiles').update({ balance: newBalance }).eq('id', userId);
        }

        await broadcastChange('weekly_salary_collections', 'insert', { userId, level: levelIdx, amount });
        
        setClaimedLevels(prev => [...prev, levelIdx]);
        alert(`Successfully collected ${format(amount)} for Level ${levelIdx}!`);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to collect reward. Please try again.");
    } finally {
      setIsCollecting(false);
    }
  };

  const activeLevelObj = rewardLevels.slice().reverse().find(l => currentTeam >= l.req);
  const currentLevel = activeLevelObj?.level || 0;
  const currentSalary = activeLevelObj ? (activeLevelObj.req * referralBonus).toLocaleString() : '0';
  const nextLevel = rewardLevels.find(l => currentTeam < l.req);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="min-h-full bg-slate-50 p-4 pb-24"
    >
      <div className="pt-2 mb-6">
        <button onClick={onBack} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors mb-4">
          <ArrowLeft size={18} />
          <span className="text-[13px] font-medium">Back</span>
        </button>
        <div className="flex items-center justify-between gap-2 text-slate-800">
          <div className="flex items-center gap-2">
            <Trophy size={22} className="text-orange-500" />
            <h2 className="text-[20px] font-bold">Team Salary System</h2>
          </div>
        </div>
      </div>

      <div className="bg-[#1e1b4b] rounded-3xl p-6 text-white mb-6 shadow-lg shadow-indigo-900/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none"></div>
        
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full mb-4 border border-white/10">
            <Sparkles size={14} className="text-purple-300" />
            <span className="text-[11px] font-bold tracking-wider text-purple-100 uppercase">Team Milestones</span>
          </div>

          <p className="text-sm text-indigo-200 mb-1 font-medium">Active Team Members</p>
          <div className="text-[42px] font-black leading-none mb-6 text-white drop-shadow-md">
            {currentTeam}
          </div>

          <div className="flex gap-3 mb-5">
            <div className="flex-1 bg-white/10 rounded-2xl p-4 border border-white/5">
              <p className="text-[10px] font-bold text-indigo-200 uppercase mb-1">Current Level</p>
              <p className="text-xl font-bold text-white">L{currentLevel}</p>
            </div>
            <div className="flex-1 bg-white/10 rounded-2xl p-4 border border-white/5">
              <p className="text-[10px] font-bold text-indigo-200 uppercase mb-1">Max Reward Unlocked</p>
              <p className="text-xl font-bold text-white">PKR {currentSalary}</p>
            </div>
          </div>

          {nextLevel ? (
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 text-center">
              <p className="text-[11px] font-bold text-indigo-200 uppercase mb-2">Reach Level {nextLevel.level} to Unlock</p>
              <div className="w-full py-2.5 bg-white/10 rounded-xl text-[13px] font-medium text-white/80">
                Complete {nextLevel.req} active team members
              </div>
            </div>
          ) : (
             <div className="bg-emerald-500/20 rounded-2xl p-4 border border-emerald-500/30 text-center">
              <p className="text-[11px] font-bold text-emerald-200 uppercase mb-1">Maximum Level Reached</p>
              <div className="w-full py-2 bg-emerald-500/20 rounded-xl text-[13px] font-bold text-emerald-100">
                You are a top earner!
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-[13px] font-bold text-slate-500 uppercase tracking-wider mb-3 px-1">Salary Levels</h3>
        <div className="space-y-3">
          {rewardLevels.map((level, index) => {
            const prevReq = index === 0 ? 0 : rewardLevels[index - 1].req;
            const levelGoal = level.req - prevReq;
            const levelActive = Math.max(0, Math.min(currentTeam - prevReq, levelGoal));
            const progress = (levelActive / levelGoal) * 100;
            const remaining = level.req - currentTeam;
            const isUnlocked = remaining <= 0;
            const isClaimed = claimedLevels.includes(level.level);
            
            return (
              <div key={level.level} className={`${level.color} rounded-2xl p-4 text-white shadow-sm overflow-hidden relative`}>
                <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 ${level.iconBg} rounded-full flex items-center justify-center shrink-0`}>
                        <Users size={24} className="text-white" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-white/80 uppercase tracking-wider mb-0.5">Level {level.level}</p>
                        <span className="text-[22px] font-black drop-shadow-sm leading-none">{level.req} TEAM</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-white/80 uppercase mb-0.5">Reward</p>
                      <p className="text-[20px] font-black drop-shadow-sm">{format(level.req * referralBonus)}</p>
                    </div>
                  </div>
                  
                  <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden mb-3">
                    <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                  </div>
                  
                  <div className="flex justify-between items-center text-[11px] font-semibold text-white/90 mb-3">
                    <span>{levelActive} / {levelGoal} active members</span>
                    <span>{isUnlocked ? 'Unlocked' : `${remaining} more to unlock`}</span>
                  </div>
                  
                  {isUnlocked && (
                    isClaimed ? (
                      <div className="mt-3 w-full bg-white/20 text-white font-bold py-2.5 rounded-xl text-[13px] flex items-center justify-center gap-2 border border-white/20">
                        <CheckCircle2 size={16} />
                        Reward Claimed
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleCollectReward(level.level, level.req * referralBonus)}
                        disabled={isCollecting}
                        className="mt-3 w-full bg-white text-slate-800 font-bold py-2.5 rounded-xl text-[13px] active:scale-95 transition-transform shadow-sm"
                      >
                        {isCollecting ? 'Collecting...' : 'Collect Reward'}
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
