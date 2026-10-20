import React, { useState, useEffect } from 'react';
import { Copy, Share2, Users, Wallet, TrendingUp, Lock, Trophy, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase, broadcastChange } from '../lib/supabase';
import { TEAM_REWARD_LEVELS, getRewardLevels } from '../lib/rewardLevels';
import { fetchCurrentUserProfile } from '../lib/userProfile';
import { CheckCircle2 } from 'lucide-react';

export function InviteView() {
  const [profile, setProfile] = useState<any>(null);
  const [totalTeamMembers, setTotalTeamMembers] = useState(0);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [activeAccounts, setActiveAccounts] = useState(0);

  const [claimedLevels, setClaimedLevels] = useState<number[]>([]);
  const [isCollecting, setIsCollecting] = useState(false);
  const [referralBonus, setReferralBonus] = useState(50);
  const [inviteShareTemplate, setInviteShareTemplate] = useState('');
  const [rewardLevels, setRewardLevels] = useState<any[]>(TEAM_REWARD_LEVELS);


  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
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
              if (settingsMap['invite_share_message']) {
                setInviteShareTemplate(settingsMap['invite_share_message']);
              }
            }
          } catch (err) {
            console.error('Error fetching app settings:', err);
          }
          setReferralBonus(refBonus);

          const resolvedLevels = getRewardLevels(settingsMap, refBonus);
          setRewardLevels(resolvedLevels);

          const profileData = await fetchCurrentUserProfile();

          
          if (profileData) {
            // Fetch claims
            const { data: collections } = await supabase
              .from('weekly_salary_collections')
              .select('level')
              .eq('user_id', profileData.id);
            if (collections) setClaimedLevels(collections.map(c => c.level));

            setProfile(profileData);
            
            // Get total members referred by this user
            const { data: members } = await supabase
              .from('profiles')
              .select('id, username, email, created_at, user_plans(status)')
              .eq('referred_by', profileData.referral_code)
              .order('created_at', { ascending: false });
              
            if (members) {
              setTotalTeamMembers(members.length);
              
              const processedMembers = members.map(m => {
                const hasActivePlan = m.user_plans?.some((p: any) => p.status === 'active') || false;
                return {
                  ...m,
                  isActive: hasActivePlan
                };
              });
              
              setTeamMembers(processedMembers);
              setActiveAccounts(processedMembers.filter(m => m.isActive).length);
            }
          }
        }
      } catch (e) {
        console.error(e);
      }
    };

    
    fetchData();

    // Setup real-time subscriptions for referrals
    const channel = supabase
      .channel('invite-realtime-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_plans' },
        () => {
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'weekly_salary_collections' },
        () => {
          fetchData();
        }
      )
      .on(
        'broadcast',
        { event: 'db_change' },
        (payload) => {
          console.log('Invite view received real-time broadcast sync:', payload);
          fetchData();
        }
      )
      .subscribe();

    // Setup background auto-polling every 60 seconds as fallback
    const intervalId = setInterval(fetchData, 600000); // Refresh every 10 minutes

    return () => {
      clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, []);

  const referralCode = profile?.referral_code || '---';
  const referralLink = `${window.location.origin}?ref=${referralCode}`;

  const getFormattedShareMessage = () => {
    const uname = profile?.username || 'Your friend';
    if (inviteShareTemplate && inviteShareTemplate.trim()) {
      return inviteShareTemplate
        .replace(/\{username\}/g, uname)
        .replace(/\{link\}/g, referralLink)
        .replace(/\{code\}/g, referralCode);
    }
    return `🚀 ${uname} invited you to join Earning Hub and earn daily rewards! Plus Rs. ${referralBonus} referral bonus! 👇 Click the link below to join:\n${referralLink}`;
  };

  const copyToClipboard = () => {
    const shareText = getFormattedShareMessage();
    navigator.clipboard.writeText(shareText);
    alert('Link copied to clipboard!');
  };


  const handleCollectReward = async (levelIdx: number, amount: number) => {
    if (!profile || isCollecting) return;
    
    if (claimedLevels.includes(levelIdx)) {
      alert("You have already collected this reward!");
      return;
    }

    try {
      setIsCollecting(true);
      const { error: insertError } = await supabase.from('weekly_salary_collections').insert({
        user_id: profile.id,
        level: levelIdx,
        amount: amount
      });

      if (insertError) {
        if (insertError.code === '23505') {
          alert("You have already collected this reward!");
          setClaimedLevels(prev => [...prev, levelIdx]);
        } else throw insertError;
      } else {
        const { data: p } = await supabase.from('profiles').select('balance').eq('id', profile.id).single();
        if (p) {
          await supabase.from('profiles').update({ balance: (Number(p.balance) || 0) + amount }).eq('id', profile.id);
        }
        await broadcastChange('weekly_salary_collections', 'insert', { userId: profile.id, level: levelIdx, amount });
        setClaimedLevels(prev => [...prev, levelIdx]);
        alert(`Successfully collected Rs. ${amount} for Level ${levelIdx}!`);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to collect reward.");
    } finally {
      setIsCollecting(false);
    }
  };

  const shareLink = () => {
    const shareText = getFormattedShareMessage();
    if (navigator.share) {
      navigator.share({
        title: 'Join Earning Hub',
        text: shareText,
        url: referralLink,
      }).catch((error) => console.log('Error sharing', error));
    } else {
      navigator.clipboard.writeText(shareText);
      alert('Referral text copied to clipboard!');
    }
  };

  const [totalReferralCommission, setTotalReferralCommission] = useState(0);

  useEffect(() => {
    const fetchCommission = async () => {
      if (profile?.id) {
        const { data } = await supabase
          .from('referral_collections')
          .select('amount')
          .eq('referrer_id', profile.id);
        
        if (data) {
          const total = data.reduce((sum, rc) => sum + Number(rc.amount), 0);
          setTotalReferralCommission(total);
        }
      }
    };
    fetchCommission();
  }, [profile?.id, teamMembers]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15, scale: 0.95 }}

      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="p-4 space-y-4 pb-12"
    >
      <div className="pt-1 mb-2 flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Invite Friends</h2>
        <div className="flex items-center gap-1.5 bg-emerald-50 text-[#0F7A50] border border-emerald-100 px-2.5 py-1 rounded-full text-[11px] font-semibold">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Auto Update Active
        </div>
      </div>

      {/* Responsive Grid Wrapper for Invite View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (Referral Code, Sharing, Team members list) */}
        <div className="lg:col-span-6 space-y-4">
          {/* Referral Code Banner */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rgb-container shadow-lg"
          >
            <div className="bg-[#0F7A50] rounded-[22px] p-6 text-center w-full h-full relative overflow-hidden">
              <p className="text-emerald-50 text-[11px] font-semibold tracking-wide uppercase mb-2 relative z-10">Your Referral Code</p>
              <h1 className="text-4xl font-bold text-white tracking-widest mb-3 relative z-10">{referralCode}</h1>
              <p className="text-[13px] text-white/90 font-medium relative z-10">Earn Rs. {referralBonus} bonus on every active referral's package purchase</p>
            </div>
          </motion.div>

          {/* Share Link */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rgb-container shadow-md"
          >
            <div className="bg-white rounded-[22px] p-4 w-full h-full">
              <p className="text-[13px] text-slate-600 mb-2 font-medium">Referral Link</p>
              <div className="flex gap-2 mb-3">
                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 flex items-center overflow-hidden">
                  <span className="text-[13px] font-medium text-slate-700 truncate">{profile ? referralLink : 'Loading...'}</span>
                </div>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={copyToClipboard}
                  className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-slate-600 transition-colors"
                >
                  <Copy size={18} />
                </motion.button>
              </div>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={shareLink}
                className="w-full bg-[#0F7A50] hover:bg-[#0c6140] text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <Share2 size={18} />
                Share Link
              </motion.button>
            </div>
          </motion.div>

          {/* Team Members List */}
          {teamMembers.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rgb-container shadow-md"
            >
              <div className="bg-white rounded-[22px] p-5 w-full h-full">
                <h3 className="font-bold text-slate-800 mb-4 text-base">Your Invited Members</h3>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {teamMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50">
                      <div>
                        <p className="font-semibold text-slate-800 text-[13px]">{member.username}</p>
                        <p className="text-[11px] text-slate-500">{new Date(member.created_at).toLocaleDateString()}</p>
                      </div>
                      <div>
                        {member.isActive ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                            Active
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-[10px] font-bold border border-red-200">
                            Inactive
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Right Column (Stats overview & Reward levels) */}
        <div className="lg:col-span-6 space-y-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: 'Total Team Members', value: totalTeamMembers.toString(), icon: Users, color: 'text-[#0F7A50]', bg: 'bg-[#e8f3ef]' },
              { label: 'Active Accounts', value: activeAccounts.toString(), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Total Team Deposits', value: '0.00 PKR', icon: Wallet, color: 'text-[#0F7A50]', bg: 'bg-[#e8f3ef]' },
              { label: 'Total Referral Commission', value: `${totalReferralCommission} PKR`, icon: TrendingUp, color: 'text-[#0F7A50]', bg: 'bg-[#e8f3ef]' },
            ].map((stat, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + (idx * 0.05) }}
                className="rgb-container shadow-sm"
              >
                <div className="bg-white rounded-[22px] p-4 flex items-center justify-between w-full h-full">
                  <div className="flex items-center gap-3 text-slate-700">
                    <div className={`w-10 h-10 ${stat.bg} rounded-full flex items-center justify-center`}>
                      <stat.icon size={18} className={stat.color} />
                    </div>
                    <span className="text-[13px] font-medium">{stat.label}</span>
                  </div>
                  <span className="font-bold text-slate-800 text-[15px]">{stat.value}</span>
                </div>
              </motion.div>
            ))}
          </div>

      {/* Rewards Levels */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="rgb-container shadow-md"
      >
        <div className="bg-gradient-to-b from-[#4A329A] to-[#6A41B6] rounded-[22px] p-5 w-full h-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center border border-white/20">
              <Trophy className="text-yellow-400" size={20} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-yellow-400">Exclusive Offer</p>
              <h3 className="text-xl font-bold text-white tracking-tight">Team Salary Levels</h3>
            </div>
          </div>

          <div className="bg-white/10 rounded-2xl p-4 mb-6 border border-white/10">
            <p className="text-[11px] font-medium text-white/80 mb-0.5">Active Team Members</p>
            <p className="text-2xl font-bold text-yellow-400">{activeAccounts}</p>
          </div>

          <div className="space-y-3">
             {rewardLevels.map((lvl, index) => {
              const prevReq = index === 0 ? 0 : rewardLevels[index - 1].req;
              const lvlGoal = lvl.req - prevReq;
              const lvlActive = Math.max(0, Math.min(activeAccounts - prevReq, lvlGoal));
              const isUnlocked = activeAccounts >= lvl.req;
              const isClaimed = claimedLevels.includes(lvl.level);
              const lvlRewardAmount = lvl.req * referralBonus;
              return (
              <motion.div 
                key={lvl.level}
                className="bg-white/10 rounded-2xl p-4 border border-white/10 relative overflow-hidden"
              >
                {isClaimed && <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none"></div>}
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 ${isClaimed ? 'bg-emerald-400' : 'bg-yellow-400'} text-[#4A329A] font-bold rounded-full flex items-center justify-center text-sm`}>
                      {lvl.level}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-white/70 tracking-wider">LEVEL {lvl.level}</p>
                      <p className="text-[13px] font-bold text-white">{lvl.req} Active Members</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${isClaimed ? 'text-emerald-400' : 'text-yellow-400'}`}>Rs. {lvlRewardAmount.toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="mb-2">
                  <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden mb-1.5">
                    <div className={`h-full ${isClaimed ? 'bg-emerald-400' : 'bg-yellow-400'} rounded-full`} style={{ width: `${(lvlActive / lvlGoal) * 100}%` }}></div>
                  </div>
                  <p className="text-[11px] text-white/80 font-medium">{lvlActive} / {lvlGoal} Members</p>
                </div>
                
                {isUnlocked ? (
                  isClaimed ? (
                    <div className="w-full bg-emerald-500/20 text-emerald-300 py-2.5 rounded-xl text-[13px] font-bold flex items-center justify-center gap-2 border border-emerald-500/30">
                      <CheckCircle2 size={16} />
                      Reward Claimed
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleCollectReward(lvl.level, lvlRewardAmount)}
                      disabled={isCollecting}
                      className="w-full bg-yellow-400 hover:bg-yellow-300 text-[#4A329A] font-bold py-2.5 rounded-xl text-[13px] transition-colors active:scale-95 shadow-sm"
                    >
                      {isCollecting ? 'Collecting...' : 'Collect Reward'}
                    </button>
                  )
                ) : (
                  <button disabled className="w-full bg-white/20 text-white/60 py-2.5 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2 cursor-not-allowed">
                    <Lock size={14} />
                    Locked
                  </button>
                )}
              </motion.div>
            )})}
          </div>
        </div>
      </motion.div>

      {/* How it works */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rgb-container shadow-sm"
      >
        <div className="bg-white rounded-[22px] p-5 w-full h-full">
          <h3 className="font-bold text-slate-800 mb-4 text-base">How it works</h3>
          <ol className="space-y-3 text-[13px] text-slate-600 font-medium">
            <li className="flex gap-2">
              <span className="text-[#0F7A50]">1.</span> 
              <span>Share your referral link with friends</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#0F7A50]">2.</span> 
              <span>They sign up and buy a package</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#0F7A50]">3.</span> 
              <span>You earn <span className="text-[#0F7A50] font-bold">10% commission</span> on their package purchase</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#0F7A50]">4.</span> 
              <span>Unlock <span className="text-[#0F7A50] font-bold">Cash Rewards</span> as your team grows!</span>
            </li>
          </ol>
        </div>
      </motion.div>

      {/* Referral Policy */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="rgb-container shadow-sm"
      >
        <div className="bg-white rounded-[22px] p-5 w-full h-full">
          <div className="flex items-center gap-2 mb-4">
            <Info size={18} className="text-[#0F7A50]" />
            <h3 className="font-bold text-slate-800 text-base">Referral Policy</h3>
          </div>
          <ul className="space-y-4 text-[13px] text-slate-600 font-medium">
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#0F7A50] mt-1.5 shrink-0"></div>
              <span>You earn only when your referred user <span className="text-slate-800 font-bold">purchases a package</span>.</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#0F7A50] mt-1.5 shrink-0"></div>
              <span>On every paid package purchase, you receive <span className="text-[#0F7A50] font-bold">10% commission</span> of the package amount.</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#0F7A50] mt-1.5 shrink-0"></div>
              <span>Free Package gives <span className="text-slate-800 font-bold">no percentage commission</span>. Instead, you earn a fixed <span className="text-[#0F7A50] font-bold">2 PKR</span> per free referral.</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#0F7A50] mt-1.5 shrink-0"></div>
              <span>Free referral bonus is limited to <span className="text-slate-800 font-bold">20 referrals</span> only.</span>
            </li>
          </ul>
        </div>
      </motion.div>
      
        </div> {/* Right Column Close */}
      </div> {/* Grid Wrapper Close */}
    </motion.div>
  );
}

