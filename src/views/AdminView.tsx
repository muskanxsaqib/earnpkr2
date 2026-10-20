import React, { useState, useEffect } from 'react';
import { 
  Shield, Users, Package, Settings, Edit, Trash2, CheckCircle, XCircle, Activity, 
  TrendingUp, TrendingDown, Award, Clipboard, Copy, Check, ChevronDown, ChevronUp, ChevronRight, ArrowLeft,
  Clock, FileText, Download, BarChart2, PieChart, Search, Eye, EyeOff, X, MessageSquare, Mail, Megaphone,
  Plus, AlertTriangle, Sparkles, RefreshCw, Calculator, Upload, Globe, Palette, Type, Volume2, CreditCard, Lock, LayoutGrid,
  Ticket, ShieldCheck, Image as ImageIcon, Zap
} from 'lucide-react';
import { supabase, broadcastChange } from '../lib/supabase';
import { hashSHA256, isSHA256 } from '../lib/crypto';
import {
  PLAN_THEMES,
  PLAN_ICONS,
  OFFICIAL_PLANS_MATRIX,
  parsePlansMeta,
  mergePlanWithMeta,
  validatePlanEconomics,
  calculatePlanEconomics,
  PlansMetaMap
} from '../lib/economics';
import { evaluateTeamLevelEconomics } from '../lib/rewardLevels';
import {
  DEFAULT_SITE_BRANDING,
  BRAND_ICON_PRESETS,
  renderBrandPresetIcon,
  saveBrandingCache,
  BrandIconPresetKey
} from '../lib/branding';
import { APP_THEMES_CATALOG } from '../types/themeCatalog';
import { APP_FONT_PACKS } from '../types/fontCatalog';
import {
  AdminWithdrawalRulesSection,
  AdminPromoCodesStep,
  AdminDailyTasksStep,
} from '../components/AdminBusinessEnginesSteps';
import {
  getUserPromoBonusTotal,
  parsePromoCodesJson,
} from '../lib/platformFeatures';
import { uploadToImageKit } from '../lib/imagekit';

export type AdminSettingsStep = 'menu' | 'branding' | 'theme' | 'landing' | 'channels' | 'economics' | 'salary' | 'security' | 'promo' | 'tasks' | 'all';

export function AdminView() {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'plans' | 'payments' | 'deposits' | 'withdrawals' | 'settings' | 'analytics' | 'feedbacks' | 'messages'>('overview');
  // WhatsApp / TikTok style Step-by-Step Mobile Hub navigation state
  const [mobileHubOpen, setMobileHubOpen] = useState<boolean>(true);
  const [settingsStep, setSettingsStep] = useState<AdminSettingsStep>('menu');
  const [hubSearchQuery, setHubSearchQuery] = useState<string>('');
  const [usersCount, setUsersCount] = useState(0);
  const [users, setUsers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [userPlans, setUserPlans] = useState<any[]>([]);
  const [pendingDeposits, setPendingDeposits] = useState<any[]>([]);
  const [allDeposits, setAllDeposits] = useState<any[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<any[]>([]);
  const [allWithdrawals, setAllWithdrawals] = useState<any[]>([]);
  const [allRewards, setAllRewards] = useState<any[]>([]);
  const [weeklySalaries, setWeeklySalaries] = useState<any[]>([]);
  const [referralCollections, setReferralCollections] = useState<any[]>([]);
  const [copiedQueryId, setCopiedQueryId] = useState<string | null>(null);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [adminMessages, setAdminMessages] = useState<any[]>([]);
  const [activeQueryCategory, setActiveQueryCategory] = useState<string>('consolidated_metrics');
  const [showExpectedMatrix, setShowExpectedMatrix] = useState(false);
  
  const [appSettings, setAppSettings] = useState<any>({
    site_name: DEFAULT_SITE_BRANDING.site_name,
    site_tagline: DEFAULT_SITE_BRANDING.site_tagline,
    site_description: DEFAULT_SITE_BRANDING.site_description,
    site_logo_url: DEFAULT_SITE_BRANDING.site_logo_url,
    site_icon_preset: DEFAULT_SITE_BRANDING.site_icon_preset,
    show_landing_page: DEFAULT_SITE_BRANDING.show_landing_page,
    landing_badge: DEFAULT_SITE_BRANDING.landing_badge,
    landing_title: DEFAULT_SITE_BRANDING.landing_title,
    landing_about: DEFAULT_SITE_BRANDING.landing_about,
    landing_hero_image: DEFAULT_SITE_BRANDING.landing_hero_image,
    landing_show_hero_image: DEFAULT_SITE_BRANDING.landing_show_hero_image,
    landing_show_live_ticker: DEFAULT_SITE_BRANDING.landing_show_live_ticker,
    landing_show_about: DEFAULT_SITE_BRANDING.landing_show_about,
    landing_show_steps: DEFAULT_SITE_BRANDING.landing_show_steps,
    landing_show_plans: DEFAULT_SITE_BRANDING.landing_show_plans,
    landing_show_calculator: DEFAULT_SITE_BRANDING.landing_show_calculator,
    landing_show_stats: DEFAULT_SITE_BRANDING.landing_show_stats,
    landing_show_faq: DEFAULT_SITE_BRANDING.landing_show_faq,
    landing_step1_title: DEFAULT_SITE_BRANDING.landing_step1_title,
    landing_step1_desc: DEFAULT_SITE_BRANDING.landing_step1_desc,
    landing_step2_title: DEFAULT_SITE_BRANDING.landing_step2_title,
    landing_step2_desc: DEFAULT_SITE_BRANDING.landing_step2_desc,
    landing_step3_title: DEFAULT_SITE_BRANDING.landing_step3_title,
    landing_step3_desc: DEFAULT_SITE_BRANDING.landing_step3_desc,
    landing_login_btn_text: DEFAULT_SITE_BRANDING.landing_login_btn_text,
    landing_register_btn_text: DEFAULT_SITE_BRANDING.landing_register_btn_text,
    default_theme_mode: 'astro-neu',
    default_font_mode: 'tech-modern',
    default_rgb_light: 'true',
    allow_user_theme_switcher: 'true',
    marquee_text: '',
    whatsapp_link: '',
    telegram_link: '',
    show_whatsapp: 'true',
    show_telegram: 'true',
    restrict_multiple_accounts: 'true',
    restrict_same_ip: 'false',
    referral_bonus: '50',
    base_member_plan_price: '250',
    min_withdrawal: '100',
    min_withdraw_amount: '100',
    withdrawal_rules_enabled: 'false',
    max_withdraw_amount: '50000',
    withdraw_fee_percent: '0',
    withdraw_fee_fixed: '0',
    withdraw_schedule_enabled: 'false',
    withdraw_open_hour: '9',
    withdraw_close_hour: '21',
    withdraw_allowed_days: '1,2,3,4,5,6',
    withdraw_closed_message: 'Withdrawals sirf muqarara waqt (Open Hours) mein open hoti hain. Meharbani karke open timing mein request bhejein.',
    promo_feature_enabled: 'false',
    promo_codes_json: '',
    promo_claims_json: '',
    require_task_before_claim: 'false',
    task_default_timer_seconds: '15',
    daily_tasks_json: '',
    free_reward_days: '1',
    invite_share_template: '',
    invite_share_message: '',
    plans_meta_json: '{}',
    level_1_req: '10',
    level_2_req: '30',
    level_3_req: '50',
    level_4_req: '100',
    level_5_req: '150',
    level_6_req: '300',
    level_1_reward: '',
    level_2_reward: '',
    level_3_reward: '',
    level_4_reward: '',
    level_5_reward: '',
    level_6_reward: ''
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingBrandingNow, setSavingBrandingNow] = useState(false);
  const [brandingSavedNotice, setBrandingSavedNotice] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingHeroImage, setUploadingHeroImage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pageViews, setPageViews] = useState<any[]>([]);
  
  // For plan creating, editing & live economic validation
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [autoCalculatePlanFields, setAutoCalculatePlanFields] = useState(true);
  const [savingPlan, setSavingPlan] = useState(false);
  const [planSaveError, setPlanSaveError] = useState<string | null>(null);
  const [showProfitSimulator, setShowProfitSimulator] = useState(false);
  const [simReferralBonus, setSimReferralBonus] = useState<number>(50);
  const [simBaseMemberPrice, setSimBaseMemberPrice] = useState<number>(250);
  
  // For payment method editing/adding
  const [editingPayment, setEditingPayment] = useState<any | null>(null);
  const [isAddingPayment, setIsAddingPayment] = useState(false);

  // Custom User detailed search and view details states
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  // For Admin Direct Plan Gifting
  const [giftingUser, setGiftingUser] = useState<any | null>(null);
  const [selectedGiftPlanId, setSelectedGiftPlanId] = useState<number | null>(null);
  const [isGiftingPlan, setIsGiftingPlan] = useState<boolean>(false);
  const [giftPlanNotice, setGiftPlanNotice] = useState<string | null>(null);
  const [giftCreditReferral, setGiftCreditReferral] = useState<boolean>(true);

  // Security gate credentials state
  const [secUsername, setSecUsername] = useState('saqib');
  const [secPassword, setSecPassword] = useState(''); // Initialized securely
  const [oldSecPasswordInput, setOldSecPasswordInput] = useState('');
  const [newSecUsernameInput, setNewSecUsernameInput] = useState('');
  const [newSecPasswordInput, setNewSecPasswordInput] = useState('');
  const [savingSec, setSavingSec] = useState(false);
  const [secSuccess, setSecSuccess] = useState(false);
  const [secError, setSecError] = useState<string | null>(null);

  const handleSaveSecuritySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldSecPasswordInput.trim()) {
      setSecError('Current Security Password is required for verification.');
      return;
    }
    if (!newSecUsernameInput.trim() || !newSecPasswordInput.trim()) {
      setSecError('New Username and New Password cannot be empty.');
      return;
    }

    setSavingSec(true);
    setSecError(null);
    setSecSuccess(false);

    try {
      // Check current credentials in database for validation
      const { data: existingSec, error: fetchErr } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('method_name', 'SYSTEM_SECURITY')
        .maybeSingle();

      if (fetchErr) throw fetchErr;

      // Default fallback if not initialized in database yet (SHA-256 hash of 'saqibadmin')
      const dbPasswordHash = existingSec ? existingSec.account_number : 'ba4047c28869701d79e28826b527203f8ecb669b0c7a4e6a234feeec56e2e90a';

      const enteredOldPasswordHash = await hashSHA256(oldSecPasswordInput);
      let isOldPasswordValid = false;

      if (isSHA256(dbPasswordHash)) {
        isOldPasswordValid = (enteredOldPasswordHash.toLowerCase() === dbPasswordHash.toLowerCase());
      } else {
        isOldPasswordValid = (oldSecPasswordInput === dbPasswordHash);
      }

      if (!isOldPasswordValid) {
        setSecError('Verification Failed: The Current Security Password you entered is incorrect.');
        setSavingSec(false);
        return;
      }

      // Hash the new password before storing it securely
      const newSecPasswordHash = await hashSHA256(newSecPasswordInput);

      if (existingSec) {
        const { error } = await supabase
          .from('payment_methods')
          .update({
            account_name: newSecUsernameInput,
            account_number: newSecPasswordHash
          })
          .eq('method_name', 'SYSTEM_SECURITY');
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('payment_methods')
          .insert({
            method_name: 'SYSTEM_SECURITY',
            account_name: newSecUsernameInput,
            account_number: newSecPasswordHash,
            is_active: false
          });
        
        if (error) throw error;
      }

      setSecUsername(newSecUsernameInput);
      setSecPassword(newSecPasswordHash);
      setOldSecPasswordInput('');
      setNewSecPasswordInput('');
      setSecSuccess(true);
      setTimeout(() => setSecSuccess(false), 5000);
    } catch (err: any) {
      console.error('Failed to update security credentials:', err);
      setSecError(err.message || 'Failed to update credentials in database.');
    } finally {
      setSavingSec(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Set up real-time subscriptions for admin updates
    const channel = supabase
      .channel('admin-realtime-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deposits' },
        () => {
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'withdrawals' },
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
        { event: '*', schema: 'public', table: 'daily_rewards' },
        () => {
          fetchData();
        }
      )
      .on(
        'broadcast',
        { event: 'db_change' },
        (payload) => {
          console.log('Admin received real-time broadcast sync:', payload);
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch users
      const { data: usersData, count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' });
      
      setUsers(usersData || []);
      setUsersCount(count || 0);

      // Fetch plans
      const { data: plansData } = await supabase
        .from('plans')
        .select('*')
        .order('plan_number', { ascending: true });
        
      setPlans(plansData || []);

      // Fetch payment methods
      const { data: paymentsData } = await supabase
        .from('payment_methods')
        .select('*')
        .order('id', { ascending: true });
        
      const normalizedPayments = (paymentsData || []).map(pm => ({
        ...pm,
        account_name: pm.account_name || pm.account_title || '',
        account_title: pm.account_title || pm.account_name || ''
      }));
        
      setPaymentMethods(normalizedPayments.filter(pm => pm.method_name !== 'SYSTEM_SECURITY'));

      // Fetch system security credentials from database
      const { data: secData } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('method_name', 'SYSTEM_SECURITY')
        .maybeSingle();
      if (secData) {
        setSecUsername(secData.account_name);
        setSecPassword(secData.account_number);
        setNewSecUsernameInput(secData.account_name);
      } else {
        setNewSecUsernameInput('saqib');
      }

      // Fetch user plans
      const { data: userPlansData } = await supabase
        .from('user_plans')
        .select('*, profiles(username, email), plans(plan_number, plan_price, daily_reward)')
        .order('created_at', { ascending: false });
        
      setUserPlans(userPlansData || []);

      // Fetch pending deposits
      const { data: depositsData } = await supabase
        .from('deposits')
        .select('*, profiles(username, email), plans(plan_number, plan_price, daily_reward), payment_methods(method_name, account_number)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
        
      setPendingDeposits(depositsData || []);

      // Fetch pending withdrawals
      try {
        let { data: withdrawalsData, error } = await supabase
          .from('withdrawals')
          .select('*, profiles(username, email, phone, balance)')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        
        if (error && (error.code === 'PGRST205' || error.message?.includes('withdrawals'))) {
          const localData = JSON.parse(localStorage.getItem('local_withdrawals') || '[]');
          withdrawalsData = localData.filter((w: any) => w.status === 'pending');
        }
        setPendingWithdrawals(withdrawalsData || []);
      } catch (err) {
        console.warn('Failed to fetch pending withdrawals:', err);
      }

      // Fetch all withdrawals
      try {
        let { data: allWiths, error } = await supabase
          .from('withdrawals')
          .select('*, profiles(username, email, phone, balance)')
          .order('created_at', { ascending: false });
        
        if (error && (error.code === 'PGRST205' || error.message?.includes('withdrawals'))) {
          allWiths = JSON.parse(localStorage.getItem('local_withdrawals') || '[]');
        }
        setAllWithdrawals(allWiths || []);
      } catch (err) {
        console.warn('Failed to fetch all withdrawals:', err);
      }

      // Fetch all deposits (for full investment analytics)
      const { data: allDeps } = await supabase
        .from('deposits')
        .select('*, profiles(username, email), plans(plan_number, plan_price, daily_reward)')
        .order('created_at', { ascending: false });
      setAllDeposits(allDeps || []);

      // Fetch all daily rewards (for payout analytics)
      const { data: allRws } = await supabase
        .from('daily_rewards')
        .select('*');
      setAllRewards(allRws || []);

      // Fetch weekly salary collections safely
      try {
        const { data: wkSalaries } = await supabase
          .from('weekly_salary_collections')
          .select('*');
        setWeeklySalaries(wkSalaries || []);
      } catch (err) {
        console.warn('Failed to fetch weekly_salary_collections:', err);
      }

      // Fetch referral collections safely
      try {
        const { data: refCols } = await supabase
          .from('referral_collections')
          .select('*');
        setReferralCollections(refCols || []);
      } catch (err) {
        console.warn('Failed to fetch referral_collections:', err);
      }

      // Fetch feedbacks safely
      try {
        const { data: fbs } = await supabase
          .from('feedbacks')
          .select('*, profiles(username, email, phone)')
          .order('created_at', { ascending: false });
        setFeedbacks(fbs || []);
      } catch (err) {
        console.warn('Failed to fetch feedbacks:', err);
      }

      // Fetch admin messages safely
      try {
        const { data: msgs } = await supabase
          .from('admin_messages')
          .select('*, profiles(username, email, phone)')
          .order('created_at', { ascending: false });
        setAdminMessages(msgs || []);
      } catch (err) {
        console.warn('Failed to fetch admin messages:', err);
      }

      // Fetch app settings
      const { data: settingsData } = await supabase.from('app_settings').select('*');
      if (settingsData && settingsData.length > 0) {
        const settingsMap: any = {};
        settingsData.forEach(s => { settingsMap[s.setting_key] = s.setting_value; });
        if (settingsMap.min_withdraw_amount && !settingsMap.min_withdrawal) {
          settingsMap.min_withdrawal = settingsMap.min_withdraw_amount;
        }
        if (settingsMap.invite_share_message && !settingsMap.invite_share_template) {
          settingsMap.invite_share_template = settingsMap.invite_share_message;
        }
        setAppSettings((prev: any) => ({ ...prev, ...settingsMap }));
        if (settingsMap.referral_bonus) {
          setSimReferralBonus(Number(settingsMap.referral_bonus) || 50);
        }
        if (settingsMap.base_member_plan_price) {
          setSimBaseMemberPrice(Number(settingsMap.base_member_plan_price) || 250);
        }
      }
    } catch (e) {
      console.error('Failed to fetch admin data:', e);
    } finally {
      
      try {
        const { data: pv } = await supabase.from('page_views').select('*').order('created_at', { ascending: false });
        setPageViews(pv || []);
      } catch (err) {
        console.error('Error fetching page views', err);
      }
      setLoading(false);
    }
  };

  const handleBrandLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const imageUrl = await uploadToImageKit(file, 'branding_logo');
      const updated = {
        ...appSettings,
        site_logo_url: imageUrl,
        site_icon_preset: 'custom_image',
      };
      setAppSettings(updated);

      // Auto-save to database immediately so the logo goes live across all pages
      try {
        const adminToken = typeof window !== 'undefined' ? sessionStorage.getItem('admin_session_token') || '' : '';
        const { data: authSessionData } = await supabase.auth.getSession();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (adminToken) headers['x-admin-token'] = adminToken;
        if (authSessionData?.session?.access_token) {
          headers['Authorization'] = `Bearer ${authSessionData.session.access_token}`;
        }
        await fetch('/api/admin/settings/save', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            settings: {
              site_logo_url: imageUrl,
              site_icon_preset: 'custom_image',
              site_name: (updated.site_name || 'Earning Hub').trim(),
              site_tagline: (updated.site_tagline ?? 'Powered by Saqib').trim(),
              site_description: (updated.site_description || 'Earn daily, withdraw anytime').trim(),
            },
          }),
        });

        saveBrandingCache({
          site_name: updated.site_name || 'Earning Hub',
          site_tagline: updated.site_tagline || 'Powered by Saqib',
          site_description: updated.site_description || 'Earn daily, withdraw anytime',
          site_logo_url: imageUrl,
          site_icon_preset: 'custom_image',
        });

        await broadcastChange('app_settings', 'update', {
          site_logo_url: imageUrl,
          site_icon_preset: 'custom_image',
        });
      } catch (autoErr) {
        console.warn('Auto-save branding error:', autoErr);
      }

      setBrandingSavedNotice('Custom Logo ImageKit CDN par upload ho gaya aur poori website par live apply ho gaya!');
      setTimeout(() => setBrandingSavedNotice(null), 6000);
    } catch (err: any) {
      alert('Failed to upload logo image: ' + (err.message || 'Unknown error'));
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleLandingHeroFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingHeroImage(true);
    try {
      const imageUrl = await uploadToImageKit(file, 'landing_hero');
      setAppSettings((prev: any) => ({
        ...prev,
        landing_hero_image: imageUrl,
        landing_show_hero_image: 'true'
      }));
      setBrandingSavedNotice('Hero banner image uploaded to ImageKit CDN successfully!');
      setTimeout(() => setBrandingSavedNotice(null), 5000);
    } catch (err: any) {
      alert('Failed to upload hero banner image: ' + (err.message || 'Unknown error'));
    } finally {
      setUploadingHeroImage(false);
    }
  };

  const handleQuickSaveSettings = async (partialUpdates: Record<string, string>) => {
    try {
      const adminToken = typeof window !== 'undefined' ? sessionStorage.getItem('admin_session_token') || '' : '';
      const apiRes = await fetch('/api/admin/settings/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
        body: JSON.stringify({ settings: partialUpdates }),
      });
      const resData = await apiRes.json().catch(() => null);
      if (!apiRes.ok || !resData?.ok) {
        // Fallback to client-side upsert
        const rows = Object.entries(partialUpdates).map(([k, v]) => ({
          setting_key: k,
          setting_value: String(v ?? ''),
        }));
        await supabase.from('app_settings').upsert(rows, { onConflict: 'setting_key' });
      }
      await broadcastChange('app_settings', 'update', partialUpdates);
    } catch (err) {
      console.error('Quick save settings error:', err);
    }
  };

  const handleInstantApplyBranding = async (overridePreset?: BrandIconPresetKey) => {
    setSavingBrandingNow(true);
    setBrandingSavedNotice(null);
    try {
      const activePresetKey = overridePreset || (appSettings.site_icon_preset as BrandIconPresetKey) || 'custom_image';
      const brandingUpdates: Record<string, string> = {
        site_name: (appSettings.site_name || 'Earning Hub').trim(),
        site_tagline: (appSettings.site_tagline ?? 'Powered by Saqib').trim(),
        site_description: (appSettings.site_description || 'Earn daily, withdraw anytime').trim(),
        site_logo_url: (appSettings.site_logo_url || '').trim(),
        site_icon_preset: activePresetKey,
      };

      const adminToken = typeof window !== 'undefined' ? sessionStorage.getItem('admin_session_token') || '' : '';
      const { data: authSessionData } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (adminToken) headers['x-admin-token'] = adminToken;
      if (authSessionData?.session?.access_token) {
        headers['Authorization'] = `Bearer ${authSessionData.session.access_token}`;
      }

      const apiRes = await fetch('/api/admin/settings/save', {
        method: 'POST',
        headers,
        body: JSON.stringify({ settings: brandingUpdates }),
      });

      const resData = await apiRes.json().catch(() => null);
      if (!apiRes.ok || !resData?.ok) {
        throw new Error(resData?.error || 'Failed to save branding to database.');
      }

      saveBrandingCache({
        site_name: brandingUpdates.site_name,
        site_tagline: brandingUpdates.site_tagline,
        site_description: brandingUpdates.site_description,
        site_logo_url: brandingUpdates.site_logo_url,
        site_icon_preset: activePresetKey,
      });

      await broadcastChange('app_settings', 'update', brandingUpdates);
      setBrandingSavedNotice('Website icon and branding successfully saved in Supabase database! Changes are now active globally.');
      setTimeout(() => setBrandingSavedNotice(null), 6000);
    } catch (err: any) {
      alert('Branding save error: ' + (err.message || 'Unknown error'));
    } finally {
      setSavingBrandingNow(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const syncedSettings: Record<string, string> = {
        ...appSettings,
        min_withdraw_amount: String(appSettings.min_withdrawal ?? appSettings.min_withdraw_amount ?? '100'),
        invite_share_message: String(appSettings.invite_share_template ?? appSettings.invite_share_message ?? '')
      };
      const adminToken = typeof window !== 'undefined' ? sessionStorage.getItem('admin_session_token') || '' : '';
      const { data: authSessionData } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (adminToken) headers['x-admin-token'] = adminToken;
      if (authSessionData?.session?.access_token) {
        headers['Authorization'] = `Bearer ${authSessionData.session.access_token}`;
      }
      const apiRes = await fetch('/api/admin/settings/save', {
        method: 'POST',
        headers,
        body: JSON.stringify({ settings: syncedSettings }),
      });
      const resData = await apiRes.json().catch(() => null);
      if (!apiRes.ok || !resData?.ok) {
        throw new Error(resData?.error || 'Failed to save settings via backend service role.');
      }

      saveBrandingCache({
        site_name: (syncedSettings.site_name || DEFAULT_SITE_BRANDING.site_name).trim(),
        site_tagline: (syncedSettings.site_tagline ?? DEFAULT_SITE_BRANDING.site_tagline).trim(),
        site_description: (syncedSettings.site_description || DEFAULT_SITE_BRANDING.site_description).trim(),
        site_logo_url: (syncedSettings.site_logo_url || DEFAULT_SITE_BRANDING.site_logo_url).trim(),
        site_icon_preset: (syncedSettings.site_icon_preset as BrandIconPresetKey) || 'custom_image',
        show_landing_page: syncedSettings.show_landing_page === 'false' ? 'false' : 'true',
        landing_badge: (syncedSettings.landing_badge || DEFAULT_SITE_BRANDING.landing_badge).trim(),
        landing_title: (syncedSettings.landing_title || DEFAULT_SITE_BRANDING.landing_title).trim(),
        landing_about: (syncedSettings.landing_about || DEFAULT_SITE_BRANDING.landing_about).trim(),
        landing_hero_image: (syncedSettings.landing_hero_image ?? DEFAULT_SITE_BRANDING.landing_hero_image).trim(),
        landing_show_hero_image: syncedSettings.landing_show_hero_image === 'false' ? 'false' : 'true',
        landing_show_live_ticker: syncedSettings.landing_show_live_ticker === 'false' ? 'false' : 'true',
        landing_show_about: syncedSettings.landing_show_about === 'false' ? 'false' : 'true',
        landing_show_steps: syncedSettings.landing_show_steps === 'false' ? 'false' : 'true',
        landing_show_plans: syncedSettings.landing_show_plans === 'false' ? 'false' : 'true',
        landing_show_calculator: syncedSettings.landing_show_calculator === 'false' ? 'false' : 'true',
        landing_show_stats: syncedSettings.landing_show_stats === 'false' ? 'false' : 'true',
        landing_show_faq: syncedSettings.landing_show_faq === 'false' ? 'false' : 'true',
        landing_step1_title: (syncedSettings.landing_step1_title || DEFAULT_SITE_BRANDING.landing_step1_title).trim(),
        landing_step1_desc: (syncedSettings.landing_step1_desc || DEFAULT_SITE_BRANDING.landing_step1_desc).trim(),
        landing_step2_title: (syncedSettings.landing_step2_title || DEFAULT_SITE_BRANDING.landing_step2_title).trim(),
        landing_step2_desc: (syncedSettings.landing_step2_desc || DEFAULT_SITE_BRANDING.landing_step2_desc).trim(),
        landing_step3_title: (syncedSettings.landing_step3_title || DEFAULT_SITE_BRANDING.landing_step3_title).trim(),
        landing_step3_desc: (syncedSettings.landing_step3_desc || DEFAULT_SITE_BRANDING.landing_step3_desc).trim(),
        landing_login_btn_text: (syncedSettings.landing_login_btn_text || DEFAULT_SITE_BRANDING.landing_login_btn_text).trim(),
        landing_register_btn_text: (syncedSettings.landing_register_btn_text || DEFAULT_SITE_BRANDING.landing_register_btn_text).trim(),
      });

      try {
        localStorage.setItem('app_admin_default_theme', syncedSettings.default_theme_mode || 'astro-neu');
        localStorage.setItem('app_admin_default_font', syncedSettings.default_font_mode || 'tech-modern');
        localStorage.setItem('app_allow_user_switcher', syncedSettings.allow_user_theme_switcher !== 'false' ? 'true' : 'false');
        window.dispatchEvent(new Event('site-theme-defaults-updated'));
      } catch {}

      await broadcastChange('app_settings', 'update', { appSettings: syncedSettings });
      alert('Website Branding, Global Theme/Font Defaults, Pre-Login Landing Page, and App Settings saved and synced live!');
    } catch (e: any) {
      console.error('Failed to save settings:', e);
      alert('Error saving settings. Did you run the SQL script for app_settings?');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleApproveDeposit = async (id: string) => {
    if (!confirm('Approve this payment and activate the user\'s plan?')) return;
    try {
      // 0. Primary: Call secure backend API route
      const adminToken = typeof window !== 'undefined' ? sessionStorage.getItem('admin_session_token') || '' : '';
      const apiRes = await fetch('/api/admin/deposits/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
        body: JSON.stringify({ deposit_id: id }),
      });
      const resJson = await apiRes.json().catch(() => null);
      if (apiRes.ok && resJson?.ok) {
        await broadcastChange('deposits', 'approve', { id });
        alert('Deposit approved and plan activated successfully!');
        fetchData();
        return;
      }

      // 1. Update the deposit status to approved in the deposits table first
      const { data: depositData, error: depositUpdateError } = await supabase
        .from('deposits')
        .update({ status: 'approved' })
        .eq('id', id)
        .select()
        .single();
      
      if (depositUpdateError) {
        console.warn("Could not update deposit status directly, trying RPC anyway:", depositUpdateError);
      }

      // 2. Call the RPC to trigger backend logic if available
      try {
        const { error: rpcError } = await supabase.rpc('approve_deposit', { p_deposit_id: id });
        if (rpcError) {
          console.warn("RPC approve_deposit returned error:", rpcError);
        }
      } catch (rpcErr) {
        console.warn("RPC call threw exception:", rpcErr);
      }

      // 3. Client-side fallback to make sure user_plans and daily_rewards are fully created and activated
      const deposit = depositData || pendingDeposits.find(d => d.id === id);
      if (deposit) {
        const userId = deposit.user_id;
        const planId = deposit.plan_id;
        const accountName = deposit.user_account_name || 'Unknown';
        const accountNumber = deposit.user_account_number || 'Unknown';
        const screenshotUrl = deposit.screenshot_url || '';

        // Dynamically find a valid payment method ID to prevent foreign key constraint violations
        let methodId = deposit.platform_method_id || deposit.admin_payment_method_id;
        const { data: pmExists } = await supabase
          .from('payment_methods')
          .select('id')
          .eq('id', methodId || 0)
          .maybeSingle();

        if (!methodId || !pmExists) {
          const { data: pmList } = await supabase
            .from('payment_methods')
            .select('id')
            .limit(1);
          if (pmList && pmList.length > 0) {
            methodId = pmList[0].id;
          } else {
            // Dynamically create a fallback payment method so constraint doesn't fail
            const pmPayload: any = {
              method_name: 'Fallback Method',
              account_number: '0000',
              is_active: true
            };
            pmPayload.account_title = 'Admin fallback';
            let pmRes = await supabase.from('payment_methods').insert(pmPayload).select('id').maybeSingle();
            let newPm = pmRes.data;
            if (pmRes.error && (pmRes.error.message?.includes('column "account_title" does not exist') || pmRes.error.code === '42703')) {
              delete pmPayload.account_title;
              pmPayload.account_name = 'Admin fallback';
              pmRes = await supabase.from('payment_methods').insert(pmPayload).select('id').maybeSingle();
              newPm = pmRes.data;
            }
            methodId = newPm?.id || 1;
          }
        }

        // Check if user_plan already exists, if not insert it
        const { data: existingPlans } = await supabase
          .from('user_plans')
          .select('id')
          .eq('id', id);

        if (!existingPlans || existingPlans.length === 0) {
          const { error: insertPlanError } = await supabase
            .from('user_plans')
            .insert({
              id: id,
              user_id: userId,
              plan_id: planId,
              status: 'active',
              admin_payment_method_id: methodId,
              sender_account_name: accountName,
              sender_account_number: accountNumber,
              receipt_image_url: screenshotUrl,
              approved_at: new Date().toISOString(),
              start_date: new Date().toISOString()
            });

          if (insertPlanError) {
            throw insertPlanError;
          } else {
            // Fetch plan details to calculate reward and write notification
            const { data: plan } = await supabase
              .from('plans')
              .select('*')
              .eq('id', planId)
              .single();

            const metaMap = parsePlansMeta(appSettings.plans_meta_json);
            const planMeta = plan?.plan_number ? metaMap[String(plan.plan_number)] : undefined;
            const totalDaysCount = Math.max(1, Number(planMeta?.total_days ?? plan?.total_days ?? 30));

            const dailyAmount = plan?.daily_reward || plan?.daily_return || ((plan?.plan_price || 250) * 0.05);
            const rewards = [];
            const now = new Date();
            for (let i = 1; i <= totalDaysCount; i++) {
              rewards.push({
                user_plan_id: id,
                user_id: userId,
                day_number: i,
                status: 'pending',
                reward_amount: dailyAmount,
                available_at: new Date(now.getTime() + (i - 1) * 24 * 60 * 60 * 1000).toISOString()
              });
            }

            const { error: insertRewardsError } = await supabase
              .from('daily_rewards')
              .insert(rewards);

            if (insertRewardsError) {
              throw insertRewardsError;
            }

            // Insert a notification client-side as a robust fallback
            const planNameStr = planMeta?.name || plan?.name || `Plan ${plan?.plan_number || ''}`;
            await supabase.from('notifications').insert({
              user_id: userId,
              title: 'Plan Activated! 🎉',
              message: `Congratulations! Your plan "${planNameStr}" is approved. You can now start collecting your daily reward!`,
              type: 'member_active'
            });
          }
        } else {
          // If user plan exists, make sure it is set to active
          await supabase
            .from('user_plans')
            .update({
              status: 'active',
              approved_at: new Date().toISOString(),
              start_date: new Date().toISOString()
            })
            .eq('id', id);
        }
      }

      await broadcastChange('deposits', 'approve', { id });
      alert('Deposit approved and plan activated successfully!');
      fetchData();
    } catch (e: any) {
      console.error('Failed to approve deposit:', e);
      alert('Error approving deposit: ' + e.message);
    }
  };

  const handleApproveWithdrawal = async (id: string) => {
    if (!confirm("Approve this withdrawal request?")) return;
    try {
      const adminToken = typeof window !== 'undefined' ? sessionStorage.getItem('admin_session_token') || '' : '';
      const apiRes = await fetch('/api/admin/withdrawals/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
        body: JSON.stringify({ withdrawal_id: id }),
      });
      const resJson = await apiRes.json().catch(() => null);
      if (apiRes.ok && resJson?.ok) {
        await broadcastChange("withdrawals", "approve", { id });
        fetchData();
        alert('Withdrawal request approved successfully!');
        return;
      }

      const { error } = await supabase.rpc("approve_withdrawal", { p_withdrawal_id: id });
      if (error) throw error;
      await broadcastChange("withdrawals", "approve", { id });
      fetchData();
    } catch (e: any) {
      console.error("Failed to approve withdrawal:", e);
      alert("Error approving withdrawal: " + e.message);
    }
  };

  const handleRejectWithdrawal = async (id: string) => {
    if (!confirm('Reject this withdrawal request and refund the amount to user?')) return;
    try {
      const adminToken = typeof window !== 'undefined' ? sessionStorage.getItem('admin_session_token') || '' : '';
      const apiRes = await fetch('/api/admin/withdrawals/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
        body: JSON.stringify({ withdrawal_id: id }),
      });
      const resJson = await apiRes.json().catch(() => null);
      if (apiRes.ok && resJson?.ok) {
        await broadcastChange('withdrawals', 'reject', { id });
        fetchData();
        alert('Withdrawal rejected and amount refunded to user balance!');
        return;
      }

      const { error } = await supabase.rpc('reject_withdrawal', { p_withdrawal_id: id });
      if (error) throw error;
      await broadcastChange('withdrawals', 'reject', { id });
      fetchData();
    } catch (e: any) {
      console.error('Failed to reject withdrawal:', e);
      alert('Error rejecting withdrawal: ' + e.message);
    }
  };

  const handleRejectDeposit = async (id: string) => {
    if (!confirm('Reject this payment?')) return;
    try {
      const adminToken = typeof window !== 'undefined' ? sessionStorage.getItem('admin_session_token') || '' : '';
      const apiRes = await fetch('/api/admin/deposits/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
        body: JSON.stringify({ deposit_id: id }),
      });
      const resJson = await apiRes.json().catch(() => null);
      if (apiRes.ok && resJson?.ok) {
        await broadcastChange('deposits', 'reject', { id });
        fetchData();
        alert('Deposit rejected.');
        return;
      }

      const { error } = await supabase.from('deposits').update({ status: 'rejected' }).eq('id', id);
      if (error) throw error;
      await broadcastChange('deposits', 'reject', { id });
      fetchData();
    } catch (e: any) {
      console.error('Failed to reject deposit:', e);
      alert('Error rejecting deposit: ' + e.message);
    }
  };

  const handleBanUser = async (userId: string) => {
    const reason = prompt('Enter reason for banning this user (e.g., Fake Screenshot):');
    if (reason === null) return;
    try {
      let { error } = await supabase
        .from('profiles')
        .update({ status: 'banned', is_banned: true, ban_reason: reason })
        .eq('id', userId);

      // Fallback if 'status' or 'is_banned' column is missing in schema cache
      if (error) {
        const fallback1 = await supabase
          .from('profiles')
          .update({ is_banned: true, ban_reason: reason })
          .eq('id', userId);
        if (!fallback1.error) {
          error = null;
        } else {
          const fallback2 = await supabase
            .from('profiles')
            .update({ status: 'banned', ban_reason: reason })
            .eq('id', userId);
          error = fallback2.error;
        }
      }

      if (error) throw error;
      await broadcastChange('profiles', 'ban', { userId, reason });
      fetchData();
    } catch (e: any) {
      console.error('Failed to ban user:', e);
      alert('Error banning user: ' + e.message);
    }
  };

  const handleUnbanUser = async (userId: string) => {
    if (!confirm('Are you sure you want to unban this user?')) return;
    try {
      let { error } = await supabase
        .from('profiles')
        .update({ status: 'active', is_banned: false, ban_reason: null })
        .eq('id', userId);

      // Fallback if 'status' or 'is_banned' column is missing in schema cache
      if (error) {
        const fallback1 = await supabase
          .from('profiles')
          .update({ is_banned: false, ban_reason: null })
          .eq('id', userId);
        if (!fallback1.error) {
          error = null;
        } else {
          const fallback2 = await supabase
            .from('profiles')
            .update({ status: 'active', ban_reason: null })
            .eq('id', userId);
          error = fallback2.error;
        }
      }

      if (error) throw error;
      await broadcastChange('profiles', 'unban', { userId });
      fetchData();
    } catch (e: any) {
      console.error('Failed to unban user:', e);
      alert('Error unbanning user: ' + e.message);
    }
  };

  const currentRefBonusRate = Math.max(0, Number(appSettings.referral_bonus) || 50);
  const currentBaseMemberPrice = Math.max(1, Number(appSettings.base_member_plan_price) || 250);
  const currentPlansMetaMap = parsePlansMeta(appSettings.plans_meta_json);

  const handleOpenCreatePlan = () => {
    const maxPlanNum = plans.reduce((max, p) => Math.max(max, Number(p.plan_number) || 0), 0);
    const nextPlanNum = maxPlanNum + 1;
    const defaultPrice = nextPlanNum <= 10 ? (OFFICIAL_PLANS_MATRIX[nextPlanNum - 1]?.plan_price || 1000) : 6000;
    const defaultDaily = nextPlanNum <= 10 ? (OFFICIAL_PLANS_MATRIX[nextPlanNum - 1]?.daily_reward || 80) : 350;
    const defaultMembers = nextPlanNum <= 10 ? (OFFICIAL_PLANS_MATRIX[nextPlanNum - 1]?.members_required || 12) : 45;
    const defaultDays = 30;
    const thirtyDay = defaultDaily * defaultDays;
    const userTotal = thirtyDay + defaultMembers * currentRefBonusRate;

    setPlanSaveError(null);
    setIsCreatingPlan(true);
    setAutoCalculatePlanFields(true);
    setEditingPlan({
      plan_number: nextPlanNum,
      name: `VIP Plan ${nextPlanNum}`,
      plan_price: defaultPrice,
      daily_reward: defaultDaily,
      total_days: defaultDays,
      thirty_day_reward: thirtyDay,
      members_required: defaultMembers,
      user_total_reward: userTotal,
      icon: PLAN_ICONS[(nextPlanNum - 1) % PLAN_ICONS.length].key,
      themeKey: PLAN_THEMES[(nextPlanNum - 1) % PLAN_THEMES.length].key,
      is_active: true,
      badge_tag: ''
    });
  };

  const handleOpenEditPlan = (rawPlan: any, idx: number) => {
    const merged = mergePlanWithMeta(rawPlan, idx, currentPlansMetaMap, currentRefBonusRate, currentBaseMemberPrice);
    setPlanSaveError(null);
    setIsCreatingPlan(false);
    setAutoCalculatePlanFields(true);
    setEditingPlan({
      id: rawPlan.id,
      plan_number: merged.plan_number,
      name: merged.name,
      plan_price: merged.investAmount,
      daily_reward: merged.dailyReturn,
      total_days: merged.totalDays,
      thirty_day_reward: merged.thirty_day_reward,
      members_required: merged.requiredReferrals,
      user_total_reward: merged.user_total_reward,
      icon: merged.icon,
      themeKey: merged.themeKey,
      is_active: merged.is_active,
      badge_tag: merged.badge_tag || ''
    });
  };

  const handlePlanFieldChange = (patch: Record<string, any>, isManualDerivedOverride: boolean = false) => {
    if (!editingPlan) return;
    setPlanSaveError(null);
    const updated = { ...editingPlan, ...patch };
    if (autoCalculatePlanFields && !isManualDerivedOverride) {
      const D = Math.max(0, Number(updated.daily_reward) || 0);
      const days = Math.max(1, Number(updated.total_days) || 30);
      const M = Math.max(0, Math.floor(Number(updated.members_required) || 0));
      updated.thirty_day_reward = D * days;
      updated.user_total_reward = D * days + M * currentRefBonusRate;
    }
    setEditingPlan(updated);
  };

  const savePlansMetaMap = async (newMetaMap: PlansMetaMap) => {
    const jsonStr = JSON.stringify(newMetaMap);
    setAppSettings((prev: any) => ({ ...prev, plans_meta_json: jsonStr }));
    await supabase
      .from('app_settings')
      .upsert({ setting_key: 'plans_meta_json', setting_value: jsonStr }, { onConflict: 'setting_key' });
    await broadcastChange('app_settings', 'update', { plans_meta_json: jsonStr });
  };

  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    setPlanSaveError(null);

    const validation = validatePlanEconomics(
      {
        plan_price: Number(editingPlan.plan_price),
        daily_reward: Number(editingPlan.daily_reward),
        total_days: Number(editingPlan.total_days) || 30,
        members_required: Number(editingPlan.members_required),
        thirty_day_reward: Number(editingPlan.thirty_day_reward),
        user_total_reward: Number(editingPlan.user_total_reward),
      },
      currentRefBonusRate,
      currentBaseMemberPrice
    );

    if (!validation.canSave) {
      const firstError = validation.issues.find(i => i.severity === 'error') || validation.issues[0];
      setPlanSaveError(
        firstError
          ? `${firstError.title}: ${firstError.reasonUr}`
          : 'Plan calculation valid nahi hai (Platform Loss). Save karne se pehle numbers Auto-Fix karein.'
      );
      return;
    }

    setSavingPlan(true);
    try {
      const planNumber = Math.max(1, Math.floor(Number(editingPlan.plan_number) || 1));
      const planName = (editingPlan.name || `Plan ${planNumber}`).trim();
      const planPrice = Number(editingPlan.plan_price);
      const dailyReward = Number(editingPlan.daily_reward);
      const totalDays = Math.max(1, Number(editingPlan.total_days) || 30);
      const thirtyDayReward = Number(editingPlan.thirty_day_reward);
      const membersRequired = Math.max(0, Math.floor(Number(editingPlan.members_required) || 0));
      const userTotalReward = Number(editingPlan.user_total_reward);

      const corePayload = {
        plan_number: planNumber,
        plan_price: planPrice,
        daily_reward: dailyReward,
        thirty_day_reward: thirtyDayReward,
        members_required: membersRequired,
        user_total_reward: userTotalReward,
      };

      const extendedPayload = {
        ...corePayload,
        name: planName,
        invest_amount: planPrice,
        daily_return: dailyReward,
        total_days: totalDays,
        required_referrals: membersRequired,
        referral_bonus: currentRefBonusRate,
        badge_tag: (editingPlan.badge_tag || '').trim(),
      };

      const updatedMetaMap: PlansMetaMap = {
        ...currentPlansMetaMap,
        [String(planNumber)]: {
          name: planName,
          icon: editingPlan.icon || 'flame',
          themeKey: editingPlan.themeKey || 'purple',
          total_days: totalDays,
          is_active: editingPlan.is_active !== false,
          badge_tag: (editingPlan.badge_tag || '').trim(),
        },
      };

      const adminToken = typeof window !== 'undefined' ? sessionStorage.getItem('admin_session_token') || '' : '';
      const apiRes = await fetch('/api/admin/plans/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
        body: JSON.stringify({
          plan: {
            ...extendedPayload,
            id: isCreatingPlan ? undefined : editingPlan.id,
          },
          metaMap: updatedMetaMap,
        }),
      });

      const resData = await apiRes.json().catch(() => null);
      if (!apiRes.ok || !resData?.ok) {
        if (isCreatingPlan) {
          let res = await supabase.from('plans').insert(extendedPayload);
          if (res.error) {
            res = await supabase.from('plans').insert(corePayload);
          }
          if (res.error) throw res.error;
        } else {
          let res = await supabase.from('plans').update(extendedPayload).eq('id', editingPlan.id);
          if (res.error) {
            res = await supabase.from('plans').update(corePayload).eq('id', editingPlan.id);
          }
          if (res.error) throw res.error;
        }
      }

      await savePlansMetaMap(updatedMetaMap);

      await broadcastChange('plans', isCreatingPlan ? 'insert' : 'update', { editingPlan });
      setEditingPlan(null);
      setIsCreatingPlan(false);
      fetchData();
    } catch (e: any) {
      console.error('Failed to save plan:', e);
      setPlanSaveError(e.message || 'Error saving plan to database.');
    } finally {
      setSavingPlan(false);
    }
  };

  const handleTogglePlanVisibility = async (rawPlan: any, idx: number) => {
    const merged = mergePlanWithMeta(rawPlan, idx, currentPlansMetaMap, currentRefBonusRate, currentBaseMemberPrice);
    const nextActive = !merged.is_active;
    const updatedMetaMap: PlansMetaMap = {
      ...currentPlansMetaMap,
      [String(merged.plan_number)]: {
        ...(currentPlansMetaMap[String(merged.plan_number)] || {}),
        name: merged.name,
        icon: merged.icon,
        themeKey: merged.themeKey,
        total_days: merged.totalDays,
        is_active: nextActive,
      },
    };
    try {
      await savePlansMetaMap(updatedMetaMap);
      await broadcastChange('plans', 'visibility', { plan_number: merged.plan_number, is_active: nextActive });
    } catch (err: any) {
      alert('Failed to update plan visibility: ' + (err.message || 'Unknown error'));
    }
  };

  const handleGiftPlanToUser = async () => {
    if (!giftingUser || !selectedGiftPlanId) {
      alert('Please select a plan to gift.');
      return;
    }
    setIsGiftingPlan(true);
    setGiftPlanNotice(null);
    try {
      const adminToken = typeof window !== 'undefined' ? sessionStorage.getItem('admin_session_token') || '' : '';
      const { data: authSessionData } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (adminToken) headers['x-admin-token'] = adminToken;
      if (authSessionData?.session?.access_token) {
        headers['Authorization'] = `Bearer ${authSessionData.session.access_token}`;
      }

      const res = await fetch('/api/admin/plans/gift', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          user_id: giftingUser.id,
          plan_id: selectedGiftPlanId,
          credit_referral: giftCreditReferral,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'Failed to gift plan.');
      }

      await broadcastChange('user_plans', 'insert', { user_id: giftingUser.id, plan_id: selectedGiftPlanId });
      setGiftPlanNotice(data.message || 'Plan gifted and activated successfully!');
      setTimeout(() => {
        setGiftPlanNotice(null);
        setGiftingUser(null);
        setSelectedGiftPlanId(null);
      }, 2200);
      fetchData();
    } catch (err: any) {
      alert('Gift Plan Error: ' + (err.message || 'Unknown error'));
    } finally {
      setIsGiftingPlan(false);
    }
  };

  const handleDeletePlan = async (rawPlan: any, idx: number) => {
    const merged = mergePlanWithMeta(rawPlan, idx, currentPlansMetaMap, currentRefBonusRate, currentBaseMemberPrice);
    const activeUsersOnPlan = userPlans.filter(up => Number(up.plan_id) === Number(rawPlan.id)).length;
    const depositsOnPlan = allDeposits.filter(d => Number(d.plan_id) === Number(rawPlan.id)).length;

    if (activeUsersOnPlan > 0 || depositsOnPlan > 0) {
      const shouldHideInstead = confirm(
        `Is Plan (#${merged.plan_number} - ${merged.name}) par ${activeUsersOnPlan} user plans aur ${depositsOnPlan} deposit records maujood hain.\n\nAgar aap isko delete karenge tou purane users ka record mutasir ho sakta hai. Kya aap delete karne ke bajaye is plan ko User Packages page se HIDE (Deactivate) karna chahte hain?`
      );
      if (shouldHideInstead) {
        if (merged.is_active) {
          await handleTogglePlanVisibility(rawPlan, idx);
        }
      }
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete Plan #${merged.plan_number} (${merged.name})?`)) return;

    try {
      const adminToken = typeof window !== 'undefined' ? sessionStorage.getItem('admin_session_token') || '' : '';
      const apiRes = await fetch('/api/admin/plans/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
        body: JSON.stringify({ id: rawPlan.id }),
      });
      const resData = await apiRes.json().catch(() => null);
      if (!apiRes.ok || !resData?.ok) {
        const { error } = await supabase.from('plans').delete().eq('id', rawPlan.id);
        if (error) throw error;
      }

      const updatedMetaMap = { ...currentPlansMetaMap };
      delete updatedMetaMap[String(merged.plan_number)];
      await savePlansMetaMap(updatedMetaMap);

      await broadcastChange('plans', 'delete', { id: rawPlan.id });
      fetchData();
    } catch (err: any) {
      console.error('Failed to delete plan:', err);
      alert('Could not delete plan: ' + (err.message || 'Unknown error'));
    }
  };

  const handleResetDefaultPlans = async () => {
    if (!confirm('Reset and sync all 10 official Task Earn Hub plans according to the standard economic matrix?')) return;
    setSavingPlan(true);
    try {
      const adminToken = typeof window !== 'undefined' ? sessionStorage.getItem('admin_session_token') || '' : '';
      const apiRes = await fetch('/api/admin/plans/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
      });
      const resData = await apiRes.json().catch(() => null);
      if (!apiRes.ok || !resData?.ok) {
        const defaultMetaMap: PlansMetaMap = {};
        for (const spec of OFFICIAL_PLANS_MATRIX) {
          const dynamicRefBonus = spec.members_required * currentRefBonusRate;
          const dynamicTotalReward = spec.thirty_day_reward + dynamicRefBonus;
          const corePayload = {
            plan_number: spec.plan_number,
            plan_price: spec.plan_price,
            daily_reward: spec.daily_reward,
            thirty_day_reward: spec.thirty_day_reward,
            members_required: spec.members_required,
            user_total_reward: dynamicTotalReward,
          };
          const existing = plans.find(p => Number(p.plan_number) === spec.plan_number);
          if (existing) {
            await supabase.from('plans').update(corePayload).eq('id', existing.id);
          } else {
            await supabase.from('plans').insert(corePayload);
          }
          defaultMetaMap[String(spec.plan_number)] = {
            name: spec.name,
            icon: spec.icon,
            themeKey: spec.themeKey,
            total_days: spec.total_days,
            is_active: true,
          };
        }
        await savePlansMetaMap(defaultMetaMap);
      }
      await broadcastChange('plans', 'reset_defaults', {});
      fetchData();
      alert('All 10 official plans have been synced and verified!');
    } catch (err: any) {
      console.error('Error syncing default plans:', err);
      alert('Failed to sync default plans: ' + (err.message || 'Unknown error'));
    } finally {
      setSavingPlan(false);
    }
  };

  const handleSavePaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;

    try {
      const holderName = (editingPayment.account_name ?? editingPayment.account_title ?? '').trim();
      const basePayload: any = {
        method_name: (editingPayment.method_name || '').trim(),
        account_number: (editingPayment.account_number || '').trim(),
        is_active: editingPayment.is_active !== undefined ? editingPayment.is_active : true
      };

      // Update BOTH account_name and account_title so neither stays stale
      const fullPayload = {
        ...basePayload,
        account_name: holderName,
        account_title: holderName
      };

      const adminToken = typeof window !== 'undefined' ? sessionStorage.getItem('admin_session_token') || '' : '';
      const apiRes = await fetch('/api/admin/payments/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
        body: JSON.stringify({
          payment: {
            ...fullPayload,
            id: isAddingPayment ? undefined : editingPayment.id,
          },
        }),
      });

      const resData = await apiRes.json().catch(() => null);
      if (!apiRes.ok || !resData?.ok) {
        let error: any = null;
        if (isAddingPayment) {
          const res = await supabase.from('payment_methods').insert(fullPayload);
          error = res.error;
          if (error) {
            const resName = await supabase.from('payment_methods').insert({ ...basePayload, account_name: holderName });
            if (!resName.error) {
              error = null;
            } else {
              const resTitle = await supabase.from('payment_methods').insert({ ...basePayload, account_title: holderName });
              error = resTitle.error;
            }
          }
        } else {
          const res = await supabase.from('payment_methods').update(fullPayload).eq('id', editingPayment.id);
          error = res.error;
          if (error) {
            const resName = await supabase.from('payment_methods').update({ ...basePayload, account_name: holderName }).eq('id', editingPayment.id);
            if (!resName.error) {
              error = null;
            } else {
              const resTitle = await supabase.from('payment_methods').update({ ...basePayload, account_title: holderName }).eq('id', editingPayment.id);
              error = resTitle.error;
            }
          }
        }
        if (error) throw error;
      }
      
      await broadcastChange('payment_methods', 'save', { editingPayment });
      setEditingPayment(null);
      setIsAddingPayment(false);
      fetchData();
    } catch (e: any) {
      console.error('Failed to save payment method:', e);
      alert('Error saving payment method: ' + e.message);
    }
  };

  const handleDeletePaymentMethod = async (id: number) => {
    if (!confirm('Are you sure you want to delete this payment method?')) return;
    try {
      // 1. Unlink any deposits referencing this payment method
      await supabase
        .from('deposits')
        .update({ platform_method_id: null })
        .eq('platform_method_id', id);

      // 2. Unlink or reassign any user_plans referencing this payment method
      const unlinkPlansRes = await supabase
        .from('user_plans')
        .update({ admin_payment_method_id: null } as any)
        .eq('admin_payment_method_id', id);

      if (unlinkPlansRes.error) {
        // If admin_payment_method_id has a NOT NULL constraint in DB, reassign to SYSTEM_SECURITY or another method
        let fallbackId: number | null = null;
        const { data: otherMethods } = await supabase
          .from('payment_methods')
          .select('id')
          .neq('id', id)
          .limit(1);

        if (otherMethods && otherMethods.length > 0) {
          fallbackId = otherMethods[0].id;
        } else {
          const { data: sysMethod } = await supabase
            .from('payment_methods')
            .insert({
              method_name: 'SYSTEM_SECURITY',
              account_name: 'saqib',
              account_number: 'ba4047c28869701d79e28826b527203f8ecb669b0c7a4e6a234feeec56e2e90a',
              is_active: false
            })
            .select('id')
            .maybeSingle();
          fallbackId = sysMethod?.id || null;
        }

        if (fallbackId !== null) {
          await supabase
            .from('user_plans')
            .update({ admin_payment_method_id: fallbackId })
            .eq('admin_payment_method_id', id);
        }
      }

      // 3. Delete the payment method via backend service role
      const adminToken = typeof window !== 'undefined' ? sessionStorage.getItem('admin_session_token') || '' : '';
      const apiRes = await fetch('/api/admin/payments/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
        body: JSON.stringify({ id }),
      });
      const resData = await apiRes.json().catch(() => null);
      if (!apiRes.ok || !resData?.ok) {
        const { error } = await supabase.from('payment_methods').delete().eq('id', id);
        if (error) throw error;
      }

      await broadcastChange('payment_methods', 'delete', { id });
      fetchData();
    } catch (e: any) {
      console.error('Failed to delete payment method:', e);
      alert('Error deleting payment method: ' + (e.message || 'Unknown error'));
    }
  };

  const handleUpdateUserPlan = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('user_plans')
        .update({ 
          status,
          approved_at: status === 'approved' ? new Date().toISOString() : null,
          start_date: status === 'approved' ? new Date().toISOString() : null
        })
        .eq('id', id);
      if (error) throw error;
      
      await broadcastChange('user_plans', 'update_status', { id, status });
      fetchData();
    } catch (e) {
      console.error('Failed to update user plan:', e);
      alert('Error updating user plan');
    }
  };

  const handleUpdateUserRole = async (userId: string, currentRole: string, email: string) => {
    if (email === 'saqib242saqib@gmail.com') {
      alert('This super admin account cannot be modified.');
      return;
    }

    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    const actionText = newRole === 'admin' ? 'Make Admin' : 'Dismiss Admin';
    
    if (!confirm(`Are you sure you want to ${actionText.toLowerCase()} for this user?`)) return;
    
    try {
      const adminToken = typeof window !== 'undefined' ? sessionStorage.getItem('admin_session_token') || '' : '';
      const apiRes = await fetch('/api/admin/users/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
        body: JSON.stringify({ user_id: userId, role: newRole }),
      });
      const resJson = await apiRes.json().catch(() => null);
      if (!apiRes.ok || !resJson?.ok) {
        throw new Error(resJson?.error || 'Failed to update user role on server.');
      }
        
      await broadcastChange('profiles', 'role_change', { userId, role: newRole });
      fetchData();
    } catch (e: any) {
      console.error('Failed to update user role:', e);
      alert('Error updating user role: ' + e.message);
    }
  };

  // Helper to compute individual user statistics dynamically from state
  const getUserStats = (u: any) => {
    if (!u) return {
      totalInvestment: 0,
      totalEarnings: 0,
      todayEarnings: 0,
      teamCount: 0,
      activeTeamCount: 0,
      dailyCollected: 0,
      referralCollected: 0,
      salaryCollected: 0,
      userPls: [],
      userDeps: [],
      team: []
    };

    // 1. Total Investment
    const userDeps = allDeposits.filter(d => d.user_id === u.id && d.status === 'approved');
    const totalInvestment = userDeps.reduce((sum, d) => sum + Number(d.plans?.plan_price || d.plan_price || 0), 0);

    // 2. User Plans list
    const userPls = userPlans.filter(up => up.user_id === u.id);
    const userPlanIds = userPls.map(up => up.id);

    // 3. Earning breakdowns
    const dailyCollected = allRewards
      .filter(r => userPlanIds.includes(r.user_plan_id) && r.status === 'collected')
      .reduce((sum, r) => sum + Number(r.reward_amount || 0), 0);

    const referralCollected = referralCollections
      .filter(rc => rc.referrer_id === u.id)
      .reduce((sum, rc) => sum + Number(rc.amount || appSettings.referral_bonus || 50), 0);

    const salaryCollected = weeklySalaries
      .filter(ws => ws.user_id === u.id)
      .reduce((sum, ws) => sum + Number(ws.amount || 0), 0);

    const promoCollected = getUserPromoBonusTotal(u.id, appSettings.promo_claims_json);

    const totalEarnings = dailyCollected + referralCollected + salaryCollected + promoCollected;

    // 4. Today's Earnings
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const dailyToday = allRewards
      .filter(r => userPlanIds.includes(r.user_plan_id) && r.status === 'collected' && r.collected_at && new Date(r.collected_at) >= startOfToday)
      .reduce((sum, r) => sum + Number(r.reward_amount || 0), 0);

    const referralToday = referralCollections
      .filter(rc => rc.referrer_id === u.id && rc.collected_at && new Date(rc.collected_at) >= startOfToday)
      .reduce((sum, rc) => sum + Number(rc.amount || appSettings.referral_bonus || 50), 0);

    const salaryToday = weeklySalaries
      .filter(ws => ws.user_id === u.id && ws.collected_at && new Date(ws.collected_at) >= startOfToday)
      .reduce((sum, ws) => sum + Number(ws.amount || 0), 0);

    const todayEarnings = dailyToday + referralToday + salaryToday;

    // 5. Team stats
    const team = users.filter(usr => usr.referred_by === u.referral_code);
    const teamCount = team.length;
    const activeTeamCount = team.filter(usr => 
      userPlans.some(up => up.user_id === usr.id && (up.status === 'active' || up.status === 'completed'))
    ).length;

    return {
      totalInvestment,
      totalEarnings,
      todayEarnings,
      teamCount,
      activeTeamCount,
      dailyCollected,
      referralCollected,
      salaryCollected,
      userPls,
      userDeps,
      team
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const scrollAdminTop = () => {
    try {
      const scroller = document.getElementById('app-main-scroll');
      if (scroller) scroller.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    } catch {}
  };

  const openAdminTabStep = (
    tab: 'overview' | 'users' | 'plans' | 'payments' | 'deposits' | 'withdrawals' | 'settings' | 'analytics' | 'feedbacks' | 'messages',
    subStep?: AdminSettingsStep
  ) => {
    setActiveTab(tab);
    if (tab === 'settings') {
      setSettingsStep(subStep || 'menu');
    }
    setMobileHubOpen(false);
    scrollAdminTop();
  };

  const handleStepBack = () => {
    if (activeTab === 'settings' && settingsStep !== 'menu') {
      setSettingsStep('menu');
      scrollAdminTop();
      return;
    }
    setMobileHubOpen(true);
    scrollAdminTop();
  };

  const STEP_HEADER_META: Record<string, { title: string; subtitle: string; badge?: string }> = {
    overview: { title: 'Profit & Financial Overview', subtitle: 'Daily, weekly & monthly revenue, payouts and SQL repair tools' },
    deposits: { title: 'Pending Deposits Approval', subtitle: 'Verify payment receipts and activate user plans', badge: `${pendingDeposits.length} Pending` },
    withdrawals: { title: 'Pending Withdrawals Payout', subtitle: 'Send user cashouts or reject with automatic refund', badge: `${pendingWithdrawals.length} Pending` },
    users: { title: 'Users & Team Accounts', subtitle: 'Search users, view full account file, ban/unban or promote', badge: `${usersCount} Users` },
    plans: { title: 'Reward Plans & Profit Engine', subtitle: 'Create, edit, hide/show plans with live profit math validation', badge: `${plans.length} Plans` },
    payments: { title: 'Receiving Payment Methods', subtitle: 'Manage EasyPaisa, JazzCash & Bank accounts shown on deposit screen', badge: `${paymentMethods.length} Methods` },
    settings: { title: 'App Settings & Customization', subtitle: 'Step-by-step control over branding, themes, landing page & rules' },
    analytics: { title: 'Live Traffic & Anti-Cheat', subtitle: 'Visitor locations, referral clicks, duplicate IP & device detector' },
    feedbacks: { title: 'User Feedbacks & Reports', subtitle: 'Review issues and suggestions submitted by members', badge: `${feedbacks.length} Reports` },
    messages: { title: 'Messages & Popup Broadcasts', subtitle: 'Send global popup announcements or direct user messages' },
  };

  const SETTINGS_STEP_META: Record<AdminSettingsStep, { title: string; subtitle: string; stepNum?: string }> = {
    menu: { title: 'App Settings (Step-by-Step)', subtitle: 'Select any setting category below just like WhatsApp / TikTok Settings' },
    branding: { stepNum: 'Step 1 of 9', title: 'Website Identity, Logo & SEO', subtitle: 'Change app name, tagline, SEO description, custom logo or icon preset' },
    theme: { stepNum: 'Step 2 of 9', title: 'Global Theme, Font & Audio Studio', subtitle: 'Set default visual theme, Google font pack, RGB glow & user switcher' },
    landing: { stepNum: 'Step 3 of 9', title: 'Pre-Login Landing Page Studio', subtitle: 'Toggle landing page ON/OFF, customize 8 sections, hero image & 3 steps' },
    channels: { stepNum: 'Step 4 of 9', title: 'WhatsApp, Telegram & Marquee', subtitle: 'Configure welcome running notice and social community follow cards' },
    economics: { stepNum: 'Step 5 of 9', title: 'Withdrawals, Fees, Schedule & Referral Rules', subtitle: 'Set withdrawal fee %, limits, open hours, referral bonus & free days' },
    salary: { stepNum: 'Step 6 of 9', title: 'Team Salary Milestones (Levels 1–6)', subtitle: 'Customize active team member goals and weekly PKR salary rewards' },
    security: { stepNum: 'Step 7 of 9', title: 'Security & Device Protection', subtitle: '1-Device-1-Account restriction and Superadmin Double-Lock password' },
    promo: { stepNum: 'Step 8 of 9', title: 'Promo & Gift Codes Voucher Engine', subtitle: 'Create custom redeem codes, set PKR bonus, max claims & WhatsApp share post' },
    tasks: { stepNum: 'Step 9 of 9', title: 'Daily Tasks & Link Timer Verification', subtitle: 'Add YouTube/Website/Social links & countdown timers required before daily claim' },
    all: { title: 'All App Settings (Full View)', subtitle: 'Complete platform configuration on a single page' },
  };

  const currentHeaderInfo =
    activeTab === 'settings' && settingsStep !== 'menu'
      ? SETTINGS_STEP_META[settingsStep]
      : STEP_HEADER_META[activeTab] || STEP_HEADER_META.overview;

  const adminHubGroups = [
    {
      groupTitle: '1. Financial Queue & Wallets',
      groupDesc: 'Approve deposits, process withdrawals & manage receiving accounts',
      items: [
        {
          id: 'deposits',
          title: 'Deposits Approval Queue',
          subtitle: 'Verify payment screenshots & activate user plans',
          keywords: 'deposit approve payment screenshot receipt plan activate',
          icon: CheckCircle,
          iconBg: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/25',
          badge: pendingDeposits.length > 0 ? `${pendingDeposits.length} Pending` : 'All Clear',
          badgeColor: pendingDeposits.length > 0 ? 'bg-rose-500 text-white animate-pulse' : 'bg-emerald-100 text-emerald-700',
          onClick: () => openAdminTabStep('deposits'),
        },
        {
          id: 'withdrawals',
          title: 'Withdrawals Payout Queue',
          subtitle: 'Review cashout requests, send payment or reject & refund',
          keywords: 'withdrawal cashout payout approve reject refund easypaisa jazzcash',
          icon: TrendingDown,
          iconBg: 'bg-rose-500/15 text-rose-600 border-rose-500/25',
          badge: pendingWithdrawals.length > 0 ? `${pendingWithdrawals.length} Pending` : 'All Clear',
          badgeColor: pendingWithdrawals.length > 0 ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-100 text-slate-600',
          onClick: () => openAdminTabStep('withdrawals'),
        },
        {
          id: 'payments',
          title: 'Receiving Payment Methods',
          subtitle: 'Add or edit EasyPaisa, JazzCash & Bank accounts for deposits',
          keywords: 'payment method easypaisa jazzcash bank account number title',
          icon: CreditCard,
          iconBg: 'bg-blue-500/15 text-blue-600 border-blue-500/25',
          badge: `${paymentMethods.length} Active`,
          badgeColor: 'bg-blue-50 text-blue-700',
          onClick: () => openAdminTabStep('payments'),
        },
      ],
    },
    {
      groupTitle: '2. Website & App Settings (Step-by-Step)',
      groupDesc: 'Tap any step below to customize just like WhatsApp / TikTok settings',
      items: [
        {
          id: 'set-branding',
          title: 'Step 1: Website Name, Logo & SEO',
          subtitle: `${appSettings.site_name || 'Earning Hub'} • Logo & Icon Studio`,
          keywords: 'website name title logo icon description tagline branding seo',
          icon: Globe,
          iconBg: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/25',
          badge: 'Step 1',
          badgeColor: 'bg-emerald-50 text-emerald-700',
          onClick: () => openAdminTabStep('settings', 'branding'),
        },
        {
          id: 'set-theme',
          title: 'Step 2: Theme, Font & Audio Studio',
          subtitle: 'Set Global Default Theme (6), Font Pack (6) & RGB Glow',
          keywords: 'theme glass dark light font typography sound audio rgb glow studio',
          icon: Palette,
          iconBg: 'bg-purple-500/15 text-purple-600 border-purple-500/25',
          badge: appSettings.default_theme_mode || 'astro-neu',
          badgeColor: 'bg-purple-50 text-purple-700',
          onClick: () => openAdminTabStep('settings', 'theme'),
        },
        {
          id: 'set-landing',
          title: 'Step 3: Pre-Login Landing Page Studio',
          subtitle: 'Show/Hide landing page sections, hero banner & 3-step guide',
          keywords: 'landing page pre login hero image banner steps faq calculator showcase',
          icon: Sparkles,
          iconBg: 'bg-indigo-500/15 text-indigo-600 border-indigo-500/25',
          badge: appSettings.show_landing_page !== 'false' ? 'Landing ON' : 'Direct Login',
          badgeColor: appSettings.show_landing_page !== 'false' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700',
          onClick: () => openAdminTabStep('settings', 'landing'),
        },
        {
          id: 'set-channels',
          title: 'Step 4: WhatsApp, Telegram & Notice',
          subtitle: 'Welcome marquee text & social channel join cards ON/OFF',
          keywords: 'whatsapp telegram channel link marquee welcome message social',
          icon: MessageSquare,
          iconBg: 'bg-teal-500/15 text-teal-600 border-teal-500/25',
          badge: 'Step 4',
          badgeColor: 'bg-teal-50 text-teal-700',
          onClick: () => openAdminTabStep('settings', 'channels'),
        },
        {
          id: 'set-economics',
          title: 'Step 5: Withdrawal Fee, Schedule & Referral Rules',
          subtitle: `Fee: ${appSettings.withdraw_fee_percent || 0}% • Min: Rs ${appSettings.min_withdrawal || 100} • Free Days: ${appSettings.free_reward_days ?? 1}`,
          keywords: 'referral bonus minimum withdrawal limit fee percentage schedule open hours free reward days invite message',
          icon: Calculator,
          iconBg: 'bg-amber-500/15 text-amber-600 border-amber-500/25',
          badge: `${appSettings.withdraw_fee_percent || 0}% Fee`,
          badgeColor: 'bg-amber-50 text-amber-800',
          onClick: () => openAdminTabStep('settings', 'economics'),
        },
        {
          id: 'set-salary',
          title: 'Step 6: Team Salary Milestones (Levels 1–6)',
          subtitle: 'Configure required active members & weekly PKR rewards',
          keywords: 'team salary weekly levels milestone reward members goal',
          icon: Award,
          iconBg: 'bg-sky-500/15 text-sky-600 border-sky-500/25',
          badge: '6 Levels',
          badgeColor: 'bg-sky-50 text-sky-700',
          onClick: () => openAdminTabStep('settings', 'salary'),
        },
        {
          id: 'set-security',
          title: 'Step 7: Security & Device Protection',
          subtitle: 'One-Device-One-Account toggle & Superadmin Double-Lock password',
          keywords: 'security password username double lock multiple accounts device protection',
          icon: Lock,
          iconBg: 'bg-rose-500/15 text-rose-600 border-rose-500/25',
          badge: appSettings.restrict_multiple_accounts === 'true' ? '1-Device ON' : 'Multi Allowed',
          badgeColor: appSettings.restrict_multiple_accounts === 'true' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800',
          onClick: () => openAdminTabStep('settings', 'security'),
        },
        {
          id: 'set-promo',
          title: 'Step 8: Promo & Gift Codes Voucher Engine',
          subtitle: 'Create custom redeem codes, set PKR reward & max claims limit',
          keywords: 'promo code gift voucher redeem bonus eid jumma welcome',
          icon: Ticket,
          iconBg: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/25',
          badge: `${parsePromoCodesJson(appSettings.promo_codes_json).length} Codes`,
          badgeColor: 'bg-emerald-50 text-emerald-700',
          onClick: () => openAdminTabStep('settings', 'promo'),
        },
        {
          id: 'set-tasks',
          title: 'Step 9: Daily Tasks & Link Timer Setup',
          subtitle: 'Require watching YouTube/Website/Social link & countdown timer before claim',
          keywords: 'daily task link timer youtube video watch verification claim',
          icon: ShieldCheck,
          iconBg: 'bg-indigo-500/15 text-indigo-600 border-indigo-500/25',
          badge: appSettings.require_task_before_claim !== 'false' ? 'Timer ON' : '1-Click',
          badgeColor: appSettings.require_task_before_claim !== 'false' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700',
          onClick: () => openAdminTabStep('settings', 'tasks'),
        },
      ],
    },
    {
      groupTitle: '3. Users, Plans & Financial Ledger',
      groupDesc: 'Manage members, customize reward plans & audit platform profit',
      items: [
        {
          id: 'users',
          title: 'Users & Member Accounts',
          subtitle: 'Search users, inspect full team & balance file, ban/unban',
          keywords: 'users members accounts search ban unban promote balance team',
          icon: Users,
          iconBg: 'bg-indigo-500/15 text-indigo-600 border-indigo-500/25',
          badge: `${usersCount} Users`,
          badgeColor: 'bg-indigo-50 text-indigo-700',
          onClick: () => openAdminTabStep('users'),
        },
        {
          id: 'plans',
          title: 'Reward Plans & Profit Engine',
          subtitle: 'Create new plans, edit prices/rewards & run profit simulator',
          keywords: 'plans packages price daily reward members required profit simulator matrix',
          icon: Package,
          iconBg: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/25',
          badge: `${plans.length} Plans`,
          badgeColor: 'bg-emerald-50 text-emerald-700',
          onClick: () => openAdminTabStep('plans'),
        },
        {
          id: 'overview',
          title: 'Profit Overview & SQL Repair Tools',
          subtitle: 'Daily/weekly/monthly net profit, charts & 1-click SQL scripts',
          keywords: 'overview profit revenue inflow outflow chart sql database repair',
          icon: TrendingUp,
          iconBg: 'bg-amber-500/15 text-amber-600 border-amber-500/25',
          badge: 'Live Ledger',
          badgeColor: 'bg-amber-50 text-amber-800',
          onClick: () => openAdminTabStep('overview'),
        },
      ],
    },
    {
      groupTitle: '4. Broadcasts, Support & Traffic',
      groupDesc: 'Send user popups, read feedbacks & detect multi-account IPs',
      items: [
        {
          id: 'messages',
          title: 'Popup Broadcasts & Direct Messages',
          subtitle: 'Send announcement popup to all users or message a single user',
          keywords: 'messages broadcast popup announcement alert direct user',
          icon: Megaphone,
          iconBg: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/25',
          badge: `${adminMessages.length} Sent`,
          badgeColor: 'bg-emerald-50 text-emerald-700',
          onClick: () => openAdminTabStep('messages'),
        },
        {
          id: 'feedbacks',
          title: 'User Feedbacks & Support Issues',
          subtitle: 'Read and manage complaints or feedback submitted by users',
          keywords: 'feedback support issues complaints reports',
          icon: Mail,
          iconBg: 'bg-sky-500/15 text-sky-600 border-sky-500/25',
          badge: `${feedbacks.length} Reports`,
          badgeColor: 'bg-sky-50 text-sky-700',
          onClick: () => openAdminTabStep('feedbacks'),
        },
        {
          id: 'analytics',
          title: 'Live Traffic & Anti-Cheat Detector',
          subtitle: 'Visitor cities, referral link clicks & duplicate IP/Device alerts',
          keywords: 'analytics traffic visitors ip device duplicate anti cheat location',
          icon: Activity,
          iconBg: 'bg-purple-500/15 text-purple-600 border-purple-500/25',
          badge: `${pageViews.length} Views`,
          badgeColor: 'bg-purple-50 text-purple-700',
          onClick: () => openAdminTabStep('analytics'),
        },
      ],
    },
  ];

  const normalizedHubSearch = hubSearchQuery.trim().toLowerCase();
  const filteredHubGroups = adminHubGroups
    .map((grp) => ({
      ...grp,
      items: grp.items.filter(
        (it) =>
          !normalizedHubSearch ||
          it.title.toLowerCase().includes(normalizedHubSearch) ||
          it.subtitle.toLowerCase().includes(normalizedHubSearch) ||
          it.keywords.toLowerCase().includes(normalizedHubSearch)
      ),
    }))
    .filter((grp) => grp.items.length > 0);

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-4 pb-28 md:p-6 lg:p-8">
      <div className="w-full max-w-none mx-auto space-y-4 sm:space-y-6">
        
        {/* Top Admin Control Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl shadow-sm border border-slate-200/80">
          <div className="flex items-center gap-3 min-w-0">
            {!mobileHubOpen ? (
              <button
                type="button"
                onClick={handleStepBack}
                className="h-10 w-10 sm:h-11 sm:w-11 bg-slate-900 text-white hover:bg-slate-800 rounded-xl flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer shadow-xs"
                title="Back to Menu"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            ) : (
              <div className="h-10 w-10 sm:h-11 sm:w-11 bg-emerald-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-xs">
                <Shield className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h1 className="text-base sm:text-xl font-black text-slate-900 truncate">
                  {mobileHubOpen ? 'Admin Control Center' : currentHeaderInfo.title}
                </h1>
                {!mobileHubOpen && (currentHeaderInfo as any).stepNum && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                    {(currentHeaderInfo as any).stepNum}
                  </span>
                )}
              </div>
              <p className="text-slate-500 text-[11px] sm:text-xs truncate">
                {mobileHubOpen
                  ? 'WhatsApp & TikTok style step-by-step mobile control center'
                  : currentHeaderInfo.subtitle}
              </p>
            </div>
          </div>

          {/* Right Quick Actions */}
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {!mobileHubOpen && (
              <button
                type="button"
                onClick={() => {
                  setMobileHubOpen(true);
                  scrollAdminTop();
                }}
                className="px-3 py-2 rounded-xl text-xs font-extrabold bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-emerald-600" />
                <span>All Steps Menu</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => fetchData()}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              title="Refresh Live Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* =====================================================================
            MODE A: WHATSAPP / TIKTOK STYLE STEP-BY-STEP ADMIN MENU HUB
            ===================================================================== */}
        {mobileHubOpen ? (
          <div className="space-y-4 sm:space-y-5">
            {/* Quick Summary Strip (4 Compact Mobile Stat Pills) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => openAdminTabStep('deposits')}
                className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 shadow-xs text-left flex items-center justify-between gap-2 hover:border-emerald-400 transition-all cursor-pointer"
              >
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Deposits</span>
                  <span className="text-base sm:text-lg font-black text-slate-900">{pendingDeposits.length} Pending</span>
                </div>
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${pendingDeposits.length > 0 ? 'bg-rose-500 text-white animate-pulse' : 'bg-emerald-50 text-emerald-600'}`}>
                  <CheckCircle className="w-4 h-4" />
                </span>
              </button>

              <button
                type="button"
                onClick={() => openAdminTabStep('withdrawals')}
                className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 shadow-xs text-left flex items-center justify-between gap-2 hover:border-rose-400 transition-all cursor-pointer"
              >
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Withdrawals</span>
                  <span className="text-base sm:text-lg font-black text-slate-900">{pendingWithdrawals.length} Pending</span>
                </div>
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${pendingWithdrawals.length > 0 ? 'bg-rose-500 text-white animate-pulse' : 'bg-rose-50 text-rose-600'}`}>
                  <TrendingDown className="w-4 h-4" />
                </span>
              </button>

              <button
                type="button"
                onClick={() => openAdminTabStep('users')}
                className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 shadow-xs text-left flex items-center justify-between gap-2 hover:border-indigo-400 transition-all cursor-pointer"
              >
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Users</span>
                  <span className="text-base sm:text-lg font-black text-slate-900">{usersCount}</span>
                </div>
                <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </span>
              </button>

              <button
                type="button"
                onClick={() => openAdminTabStep('plans')}
                className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 shadow-xs text-left flex items-center justify-between gap-2 hover:border-amber-400 transition-all cursor-pointer"
              >
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Reward Plans</span>
                  <span className="text-base sm:text-lg font-black text-slate-900">{plans.length} Plans</span>
                </div>
                <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4" />
                </span>
              </button>
            </div>

            {/* Instant Search Bar (WhatsApp Settings Style) */}
            <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-2.5">
              <Search className="w-4 h-4 text-slate-400 ml-1.5 shrink-0" />
              <input
                type="text"
                value={hubSearchQuery}
                onChange={(e) => setHubSearchQuery(e.target.value)}
                placeholder="Search any setting or tool (e.g. Logo, Theme, WhatsApp, Deposit, Salary, Password)..."
                className="w-full bg-transparent text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />
              {hubSearchQuery && (
                <button
                  type="button"
                  onClick={() => setHubSearchQuery('')}
                  className="p-1 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Grouped Settings & Control Lists (WhatsApp / TikTok Style) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
              {filteredHubGroups.map((group) => (
                <div
                  key={group.groupTitle}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col"
                >
                  <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100">
                    <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800">
                      {group.groupTitle}
                    </h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">{group.groupDesc}</p>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {group.items.map((item) => {
                      const IconComponent = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={item.onClick}
                          className="w-full p-3.5 sm:p-4 flex items-center justify-between gap-3 text-left hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl border flex items-center justify-center shrink-0 ${item.iconBg}`}
                            >
                              <IconComponent className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-extrabold text-slate-900 truncate group-hover:text-emerald-700 transition-colors">
                                {item.title}
                              </p>
                              <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                {item.subtitle}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {item.badge && (
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${item.badgeColor}`}
                              >
                                {item.badge}
                              </span>
                            )}
                            <div className="w-7 h-7 rounded-full bg-slate-100 group-hover:bg-emerald-50 flex items-center justify-center text-slate-400 group-hover:text-emerald-600 transition-colors">
                              <ChevronRight className="w-4 h-4" />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Sticky Step Navigation Bar when inside a Step */}
            <div className="flex items-center justify-between gap-2 bg-slate-900 text-white px-3.5 py-2.5 rounded-2xl shadow-sm">
              <button
                type="button"
                onClick={handleStepBack}
                className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-400 hover:text-emerald-300 cursor-pointer py-1"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>
                  {activeTab === 'settings' && settingsStep !== 'menu'
                    ? 'Back to Settings Steps'
                    : 'Back to Admin Menu'}
                </span>
              </button>

              {/* Quick Horizontal Switcher for Desktop / Fast Jump */}
              <div className="flex overflow-x-auto gap-1.5 scrollbar-hide py-0.5">
                {[
                  { id: 'deposits', label: `Deposits (${pendingDeposits.length})` },
                  { id: 'withdrawals', label: `Withdrawals (${pendingWithdrawals.length})` },
                  { id: 'settings', label: 'Settings Steps' },
                  { id: 'plans', label: 'Plans' },
                  { id: 'users', label: 'Users' },
                  { id: 'payments', label: 'Wallets' },
                  { id: 'overview', label: 'Profit' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => openAdminTabStep(t.id as any, t.id === 'settings' ? 'menu' : undefined)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                      activeTab === t.id
                        ? 'bg-emerald-500 text-white'
                        : 'bg-white/10 text-slate-300 hover:bg-white/15'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Step Content */}
            <div>
          {activeTab === 'overview' && (() => {
            // Calculations
            const totalApprovedDeposits = allDeposits.filter(d => d.status === 'approved');
            
            // Total Buyers Count
            const uniqueBuyersCount = new Set(userPlans.filter(up => up.status === 'active' || up.status === 'completed').map(up => up.user_id)).size;
            const activePlansCount = userPlans.filter(up => up.status === 'active').length;
            
            // 7 Days Investment
            const now = new Date();
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(now.getDate() - 7);
            const sevenDaysInvestment = totalApprovedDeposits
              .filter(d => new Date(d.created_at) >= sevenDaysAgo)
              .reduce((sum, d) => sum + Number(d.plans?.plan_price || 0), 0);

            // 30 Days (1 Month) Investment
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(now.getDate() - 30);
            const thirtyDaysInvestment = totalApprovedDeposits
              .filter(d => new Date(d.created_at) >= thirtyDaysAgo)
              .reduce((sum, d) => sum + Number(d.plans?.plan_price || 0), 0);

            // All-time Investment (Total Plan purchase revenue)
            const allTimeInvestment = totalApprovedDeposits.reduce((sum, d) => sum + Number(d.plans?.plan_price || 0), 0);

            // Money we have to pay (Liabilities)
            // 1. Dashboard balances of all users
            const totalUserBalances = users.reduce((sum, u) => sum + Number(u.balance || 0), 0);
            // 2. Uncollected daily rewards
            const pendingRewardsSum = allRewards
              .filter(r => r.status === 'pending')
              .reduce((sum, r) => sum + Number(r.reward_amount || 0), 0);
            const totalOwedAmount = totalUserBalances + pendingRewardsSum;

            // Money already paid out / collected (Outflow)
            // 1. Collected daily rewards
            const dailyRewardsCollectedSum = allRewards
              .filter(r => r.status === 'collected')
              .reduce((sum, r) => sum + Number(r.reward_amount || 0), 0);
            // 2. Referral rewards paid (either table count or fallback)
            let referralPaidSum = referralCollections.reduce((sum, r) => sum + Number(r.amount || appSettings.referral_bonus || 50), 0);
            if (referralPaidSum === 0) {
              const activeRefIds = new Set(userPlans.map(up => up.user_id));
              users.forEach(u => {
                if (u.referred_by && activeRefIds.has(u.id)) {
                  referralPaidSum += (Number(appSettings.referral_bonus) || 50);
                }
              });
            }
            // 3. Weekly salary collections
            const weeklySalaryPaidSum = weeklySalaries.reduce((sum, s) => sum + Number(s.amount || 0), 0);

            const totalPaidOutSum = dailyRewardsCollectedSum + referralPaidSum + weeklySalaryPaidSum;
            const estimatedProfit = allTimeInvestment - totalPaidOutSum;

            // Profit Margin
            const profitMargin = allTimeInvestment > 0 
              ? ((allTimeInvestment - totalPaidOutSum) / allTimeInvestment) * 100 
              : 0;

            // Pro-Level Daily, Weekly, Monthly Platform Profit Calculations
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);

            // Deposits (Inflow)
            const depositsToday = totalApprovedDeposits
              .filter(d => new Date(d.created_at) >= startOfToday)
              .reduce((sum, d) => sum + Number(d.plans?.plan_price || 0), 0);
            const depositsWeekly = sevenDaysInvestment;
            const depositsMonthly = thirtyDaysInvestment;

            // Outflow - Daily rewards collected
            const rewardsToday = allRewards
              .filter(r => r.status === 'collected' && r.collected_at && new Date(r.collected_at) >= startOfToday)
              .reduce((sum, r) => sum + Number(r.reward_amount || 0), 0);
            const rewardsWeekly = allRewards
              .filter(r => r.status === 'collected' && r.collected_at && new Date(r.collected_at) >= sevenDaysAgo)
              .reduce((sum, r) => sum + Number(r.reward_amount || 0), 0);
            const rewardsMonthly = allRewards
              .filter(r => r.status === 'collected' && r.collected_at && new Date(r.collected_at) >= thirtyDaysAgo)
              .reduce((sum, r) => sum + Number(r.reward_amount || 0), 0);

            // Outflow - Referrals collected
            const referralsToday = referralCollections
              .filter(r => r.collected_at && new Date(r.collected_at) >= startOfToday)
              .reduce((sum, r) => sum + Number(r.amount || appSettings.referral_bonus || 50), 0);
            const referralsWeekly = referralCollections
              .filter(r => r.collected_at && new Date(r.collected_at) >= sevenDaysAgo)
              .reduce((sum, r) => sum + Number(r.amount || appSettings.referral_bonus || 50), 0);
            const referralsMonthly = referralCollections
              .filter(r => r.collected_at && new Date(r.collected_at) >= thirtyDaysAgo)
              .reduce((sum, r) => sum + Number(r.amount || appSettings.referral_bonus || 50), 0);

            // Outflow - Weekly salaries
            const salaryToday = weeklySalaries
              .filter(s => s.collected_at && new Date(s.collected_at) >= startOfToday)
              .reduce((sum, s) => sum + Number(s.amount || 0), 0);
            const salaryWeekly = weeklySalaries
              .filter(s => s.collected_at && new Date(s.collected_at) >= sevenDaysAgo)
              .reduce((sum, s) => sum + Number(s.amount || 0), 0);
            const salaryMonthly = weeklySalaries
              .filter(s => s.collected_at && new Date(s.collected_at) >= thirtyDaysAgo)
              .reduce((sum, s) => sum + Number(s.amount || 0), 0);

            // Net total outflows
            const outflowToday = rewardsToday + referralsToday + salaryToday;
            const outflowWeekly = rewardsWeekly + referralsWeekly + salaryWeekly;
            const outflowMonthly = rewardsMonthly + referralsMonthly + salaryMonthly;

            // Net platform profits
            const netProfitToday = depositsToday - outflowToday;
            const netProfitWeekly = depositsWeekly - outflowWeekly;
            const netProfitMonthly = depositsMonthly - outflowMonthly;

            // Net profit margins (%)
            const marginToday = depositsToday > 0 ? (netProfitToday / depositsToday) * 100 : 0;
            const marginWeekly = depositsWeekly > 0 ? (netProfitWeekly / depositsWeekly) * 100 : 0;
            const marginMonthly = depositsMonthly > 0 ? (netProfitMonthly / depositsMonthly) * 100 : 0;

            // Last 7 days daily data for the chart
            const last7DaysData = Array.from({ length: 7 }, (_, i) => {
              const d = new Date();
              d.setDate(now.getDate() - (6 - i));
              const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              const dateKey = d.toDateString();
              
              // Sum deposits on this day
              const amount = totalApprovedDeposits
                .filter(dep => new Date(dep.created_at).toDateString() === dateKey)
                .reduce((sum, dep) => sum + Number(dep.plans?.plan_price || 0), 0);
                
              return { dateStr, amount };
            });

            const maxChartAmount = Math.max(...last7DaysData.map(d => d.amount), 500);

            // SQL Queries
            const sqlQueries = [
              {
                id: 'consolidated_metrics',
                title: 'All-in-One Financial Ledger',
                description: 'Calculates Plan Buyers, 7-day/30-day/All-time investments, total owed liabilities, total payouts completed, net profit, and profit margin in a single run.',
                sql: `WITH stats AS (
  SELECT 
    (SELECT COUNT(DISTINCT user_id) FROM public.user_plans) as total_buyers,
    (SELECT COUNT(*) FROM public.user_plans WHERE status = 'active') as active_plans,
    (SELECT COALESCE(SUM(p.plan_price), 0) FROM public.deposits d JOIN public.plans p ON d.plan_id = p.id WHERE d.status = 'approved') as all_time_investments,
    (SELECT COALESCE(SUM(p.plan_price), 0) FROM public.deposits d JOIN public.plans p ON d.plan_id = p.id WHERE d.status = 'approved' AND d.created_at >= NOW() - INTERVAL '7 days') as seven_day_investments,
    (SELECT COALESCE(SUM(p.plan_price), 0) FROM public.deposits d JOIN public.plans p ON d.plan_id = p.id WHERE d.status = 'approved' AND d.created_at >= NOW() - INTERVAL '30 days') as thirty_day_investments,
    (SELECT COALESCE(SUM(balance), 0) FROM public.profiles) as total_user_balances,
    (SELECT COALESCE(SUM(reward_amount), 0) FROM public.daily_rewards WHERE status = 'pending') as total_pending_rewards,
    (SELECT COALESCE(SUM(reward_amount), 0) FROM public.daily_rewards WHERE status = 'collected') as daily_rewards_paid,
    (SELECT COALESCE(SUM(amount), 0) FROM public.referral_collections) as referral_rewards_paid,
    (SELECT COALESCE(SUM(amount), 0) FROM public.weekly_salary_collections) as weekly_salary_paid
)
SELECT 
  total_buyers as "Total Unique Buyers",
  active_plans as "Active Plans Count",
  seven_day_investments as "7-Day Investments (PKR)",
  thirty_day_investments as "30-Day Investments (PKR)",
  all_time_investments as "All-Time Investments (PKR)",
  (total_user_balances + total_pending_rewards) as "Total Owed to Users (PKR)",
  total_user_balances as "User Wallet Balances (PKR)",
  total_pending_rewards as "Uncollected Rewards (PKR)",
  (daily_rewards_paid + referral_rewards_paid + weekly_salary_paid) as "Total Paid Out (PKR)",
  daily_rewards_paid as "Daily Rewards Collected (PKR)",
  referral_rewards_paid as "Referral Bonuses Paid (PKR)",
  weekly_salary_paid as "Weekly Salaries Paid (PKR)",
  (all_time_investments - (daily_rewards_paid + referral_rewards_paid + weekly_salary_paid)) as "Net Platform Profit (PKR)",
  ROUND(
    CASE 
      WHEN all_time_investments > 0 THEN 
        ((all_time_investments - (daily_rewards_paid + referral_rewards_paid + weekly_salary_paid)) / all_time_investments * 100)
      ELSE 0 
    END, 2
  ) as "Net Profit Margin (%)"
FROM stats;`
              },
              {
                id: 'referral_system_setup',
                title: 'Full System Setup (Notifications & Referrals)',
                description: 'Unified setup for notifications, referral tracking, and automatic balance updates. Run this once to fix all calculation and notification issues.',
                sql: `-- 1. Unified Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false NOT NULL,
  type text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 2. Referral Collections Table (Track each bonus)
-- 2. Referral Collections Table (Track each bonus)
CREATE TABLE IF NOT EXISTS public.referral_collections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  referred_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL,
  collected_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_referral_bonus UNIQUE (referred_user_id)
);
ALTER TABLE public.referral_collections ENABLE ROW LEVEL SECURITY;

-- 3. Unified Trigger for Plan Activation (NOTIFICATIONS + BALANCE UPDATE)
CREATE OR REPLACE FUNCTION public.handle_user_plan_activation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan_name text;
  v_referrer_code text;
  v_referrer_id uuid;
  v_bonus numeric;
  v_plan_price numeric;
  v_referred_name text;
  v_is_activation boolean;
BEGIN
  -- Determine if this is a new activation (status changing to active)
  IF TG_OP = 'INSERT' THEN
    v_is_activation := (new.status = 'active');
  ELSE
    v_is_activation := (old.status IS DISTINCT FROM 'active' AND new.status = 'active');
  END IF;

  IF v_is_activation THEN
    -- 1. Get Plan Details
    SELECT 
      COALESCE(name, 'Plan ' || plan_number), 
      COALESCE(plan_price, invest_amount, 0) 
    INTO v_plan_name, v_plan_price 
    FROM public.plans 
    WHERE id = new.plan_id;
    
    -- 2. Notify the user who activated the plan
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      new.user_id,
      'Plan Activated! 🎉',
      'Congratulations! Your plan "' || COALESCE(v_plan_name, 'Active Plan') || '" is approved. You can now start collecting your daily reward!',
      'member_active'
    );

    -- 3. Handle Referral Bonus (Only for paid plans)
    IF v_plan_price > 0 THEN
      -- Get referrer code and username of the person who activated
      SELECT referred_by, username INTO v_referrer_code, v_referred_name 
      FROM public.profiles 
      WHERE id = new.user_id;
      
      IF v_referrer_code IS NOT NULL AND TRIM(v_referrer_code) <> '' THEN
        -- Find the referrer's ID
        SELECT id INTO v_referrer_id 
        FROM public.profiles 
        WHERE referral_code = TRIM(v_referrer_code);
        
        IF v_referrer_id IS NOT NULL THEN
          -- Record the bonus (Handles duplicate prevention via UNIQUE constraint)
          BEGIN
            -- Get bonus amount from settings or default to 50
            BEGIN
              SELECT CAST(COALESCE(NULLIF(setting_value, ''), '50') AS numeric) INTO v_bonus 
              FROM public.app_settings 
              WHERE setting_key = 'referral_bonus';
            EXCEPTION WHEN OTHERS THEN
              v_bonus := 50;
            END;
            
            IF v_bonus IS NULL THEN v_bonus := 50; END IF;

            -- Record the collection (Will fail if already exists)
            INSERT INTO public.referral_collections (referrer_id, referred_user_id, amount)
            VALUES (v_referrer_id, new.user_id, v_bonus);
            
            -- Notify Referrer (No direct balance update anymore, to prevent double payments alongside Salary)
            INSERT INTO public.notifications (user_id, title, message, type)
            VALUES (
              v_referrer_id,
              'Referral Bonus Received! 💰',
              'Your team member (' || COALESCE(v_referred_name, 'Someone') || ') activated their account! You received ' || v_bonus || ' PKR active referral bonus.',
              'referral_bonus'
            );
          EXCEPTION WHEN unique_violation THEN
            -- Already handled, do nothing
            NULL;
          END;
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_user_plan_activation ON public.user_plans;
CREATE TRIGGER on_user_plan_activation AFTER INSERT OR UPDATE ON public.user_plans FOR EACH ROW EXECUTE FUNCTION public.handle_user_plan_activation();

-- 4. RPCs for Admin Actions
CREATE OR REPLACE FUNCTION public.approve_deposit(p_deposit_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid;
  v_plan_id bigint;
  v_platform_method_id bigint;
  v_sender_account_name text;
  v_sender_account_number text;
  v_screenshot_url text;
  v_amount numeric;
  v_daily_reward numeric;
  i int;
BEGIN
  -- Safely ensure start_date column exists in public.user_plans
  BEGIN
    ALTER TABLE public.user_plans ADD COLUMN IF NOT EXISTS start_date timestamp with time zone;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Safely ensure available_at column exists in public.daily_rewards
  BEGIN
    ALTER TABLE public.daily_rewards ADD COLUMN IF NOT EXISTS available_at timestamp with time zone;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Update deposit status to approved
  UPDATE public.deposits SET status = 'approved', receipt_url = COALESCE(receipt_url, screenshot_url) WHERE id = p_deposit_id;

  -- Fetch deposit details
  SELECT user_id, plan_id, platform_method_id, user_account_name, user_account_number, screenshot_url, amount
  INTO v_user_id, v_plan_id, v_platform_method_id, v_sender_account_name, v_sender_account_number, v_screenshot_url, v_amount
  FROM public.deposits
  WHERE id = p_deposit_id;

  -- Ensure v_platform_method_id is valid or exists
  IF v_platform_method_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.payment_methods WHERE id = v_platform_method_id) THEN
    SELECT id INTO v_platform_method_id FROM public.payment_methods WHERE is_active = true LIMIT 1;
    IF v_platform_method_id IS NULL THEN
      SELECT id INTO v_platform_method_id FROM public.payment_methods LIMIT 1;
    END IF;
  END IF;

  IF v_user_id IS NOT NULL THEN
    -- Insert or update user plan
    INSERT INTO public.user_plans (
      id,
      user_id,
      plan_id,
      status,
      admin_payment_method_id,
      sender_account_name,
      sender_account_number,
      receipt_image_url,
      created_at,
      approved_at,
      start_date
    ) VALUES (
      p_deposit_id,
      v_user_id,
      v_plan_id,
      'active',
      COALESCE(v_platform_method_id, 1),
      COALESCE(v_sender_account_name, 'Unknown'),
      COALESCE(v_sender_account_number, 'Unknown'),
      COALESCE(v_screenshot_url, ''),
      now(),
      now(),
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      status = 'active',
      approved_at = now(),
      start_date = now();

    -- Fetch daily reward amount
    SELECT COALESCE(daily_reward, daily_return, 0)
    INTO v_daily_reward
    FROM public.plans
    WHERE id = v_plan_id;

    IF v_daily_reward IS NULL OR v_daily_reward = 0 THEN
      v_daily_reward := COALESCE(v_amount, 0) * 0.05;
    END IF;

    -- Generate 30 daily rewards
    FOR i IN 1..30 LOOP
      INSERT INTO public.daily_rewards (
        user_plan_id,
        user_id,
        day_number,
        status,
        reward_amount,
        available_at
      ) VALUES (
        p_deposit_id,
        v_user_id,
        i,
        'pending',
        COALESCE(v_daily_reward, 0),
        now() + ((i - 1) || ' days')::interval
      )
      ON CONFLICT (user_plan_id, day_number) DO NOTHING;
    END LOOP;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_withdrawal(p_withdrawal_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.withdrawals SET status = 'approved', processed_at = now() WHERE id = p_withdrawal_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_withdrawal(p_withdrawal_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid;
  v_amount numeric;
  v_status text;
BEGIN
  SELECT user_id, amount, status INTO v_user_id, v_amount, v_status FROM public.withdrawals WHERE id = p_withdrawal_id;
  IF v_status = 'pending' THEN
    UPDATE public.profiles SET balance = balance + v_amount WHERE id = v_user_id;
    UPDATE public.withdrawals SET status = 'rejected', processed_at = now() WHERE id = p_withdrawal_id;
  END IF;
END;
$$;

-- 5. Default Settings
INSERT INTO public.app_settings (setting_key, setting_value) VALUES ('referral_bonus', '50') ON CONFLICT (setting_key) DO NOTHING;
INSERT INTO public.app_settings (setting_key, setting_value) VALUES ('level_1_req', '10') ON CONFLICT (setting_key) DO NOTHING;
INSERT INTO public.app_settings (setting_key, setting_value) VALUES ('level_2_req', '30') ON CONFLICT (setting_key) DO NOTHING;
INSERT INTO public.app_settings (setting_key, setting_value) VALUES ('level_3_req', '50') ON CONFLICT (setting_key) DO NOTHING;
INSERT INTO public.app_settings (setting_key, setting_value) VALUES ('level_4_req', '100') ON CONFLICT (setting_key) DO NOTHING;
INSERT INTO public.app_settings (setting_key, setting_value) VALUES ('level_5_req', '150') ON CONFLICT (setting_key) DO NOTHING;
INSERT INTO public.app_settings (setting_key, setting_value) VALUES ('level_6_req', '300') ON CONFLICT (setting_key) DO NOTHING;

-- 6. Clean up any other redundant triggers
DROP TRIGGER IF EXISTS on_referral_bonus ON public.referral_collections;
DROP FUNCTION IF EXISTS public.handle_referral_bonus();`
              },
              {
                id: 'balance_repair',
                title: 'REPAIR: Fix All User Balances',
                description: 'Deletes duplicate referral records and resets every user balance to exactly what they earned (Rewards + Salary - Withdrawals). Note: Direct referrals do not add to balance anymore to avoid double payments.',
                sql: `-- Emergency Balance Repair Script
-- 1. Remove any accidentally doubled referral records
DELETE FROM public.referral_collections a
USING public.referral_collections b
WHERE a.id < b.id AND a.referred_user_id = b.referred_user_id;

-- 2. Remove duplicate withdrawals caused by UI double clicks (same user, amount, account within 5 minutes)
DELETE FROM public.withdrawals a
USING public.withdrawals b
WHERE a.id > b.id 
  AND a.user_id = b.user_id 
  AND a.amount = b.amount 
  AND a.status = b.status
  AND a.account_number = b.account_number
  AND (a.created_at - b.created_at) < interval '5 minutes';

-- 3. Drop obsolete registration balance-adding triggers
DROP TRIGGER IF EXISTS on_new_referred_member_balance ON public.profiles CASCADE;
DROP TRIGGER IF EXISTS on_new_referred_member ON public.profiles CASCADE;

-- 4. Recreate handle_new_referred_member as Notification ONLY
CREATE OR REPLACE FUNCTION public.handle_new_referred_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_referrer_id uuid;
BEGIN
  IF new.referred_by IS NOT NULL THEN
    SELECT id INTO v_referrer_id 
    FROM public.profiles 
    WHERE referral_code = new.referred_by;
    
    IF v_referrer_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (
        v_referrer_id,
        'New Referral Registered 👤',
        'A new member (' || COALESCE(new.username, 'Someone') || ') has registered using your referral code!',
        'new_member'
      );
    END IF;
  END IF;
  RETURN new;
END;
$$;

-- 5. Recreate correct trigger
CREATE TRIGGER on_new_referred_member
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_referred_member();

-- 6. Recalculate everyone's balance (Collected Rewards + Weekly Salary - Pending/Approved Withdrawals)
-- Direct referral bonuses are tracked inside referral_collections and are completely excluded from balance column!
UPDATE public.profiles p
SET balance = (
  COALESCE((SELECT SUM(reward_amount) FROM public.daily_rewards WHERE status = 'collected' AND user_plan_id IN (SELECT id FROM public.user_plans WHERE user_id = p.id)), 0) +
  COALESCE((SELECT SUM(amount) FROM public.weekly_salary_collections WHERE user_id = p.id), 0) -
  COALESCE((SELECT SUM(amount) FROM public.withdrawals WHERE user_id = p.id AND status IN ('approved', 'pending')), 0)
);

-- 7. Reset negative balances to 0
UPDATE public.profiles SET balance = 0 WHERE balance < 0;

-- Show result of repair
SELECT username, balance as new_balance FROM public.profiles ORDER BY balance DESC;`
              },
              {
                id: 'referral_data_fix',
                title: 'FIX: Missing Referral Bonuses (Sync Fix)',
                description: "Run this to manually track missing referral bonuses for users who have active plans. (Does NOT update balance).",
                sql: `-- This script finds active members who haven't triggered a referral bonus yet and adds them to tracking safely.
WITH missing_rewards AS (
  SELECT 
    p_ref.id as referrer_id,
    p_referred.id as referred_user_id,
    CAST(COALESCE(NULLIF((SELECT setting_value FROM public.app_settings WHERE setting_key = 'referral_bonus'), ''), '50') AS numeric) as amount
  FROM public.profiles p_referred
  JOIN public.profiles p_ref ON p_referred.referred_by = p_ref.referral_code
  JOIN public.user_plans up ON p_referred.id = up.user_id
  WHERE up.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM public.referral_collections rc 
      WHERE rc.referrer_id = p_ref.id AND rc.referred_user_id = p_referred.id
    )
)
INSERT INTO public.referral_collections (referrer_id, referred_user_id, amount)
SELECT referrer_id, referred_user_id, amount FROM missing_rewards
ON CONFLICT (referred_user_id) DO NOTHING;

-- Show result of repair
SELECT 
  p.username as referrer,
  COUNT(i.referred_user_id) as fixed_count,
  SUM(i.amount) as total_referral_volume
FROM public.profiles p
JOIN public.referral_collections i ON p.id = i.referrer_id
WHERE i.collected_at >= NOW() - INTERVAL '5 minutes'
GROUP BY p.username;`
              },
              {
                id: 'all_buyers',
                title: 'Plan Buyers Count',
                description: 'Unique member accounts that have actively purchased any plan.',
                sql: `SELECT COUNT(DISTINCT user_id) as total_buyers \nFROM public.user_plans;`
              },
              {
                id: 'seven_day',
                title: '7-Day Investments',
                description: 'Total incoming PKR approved from purchases in the last 7 days.',
                sql: `SELECT COALESCE(SUM(p.plan_price), 0) as seven_day_investments\nFROM public.deposits d\nJOIN public.plans p ON d.plan_id = p.id\nWHERE d.status = 'approved' \n  AND d.created_at >= NOW() - INTERVAL '7 days';`
              },
              {
                id: 'thirty_day',
                title: '30-Day Investments',
                description: 'Total incoming PKR approved in the last 30 days (1 month).',
                sql: `SELECT COALESCE(SUM(p.plan_price), 0) as thirty_day_investments\nFROM public.deposits d\nJOIN public.plans p ON d.plan_id = p.id\nWHERE d.status = 'approved' \n  AND d.created_at >= NOW() - INTERVAL '30 days';`
              },
              {
                id: 'owed',
                title: 'Money to Pay (Liability)',
                description: 'Sum of user balances available for withdrawal + daily rewards still pending inside packages.',
                sql: `SELECT \n  (SELECT COALESCE(SUM(balance), 0) FROM public.profiles) as total_user_balances,\n  (SELECT COALESCE(SUM(reward_amount), 0) FROM public.daily_rewards WHERE status = 'pending') as total_pending_rewards,\n  ((SELECT COALESCE(SUM(balance), 0) FROM public.profiles) + \n   (SELECT COALESCE(SUM(reward_amount), 0) FROM public.daily_rewards WHERE status = 'pending')) as total_owed;`
              },
              {
                id: 'paid',
                title: 'Total Cash Outflow',
                description: 'Total payouts completed (collected daily rewards, referral bonuses, and weekly salaries).',
                sql: `SELECT \n  (SELECT COALESCE(SUM(reward_amount), 0) FROM public.daily_rewards WHERE status = 'collected') as daily_rewards_collected,\n  (SELECT COALESCE(SUM(amount), 0) FROM public.referral_collections) as referral_rewards_collected,\n  (SELECT COALESCE(SUM(amount), 0) FROM public.weekly_salary_collections) as weekly_salary_collected,\n  ((SELECT COALESCE(SUM(reward_amount), 0) FROM public.daily_rewards WHERE status = 'collected') +\n   (SELECT COALESCE(SUM(amount), 0) FROM public.referral_collections) +\n   (SELECT COALESCE(SUM(amount), 0) FROM public.weekly_salary_collections)) as total_paid_out;`
              },
              {
                id: 'ledger',
                title: '30-Day Inflow/Outflow Ledger',
                description: 'Day-by-day record of incoming investments vs daily collected rewards for the past month.',
                sql: `WITH daily_inflow AS (\n  SELECT DATE_TRUNC('day', d.created_at) as day, SUM(p.plan_price) as inflow\n  FROM public.deposits d\n  JOIN public.plans p ON d.plan_id = p.id\n  WHERE d.status = 'approved' AND d.created_at >= NOW() - INTERVAL '30 days'\n  GROUP BY 1\n), daily_outflow AS (\n  SELECT DATE_TRUNC('day', collected_at) as day, SUM(reward_amount) as outflow\n  FROM public.daily_rewards\n  WHERE status = 'collected' AND collected_at >= NOW() - INTERVAL '30 days'\n  GROUP BY 1\n)\nSELECT COALESCE(i.day, o.day)::date as record_date, COALESCE(i.inflow, 0) as total_incoming, COALESCE(o.outflow, 0) as total_outgoing, (COALESCE(i.inflow, 0) - COALESCE(o.outflow, 0)) as net_profit\nFROM daily_inflow i FULL OUTER JOIN daily_outflow o ON i.day = o.day\nORDER BY 1 DESC;`
              }
            ];

            const copyQuery = (queryText: string, qId: string) => {
              navigator.clipboard.writeText(queryText);
              setCopiedQueryId(qId);
              setTimeout(() => setCopiedQueryId(null), 2000);
            };

            const selectedQuery = sqlQueries.find(q => q.id === activeQueryCategory) || sqlQueries[0];

            return (
              <div className="space-y-6">
                
                {/* Row 1: Executive KPI Widgets */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Total Registered Accounts */}
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-slate-500 text-xs sm:text-sm font-semibold tracking-tight">Total Registered Accounts</span>
                      <div className="h-9 w-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                        <Users className="h-5 w-5" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">{users.length}</h3>
                      <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                        <span>Active: <strong className="text-emerald-600 font-bold">{uniqueBuyersCount}</strong></span>
                        <span>Free: <strong className="text-slate-500 font-bold">{users.length - uniqueBuyersCount}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* 7 Days Investment */}
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-slate-500 text-xs sm:text-sm font-semibold tracking-tight">7-Day Investment</span>
                      <div className="h-9 w-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                        <TrendingUp className="h-5 w-5" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">Rs. {sevenDaysInvestment.toLocaleString()}</h3>
                      <p className="text-[11px] text-slate-400 mt-1">30-day volume: <strong className="text-slate-600 font-bold">Rs. {thirtyDaysInvestment.toLocaleString()}</strong></p>
                    </div>
                  </div>

                  {/* Future Liability (Owed) */}
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-slate-500 text-xs sm:text-sm font-semibold tracking-tight">We Must Pay (Owed)</span>
                      <div className="h-9 w-9 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                        <Clock className="h-5 w-5" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">Rs. {totalOwedAmount.toLocaleString()}</h3>
                      <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                        <span>User Balances: <strong className="text-slate-600 font-bold">Rs. {Math.round(totalUserBalances).toLocaleString()}</strong></span>
                        <span>Pending Rewards: <strong className="text-slate-600 font-bold">Rs. {Math.round(pendingRewardsSum).toLocaleString()}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Money Paid Out */}
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-slate-500 text-xs sm:text-sm font-semibold tracking-tight">Total Payouts Done</span>
                      <div className="h-9 w-9 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
                        <TrendingDown className="h-5 w-5" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">Rs. {totalPaidOutSum.toLocaleString()}</h3>
                      <p className="text-[11px] text-slate-400 mt-1">Estimated Net Revenue: <strong className="text-slate-600 font-bold">Rs. {Math.round(estimatedProfit).toLocaleString()}</strong></p>
                    </div>
                  </div>
                </div>

                {/* Custom Pro-Level Platform Earnings Report */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-lg border border-slate-700/40 space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                      <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider mb-1 inline-block">Real-time Accounting</span>
                      <h3 className="text-lg font-bold text-slate-50 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-400" /> Platform Earning & Profit Dynamics
                      </h3>
                      <p className="text-xs text-slate-400">
                        Daily, Weekly aur Monthly base par actual platform profit aur margin level calculations (Live data).
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setShowExpectedMatrix(!showExpectedMatrix)}
                        className="bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs py-1.5 px-3 rounded-lg border border-slate-700 transition flex items-center gap-1 font-medium"
                      >
                        {showExpectedMatrix ? 'Hide' : 'Show'} 10 Plans Matrix
                      </button>
                    </div>
                  </div>

                  {/* 3 Period Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Daily Earnings Card */}
                    <div className="bg-slate-950/50 p-4.5 rounded-xl border border-slate-800 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Daily (Rozana)</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${marginToday >= 50 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                          {marginToday.toFixed(1)}% Margin
                        </span>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-medium">Net Profit Today</p>
                        <h4 className={`text-xl font-extrabold tracking-tight ${netProfitToday >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          Rs. {Math.round(netProfitToday).toLocaleString()}
                        </h4>
                      </div>
                      <div className="border-t border-slate-800/60 pt-2.5 grid grid-cols-2 gap-2 text-[10.5px]">
                        <div>
                          <span className="text-slate-500 block">Total Inflow</span>
                          <span className="text-emerald-400 font-bold">Rs. {depositsToday.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Total Outflow</span>
                          <span className="text-rose-400 font-bold">Rs. {outflowToday.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Weekly Earnings Card */}
                    <div className="bg-slate-950/50 p-4.5 rounded-xl border border-slate-800 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Weekly (Hafta-war)</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                          {marginWeekly.toFixed(1)}% Margin
                        </span>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-medium">Net Profit Last 7 Days</p>
                        <h4 className={`text-xl font-extrabold tracking-tight ${netProfitWeekly >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          Rs. {Math.round(netProfitWeekly).toLocaleString()}
                        </h4>
                      </div>
                      <div className="border-t border-slate-800/60 pt-2.5 grid grid-cols-2 gap-2 text-[10.5px]">
                        <div>
                          <span className="text-slate-500 block">Total Inflow</span>
                          <span className="text-emerald-400 font-bold">Rs. {depositsWeekly.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Total Outflow</span>
                          <span className="text-rose-400 font-bold">Rs. {outflowWeekly.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Monthly Earnings Card */}
                    <div className="bg-slate-950/50 p-4.5 rounded-xl border border-slate-800 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Monthly (Mahana)</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                          {marginMonthly.toFixed(1)}% Margin
                        </span>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-medium">Net Profit Last 30 Days</p>
                        <h4 className={`text-xl font-extrabold tracking-tight ${netProfitMonthly >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          Rs. {Math.round(netProfitMonthly).toLocaleString()}
                        </h4>
                      </div>
                      <div className="border-t border-slate-800/60 pt-2.5 grid grid-cols-2 gap-2 text-[10.5px]">
                        <div>
                          <span className="text-slate-500 block">Total Inflow</span>
                          <span className="text-emerald-400 font-bold">Rs. {depositsMonthly.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Total Outflow</span>
                          <span className="text-rose-400 font-bold">Rs. {outflowMonthly.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 10 Plans Profit Blueprint - Dynamic Matrix (Toggleable) */}
                  {showExpectedMatrix && (
                    <div className="border-t border-slate-800 pt-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="text-sm font-bold text-slate-200">10 Reward Plans Profit Blueprint & Economics Matrix</h4>
                        <span className="text-[10px] text-slate-400 italic">As per official mathematical formula (Image blueprint)</span>
                      </div>
                      <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950">
                        <table className="w-full text-left border-collapse text-[11px]">
                          <thead>
                            <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                              <th className="p-2 text-center">Plan #</th>
                              <th className="p-2 text-right">Price (P)</th>
                              <th className="p-2 text-center">Daily (D)</th>
                              <th className="p-2 text-center">Members Required (M)</th>
                              <th className="p-2 text-right">Members Rev (M_rev)</th>
                              <th className="p-2 text-right">Platform Rev (A)</th>
                              <th className="p-2 text-right">User Total (B)</th>
                              <th className="p-2 text-right bg-emerald-950/30 text-emerald-300">Platform Profit (A-B)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-900 text-slate-300">
                            {[
                              { plan: 1, price: 250, daily: 20, members: 3 },
                              { plan: 2, price: 300, daily: 25, members: 5 },
                              { plan: 3, price: 500, daily: 45, members: 7 },
                              { plan: 4, price: 700, daily: 70, members: 10 },
                              { plan: 5, price: 1000, daily: 90, members: 15 },
                              { plan: 6, price: 1500, daily: 120, members: 20 },
                              { plan: 7, price: 2000, daily: 150, members: 25 },
                              { plan: 8, price: 3000, daily: 210, members: 30 },
                              { plan: 9, price: 4000, daily: 260, members: 35 },
                              { plan: 10, price: 5000, daily: 300, members: 40 },
                            ].map((row) => {
                              const refBonus = Number(appSettings.referral_bonus) || 50;
                              const memRev = row.members * 250;
                              const platRev = row.price + memRev;
                              const userTotal = (row.daily * 30) + (row.members * refBonus);
                              const profit = platRev - userTotal;
                              return (
                                <tr key={row.plan} className="hover:bg-slate-900/40">
                                  <td className="p-2 font-bold text-center text-amber-400">Plan {row.plan}</td>
                                  <td className="p-2 text-right">Rs. {row.price}</td>
                                  <td className="p-2 text-center text-slate-400 font-semibold">Rs. {row.daily}/day</td>
                                  <td className="p-2 text-center font-bold text-sky-400">{row.members}</td>
                                  <td className="p-2 text-right text-slate-400">Rs. {memRev}</td>
                                  <td className="p-2 text-right text-slate-200">Rs. {platRev}</td>
                                  <td className="p-2 text-right text-slate-400">Rs. {userTotal}</td>
                                  <td className="p-2 text-right font-extrabold bg-emerald-950/20 text-emerald-400">Rs. {profit}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Row 2: Charts Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left: 7 Days Investment trend SVG */}
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2 space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-slate-800">7-Day Investment Trend</h3>
                        <p className="text-xs text-slate-500">Approved deposits tracked daily</p>
                      </div>
                      <BarChart2 className="w-5 h-5 text-slate-400" />
                    </div>

                    <div className="h-48 w-full pt-4 flex flex-col justify-between">
                      {/* SVG Bar Chart */}
                      <div className="flex-1 flex items-end gap-3 px-2">
                        {last7DaysData.map((dataItem, idx) => {
                          const heightPct = dataItem.amount > 0 ? (dataItem.amount / maxChartAmount) * 100 : 3;
                          return (
                            <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                              <div className="relative w-full flex justify-center">
                                {/* Hover Tooltip */}
                                <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 bg-slate-800 text-white text-[10px] py-1 px-2 rounded font-bold shadow transition-opacity pointer-events-none whitespace-nowrap z-10">
                                  Rs. {dataItem.amount.toLocaleString()}
                                </div>
                              </div>
                              <div 
                                style={{ height: `${heightPct}%` }}
                                className={`w-full max-w-[28px] rounded-t-lg transition-all duration-500 hover:brightness-110 cursor-pointer ${
                                  dataItem.amount > 0 ? 'bg-gradient-to-t from-emerald-500 to-teal-400' : 'bg-slate-100'
                                }`}
                              />
                            </div>
                          );
                        })}
                      </div>

                      {/* X-Axis labels */}
                      <div className="flex justify-between border-t border-slate-100 pt-2 px-2">
                        {last7DaysData.map((dataItem, idx) => (
                          <span key={idx} className="text-[10px] sm:text-xs font-medium text-slate-400 whitespace-nowrap text-center flex-1">
                            {dataItem.dateStr}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: Outflow breakdown chart */}
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-slate-800">Outflow Distribution</h3>
                        <p className="text-xs text-slate-500">Breakdown of total cash paid out</p>
                      </div>
                      <PieChart className="w-5 h-5 text-slate-400" />
                    </div>

                    {/* Donut Chart Graphics or visual indicators */}
                    <div className="flex-1 flex flex-col justify-center space-y-4 py-2">
                      <div className="flex items-center justify-center relative">
                        <svg className="w-28 h-28 transform -rotate-90">
                          {/* Inner white circle */}
                          <circle cx="56" cy="56" r="42" fill="white" className="z-10" />
                          
                          {/* Daily rewards circle */}
                          <circle 
                            cx="56" cy="56" r="42" 
                            fill="transparent" 
                            stroke="#0F7A50" 
                            strokeWidth="14" 
                            strokeDasharray="264" 
                            strokeDashoffset={totalPaidOutSum > 0 ? 264 - (264 * (dailyRewardsCollectedSum / totalPaidOutSum)) : 0} 
                          />
                          {/* Referral circle */}
                          <circle 
                            cx="56" cy="56" r="42" 
                            fill="transparent" 
                            stroke="#3b82f6" 
                            strokeWidth="14" 
                            strokeDasharray="264" 
                            strokeDashoffset={totalPaidOutSum > 0 ? 264 - (264 * ((dailyRewardsCollectedSum + referralPaidSum) / totalPaidOutSum)) : 88} 
                          />
                          {/* Weekly salary circle */}
                          <circle 
                            cx="56" cy="56" r="42" 
                            fill="transparent" 
                            stroke="#f59e0b" 
                            strokeWidth="14" 
                            strokeDasharray="264" 
                            strokeDashoffset={totalPaidOutSum > 0 ? 264 - (264 * ((dailyRewardsCollectedSum + referralPaidSum + weeklySalaryPaidSum) / totalPaidOutSum)) : 176} 
                          />
                        </svg>
                        <div className="absolute text-center">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Paid</p>
                          <p className="text-xs sm:text-sm font-extrabold text-slate-800">Rs. {Math.round(totalPaidOutSum).toLocaleString()}</p>
                        </div>
                      </div>

                      {/* Legends */}
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center bg-slate-50 p-2 rounded-xl">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#0F7A50] shrink-0" />
                            <span className="text-slate-600 font-medium">Daily Rewards</span>
                          </div>
                          <span className="font-bold text-slate-800">Rs. {Math.round(dailyRewardsCollectedSum).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center bg-slate-50 p-2 rounded-xl">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                            <span className="text-slate-600 font-medium">Referral Bonuses</span>
                          </div>
                          <span className="font-bold text-slate-800">Rs. {Math.round(referralPaidSum).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center bg-slate-50 p-2 rounded-xl">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                            <span className="text-slate-600 font-medium">Weekly Salaries</span>
                          </div>
                          <span className="font-bold text-slate-800">Rs. {Math.round(weeklySalaryPaidSum).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Row 3: 30 Days Financial Ledger Table */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-800">1-Month Investment & Outflow Record</h3>
                      <p className="text-xs text-slate-500">Summary of transactions (approved vs paid)</p>
                    </div>
                    <span className="text-[11px] bg-slate-100 text-slate-600 font-bold px-2 py-1 rounded-full uppercase tracking-wider">30 Days Summary</span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50 text-slate-500 text-xs border-b border-slate-100">
                        <tr>
                          <th className="p-3 font-semibold">Category</th>
                          <th className="p-3 font-semibold text-right">Inflow (Invested)</th>
                          <th className="p-3 font-semibold text-right">Outflow (Paid Out)</th>
                          <th className="p-3 font-semibold text-right">Net Platform Profit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-xs sm:text-sm text-slate-700">
                        <tr>
                          <td className="p-3">
                            <p className="font-bold text-slate-800">Package Investments & Daily Rewards</p>
                            <p className="text-[10px] text-slate-400">Total plans purchase vs collections</p>
                          </td>
                          <td className="p-3 text-right font-bold text-emerald-600">Rs. {thirtyDaysInvestment.toLocaleString()}</td>
                          <td className="p-3 text-right font-bold text-rose-500">Rs. {Math.round(dailyRewardsCollectedSum).toLocaleString()}</td>
                          <td className="p-3 text-right font-extrabold text-slate-800">Rs. {Math.round(thirtyDaysInvestment - dailyRewardsCollectedSum).toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td className="p-3">
                            <p className="font-bold text-slate-800">Referrals & Affiliation Program</p>
                            <p className="text-[10px] text-slate-400">Referral joining bonus payouts (50 PKR each)</p>
                          </td>
                          <td className="p-3 text-right text-slate-400">-</td>
                          <td className="p-3 text-right font-bold text-rose-500">Rs. {Math.round(referralPaidSum).toLocaleString()}</td>
                          <td className="p-3 text-right font-bold text-slate-600">-Rs. {Math.round(referralPaidSum).toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td className="p-3">
                            <p className="font-bold text-slate-800">Team Weekly Salary Program</p>
                            <p className="text-[10px] text-slate-400">Leader rewards based on active team sizes</p>
                          </td>
                          <td className="p-3 text-right text-slate-400">-</td>
                          <td className="p-3 text-right font-bold text-rose-500">Rs. {Math.round(weeklySalaryPaidSum).toLocaleString()}</td>
                          <td className="p-3 text-right font-bold text-slate-600">-Rs. {Math.round(weeklySalaryPaidSum).toLocaleString()}</td>
                        </tr>
                        <tr className="bg-slate-50 font-bold border-t border-slate-200">
                          <td className="p-3 text-slate-900 font-extrabold">Final Economic Consolidation</td>
                          <td className="p-3 text-right text-emerald-600 font-extrabold">Rs. {thirtyDaysInvestment.toLocaleString()}</td>
                          <td className="p-3 text-right text-rose-600 font-extrabold">Rs. {Math.round(totalPaidOutSum).toLocaleString()}</td>
                          <td className="p-3 text-right font-extrabold text-[#0F7A50] bg-[#e8fbf3] rounded-br-xl">
                            Rs. {Math.round(thirtyDaysInvestment - totalPaidOutSum).toLocaleString()}
                            <span className="text-[9px] block font-semibold text-emerald-700">({profitMargin.toFixed(1)}% Profit Margin)</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            );
          })()}



          {activeTab === 'users' && (() => {
            const filteredUsers = users.filter((u) => {
              if (!userSearchQuery) return true;
              const q = userSearchQuery.toLowerCase();
              return (
                (u.username || '').toLowerCase().includes(q) ||
                (u.email || '').toLowerCase().includes(q) ||
                (u.phone || '').toLowerCase().includes(q) ||
                (u.referral_code || '').toLowerCase().includes(q)
              );
            });
            return (
              <div className="space-y-6">
              {/* Search and Action Bar */}
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search username, email, phone or referral..."
                    className="pl-9 pr-4 py-2 w-full border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Mobile Users Card List (WhatsApp / TikTok Contact Style) */}
              <div className="md:hidden space-y-3">
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                    Showing {filteredUsers.length} of {users.length} Users
                  </span>
                </div>
                {filteredUsers.length === 0 ? (
                  <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-sm font-medium">
                    No users matched your search criteria.
                  </div>
                ) : (
                  filteredUsers.map((u) => {
                    const stats = getUserStats(u);
                    const hasActive = stats.userPls.some((up: any) => up.status === 'active' || up.status === 'completed');
                    const isBanned = u.status === 'banned' || u.is_banned === true;
                    return (
                      <div key={u.id} className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-xs space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-black text-sm flex items-center justify-center shrink-0 uppercase">
                              {(u.username || 'U').slice(0, 1)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-extrabold text-slate-900 text-sm truncate">{u.username}</p>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${u.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                                  {u.role}
                                </span>
                                {isBanned && (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-100 text-rose-700">
                                    Banned
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 font-mono truncate">{u.email}</p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                {u.phone && <span>📞 {u.phone}</span>}
                                {u.referral_code && <span className="text-indigo-600 font-bold">Ref: {u.referral_code}</span>}
                              </div>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase shrink-0 ${hasActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
                            {hasActive ? 'Active Plan' : 'Free'}
                          </span>
                        </div>

                        <div className="grid grid-cols-4 gap-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                          <div>
                            <span className="text-[9px] text-slate-400 font-bold uppercase block">Balance</span>
                            <span className="text-xs font-black text-emerald-700">Rs {Number(u.balance || 0).toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 font-bold uppercase block">Invested</span>
                            <span className="text-xs font-black text-slate-800">Rs {stats.totalInvestment.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 font-bold uppercase block">Earned</span>
                            <span className="text-xs font-black text-sky-600">Rs {stats.totalEarnings.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 font-bold uppercase block">Team</span>
                            <span className="text-xs font-black text-indigo-700">{stats.activeTeamCount}/{stats.teamCount}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setGiftingUser(u);
                              setSelectedGiftPlanId(plans[0]?.id || 1);
                            }}
                            className="py-2 px-3 rounded-xl bg-amber-50 text-amber-800 border border-amber-300 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer hover:bg-amber-100"
                          >
                            <Zap className="w-3.5 h-3.5 text-amber-600" /> Gift
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedUser(u)}
                            className="flex-1 py-2 px-3 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" /> Full File
                          </button>
                          {isBanned ? (
                            <button
                              type="button"
                              onClick={() => handleUnbanUser(u.id)}
                              className="py-2 px-3 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-700 cursor-pointer"
                            >
                              Unban
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleBanUser(u.id)}
                              className="py-2 px-3 rounded-xl text-xs font-bold bg-rose-100 text-rose-700 cursor-pointer"
                            >
                              Ban
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleUpdateUserRole(u.id, u.role, u.email)}
                            disabled={u.email === 'saqib242saqib@gmail.com'}
                            className={`py-2 px-3 rounded-xl text-xs font-bold ${
                              u.email === 'saqib242saqib@gmail.com'
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : u.role === 'admin'
                                ? 'bg-rose-50 text-rose-600'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {u.role === 'admin' ? 'Demote' : 'Promote'}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Desktop Users Ledger Table */}
              <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Showing {filteredUsers.length} of {users.length} Users
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider font-semibold border-b border-slate-100">
                      <tr>
                        <th className="p-4 font-medium whitespace-nowrap">User (Email)</th>
                        <th className="p-4 font-medium whitespace-nowrap text-right">Balance</th>
                        <th className="p-4 font-medium whitespace-nowrap text-right">Investment</th>
                        <th className="p-4 font-medium whitespace-nowrap text-right">Total Earned</th>
                        <th className="p-4 font-medium whitespace-nowrap text-right">Earned Today</th>
                        <th className="p-4 font-medium whitespace-nowrap text-center">Team (Active/Total)</th>
                        <th className="p-4 font-medium whitespace-nowrap">Status</th>
                        <th className="p-4 font-medium whitespace-nowrap text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-400 text-sm font-medium">
                            No users matched your search criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u) => {
                          const stats = getUserStats(u);
                          return (
                            <tr key={u.id} className="text-sm hover:bg-slate-50/40 transition-colors">
                              <td className="p-4 whitespace-nowrap">
                                <div className="font-semibold text-slate-800">{u.username}</div>
                                <div className="text-xs text-slate-500 font-mono">{u.email}</div>
                                {u.phone && <div className="text-[10px] text-slate-400">📞 {u.phone}</div>}
                                {u.referral_code && (
                                  <div className="text-[10px] text-indigo-500 font-semibold mt-0.5">
                                    Ref: {u.referral_code}
                                  </div>
                                )}
                              </td>
                              <td className="p-4 text-right whitespace-nowrap font-bold text-emerald-600">
                                Rs. {Number(u.balance || 0).toLocaleString()}
                              </td>
                              <td className="p-4 text-right whitespace-nowrap font-semibold text-slate-800">
                                Rs. {stats.totalInvestment.toLocaleString()}
                              </td>
                              <td className="p-4 text-right whitespace-nowrap font-semibold text-sky-600">
                                Rs. {stats.totalEarnings.toLocaleString()}
                              </td>
                              <td className="p-4 text-right whitespace-nowrap font-medium text-amber-600">
                                Rs. {stats.todayEarnings.toLocaleString()}
                              </td>
                              <td className="p-4 text-center whitespace-nowrap">
                                <span className="font-bold text-emerald-600">{stats.activeTeamCount}</span>
                                <span className="text-slate-400"> / {stats.teamCount}</span>
                              </td>
                              <td className="p-4 whitespace-nowrap">
                                <div className="flex flex-col gap-1 items-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase text-center w-full inline-block ${u.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {u.role}
                                  </span>
                                  {stats.userPls.some((up: any) => up.status === 'active' || up.status === 'completed') ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase text-center w-full inline-block bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                      Active Plan
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase text-center w-full inline-block bg-slate-100 text-slate-500 border border-slate-200">
                                      Free Account
                                    </span>
                                  )}
                                  {(u.status === 'banned' || u.is_banned === true) && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase text-center w-full inline-block bg-red-100 text-red-700">
                                      Banned
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-4 whitespace-nowrap text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => {
                                      setGiftingUser(u);
                                      setSelectedGiftPlanId(plans[0]?.id || 1);
                                    }}
                                    title="Gift / Activate Plan for this User"
                                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-300 transition flex items-center gap-1"
                                  >
                                    <Zap className="w-3.5 h-3.5 text-amber-600" /> Gift Plan
                                  </button>
                                  <button
                                    onClick={() => setSelectedUser(u)}
                                    title="View Details"
                                    className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  {(u.status === 'banned' || u.is_banned === true) ? (
                                    <button
                                      onClick={() => handleUnbanUser(u.id)}
                                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition"
                                    >
                                      Unban
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleBanUser(u.id)}
                                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200 transition"
                                    >
                                      Ban
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleUpdateUserRole(u.id, u.role, u.email)}
                                    disabled={u.email === 'saqib242saqib@gmail.com'}
                                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                                      u.email === 'saqib242saqib@gmail.com' 
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                        : u.role === 'admin'
                                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                        : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                    }`}
                                  >
                                    {u.role === 'admin' ? 'Demote' : 'Promote'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Detailed User Modal Overlay */}
              {selectedUser && (() => {
                const sStats = getUserStats(selectedUser);
                return (
                  <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                      {/* Modal Header */}
                      <div className="p-4 sm:p-6 border-b border-slate-800 flex flex-col sm:flex-row justify-between sm:items-center bg-slate-950/50 gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                              User File ({selectedUser.role})
                            </span>
                            {sStats.userPls.some((up: any) => up.status === 'active' || up.status === 'completed') ? (
                              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                                Active Plan
                              </span>
                            ) : (
                              <span className="bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                                Free Account
                              </span>
                            )}
                            {(selectedUser.status === 'banned' || selectedUser.is_banned === true) && (
                              <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                                Banned
                              </span>
                            )}
                          </div>
                          <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight mt-2 text-slate-100">
                            {selectedUser.username}
                          </h3>
                          <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 font-mono">ID: {selectedUser.id}</p>
                        </div>
                        <button
                          onClick={() => setSelectedUser(null)}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white p-2 rounded-xl transition-all self-end sm:self-auto shrink-0 hidden sm:block"
                        >
                          <X className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setSelectedUser(null)}
                          className="absolute top-4 right-4 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white p-2 rounded-xl transition-all sm:hidden"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Modal Content - Scrollable */}
                      <div className="p-4 sm:p-6 overflow-y-auto space-y-6 scrollbar-hide">
                        {/* Quick Stats Grid */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                          <div className="bg-slate-950/60 p-3 sm:p-4 rounded-2xl border border-slate-800">
                            <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Current Balance</p>
                            <h4 className="text-lg sm:text-xl font-black text-emerald-400">Rs. {Number(selectedUser.balance || 0).toLocaleString()}</h4>
                          </div>
                          <div className="bg-slate-950/60 p-3 sm:p-4 rounded-2xl border border-slate-800">
                            <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Total Investment</p>
                            <h4 className="text-lg sm:text-xl font-black text-slate-100">Rs. {sStats.totalInvestment.toLocaleString()}</h4>
                          </div>
                          <div className="bg-slate-950/60 p-3 sm:p-4 rounded-2xl border border-slate-800">
                            <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Total Earnings</p>
                            <h4 className="text-lg sm:text-xl font-black text-sky-400">Rs. {sStats.totalEarnings.toLocaleString()}</h4>
                          </div>
                          <div className="bg-slate-950/60 p-3 sm:p-4 rounded-2xl border border-slate-800">
                            <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Today's Earnings</p>
                            <h4 className="text-lg sm:text-xl font-black text-amber-400">Rs. {sStats.todayEarnings.toLocaleString()}</h4>
                          </div>
                        </div>

                        {/* Bento Breakdown: Profile vs Earning Distribution */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Profile details */}
                          <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-800/80 space-y-3.5">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/60 pb-1.5 flex items-center gap-1.5">
                              <Users className="w-4 h-4 text-emerald-400" /> Account Profile Details
                            </h4>
                            <div className="space-y-2 text-xs">
                              <div className="flex justify-between py-1 border-b border-slate-900">
                                <span className="text-slate-400">Email:</span>
                                <span className="font-semibold text-slate-200">{selectedUser.email}</span>
                              </div>
                              <div className="flex justify-between py-1 border-b border-slate-900">
                                <span className="text-slate-400">Phone/Mobile:</span>
                                <span className="font-semibold text-slate-200">{selectedUser.phone || 'Not provided'}</span>
                              </div>
                              <div className="flex justify-between py-1 border-b border-slate-900">
                                <span className="text-slate-400">Referral Code:</span>
                                <span className="font-mono font-bold text-sky-400">{selectedUser.referral_code}</span>
                              </div>
                              <div className="flex justify-between py-1 border-b border-slate-900">
                                <span className="text-slate-400">Referred By:</span>
                                <span className="font-mono text-slate-300">{selectedUser.referred_by || 'Direct Sign-up'}</span>
                              </div>
                              <div className="flex justify-between py-1 border-b border-slate-900">
                                <span className="text-slate-400">Device ID:</span>
                                <span className="font-mono text-xs text-slate-300">{selectedUser.device_id || 'Unknown'}</span>
                              </div>
                              <div className="flex justify-between py-1 border-b border-slate-900">
                                <span className="text-slate-400">Device IP:</span>
                                <span className="font-mono text-xs text-slate-300">{selectedUser.last_ip || 'Unknown'}</span>
                              </div>
                              <div className="flex justify-between py-1">
                                <span className="text-slate-400">Location:</span>
                                <span className="font-mono text-xs text-slate-300">{selectedUser.city ? `${selectedUser.city}, ${selectedUser.country}` : 'Unknown'}</span>
                              </div>
                              <div className="flex justify-between py-1">
                                <span className="text-slate-400">Joined Date:</span>
                                <span className="font-semibold text-slate-200">{new Date(selectedUser.created_at).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>

                          {/* Earnings Breakdown */}
                          <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-800/80 space-y-3.5">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/60 pb-1.5 flex items-center gap-1.5">
                              <TrendingUp className="w-4 h-4 text-sky-400" /> Earnings Stream Breakdown
                            </h4>
                            <div className="space-y-2 text-xs">
                              <div className="flex justify-between py-1 border-b border-slate-900">
                                <span className="text-slate-400 flex items-center gap-1">Daily Reward Earnings:</span>
                                <span className="font-bold text-slate-200">Rs. {sStats.dailyCollected.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between py-1 border-b border-slate-900">
                                <span className="text-slate-400 flex items-center gap-1">Referral Rewards (Bonuses):</span>
                                <span className="font-bold text-sky-400">Rs. {sStats.referralCollected.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between py-1 border-b border-slate-900">
                                <span className="text-slate-400 flex items-center gap-1">Weekly Salary Payouts:</span>
                                <span className="font-bold text-emerald-400">Rs. {sStats.salaryCollected.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between py-1 font-bold text-slate-100">
                                <span>Aggregated Total:</span>
                                <span className="text-emerald-400 text-sm">Rs. {sStats.totalEarnings.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Active & Purchased Plans List */}
                        <div className="space-y-2.5">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <Package className="w-4 h-4 text-amber-400" /> Purchased Reward Plans ({sStats.userPls.length})
                          </h4>
                          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-950 border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[9px]">
                                  <th className="p-3">Plan Name</th>
                                  <th className="p-3 text-right">Price</th>
                                  <th className="p-3 text-right">Daily Yield</th>
                                  <th className="p-3">Status</th>
                                  <th className="p-3">Activation Date</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-900 text-slate-300">
                                {sStats.userPls.length === 0 ? (
                                  <tr>
                                    <td colSpan={5} className="p-4 text-center text-slate-600 font-medium italic">No active or purchased plans found.</td>
                                  </tr>
                                ) : (
                                  sStats.userPls.map((up: any) => (
                                    <tr key={up.id} className="hover:bg-slate-900/40">
                                      <td className="p-3 font-bold text-amber-400">Plan {up.plans?.name || up.plans?.plan_number || 'N/A'}</td>
                                      <td className="p-3 text-right">Rs. {up.plans?.plan_price || 0}</td>
                                      <td className="p-3 text-right text-emerald-400 font-semibold">Rs. {up.plans?.daily_reward || 0}/day</td>
                                      <td className="p-3">
                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${up.status === 'completed' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                                          {up.status}
                                        </span>
                                      </td>
                                      <td className="p-3 text-slate-400">{new Date(up.created_at).toLocaleDateString()}</td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Referral Team Downline Details */}
                        <div className="space-y-2.5">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-indigo-400" /> Referred Team Members ({sStats.team.length})
                          </h4>
                          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-950 border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[9px]">
                                  <th className="p-3">Referred Username</th>
                                  <th className="p-3">Email Address</th>
                                  <th className="p-3">Joined Date</th>
                                  <th className="p-3 text-right">Account Balance</th>
                                  <th className="p-3 text-center">Plan Active</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-900 text-slate-300">
                                {sStats.team.length === 0 ? (
                                  <tr>
                                    <td colSpan={5} className="p-4 text-center text-slate-600 font-medium italic">No direct referrals yet.</td>
                                  </tr>
                                ) : (
                                  sStats.team.map((member: any) => {
                                    const hasActivePlan = userPlans.some(up => up.user_id === member.id && (up.status === 'active' || up.status === 'completed'));
                                    return (
                                      <tr key={member.id} className="hover:bg-slate-900/40">
                                        <td className="p-3 font-semibold text-slate-200">{member.username}</td>
                                        <td className="p-3 text-slate-400">{member.email}</td>
                                        <td className="p-3 text-slate-400">{new Date(member.created_at).toLocaleDateString()}</td>
                                        <td className="p-3 text-right text-emerald-400 font-bold">Rs. {Number(member.balance || 0).toLocaleString()}</td>
                                        <td className="p-3 text-center">
                                          {hasActivePlan ? (
                                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">Active</span>
                                          ) : (
                                            <span className="bg-slate-800 text-slate-500 border border-slate-700/40 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">Free</span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Approved Plan Deposits History */}
                        <div className="space-y-2.5">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <Award className="w-4 h-4 text-pink-400" /> Investment Deposit Logs ({sStats.userDeps.length})
                          </h4>
                          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-950 border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[9px]">
                                  <th className="p-3">Reference / Method</th>
                                  <th className="p-3">Account details</th>
                                  <th className="p-3 text-right">Deposited Price</th>
                                  <th className="p-3">Deposit Date</th>
                                  <th className="p-3">Deposit Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-900 text-slate-300">
                                {sStats.userDeps.length === 0 ? (
                                  <tr>
                                    <td colSpan={5} className="p-4 text-center text-slate-600 font-medium italic">No approved plan deposits found.</td>
                                  </tr>
                                ) : (
                                  sStats.userDeps.map((d: any) => (
                                    <tr key={d.id} className="hover:bg-slate-900/40">
                                      <td className="p-3 font-semibold text-slate-200">
                                        {d.plans?.name || d.plans?.plan_number ? `Plan ${d.plans?.name || d.plans?.plan_number}` : 'Deposit'}
                                      </td>
                                      <td className="p-3">
                                        <div className="text-slate-300">{d.user_account_name}</div>
                                        <div className="text-[10px] text-slate-500 font-mono">{d.user_account_number}</div>
                                      </td>
                                      <td className="p-3 text-right font-bold text-slate-100">Rs. {d.plans?.plan_price || d.plan_price || 0}</td>
                                      <td className="p-3 text-slate-400">{new Date(d.created_at).toLocaleString()}</td>
                                      <td className="p-3">
                                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                                          Approved
                                        </span>
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                      {/* Modal Footer */}
                      <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex justify-between items-center">
                        <button
                          type="button"
                          onClick={() => {
                            setGiftingUser(selectedUser);
                            setSelectedGiftPlanId(plans[0]?.id || 1);
                          }}
                          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2 px-4 rounded-xl transition shadow-sm text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <Zap className="w-4 h-4" /> Gift / Activate Plan
                        </button>
                        <button
                          onClick={() => setSelectedUser(null)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-5 rounded-xl transition shadow-sm text-xs"
                        >
                          Close Account File
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Admin Direct Gift Plan Modal */}
              {giftingUser && (
                <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 flex flex-col animate-in fade-in zoom-in-95 duration-200">
                    {/* Modal Header */}
                    <div className="p-5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center font-black shadow-md">
                          <Zap className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-black text-base text-slate-950">
                            Gift / Activate Plan for User
                          </h3>
                          <p className="text-xs font-semibold text-slate-900/80">
                            User: <span className="underline">{giftingUser.username}</span> ({giftingUser.email})
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setGiftingUser(null);
                          setSelectedGiftPlanId(null);
                        }}
                        className="p-1.5 rounded-xl bg-black/10 hover:bg-black/20 text-slate-950 transition-colors cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Modal Body */}
                    <div className="p-5 sm:p-6 space-y-4">
                      {giftPlanNotice ? (
                        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2.5">
                          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                          <span>{giftPlanNotice}</span>
                        </div>
                      ) : (
                        <>
                          <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                              Select Plan to Gift
                            </label>
                            <select
                              value={selectedGiftPlanId || plans[0]?.id || ''}
                              onChange={(e) => setSelectedGiftPlanId(Number(e.target.value))}
                              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-500"
                            >
                              {plans.map((p, idx) => {
                                const m = mergePlanWithMeta(p, idx, currentPlansMetaMap, currentRefBonusRate, currentBaseMemberPrice);
                                return (
                                  <option key={m.id || p.id} value={p.id}>
                                    Plan #{m.plan_number}: {m.name} — Price: Rs {m.plan_price.toLocaleString()} | Daily: Rs {m.daily_reward}/day ({m.total_days} Days)
                                  </option>
                                );
                              })}
                            </select>
                          </div>

                          {/* Selected Plan Details Card */}
                          {(() => {
                            const targetId = selectedGiftPlanId || plans[0]?.id;
                            const selectedPlanObj = plans.find(p => p.id === targetId) || plans[0];
                            if (!selectedPlanObj) return null;
                            const idx = plans.indexOf(selectedPlanObj);
                            const m = mergePlanWithMeta(selectedPlanObj, idx, currentPlansMetaMap, currentRefBonusRate, currentBaseMemberPrice);
                            return (
                              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                                <div className="flex justify-between items-center font-bold">
                                  <span className="text-slate-600">Plan Value:</span>
                                  <span className="text-slate-900 font-mono">Rs {m.plan_price.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center font-bold">
                                  <span className="text-slate-600">Daily Return:</span>
                                  <span className="text-emerald-700 font-mono">Rs {m.daily_reward.toLocaleString()} / day</span>
                                </div>
                                <div className="flex justify-between items-center font-bold">
                                  <span className="text-slate-600">Total Duration:</span>
                                  <span className="text-slate-900 font-mono">{m.total_days} Days (Day 1 Unlocked Instantly)</span>
                                </div>
                                <div className="flex justify-between items-center font-bold">
                                  <span className="text-slate-600">Required Referrals:</span>
                                  <span className="text-indigo-700 font-mono">{m.members_required} Active Members</span>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Referral Bonus Checkbox */}
                          {giftingUser.referred_by && (
                            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={giftCreditReferral}
                                onChange={(e) => setGiftCreditReferral(e.target.checked)}
                                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                              />
                              <span className="text-xs text-indigo-950 font-medium">
                                Inviter (<span className="font-mono font-bold">{giftingUser.referred_by}</span>) ko flat Rs {currentRefBonusRate} referral bonus credit karein
                              </span>
                            </label>
                          )}

                          <div className="pt-2 flex items-center justify-end gap-2.5">
                            <button
                              type="button"
                              onClick={() => {
                                setGiftingUser(null);
                                setSelectedGiftPlanId(null);
                              }}
                              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={isGiftingPlan}
                              onClick={handleGiftPlanToUser}
                              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs sm:text-sm shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                            >
                              {isGiftingPlan ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                                  <span>Activating Plan...</span>
                                </>
                              ) : (
                                <>
                                  <Zap className="w-4 h-4" />
                                  <span>Gift &amp; Activate Plan Now</span>
                                </>
                              )}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
              </div>
            );
          })()}

          {activeTab === 'plans' && (() => {
            const enrichedPlans = plans.map((p, idx) =>
              mergePlanWithMeta(p, idx, currentPlansMetaMap, currentRefBonusRate, currentBaseMemberPrice)
            );
            const activePlansList = enrichedPlans.filter(p => p.is_active);
            const unprofitablePlans = enrichedPlans.filter(p => !p.validation.isProfitable);
            const mismatchPlans = enrichedPlans.filter(p => p.validation.hasFormulaMismatch);
            const avgProfitMargin = enrichedPlans.length > 0
              ? enrichedPlans.reduce((sum, p) => sum + p.economics.profitMarginPercent, 0) / enrichedPlans.length
              : 0;
            const totalCycleProfitSum = enrichedPlans.reduce((sum, p) => sum + p.economics.platformProfit, 0);

            const activeEditValidation = editingPlan
              ? validatePlanEconomics(
                  {
                    plan_price: Number(editingPlan.plan_price),
                    daily_reward: Number(editingPlan.daily_reward),
                    total_days: Number(editingPlan.total_days) || 30,
                    members_required: Number(editingPlan.members_required),
                    thirty_day_reward: Number(editingPlan.thirty_day_reward),
                    user_total_reward: Number(editingPlan.user_total_reward),
                  },
                  currentRefBonusRate,
                  currentBaseMemberPrice
                )
              : null;

            return (
              <div className="space-y-6">
                {/* Top Platform Economics Health & Action Bar */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                        Plans Customization & Economic Control
                      </h2>
                      {unprofitablePlans.length === 0 && mismatchPlans.length === 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md">
                          <CheckCircle className="w-3.5 h-3.5" /> All {enrichedPlans.length} Plans Verified & Profitable
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-md">
                          <AlertTriangle className="w-3.5 h-3.5" /> {unprofitablePlans.length + mismatchPlans.length} Plan(s) Need Calculation Review
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      Formula Engine: <span className="font-mono">Rev_A = Price + (Members × Rs {currentBaseMemberPrice})</span> · <span className="font-mono">Total_B = (Daily × Days) + (Members × Rs {currentRefBonusRate})</span> · <span className="font-mono">Profit = Rev_A - Total_B</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowProfitSimulator(!showProfitSimulator)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-colors whitespace-nowrap ${
                        showProfitSimulator
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Calculator className="w-4 h-4" />
                      {showProfitSimulator ? 'Hide Profit Matrix' : 'Profit Simulator & Matrix'}
                    </button>

                    <button
                      type="button"
                      onClick={handleResetDefaultPlans}
                      disabled={savingPlan}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 flex items-center gap-1.5 transition-colors whitespace-nowrap"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${savingPlan ? 'animate-spin' : ''}`} />
                      Sync Official 10 Plans
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenCreatePlan}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm transition-colors whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4" /> Create New Plan
                    </button>
                  </div>
                </div>

                {/* Summary KPI Strip */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-white p-4 rounded-xl border border-slate-200">
                    <p className="text-xs text-slate-500 font-medium">Active / Total Plans</p>
                    <p className="text-xl font-bold text-slate-900 font-mono tabular-nums mt-1">
                      {activePlansList.length} / {enrichedPlans.length}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200">
                    <p className="text-xs text-slate-500 font-medium">Referral Bonus Rate</p>
                    <p className="text-xl font-bold text-emerald-700 font-mono tabular-nums mt-1">
                      Rs {currentRefBonusRate} <span className="text-xs font-normal text-slate-400">/ member</span>
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200">
                    <p className="text-xs text-slate-500 font-medium">Avg Platform Profit Margin</p>
                    <p className={`text-xl font-bold font-mono tabular-nums mt-1 ${avgProfitMargin >= 20 ? 'text-emerald-700' : 'text-amber-600'}`}>
                      {avgProfitMargin.toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200">
                    <p className="text-xs text-slate-500 font-medium">Combined 1-Cycle Net Profit</p>
                    <p className={`text-xl font-bold font-mono tabular-nums mt-1 ${totalCycleProfitSum > 0 ? 'text-indigo-700' : 'text-rose-600'}`}>
                      Rs {totalCycleProfitSum.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Live Platform Profit Simulator & Full Economic Matrix */}
                {showProfitSimulator && (
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="p-5 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-base font-bold flex items-center gap-2">
                          <Calculator className="w-5 h-5 text-emerald-400" />
                          Live Platform Economics Simulator & Plan Matrix
                        </h3>
                        <p className="text-xs text-slate-300 mt-0.5">
                          Test how changing Referral Bonus or Base Member Purchase affects every plan's profitability before saving.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
                          <label className="block text-[10px] text-slate-400 uppercase font-semibold">Sim Referral Bonus (PKR)</label>
                          <input
                            type="number"
                            min={0}
                            value={simReferralBonus}
                            onChange={(e) => setSimReferralBonus(Math.max(0, Number(e.target.value)))}
                            className="w-24 bg-transparent text-white font-mono font-bold text-sm focus:outline-none tabular-nums"
                          />
                        </div>
                        <div className="bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
                          <label className="block text-[10px] text-slate-400 uppercase font-semibold">Base Member Plan (PKR)</label>
                          <input
                            type="number"
                            min={50}
                            value={simBaseMemberPrice}
                            onChange={(e) => setSimBaseMemberPrice(Math.max(50, Number(e.target.value)))}
                            className="w-24 bg-transparent text-white font-mono font-bold text-sm focus:outline-none tabular-nums"
                          />
                        </div>
                        {(simReferralBonus !== currentRefBonusRate || simBaseMemberPrice !== currentBaseMemberPrice) && (
                          <button
                            type="button"
                            onClick={async () => {
                              const nextSettings = {
                                ...appSettings,
                                referral_bonus: String(simReferralBonus),
                                base_member_plan_price: String(simBaseMemberPrice),
                              };
                              setAppSettings(nextSettings);
                              await supabase.from('app_settings').upsert([
                                { setting_key: 'referral_bonus', setting_value: String(simReferralBonus) },
                                { setting_key: 'base_member_plan_price', setting_value: String(simBaseMemberPrice) },
                              ], { onConflict: 'setting_key' });
                              await broadcastChange('app_settings', 'update', { appSettings: nextSettings });
                              alert(`Saved Referral Bonus = Rs ${simReferralBonus} & Base Member Price = Rs ${simBaseMemberPrice}!`);
                            }}
                            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors whitespace-nowrap"
                          >
                            Apply to Live Settings
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                            <th className="p-3">Plan</th>
                            <th className="p-3 text-right">Price (P)</th>
                            <th className="p-3 text-right">Daily (D)</th>
                            <th className="p-3 text-right">Duration Reward</th>
                            <th className="p-3 text-right">Members (M)</th>
                            <th className="p-3 text-right">Members Rev</th>
                            <th className="p-3 text-right">Platform Rev (A)</th>
                            <th className="p-3 text-right">Ref Bonus</th>
                            <th className="p-3 text-right">User Total (B)</th>
                            <th className="p-3 text-right">Net Profit (A - B)</th>
                            <th className="p-3">Diagnosis</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                          {enrichedPlans.map((pl) => {
                            const simVal = validatePlanEconomics(
                              {
                                plan_price: pl.investAmount,
                                daily_reward: pl.dailyReturn,
                                total_days: pl.totalDays,
                                members_required: pl.requiredReferrals,
                                thirty_day_reward: pl.dailyReturn * pl.totalDays,
                                user_total_reward: pl.dailyReturn * pl.totalDays + pl.requiredReferrals * simReferralBonus,
                              },
                              simReferralBonus,
                              simBaseMemberPrice
                            );
                            const c = simVal.calc;
                            return (
                              <tr key={pl.id} className="hover:bg-slate-50/80">
                                <td className="p-3 font-sans font-bold text-slate-800 whitespace-nowrap">
                                  #{pl.plan_number} · {pl.name}
                                  {!pl.is_active && <span className="ml-1.5 text-[10px] text-slate-400 font-normal">(Hidden)</span>}
                                </td>
                                <td className="p-3 text-right text-slate-800">Rs {c.P.toLocaleString()}</td>
                                <td className="p-3 text-right text-emerald-700 font-bold">Rs {c.D.toLocaleString()}</td>
                                <td className="p-3 text-right text-slate-700">Rs {c.expectedDurationReward.toLocaleString()} ({c.days}d)</td>
                                <td className="p-3 text-right text-slate-800 font-bold">{c.M}</td>
                                <td className="p-3 text-right text-slate-600">Rs {c.membersRevenue.toLocaleString()}</td>
                                <td className="p-3 text-right font-bold text-slate-900">Rs {c.platformRevenue.toLocaleString()}</td>
                                <td className="p-3 text-right text-indigo-600">Rs {c.referralBonusTotal.toLocaleString()}</td>
                                <td className="p-3 text-right font-bold text-indigo-700">Rs {c.expectedUserTotalReward.toLocaleString()}</td>
                                <td className={`p-3 text-right font-bold ${c.platformProfit > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                                  {c.platformProfit >= 0 ? `+Rs ${c.platformProfit.toLocaleString()}` : `-Rs ${Math.abs(c.platformProfit).toLocaleString()}`}
                                  <span className="block text-[10px] font-normal text-slate-400">
                                    ({c.profitMarginPercent.toFixed(1)}% margin)
                                  </span>
                                </td>
                                <td className="p-3 font-sans">
                                  {c.platformProfit <= 0 ? (
                                    <span className="text-rose-600 font-semibold text-[11px]">
                                      Loss (Need ≥ {simVal.recommendedFixes.find(f => f.patch.members_required)?.patch.members_required || c.M + 1} members)
                                    </span>
                                  ) : c.profitMarginPercent < 15 ? (
                                    <span className="text-amber-600 font-semibold text-[11px]">Low Margin</span>
                                  ) : (
                                    <span className="text-emerald-700 font-semibold text-[11px]">Healthy Profit</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Smart Plan Builder & Live Economic Validator Modal/Card */}
                {editingPlan ? (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold">
                          {isCreatingPlan ? `Create New Plan (#${editingPlan.plan_number})` : `Customize Plan #${editingPlan.plan_number} — ${editingPlan.name}`}
                        </h3>
                        <p className="text-xs text-slate-300">
                          Every field is audited live against Task Earn Hub economics so you never create an unprofitable plan.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPlan(null);
                          setIsCreatingPlan(false);
                          setPlanSaveError(null);
                        }}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form onSubmit={handleUpdatePlan} className="p-6">
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Left Column: Plan Customization Inputs (7 cols) */}
                        <div className="lg:col-span-7 space-y-5">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">Plan Number (#)</label>
                              <input
                                type="number"
                                min={1}
                                required
                                disabled={!isCreatingPlan}
                                value={editingPlan.plan_number}
                                onChange={(e) => handlePlanFieldChange({ plan_number: Math.max(1, Number(e.target.value)) })}
                                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-slate-900 disabled:bg-slate-100 disabled:text-slate-500 tabular-nums"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-xs font-bold text-slate-700 mb-1">Custom Plan Name</label>
                              <input
                                type="text"
                                required
                                placeholder="e.g. Mini Plan, Gold Plan, Royal VIP"
                                value={editingPlan.name || ''}
                                onChange={(e) => handlePlanFieldChange({ name: e.target.value }, true)}
                                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                              />
                            </div>
                          </div>

                          {/* Icon, Color Theme & Visibility Row */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">Card Icon</label>
                              <select
                                value={editingPlan.icon || 'flame'}
                                onChange={(e) => handlePlanFieldChange({ icon: e.target.value }, true)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800"
                              >
                                {PLAN_ICONS.map(ic => (
                                  <option key={ic.key} value={ic.key}>{ic.label}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">Card Color Theme</label>
                              <select
                                value={editingPlan.themeKey || 'purple'}
                                onChange={(e) => handlePlanFieldChange({ themeKey: e.target.value }, true)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800"
                              >
                                {PLAN_THEMES.map(th => (
                                  <option key={th.key} value={th.key}>{th.label}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">Store Visibility</label>
                              <button
                                type="button"
                                onClick={() => handlePlanFieldChange({ is_active: !editingPlan.is_active }, true)}
                                className={`w-full px-3 py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-colors ${
                                  editingPlan.is_active !== false
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-slate-200 text-slate-700 border-slate-300'
                                }`}
                              >
                                {editingPlan.is_active !== false ? (
                                  <><Eye className="w-3.5 h-3.5" /> Visible to Users</>
                                ) : (
                                  <><EyeOff className="w-3.5 h-3.5" /> Hidden from Store</>
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Marketing Badge Tag & Presets */}
                          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 p-3.5 rounded-xl space-y-2">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                              <label className="block text-xs font-bold text-amber-900">
                                Marketing Badge Tag (Optional)
                              </label>
                              <span className="text-[11px] text-amber-700">
                                Card ke top par glowing pill badge display hoga
                              </span>
                            </div>
                            <input
                              type="text"
                              placeholder="e.g. 🔥 HOT, ⭐ MOST POPULAR, 👑 VIP, ⚡ BEST VALUE"
                              value={editingPlan.badge_tag || ''}
                              onChange={(e) => handlePlanFieldChange({ badge_tag: e.target.value }, true)}
                              className="w-full bg-white border border-amber-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500"
                            />
                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              <span className="text-[10px] text-slate-500 font-semibold">1-Click Presets:</span>
                              {['🔥 HOT', '⭐ MOST POPULAR', '👑 VIP', '⚡ BEST VALUE', '⏳ FLASH OFFER', 'Clear'].map((b) => (
                                <button
                                  key={b}
                                  type="button"
                                  onClick={() => handlePlanFieldChange({ badge_tag: b === 'Clear' ? '' : b }, true)}
                                  className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white hover:bg-amber-100 text-slate-700 border border-amber-200 transition-colors cursor-pointer"
                                >
                                  {b}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Core Economic Variables */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                Plan Price (P) — PKR
                              </label>
                              <input
                                type="number"
                                min={1}
                                required
                                value={editingPlan.plan_price}
                                onChange={(e) => handlePlanFieldChange({ plan_price: Number(e.target.value) })}
                                className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 tabular-nums"
                              />
                              <p className="text-[11px] text-slate-400 mt-1">Amount user deposits to activate this plan.</p>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                Daily Reward (D) — PKR
                              </label>
                              <input
                                type="number"
                                min={1}
                                required
                                value={editingPlan.daily_reward}
                                onChange={(e) => handlePlanFieldChange({ daily_reward: Number(e.target.value) })}
                                className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500 tabular-nums"
                              />
                              <p className="text-[11px] text-slate-400 mt-1">Fixed daily earning user collects every 24h.</p>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                Plan Duration (Days)
                              </label>
                              <input
                                type="number"
                                min={1}
                                max={365}
                                required
                                value={editingPlan.total_days || 30}
                                onChange={(e) => handlePlanFieldChange({ total_days: Math.max(1, Number(e.target.value)) })}
                                className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 tabular-nums"
                              />
                              <p className="text-[11px] text-slate-400 mt-1">Default is 30 days. Total daily claims allowed.</p>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                Required Active Members (M)
                              </label>
                              <input
                                type="number"
                                min={0}
                                required
                                value={editingPlan.members_required}
                                onChange={(e) => handlePlanFieldChange({ members_required: Math.max(0, Math.floor(Number(e.target.value))) })}
                                className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-indigo-700 focus:ring-2 focus:ring-emerald-500 tabular-nums"
                              />
                              <p className="text-[11px] text-slate-400 mt-1">
                                Active invites required after {appSettings.free_reward_days ?? 1} free day(s).
                              </p>
                            </div>
                          </div>

                          {/* Auto-Calculation vs Manual Override Section */}
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <span className="text-xs font-bold text-slate-800 block">
                                  Formula Auto-Calculation Mode
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  Automatically syncs Duration Reward & Total Reward with the formula. Turn off to test manual overrides.
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const nextAuto = !autoCalculatePlanFields;
                                  setAutoCalculatePlanFields(nextAuto);
                                  if (nextAuto && activeEditValidation) {
                                    setEditingPlan({
                                      ...editingPlan,
                                      thirty_day_reward: activeEditValidation.calc.expectedDurationReward,
                                      user_total_reward: activeEditValidation.calc.expectedUserTotalReward,
                                    });
                                  }
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                                  autoCalculatePlanFields
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                                }`}
                              >
                                {autoCalculatePlanFields ? 'Auto-Sync: ON' : 'Manual Override: ON'}
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200/70">
                              <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                  {editingPlan.total_days || 30}-Day Reward (D × {editingPlan.total_days || 30})
                                </label>
                                <input
                                  type="number"
                                  disabled={autoCalculatePlanFields}
                                  value={editingPlan.thirty_day_reward}
                                  onChange={(e) => handlePlanFieldChange({ thirty_day_reward: Number(e.target.value) }, true)}
                                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono font-bold text-slate-800 disabled:bg-slate-100 disabled:text-slate-600 tabular-nums"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                  User Total Reward (B = R30 + RefBonus)
                                </label>
                                <input
                                  type="number"
                                  disabled={autoCalculatePlanFields}
                                  value={editingPlan.user_total_reward}
                                  onChange={(e) => handlePlanFieldChange({ user_total_reward: Number(e.target.value) }, true)}
                                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono font-bold text-indigo-700 disabled:bg-slate-100 disabled:text-indigo-700 tabular-nums"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Right Column: Live Economic & Profit Diagnostic Console (5 cols) */}
                        {activeEditValidation && (
                          <div className="lg:col-span-5 flex flex-col justify-between bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 space-y-4">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                <div>
                                  <h4 className="text-sm font-bold text-white">Live Economic Audit</h4>
                                  <p className="text-[11px] text-slate-400">Real-time profit & formula verification</p>
                                </div>
                                <span
                                  className={`px-2.5 py-1 rounded-md text-xs font-bold font-mono tabular-nums ${
                                    activeEditValidation.calc.platformProfit > 0
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  }`}
                                >
                                  {activeEditValidation.calc.platformProfit > 0
                                    ? `PROFIT +Rs ${activeEditValidation.calc.platformProfit.toLocaleString()}`
                                    : `LOSS -Rs ${Math.abs(activeEditValidation.calc.platformProfit).toLocaleString()}`}
                                </span>
                              </div>

                              {/* Step-by-Step Math Breakdown */}
                              <div className="space-y-2 text-xs font-mono tabular-nums">
                                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/70 space-y-1.5">
                                  <p className="text-[10px] font-sans font-bold uppercase tracking-wider text-emerald-400">
                                    1. Platform Revenue (Inflow A)
                                  </p>
                                  <div className="flex justify-between text-slate-300">
                                    <span>Plan Price (P):</span>
                                    <span>Rs {activeEditValidation.calc.P.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between text-slate-300">
                                    <span>Members Rev ({activeEditValidation.calc.M} × Rs {activeEditValidation.calc.baseMemberPrice}):</span>
                                    <span>+ Rs {activeEditValidation.calc.membersRevenue.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between font-bold text-white pt-1 border-t border-slate-700">
                                    <span>Total Platform Revenue (A):</span>
                                    <span className="text-emerald-400">Rs {activeEditValidation.calc.platformRevenue.toLocaleString()}</span>
                                  </div>
                                </div>

                                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/70 space-y-1.5">
                                  <p className="text-[10px] font-sans font-bold uppercase tracking-wider text-indigo-400">
                                    2. User Total Payout (Outflow B)
                                  </p>
                                  <div className="flex justify-between text-slate-300">
                                    <span>{activeEditValidation.calc.days}-Day Reward (Rs {activeEditValidation.calc.D} × {activeEditValidation.calc.days}):</span>
                                    <span>Rs {activeEditValidation.calc.actualDurationReward.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between text-slate-300">
                                    <span>Referral Bonus ({activeEditValidation.calc.M} × Rs {activeEditValidation.calc.referralBonusRate}):</span>
                                    <span>+ Rs {activeEditValidation.calc.referralBonusTotal.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between font-bold text-white pt-1 border-t border-slate-700">
                                    <span>User Total Reward (B):</span>
                                    <span className="text-indigo-300">Rs {activeEditValidation.calc.actualUserTotalReward.toLocaleString()}</span>
                                  </div>
                                </div>

                                <div
                                  className={`p-3.5 rounded-xl border flex items-center justify-between ${
                                    activeEditValidation.calc.platformProfit > 0
                                      ? 'bg-emerald-950/60 border-emerald-500/40'
                                      : 'bg-rose-950/70 border-rose-500/50'
                                  }`}
                                >
                                  <div className="font-sans">
                                    <span className="text-xs font-bold block text-white">Net Platform Profit (A - B)</span>
                                    <span className="text-[11px] text-slate-300">
                                      Margin: {activeEditValidation.calc.profitMarginPercent.toFixed(1)}% · User ROI: {activeEditValidation.calc.userRoiPercent.toFixed(0)}%
                                    </span>
                                  </div>
                                  <span
                                    className={`text-lg font-bold ${
                                      activeEditValidation.calc.platformProfit > 0 ? 'text-emerald-400' : 'text-rose-400'
                                    }`}
                                  >
                                    {activeEditValidation.calc.platformProfit >= 0
                                      ? `Rs ${activeEditValidation.calc.platformProfit.toLocaleString()}`
                                      : `-Rs ${Math.abs(activeEditValidation.calc.platformProfit).toLocaleString()}`}
                                  </span>
                                </div>
                              </div>

                              {/* Diagnostic Reasons & Auto-Fix Actions */}
                              {activeEditValidation.issues.length > 0 ? (
                                <div className="space-y-2.5">
                                  {activeEditValidation.issues.map((issue, idx) => (
                                    <div
                                      key={idx}
                                      className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                                        issue.severity === 'error'
                                          ? 'bg-rose-950/80 border-rose-500/60 text-rose-100'
                                          : 'bg-amber-950/80 border-amber-500/60 text-amber-100'
                                      }`}
                                    >
                                      <div className="flex items-center gap-1.5 font-bold text-white">
                                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                                        <span>{issue.title}</span>
                                      </div>
                                      <p className="text-[11px] leading-relaxed text-slate-200">{issue.reasonUr}</p>
                                      <p className="text-[10px] leading-relaxed text-slate-400">{issue.reasonEn}</p>
                                    </div>
                                  ))}

                                  {activeEditValidation.recommendedFixes.length > 0 && (
                                    <div className="p-3 rounded-xl bg-slate-800/90 border border-slate-700 space-y-2">
                                      <p className="text-[11px] font-bold text-emerald-300">
                                        1-Click Auto-Fix Suggestions (Click to Apply):
                                      </p>
                                      <div className="space-y-1.5">
                                        {activeEditValidation.recommendedFixes.map((fix, fIdx) => (
                                          <button
                                            key={fIdx}
                                            type="button"
                                            onClick={() => {
                                              setPlanSaveError(null);
                                              setEditingPlan({
                                                ...editingPlan,
                                                ...fix.patch,
                                              });
                                            }}
                                            className="w-full text-left px-3 py-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 transition-colors flex flex-col gap-0.5"
                                          >
                                            <span className="text-xs font-bold text-emerald-300">{fix.label}</span>
                                            <span className="text-[10px] text-slate-300 font-mono">{fix.description}</span>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-200 flex items-start gap-2">
                                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                  <div>
                                    <p className="font-bold text-white">Calculation Verified & Profitable</p>
                                    <p className="text-[11px] text-emerald-300/90 mt-0.5">
                                      Yeh plan 100% economic formula ke mutabiq hai aur platform ko har cycle par Rs {activeEditValidation.calc.platformProfit.toLocaleString()} ka net profit deta hai.
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>

                            {planSaveError && (
                              <div className="p-3 rounded-xl bg-rose-600 text-white text-xs font-semibold">
                                {planSaveError}
                              </div>
                            )}

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingPlan(null);
                                  setIsCreatingPlan(false);
                                  setPlanSaveError(null);
                                }}
                                className="px-4 py-2.5 text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={!activeEditValidation.canSave || savingPlan}
                                className="px-5 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:bg-rose-900/60 disabled:text-rose-200 text-white rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
                              >
                                <CheckCircle className="w-4 h-4" />
                                {savingPlan
                                  ? 'Saving Plan...'
                                  : !activeEditValidation.canSave
                                  ? 'Fix Calculation Loss to Save'
                                  : isCreatingPlan
                                  ? 'Create & Publish Plan'
                                  : 'Save Plan Changes'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </form>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {enrichedPlans.map((plan, idx) => {
                      const rawPlan = plans[idx];
                      const c = plan.economics;
                      const v = plan.validation;
                      return (
                        <div
                          key={plan.dbId || plan.id}
                          className={`bg-white p-5 rounded-2xl shadow-sm border flex flex-col justify-between transition-all ${
                            !plan.is_active
                              ? 'border-slate-200 opacity-75 bg-slate-50/60'
                              : !v.isProfitable
                              ? 'border-rose-300'
                              : v.hasFormulaMismatch
                              ? 'border-amber-300'
                              : 'border-slate-200'
                          }`}
                        >
                          <div>
                            <div className="flex justify-between items-start gap-2 mb-4">
                              <div className="flex items-center gap-2.5">
                                <div className="h-10 w-10 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center font-bold text-base font-mono shrink-0 border border-emerald-200">
                                  #{plan.plan_number}
                                </div>
                                <div>
                                  <h4 className="font-bold text-slate-900 text-base leading-tight">{plan.name}</h4>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    {plan.is_active ? 'Visible on Store' : 'Hidden from Store'} · {plan.totalDays} Days
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  title={plan.is_active ? 'Hide Plan from Users' : 'Show Plan to Users'}
                                  onClick={() => handleTogglePlanVisibility(rawPlan, idx)}
                                  className={`p-2 rounded-lg transition-colors ${
                                    plan.is_active
                                      ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                                      : 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                                  }`}
                                >
                                  {plan.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                </button>
                                <button
                                  type="button"
                                  title="Edit Plan & Economics"
                                  onClick={() => handleOpenEditPlan(rawPlan, idx)}
                                  className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  title="Delete or Archive Plan"
                                  onClick={() => handleDeletePlan(rawPlan, idx)}
                                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            <div className="space-y-2 text-xs font-mono tabular-nums border-t border-slate-100 pt-3">
                              <div className="flex justify-between">
                                <span className="font-sans text-slate-500">Plan Price (P):</span>
                                <span className="font-bold text-slate-900">Rs {c.P.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="font-sans text-slate-500">Daily Reward (D):</span>
                                <span className="font-bold text-emerald-700">Rs {c.D.toLocaleString()} / day</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="font-sans text-slate-500">{c.days}-Day Reward:</span>
                                <span className="font-semibold text-slate-800">Rs {c.actualDurationReward.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="font-sans text-slate-500">Members Required (M):</span>
                                <span className="font-bold text-slate-800">{c.M} Active</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="font-sans text-slate-500">Referral Bonus ({c.M} × {c.referralBonusRate}):</span>
                                <span className="font-semibold text-indigo-600">Rs {c.referralBonusTotal.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between pt-1.5 border-t border-slate-100">
                                <span className="font-sans font-semibold text-slate-700">User Total Payout (B):</span>
                                <span className="font-bold text-indigo-700">Rs {c.actualUserTotalReward.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="font-sans font-semibold text-slate-700">Platform Revenue (A):</span>
                                <span className="font-bold text-slate-900">Rs {c.platformRevenue.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-600">Net Platform Profit:</span>
                              <span
                                className={`text-sm font-bold font-mono tabular-nums ${
                                  c.platformProfit > 0 ? 'text-emerald-700' : 'text-rose-600'
                                }`}
                              >
                                {c.platformProfit >= 0
                                  ? `+Rs ${c.platformProfit.toLocaleString()} (${c.profitMarginPercent.toFixed(0)}%)`
                                  : `-Rs ${Math.abs(c.platformProfit).toLocaleString()} (LOSS)`}
                              </span>
                            </div>

                            {v.issues.length > 0 && (
                              <div
                                className={`p-2.5 rounded-xl text-[11px] leading-snug flex items-start justify-between gap-2 ${
                                  !v.isProfitable
                                    ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                                }`}
                              >
                                <span>{v.issues[0].reasonUr}</span>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditPlan(rawPlan, idx)}
                                  className="px-2 py-1 rounded bg-white font-bold text-slate-800 border border-slate-200 shrink-0 hover:bg-slate-50"
                                >
                                  Fix Now
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {activeTab === 'payments' && (
            <div className="space-y-4">
              {editingPayment || isAddingPayment ? (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">{isAddingPayment ? 'Add Payment Method' : 'Edit Payment Method'}</h3>
                    <button onClick={() => { setEditingPayment(null); setIsAddingPayment(false); }} className="text-slate-400 hover:text-slate-600">
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                  <form onSubmit={handleSavePaymentMethod} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Method Name</label>
                        <input
                          type="text"
                          required
                          className="w-full border border-slate-200 rounded-lg p-2"
                          value={editingPayment?.method_name || ''}
                          onChange={(e) => setEditingPayment({...editingPayment, method_name: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Account Name</label>
                        <input
                          type="text"
                          required
                          className="w-full border border-slate-200 rounded-lg p-2"
                          value={editingPayment?.account_name || ''}
                          onChange={(e) => setEditingPayment({...editingPayment, account_name: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Account Number</label>
                        <input
                          type="text"
                          required
                          className="w-full border border-slate-200 rounded-lg p-2"
                          value={editingPayment?.account_number || ''}
                          onChange={(e) => setEditingPayment({...editingPayment, account_number: e.target.value})}
                        />
                      </div>
                      <div className="flex items-center mt-6">
                        <input
                          type="checkbox"
                          id="is_active"
                          className="h-4 w-4 text-emerald-600 rounded border-slate-300"
                          checked={editingPayment?.is_active !== false}
                          onChange={(e) => setEditingPayment({...editingPayment, is_active: e.target.checked})}
                        />
                        <label htmlFor="is_active" className="ml-2 block text-sm text-slate-700">
                          Active
                        </label>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                      <button
                        type="button"
                        onClick={() => { setEditingPayment(null); setIsAddingPayment(false); }}
                        className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" /> Save Method
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <>
                  <div className="flex justify-end">
                    <button
                      onClick={() => { setIsAddingPayment(true); setEditingPayment({ is_active: true }); }}
                      className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Add Payment Method
                    </button>
                  </div>

                  {/* Mobile Payment Method Cards (WhatsApp / TikTok Wallet Style) */}
                  <div className="md:hidden space-y-3">
                    {paymentMethods.length === 0 ? (
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-slate-500 text-sm">
                        No payment methods found.
                      </div>
                    ) : (
                      paymentMethods.map((pm) => (
                        <div key={pm.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                                <CreditCard className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-extrabold text-slate-900 text-sm truncate">{pm.method_name}</p>
                                <p className="text-xs text-slate-500 truncate">{pm.account_name}</p>
                              </div>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${pm.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                              {pm.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase text-slate-400">Account Number</span>
                            <span className="font-mono font-bold text-xs text-slate-900">{pm.account_number}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingPayment(pm)}
                              className="flex-1 py-2 px-3 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" /> Edit Wallet
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePaymentMethod(pm.id)}
                              className="py-2 px-3 rounded-xl bg-rose-50 text-rose-600 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Desktop Payment Methods Table */}
                  <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-sm border-b border-slate-100">
                          <tr>
                            <th className="p-4 font-medium whitespace-nowrap">Method</th>
                            <th className="p-4 font-medium whitespace-nowrap">Account Name</th>
                            <th className="p-4 font-medium whitespace-nowrap">Account Number</th>
                            <th className="p-4 font-medium whitespace-nowrap">Status</th>
                            <th className="p-4 font-medium whitespace-nowrap text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {paymentMethods.map((pm) => (
                            <tr key={pm.id} className="text-sm">
                              <td className="p-4 font-medium text-slate-800 whitespace-nowrap">{pm.method_name}</td>
                              <td className="p-4 text-slate-600 whitespace-nowrap">{pm.account_name}</td>
                              <td className="p-4 text-slate-600 whitespace-nowrap font-mono">{pm.account_number}</td>
                              <td className="p-4 whitespace-nowrap">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${pm.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                  {pm.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td className="p-4 whitespace-nowrap text-right">
                                <button
                                  onClick={() => setEditingPayment(pm)}
                                  className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors mr-2"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeletePaymentMethod(pm.id)}
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                          {paymentMethods.length === 0 && (
                            <tr>
                              <td colSpan={5} className="p-4 text-center text-slate-500">
                                No payment methods found.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
          {activeTab === 'deposits' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-slate-800">Pending Deposit Requests</h2>
              {pendingDeposits.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-sm">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h3 className="text-slate-800 font-bold">All caught up!</h3>
                  <p className="text-slate-500 text-sm mt-1">No pending deposit requests to review.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingDeposits.map((req) => (
                    <div key={req.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <div>
                          <p className="font-bold text-slate-800">{req.profiles?.username}</p>
                          <p className="text-xs text-slate-500">{req.profiles?.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-500 uppercase text-xs">Plan Requested</p>
                          <p className="font-bold text-emerald-600">Plan #{req.plans?.plan_number}</p>
                        </div>
                      </div>
                      
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3 text-sm">
                          <div>
                            <span className="text-slate-500 block text-xs">Payment Method Used:</span>
                            <span className="font-medium">{req.payment_methods?.method_name} ({req.payment_methods?.account_number})</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-xs">Sender Name:</span>
                            <span className="font-medium">{req.user_account_name}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-xs">Sender Account / TXN ID:</span>
                            <span className="font-medium font-mono bg-slate-100 px-2 py-0.5 rounded break-all">{req.user_account_number}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-xs">Amount Due:</span>
                            <span className="font-bold">Rs. {req.plans?.plan_price}</span>
                          </div>
                        </div>
                        
                        <div>
                          <span className="text-slate-500 block text-xs mb-2">Screenshot:</span>
                          <a href={req.screenshot_url} target="_blank" rel="noreferrer" className="block w-full h-36 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 hover:opacity-90 transition-opacity">
                            <img src={req.screenshot_url} alt="Payment Receipt" className="w-full h-full object-cover" />
                          </a>
                        </div>
                      </div>
                      
                      <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row gap-2.5 justify-end bg-slate-50">
                        <button
                          onClick={() => handleRejectDeposit(req.id)}
                          className="w-full sm:w-auto px-4 py-2.5 bg-white text-red-600 border border-red-200 rounded-xl hover:bg-red-50 font-bold transition-colors text-center"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleApproveDeposit(req.id)}
                          className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold flex items-center justify-center gap-2 transition-colors shadow-sm shadow-emerald-600/20"
                        >
                          <CheckCircle className="w-4 h-4" /> Approve & Activate
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'withdrawals' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-slate-800">Pending Withdrawal Requests</h2>
              {pendingWithdrawals.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-sm">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h3 className="text-slate-800 font-bold">All caught up!</h3>
                  <p className="text-slate-500 text-sm mt-1">No pending withdrawal requests to review.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingWithdrawals.map((req) => (
                    <div key={req.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <div>
                          <p className="font-bold text-slate-800">{req.profiles?.username}</p>
                          <p className="text-xs text-slate-500">{req.profiles?.email} • {req.profiles?.phone || 'No phone'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-500 uppercase">Withdrawal Amount</p>
                          <p className="font-bold text-rose-600">Rs. {Number(req.amount).toFixed(2)}</p>
                        </div>
                      </div>
                      
                      <div className="p-4 space-y-3 text-sm">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <div>
                            <span className="text-slate-500 block text-xs font-semibold">User Balance (Post-deduction):</span>
                            <span className="font-bold text-slate-800">PKR {Number(req.profiles?.balance || 0).toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-xs font-semibold">Requested At:</span>
                            <span className="font-medium text-slate-800">{new Date(req.created_at).toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-white p-3 rounded-xl border border-slate-100">
                          <div>
                            <span className="text-slate-500 block text-xs font-semibold">Payment Method:</span>
                            <span className="font-bold text-indigo-600">{req.method}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-xs font-semibold">Account / Mobile Number:</span>
                            <span className="font-bold text-slate-800 font-mono bg-slate-100 px-2 py-0.5 rounded inline-block">{req.account_number}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-xs font-semibold">Account Name:</span>
                            <span className="font-bold text-slate-800">{req.account_name}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row gap-2.5 justify-end bg-slate-50">
                        <button
                          onClick={() => handleRejectWithdrawal(req.id)}
                          className="w-full sm:w-auto px-4 py-2.5 bg-white text-red-600 border border-red-200 rounded-xl hover:bg-red-50 font-bold transition-colors text-sm text-center"
                        >
                          Reject & Refund Amount
                        </button>
                        <button
                          onClick={() => handleApproveWithdrawal(req.id)}
                          className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold flex items-center justify-center gap-2 transition-colors shadow-sm shadow-emerald-600/20 text-sm"
                        >
                          <CheckCircle className="w-4 h-4" /> Approve & Payout
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {activeTab === 'settings' && (
            <div className="space-y-5">
              {/* WhatsApp / TikTok Style Step-by-Step Settings Menu (When settingsStep === 'menu') */}
              {settingsStep === 'menu' ? (
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                  <div className="p-4 sm:p-5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Step-by-Step Settings
                      </span>
                      <h3 className="text-base sm:text-lg font-black mt-1.5">
                        App Settings & Platform Customization
                      </h3>
                      <p className="text-xs text-slate-300 mt-0.5">
                        WhatsApp aur TikTok ki tarah har setting step-by-step kholein aur save karein.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSettingsStep('all');
                        scrollAdminTop();
                      }}
                      className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white border border-white/15 self-start sm:self-center shrink-0 cursor-pointer"
                    >
                      Open All 7 Steps Together
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {[
                      {
                        step: 'branding' as AdminSettingsStep,
                        num: 'Step 1',
                        title: 'Website Identity, Logo & SEO',
                        desc: 'App Name, Tagline, SEO Description, Custom Logo Upload & Icon Presets',
                        status: appSettings.site_name || 'Earning Hub',
                        icon: Globe,
                        color: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/25',
                      },
                      {
                        step: 'theme' as AdminSettingsStep,
                        num: 'Step 2',
                        title: 'Global Theme, Font & Audio Studio',
                        desc: 'Default Visual Theme (6), Google Font Pack (6), RGB Glow & Header Button',
                        status: appSettings.default_theme_mode || 'astro-neu',
                        icon: Palette,
                        color: 'bg-purple-500/15 text-purple-600 border-purple-500/25',
                      },
                      {
                        step: 'landing' as AdminSettingsStep,
                        num: 'Step 3',
                        title: 'Pre-Login Landing Page Studio',
                        desc: 'Landing Page ON/OFF, 8 Section Toggles, Headline, 3-Step Guide & Hero Banner',
                        status: appSettings.show_landing_page !== 'false' ? 'ON (Visible)' : 'OFF (Direct Login)',
                        icon: Sparkles,
                        color: 'bg-indigo-500/15 text-indigo-600 border-indigo-500/25',
                      },
                      {
                        step: 'channels' as AdminSettingsStep,
                        num: 'Step 4',
                        title: 'WhatsApp, Telegram & Welcome Notice',
                        desc: 'Running Marquee Text & Join WhatsApp / Telegram Channel Cards ON/OFF',
                        status: 'Social & Notice',
                        icon: MessageSquare,
                        color: 'bg-teal-500/15 text-teal-600 border-teal-500/25',
                      },
                      {
                        step: 'economics' as AdminSettingsStep,
                        num: 'Step 5',
                        title: 'Withdrawal Fee, Schedule, Referral & Free Days',
                        desc: 'Custom Withdrawal Fee/Schedule Switch (Default OFF), Referral Bonus & Free Reward Days',
                        status: appSettings.withdrawal_rules_enabled === 'true' ? `Rules ON (${appSettings.withdraw_fee_percent || 0}% Fee)` : `Rules OFF (${appSettings.free_reward_days ?? 1}d Free)`,
                        icon: Calculator,
                        color: 'bg-amber-500/15 text-amber-600 border-amber-500/25',
                      },
                      {
                        step: 'salary' as AdminSettingsStep,
                        num: 'Step 6',
                        title: 'Team Salary Milestones (Levels 1–6)',
                        desc: 'Required Active Team Members & Custom Weekly PKR Salary Rewards',
                        status: 'Levels 1–6',
                        icon: Award,
                        color: 'bg-sky-500/15 text-sky-600 border-sky-500/25',
                      },
                      {
                        step: 'security' as AdminSettingsStep,
                        num: 'Step 7',
                        title: 'Security & Device Protection',
                        desc: 'One-Device-One-Account Switch & Superadmin Double-Lock Password',
                        status: appSettings.restrict_multiple_accounts === 'true' ? '1-Device ON' : 'Multi Allowed',
                        icon: Lock,
                        color: 'bg-rose-500/15 text-rose-600 border-rose-500/25',
                      },
                      {
                        step: 'promo' as AdminSettingsStep,
                        num: 'Step 8',
                        title: 'Promo & Gift Codes Voucher Engine',
                        desc: 'Master ON/OFF Switch (Default OFF) • Create Redeem Codes & Max Claims Limit',
                        status: appSettings.promo_feature_enabled === 'true' ? `ON (${parsePromoCodesJson(appSettings.promo_codes_json).length} Codes)` : 'OFF (Default)',
                        icon: Ticket,
                        color: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/25',
                      },
                      {
                        step: 'tasks' as AdminSettingsStep,
                        num: 'Step 9',
                        title: 'Daily Tasks & Link Timer Verification',
                        desc: 'Master ON/OFF Switch (Default OFF) • Require Link & Timer Before Daily Claim',
                        status: appSettings.require_task_before_claim === 'true' ? 'ON (Timer Active)' : 'OFF (1-Click Claim)',
                        icon: ShieldCheck,
                        color: 'bg-indigo-500/15 text-indigo-600 border-indigo-500/25',
                      },
                    ].map((st) => {
                      const StIcon = st.icon;
                      return (
                        <button
                          key={st.step}
                          type="button"
                          onClick={() => {
                            setSettingsStep(st.step);
                            scrollAdminTop();
                          }}
                          className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${st.color}`}>
                              <StIcon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                                  {st.num}
                                </span>
                                <p className="text-xs sm:text-sm font-extrabold text-slate-900 truncate group-hover:text-emerald-700">
                                  {st.title}
                                </p>
                              </div>
                              <p className="text-[11px] text-slate-500 line-clamp-1 mt-1">
                                {st.desc}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="hidden sm:inline-block px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              {st.status}
                            </span>
                            <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-emerald-50 flex items-center justify-center text-slate-400 group-hover:text-emerald-600">
                              <ChevronRight className="w-4 h-4" />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <>
                  {/* Step-by-Step Top Progress Strip inside Settings */}
                  <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-2">
                    <div className="flex overflow-x-auto gap-1.5 scrollbar-hide py-0.5">
                      {[
                        { id: 'menu', label: '📋 Steps Menu' },
                        { id: 'branding', label: '1. Identity & Logo' },
                        { id: 'theme', label: '2. Theme & Font' },
                        { id: 'landing', label: '3. Landing Page' },
                        { id: 'channels', label: '4. WhatsApp/Notice' },
                        { id: 'economics', label: '5. Referral & Free Days' },
                        { id: 'salary', label: '6. Team Salary' },
                        { id: 'security', label: '7. Security' },
                      ].map((pill) => (
                        <button
                          key={pill.id}
                          type="button"
                          onClick={() => {
                            setSettingsStep(pill.id as AdminSettingsStep);
                            scrollAdminTop();
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-colors cursor-pointer ${
                            settingsStep === pill.id
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {pill.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
                    <form onSubmit={handleSaveSettings} className="space-y-5">
                      {/* STEP 1: Website Identity, SEO & Icon Studio */}
                      {(settingsStep === 'branding' || settingsStep === 'all') && (
                  <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 text-white p-4 sm:p-6 rounded-2xl border border-slate-800 shadow-lg space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-500/20 border border-emerald-400/30 rounded-xl text-emerald-300">
                          <Globe className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-black tracking-tight text-white">
                              Website Identity, Description & Icon Studio
                            </h4>
                            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Live Branding
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Yahan se Website ka Name, Tagline, SEO Description aur Logo/Icon change karein — Header, Sidebar, Login, Splash aur Browser Tab par foran sync hoga!
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setAppSettings({
                            ...appSettings,
                            site_name: DEFAULT_SITE_BRANDING.site_name,
                            site_tagline: DEFAULT_SITE_BRANDING.site_tagline,
                            site_description: DEFAULT_SITE_BRANDING.site_description,
                            site_logo_url: DEFAULT_SITE_BRANDING.site_logo_url,
                            site_icon_preset: DEFAULT_SITE_BRANDING.site_icon_preset,
                          })
                        }
                        className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 transition-colors self-start sm:self-auto"
                      >
                        Reset Default Branding
                      </button>
                    </div>

                    {/* Live Multi-Surface Preview Strip */}
                    {(() => {
                      const previewPreset =
                        BRAND_ICON_PRESETS.find((p) => p.key === (appSettings.site_icon_preset || 'custom_image')) ||
                        BRAND_ICON_PRESETS[0];
                      const previewName = appSettings.site_name || 'Earning Hub';
                      const previewTagline = appSettings.site_tagline ?? 'Powered by Saqib';
                      const previewDesc = appSettings.site_description || 'Earn daily, withdraw anytime';
                      const previewLogo = appSettings.site_logo_url || DEFAULT_SITE_BRANDING.site_logo_url;
                      const isCustomImg = (appSettings.site_icon_preset || 'custom_image') === 'custom_image';

                      return (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 bg-white/5 p-4 rounded-xl border border-white/10">
                          {/* Mobile Home Header Preview */}
                          <div className="bg-white text-slate-800 rounded-xl p-3.5 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-green-400 via-orange-400 to-purple-500 p-[2px] shrink-0">
                                <div
                                  className={`w-full h-full rounded-full flex items-center justify-center overflow-hidden ${
                                    isCustomImg ? 'bg-white' : `bg-gradient-to-br ${previewPreset.gradient}`
                                  }`}
                                >
                                  {isCustomImg && previewLogo ? (
                                    <img src={previewLogo} alt={previewName} className="w-full h-full object-cover" />
                                  ) : (
                                    renderBrandPresetIcon(previewPreset.key, 22, 'text-white')
                                  )}
                                </div>
                              </div>
                              <div className="min-w-0">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 block">
                                  Mobile Header Preview
                                </span>
                                <p className="text-sm font-black text-slate-900 truncate">{previewName}</p>
                                <p className="text-[11px] text-slate-500 truncate">{previewDesc}</p>
                              </div>
                            </div>
                          </div>

                          {/* Desktop Sidebar & Browser Tab Preview */}
                          <div className="bg-slate-950/90 rounded-xl p-3.5 flex items-center justify-between border border-white/10">
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-white/15 flex items-center justify-center bg-gradient-to-br ${previewPreset.gradient}`}
                              >
                                {isCustomImg && previewLogo ? (
                                  <img src={previewLogo} alt={previewName} className="w-full h-full object-cover" />
                                ) : (
                                  renderBrandPresetIcon(previewPreset.key, 22, 'text-white')
                                )}
                              </div>
                              <div className="min-w-0">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                                  Sidebar & Splash Preview
                                </span>
                                <p className="text-sm font-black text-white uppercase tracking-tight truncate">
                                  {previewName}
                                </p>
                                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest truncate">
                                  {previewTagline || 'Official Platform'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Name, Tagline, Description Inputs */}
                    <div className="bg-white/5 p-4 sm:p-5 rounded-2xl border border-white/10 space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                        <Globe className="w-4 h-4 text-emerald-400" />
                        <h5 className="text-xs font-black text-white uppercase tracking-wider">
                          Website Name &amp; Identity Details
                        </h5>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                            Website Name (App Title)
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g., Earning Hub"
                            value={appSettings.site_name ?? 'Earning Hub'}
                            onChange={(e) => setAppSettings({ ...appSettings, site_name: e.target.value })}
                            className="w-full px-3.5 py-2.5 bg-white/10 border border-white/15 rounded-xl text-white placeholder:text-slate-500 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                            Brand Tagline / Powered By Subtitle
                          </label>
                          <input
                            type="text"
                            placeholder="e.g., Powered by Saqib"
                            value={appSettings.site_tagline ?? 'Powered by Saqib'}
                            onChange={(e) => setAppSettings({ ...appSettings, site_tagline: e.target.value })}
                            className="w-full px-3.5 py-2.5 bg-white/10 border border-white/15 rounded-xl text-white placeholder:text-slate-500 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-400"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                            Website Description (Home Subtitle &amp; SEO Meta Description)
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g., Earn daily, withdraw anytime"
                            value={appSettings.site_description ?? 'Earn daily, withdraw anytime'}
                            onChange={(e) => setAppSettings({ ...appSettings, site_description: e.target.value })}
                            className="w-full px-3.5 py-2.5 bg-white/10 border border-white/15 rounded-xl text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Dedicated ImageKit Custom Logo Studio */}
                    <div className="bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 p-4 sm:p-5 rounded-2xl border border-emerald-500/30 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/10">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="w-4 h-4 text-emerald-400" />
                          <h5 className="text-xs font-black text-white uppercase tracking-wider">
                            Website Custom Logo (Powered by ImageKit CDN)
                          </h5>
                          {appSettings.site_logo_url?.includes('imagekit.io') && (
                            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                              CDN Active
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-emerald-300 font-bold">
                          1-Click Upload directly to ImageKit CDN
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                        {/* Live Current Logo Box */}
                        <div className="md:col-span-4 flex items-center gap-3.5 p-3 rounded-xl bg-slate-950/70 border border-white/15">
                          <div className="w-16 h-16 rounded-xl bg-slate-900 border-2 border-emerald-500/50 flex items-center justify-center overflow-hidden shrink-0 shadow-lg shadow-emerald-500/10">
                            {appSettings.site_logo_url ? (
                              <img
                                src={appSettings.site_logo_url}
                                alt="Site Logo"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ImageIcon className="w-8 h-8 text-slate-500" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Active Logo
                            </span>
                            <p className="text-xs font-bold text-white truncate">
                              {appSettings.site_logo_url ? 'Custom ImageKit Logo' : 'No Logo Uploaded'}
                            </p>
                            <p className="text-[10px] text-emerald-400 truncate mt-0.5">
                              {appSettings.site_logo_url?.includes('imagekit.io') ? 'Host: ik.imagekit.io' : 'Standard URL'}
                            </p>
                          </div>
                        </div>

                        {/* Upload Button & File Input */}
                        <div className="md:col-span-8 space-y-2">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm shadow-md transition-all active:scale-95">
                              {uploadingLogo ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                                  <span>Uploading to ImageKit CDN...</span>
                                </>
                              ) : (
                                <>
                                  <Upload className="w-4 h-4" />
                                  <span>Upload New Logo (ImageKit CDN)</span>
                                </>
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                disabled={uploadingLogo}
                                onChange={handleBrandLogoFileUpload}
                                className="hidden"
                              />
                            </label>

                            <button
                              type="button"
                              onClick={() => {
                                setAppSettings({
                                  ...appSettings,
                                  site_icon_preset: 'custom_image',
                                  site_logo_url: DEFAULT_SITE_BRANDING.site_logo_url,
                                });
                              }}
                              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-bold border border-white/10 transition-colors"
                            >
                              Use Default Logo
                            </button>
                          </div>

                          <div className="relative">
                            <input
                              type="text"
                              placeholder="ImageKit CDN URL: https://ik.imagekit.io/..."
                              value={appSettings.site_logo_url || ''}
                              onChange={(e) =>
                                setAppSettings({
                                  ...appSettings,
                                  site_logo_url: e.target.value,
                                  site_icon_preset: 'custom_image',
                                })
                              }
                              className="w-full px-3.5 py-2 bg-slate-950/80 border border-white/15 rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400"
                            />
                            <span className="absolute right-3 top-2 text-[10px] text-slate-500 font-mono">
                              Direct CDN URL
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Optional: Glowing Vector Icon Presets */}
                    <div className="space-y-3 pt-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                          Or Choose a Glowing Vector Icon Preset (Optional)
                        </label>
                        <span className="text-[11px] text-slate-400">
                          Agar image logo nahi chahiye toh vector icon select karein
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {BRAND_ICON_PRESETS.map((preset) => {
                          const isSelected = (appSettings.site_icon_preset || 'custom_image') === preset.key;
                          return (
                            <button
                              key={preset.key}
                              type="button"
                              onClick={() => setAppSettings({ ...appSettings, site_icon_preset: preset.key })}
                              className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                                isSelected
                                  ? 'bg-emerald-500/20 border-emerald-400 ring-2 ring-emerald-400/20 text-white'
                                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                              }`}
                            >
                              <div
                                className={`w-8 h-8 rounded-lg bg-gradient-to-br ${preset.gradient} flex items-center justify-center shrink-0 overflow-hidden shadow-sm`}
                              >
                                {preset.key === 'custom_image' && appSettings.site_logo_url ? (
                                  <img
                                    src={appSettings.site_logo_url}
                                    alt="Custom"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  renderBrandPresetIcon(preset.key, 16, 'text-white')
                                )}
                              </div>
                              <span className="text-xs font-bold leading-tight truncate">{preset.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Master Save & Apply Globally Bar */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-emerald-600/20 via-emerald-500/10 to-teal-500/20 border border-emerald-500/30 mt-4 shadow-lg">
                        <div className="text-left">
                          <span className="text-xs font-black text-emerald-300 block uppercase tracking-wide">
                            Apply Website Name &amp; Custom Logo Globally
                          </span>
                          <span className="text-[11px] text-slate-300">
                            Is button par click karte hi aapka naya Website Name aur ImageKit Logo Supabase database mein save ho kar poori website par live update ho jayega.
                          </span>
                        </div>
                        <button
                          type="button"
                          disabled={savingBrandingNow}
                          onClick={() => handleInstantApplyBranding()}
                          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50 shrink-0"
                        >
                          {savingBrandingNow ? (
                            <>
                              <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                              <span>Saving to Database...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" />
                              <span>Apply Website Name &amp; Logo Globally</span>
                            </>
                          )}
                        </button>
                      </div>

                      {brandingSavedNotice && (
                        <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-400 text-emerald-200 text-xs font-bold flex items-center gap-2.5 mt-2 animate-in fade-in duration-300">
                          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>{brandingSavedNotice}</span>
                        </div>
                      )}
                    </div>
                  </div>
                      )}

                      {/* STEP 3: Pre-Login Public Landing Page & Website Showcase Studio */}
                      {(settingsStep === 'landing' || settingsStep === 'all') && (
                  <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white p-4 sm:p-6 rounded-2xl border border-indigo-500/30 shadow-lg space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-indigo-300 shrink-0">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-base font-black tracking-tight text-white">
                              Pre-Login Website Showcase & Landing Page Studio
                            </h4>
                            <span
                              className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                                appSettings.show_landing_page !== 'false'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                                  : 'bg-rose-500/20 text-rose-300 border-rose-400/30'
                              }`}
                            >
                              {appSettings.show_landing_page !== 'false'
                                ? 'ON (Landing Page First -> Login/Register)'
                                : 'OFF (Direct Login Screen)'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-1">
                            Jab yeh ON hoga tou direct Login page nahi aayega — pehle Website ka Name, Description, Kis Baare Mein Hai, Hero Image aur Plans show honge aur upar Login / Register buttons honge!
                          </p>
                        </div>
                      </div>

                      {/* Master ON / OFF Switch */}
                      <div className="flex items-center gap-3 self-start sm:self-center shrink-0 bg-white/5 px-3.5 py-2 rounded-xl border border-white/10">
                        <span className="text-xs font-bold text-slate-200">
                          {appSettings.show_landing_page !== 'false' ? 'Landing Page ON' : 'Direct Login Mode'}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setAppSettings({
                              ...appSettings,
                              show_landing_page: appSettings.show_landing_page !== 'false' ? 'false' : 'true',
                            })
                          }
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            appSettings.show_landing_page !== 'false' ? 'bg-emerald-500' : 'bg-slate-600'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                              appSettings.show_landing_page !== 'false' ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {appSettings.show_landing_page !== 'false' ? (
                      <div className="space-y-5">
                        {/* Section Visibility Toggles (Turn individual parts ON or OFF) */}
                        <div>
                          <label className="block text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2.5">
                            Show / Hide Landing Page Sections (Jo cheez OFF karni ho yahan se band kar dein)
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {[
                              {
                                key: 'landing_show_hero_image',
                                title: 'Hero Banner Image',
                                desc: 'Show/Hide main picture',
                              },
                              {
                                key: 'landing_show_live_ticker',
                                title: 'Live Payout Ticker',
                                desc: 'Animated withdrawal feed',
                              },
                              {
                                key: 'landing_show_about',
                                title: 'About Platform Box',
                                desc: 'Website kis baare mein hai',
                              },
                              {
                                key: 'landing_show_steps',
                                title: '3-Step Earning Guide',
                                desc: 'How it works cards',
                              },
                              {
                                key: 'landing_show_plans',
                                title: 'Live Plans Grid',
                                desc: 'Show packages before login',
                              },
                              {
                                key: 'landing_show_calculator',
                                title: 'Profit Calculator',
                                desc: 'Interactive profit slider',
                              },
                              {
                                key: 'landing_show_stats',
                                title: 'Platform Highlights Bar',
                                desc: 'Bonus & withdrawal badges',
                              },
                              {
                                key: 'landing_show_faq',
                                title: 'FAQ Questions Section',
                                desc: 'Common user questions',
                              },
                            ].map((sec) => {
                              const isOn = appSettings[sec.key] !== 'false';
                              return (
                                <div
                                  key={sec.key}
                                  onClick={() =>
                                    setAppSettings({
                                      ...appSettings,
                                      [sec.key]: isOn ? 'false' : 'true',
                                    })
                                  }
                                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                                    isOn
                                      ? 'bg-emerald-500/15 border-emerald-400/40 text-white'
                                      : 'bg-white/5 border-white/10 text-slate-400 opacity-75'
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <p className="text-xs font-black truncate">{sec.title}</p>
                                    <p className="text-[10px] text-slate-300 truncate">{sec.desc}</p>
                                  </div>
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase shrink-0 ${
                                      isOn ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300'
                                    }`}
                                  >
                                    {isOn ? 'ON' : 'OFF'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Text & Button Customization */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                              Top Highlight Badge Text
                            </label>
                            <input
                              type="text"
                              placeholder="e.g., PAKISTAN'S #1 DAILY REWARD PLATFORM"
                              value={appSettings.landing_badge ?? DEFAULT_SITE_BRANDING.landing_badge}
                              onChange={(e) => setAppSettings({ ...appSettings, landing_badge: e.target.value })}
                              className="w-full px-3.5 py-2.5 bg-white/10 border border-white/15 rounded-xl text-white placeholder:text-slate-500 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                              Main Landing Headline (Title)
                            </label>
                            <input
                              type="text"
                              placeholder="e.g., Earn Daily Fixed Rewards & Instant Referral Bonuses"
                              value={appSettings.landing_title ?? DEFAULT_SITE_BRANDING.landing_title}
                              onChange={(e) => setAppSettings({ ...appSettings, landing_title: e.target.value })}
                              className="w-full px-3.5 py-2.5 bg-white/10 border border-white/15 rounded-xl text-white placeholder:text-slate-500 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                              Website Kis Baare Mein Hai (About Platform Details)
                            </label>
                            <textarea
                              rows={3}
                              placeholder="Explain how your platform works, daily rewards, referral bonus, and EasyPaisa/JazzCash withdrawals..."
                              value={appSettings.landing_about ?? DEFAULT_SITE_BRANDING.landing_about}
                              onChange={(e) => setAppSettings({ ...appSettings, landing_about: e.target.value })}
                              className="w-full px-3.5 py-2.5 bg-white/10 border border-white/15 rounded-xl text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                              Top-Right Login Button Text
                            </label>
                            <input
                              type="text"
                              placeholder="Login"
                              value={appSettings.landing_login_btn_text ?? 'Login'}
                              onChange={(e) =>
                                setAppSettings({ ...appSettings, landing_login_btn_text: e.target.value })
                              }
                              className="w-full px-3.5 py-2 bg-white/10 border border-white/15 rounded-xl text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                              Top-Right Register Button Text
                            </label>
                            <input
                              type="text"
                              placeholder="Register Now"
                              value={appSettings.landing_register_btn_text ?? 'Register Now'}
                              onChange={(e) =>
                                setAppSettings({ ...appSettings, landing_register_btn_text: e.target.value })
                              }
                              className="w-full px-3.5 py-2 bg-white/10 border border-white/15 rounded-xl text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                          </div>
                        </div>

                        {/* Customizable 3-Step Guide Inputs (When 3-Step Guide is ON) */}
                        {appSettings.landing_show_steps !== 'false' && (
                          <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-3">
                            <p className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                              3-Step &quot;How You Earn&quot; Guide Customization
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {[
                                {
                                  num: 'Step 01',
                                  tKey: 'landing_step1_title',
                                  dKey: 'landing_step1_desc',
                                  tDef: DEFAULT_SITE_BRANDING.landing_step1_title,
                                  dDef: DEFAULT_SITE_BRANDING.landing_step1_desc,
                                },
                                {
                                  num: 'Step 02',
                                  tKey: 'landing_step2_title',
                                  dKey: 'landing_step2_desc',
                                  tDef: DEFAULT_SITE_BRANDING.landing_step2_title,
                                  dDef: DEFAULT_SITE_BRANDING.landing_step2_desc,
                                },
                                {
                                  num: 'Step 03',
                                  tKey: 'landing_step3_title',
                                  dKey: 'landing_step3_desc',
                                  tDef: DEFAULT_SITE_BRANDING.landing_step3_title,
                                  dDef: DEFAULT_SITE_BRANDING.landing_step3_desc,
                                },
                              ].map((st) => (
                                <div key={st.num} className="bg-slate-950/50 p-3 rounded-xl border border-white/10 space-y-2">
                                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                                    {st.num}
                                  </span>
                                  <input
                                    type="text"
                                    value={appSettings[st.tKey] ?? st.tDef}
                                    onChange={(e) => setAppSettings({ ...appSettings, [st.tKey]: e.target.value })}
                                    className="w-full px-2.5 py-1.5 bg-white/10 border border-white/15 rounded-lg text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                  />
                                  <textarea
                                    rows={2}
                                    value={appSettings[st.dKey] ?? st.dDef}
                                    onChange={(e) => setAppSettings({ ...appSettings, [st.dKey]: e.target.value })}
                                    className="w-full px-2.5 py-1.5 bg-white/10 border border-white/15 rounded-lg text-slate-200 text-[11px] focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Hero Banner Image Upload & Toggle */}
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-bold text-indigo-300">
                                  Landing Page Hero Banner Image
                                </p>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                    appSettings.landing_show_hero_image !== 'false'
                                      ? 'bg-emerald-500/20 text-emerald-300'
                                      : 'bg-rose-500/20 text-rose-300'
                                  }`}
                                >
                                  {appSettings.landing_show_hero_image !== 'false' ? 'Image Visible' : 'Image Hidden'}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400">
                                Apne mobile/PC se banner image upload karein, image URL paste karein, ya image OFF kar dein.
                              </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  setAppSettings({
                                    ...appSettings,
                                    landing_show_hero_image:
                                      appSettings.landing_show_hero_image !== 'false' ? 'false' : 'true',
                                  })
                                }
                                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-slate-200 border border-white/10 transition-colors"
                              >
                                {appSettings.landing_show_hero_image !== 'false' ? 'Hide Image' : 'Show Image'}
                              </button>

                              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm transition-colors">
                                <Upload className="w-3.5 h-3.5" />
                                <span>{uploadingHeroImage ? 'Uploading...' : 'Upload Banner Image'}</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleLandingHeroFileUpload}
                                  className="hidden"
                                />
                              </label>
                            </div>
                          </div>

                          {appSettings.landing_show_hero_image !== 'false' && (
                            <div className="space-y-3">
                              <input
                                type="text"
                                placeholder="https://images.unsplash.com/... or uploaded image data"
                                value={appSettings.landing_hero_image ?? DEFAULT_SITE_BRANDING.landing_hero_image}
                                onChange={(e) =>
                                  setAppSettings({ ...appSettings, landing_hero_image: e.target.value })
                                }
                                className="w-full px-3.5 py-2 bg-slate-950/60 border border-white/15 rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400"
                              />
                              {appSettings.landing_hero_image && (
                                <div className="relative w-full max-w-sm h-36 rounded-xl overflow-hidden border border-white/15 bg-slate-950">
                                  <img
                                    src={appSettings.landing_hero_image}
                                    alt="Hero Banner Preview"
                                    className="w-full h-full object-cover"
                                  />
                                  <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-slate-900/80 text-[10px] font-bold text-emerald-300">
                                    Live Hero Preview
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-xs text-slate-300 flex items-center justify-between gap-4">
                        <span>
                          Landing Page is currently <strong>OFF</strong>. Visitors opening the website will go directly to the Login / Register box.
                        </span>
                        <button
                          type="button"
                          onClick={() => setAppSettings({ ...appSettings, show_landing_page: 'true' })}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shrink-0 transition-colors"
                        >
                          Turn ON Landing Page
                        </button>
                      </div>
                    )}
                  </div>
                      )}

                      {/* STEP 2: Global Multi-Theme, Dynamic Font & Tactile Audio Studio (Admin Defaults) */}
                      {(settingsStep === 'theme' || settingsStep === 'all') && (
                  <div className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white p-4 sm:p-5 rounded-2xl border border-emerald-500/30 shadow-md space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <Palette className="w-4 h-4 text-emerald-400" />
                          <h4 className="text-sm font-black uppercase tracking-wider text-white">
                            Global Theme, Font &amp; Tactile Audio Defaults
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            6 Themes + 6 Font Packs
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1">
                          Naye visitors aur users ke liye website ka Global Default Theme, Google Font Pack, aur Ambient RGB Light set karein.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-bold text-slate-300">User Theme Button:</span>
                        <button
                          type="button"
                          onClick={() =>
                            setAppSettings({
                              ...appSettings,
                              allow_user_theme_switcher:
                                appSettings.allow_user_theme_switcher !== 'false' ? 'false' : 'true',
                            })
                          }
                          className={`px-3.5 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
                            appSettings.allow_user_theme_switcher !== 'false'
                              ? 'bg-emerald-500 text-white'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {appSettings.allow_user_theme_switcher !== 'false' ? 'Shown in Header' : 'Hidden'}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Global Default Visual Theme Picker */}
                      <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-2.5">
                        <label className="flex items-center gap-1.5 text-xs font-bold text-emerald-300 uppercase tracking-wider">
                          <Palette className="w-3.5 h-3.5" />
                          <span>Platform Default Visual Theme (6 Packs)</span>
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {APP_THEMES_CATALOG.map((t) => {
                            const selected = (appSettings.default_theme_mode || 'astro-neu') === t.id;
                            return (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => setAppSettings({ ...appSettings, default_theme_mode: t.id })}
                                className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 cursor-pointer ${
                                  selected
                                    ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-xs'
                                    : 'bg-slate-950/50 border-white/10 text-slate-300 hover:bg-white/10'
                                }`}
                              >
                                <div className="min-w-0">
                                  <div className="text-xs font-black truncate">{t.shortLabel}</div>
                                  <div className="text-[10px] text-slate-400 truncate">
                                    {t.isDark ? '🌙 Dark Mode' : '☀️ Light Surface'}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <span
                                    className="w-3.5 h-3.5 rounded-full border border-white/30"
                                    style={{ backgroundColor: t.swatch1 }}
                                  />
                                  <span
                                    className="w-3.5 h-3.5 rounded-full border border-white/30"
                                    style={{ backgroundColor: t.swatch2 }}
                                  />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Global Default Font Pack Picker */}
                      <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-2.5">
                        <label className="flex items-center gap-1.5 text-xs font-bold text-indigo-300 uppercase tracking-wider">
                          <Type className="w-3.5 h-3.5" />
                          <span>Platform Default Typography Pack (6 Packs)</span>
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {APP_FONT_PACKS.map((f) => {
                            const selected = (appSettings.default_font_mode || 'tech-modern') === f.id;
                            return (
                              <button
                                key={f.id}
                                type="button"
                                onClick={() => setAppSettings({ ...appSettings, default_font_mode: f.id })}
                                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                                  selected
                                    ? 'bg-indigo-500/25 border-indigo-400 text-white shadow-xs'
                                    : 'bg-slate-950/50 border-white/10 text-slate-300 hover:bg-white/10'
                                }`}
                              >
                                <div className="text-xs font-black truncate">{f.shortLabel}</div>
                                <div className="text-[10px] text-slate-400 truncate">
                                  {f.displayFontName} + {f.bodyFontName}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Global Default RGB Glow Toggle */}
                    <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-white block">
                          Default Ambient RGB Perimeter Glow
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Naye visitors ke liye cards ke gird animated RGB neon border default ON ya OFF rakhein.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setAppSettings({
                            ...appSettings,
                            default_rgb_light:
                              appSettings.default_rgb_light !== 'false' ? 'false' : 'true',
                          })
                        }
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                          appSettings.default_rgb_light !== 'false'
                            ? 'bg-gradient-to-r from-sky-500 via-purple-500 to-pink-500 text-white'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {appSettings.default_rgb_light !== 'false' ? 'Default RGB ON' : 'Default RGB OFF'}
                      </button>
                    </div>
                  </div>
                      )}

                      {/* STEP 4: Marquee & Community Channels */}
                      {(settingsStep === 'channels' || settingsStep === 'all') && (
                        <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-800 mb-1.5">Marquee Text (Running Welcome Notice on Home)</label>
                    <textarea 
                      required
                      rows={2}
                      value={appSettings.marquee_text}
                      onChange={e => setAppSettings({...appSettings, marquee_text: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                    />
                  </div>
                  {/* Community & Follow Channels Visibility Controls */}
                  <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-100 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/70 pb-3">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Social / Community Channels (Follow UI)</h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Agar aap WhatsApp ya Telegram channel nahi lagana chahte tou yahan se OFF kar dein — User Home screen se woh card bilkul hide ho jayega.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setAppSettings({
                            ...appSettings,
                            show_whatsapp: (appSettings.show_whatsapp !== 'false' && appSettings.show_telegram !== 'false') ? 'false' : 'true',
                            show_telegram: (appSettings.show_whatsapp !== 'false' && appSettings.show_telegram !== 'false') ? 'false' : 'true'
                          })}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                          {(appSettings.show_whatsapp !== 'false' && appSettings.show_telegram !== 'false') ? 'Hide Both Channels' : 'Show Both Channels'}
                        </button>
                      </div>
                    </div>

                    {/* WhatsApp Channel Toggle & Link */}
                    <div className={`p-4 rounded-xl border transition-all ${appSettings.show_whatsapp !== 'false' ? 'bg-white border-emerald-200 shadow-sm' : 'bg-slate-100/70 border-slate-200 opacity-80'}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-800">WhatsApp Channel / Group Card</span>
                            <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${appSettings.show_whatsapp !== 'false' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                              {appSettings.show_whatsapp !== 'false' ? 'ON (Visible)' : 'OFF (Hidden from UI)'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {appSettings.show_whatsapp !== 'false' ? 'User dashboard par "Join WhatsApp Channel" box show ho raha hai.' : 'WhatsApp follow box user UI se mukammal hide hai.'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAppSettings({...appSettings, show_whatsapp: appSettings.show_whatsapp !== 'false' ? 'false' : 'true'})}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${appSettings.show_whatsapp !== 'false' ? 'bg-emerald-600' : 'bg-slate-300'}`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${appSettings.show_whatsapp !== 'false' ? 'translate-x-5' : 'translate-x-0'}`}
                          />
                        </button>
                      </div>

                      {appSettings.show_whatsapp !== 'false' && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <label className="block text-xs font-semibold text-slate-600 mb-1">WhatsApp Group / Channel Link</label>
                          <input 
                            type="url" 
                            placeholder="https://whatsapp.com/channel/..."
                            value={appSettings.whatsapp_link || ''}
                            onChange={e => setAppSettings({...appSettings, whatsapp_link: e.target.value})}
                            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                          />
                        </div>
                      )}
                    </div>

                    {/* Telegram Channel Toggle & Link */}
                    <div className={`p-4 rounded-xl border transition-all ${appSettings.show_telegram !== 'false' ? 'bg-white border-sky-200 shadow-sm' : 'bg-slate-100/70 border-slate-200 opacity-80'}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-800">Telegram Channel / Reward Card</span>
                            <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${appSettings.show_telegram !== 'false' ? 'bg-sky-100 text-sky-700' : 'bg-rose-100 text-rose-700'}`}>
                              {appSettings.show_telegram !== 'false' ? 'ON (Visible)' : 'OFF (Hidden from UI)'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {appSettings.show_telegram !== 'false' ? 'User dashboard par "Telegram Reward / Join Channel" box show ho raha hai.' : 'Telegram follow box user UI se mukammal hide hai.'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAppSettings({...appSettings, show_telegram: appSettings.show_telegram !== 'false' ? 'false' : 'true'})}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${appSettings.show_telegram !== 'false' ? 'bg-sky-600' : 'bg-slate-300'}`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${appSettings.show_telegram !== 'false' ? 'translate-x-5' : 'translate-x-0'}`}
                          />
                        </button>
                      </div>

                      {appSettings.show_telegram !== 'false' && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Telegram Channel Link</label>
                          <input 
                            type="url" 
                            placeholder="https://t.me/..."
                            value={appSettings.telegram_link || ''}
                            onChange={e => setAppSettings({...appSettings, telegram_link: e.target.value})}
                            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                        </div>
                      )}

                      {/* STEP 5: Invite, Referral, Free Days & Withdrawal Economic Rules */}
                      {(settingsStep === 'economics' || settingsStep === 'all') && (
                        <div className="space-y-5">
                  <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-4">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                        Invite, Referral & Withdrawal Rules
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Customize per-invite bonus, minimum withdrawal limit, base plan revenue assumption, and custom invite message.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Referral Bonus Per Active Member (PKR)
                        </label>
                        <input 
                          type="number" 
                          required
                          min={0}
                          value={appSettings.referral_bonus ?? '50'}
                          onChange={e => setAppSettings({...appSettings, referral_bonus: e.target.value})}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm font-mono font-bold text-slate-900 tabular-nums"
                        />
                        <p className="text-[11px] text-slate-400 mt-1">
                          Default: Rs 50 per active referral. Updates all plan calculations live.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Minimum Withdrawal Limit (PKR)
                        </label>
                        <input 
                          type="number" 
                          required
                          min={10}
                          value={appSettings.min_withdrawal ?? '100'}
                          onChange={e => setAppSettings({...appSettings, min_withdrawal: e.target.value})}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm font-mono font-bold text-slate-900 tabular-nums"
                        />
                        <p className="text-[11px] text-slate-400 mt-1">
                          Default: Rs 100. Users cannot request withdrawal below this amount.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Base Member Plan Price Assumption (PKR)
                        </label>
                        <input 
                          type="number" 
                          required
                          min={50}
                          value={appSettings.base_member_plan_price ?? '250'}
                          onChange={e => setAppSettings({...appSettings, base_member_plan_price: e.target.value})}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm font-mono font-bold text-slate-900 tabular-nums"
                        />
                        <p className="text-[11px] text-slate-400 mt-1">
                          Default: Rs 250 (Plan 1 price). Used to calculate Members Revenue (M × 250).
                        </p>
                      </div>
                    </div>

                    {Number(appSettings.referral_bonus || 50) >= Number(appSettings.base_member_plan_price || 250) && (
                      <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">Economic Warning: Referral Bonus Exceeds Base Member Plan Price!</p>
                          <p className="text-[11px] mt-0.5">
                            Agar Referral Bonus (Rs {appSettings.referral_bonus}) Base Plan Price (Rs {appSettings.base_member_plan_price}) ke barabar ya zyada hoga, tou har naye invited member par platform ko profit ke bajaye nuqsan hoga. Referral Bonus ko Rs {Math.floor(Number(appSettings.base_member_plan_price || 250) * 0.4)} se kam rakhein.
                          </p>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Custom Invite Share Message Template (Optional)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="🚀 {username} invited you to join Earning Hub and earn daily rewards! Click the link below to join: {link}"
                        value={appSettings.invite_share_template || ''}
                        onChange={e => setAppSettings({...appSettings, invite_share_template: e.target.value})}
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-xs text-slate-800"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Use <code className="bg-slate-200/70 px-1 rounded">{'{username}'}</code> and <code className="bg-slate-200/70 px-1 rounded">{'{link}'}</code> placeholders. Leave empty to use the default message.
                      </p>
                    </div>
                  </div>

                  {/* Daily Reward Days Without Referrals Setting */}
                  <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-200/80 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                          Daily Reward Days Without Referrals (Free Days Limit)
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Plan active hote hi pehle din ka reward usi time unlock ho jata hai. Yahan likhein ke user kitne din ka daily reward <strong>bina required referrals</strong> ke collect kar sakta hai (0 se 30 din):
                        </p>
                      </div>
                      <span className="text-xs font-extrabold px-3 py-1 rounded-lg bg-emerald-600 text-white shrink-0 self-start sm:self-center tabular-nums">
                        Current: {appSettings.free_reward_days ?? '1'} {Number(appSettings.free_reward_days ?? 1) === 1 ? 'Day' : 'Days'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center pt-1">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Allowed Days Without Referrals (0 - 30)
                        </label>
                        <input
                          type="number"
                          required
                          min={0}
                          max={30}
                          placeholder="e.g. 1, 3, 5"
                          value={appSettings.free_reward_days ?? '1'}
                          onChange={e => {
                            const raw = e.target.value;
                            if (raw === '') {
                              setAppSettings({ ...appSettings, free_reward_days: '' });
                              return;
                            }
                            const val = Math.max(0, Math.min(30, Number(raw)));
                            setAppSettings({ ...appSettings, free_reward_days: String(val) });
                          }}
                          onBlur={() => {
                            if (appSettings.free_reward_days === '' || appSettings.free_reward_days === undefined) {
                              setAppSettings({ ...appSettings, free_reward_days: '1' });
                            }
                          }}
                          className="w-full px-4 py-2.5 bg-white border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm font-bold text-slate-800 tabular-nums"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Quick Presets
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { label: '0 Days (Strict)', val: '0' },
                            { label: '1 Day (Instant 1st)', val: '1' },
                            { label: '3 Days', val: '3' },
                            { label: '5 Days', val: '5' },
                            { label: '7 Days', val: '7' },
                            { label: '30 Days (All Free)', val: '30' }
                          ].map(preset => (
                            <button
                              key={preset.val}
                              type="button"
                              onClick={() => setAppSettings({ ...appSettings, free_reward_days: preset.val })}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                                String(appSettings.free_reward_days ?? '1') === preset.val
                                  ? 'bg-[#0F7A50] text-white shadow-sm'
                                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                      • <strong>1 Day (Default)</strong>: Plan approve hote hi <strong>Day 1</strong> ka reward usi waqt mil jayega, aur Day 2 se 30 ke liye required referrals zaroori honge.<br />
                      • <strong>3 ya 5 Days</strong>: User pehle 3 ya 5 din bina referral ke collect kar sakega, baqi din referrals poore hone ke baad milenge.<br />
                      • <strong>0 Days</strong>: Pehle din se hi referrals poore hona zaroori honge (Purana system).
                    </p>
                  </div>

                  {/* Full Withdrawal Fee, Limits & Open Hours Schedule Control */}
                  <AdminWithdrawalRulesSection
                    appSettings={appSettings}
                    setAppSettings={setAppSettings}
                  />
                        </div>
                      )}

                      {/* STEP 6: Weekly Team Salary Milestones & Custom Reward Customization */}
                      {(settingsStep === 'salary' || settingsStep === 'all') && (
                  <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                          Team Salary Milestones & Custom Rewards (Levels 1 – 6)
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Har level ke Required Active Members aur us ka Reward (Auto Formula <code className="font-mono">Members × Rs {currentRefBonusRate}</code> ya Custom PKR) customize karein.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setAppSettings({
                            ...appSettings,
                            level_1_req: '10',
                            level_2_req: '30',
                            level_3_req: '50',
                            level_4_req: '100',
                            level_5_req: '150',
                            level_6_req: '300',
                            level_1_reward: '',
                            level_2_reward: '',
                            level_3_reward: '',
                            level_4_reward: '',
                            level_5_reward: '',
                            level_6_reward: '',
                          })
                        }
                        className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap self-start sm:self-center"
                      >
                        Reset Levels to Auto Defaults
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[1, 2, 3, 4, 5, 6].map(lvl => {
                        const reqVal = Number(appSettings[`level_${lvl}_req`] || [10, 30, 50, 100, 150, 300][lvl - 1]);
                        const customRewardVal = appSettings[`level_${lvl}_reward`];
                        const econ = evaluateTeamLevelEconomics(
                          lvl,
                          reqVal,
                          customRewardVal,
                          currentRefBonusRate,
                          currentBaseMemberPrice
                        );

                        return (
                          <div
                            key={lvl}
                            className={`p-4 rounded-xl bg-white border space-y-3 ${
                              econ.isSustainable ? 'border-slate-200' : 'border-rose-300 bg-rose-50/30'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                                Level {lvl} Milestone
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono tabular-nums ${
                                  econ.isSustainable
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-rose-100 text-rose-700 border border-rose-200'
                                }`}
                              >
                                {econ.isSustainable
                                  ? `Net +Rs ${econ.netAfterSalaryMilestone.toLocaleString()}`
                                  : `Loss -Rs ${Math.abs(econ.netAfterSalaryMilestone).toLocaleString()}`}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2.5">
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                  Goal (Members)
                                </label>
                                <input 
                                  type="number" 
                                  required
                                  min={1}
                                  value={appSettings[`level_${lvl}_req`] || ''}
                                  onChange={e => setAppSettings({...appSettings, [`level_${lvl}_req`]: e.target.value})}
                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 text-xs font-mono font-bold text-slate-900 tabular-nums"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                  Reward (PKR)
                                </label>
                                <input 
                                  type="number" 
                                  min={0}
                                  placeholder={`Auto: ${econ.autoReward}`}
                                  value={appSettings[`level_${lvl}_reward`] || ''}
                                  onChange={e => setAppSettings({...appSettings, [`level_${lvl}_reward`]: e.target.value})}
                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 text-xs font-mono font-bold text-indigo-700 placeholder:text-slate-400 tabular-nums"
                                />
                              </div>
                            </div>

                            <div className="text-[11px] text-slate-500 font-mono tabular-nums space-y-0.5 pt-1 border-t border-slate-100">
                              <div className="flex justify-between">
                                <span className="font-sans">Active Payout:</span>
                                <span className="font-bold text-indigo-700">
                                  Rs {econ.effectiveReward.toLocaleString()} {econ.isCustomReward ? '(Custom)' : '(Auto)'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="font-sans">Min Team Deposit:</span>
                                <span>Rs {econ.membersMinRevenue.toLocaleString()}</span>
                              </div>
                            </div>

                            {!econ.isSustainable && econ.reason && (
                              <div className="p-2 rounded-lg bg-rose-100/80 border border-rose-200 text-[10px] text-rose-800 leading-snug space-y-1">
                                <p className="font-semibold">{econ.reason}</p>
                                <button
                                  type="button"
                                  onClick={() => setAppSettings({ ...appSettings, [`level_${lvl}_reward`]: '' })}
                                  className="px-2 py-0.5 bg-white text-rose-700 font-bold rounded border border-rose-200"
                                >
                                  Auto-Fix to Rs {econ.autoReward.toLocaleString()}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                      )}

                      {/* STEP 7: Security, Device & IP Fraud Protection */}
                      {(settingsStep === 'security' || settingsStep === 'all') && (
                        <div className="space-y-4">
                          {/* 1. Device ID & Hardware Fingerprint Lock */}
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <label className="block text-sm font-bold text-slate-800 mb-1">
                              1. Device ID & Hardware Fingerprint Lock (One Device = One Account)
                            </label>
                            <p className="text-xs text-slate-500 mb-3">
                              Hardware fingerprint, browser canvas, aur persistent cookies se aik hi physical mobile/laptop par doosra account banana foran block karta hai (Incognito window mein bhi pakad leta hai).
                            </p>
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => setAppSettings({...appSettings, restrict_multiple_accounts: appSettings.restrict_multiple_accounts === 'true' ? 'false' : 'true'})}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${appSettings.restrict_multiple_accounts === 'true' ? 'bg-emerald-600' : 'bg-slate-300'}`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${appSettings.restrict_multiple_accounts === 'true' ? 'translate-x-5' : 'translate-x-0'}`}
                                />
                              </button>
                              <span className="text-sm font-bold text-slate-700">
                                {appSettings.restrict_multiple_accounts === 'true' ? 'ON (Strict 1-Device Lock Active)' : 'OFF (Allow Any Device)'}
                              </span>
                            </div>
                          </div>

                          {/* 2. Same IP Network Lock */}
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <label className="block text-sm font-bold text-slate-800 mb-1">
                              2. Same IP Network Lock (One IP = One Account)
                            </label>
                            <p className="text-xs text-slate-500 mb-3">
                              Aik hi WiFi ya internet IP se doosra account register hone se rokta hai. Agar aap chahte hain ke aik hi network se 1 hi account bane to isay ON karein.
                            </p>
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => setAppSettings({...appSettings, restrict_same_ip: appSettings.restrict_same_ip === 'true' ? 'false' : 'true'})}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${appSettings.restrict_same_ip === 'true' ? 'bg-emerald-600' : 'bg-slate-300'}`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${appSettings.restrict_same_ip === 'true' ? 'translate-x-5' : 'translate-x-0'}`}
                                />
                              </button>
                              <span className="text-sm font-bold text-slate-700">
                                {appSettings.restrict_same_ip === 'true' ? 'ON (Strict 1-IP Restriction Active)' : 'OFF (Allow Shared WiFi/Carrier IPs)'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* STEP 8: Promo & Gift Codes Voucher Engine */}
                      {(settingsStep === 'promo' || settingsStep === 'all') && (
                        <AdminPromoCodesStep
                          appSettings={appSettings}
                          setAppSettings={setAppSettings}
                          onQuickSaveSettings={handleQuickSaveSettings}
                        />
                      )}

                      {/* STEP 9: Daily Tasks & Link Timer Verification Setup */}
                      {(settingsStep === 'tasks' || settingsStep === 'all') && (
                        <AdminDailyTasksStep
                          appSettings={appSettings}
                          setAppSettings={setAppSettings}
                          onQuickSaveSettings={handleQuickSaveSettings}
                        />
                      )}

                      {/* Sticky / Full-Width Mobile Save Bar for Current Step */}
                      <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSettingsStep('menu');
                            scrollAdminTop();
                          }}
                          className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <ArrowLeft className="w-4 h-4" /> Back to All Steps List
                        </button>
                        <button 
                          type="submit" 
                          disabled={savingSettings}
                          className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-black py-3 px-6 rounded-xl transition-colors shadow-sm text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>{savingSettings ? 'Saving & Syncing...' : 'Save Changes & Sync Live'}</span>
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Superadmin Double Lock Security Settings (Only on Step 7 Security or All) */}
                  {(settingsStep === 'security' || settingsStep === 'all') && (
                    <>
                      <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3 mb-2">
                          <Shield className="w-6 h-6 text-indigo-600" />
                          <h3 className="text-lg sm:text-xl font-bold text-slate-800">Superadmin Double Lock Security</h3>
                        </div>
                        <p className="text-xs text-slate-400 mb-6">
                          Admin panel login user/pass tabdeel karne ke liye pehle apna purana password verify karein. Is se kisi kisam ki query baar baar run nahi karni paregi.
                        </p>

                        {secError && (
                          <div className="bg-rose-50 text-rose-700 text-xs font-semibold p-4 rounded-xl border border-rose-100 mb-4">
                            {secError}
                          </div>
                        )}

                        {secSuccess && (
                          <div className="bg-emerald-50 text-emerald-700 text-xs font-semibold p-4 rounded-xl border border-emerald-100 mb-4">
                            Security credentials updated successfully! New credentials are now active.
                          </div>
                        )}

                        <form onSubmit={handleSaveSecuritySettings} className="space-y-4">
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Step 1: Verify Identity</h4>
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1">Current (Old) Security Password</label>
                              <input 
                                type="password" 
                                required
                                placeholder="Purana Security Password enter karein"
                                value={oldSecPasswordInput}
                                onChange={e => setOldSecPasswordInput(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-medium transition-shadow shadow-sm"
                              />
                            </div>
                          </div>

                          <div className="p-4 border border-slate-100 rounded-xl space-y-3">
                            <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Step 2: Enter New Credentials</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">New Username</label>
                                <input 
                                  type="text" 
                                  required
                                  placeholder="Naya username enter karein"
                                  value={newSecUsernameInput}
                                  onChange={e => setNewSecUsernameInput(e.target.value)}
                                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-medium"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">New Password</label>
                                <input 
                                  type="text" 
                                  required
                                  placeholder="Naya password enter karein"
                                  value={newSecPasswordInput}
                                  onChange={e => setNewSecPasswordInput(e.target.value)}
                                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-medium"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="pt-2 flex justify-end">
                            <button 
                              type="submit" 
                              disabled={savingSec}
                              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-sm text-sm"
                            >
                              {savingSec ? 'Verifying & Saving...' : 'Verify & Set New Credentials'}
                            </button>
                          </div>
                        </form>
                      </div>

                      {/* Notification System & Triggers Setup Section */}
                      <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold shrink-0">🔔</div>
                          <div>
                            <h3 className="text-base sm:text-lg font-bold text-slate-800">Notification System & Triggers Setup</h3>
                            <p className="text-xs text-slate-500">Apne users ke liye automatic withdrawal, referral signups, active member dynamic referral bonuses aur daily rewards notifications active hain.</p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}

            {activeTab === 'analytics' && (() => {
        const trafficByDate = Object.entries(
          pageViews.reduce((acc: any, pv) => {
            const d = new Date(pv.created_at).toISOString().split('T')[0];
            if (!acc[d]) acc[d] = { views: 0, devices: new Set() };
            acc[d].views++;
            if (pv.device_id) acc[d].devices.add(pv.device_id);
            return acc;
          }, {})
        ).sort((a: any, b: any) => b[0].localeCompare(a[0])).map(([date, data]: any) => ({ date, views: data.views, unique: data.devices.size }));

        const trafficByLocation = Object.entries(
          pageViews.reduce((acc: any, pv) => {
            if (pv.country && pv.country !== 'Unknown') {
              const loc = `${pv.city || 'Unknown'}, ${pv.country}`;
              if (!acc[loc]) acc[loc] = new Set();
              if (pv.device_id) acc[loc].add(pv.device_id);
            }
            return acc;
          }, {})
        ).sort((a: any, b: any) => b[1].size - a[1].size).map(([loc, devices]: any) => ({ loc, unique: devices.size }));

        const refClicks = Object.entries(
          pageViews.reduce((acc: any, pv) => {
            if (pv.ref_code) {
              if (!acc[pv.ref_code]) acc[pv.ref_code] = { clicks: 0, devices: new Set() };
              acc[pv.ref_code].clicks++;
              if (pv.device_id) acc[pv.ref_code].devices.add(pv.device_id);
            }
            return acc;
          }, {})
        ).sort((a: any, b: any) => b[1].clicks - a[1].clicks).map(([ref, data]: any) => ({ ref, clicks: data.clicks, unique: data.devices.size }));

        const duplicateIPs = Object.entries(
          users.reduce((acc: any, u) => {
            if (u.last_ip && u.last_ip !== 'Unknown') {
              if (!acc[u.last_ip]) acc[u.last_ip] = [];
              acc[u.last_ip].push(u.username);
            }
            return acc;
          }, {})
        ).filter(([_, usersArr]: any) => usersArr.length > 1).sort((a: any, b: any) => b[1].length - a[1].length).map(([ip, usersArr]: any) => ({ ip, count: usersArr.length, users: usersArr.join(', ') }));

        const duplicateDevices = Object.entries(
          users.reduce((acc: any, u) => {
            if (u.device_id && u.device_id !== 'Unknown') {
              if (!acc[u.device_id]) acc[u.device_id] = [];
              acc[u.device_id].push(u.username);
            }
            return acc;
          }, {})
        ).filter(([_, usersArr]: any) => usersArr.length > 1).sort((a: any, b: any) => b[1].length - a[1].length).map(([dev, usersArr]: any) => ({ dev, count: usersArr.length, users: usersArr.join(', ') }));

        const networkTypes = Object.entries(
          pageViews.reduce((acc: any, pv) => {
            const nt = pv.network_type || 'Unknown';
            acc[nt] = (acc[nt] || 0) + 1;
            return acc;
          }, {})
        ).sort((a: any, b: any) => b[1] - a[1]).map(([type, count]) => ({ type, count }));

        const topOS = Object.entries(
          pageViews.reduce((acc: any, pv) => {
            const osName = pv.os || 'Unknown';
            acc[osName] = (acc[osName] || 0) + 1;
            return acc;
          }, {})
        ).sort((a: any, b: any) => b[1] - a[1]).map(([name, count]) => ({ name, count }));


        return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200 bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800">Live Traffic & Analytics</h2>
              <p className="text-sm text-slate-500">Monitor platform usage, referral clicks, and detect multiple accounts on same IP/Device.</p>
            </div>
            
            <div className="p-6 space-y-8">
              
              {/* Traffic by Date */}
              <div>
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Activity className="w-5 h-5 text-indigo-500" /> Total Visitors & Traffic by Date</h3>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="p-3 text-sm font-semibold text-slate-600">Date</th>
                        <th className="p-3 text-sm font-semibold text-slate-600">Total Page Views</th>
                        <th className="p-3 text-sm font-semibold text-slate-600">Unique Visitors</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {trafficByDate.length > 0 ? trafficByDate.map((row: any, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="p-3 text-sm font-medium text-slate-800">{row.date}</td>
                          <td className="p-3 text-sm text-slate-600">{row.views}</td>
                          <td className="p-3 text-sm text-slate-600 font-bold">{row.unique}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan={3} className="p-4 text-center text-sm text-slate-500">No traffic data available.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Traffic by Location */}
              <div>
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Activity className="w-5 h-5 text-blue-500" /> Traffic by Country / City</h3>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="p-3 text-sm font-semibold text-slate-600">Location</th>
                        <th className="p-3 text-sm font-semibold text-slate-600">Unique Visitors</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {trafficByLocation.length > 0 ? trafficByLocation.map((row: any, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="p-3 text-sm font-medium text-slate-800">{row.loc}</td>
                          <td className="p-3 text-sm text-slate-600 font-bold">{row.unique}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan={2} className="p-4 text-center text-sm text-slate-500">No location data available.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Referral Clicks */}
              <div>
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Activity className="w-5 h-5 text-orange-500" /> Referral Link Clicks</h3>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="p-3 text-sm font-semibold text-slate-600">Referral Code</th>
                        <th className="p-3 text-sm font-semibold text-slate-600">Total Clicks</th>
                        <th className="p-3 text-sm font-semibold text-slate-600">Unique Devices</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {refClicks.length > 0 ? refClicks.map((row: any, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="p-3 text-sm font-mono text-slate-800">{row.ref}</td>
                          <td className="p-3 text-sm text-slate-600">{row.clicks}</td>
                          <td className="p-3 text-sm text-slate-600 font-bold">{row.unique}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan={3} className="p-4 text-center text-sm text-slate-500">No referral clicks yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Multiple Accounts Detection */}
              <div>
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Shield className="w-5 h-5 text-red-500" /> Multiple Accounts Detection</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Duplicate IPs */}
                  <div className="border border-red-200 bg-red-50/30 rounded-xl overflow-hidden">
                    <div className="p-3 bg-red-50 border-b border-red-100 font-semibold text-sm text-red-800">Duplicate IP Addresses</div>
                    <div className="p-0 overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-red-100">
                            <th className="p-2 px-3 text-xs font-semibold text-slate-600">IP</th>
                            <th className="p-2 px-3 text-xs font-semibold text-slate-600">Accounts</th>
                            <th className="p-2 px-3 text-xs font-semibold text-slate-600">Usernames</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-red-100">
                          {duplicateIPs.length > 0 ? duplicateIPs.map((row: any, i) => (
                            <tr key={i}>
                              <td className="p-2 px-3 text-xs font-mono text-slate-800">{row.ip}</td>
                              <td className="p-2 px-3 text-xs font-bold text-red-600">{row.count}</td>
                              <td className="p-2 px-3 text-xs text-slate-600">{row.users}</td>
                            </tr>
                          )) : (
                            <tr><td colSpan={3} className="p-3 text-center text-xs text-slate-500">No duplicate IPs found.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Duplicate Devices */}
                  <div className="border border-red-200 bg-red-50/30 rounded-xl overflow-hidden">
                    <div className="p-3 bg-red-50 border-b border-red-100 font-semibold text-sm text-red-800">Duplicate Device IDs</div>
                    <div className="p-0 overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-red-100">
                            <th className="p-2 px-3 text-xs font-semibold text-slate-600">Device ID</th>
                            <th className="p-2 px-3 text-xs font-semibold text-slate-600">Accounts</th>
                            <th className="p-2 px-3 text-xs font-semibold text-slate-600">Usernames</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-red-100">
                          {duplicateDevices.length > 0 ? duplicateDevices.map((row: any, i) => (
                            <tr key={i}>
                              <td className="p-2 px-3 text-xs font-mono text-slate-800 truncate max-w-[100px]">{row.dev}</td>
                              <td className="p-2 px-3 text-xs font-bold text-red-600">{row.count}</td>
                              <td className="p-2 px-3 text-xs text-slate-600">{row.users}</td>
                            </tr>
                          )) : (
                            <tr><td colSpan={3} className="p-3 text-center text-xs text-slate-500">No duplicate Devices found.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

              </div>
              
              {/* Device Insights */}
              <div>
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Settings className="w-5 h-5 text-purple-500" /> Device Insights</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="border border-slate-200 bg-white rounded-xl p-4 flex flex-col items-center justify-center text-center">
                    <span className="text-sm font-semibold text-slate-500 mb-2">Top Operating Systems</span>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {topOS.map((os: any, i) => (
                        <div key={i} className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-medium">
                          {os.name}: <span className="font-bold">{os.count}</span>
                        </div>
                      ))}
                      {topOS.length === 0 && <span className="text-xs text-slate-400">No data</span>}
                    </div>
                  </div>
                  <div className="border border-slate-200 bg-white rounded-xl p-4 flex flex-col items-center justify-center text-center">
                    <span className="text-sm font-semibold text-slate-500 mb-2">Network Connections</span>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {networkTypes.map((nt: any, i) => (
                        <div key={i} className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-medium">
                          {nt.type}: <span className="font-bold">{nt.count}</span>
                        </div>
                      ))}
                      {networkTypes.length === 0 && <span className="text-xs text-slate-400">No data</span>}
                    </div>
                  </div>
                </div>
              </div>




            </div>
          </div>
        </div>
        );
      })()}

      {activeTab === 'feedbacks' && (() => {
        const handleDeleteFeedback = async (id: string) => {
          if (window.confirm('Are you sure you want to delete this feedback?')) {
            try {
              const adminToken = typeof window !== 'undefined' ? sessionStorage.getItem('admin_session_token') || '' : '';
              const apiRes = await fetch('/api/admin/feedbacks/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
                body: JSON.stringify({ id }),
              });
              const resData = await apiRes.json().catch(() => null);
              if (!apiRes.ok || !resData?.ok) {
                const { error } = await supabase.from('feedbacks').delete().eq('id', id);
                if (error) throw error;
              }
              alert('Feedback deleted successfully.');
              fetchData();
            } catch (err: any) {
              alert('Error deleting feedback: ' + err.message);
            }
          }
        };

        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-[#0F7A50]" />
                  User Feedbacks & Issues
                </h2>
                <p className="text-slate-500 text-xs sm:text-sm">View and manage issues or feedback submitted by registered users</p>
              </div>
              <div className="bg-[#e8fbf3] text-[#0F7A50] text-xs font-bold px-3 py-1.5 rounded-full border border-emerald-100 shrink-0">
                Total Feedbacks: {feedbacks.length}
              </div>
            </div>

            {feedbacks.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-sm flex flex-col items-center justify-center min-h-[300px]">
                <MessageSquare className="w-12 h-12 text-slate-300 mb-3" strokeWidth={1.5} />
                <p className="text-lg font-bold">No feedback yet</p>
                <p className="text-sm text-slate-400 mt-1">Users haven't submitted any feedback yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {feedbacks.map((item) => (
                  <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-4 mb-3 pb-3 border-b border-slate-100">
                        <div>
                          <p className="font-bold text-slate-800 text-sm sm:text-base">
                            {item.profiles?.username || 'Unknown User'}
                          </p>
                          <p className="text-slate-500 text-xs truncate max-w-[200px] sm:max-w-[280px]">
                            {item.profiles?.email || 'No Email'}
                          </p>
                          {item.profiles?.phone && (
                            <p className="text-slate-400 text-xs font-medium mt-0.5">
                              Phone: {item.profiles.phone}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteFeedback(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Feedback"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-100 font-medium">
                        {item.message}
                      </p>
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium mt-4 flex justify-between items-center">
                      <span>Submitted At: {new Date(item.created_at).toLocaleString()}</span>
                      <span className="text-[#0F7A50] font-bold bg-[#e8f3ef] px-2 py-0.5 rounded">Active</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {activeTab === 'messages' && (
        <AdminMessagesTab 
          users={users} 
          adminMessages={adminMessages} 
          fetchData={fetchData} 
        />
      )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface AdminMessagesTabProps {
  users: any[];
  adminMessages: any[];
  fetchData: () => void;
}

export function AdminMessagesTab({ users, adminMessages, fetchData }: AdminMessagesTabProps) {
  const [msgType, setMsgType] = useState<'broadcast' | 'direct'>('broadcast');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [messageText, setMessageText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleStartEdit = (msg: any) => {
    setEditingId(msg.id);
    setMsgType(msg.is_broadcast ? 'broadcast' : 'direct');
    setSelectedUser(msg.user_id || '');
    setMessageText(msg.message);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setMsgType('broadcast');
    setSelectedUser('');
    setMessageText('');
  };

  const handleSubmitMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) {
      alert('Please enter some message text.');
      return;
    }
    if (msgType === 'direct' && !selectedUser) {
      alert('Please select a recipient user.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No admin user found.');

      const payload: any = {
        sender_id: user.id,
        user_id: msgType === 'broadcast' ? null : selectedUser,
        message: messageText.trim(),
        is_broadcast: msgType === 'broadcast'
      };

      const adminToken = typeof window !== 'undefined' ? sessionStorage.getItem('admin_session_token') || '' : '';
      if (!editingId) {
        const apiRes = await fetch('/api/admin/messages/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
          body: JSON.stringify({
            message: messageText.trim(),
            is_broadcast: msgType === 'broadcast',
            user_id: msgType === 'broadcast' ? null : selectedUser,
            title: 'Admin Message',
          }),
        });
        const resData = await apiRes.json().catch(() => null);
        if (!apiRes.ok || !resData?.ok) {
          const { data, error } = await supabase.from('admin_messages').insert(payload).select('*').single();
          if (error) throw error;
        }
      } else {
        const { data, error } = await supabase.from('admin_messages').update(payload).eq('id', editingId).select('*').single();
        if (error) throw error;
      }
      alert('Message sent successfully.');

      handleCancelEdit();
      fetchData();
    } catch (err: any) {
      alert('Error saving message: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      try {
        const adminToken = typeof window !== 'undefined' ? sessionStorage.getItem('admin_session_token') || '' : '';
        const apiRes = await fetch('/api/admin/messages/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
          body: JSON.stringify({ id }),
        });
        const resData = await apiRes.json().catch(() => null);
        if (!apiRes.ok || !resData?.ok) {
          const { error } = await supabase
            .from('admin_messages')
            .delete()
            .eq('id', id);
          if (error) throw error;
        }
        alert('Message deleted successfully.');
        await broadcastChange('admin_messages', 'delete', { id });
        fetchData();
      } catch (err: any) {
        alert('Error deleting message: ' + err.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-[#0F7A50]" />
          {editingId ? 'Edit Message / Broadcast' : 'Create Message / Broadcast'}
        </h2>
        <p className="text-slate-500 text-xs sm:text-sm mt-0.5">Send alert/popup messages to all users or direct messages to a single user's profile.</p>

        <form onSubmit={handleSubmitMessage} className="mt-6 space-y-4 max-w-2xl">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200/80">
              <input
                type="radio"
                name="msgType"
                checked={msgType === 'broadcast'}
                onChange={() => setMsgType('broadcast')}
                className="text-emerald-600 focus:ring-emerald-500"
              />
              Broadcast (To All Users as Popup)
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200/80">
              <input
                type="radio"
                name="msgType"
                checked={msgType === 'direct'}
                onChange={() => setMsgType('direct')}
                className="text-emerald-600 focus:ring-emerald-500"
              />
              Direct Message (To Single User's Profile)
            </label>
          </div>

          {msgType === 'direct' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Select Recipient User</label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 font-medium text-slate-700"
              >
                <option value="">-- Choose User --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username || 'No Username'} ({u.phone || 'No Phone'} / {u.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Message Content</label>
            <textarea
              rows={4}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Enter announcement or private message content here..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 font-medium text-slate-700 placeholder:text-slate-400"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors"
            >
              {isSubmitting ? 'Saving...' : editingId ? 'Update Message' : 'Send Message'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-colors"
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <h3 className="text-lg font-bold text-slate-800">Sent Messages & Broadcasts</h3>
        {adminMessages.length === 0 ? (
          <p className="text-slate-400 text-sm py-4">No messages sent yet.</p>
        ) : (
          <div className="space-y-4">
            {adminMessages.map((msg) => (
              <div key={msg.id} className="border border-slate-150 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start gap-4 hover:bg-slate-50/50 transition-colors">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap gap-2 items-center">
                    {msg.is_broadcast ? (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                        📢 Broadcast (All Users)
                      </span>
                    ) : (
                      <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-blue-200">
                        👤 Direct Message (to {msg.profiles?.username || 'Unknown User'})
                      </span>
                    )}
                    <span className="text-slate-400 text-[11px] font-medium">
                      {new Date(msg.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-slate-700 text-sm font-medium whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                </div>
                <div className="flex gap-2 self-end sm:self-center shrink-0">
                  <button
                    onClick={() => handleStartEdit(msg)}
                    className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    title="Edit Message"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteMessage(msg.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete Message"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
