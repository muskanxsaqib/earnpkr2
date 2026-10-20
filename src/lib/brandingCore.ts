export type BrandIconPresetKey =
  | 'custom_image'
  | 'dollar'
  | 'crown'
  | 'rocket'
  | 'diamond'
  | 'flame'
  | 'shield'
  | 'trophy';

export interface SiteBranding {
  site_name: string;
  site_tagline: string;
  site_description: string;
  site_logo_url: string;
  site_icon_preset: BrandIconPresetKey;
  show_landing_page: string;
  landing_badge: string;
  landing_title: string;
  landing_about: string;
  landing_hero_image: string;
  landing_show_hero_image: string;
  landing_show_live_ticker: string;
  landing_show_about: string;
  landing_show_steps: string;
  landing_show_plans: string;
  landing_show_calculator: string;
  landing_show_stats: string;
  landing_show_faq: string;
  landing_step1_title: string;
  landing_step1_desc: string;
  landing_step2_title: string;
  landing_step2_desc: string;
  landing_step3_title: string;
  landing_step3_desc: string;
  landing_login_btn_text: string;
  landing_register_btn_text: string;
}

export const DEFAULT_SITE_BRANDING: SiteBranding = {
  site_name: 'Earning Hub',
  site_tagline: 'Powered by Saqib',
  site_description: 'Earn daily, withdraw anytime',
  site_logo_url: 'https://ik.imagekit.io/19imy4f1u/lite_1783801856823_8COA8zmhu.webp',
  site_icon_preset: 'trophy',
  show_landing_page: 'true',
  landing_badge: "PAKISTAN'S #1 DAILY REWARD PLATFORM",
  landing_title: 'Earn Daily Fixed Rewards & Instant Referral Bonuses',
  landing_about:
    'Welcome to our official earning platform! Activate any reward package to collect fixed daily income for 30 days (Day 1 unlocked immediately), invite team members for flat referral bonuses & weekly team salaries, and withdraw your earnings anytime via EasyPaisa or JazzCash.',
  landing_hero_image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1000&q=80',
  landing_show_hero_image: 'true',
  landing_show_live_ticker: 'true',
  landing_show_about: 'true',
  landing_show_steps: 'true',
  landing_show_plans: 'true',
  landing_show_calculator: 'true',
  landing_show_stats: 'true',
  landing_show_faq: 'true',
  landing_step1_title: 'Register & Choose a Package',
  landing_step1_desc: 'Create your free account and activate any earning plan starting from affordable PKR packages via EasyPaisa or JazzCash.',
  landing_step2_title: 'Collect Daily Fixed Rewards',
  landing_step2_desc: 'Day 1 reward unlocks immediately upon activation! Collect fixed daily income every 24 hours for the full plan duration.',
  landing_step3_title: 'Invite Friends & Withdraw',
  landing_step3_desc: 'Get flat referral bonuses per invited member, unlock all 30-day rewards, and withdraw anytime to your mobile wallet.',
  landing_login_btn_text: 'Login',
  landing_register_btn_text: 'Register Now',
};

export const BRAND_ICON_PRESETS: Array<{
  key: BrandIconPresetKey;
  label: string;
  gradient: string;
}> = [
  { key: 'custom_image', label: 'Custom Logo Image', gradient: 'from-emerald-500 to-teal-600' },
  { key: 'dollar', label: 'Emerald Dollar', gradient: 'from-emerald-500 to-green-600' },
  { key: 'crown', label: 'Royal Crown', gradient: 'from-amber-500 to-orange-600' },
  { key: 'rocket', label: 'Turbo Rocket', gradient: 'from-indigo-500 to-purple-600' },
  { key: 'diamond', label: 'VIP Diamond', gradient: 'from-cyan-500 to-blue-600' },
  { key: 'flame', label: 'Fire Flame', gradient: 'from-rose-500 to-orange-500' },
  { key: 'shield', label: 'Secure Shield', gradient: 'from-teal-500 to-emerald-700' },
  { key: 'trophy', label: 'Champion Trophy', gradient: 'from-yellow-500 to-amber-600' },
];

export const BRANDING_SETTING_KEYS = [
  'site_name',
  'site_tagline',
  'site_description',
  'site_logo_url',
  'site_icon_preset',
  'show_landing_page',
  'landing_badge',
  'landing_title',
  'landing_about',
  'landing_hero_image',
  'landing_show_hero_image',
  'landing_show_live_ticker',
  'landing_show_about',
  'landing_show_steps',
  'landing_show_plans',
  'landing_show_calculator',
  'landing_show_stats',
  'landing_show_faq',
  'landing_step1_title',
  'landing_step1_desc',
  'landing_step2_title',
  'landing_step2_desc',
  'landing_step3_title',
  'landing_step3_desc',
  'landing_login_btn_text',
  'landing_register_btn_text',
  'authorized_domains',
] as const;

const VALID_PRESETS = new Set<string>(BRAND_ICON_PRESETS.map((p) => p.key));

export function normalizeBranding(raw?: Partial<SiteBranding> | null): SiteBranding {
  const safe = raw || {};
  const presetCandidate = String(safe.site_icon_preset || '').trim();
  const validPreset: BrandIconPresetKey = VALID_PRESETS.has(presetCandidate)
    ? (presetCandidate as BrandIconPresetKey)
    : DEFAULT_SITE_BRANDING.site_icon_preset;

  return {
    site_name: String(safe.site_name || '').trim() || DEFAULT_SITE_BRANDING.site_name,
    site_tagline:
      safe.site_tagline !== undefined && safe.site_tagline !== null
        ? String(safe.site_tagline).trim() || DEFAULT_SITE_BRANDING.site_tagline
        : DEFAULT_SITE_BRANDING.site_tagline,
    site_description:
      String(safe.site_description || '').trim() || DEFAULT_SITE_BRANDING.site_description,
    site_logo_url: String(safe.site_logo_url || '').trim() || DEFAULT_SITE_BRANDING.site_logo_url,
    site_icon_preset: validPreset,
    show_landing_page:
      safe.show_landing_page === 'false' ? 'false' : DEFAULT_SITE_BRANDING.show_landing_page,
    landing_badge:
      String(safe.landing_badge ?? '').trim() || DEFAULT_SITE_BRANDING.landing_badge,
    landing_title:
      String(safe.landing_title ?? '').trim() || DEFAULT_SITE_BRANDING.landing_title,
    landing_about:
      String(safe.landing_about ?? '').trim() || DEFAULT_SITE_BRANDING.landing_about,
    landing_hero_image:
      safe.landing_hero_image !== undefined && safe.landing_hero_image !== null
        ? String(safe.landing_hero_image).trim()
        : DEFAULT_SITE_BRANDING.landing_hero_image,
    landing_show_hero_image:
      safe.landing_show_hero_image === 'false' ? 'false' : 'true',
    landing_show_live_ticker:
      safe.landing_show_live_ticker === 'false' ? 'false' : 'true',
    landing_show_about:
      safe.landing_show_about === 'false' ? 'false' : 'true',
    landing_show_steps:
      safe.landing_show_steps === 'false' ? 'false' : 'true',
    landing_show_plans:
      safe.landing_show_plans === 'false' ? 'false' : 'true',
    landing_show_calculator:
      safe.landing_show_calculator === 'false' ? 'false' : 'true',
    landing_show_stats:
      safe.landing_show_stats === 'false' ? 'false' : 'true',
    landing_show_faq:
      safe.landing_show_faq === 'false' ? 'false' : 'true',
    landing_step1_title:
      String(safe.landing_step1_title || '').trim() || DEFAULT_SITE_BRANDING.landing_step1_title,
    landing_step1_desc:
      String(safe.landing_step1_desc || '').trim() || DEFAULT_SITE_BRANDING.landing_step1_desc,
    landing_step2_title:
      String(safe.landing_step2_title || '').trim() || DEFAULT_SITE_BRANDING.landing_step2_title,
    landing_step2_desc:
      String(safe.landing_step2_desc || '').trim() || DEFAULT_SITE_BRANDING.landing_step2_desc,
    landing_step3_title:
      String(safe.landing_step3_title || '').trim() || DEFAULT_SITE_BRANDING.landing_step3_title,
    landing_step3_desc:
      String(safe.landing_step3_desc || '').trim() || DEFAULT_SITE_BRANDING.landing_step3_desc,
    landing_login_btn_text:
      String(safe.landing_login_btn_text || '').trim() || DEFAULT_SITE_BRANDING.landing_login_btn_text,
    landing_register_btn_text:
      String(safe.landing_register_btn_text || '').trim() || DEFAULT_SITE_BRANDING.landing_register_btn_text,
  };
}
