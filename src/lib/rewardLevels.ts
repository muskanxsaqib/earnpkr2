export const TEAM_REWARD_LEVELS = [
  { level: 1, req: 10, reward: '500', numReward: 500, color: 'bg-blue-500', iconColor: 'text-blue-500', iconBg: 'bg-blue-400/20' },
  { level: 2, req: 30, reward: '1,500', numReward: 1500, color: 'bg-emerald-500', iconColor: 'text-emerald-500', iconBg: 'bg-emerald-400/20' },
  { level: 3, req: 50, reward: '2,500', numReward: 2500, color: 'bg-orange-500', iconColor: 'text-orange-500', iconBg: 'bg-orange-400/20' },
  { level: 4, req: 100, reward: '5,000', numReward: 5000, color: 'bg-purple-500', iconColor: 'text-purple-500', iconBg: 'bg-purple-400/20' },
  { level: 5, req: 150, reward: '7,500', numReward: 7500, color: 'bg-rose-500', iconColor: 'text-rose-500', iconBg: 'bg-rose-400/20' },
  { level: 6, req: 300, reward: '15,000', numReward: 15000, color: 'bg-sky-500', iconColor: 'text-sky-500', iconBg: 'bg-sky-400/20' },
];

export interface TeamLevelEconomics {
  level: number;
  reqMembers: number;
  autoReward: number;
  effectiveReward: number;
  isCustomReward: boolean;
  membersMinRevenue: number; // reqMembers * baseMemberPrice (e.g. 250)
  directReferralPayout: number; // reqMembers * referralBonus
  estimatedMembersPlanPayout: number; // reqMembers * 600 (30-day base plan reward) - optional reference
  netPlatformContributionBeforeSalary: number; // reqMembers * (baseMemberPrice - referralBonus)
  netAfterSalaryMilestone: number; // netPlatformContributionBeforeSalary - effectiveReward
  isSustainable: boolean;
  reason?: string;
}

export const evaluateTeamLevelEconomics = (
  level: number,
  reqMembers: number,
  customRewardRaw: string | number | undefined,
  referralBonus: number = 50,
  baseMemberPrice: number = 250
): TeamLevelEconomics => {
  const req = Math.max(1, Number(reqMembers) || 1);
  const refRate = Math.max(0, Number(referralBonus) || 50);
  const basePrice = Math.max(1, Number(baseMemberPrice) || 250);

  const autoReward = req * refRate;
  const hasCustom =
    customRewardRaw !== undefined &&
    customRewardRaw !== null &&
    String(customRewardRaw).trim() !== '' &&
    String(customRewardRaw).trim().toLowerCase() !== 'auto' &&
    !isNaN(Number(customRewardRaw)) &&
    Number(customRewardRaw) >= 0;

  const effectiveReward = hasCustom ? Number(customRewardRaw) : autoReward;
  const membersMinRevenue = req * basePrice;
  const directReferralPayout = req * refRate;
  const netPlatformContributionBeforeSalary = membersMinRevenue - directReferralPayout;
  const netAfterSalaryMilestone = netPlatformContributionBeforeSalary - effectiveReward;
  const isSustainable = netAfterSalaryMilestone >= 0;

  let reason: string | undefined;
  if (!isSustainable) {
    const deficit = Math.abs(netAfterSalaryMilestone);
    reason = `Level ${level} requires ${req} active members (min revenue Rs ${membersMinRevenue.toLocaleString()}). After paying Rs ${directReferralPayout.toLocaleString()} in direct referral bonuses and Rs ${effectiveReward.toLocaleString()} for this Level ${level} milestone, payouts exceed base member deposits by Rs ${deficit.toLocaleString()}. Recommended max reward for ${req} members is Rs ${Math.max(0, netPlatformContributionBeforeSalary).toLocaleString()}.`;
  }

  return {
    level,
    reqMembers: req,
    autoReward,
    effectiveReward,
    isCustomReward: hasCustom,
    membersMinRevenue,
    directReferralPayout,
    estimatedMembersPlanPayout: req * 600,
    netPlatformContributionBeforeSalary,
    netAfterSalaryMilestone,
    isSustainable,
    reason,
  };
};

export const getRewardLevels = (settings?: Record<string, string>, referralBonus: number = 50) => {
  return TEAM_REWARD_LEVELS.map(level => {
    const reqKey = `level_${level.level}_req`;
    const rewardKey = `level_${level.level}_reward`;
    const reqValue = settings && settings[reqKey] ? Math.max(1, Number(settings[reqKey])) : level.req;
    const autoCalculatedReward = reqValue * referralBonus;

    const customRewardStr = settings?.[rewardKey];
    const hasCustomReward =
      customRewardStr !== undefined &&
      customRewardStr !== null &&
      String(customRewardStr).trim() !== '' &&
      String(customRewardStr).trim().toLowerCase() !== 'auto' &&
      !isNaN(Number(customRewardStr)) &&
      Number(customRewardStr) > 0;

    const finalReward = hasCustomReward ? Number(customRewardStr) : autoCalculatedReward;

    return {
      ...level,
      req: reqValue,
      autoReward: autoCalculatedReward,
      isCustomReward: hasCustomReward,
      numReward: finalReward,
      reward: finalReward.toLocaleString()
    };
  });
};


