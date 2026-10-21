import React, { useState } from 'react';
import {
  Ticket,
  Plus,
  Trash2,
  Copy,
  Check,
  Clock,
  ExternalLink,
  ShieldCheck,
  Play,
  Globe,
  MessageCircle,
  Send,
  Sparkles,
  Gift,
  Calculator,
  Coins,
  RotateCcw,
  DollarSign,
  CheckCircle,
} from 'lucide-react';
import {
  SUPPORTED_CURRENCIES,
  DEFAULT_EXCHANGE_RATES,
  parseExchangeRatesJson,
  formatCurrency,
  CurrencyCode,
} from '../lib/currency';
import {
  PromoCodeItem,
  PromoClaimRecord,
  parsePromoCodesJson,
  parsePromoClaimsJson,
  DailyVerificationTask,
  DailyTaskCategory,
  parseDailyTasksConfig,
  parseWithdrawalRuleConfig,
  calculateWithdrawalBreakdown,
  formatHour12,
} from '../lib/platformFeatures';
import { setFeatureFlag, KNOWN_FEATURE_FLAGS } from '../lib/featureFlags';

interface AdminBusinessStepsProps {
  appSettings: Record<string, any>;
  setAppSettings: React.Dispatch<React.SetStateAction<any>>;
  onQuickSaveSettings?: (partialUpdates: Record<string, string>) => Promise<void>;
}

const DAY_BUTTONS = [
  { day: 1, label: 'Mon' },
  { day: 2, label: 'Tue' },
  { day: 3, label: 'Wed' },
  { day: 4, label: 'Thu' },
  { day: 5, label: 'Fri' },
  { day: 6, label: 'Sat' },
  { day: 0, label: 'Sun' },
];

export function AdminWithdrawalRulesSection({
  appSettings,
  setAppSettings,
  onQuickSaveSettings,
}: AdminBusinessStepsProps) {
  const withdrawConfig = parseWithdrawalRuleConfig(appSettings);
  const sampleBreakdown = calculateWithdrawalBreakdown(1000, withdrawConfig);
  const rulesEnabled = appSettings.withdrawal_rules_enabled === 'true';

  const handleToggleRulesEnabled = async () => {
    const nextVal = rulesEnabled ? 'false' : 'true';
    setAppSettings((prev: any) => ({
      ...prev,
      withdrawal_rules_enabled: nextVal,
    }));
    await setFeatureFlag(KNOWN_FEATURE_FLAGS.CUSTOM_WITHDRAWAL_RULES, nextVal === 'true');
    if (onQuickSaveSettings) {
      await onQuickSaveSettings({ withdrawal_rules_enabled: nextVal });
    }
  };

  const toggleAllowedDay = (dayIndex: number) => {
    const current = withdrawConfig.withdraw_allowed_days;
    const exists = current.includes(dayIndex);
    const next = exists
      ? current.filter((d) => d !== dayIndex)
      : [...current, dayIndex].sort((a, b) => a - b);
    if (next.length === 0) return; // keep at least 1 day active
    setAppSettings({
      ...appSettings,
      withdraw_allowed_days: next.join(','),
    });
  };

  return (
    <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3.5">
        <div>
          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Calculator className="w-4 h-4 text-[#0F7A50]" />
            Withdrawal Fee, Limits & Open Hours Schedule Control
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            {rulesEnabled
              ? 'ACTIVE: Custom withdrawal service fee (%), max limit, aur open hours schedule lagoo hain.'
              : 'DEFAULT (OFF): Normal 0% fee aur 24/7 standard withdrawal mode active hai. Custom fee ya timing lagane ke liye ON karein.'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleToggleRulesEnabled}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 self-start sm:self-center ${
            rulesEnabled
              ? 'bg-[#0F7A50] text-white shadow-xs'
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          }`}
        >
          {rulesEnabled ? 'Custom Fee & Schedule: ON' : 'Custom Fee & Schedule: OFF (Default)'}
        </button>
      </div>

      {/* Min / Max / Fee % / Fixed Fee Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Min Withdrawal (PKR)
          </label>
          <input
            type="number"
            min={10}
            value={appSettings.min_withdrawal ?? appSettings.min_withdraw_amount ?? '100'}
            onChange={(e) =>
              setAppSettings({
                ...appSettings,
                min_withdrawal: e.target.value,
                min_withdraw_amount: e.target.value,
              })
            }
            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 tabular-nums"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Max Single Withdrawal (PKR)
          </label>
          <input
            type="number"
            min={100}
            value={appSettings.max_withdraw_amount ?? '50000'}
            onChange={(e) =>
              setAppSettings({
                ...appSettings,
                max_withdraw_amount: e.target.value,
              })
            }
            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 tabular-nums"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Withdrawal Service Fee (%)
          </label>
          <input
            type="number"
            min={0}
            max={50}
            step="0.5"
            value={appSettings.withdraw_fee_percent ?? '0'}
            onChange={(e) =>
              setAppSettings({
                ...appSettings,
                withdraw_fee_percent: e.target.value,
              })
            }
            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-rose-600 tabular-nums"
          />
          <div className="flex flex-wrap gap-1 mt-1.5">
            {['0', '2', '5', '10'].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => setAppSettings({ ...appSettings, withdraw_fee_percent: pct })}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer ${
                  String(appSettings.withdraw_fee_percent ?? '0') === pct
                    ? 'bg-[#0F7A50] text-white'
                    : 'bg-white border border-slate-200 text-slate-600'
                }`}
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Fixed Fee Per Withdrawal (PKR)
          </label>
          <input
            type="number"
            min={0}
            value={appSettings.withdraw_fee_fixed ?? '0'}
            onChange={(e) =>
              setAppSettings({
                ...appSettings,
                withdraw_fee_fixed: e.target.value,
              })
            }
            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 tabular-nums"
          />
          <p className="text-[10px] text-slate-400 mt-1">
            0 rakhein agar sirf % fee lagani ho.
          </p>
        </div>
      </div>

      {/* Live Payout Example Preview */}
      <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono tabular-nums">
        <span className="font-sans font-semibold text-slate-600">
          Live Example (If User Withdraws Rs 1,000):
        </span>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-slate-700">Deducted: <strong>Rs 1,000</strong></span>
          <span>·</span>
          <span className="text-rose-600">Platform Fee: <strong>-Rs {sampleBreakdown.totalFee}</strong></span>
          <span>·</span>
          <span className="text-[#0F7A50] font-black">Net Payout to Send: Rs {sampleBreakdown.netReceivable}</span>
        </div>
      </div>

      {/* Withdrawal Schedule & Open Hours Control */}
      <div className="p-4 rounded-xl bg-white border border-slate-200/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h5 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-500" />
              Withdrawal Open Hours & Days Schedule
            </h5>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Agar ON karenge tou users sirf muqarara waqt aur dinon mein withdrawal request bhej sakenge.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setAppSettings({
                ...appSettings,
                withdraw_schedule_enabled:
                  appSettings.withdraw_schedule_enabled === 'true' ? 'false' : 'true',
              })
            }
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer self-start sm:self-center ${
              appSettings.withdraw_schedule_enabled === 'true'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-200 text-slate-700'
            }`}
          >
            {appSettings.withdraw_schedule_enabled === 'true'
              ? 'Schedule Restriction: ON'
              : '24/7 Withdrawals: OPEN'}
          </button>
        </div>

        {appSettings.withdraw_schedule_enabled === 'true' && (
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Opening Time ({formatHour12(withdrawConfig.withdraw_open_hour)})
                </label>
                <select
                  value={String(withdrawConfig.withdraw_open_hour)}
                  onChange={(e) =>
                    setAppSettings({ ...appSettings, withdraw_open_hour: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  {Array.from({ length: 24 }).map((_, h) => (
                    <option key={h} value={String(h)}>
                      {formatHour12(h)} ({String(h).padStart(2, '0')}:00)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Closing Time ({formatHour12(withdrawConfig.withdraw_close_hour)})
                </label>
                <select
                  value={String(withdrawConfig.withdraw_close_hour)}
                  onChange={(e) =>
                    setAppSettings({ ...appSettings, withdraw_close_hour: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  {Array.from({ length: 24 }).map((_, h) => (
                    <option key={h} value={String(h)}>
                      {formatHour12(h)} ({String(h).padStart(2, '0')}:00)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Allowed Withdrawal Days
              </label>
              <div className="flex flex-wrap gap-2">
                {DAY_BUTTONS.map((d) => {
                  const active = withdrawConfig.withdraw_allowed_days.includes(d.day);
                  return (
                    <button
                      key={d.day}
                      type="button"
                      onClick={() => toggleAllowedDay(d.day)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#0F7A50] text-white shadow-xs'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Closed Hours Notice Message
              </label>
              <input
                type="text"
                value={
                  appSettings.withdraw_closed_message ??
                  'Withdrawals sirf muqarara waqt (Open Hours) mein open hoti hain. Meharbani karke open timing mein request bhejein.'
                }
                onChange={(e) =>
                  setAppSettings({ ...appSettings, withdraw_closed_message: e.target.value })
                }
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function AdminPromoCodesStep({
  appSettings,
  setAppSettings,
  onQuickSaveSettings,
}: AdminBusinessStepsProps) {
  const promoCodes = parsePromoCodesJson(appSettings.promo_codes_json);
  const promoClaims = parsePromoClaimsJson(appSettings.promo_claims_json);

  const [newCode, setNewCode] = useState('');
  const [newAmount, setNewAmount] = useState('50');
  const [newMaxUses, setNewMaxUses] = useState('50');
  const [newRequireActive, setNewRequireActive] = useState(true);
  const [newExpiresAt, setNewExpiresAt] = useState('');
  const [newNote, setNewNote] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const syncPromoCodes = async (updatedList: PromoCodeItem[]) => {
    const jsonStr = JSON.stringify(updatedList);
    setAppSettings((prev: any) => ({ ...prev, promo_codes_json: jsonStr }));
    if (onQuickSaveSettings) {
      await onQuickSaveSettings({ promo_codes_json: jsonStr });
    }
  };

  const handleAddPromoCode = async () => {
    const clean = newCode.trim().toUpperCase().replace(/\s+/g, '');
    if (!clean) {
      alert('Please enter a Promo Code name (e.g. JUMMA100).');
      return;
    }
    if (promoCodes.some((c) => c.code.toUpperCase() === clean)) {
      alert('Yeh Promo Code pehle se maujood hai.');
      return;
    }

    const item: PromoCodeItem = {
      id: `promo_${Date.now()}`,
      code: clean,
      reward_amount: Math.max(1, Number(newAmount) || 50),
      max_uses: Math.max(1, Number(newMaxUses) || 50),
      used_count: 0,
      require_active_plan: newRequireActive,
      expires_at: newExpiresAt,
      is_active: true,
      created_at: new Date().toISOString(),
      note: newNote.trim(),
    };

    await syncPromoCodes([item, ...promoCodes]);
    setNewCode('');
    setNewNote('');
  };

  const handleToggleCode = async (id: string) => {
    const updated = promoCodes.map((c) =>
      c.id === id ? { ...c, is_active: !c.is_active } : c
    );
    await syncPromoCodes(updated);
  };

  const handleDeleteCode = async (id: string) => {
    if (!confirm('Delete this Promo Code?')) return;
    const updated = promoCodes.filter((c) => c.id !== id);
    await syncPromoCodes(updated);
  };

  const handleCopySharePost = (item: PromoCodeItem) => {
    const text = `🎁 *${appSettings.site_name || 'Task Earn Hub'} Official Gift Code!* 🎁\n\n🔑 Promo Code: *${item.code}*\n💰 Instant Bonus: *Rs. ${item.reward_amount}*\n⚡ Limited For First: *${item.max_uses} Members*\n${item.require_active_plan ? '✅ Note: Active Plan Members Only\n' : ''}\nAbhi apna account login karein aur Home / Profile par Promo Code redeem karein!`;
    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const generateRandomCode = () => {
    const prefixes = ['BONUS', 'GIFT', 'JUMMA', 'EID', 'VIP', 'LUCKY'];
    const p = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(100 + Math.random() * 900);
    setNewCode(`${p}${num}`);
  };

  const isPromoEnabled = appSettings.promo_feature_enabled === 'true';

  const handleTogglePromoFeature = async () => {
    const nextVal = isPromoEnabled ? 'false' : 'true';
    setAppSettings((prev: any) => ({ ...prev, promo_feature_enabled: nextVal }));
    await setFeatureFlag(KNOWN_FEATURE_FLAGS.PROMO_CODES, nextVal === 'true');
    if (onQuickSaveSettings) {
      await onQuickSaveSettings({ promo_feature_enabled: nextVal });
    }
  };

  return (
    <div className="space-y-5">
      {/* Master Promo Feature ON/OFF Switch */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-slate-900">
              Promo &amp; Gift Code Feature Master Switch
            </h4>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                isPromoEnabled
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {isPromoEnabled ? 'ACTIVE (ON)' : 'DISABLED (OFF BY DEFAULT)'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isPromoEnabled
              ? 'Promo Code feature ON hai — Users apne Home aur Profile page se Promo Code redeem kar sakte hain.'
              : 'Promo Code feature abhi OFF hai — Website normal standard mode mein chal rahi hai. Jab chahein 1-click se ON karein.'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleTogglePromoFeature}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 self-start sm:self-center ${
            isPromoEnabled
              ? 'bg-[#0F7A50] text-white shadow-xs'
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          }`}
        >
          {isPromoEnabled ? 'Promo Code System: ON (Click to Turn OFF)' : 'Promo Code System: OFF (Click to Turn ON)'}
        </button>
      </div>

      {/* Create Promo Code Card */}
      <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Ticket className="w-4 h-4 text-[#0F7A50]" />
              Create New Promo / Gift Code Voucher
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              WhatsApp ya Telegram groups ke liye gift code banayein jisay laga kar users instant PKR bonus hasil karein.
            </p>
          </div>
          <button
            type="button"
            onClick={generateRandomCode}
            className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 self-start sm:self-center cursor-pointer"
          >
            Auto-Generate Code Name
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Promo Code String
            </label>
            <input
              type="text"
              placeholder="e.g. JUMMA100"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold uppercase text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Reward Amount (PKR)
            </label>
            <input
              type="number"
              min={1}
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-emerald-700 tabular-nums"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Max Redemptions Limit (Users)
            </label>
            <input
              type="number"
              min={1}
              value={newMaxUses}
              onChange={(e) => setNewMaxUses(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 tabular-nums"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-center">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Expiry Date (Optional)
            </label>
            <input
              type="date"
              value={newExpiresAt}
              onChange={(e) => setNewExpiresAt(e.target.value)}
              className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Short Note / Occasion
            </label>
            <input
              type="text"
              placeholder="e.g. Friday Special Bonus"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
            />
          </div>

          <div className="pt-4">
            <label className="flex items-center gap-2.5 cursor-pointer bg-white px-3.5 py-2.5 rounded-xl border border-slate-200">
              <input
                type="checkbox"
                checked={newRequireActive}
                onChange={(e) => setNewRequireActive(e.target.checked)}
                className="rounded text-[#0F7A50] focus:ring-[#0F7A50]"
              />
              <span className="text-xs font-bold text-slate-700">
                Active Plan Members Only
              </span>
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleAddPromoCode}
            className="px-5 py-2.5 rounded-xl bg-[#0F7A50] hover:bg-[#0c6140] text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create & Activate Promo Code</span>
          </button>
        </div>
      </div>

      {/* Existing Promo Codes List */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-800">
            Active & Past Promo Codes ({promoCodes.length})
          </h4>
          <span className="text-xs font-mono text-slate-500 tabular-nums">
            Total Claims: {promoClaims.length}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {promoCodes.map((item) => {
            const claimsForCode = promoClaims.filter((c) => c.code === item.code).length;
            const used = Math.max(item.used_count, claimsForCode);
            const pct = Math.min(100, Math.round((used / Math.max(1, item.max_uses)) * 100));

            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border space-y-3 ${
                  item.is_active ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-200 opacity-75'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-base text-slate-900 tracking-wider">
                        {item.code}
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 tabular-nums">
                        +Rs {item.reward_amount}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {item.note || 'Official Promo Voucher'} ·{' '}
                      {item.require_active_plan ? 'Active Plan Required' : 'All Users Eligible'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleCode(item.id)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                      item.is_active
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {item.is_active ? 'Active' : 'Paused'}
                  </button>
                </div>

                {/* Usage Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono text-slate-600 tabular-nums">
                    <span>Redeemed: {used} / {item.max_uses}</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#0F7A50] rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleCopySharePost(item)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === item.id ? 'Copied WhatsApp Post!' : 'Copy WhatsApp Post'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteCode(item.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Delete Code"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Redemptions Feed */}
      {promoClaims.length > 0 && (
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-3">
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Gift className="w-4 h-4 text-amber-500" />
            Recent User Promo Code Redemptions ({promoClaims.length})
          </h4>
          <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
            {promoClaims.slice(0, 25).map((claim) => (
              <div key={claim.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-800">{claim.username || 'Member'}</span>
                  <span className="text-slate-400 mx-1.5">·</span>
                  <span className="font-mono font-bold text-indigo-600">{claim.code}</span>
                </div>
                <div className="flex items-center gap-3 font-mono tabular-nums">
                  <span className="font-bold text-emerald-600">+Rs {claim.amount}</span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(claim.claimed_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminDailyTasksStep({
  appSettings,
  setAppSettings,
  onQuickSaveSettings,
}: AdminBusinessStepsProps) {
  const taskConfig = parseDailyTasksConfig(appSettings);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState<DailyTaskCategory>('youtube');
  const [timerSec, setTimerSec] = useState('15');

  const syncTasksList = async (nextTasks: DailyVerificationTask[]) => {
    const jsonStr = JSON.stringify(nextTasks);
    setAppSettings((prev: any) => ({ ...prev, daily_tasks_json: jsonStr }));
    if (onQuickSaveSettings) {
      await onQuickSaveSettings({ daily_tasks_json: jsonStr });
    }
  };

  const handleAddTask = async () => {
    if (!title.trim() || !url.trim()) {
      alert('Task Title aur Link URL dono enter karein.');
      return;
    }
    const newTask: DailyVerificationTask = {
      id: `task_${Date.now()}`,
      title: title.trim(),
      url: url.trim(),
      category,
      timer_seconds: Math.max(3, Math.min(300, Number(timerSec) || 15)),
      is_active: true,
    };
    await syncTasksList([...taskConfig.tasks, newTask]);
    setTitle('');
    setUrl('');
  };

  const handleToggleTask = async (id: string) => {
    const updated = taskConfig.tasks.map((t) =>
      t.id === id ? { ...t, is_active: !t.is_active } : t
    );
    await syncTasksList(updated);
  };

  const handleDeleteTask = async (id: string) => {
    if (taskConfig.tasks.length <= 1) {
      alert('Kam az kam 1 task list mein hona zaroori hai.');
      return;
    }
    const updated = taskConfig.tasks.filter((t) => t.id !== id);
    await syncTasksList(updated);
  };

  const renderCatIcon = (cat: DailyTaskCategory) => {
    switch (cat) {
      case 'youtube':
        return <Play className="w-4 h-4 text-rose-600" />;
      case 'whatsapp':
        return <MessageCircle className="w-4 h-4 text-emerald-600" />;
      case 'telegram':
        return <Send className="w-4 h-4 text-sky-600" />;
      case 'tiktok':
        return <Sparkles className="w-4 h-4 text-purple-600" />;
      default:
        return <Globe className="w-4 h-4 text-indigo-600" />;
    }
  };

  const handleToggleMasterTaskRequirement = async () => {
    const nextVal = taskConfig.require_task_before_claim ? 'false' : 'true';
    setAppSettings((prev: any) => ({
      ...prev,
      require_task_before_claim: nextVal,
    }));
    await setFeatureFlag(KNOWN_FEATURE_FLAGS.DAILY_TASK_VERIFICATION, nextVal === 'true');
    if (onQuickSaveSettings) {
      await onQuickSaveSettings({ require_task_before_claim: nextVal });
    }
  };

  return (
    <div className="space-y-5">
      {/* Master Task Verification Switch */}
      <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#0F7A50]" />
                Daily Reward Link &amp; Countdown Timer Verification
              </h4>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  taskConfig.require_task_before_claim
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {taskConfig.require_task_before_claim ? 'ACTIVE (ON)' : 'OFF (DEFAULT)'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {taskConfig.require_task_before_claim
                ? 'ACTIVE: Users ko apna Daily Plan Reward claim karne se pehle link open kar ke countdown timer poora karna hoga.'
                : 'DEFAULT (OFF): Users bina kisi link ya timer ke direct 1-click se apna Daily Plan Reward collect kar sakte hain.'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleToggleMasterTaskRequirement}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 self-start sm:self-center ${
              taskConfig.require_task_before_claim
                ? 'bg-[#0F7A50] text-white shadow-xs'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            {taskConfig.require_task_before_claim
              ? 'Task Timer Verification: ON (Click to Turn OFF)'
              : 'Task Timer Verification: OFF (Default 1-Click Claim)'}
          </button>
        </div>

        <div className="pt-3 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-bold text-slate-700">
            Default Verification Countdown Timer:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {['5', '10', '15', '30', '45', '60'].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() =>
                  setAppSettings({ ...appSettings, task_default_timer_seconds: sec })
                }
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold cursor-pointer ${
                  String(taskConfig.default_timer_seconds) === sec
                    ? 'bg-[#0F7A50] text-white'
                    : 'bg-white border border-slate-200 text-slate-600'
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Add New Verification Link / Video Task */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-4">
        <h4 className="text-sm font-bold text-slate-800">
          Add Daily Task Link (YouTube, Website, WhatsApp, Telegram, TikTok)
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Task Title / Instruction
            </label>
            <input
              type="text"
              placeholder="e.g. Watch Today's Official Video & Subscribe"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Target Link URL
            </label>
            <input
              type="url"
              placeholder="https://youtube.com/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Platform Type
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as DailyTaskCategory)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
            >
              <option value="youtube">YouTube Video</option>
              <option value="website">Website / Ad Link</option>
              <option value="whatsapp">WhatsApp Channel</option>
              <option value="telegram">Telegram Channel</option>
              <option value="tiktok">TikTok Video</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Watch Timer (Seconds)
            </label>
            <input
              type="number"
              min={3}
              max={300}
              value={timerSec}
              onChange={(e) => setTimerSec(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 tabular-nums"
            />
          </div>

          <button
            type="button"
            onClick={handleAddTask}
            className="w-full py-2.5 px-4 rounded-xl bg-[#0F7A50] hover:bg-[#0c6140] text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Verification Task</span>
          </button>
        </div>

        {/* Tasks List */}
        <div className="divide-y divide-slate-100 pt-2">
          {taskConfig.tasks.map((t, index) => (
            <div key={t.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                  {renderCatIcon(t.category)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold text-slate-500">
                      Task #{index + 1}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-amber-600 tabular-nums">
                      · {t.timer_seconds}s Timer
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">{t.title}</p>
                  <a
                    href={t.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-mono text-indigo-600 hover:underline inline-flex items-center gap-1 truncate max-w-xs"
                  >
                    {t.url} <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <button
                  type="button"
                  onClick={() => handleToggleTask(t.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                    t.is_active
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {t.is_active ? 'Active' : 'Paused'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteTask(t.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==============================================================================
// 🌐 STEP 10: Multi-Currency & Exchange Rates Engine
// ==============================================================================

export function AdminCurrencySettingsStep({
  appSettings,
  setAppSettings,
  onQuickSaveSettings,
}: AdminBusinessStepsProps) {
  const [quickSaving, setQuickSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const currentRates = parseExchangeRatesJson(appSettings.currency_rates_json);
  const defaultCurrency: CurrencyCode = (appSettings.default_platform_currency as CurrencyCode) || 'PKR';
  const allowUserSwitch = appSettings.allow_user_currency_switch !== 'false';

  const updateRates = (newRates: Record<string, number>) => {
    const jsonStr = JSON.stringify(newRates);
    setAppSettings((prev: any) => ({
      ...prev,
      currency_rates_json: jsonStr,
    }));
  };

  const handleRateChange = (code: 'USD' | 'INR' | 'USDT', valStr: string) => {
    const val = parseFloat(valStr);
    const updated = {
      ...currentRates,
      [code]: isNaN(val) || val <= 0 ? DEFAULT_EXCHANGE_RATES[code] : val,
    };
    updateRates(updated);
  };

  const handleResetDefaults = () => {
    if (confirm('Kya aap exchange rates ko market default (1 USD = 280 PKR, 1 INR = 3.35 PKR, 1 USDT = 280 PKR) par reset karna chahte hain?')) {
      updateRates(DEFAULT_EXCHANGE_RATES);
    }
  };

  const handleQuickSave = async () => {
    if (!onQuickSaveSettings) return;
    setQuickSaving(true);
    try {
      await onQuickSaveSettings({
        currency_rates_json: JSON.stringify(currentRates),
        default_platform_currency: defaultCurrency,
        allow_user_currency_switch: allowUserSwitch ? 'true' : 'false',
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (e: any) {
      alert('Failed to save currency settings: ' + (e?.message || e));
    } finally {
      setQuickSaving(false);
    }
  };

  const previewAmounts = [250, 500, 1000, 5000];

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 border border-emerald-500/30">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-600/20 shrink-0">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                Step 10 of 10
              </span>
              <h3 className="font-black text-base sm:text-lg text-slate-900">
                Multi-Currency &amp; Exchange Rates Engine
              </h3>
            </div>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              Base financial accounting database mein hamesha 100% strict PKR par mehfooz rehti hai. Yahan USD, INR aur USDT ke live conversion rates set karein.
            </p>
          </div>
        </div>

        {onQuickSaveSettings && (
          <button
            type="button"
            disabled={quickSaving}
            onClick={handleQuickSave}
            className="self-start sm:self-center px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50 shrink-0"
          >
            {saveSuccess ? (
              <>
                <CheckCircle className="w-4 h-4 text-emerald-200" />
                <span>Saved &amp; Synced!</span>
              </>
            ) : quickSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Quick Save Live</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Grid of Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: Default Platform Currency */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-slate-800">
            <Coins className="w-5 h-5 text-emerald-600" />
            <h4 className="font-bold text-sm">Default Platform Currency</h4>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Jo naye visitors website kholen ge un ko default tor par yeh currency nazar aaye gi jab tak woh khud tabdeel na karein.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {(['PKR', 'USD', 'INR', 'USDT'] as CurrencyCode[]).map((code) => {
              const meta = SUPPORTED_CURRENCIES[code];
              const isSelected = defaultCurrency === code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() =>
                    setAppSettings((prev: any) => ({
                      ...prev,
                      default_platform_currency: code,
                    }))
                  }
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-black shadow-xs ring-2 ring-emerald-500/20'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-bold'
                  }`}
                >
                  <span className="text-2xl">{meta.flag}</span>
                  <span className="text-xs">{meta.code}</span>
                  <span className="text-[10px] opacity-75 font-mono">{meta.symbol}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Card 2: User Switcher Permission */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-slate-800">
              <Globe className="w-5 h-5 text-indigo-600" />
              <h4 className="font-bold text-sm">Allow Users to Switch Currency</h4>
            </div>
            <button
              type="button"
              onClick={() =>
                setAppSettings((prev: any) => ({
                  ...prev,
                  allow_user_currency_switch: allowUserSwitch ? 'false' : 'true',
                }))
              }
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                allowUserSwitch ? 'bg-emerald-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                  allowUserSwitch ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Agar enabled ho to users header bar, sidebar, profile aur plans view se foran apni marzi ki currency (PKR, USD, INR, USDT) select kar sakte hain.
          </p>

          <div
            className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
              allowUserSwitch
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${allowUserSwitch ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            <span>
              {allowUserSwitch
                ? 'User Currency Switcher is ACTIVE on website'
                : 'User Switcher is HIDDEN (All users will see default currency)'}
            </span>
          </div>
        </div>
      </div>

      {/* Card 3: Exchange Rates Configuration */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h4 className="font-black text-sm sm:text-base text-slate-900 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>Conversion Rates Configuration (PKR Parity)</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Specify how many Pakistani Rupees (PKR) equal 1 unit of foreign currency. Formula: Foreign Amount = PKR Amount / Rate.
            </p>
          </div>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="self-start sm:self-center px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Market Defaults</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* USD Rate */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🇺🇸</span>
                <span className="font-extrabold text-sm text-slate-800">1 US Dollar (USD)</span>
              </div>
              <span className="text-xs font-mono font-bold text-slate-500">$</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                min="1"
                value={currentRates.USD}
                onChange={(e) => handleRateChange('USD', e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              <span className="text-xs font-bold text-slate-500 shrink-0">PKR</span>
            </div>
            <p className="text-[10px] text-slate-400">Default: 280 PKR</p>
          </div>

          {/* INR Rate */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🇮🇳</span>
                <span className="font-extrabold text-sm text-slate-800">1 Indian Rupee (INR)</span>
              </div>
              <span className="text-xs font-mono font-bold text-slate-500">₹</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                min="0.1"
                value={currentRates.INR}
                onChange={(e) => handleRateChange('INR', e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              <span className="text-xs font-bold text-slate-500 shrink-0">PKR</span>
            </div>
            <p className="text-[10px] text-slate-400">Default: 3.35 PKR</p>
          </div>

          {/* USDT Rate */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🌐</span>
                <span className="font-extrabold text-sm text-slate-800">1 Tether USD (USDT)</span>
              </div>
              <span className="text-xs font-mono font-bold text-slate-500">₮</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                min="1"
                value={currentRates.USDT}
                onChange={(e) => handleRateChange('USDT', e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              <span className="text-xs font-bold text-slate-500 shrink-0">PKR</span>
            </div>
            <p className="text-[10px] text-slate-400">Default: 280 PKR</p>
          </div>
        </div>

        {/* Live Calculation Preview */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <p className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
            Live Preview (How Platform Prices Look in Other Currencies)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {previewAmounts.map((pkrAmt) => (
              <div key={pkrAmt} className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs space-y-1">
                <p className="text-[11px] font-black text-slate-900 font-mono">
                  Rs. {pkrAmt.toLocaleString()}
                </p>
                <div className="text-[10px] space-y-0.5 text-slate-600 font-mono">
                  <p>🇺🇸 {formatCurrency(pkrAmt, 'USD', currentRates)}</p>
                  <p>🇮🇳 {formatCurrency(pkrAmt, 'INR', currentRates)}</p>
                  <p>🌐 {formatCurrency(pkrAmt, 'USDT', currentRates)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
