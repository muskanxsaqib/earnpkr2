import { supabase, broadcastChange } from './supabase';

// ============================================================================
// 1. PROMO & GIFT CODE REDEEM ENGINE
// ============================================================================

export interface PromoCodeItem {
  id: string;
  code: string;
  reward_amount: number;
  max_uses: number;
  used_count: number;
  require_active_plan: boolean;
  expires_at: string; // ISO date string or '' for never
  is_active: boolean;
  created_at: string;
  note?: string;
}

export interface PromoClaimRecord {
  id: string;
  code: string;
  user_id: string;
  username?: string;
  amount: number;
  claimed_at: string;
}

export const DEFAULT_PROMO_CODES: PromoCodeItem[] = [
  {
    id: 'promo_welcome_50',
    code: 'WELCOME50',
    reward_amount: 50,
    max_uses: 100,
    used_count: 0,
    require_active_plan: true,
    expires_at: '',
    is_active: true,
    created_at: new Date().toISOString(),
    note: 'Welcome Bonus for Active Members',
  },
];

export function parsePromoCodesJson(raw?: string | null): PromoCodeItem[] {
  if (!raw || !raw.trim()) return DEFAULT_PROMO_CODES;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_PROMO_CODES;
    return parsed.map((item: any) => ({
      id: String(item.id || `promo_${Math.random().toString(36).slice(2, 9)}`),
      code: String(item.code || '').trim().toUpperCase(),
      reward_amount: Math.max(1, Number(item.reward_amount) || 50),
      max_uses: Math.max(1, Number(item.max_uses) || 100),
      used_count: Math.max(0, Number(item.used_count) || 0),
      require_active_plan: Boolean(item.require_active_plan),
      expires_at: String(item.expires_at || ''),
      is_active: item.is_active !== false,
      created_at: String(item.created_at || new Date().toISOString()),
      note: String(item.note || ''),
    }));
  } catch {
    return DEFAULT_PROMO_CODES;
  }
}

export function parsePromoClaimsJson(raw?: string | null): PromoClaimRecord[] {
  if (!raw || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((c: any) => ({
      id: String(c.id || `claim_${Math.random().toString(36).slice(2, 9)}`),
      code: String(c.code || '').trim().toUpperCase(),
      user_id: String(c.user_id || ''),
      username: String(c.username || 'User'),
      amount: Math.max(0, Number(c.amount) || 0),
      claimed_at: String(c.claimed_at || new Date().toISOString()),
    }));
  } catch {
    return [];
  }
}

export function getUserPromoBonusTotal(userId: string, claimsRawOrList?: string | PromoClaimRecord[] | null): number {
  if (!userId) return 0;
  const list = Array.isArray(claimsRawOrList)
    ? claimsRawOrList
    : parsePromoClaimsJson(claimsRawOrList);
  return list
    .filter((c) => c.user_id === userId)
    .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
}

export async function fetchUserPromoBonusFromSettings(userId: string): Promise<number> {
  if (!userId) return 0;
  try {
    const { data } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'promo_claims_json')
      .maybeSingle();
    return getUserPromoBonusTotal(userId, data?.setting_value);
  } catch {
    return 0;
  }
}

export function isPromoFeatureEnabled(settingsMap?: Record<string, any> | null): boolean {
  return settingsMap?.promo_feature_enabled === 'true';
}

export async function redeemPromoCodeForUser(params: {
  codeInput: string;
  userId: string;
  username?: string;
  hasActivePlan: boolean;
}): Promise<{ ok: boolean; message: string; amount?: number; claim?: PromoClaimRecord }> {
  const cleanCode = params.codeInput.trim().toUpperCase();
  if (!cleanCode) {
    return { ok: false, message: 'Meharbani karke Promo / Gift Code enter karein.' };
  }

  try {
    const { data: rows } = await supabase
      .from('app_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['promo_feature_enabled', 'promo_codes_json', 'promo_claims_json']);

    const map: Record<string, string> = {};
    (rows || []).forEach((r: any) => {
      map[r.setting_key] = r.setting_value;
    });

    if (map['promo_feature_enabled'] !== 'true') {
      return { ok: false, message: 'Promo Code feature abhi Admin ki taraf se OFF hai.' };
    }

    const codes = parsePromoCodesJson(map['promo_codes_json']);
    const claims = parsePromoClaimsJson(map['promo_claims_json']);

    const target = codes.find((c) => c.code.toUpperCase() === cleanCode);
    if (!target) {
      return { ok: false, message: 'Invalid Promo Code! Yeh code maujood nahi hai ya galat likha gaya hai.' };
    }

    if (!target.is_active) {
      return { ok: false, message: 'Yeh Promo Code abhi pause / inactive hai.' };
    }

    if (target.expires_at) {
      const expTime = new Date(target.expires_at).getTime();
      if (!isNaN(expTime) && Date.now() > expTime) {
        return { ok: false, message: 'Yeh Promo Code expire ho chuka hai.' };
      }
    }

    const codeClaimsCount = claims.filter((c) => c.code === cleanCode).length;
    const effectiveUsedCount = Math.max(target.used_count, codeClaimsCount);

    if (effectiveUsedCount >= target.max_uses) {
      return { ok: false, message: `Is Promo Code ki limit (${target.max_uses} uses) poori ho chuki hai.` };
    }

    if (target.require_active_plan && !params.hasActivePlan) {
      return {
        ok: false,
        message: 'Yeh Promo Code sirf Active Plan wale members ke liye hai. Pehle koi bhi Plan activate karein!',
      };
    }

    const alreadyClaimed = claims.some(
      (c) => c.code === cleanCode && c.user_id === params.userId
    );
    if (alreadyClaimed) {
      return { ok: false, message: 'Aap yeh Promo Code pehle hi redeem kar chuke hain (1 User = 1 Claim).' };
    }

    const newClaim: PromoClaimRecord = {
      id: `claim_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      code: cleanCode,
      user_id: params.userId,
      username: params.username || 'Member',
      amount: target.reward_amount,
      claimed_at: new Date().toISOString(),
    };

    const updatedClaims = [newClaim, ...claims];
    const updatedCodes = codes.map((c) =>
      c.id === target.id
        ? { ...c, used_count: effectiveUsedCount + 1 }
        : c
    );

    const { error: upsertErr } = await supabase.from('app_settings').upsert(
      [
        { setting_key: 'promo_codes_json', setting_value: JSON.stringify(updatedCodes) },
        { setting_key: 'promo_claims_json', setting_value: JSON.stringify(updatedClaims) },
      ],
      { onConflict: 'setting_key' }
    );

    if (upsertErr) throw upsertErr;

    // Update user's profile balance & send notification
    const { data: prof } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', params.userId)
      .maybeSingle();

    const nextBalance = (Number(prof?.balance) || 0) + target.reward_amount;
    await supabase
      .from('profiles')
      .update({ balance: nextBalance })
      .eq('id', params.userId);

    await supabase.from('notifications').insert({
      user_id: params.userId,
      title: 'Promo Code Redeemed! 🎁',
      message: `Mubarak ho! Promo code "${cleanCode}" se Rs. ${target.reward_amount} aap ke wallet balance mein add ho gaye hain.`,
      type: 'daily_reward',
    });

    await broadcastChange('app_settings', 'update', { key: 'promo_claims_json' });
    await broadcastChange('profiles', 'update', { id: params.userId, balance: nextBalance });

    return {
      ok: true,
      message: `Mubarak ho! Code "${cleanCode}" kamyabi se लग gaya aur Rs. ${target.reward_amount} aap ke balance mein add ho gaye!`,
      amount: target.reward_amount,
      claim: newClaim,
    };
  } catch (err: any) {
    return {
      ok: false,
      message: err?.message || 'Promo code redeem karne mein masla aya. Dobara koshish karein.',
    };
  }
}

// ============================================================================
// 2. DAILY TASK LINK & COUNTDOWN TIMER VERIFICATION ENGINE
// ============================================================================

export type DailyTaskCategory = 'youtube' | 'website' | 'whatsapp' | 'telegram' | 'tiktok';

export interface DailyVerificationTask {
  id: string;
  title: string;
  url: string;
  category: DailyTaskCategory;
  timer_seconds: number;
  is_active: boolean;
}

export interface TaskVerificationConfig {
  require_task_before_claim: boolean;
  default_timer_seconds: number;
  tasks: DailyVerificationTask[];
}

export const DEFAULT_VERIFICATION_TASKS: DailyVerificationTask[] = [
  {
    id: 'task_default_1',
    title: 'Watch Official Partner Video & Verify Daily Task',
    url: 'https://www.youtube.com',
    category: 'youtube',
    timer_seconds: 15,
    is_active: true,
  },
  {
    id: 'task_default_2',
    title: 'Visit Official Community Update Channel',
    url: 'https://chat.whatsapp.com',
    category: 'whatsapp',
    timer_seconds: 15,
    is_active: true,
  },
];

export function parseDailyTasksConfig(settingsMap: Record<string, any>): TaskVerificationConfig {
  // Default FALSE (OFF) unless Admin explicitly sets require_task_before_claim === 'true'
  const requireTask = settingsMap?.require_task_before_claim === 'true';
  const defaultTimer = Math.max(5, Math.min(300, Number(settingsMap?.task_default_timer_seconds) || 15));

  let tasks: DailyVerificationTask[] = DEFAULT_VERIFICATION_TASKS;
  const rawJson = settingsMap?.daily_tasks_json;
  if (rawJson && typeof rawJson === 'string' && rawJson.trim()) {
    try {
      const parsed = JSON.parse(rawJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        tasks = parsed.map((t: any, idx: number) => ({
          id: String(t.id || `task_${idx + 1}`),
          title: String(t.title || `Daily Verification Task #${idx + 1}`),
          url: String(t.url || 'https://www.youtube.com'),
          category: (['youtube', 'website', 'whatsapp', 'telegram', 'tiktok'].includes(t.category)
            ? t.category
            : 'website') as DailyTaskCategory,
          timer_seconds: Math.max(3, Math.min(300, Number(t.timer_seconds) || defaultTimer)),
          is_active: t.is_active !== false,
        }));
      }
    } catch {
      tasks = DEFAULT_VERIFICATION_TASKS;
    }
  }

  return {
    require_task_before_claim: requireTask,
    default_timer_seconds: defaultTimer,
    tasks,
  };
}

export function getTaskForDay(dayNumber: number, config: TaskVerificationConfig): DailyVerificationTask {
  const activeTasks = config.tasks.filter((t) => t.is_active && t.url.trim() !== '');
  if (activeTasks.length === 0) {
    return {
      id: 'fallback_task',
      title: 'Complete Daily Partner Link Verification',
      url: 'https://www.google.com',
      category: 'website',
      timer_seconds: config.default_timer_seconds || 15,
      is_active: true,
    };
  }
  const index = Math.max(0, (dayNumber - 1) % activeTasks.length);
  return activeTasks[index];
}

// ============================================================================
// 3. WITHDRAWAL FEE, LIMITS & OPEN SCHEDULE CONTROL ENGINE
// ============================================================================

export interface WithdrawalRuleConfig {
  withdrawal_rules_enabled: boolean;
  min_withdraw_amount: number;
  max_withdraw_amount: number;
  withdraw_fee_percent: number;
  withdraw_fee_fixed: number;
  withdraw_schedule_enabled: boolean;
  withdraw_open_hour: number; // 0-23
  withdraw_close_hour: number; // 0-23
  withdraw_allowed_days: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  withdraw_closed_message: string;
}

export function parseWithdrawalRuleConfig(settingsMap: Record<string, any>): WithdrawalRuleConfig {
  // Default FALSE (OFF) unless Admin explicitly sets withdrawal_rules_enabled === 'true'
  const rulesEnabled = settingsMap?.withdrawal_rules_enabled === 'true';
  const minAmount = Math.max(1, Number(settingsMap?.min_withdraw_amount ?? settingsMap?.min_withdrawal) || 100);
  const maxAmount = Math.max(minAmount, Number(settingsMap?.max_withdraw_amount) || 50000);
  const feePercent = rulesEnabled
    ? Math.max(0, Math.min(50, Number(settingsMap?.withdraw_fee_percent ?? settingsMap?.withdrawal_fee_percent) || 0))
    : 0;
  const feeFixed = rulesEnabled
    ? Math.max(0, Number(settingsMap?.withdraw_fee_fixed ?? settingsMap?.withdrawal_fee_fixed) || 0)
    : 0;
  const scheduleEnabled =
    rulesEnabled &&
    (settingsMap?.withdraw_schedule_enabled === 'true' || settingsMap?.withdrawal_schedule_enabled === 'true');
  const openHour = Math.max(0, Math.min(23, Number(settingsMap?.withdraw_open_hour ?? settingsMap?.withdrawal_open_hour ?? 9)));
  const closeHour = Math.max(0, Math.min(23, Number(settingsMap?.withdraw_close_hour ?? settingsMap?.withdrawal_close_hour ?? 21)));

  let allowedDays = [1, 2, 3, 4, 5, 6]; // Mon-Sat default when schedule enabled
  const rawAllowedDays = settingsMap?.withdraw_allowed_days ?? settingsMap?.withdrawal_allowed_days;
  if (rawAllowedDays && typeof rawAllowedDays === 'string') {
    const parsedDays = rawAllowedDays
      .split(',')
      .map((s: string) => Number(s.trim()))
      .filter((n: number) => !isNaN(n) && n >= 0 && n <= 6);
    if (parsedDays.length > 0) {
      allowedDays = parsedDays;
    }
  }

  return {
    withdrawal_rules_enabled: rulesEnabled,
    min_withdraw_amount: minAmount,
    max_withdraw_amount: maxAmount,
    withdraw_fee_percent: feePercent,
    withdraw_fee_fixed: feeFixed,
    withdraw_schedule_enabled: scheduleEnabled,
    withdraw_open_hour: openHour,
    withdraw_close_hour: closeHour,
    withdraw_allowed_days: allowedDays,
    withdraw_closed_message:
      settingsMap?.withdraw_closed_message ||
      settingsMap?.withdrawal_closed_message ||
      'Withdrawals sirf muqarara waqt (Open Hours) mein open hoti hain. Meharbani karke open timing mein request bhejein.',
  };
}

export function calculateWithdrawalBreakdown(requestedAmount: number, config: WithdrawalRuleConfig) {
  const amount = Math.max(0, Number(requestedAmount) || 0);
  if (!config.withdrawal_rules_enabled) {
    return {
      requestedAmount: amount,
      feePercent: 0,
      feeFixed: 0,
      percentFee: 0,
      totalFee: 0,
      netReceivable: amount,
    };
  }
  const percentFee = Math.round((amount * config.withdraw_fee_percent) / 100);
  const fixedFee = amount > 0 ? config.withdraw_fee_fixed : 0;
  const totalFee = Math.min(amount, percentFee + fixedFee);
  const netReceivable = Math.max(0, amount - totalFee);

  return {
    requestedAmount: amount,
    feePercent: config.withdraw_fee_percent,
    feeFixed: config.withdraw_fee_fixed,
    percentFee,
    totalFee,
    netReceivable,
  };
}

const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function formatHour12(hour24: number): string {
  const h = ((hour24 % 24) + 24) % 24;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:00 ${suffix}`;
}

export function checkWithdrawalScheduleOpen(
  config: WithdrawalRuleConfig,
  now: Date = new Date()
): { isOpen: boolean; reason: string; scheduleBadge: string } {
  if (!config.withdrawal_rules_enabled || !config.withdraw_schedule_enabled) {
    return {
      isOpen: true,
      reason: 'Withdrawals 24/7 Open',
      scheduleBadge: '24/7 Open',
    };
  }

  const daysLabel =
    config.withdraw_allowed_days.length === 7
      ? 'Every Day'
      : config.withdraw_allowed_days.map((d) => DAY_NAMES_SHORT[d]).join(', ');
  const hoursLabel = `${formatHour12(config.withdraw_open_hour)} – ${formatHour12(config.withdraw_close_hour)}`;
  const scheduleBadge = `${daysLabel} · ${hoursLabel}`;

  const currentDay = now.getDay();
  const currentHour = now.getHours();

  if (!config.withdraw_allowed_days.includes(currentDay)) {
    return {
      isOpen: false,
      reason: `${config.withdraw_closed_message} (Allowed Days: ${daysLabel})`,
      scheduleBadge,
    };
  }

  const inHourRange =
    config.withdraw_open_hour <= config.withdraw_close_hour
      ? currentHour >= config.withdraw_open_hour && currentHour < config.withdraw_close_hour
      : currentHour >= config.withdraw_open_hour || currentHour < config.withdraw_close_hour;

  if (!inHourRange) {
    return {
      isOpen: false,
      reason: `${config.withdraw_closed_message} (Timing: ${hoursLabel})`,
      scheduleBadge,
    };
  }

  return {
    isOpen: true,
    reason: `Open Now (${scheduleBadge})`,
    scheduleBadge,
  };
}

