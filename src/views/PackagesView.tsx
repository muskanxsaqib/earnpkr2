import React, { useState, useEffect } from 'react';
import { supabase, broadcastChange } from '../lib/supabase';
import { INVESTMENT_PLANS as fallbackPlans } from '../data';
import { parsePlansMetaJson, mergePlanWithMeta } from '../lib/economics';
import { fetchCurrentUserProfile } from '../lib/userProfile';
import { uploadToImageKit } from '../lib/imagekit';
import { CheckCircle2, Zap, Flame, Rocket, Diamond, Crown, Briefcase, ArrowLeft, Copy, Upload, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import CryptoJS from 'crypto-js';

const IconMap: Record<string, any> = {
  flame: Flame,
  rocket: Rocket,
  diamond: Diamond,
  crown: Crown,
  briefcase: Briefcase
};

const PAYMENT_METHODS = [
  { name: 'EasyPaisa', account: '03000000000', holder: 'Your Name' },
  { name: 'JazzCash', account: '03000000000', holder: 'Your Name' },
  { name: 'SadaPay', account: '03000000000', holder: 'Your Name' },
  { name: 'UPaisa', account: '03000000000', holder: 'Your Name' },
];

export function PackagesView() {
  const [plans, setPlans] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('cached_packages_list');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {}
    }
    return fallbackPlans.map((plan) => {
      const dynamicReferralBonus = plan.requiredReferrals * 50;
      const cycleReward = plan.dailyReturn * (plan.totalDays || 30);
      const dynamicTotalReward = cycleReward + dynamicReferralBonus;
      return {
        ...plan,
        cycleReward,
        referralBonus: dynamicReferralBonus,
        totalReward: dynamicTotalReward,
        badgeTag: '',
        isActive: true,
      };
    });
  });
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [referralBonusRate, setReferralBonusRate] = useState(50);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<any | null>(null);
  const [senderMethod, setSenderMethod] = useState('EasyPaisa');
  const [senderName, setSenderName] = useState('');
  const [senderAccount, setSenderAccount] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [submittedData, setSubmittedData] = useState<any>(null);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [isReinvesting, setIsReinvesting] = useState<boolean>(false);
  const [reinvestSuccessData, setReinvestSuccessData] = useState<any | null>(null);
  const [activeUserPlans, setActiveUserPlans] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('user_active_plans_cache');
        if (cached) return JSON.parse(cached);
      } catch (e) {}
    }
    return [];
  });

  // Clean up object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const compressImage = (file: File, maxWidth: number = 800, quality: number = 0.65): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error("Canvas context is null"));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Canvas blob conversion failed"));
            }
          }, 'image/jpeg', quality);
        };
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = event.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  };

  const isPlanActiveForUser = (plan: any) => {
    if (!activeUserPlans || activeUserPlans.length === 0 || !plan) return false;
    return activeUserPlans.some((up: any) => {
      const upPlanId = up.plan_id;
      const upPlanNum = up.plan?.plan_number;
      const upDbId = up.plan?.id;

      if (upPlanId !== undefined && upPlanId !== null) {
        if (plan.dbId && String(upPlanId) === String(plan.dbId)) return true;
        if (plan.planNumber && String(upPlanId) === String(plan.planNumber)) return true;
        if (plan.id && (String(upPlanId) === String(plan.id) || String(upPlanId) === String(plan.id).replace(/\D/g, ''))) return true;
      }

      if (upPlanNum !== undefined && upPlanNum !== null && plan.planNumber) {
        if (Number(upPlanNum) === Number(plan.planNumber)) return true;
      }
      if (upDbId !== undefined && upDbId !== null && plan.dbId) {
        if (String(upDbId) === String(plan.dbId)) return true;
      }

      return false;
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const originalFile = e.target.files[0];
      try {
        setIsSubmitting(true);
        // Show status of compressing
        const compressedBlob = await compressImage(originalFile);
        const compressedFile = new File([compressedBlob], originalFile.name.replace(/\.[^/.]+$/, "") + ".jpg", {
          type: 'image/jpeg',
          lastModified: Date.now()
        });
        setReceiptFile(compressedFile);
        const url = URL.createObjectURL(compressedFile);
        setPreviewUrl(url);
      } catch (err) {
        console.error("Compression failed, using original:", err);
        setReceiptFile(originalFile);
        const url = URL.createObjectURL(originalFile);
        setPreviewUrl(url);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleSubmitPayment = async () => {
    if (!senderName || !senderAccount || !receiptFile || !selectedPlanId || !selectedPaymentMethod) {
      alert('Please fill all fields and upload a screenshot.');
      return;
    }
    try {
      setIsSubmitting(true);
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError || !userData?.user) throw new Error('Not authenticated');

      // Ensure user profile exists using secure profile resolver
      const profile = await fetchCurrentUserProfile();
      if (!profile) {
        throw new Error('User profile could not be loaded. Please re-login and try again.');
      }

      // Upload to ImageKit / Storage
      const imageUrl = await uploadToImageKit(receiptFile);

      const selectedPlan = plans.find(p => p.id === selectedPlanId);
      if (!selectedPlan) throw new Error('Selected plan not found');

      // 1. Plan Self-healing Check
      let planDbId = selectedPlan.dbId;
      if (planDbId) {
        const { data: planCheck } = await supabase.from('plans').select('id').eq('id', planDbId).maybeSingle();
        if (!planCheck) {
          planDbId = null;
        }
      }

      if (!planDbId) {
        const planNum = parseInt(selectedPlanId.replace('plan_', ''), 10);
        const { data: pData } = await supabase.from('plans').select('id').eq('plan_number', planNum).maybeSingle();
        if (pData) {
          planDbId = pData.id;
        } else {
          // Fallback to any plan if table has them
          const { data: fallbackPlansList } = await supabase.from('plans').select('id').limit(1);
          if (fallbackPlansList && fallbackPlansList.length > 0) {
            planDbId = fallbackPlansList[0].id;
          } else {
            throw new Error('Plan not found in database. Please contact support.');
          }
        }
      }

      // 2. Payment Method Self-healing Check
      let paymentMethodDbId = selectedPaymentMethod.id;
      const { data: pmCheck } = await supabase.from('payment_methods').select('id').eq('id', paymentMethodDbId).maybeSingle();
      if (!pmCheck) {
        // Fallback to active payment methods in DB
        const { data: pmList } = await supabase.from('payment_methods').select('id').eq('is_active', true).limit(1);
        if (pmList && pmList.length > 0) {
          paymentMethodDbId = pmList[0].id;
        } else {
          // Dynamically create a payment method if empty
          const pmPayload: any = {
            method_name: selectedPaymentMethod.name,
            account_number: selectedPaymentMethod.account,
            is_active: true
          };
          pmPayload.account_title = selectedPaymentMethod.holder || 'Task Hub Earn';

          let pmRes = await supabase.from('payment_methods').insert(pmPayload).select('id').maybeSingle();
          let newPm = pmRes.data;
          let pmInsertErr = pmRes.error;

          if (pmInsertErr && (pmInsertErr.message?.includes('column "account_title" does not exist') || pmInsertErr.code === '42703')) {
            delete pmPayload.account_title;
            pmPayload.account_name = selectedPaymentMethod.holder || 'Task Hub Earn';
            pmRes = await supabase.from('payment_methods').insert(pmPayload).select('id').maybeSingle();
            newPm = pmRes.data;
            pmInsertErr = pmRes.error;
          }

          if (newPm) {
            paymentMethodDbId = newPm.id;
          } else {
            throw new Error(`Payment method error: ${pmInsertErr?.message || 'Unknown'}`);
          }
        }
      }

      const combinedSenderName = `${senderMethod} - ${senderName}`;

      const { error: insertError } = await supabase.from('deposits').insert({
        user_id: userData.user.id,
        plan_id: planDbId,
        platform_method_id: paymentMethodDbId,
        user_account_name: combinedSenderName,
        user_account_number: senderAccount,
        screenshot_url: imageUrl
      });

      if (insertError) throw insertError;

      // Broadcast the deposit insert so admin and other tabs update instantly
      await broadcastChange('deposits', 'insert', { user_id: userData.user.id });

      // Save submission details for the under review screen
      setSubmittedData({
        planName: selectedPlan.name,
        amount: selectedPlan.investAmount,
        method: senderMethod,
        sender: senderName,
        account: senderAccount,
        imageUrl: imageUrl || previewUrl
      });
      setShowSuccessScreen(true);

      // Clear the form fields
      setSenderName('');
      setSenderAccount('');
      setReceiptFile(null);
    } catch (err: any) {
      alert(err.message || 'Failed to submit payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReinvestWithBalance = async () => {
    const activeSelectedPlan = plans.find(p => p.id === selectedPlanId);
    if (!activeSelectedPlan) return;
    if (!confirm(`Are you sure you want to activate ${activeSelectedPlan.name} for Rs. ${activeSelectedPlan.investAmount.toLocaleString()} using your wallet balance?`)) return;

    setIsReinvesting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Not authenticated. Please re-login.');

      const res = await fetch('/api/plans/reinvest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ plan_id: activeSelectedPlan.dbId || activeSelectedPlan.planNumber || activeSelectedPlan.id })
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'Failed to activate plan via balance.');
      }

      setUserBalance(data.newBalance);
      await broadcastChange('user_plans', 'insert', { plan_id: activeSelectedPlan.dbId });
      await broadcastChange('profiles', 'update', { balance: data.newBalance });

      setReinvestSuccessData({
        planName: activeSelectedPlan.name,
        amount: activeSelectedPlan.investAmount,
        durationDays: data.duration_days || activeSelectedPlan.totalDays || 30,
      });
    } catch (err: any) {
      alert('Plan Activation Error: ' + (err.message || 'Unknown error'));
    } finally {
      setIsReinvesting(false);
    }
  };

  const checkPendingDeposit = async (currentPlans?: any[]) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;

      const { data: pending } = await supabase
        .from('deposits')
        .select('*')
        .eq('user_id', userData.user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (pending && pending.length > 0) {
        const dep = pending[0];
        const planList = currentPlans || plans;
        const matchingPlan = planList.find(p => p.dbId === dep.plan_id);
        
        setSubmittedData({
          planName: matchingPlan ? matchingPlan.name : `Plan #${dep.plan_id}`,
          amount: matchingPlan ? matchingPlan.investAmount : 0,
          method: dep.user_account_name ? dep.user_account_name.split(' - ')[0] : 'EasyPaisa',
          sender: dep.user_account_name || '',
          account: dep.user_account_number || '',
          imageUrl: dep.screenshot_url
        });
        setShowSuccessScreen(true);
      } else {
        setShowSuccessScreen(false);
        setSubmittedData(null);
      }
    } catch (e) {
      console.error("Error checking pending deposit:", e);
    }
  };

  const fetchPlansAndPayments = async () => {
    // Fetch app settings for referral bonus & plans metadata
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
    } catch (err) {
      console.error('Error fetching app settings for packages:', err);
    }
    setReferralBonusRate(refBonus);

    // Fetch Plans
    const { data: plansData } = await supabase.from('plans').select('*').order('plan_number', { ascending: true });
    let mappedPlans: any[] = [];
    if (plansData && plansData.length > 0) {
      mappedPlans = plansData
        .map((dbPlan, idx) => {
          const enriched = mergePlanWithMeta(dbPlan, idx, plansMetaMap, refBonus, baseMemberPrice);
          const dynamicReferralBonus = enriched.members_required * refBonus;
          const totalDays = enriched.total_days || 30;
          const cycleReward = enriched.thirty_day_reward || (enriched.daily_reward * totalDays);
          const dynamicTotalReward = enriched.user_total_reward || (cycleReward + dynamicReferralBonus);
          return {
            id: `plan_${enriched.plan_number}`,
            dbId: enriched.id,
            planNumber: enriched.plan_number,
            name: enriched.name || `Plan ${enriched.plan_number}`,
            investAmount: enriched.plan_price,
            dailyReturn: enriched.daily_reward,
            totalDays,
            cycleReward,
            requiredReferrals: enriched.members_required,
            referralBonus: dynamicReferralBonus,
            totalReward: dynamicTotalReward,
            icon: enriched.icon,
            theme: enriched.theme,
            badgeTag: enriched.badge_tag || '',
            isActive: enriched.is_active !== false
          };
        })
        .filter(p => p.isActive);
      setPlans(mappedPlans);
      try {
        localStorage.setItem('cached_packages_list', JSON.stringify(mappedPlans));
      } catch (e) {}
    } else {
      mappedPlans = fallbackPlans.map((plan) => {
        const dynamicReferralBonus = plan.requiredReferrals * refBonus;
        const cycleReward = plan.dailyReturn * plan.totalDays;
        const dynamicTotalReward = cycleReward + dynamicReferralBonus;
        return {
          ...plan,
          cycleReward,
          referralBonus: dynamicReferralBonus,
          totalReward: dynamicTotalReward,
          badgeTag: (plan as any).badge_tag || '',
          isActive: true
        };
      });
      setPlans(mappedPlans);
      try {
        localStorage.setItem('cached_packages_list', JSON.stringify(mappedPlans));
      } catch (e) {}
    }

    let foundActivePlans: any[] = [];
    try {
      const userProf = await fetchCurrentUserProfile();
      if (userProf) {
        setUserBalance(Number(userProf.balance || 0));
        if (userProf.active_plans && Array.isArray(userProf.active_plans) && userProf.active_plans.length > 0) {
          foundActivePlans = userProf.active_plans;
          setActiveUserPlans(foundActivePlans);
          try {
            localStorage.setItem('user_active_plans_cache', JSON.stringify(foundActivePlans));
          } catch (e) {}
        }
      }
    } catch (e) {
      console.warn('Error fetching user balance for packages:', e);
    }

    // Fetch Payment Methods
    const { data: paymentsData, error: pmError } = await supabase.from('payment_methods').select('*').eq('is_active', true).neq('method_name', 'SYSTEM_SECURITY').order('id', { ascending: true });
    if (!pmError && paymentsData) {
      setPaymentMethods(paymentsData.map(p => ({
        id: p.id,
        name: p.method_name,
        account: p.account_number,
        holder: p.account_name || p.account_title || ''
      })));
    } else {
      setPaymentMethods(PAYMENT_METHODS.map((p, idx) => ({ ...p, id: idx + 1 })));
    }

    // Fetch Active User Plans & Approved Deposits via session
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUserId = sessionData?.session?.user?.id;
      if (currentUserId) {
        const { data: userPlansData } = await supabase
          .from('user_plans')
          .select('id, plan_id, status, plan:plans(id, plan_number)')
          .eq('user_id', currentUserId)
          .eq('status', 'active');

        let allActive: any[] = userPlansData && userPlansData.length > 0 ? [...userPlansData] : [...foundActivePlans];

        // Fallback: also include approved deposits if user_plans row is still propagating
        const { data: appDeposits } = await supabase
          .from('deposits')
          .select('id, plan_id, status')
          .eq('user_id', currentUserId)
          .eq('status', 'approved');

        if (appDeposits && appDeposits.length > 0) {
          const knownPlanIds = new Set(allActive.map(p => String(p.plan_id)));
          for (const dep of appDeposits) {
            if (dep.plan_id && !knownPlanIds.has(String(dep.plan_id))) {
              allActive.push({ id: dep.id, plan_id: dep.plan_id, status: 'active', plan: null });
            }
          }
        }

        if (allActive.length > 0) {
          setActiveUserPlans(allActive);
          try {
            localStorage.setItem('user_active_plans_cache', JSON.stringify(allActive));
          } catch (e) {}
        }
      }
    } catch (err) {
      console.warn('Error fetching active user plans for packages:', err);
    }

    await checkPendingDeposit(mappedPlans);
  };

  useEffect(() => {
    fetchPlansAndPayments();

    // Set up real-time subscriptions for plans, payment methods, deposits, and user_plans
    const channel = supabase
      .channel('packages-realtime-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'plans' },
        () => {
          fetchPlansAndPayments();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payment_methods' },
        () => {
          fetchPlansAndPayments();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deposits' },
        () => {
          fetchPlansAndPayments();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_plans' },
        () => {
          fetchPlansAndPayments();
        }
      )
      .on(
        'broadcast',
        { event: 'db_change' },
        (payload) => {
          console.log('Packages view received real-time broadcast sync:', payload);
          fetchPlansAndPayments();
        }
      )
      .subscribe();

    // Listen to Auth state changes to refresh active plans as soon as session is ready
    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchPlansAndPayments();
      }
    });

    return () => {
      supabase.removeChannel(channel);
      authSub?.subscription.unsubscribe();
    };
  }, []);

  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  if (showSuccessScreen && submittedData) {
    return (
      <motion.div 
        key="payment-success"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="min-h-full bg-slate-50 p-4 space-y-6 pb-20 flex flex-col justify-center"
      >
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md text-center space-y-4 max-w-md mx-auto w-full">
          <div className="mx-auto w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center border border-amber-100">
            <Clock size={32} className="text-amber-500 animate-pulse" />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-bold text-slate-800">Payment Under Review!</h3>
            <p className="text-[13px] text-slate-500">Your deposit request is submitted and under review.</p>
          </div>

          <div className="bg-amber-50/60 border border-amber-100 rounded-2xl p-2.5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-amber-700">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
            <span>Status: Pending Approval (Under Review)</span>
          </div>

          <div className="border-t border-dashed border-slate-200 pt-4 space-y-3 text-left">
            <p className="text-[14px] font-bold text-slate-800">Transaction Summary:</p>
            
            <div className="flex justify-between items-center text-[13px]">
              <span className="text-slate-500">Plan:</span>
              <span className="font-bold text-slate-800">{submittedData.planName}</span>
            </div>

            <div className="flex justify-between items-center text-[13px]">
              <span className="text-slate-500">Amount:</span>
              <span className="font-bold text-[#0F7A50]">PKR {submittedData.amount}</span>
            </div>

            <div className="flex justify-between items-center text-[13px]">
              <span className="text-slate-500">Method:</span>
              <span className="font-medium text-slate-800">{submittedData.method}</span>
            </div>

            <div className="flex justify-between items-center text-[13px]">
              <span className="text-slate-500">Sender Name:</span>
              <span className="font-medium text-slate-800">{submittedData.sender}</span>
            </div>

            <div className="flex justify-between items-center text-[13px]">
              <span className="text-slate-500">Account / TXN ID:</span>
              <span className="font-mono text-[12px] text-slate-800">{submittedData.account}</span>
            </div>

            {submittedData.imageUrl && (
              <div className="mt-3">
                <span className="text-slate-500 text-[13px] block mb-1">Receipt Screenshot:</span>
                <div className="w-full h-32 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                  <img src={submittedData.imageUrl} alt="Uploaded Receipt" className="w-full h-full object-contain" />
                </div>
              </div>
            )}
          </div>

          <button 
            onClick={() => {
              setShowSuccessScreen(false);
              setSubmittedData(null);
              setSelectedPaymentMethod(null);
              setSelectedPlanId(null);
            }}
            className="w-full bg-[#0F7A50] hover:bg-[#0c6140] text-white font-semibold py-3 rounded-xl shadow-sm transition-colors mt-4 text-[14px]"
          >
            Go Back to Plans
          </button>
        </div>
      </motion.div>
    );
  }

  if (reinvestSuccessData) {
    return (
      <motion.div
        key="reinvest-success"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="min-h-full bg-slate-50 p-4 space-y-4 pb-20 flex flex-col items-center justify-center text-center"
      >
        <div className="bg-white border border-emerald-200 rounded-3xl p-6 sm:p-8 shadow-xl max-w-md w-full space-y-4">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 size={36} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800">Plan Activated Instantly!</h3>
            <p className="text-xs font-semibold text-emerald-700 mt-1">Paid directly with Wallet Balance</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Plan Name:</span>
              <span className="font-bold text-slate-900">{reinvestSuccessData.planName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Amount Paid:</span>
              <span className="font-bold text-emerald-600">Rs. {reinvestSuccessData.amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Duration:</span>
              <span className="font-bold text-slate-900">{reinvestSuccessData.durationDays} Days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Remaining Balance:</span>
              <span className="font-bold text-slate-900">Rs. {userBalance.toLocaleString()}</span>
            </div>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-800 text-[11px] font-medium leading-relaxed">
            ✨ Day 1 reward foran unlock ho chuka hai! Abhi My Plans mein ja kar apna reward claim karein.
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <a
              href="/my-plans"
              className="w-full bg-[#0F7A50] hover:bg-[#0c6140] text-white font-bold py-3 rounded-xl shadow-md transition-all text-sm block"
            >
              Go to My Plans & Claim Reward
            </a>
            <button
              type="button"
              onClick={() => {
                setReinvestSuccessData(null);
                setSelectedPlanId(null);
                fetchPlansAndPayments();
              }}
              className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-xs cursor-pointer"
            >
              Back to Store
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  if (selectedPaymentMethod && selectedPlan) {
    return (
      <motion.div 
        key="payment-submit"
        initial={{ opacity: 0, x: 20, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: -20, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="min-h-full bg-slate-50 p-4 space-y-4 pb-20"
      >
        <button onClick={() => setSelectedPaymentMethod(null)} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors pt-2">
          <ArrowLeft size={18} />
          <span className="text-[13px] font-medium">Back to Plans</span>
        </button>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[15px] font-bold text-slate-800 mb-4">Send payment to:</p>
          <p className="text-[13px] text-slate-500 mb-1">{selectedPaymentMethod.name}</p>
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
            <div>
              <p className="font-bold text-[15px] text-slate-800">{selectedPaymentMethod.account}</p>
              <p className="text-[11px] text-slate-500">{selectedPaymentMethod.holder}</p>
            </div>
            <button className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
              <Copy size={16} />
            </button>
          </div>
          <p className="text-[13px] text-slate-600 mt-4 leading-relaxed">
            Send <span className="font-bold">Rs. {selectedPlan.investAmount}</span> to the account above, then submit the transaction ID and screenshot below.
          </p>
        </div>

        <div className="space-y-4">
          {successMessage && (
            <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl border border-emerald-100 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <p className="text-sm font-medium">{successMessage}</p>
            </div>
          )}
          
          <div>
            <label className="block text-[13px] font-medium text-slate-800 mb-1.5">Your Payment App / Method</label>
            <select
              value={senderMethod}
              onChange={e => setSenderMethod(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[15px] focus:outline-none focus:border-[#0F7A50] focus:ring-1 focus:ring-[#0F7A50] transition-shadow"
            >
              <option value="EasyPaisa">EasyPaisa</option>
              <option value="JazzCash">JazzCash</option>
              <option value="SadaPay">SadaPay</option>
              <option value="NayaPay">NayaPay</option>
              <option value="UPaisa">UPaisa</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-slate-800 mb-1.5">Your Account Name</label>
            <input 
              type="text" 
              value={senderName}
              onChange={e => setSenderName(e.target.value)}
              placeholder="e.g. Your Name" 
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[15px] focus:outline-none focus:border-[#0F7A50] focus:ring-1 focus:ring-[#0F7A50] transition-shadow placeholder:text-slate-400"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-slate-800 mb-1.5">Your Account Number / TXN ID</label>
            <input 
              type="text" 
              value={senderAccount}
              onChange={e => setSenderAccount(e.target.value)}
              placeholder="e.g. 03000000000 or TXN00000000" 
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[15px] focus:outline-none focus:border-[#0F7A50] focus:ring-1 focus:ring-[#0F7A50] transition-shadow placeholder:text-slate-400"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-slate-800 mb-1.5">Payment Screenshot</label>
            <label className="relative border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center bg-slate-50/50 cursor-pointer hover:bg-slate-50 transition-colors overflow-hidden min-h-[160px]">
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              {previewUrl ? (
                <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-white">
                  <img src={previewUrl} alt="Receipt Preview" className="w-full h-full object-contain" />
                  <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[11px] px-2.5 py-1.5 rounded-lg flex items-center gap-1 backdrop-blur-sm">
                    <Upload size={12} />
                    <span>Change</span>
                  </div>
                </div>
              ) : (
                <>
                  <Upload size={24} className="text-slate-400 mb-2" />
                  <p className="text-[13px] text-slate-500 text-center">
                    Tap to upload screenshot
                  </p>
                </>
              )}
            </label>
          </div>

          <button 
            onClick={handleSubmitPayment}
            disabled={isSubmitting}
            className="w-full bg-[#0F7A50] hover:bg-[#0c6140] disabled:bg-slate-300 text-white font-semibold py-3.5 rounded-xl shadow-sm transition-colors mt-2"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Payment'}
          </button>
        </div>
      </motion.div>
    );
  }

  if (selectedPlan) {
    return (
      <motion.div 
        key="payment-methods"
        initial={{ opacity: 0, x: 20, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: -20, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="min-h-full bg-slate-50 p-4 space-y-4 pb-20"
      >
        <button onClick={() => setSelectedPlanId(null)} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors pt-2">
          <ArrowLeft size={18} />
          <span className="text-[13px] font-medium">Back to Plans</span>
        </button>

        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
          <div className="bg-[#0F7A50] p-4 text-white">
            <p className="text-[11px] font-medium uppercase tracking-wider mb-0.5 text-white/80">
              {isPlanActiveForUser(selectedPlan) ? "You're Re-investing / Stacking (Already Active)" : "You're Buying"}
            </p>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xl font-bold">{selectedPlan.name}</h3>
              {isPlanActiveForUser(selectedPlan) && (
                <span className="bg-white text-emerald-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 shrink-0">
                  <CheckCircle2 size={12} strokeWidth={3} />
                  <span>Current Plan</span>
                </span>
              )}
            </div>
          </div>
          <div className="flex justify-between items-center p-4">
            <div className="text-center">
               <p className="text-[10px] text-slate-500 font-bold uppercase mb-0.5">Invest</p>
               <p className="font-bold text-[15px] text-slate-800">Rs. {selectedPlan.investAmount}</p>
            </div>
            <div className="w-px h-8 bg-slate-200"></div>
            <div className="text-center">
               <p className="text-[10px] text-slate-500 font-bold uppercase mb-0.5">Daily</p>
               <p className="font-bold text-[15px] text-[#0F7A50]">Rs. {selectedPlan.dailyReturn}</p>
            </div>
             <div className="w-px h-8 bg-slate-200"></div>
            <div className="text-center">
               <p className="text-[10px] text-slate-500 font-bold uppercase mb-0.5">Days</p>
               <p className="font-bold text-[15px] text-slate-800">{selectedPlan.totalDays}</p>
            </div>
          </div>
        </div>

        {/* 1-Click Pay with Wallet Balance */}
        <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-white border border-emerald-200 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-600/20 shrink-0">
                <Zap size={20} />
              </div>
              <div>
                <h4 className="font-bold text-[14px] text-slate-900">Pay with Wallet Balance</h4>
                <p className="text-[11px] text-slate-500">
                  Your Balance: <span className="font-bold text-emerald-700">Rs. {userBalance.toLocaleString()}</span>
                </p>
              </div>
            </div>
            {userBalance >= selectedPlan.investAmount ? (
              <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full uppercase">
                Instant 1s
              </span>
            ) : (
              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                Needs Rs. {(selectedPlan.investAmount - userBalance).toLocaleString()} more
              </span>
            )}
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Directly apne wallet balance se plan buy karein bina EasyPaisa deposit bheje ya admin approval ka intezar kiye!
          </p>

          {userBalance >= selectedPlan.investAmount ? (
            <button
              type="button"
              disabled={isReinvesting}
              onClick={handleReinvestWithBalance}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isReinvesting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Activating Plan...</span>
                </>
              ) : (
                <>
                  <Zap size={16} />
                  <span>Activate Plan with Balance (Rs. {selectedPlan.investAmount.toLocaleString()})</span>
                </>
              )}
            </button>
          ) : (
            <div className="text-[11px] text-slate-500 bg-white/70 p-2.5 rounded-xl border border-slate-200">
              Aapke account mein Rs. {(selectedPlan.investAmount - userBalance).toLocaleString()} kam hain. Neeche EasyPaisa ya JazzCash se manual payment karein.
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 my-1">
          <div className="flex-1 h-px bg-slate-200"></div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">OR MANUAL DEPOSIT VIA WALLET / BANK</span>
          <div className="flex-1 h-px bg-slate-200"></div>
        </div>

        <div>
          <h3 className="font-bold text-[15px] text-slate-800">Select Payment Method</h3>
          <p className="text-[13px] text-slate-500 mb-3">Tap a number to copy, or pick a method to continue.</p>
          
          <div className="space-y-3">
            {paymentMethods.map((method, idx) => (
              <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div>
                  <p className="font-bold text-[14px] text-slate-800 mb-0.5">{method.name}</p>
                  <p className="text-[13px] font-bold text-slate-800">{method.account}</p>
                  {method.holder && <p className="text-[11px] text-slate-500 font-medium">{method.holder}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100">
                    <Copy size={16} />
                  </button>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSelectedPaymentMethod(method)}
                    className="bg-[#0F7A50] text-white font-medium text-[13px] px-4 py-2 rounded-lg hover:bg-[#0c6140] transition-colors"
                  >
                    Pay
                  </motion.button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="p-4 space-y-6 pb-12"
    >
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight drop-shadow-sm mb-1">{plans.length || 10} Reward Plans</h2>
          <p className="text-[13px] font-medium text-slate-600 bg-white/70 px-3 py-2.5 rounded-xl border border-white backdrop-blur-sm leading-relaxed shadow-sm">
            Earn more every day! Choose a plan and invite friends to maximize your total user reward.
          </p>
        </div>

        {/* Active Plan Status Banner for Logged In User */}
        {activeUserPlans.length > 0 && (
          <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow-md shadow-emerald-600/20">
                <CheckCircle2 size={20} strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-black text-slate-900">
                    Aapka Current Plan Active Hai
                  </span>
                  <span className="text-[10px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {activeUserPlans.length} Active
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-600 font-medium">
                  Active plan par <span className="font-bold text-emerald-700">"✓ Current Plan"</span> ka green badge highlight hai. Daily reward claim karne ke liye button dabayein.
                </p>
              </div>
            </div>
            <a
              href="/my-plans"
              className="shrink-0 inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md shadow-emerald-600/20 transition-all active:scale-95 text-center"
            >
              <span>Go to My Plans & Claim</span>
              <ArrowLeft className="rotate-180" size={14} />
            </a>
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
        {plans.map((plan, index) => {
          const PlanIcon = IconMap[plan.icon] || Zap;
          const cycleRewardVal = plan.cycleReward || (plan.dailyReturn * plan.totalDays);
          const totalRewardVal = plan.totalReward || (cycleRewardVal + plan.referralBonus);
          const isCurrentPlan = isPlanActiveForUser(plan);

          return (
            <motion.div 
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + (index * 0.1) }}
              className={`rgb-container shadow-[0_10px_30px_rgba(0,0,0,0.15)] transition-all ${
                isCurrentPlan ? 'ring-4 ring-emerald-500 ring-offset-2 ring-offset-slate-50' : ''
              }`}
            >
              <div className="bg-white/90 backdrop-blur-xl rounded-[22px] overflow-hidden w-full h-full flex flex-col justify-between">
                {/* Active Plan Top Ribbon */}
                {isCurrentPlan && (
                  <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 text-white text-[11px] font-black py-1.5 px-3 flex items-center justify-between tracking-wide shadow-xs border-b border-emerald-500/30">
                    <div className="flex items-center gap-1.5 uppercase">
                      <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                      <CheckCircle2 size={13} strokeWidth={3} className="text-white" />
                      <span>Your Current Active Plan</span>
                    </div>
                    <span className="bg-white/20 backdrop-blur-xs text-white text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      Active
                    </span>
                  </div>
                )}

                {/* Card Header */}
                <div className={`relative bg-gradient-to-r ${plan.theme.from} ${plan.theme.to} p-4 flex items-center justify-between gap-3 overflow-hidden`}>
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20 shrink-0">
                      <PlanIcon className="text-white drop-shadow-sm" size={24} strokeWidth={2} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <h3 className="text-[19px] font-bold text-white leading-tight drop-shadow-sm">{plan.name}</h3>
                        {isCurrentPlan && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-300 text-emerald-950 shadow-md border border-emerald-100 inline-flex items-center gap-1 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-950 animate-ping"></span>
                            <span>Current Active Plan</span>
                          </span>
                        )}
                      </div>
                      <p className="text-white/90 text-xs font-medium">Rs. {plan.investAmount.toLocaleString()} • {plan.totalDays} Days</p>
                    </div>
                  </div>
                  {plan.badgeTag && (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white text-slate-950 shadow-md shrink-0 border border-white/40">
                      {plan.badgeTag}
                    </span>
                  )}
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between bg-slate-50 rounded-2xl py-3 px-4 mb-5 border border-slate-100 shadow-inner">
                      <div className="text-center">
                        <p className="text-[9px] uppercase text-slate-400 font-bold tracking-widest mb-0.5">Invest</p>
                        <p className="font-bold text-sm text-slate-800">
                          {plan.investAmount.toLocaleString()}<span className="text-[9px] text-slate-400 font-normal ml-0.5">PKR</span>
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] uppercase text-slate-400 font-bold tracking-widest mb-0.5">Daily</p>
                        <p className={`font-bold text-sm text-[#0F7A50]`}>
                          {plan.dailyReturn.toLocaleString()}<span className="text-[9px] text-slate-400 font-normal ml-0.5">PKR</span>
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] uppercase text-slate-400 font-bold tracking-widest mb-0.5">Total</p>
                        <p className="font-bold text-sm text-slate-800">
                          {totalRewardVal.toLocaleString()}<span className="text-[9px] text-slate-400 font-normal ml-0.5">PKR</span>
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-6">
                      {[
                        `${plan.totalDays}-Day Reward: Rs. ${cycleRewardVal.toLocaleString()}`,
                        `Members Required: ${plan.requiredReferrals}`,
                        `Free Bonus: Rs. ${plan.referralBonus.toLocaleString()} (${referralBonusRate}x Members)`,
                        `User Total Reward: Rs. ${totalRewardVal.toLocaleString()}`
                      ].map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2.5 text-[13px] font-medium text-slate-600">
                          <CheckCircle2 size={16} className="text-[#0F7A50]" strokeWidth={2.5} />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {isCurrentPlan ? (
                    <div className="space-y-2">
                      <a
                        href="/my-plans"
                        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 text-center text-sm active:scale-98"
                      >
                        <CheckCircle2 size={18} strokeWidth={2.5} />
                        <span>Current Plan (View & Claim)</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => setSelectedPlanId(plan.id)}
                        className="w-full text-slate-500 hover:text-slate-800 text-[11px] font-bold text-center transition-colors underline cursor-pointer py-0.5 block"
                      >
                        + Buy Again / Stacking
                      </button>
                    </div>
                  ) : (
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className="w-full bg-[#0F7A50] text-white font-semibold py-3.5 rounded-xl transition-all shadow-md shadow-[#0F7A50]/20 hover:bg-[#0c6140]"
                    >
                      Invest Rs. {plan.investAmount.toLocaleString()}
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
