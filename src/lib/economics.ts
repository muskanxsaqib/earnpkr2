import { InvestmentPlan } from '../types';

export interface PlanThemeOption {
  key: string;
  label: string;
  from: string;
  to: string;
  gradient: string;
  bg: string;
  text: string;
}

export const PLAN_THEMES: PlanThemeOption[] = [
  { key: 'purple', label: 'Royal Purple', from: 'from-purple-500', to: 'to-indigo-500', gradient: 'from-purple-500 to-indigo-500', bg: 'bg-purple-50', text: 'text-purple-500' },
  { key: 'blue', label: 'Ocean Blue', from: 'from-blue-500', to: 'to-cyan-500', gradient: 'from-blue-500 to-cyan-500', bg: 'bg-blue-50', text: 'text-blue-500' },
  { key: 'emerald', label: 'Emerald Green', from: 'from-emerald-500', to: 'to-teal-500', gradient: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50', text: 'text-emerald-500' },
  { key: 'orange', label: 'Sunset Amber', from: 'from-orange-400', to: 'to-amber-500', gradient: 'from-orange-400 to-amber-500', bg: 'bg-orange-50', text: 'text-orange-500' },
  { key: 'rose', label: 'Crimson Rose', from: 'from-rose-500', to: 'to-pink-500', gradient: 'from-rose-500 to-pink-500', bg: 'bg-rose-50', text: 'text-rose-500' },
  { key: 'violet', label: 'Deep Violet', from: 'from-violet-500', to: 'to-purple-600', gradient: 'from-violet-500 to-purple-600', bg: 'bg-violet-50', text: 'text-violet-500' },
  { key: 'cyan', label: 'Cyber Cyan', from: 'from-cyan-500', to: 'to-blue-600', gradient: 'from-cyan-500 to-blue-600', bg: 'bg-cyan-50', text: 'text-cyan-500' },
  { key: 'amber', label: 'Golden Flame', from: 'from-amber-500', to: 'to-orange-600', gradient: 'from-amber-500 to-orange-600', bg: 'bg-amber-50', text: 'text-amber-500' },
  { key: 'fuchsia', label: 'Fuchsia Berry', from: 'from-fuchsia-500', to: 'to-pink-600', gradient: 'from-fuchsia-500 to-pink-600', bg: 'bg-fuchsia-50', text: 'text-fuchsia-500' },
  { key: 'indigo', label: 'Midnight Indigo', from: 'from-indigo-500', to: 'to-blue-600', gradient: 'from-indigo-500 to-blue-600', bg: 'bg-indigo-50', text: 'text-indigo-500' },
];

export const PLAN_ICONS: Array<{ key: 'flame' | 'rocket' | 'diamond' | 'crown' | 'briefcase'; label: string }> = [
  { key: 'flame', label: 'Flame' },
  { key: 'rocket', label: 'Rocket' },
  { key: 'diamond', label: 'Diamond' },
  { key: 'crown', label: 'Crown' },
  { key: 'briefcase', label: 'Briefcase' },
];

export interface OfficialPlanSpec {
  plan_number: number;
  name: string;
  plan_price: number;
  daily_reward: number;
  total_days: number;
  thirty_day_reward: number;
  members_required: number;
  referral_bonus: number;
  user_total_reward: number;
  icon: 'flame' | 'rocket' | 'diamond' | 'crown' | 'briefcase';
  themeKey: string;
}

export const OFFICIAL_PLANS_MATRIX: OfficialPlanSpec[] = [
  { plan_number: 1, name: 'Mini Plan', plan_price: 250, daily_reward: 20, total_days: 30, thirty_day_reward: 600, members_required: 3, referral_bonus: 150, user_total_reward: 750, icon: 'flame', themeKey: 'purple' },
  { plan_number: 2, name: 'Starter Plan', plan_price: 300, daily_reward: 25, total_days: 30, thirty_day_reward: 750, members_required: 5, referral_bonus: 250, user_total_reward: 1000, icon: 'flame', themeKey: 'blue' },
  { plan_number: 3, name: 'Basic Plan', plan_price: 500, daily_reward: 45, total_days: 30, thirty_day_reward: 1350, members_required: 7, referral_bonus: 350, user_total_reward: 1700, icon: 'rocket', themeKey: 'emerald' },
  { plan_number: 4, name: 'Standard Plan', plan_price: 700, daily_reward: 70, total_days: 30, thirty_day_reward: 2100, members_required: 10, referral_bonus: 500, user_total_reward: 2600, icon: 'diamond', themeKey: 'orange' },
  { plan_number: 5, name: 'Gold Plan', plan_price: 1000, daily_reward: 90, total_days: 30, thirty_day_reward: 2700, members_required: 15, referral_bonus: 750, user_total_reward: 3450, icon: 'crown', themeKey: 'rose' },
  { plan_number: 6, name: 'Premium Plan', plan_price: 1500, daily_reward: 120, total_days: 30, thirty_day_reward: 3600, members_required: 20, referral_bonus: 1000, user_total_reward: 4600, icon: 'briefcase', themeKey: 'violet' },
  { plan_number: 7, name: 'Pro Plan', plan_price: 2000, daily_reward: 150, total_days: 30, thirty_day_reward: 4500, members_required: 25, referral_bonus: 1250, user_total_reward: 5750, icon: 'rocket', themeKey: 'cyan' },
  { plan_number: 8, name: 'Elite Plan', plan_price: 3000, daily_reward: 210, total_days: 30, thirty_day_reward: 6300, members_required: 30, referral_bonus: 1500, user_total_reward: 7800, icon: 'diamond', themeKey: 'amber' },
  { plan_number: 9, name: 'VIP Plan', plan_price: 4000, daily_reward: 260, total_days: 30, thirty_day_reward: 7800, members_required: 35, referral_bonus: 1750, user_total_reward: 9550, icon: 'crown', themeKey: 'fuchsia' },
  { plan_number: 10, name: 'Royal Plan', plan_price: 5000, daily_reward: 300, total_days: 30, thirty_day_reward: 9000, members_required: 40, referral_bonus: 2000, user_total_reward: 11000, icon: 'briefcase', themeKey: 'indigo' },
];

export interface PlanCustomMeta {
  is_active?: boolean;
  name?: string;
  icon?: 'flame' | 'rocket' | 'diamond' | 'crown' | 'briefcase';
  themeKey?: string;
  total_days?: number;
  badge_tag?: string;
}

export type PlansMetaMap = Record<string, PlanCustomMeta>;

export function parsePlansMeta(raw?: string | null): PlansMetaMap {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export const parsePlansMetaJson = parsePlansMeta;

export interface PlanEconomicsInput {
  plan_price: number;
  daily_reward: number;
  total_days?: number;
  members_required: number;
  thirty_day_reward?: number;
  user_total_reward?: number;
}

export interface PlanEconomicsCalculation {
  P: number; // Plan Price
  D: number; // Daily Reward
  days: number; // Plan Duration (default 30)
  M: number; // Members Required
  baseMemberPrice: number; // Base plan purchase per referred member (default 250)
  referralBonusRate: number; // Flat bonus per referred member (default 50)
  expectedDurationReward: number; // D * days
  actualDurationReward: number; // thirty_day_reward (if manually overridden)
  membersRevenue: number; // M * baseMemberPrice
  platformRevenue: number; // P + membersRevenue (Rev_A)
  referralBonusTotal: number; // M * referralBonusRate
  expectedUserTotalReward: number; // expectedDurationReward + referralBonusTotal
  actualUserTotalReward: number; // user_total_reward (if manually overridden)
  platformProfit: number; // platformRevenue - actualUserTotalReward (Rev_A - Total_B)
  expectedPlatformProfit: number; // platformRevenue - expectedUserTotalReward
  profitMarginPercent: number; // (platformProfit / platformRevenue) * 100
  userRoiPercent: number; // (actualUserTotalReward / P) * 100
}

export interface PlanValidationIssue {
  code: 'INVALID_INPUT' | 'DURATION_REWARD_MISMATCH' | 'TOTAL_REWARD_MISMATCH' | 'PLATFORM_LOSS' | 'LOW_MARGIN_WARNING';
  severity: 'error' | 'warning';
  title: string;
  reasonEn: string;
  reasonUr: string;
  remedyLabel?: string;
  remedyPatch?: Partial<PlanEconomicsInput>;
}

export interface PlanValidationResult {
  calc: PlanEconomicsCalculation;
  isValid: boolean;
  canSave: boolean;
  isProfitable: boolean;
  hasFormulaMismatch: boolean;
  issues: PlanValidationIssue[];
  recommendedFixes: Array<{
    label: string;
    description: string;
    patch: Partial<PlanEconomicsInput>;
  }>;
}

export function calculatePlanEconomics(
  input: PlanEconomicsInput,
  referralBonusRate: number = 50,
  baseMemberPrice: number = 250
): PlanEconomicsCalculation {
  const P = Math.max(0, Number(input.plan_price) || 0);
  const D = Math.max(0, Number(input.daily_reward) || 0);
  const days = Math.max(1, Number(input.total_days) || 30);
  const M = Math.max(0, Math.floor(Number(input.members_required) || 0));
  const refRate = Math.max(0, Number(referralBonusRate) || 50);
  const basePrice = Math.max(1, Number(baseMemberPrice) || 250);

  const expectedDurationReward = D * days;
  const actualDurationReward =
    input.thirty_day_reward !== undefined && input.thirty_day_reward !== null && !isNaN(Number(input.thirty_day_reward))
      ? Number(input.thirty_day_reward)
      : expectedDurationReward;

  const membersRevenue = M * basePrice;
  const platformRevenue = P + membersRevenue;
  const referralBonusTotal = M * refRate;

  const expectedUserTotalReward = expectedDurationReward + referralBonusTotal;
  const actualUserTotalReward =
    input.user_total_reward !== undefined && input.user_total_reward !== null && !isNaN(Number(input.user_total_reward))
      ? Number(input.user_total_reward)
      : actualDurationReward + referralBonusTotal;

  const platformProfit = platformRevenue - actualUserTotalReward;
  const expectedPlatformProfit = platformRevenue - expectedUserTotalReward;
  const profitMarginPercent = platformRevenue > 0 ? (platformProfit / platformRevenue) * 100 : 0;
  const userRoiPercent = P > 0 ? (actualUserTotalReward / P) * 100 : 0;

  return {
    P,
    D,
    days,
    M,
    baseMemberPrice: basePrice,
    referralBonusRate: refRate,
    expectedDurationReward,
    actualDurationReward,
    membersRevenue,
    platformRevenue,
    referralBonusTotal,
    expectedUserTotalReward,
    actualUserTotalReward,
    platformProfit,
    expectedPlatformProfit,
    profitMarginPercent,
    userRoiPercent,
  };
}

export function validatePlanEconomics(
  input: PlanEconomicsInput,
  referralBonusRate: number = 50,
  baseMemberPrice: number = 250
): PlanValidationResult {
  const calc = calculatePlanEconomics(input, referralBonusRate, baseMemberPrice);
  const issues: PlanValidationIssue[] = [];
  const recommendedFixes: Array<{
    label: string;
    description: string;
    patch: Partial<PlanEconomicsInput>;
  }> = [];

  // 1. Check basic input validity
  if (calc.P <= 0) {
    issues.push({
      code: 'INVALID_INPUT',
      severity: 'error',
      title: 'Plan Price Must Be Greater Than 0',
      reasonEn: 'A plan cannot have a Rs 0 or negative price. Enter a valid investment amount (e.g. Rs 250 or higher).',
      reasonUr: 'Plan ki price 0 ya negative nahi ho sakti. Kam az kam Rs 250 ya is se zyada price rakhein.',
      remedyLabel: 'Set Price to Rs 250',
      remedyPatch: { plan_price: 250 },
    });
  }

  if (calc.D <= 0) {
    issues.push({
      code: 'INVALID_INPUT',
      severity: 'error',
      title: 'Daily Reward Must Be Greater Than 0',
      reasonEn: 'Daily reward must be at least Rs 1 so users can collect daily earnings.',
      reasonUr: 'Daily reward 0 nahi ho sakta. Kam az kam Rs 1 ya plan ke mutabiq daily reward enter karein.',
      remedyLabel: 'Set Daily Reward to Rs 20',
      remedyPatch: { daily_reward: 20, thirty_day_reward: 20 * calc.days, user_total_reward: 20 * calc.days + calc.referralBonusTotal },
    });
  }

  // 2. Check Duration Reward Formula (R_days = D * days)
  const durationDiff = Math.abs(calc.actualDurationReward - calc.expectedDurationReward);
  if (durationDiff > 0.01) {
    issues.push({
      code: 'DURATION_REWARD_MISMATCH',
      severity: 'warning',
      title: `${calc.days}-Day Reward Formula Mismatch`,
      reasonEn: `Formula requires Daily Reward (Rs ${calc.D}) × ${calc.days} Days = Rs ${calc.expectedDurationReward.toLocaleString()}, but ${calc.days}-Day Reward is set to Rs ${calc.actualDurationReward.toLocaleString()} (difference of Rs ${durationDiff.toLocaleString()}).`,
      reasonUr: `Calculation ke mutabiq Daily Reward (Rs ${calc.D}) × ${calc.days} Din = Rs ${calc.expectedDurationReward.toLocaleString()} banta hai, lekin aap ne Rs ${calc.actualDurationReward.toLocaleString()} likha hai.`,
      remedyLabel: `Sync to Rs ${calc.expectedDurationReward.toLocaleString()}`,
      remedyPatch: {
        thirty_day_reward: calc.expectedDurationReward,
        user_total_reward: calc.expectedDurationReward + calc.referralBonusTotal,
      },
    });
  }

  // 3. Check User Total Reward Formula (Total_B = R_days + RefBonus)
  const expectedTotalFromActualDuration = calc.actualDurationReward + calc.referralBonusTotal;
  const totalDiff = Math.abs(calc.actualUserTotalReward - expectedTotalFromActualDuration);
  if (totalDiff > 0.01) {
    issues.push({
      code: 'TOTAL_REWARD_MISMATCH',
      severity: 'warning',
      title: 'User Total Reward Formula Mismatch',
      reasonEn: `Formula requires ${calc.days}-Day Reward (Rs ${calc.actualDurationReward.toLocaleString()}) + Referral Bonus (${calc.M} × Rs ${calc.referralBonusRate} = Rs ${calc.referralBonusTotal.toLocaleString()}) = Rs ${expectedTotalFromActualDuration.toLocaleString()}, but Total Reward is set to Rs ${calc.actualUserTotalReward.toLocaleString()}.`,
      reasonUr: `Formula ke mutabiq ${calc.days}-Day Reward (Rs ${calc.actualDurationReward.toLocaleString()}) + Referral Bonus (Rs ${calc.referralBonusTotal.toLocaleString()}) = Rs ${expectedTotalFromActualDuration.toLocaleString()} hona chahiye.`,
      remedyLabel: `Sync Total to Rs ${expectedTotalFromActualDuration.toLocaleString()}`,
      remedyPatch: {
        thirty_day_reward: calc.expectedDurationReward,
        user_total_reward: calc.expectedUserTotalReward,
      },
    });
  }

  // 4. Platform Profitability Gate (Profit = Rev_A - Total_B > 0)
  // Target a healthy minimum profit buffer (at least 20% of Plan Price or Rs 250)
  const targetMinProfit = Math.max(250, Math.round(calc.P * 0.25));
  const netContributionPerMember = Math.max(1, calc.baseMemberPrice - calc.referralBonusRate);

  // Remedy A: Max sustainable Daily Reward with current Price & Members
  const maxSustainableTotalDurationReward = Math.max(
    calc.days,
    calc.platformRevenue - calc.referralBonusTotal - targetMinProfit
  );
  const safeDailyReward = Math.max(1, Math.floor(maxSustainableTotalDurationReward / calc.days));

  // Remedy B: Min required members with current Price & Daily Reward
  const neededNetFromMembers = calc.expectedDurationReward + targetMinProfit - calc.P;
  const safeMembersRequired = Math.max(1, Math.ceil(neededNetFromMembers / netContributionPerMember));

  // Remedy C: Min Plan Price with current Daily Reward & Members
  const safePlanPrice = Math.ceil((calc.expectedUserTotalReward - calc.membersRevenue + targetMinProfit) / 50) * 50;

  if (calc.platformProfit <= 0) {
    const lossAmount = Math.abs(calc.platformProfit);
    issues.push({
      code: 'PLATFORM_LOSS',
      severity: 'warning',
      title: `Plan Economics Advisory — Deficit of Rs ${lossAmount.toLocaleString()}`,
      reasonEn: `Platform Revenue is Rs ${calc.platformRevenue.toLocaleString()} (Plan Price Rs ${calc.P.toLocaleString()} + ${calc.M} Members × Rs ${calc.baseMemberPrice} = Rs ${calc.membersRevenue.toLocaleString()}), while User Total Payout is Rs ${calc.actualUserTotalReward.toLocaleString()} (${calc.days}-Day Reward Rs ${calc.actualDurationReward.toLocaleString()} + Referral Bonus Rs ${calc.referralBonusTotal.toLocaleString()}).`,
      reasonUr: `Is plan mein Platform Revenue Rs ${calc.platformRevenue.toLocaleString()} hai jabke User ko Total Payout Rs ${calc.actualUserTotalReward.toLocaleString()} ban raha hai (Deficit: Rs ${lossAmount.toLocaleString()}). Aap isay freely Save kar sakte hain ya Auto-Fix se balance kar sakte hain.`,
      remedyLabel: `Auto-Fix: Set Members to ${safeMembersRequired}`,
      remedyPatch: {
        members_required: safeMembersRequired,
        thirty_day_reward: calc.D * calc.days,
        user_total_reward: calc.D * calc.days + safeMembersRequired * calc.referralBonusRate,
      },
    });
  } else if (calc.profitMarginPercent < 15) {
    issues.push({
      code: 'LOW_MARGIN_WARNING',
      severity: 'warning',
      title: `Low Profit Margin (${calc.profitMarginPercent.toFixed(1)}%)`,
      reasonEn: `Platform Profit is only Rs ${calc.platformProfit.toLocaleString()} (${calc.profitMarginPercent.toFixed(1)}% margin). A margin of 20%+ is recommended to cover Team Salary milestones and operational buffer.`,
      reasonUr: `Is plan mein platform profit sirf Rs ${calc.platformProfit.toLocaleString()} (${calc.profitMarginPercent.toFixed(1)}%) hai. Team Salary aur safe margin ke liye kam az kam 20% profit rakhna behtar hai.`,
    });
  }

  // Build recommended fixes list whenever there is a loss, low margin, or mismatch
  if (calc.platformProfit <= 0 || calc.profitMarginPercent < 15 || durationDiff > 0.01 || totalDiff > 0.01) {
    if (safeDailyReward > 0 && safeDailyReward !== calc.D && (calc.P + calc.membersRevenue - (safeDailyReward * calc.days + calc.referralBonusTotal)) > 0) {
      recommendedFixes.push({
        label: `Reduce Daily Reward to Rs ${safeDailyReward}`,
        description: `Keeps Price Rs ${calc.P.toLocaleString()} & ${calc.M} Members → Platform Profit: Rs ${(calc.platformRevenue - (safeDailyReward * calc.days + calc.referralBonusTotal)).toLocaleString()}`,
        patch: {
          daily_reward: safeDailyReward,
          thirty_day_reward: safeDailyReward * calc.days,
          user_total_reward: safeDailyReward * calc.days + calc.referralBonusTotal,
        },
      });
    }

    if (safeMembersRequired !== calc.M) {
      const newRev = calc.P + safeMembersRequired * calc.baseMemberPrice;
      const newPayout = calc.expectedDurationReward + safeMembersRequired * calc.referralBonusRate;
      recommendedFixes.push({
        label: `Increase Members Required to ${safeMembersRequired}`,
        description: `Keeps Daily Reward Rs ${calc.D} → Platform Profit: Rs ${(newRev - newPayout).toLocaleString()}`,
        patch: {
          members_required: safeMembersRequired,
          thirty_day_reward: calc.expectedDurationReward,
          user_total_reward: newPayout,
        },
      });
    }

    if (safePlanPrice > calc.P) {
      const newRev = safePlanPrice + calc.membersRevenue;
      recommendedFixes.push({
        label: `Raise Plan Price to Rs ${safePlanPrice.toLocaleString()}`,
        description: `Keeps Daily Reward Rs ${calc.D} & ${calc.M} Members → Platform Profit: Rs ${(newRev - calc.expectedUserTotalReward).toLocaleString()}`,
        patch: {
          plan_price: safePlanPrice,
          thirty_day_reward: calc.expectedDurationReward,
          user_total_reward: calc.expectedUserTotalReward,
        },
      });
    }

    if (durationDiff > 0.01 || totalDiff > 0.01) {
      recommendedFixes.push({
        label: 'Sync Exact Formula Totals',
        description: `Sets ${calc.days}-Day Reward = Rs ${calc.expectedDurationReward.toLocaleString()} & Total Reward = Rs ${calc.expectedUserTotalReward.toLocaleString()}`,
        patch: {
          thirty_day_reward: calc.expectedDurationReward,
          user_total_reward: calc.expectedUserTotalReward,
        },
      });
    }
  }

  const hasHardError = issues.some((i) => i.severity === 'error');
  const hasFormulaMismatch = durationDiff > 0.01 || totalDiff > 0.01;

  return {
    calc,
    isValid: issues.length === 0,
    canSave: !hasHardError,
    isProfitable: calc.platformProfit > 0,
    hasFormulaMismatch,
    issues,
    recommendedFixes,
  };
}

export function getThemeByKey(themeKey?: string): PlanThemeOption {
  return PLAN_THEMES.find((t) => t.key === themeKey) || PLAN_THEMES[0];
}

export function mergePlanWithMeta(
  dbPlan: any,
  idx: number,
  metaMap: PlansMetaMap,
  referralBonusRate: number = 50,
  baseMemberPrice: number = 250
): InvestmentPlan & {
  dbId?: number;
  plan_number: number;
  is_active: boolean;
  themeKey: string;
  thirty_day_reward: number;
  user_total_reward: number;
  totalReward?: number;
  plan_price: number;
  daily_reward: number;
  total_days: number;
  members_required: number;
  economics: PlanEconomicsCalculation;
  validation: PlanValidationResult;
} {
  const planNum = Number(dbPlan.plan_number || idx + 1);
  const officialFallback = OFFICIAL_PLANS_MATRIX.find((p) => p.plan_number === planNum) || OFFICIAL_PLANS_MATRIX[idx % OFFICIAL_PLANS_MATRIX.length];
  const meta = metaMap[String(planNum)] || {};

  const planPrice = Number(dbPlan.plan_price ?? dbPlan.invest_amount ?? officialFallback.plan_price);
  const dailyReward = Number(dbPlan.daily_reward ?? dbPlan.daily_return ?? officialFallback.daily_reward);
  const totalDays = Number(meta.total_days ?? dbPlan.total_days ?? 30) || 30;
  const membersRequired = Number(dbPlan.members_required ?? dbPlan.required_referrals ?? officialFallback.members_required);

  const customName = (meta.name || dbPlan.name || officialFallback.name || `Plan ${planNum}`).trim();
  const icon = (meta.icon || officialFallback.icon || 'flame') as 'flame' | 'rocket' | 'diamond' | 'crown' | 'briefcase';
  const themeKey = meta.themeKey || officialFallback.themeKey || PLAN_THEMES[(planNum - 1) % PLAN_THEMES.length].key;
  const themeObj = getThemeByKey(themeKey);
  const isActive = meta.is_active !== false;
  const badgeTag = (meta.badge_tag || dbPlan.badge_tag || '').trim();

  const expectedThirtyDay = dailyReward * totalDays;
  const expectedRefBonus = membersRequired * referralBonusRate;
  const expectedTotalReward = expectedThirtyDay + expectedRefBonus;

  const thirtyDayReward = Number(dbPlan.thirty_day_reward) || expectedThirtyDay;
  const userTotalReward = Number(dbPlan.user_total_reward) || expectedTotalReward;

  const validation = validatePlanEconomics(
    {
      plan_price: planPrice,
      daily_reward: dailyReward,
      total_days: totalDays,
      members_required: membersRequired,
      thirty_day_reward: thirtyDayReward,
      user_total_reward: userTotalReward,
    },
    referralBonusRate,
    baseMemberPrice
  );

  return {
    id: `plan_${planNum}`,
    dbId: dbPlan.id,
    plan_number: planNum,
    name: customName,
    investAmount: planPrice,
    dailyReturn: dailyReward,
    totalDays,
    requiredReferrals: membersRequired,
    plan_price: planPrice,
    daily_reward: dailyReward,
    total_days: totalDays,
    members_required: membersRequired,
    referralBonus: expectedRefBonus,
    totalReward: expectedTotalReward,
    thirty_day_reward: thirtyDayReward,
    user_total_reward: userTotalReward,
    icon,
    themeKey,
    is_active: isActive,
    badge_tag: badgeTag,
    theme: {
      from: themeObj.from,
      to: themeObj.to,
      bg: themeObj.bg,
      text: themeObj.text,
    },
    economics: validation.calc,
    validation,
  };
}
