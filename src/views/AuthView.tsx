import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, Eye, EyeOff, ArrowRight, Phone, Hash, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { getDeviceId, getDeviceInfo, getHardwareFingerprint } from '../lib/tracking';
import { useSiteBranding, BRAND_ICON_PRESETS, renderBrandPresetIcon } from '../lib/branding';

export function AuthView({
  onLogin,
  initialMode = 'login',
  onBackToLanding,
}: {
  onLogin: () => void;
  initialMode?: 'login' | 'register';
  onBackToLanding?: () => void;
}) {
  const branding = useSiteBranding();
  const activePreset = BRAND_ICON_PRESETS.find((p) => p.key === branding.site_icon_preset) || BRAND_ICON_PRESETS[0];
  const [isLogin, setIsLogin] = useState(initialMode !== 'register');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');

  useEffect(() => {
    // Check if there's a referral code in the URL (e.g., ?ref=CODE123) or stored in localStorage
    const params = new URLSearchParams(window.location.search);
    let ref = params.get('ref');

    if (!ref) {
      const storedRef = localStorage.getItem('referred_by');
      const storedTime = localStorage.getItem('referred_by_time');
      if (storedRef && storedTime) {
        const elapsed = Date.now() - Number(storedTime);
        const TEN_MINUTES = 10 * 60 * 1000;
        if (elapsed < TEN_MINUTES) {
          ref = storedRef;
        } else {
          // Expired, clean it
          localStorage.removeItem('referred_by');
          localStorage.removeItem('referred_by_time');
        }
      }
    }

    if (ref) {
      setReferralCode(ref);
      setIsLogin(false); // Automatically switch to signup if they have a referral link
    } else {
      setIsLogin(initialMode !== 'register');
    }
  }, [initialMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const cleanEmail = email.trim();
      const cleanUsername = username.trim();

      if (isLogin) {
        let loginEmail = cleanEmail;
        
        // If the user entered a username instead of an email
        if (!loginEmail.includes('@')) {
          const { data, error } = await supabase.rpc('get_email_by_username', { p_username: loginEmail });
          if (error) throw error;
          if (!data) throw new Error("Username not found.");
          loginEmail = data;
        }

        let { error } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password: password,
        });

        if (error && error.message?.toLowerCase().includes('email not confirmed')) {
          // Auto-confirm via server API and retry!
          await fetch('/api/auth/auto-confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: loginEmail }),
          });
          const retry = await supabase.auth.signInWithPassword({
            email: loginEmail,
            password: password,
          });
          error = retry.error;
        }

        if (error) throw error;
        onLogin();
      } else {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }

        const deviceId = getDeviceId();
        const fingerprint = getHardwareFingerprint();
        const country = localStorage.getItem('user_country') || 'Pakistan';
        const city = localStorage.getItem('user_city') || 'Karachi';

        // 1. Register user via backend API with auto-confirmed email (with client SDK fallback)
        let registerSucceeded = false;
        try {
          const registerRes = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: cleanUsername,
              email: cleanEmail,
              password: password,
              phone: phone.trim(),
              referral_code: referralCode || null,
              device_id: deviceId,
              fingerprint,
              country,
              city,
            }),
          });

          const regData = await registerRes.json().catch(() => null);
          if (registerRes.ok && regData?.ok) {
            registerSucceeded = true;
          } else if (regData?.error) {
            throw new Error(regData.error);
          }
        } catch (apiErr: any) {
          // If it's a specific validation message (like username taken or invalid email), throw it
          if (
            apiErr.message &&
            !apiErr.message.includes('fetch') &&
            !apiErr.message.includes('Server error') &&
            !apiErr.message.includes('NetworkError')
          ) {
            throw apiErr;
          }
        }

        // Fallback: If backend API had network/server issue, signup directly via Supabase client
        if (!registerSucceeded) {
          const { error: signUpError } = await supabase.auth.signUp({
            email: cleanEmail,
            password: password,
            options: {
              data: {
                username: cleanUsername,
                phone: phone.trim(),
                referred_by: referralCode || null,
                device_id: deviceId,
                country,
                city,
              },
            },
          });
          if (signUpError) throw signUpError;
        }

        // Clear stored referral code on successful registration
        localStorage.removeItem('referred_by');
        localStorage.removeItem('referred_by_time');

        // 2. Sign in immediately with credentials
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password,
        });

        if (signInErr) {
          if (signInErr.message?.toLowerCase().includes('email not confirmed')) {
            try {
              await fetch('/api/auth/auto-confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: cleanEmail }),
              });
              const retry = await supabase.auth.signInWithPassword({
                email: cleanEmail,
                password: password,
              });
              if (retry.error) throw retry.error;
            } catch {
              throw new Error('Account ban gaya hai! Supabase Dashboard -> Authentication -> Providers -> Email mein "Confirm email" OFF karein.');
            }
          } else {
            throw signInErr;
          }
        }

        onLogin();
      }
    } catch (err: any) {
      let msg = err.message || 'An error occurred';
      if (msg === '{}' || msg.includes('AuthRetryableFetchError') || msg.includes('Database error')) {
        msg = 'This Username or Email is already registered. Please choose unique credentials.';
      }
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-y-auto overflow-x-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-64 bg-[#0F7A50] rounded-b-[40px] shadow-lg"></div>
      <div className="absolute top-10 right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
      <div className="absolute top-20 left-10 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>

      <div className="w-full max-w-md bg-white rounded-[32px] p-5 sm:p-6 shadow-xl relative z-10 border border-slate-100 mt-8 mb-8">
        {onBackToLanding && (
          <button
            type="button"
            onClick={onBackToLanding}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 px-3 py-1.5 rounded-xl transition-colors mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Website Overview & Plans</span>
          </button>
        )}
        <div className="text-center mb-5 pt-1">
          <div className="w-15 h-15 bg-[#e8f3ef] rounded-2xl mx-auto flex items-center justify-center mb-3 transform rotate-12 shadow-sm">
            <div 
              suppressHydrationWarning
              className={`w-11 h-11 bg-gradient-to-br ${activePreset.gradient} rounded-xl flex items-center justify-center transform -rotate-12 overflow-hidden shadow-sm`}
            >
              {branding.site_icon_preset === 'custom_image' && branding.site_logo_url ? (
                <img
                  src={branding.site_logo_url}
                  alt={branding.site_name || 'Earning Hub'}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = 'https://ik.imagekit.io/19imy4f1u/lite_1783801856823_8COA8zmhu.webp';
                  }}
                  className="w-full h-full object-cover"
                />
              ) : (
                renderBrandPresetIcon(branding.site_icon_preset, 22, 'text-white')
              )}
            </div>
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#0F7A50] mb-0.5">
            {branding.site_name}
          </p>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
            {isLogin ? 'Welcome Back!' : 'Create Account'}
          </h2>
          <p className="text-sm font-medium text-slate-500 mt-1">
            {isLogin ? branding.site_description || 'Login to continue earning' : 'Sign up to start your journey'}
          </p>
        </div>

        {errorMsg && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium mb-4 text-center">
            {errorMsg}
          </div>
        )}

        <form className="space-y-3" onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="pb-1">
              <label className="block text-[13px] font-medium text-slate-700 mb-1 ml-1">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User size={18} className="text-slate-400" />
                </div>
                <input 
                  type="text" 
                  required={!isLogin}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username" 
                  autoComplete="new-username"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-[15px] focus:outline-none focus:border-[#0F7A50] focus:bg-white transition-colors placeholder:text-slate-400 text-slate-800"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[13px] font-medium text-slate-700 mb-1 ml-1">
              {isLogin ? 'Email or Username' : 'Email Address'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                {isLogin ? <User size={18} className="text-slate-400" /> : <Mail size={18} className="text-slate-400" />}
              </div>
              <input 
                type={isLogin ? "text" : "email"} 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isLogin ? "name@example.com or username" : "name@example.com"} 
                autoComplete={isLogin ? "username" : "new-email"}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-[15px] focus:outline-none focus:border-[#0F7A50] focus:bg-white transition-colors placeholder:text-slate-400 text-slate-800"
              />
            </div>
          </div>

          {!isLogin && (
            <div className="pb-1">
              <label className="block text-[13px] font-medium text-slate-700 mb-1 ml-1">Phone Number (Optional)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Phone size={18} className="text-slate-400" />
                </div>
                <input 
                  type="tel" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 03000000000" 
                  autoComplete="new-phone"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-[15px] focus:outline-none focus:border-[#0F7A50] focus:bg-white transition-colors placeholder:text-slate-400 text-slate-800"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[13px] font-medium text-slate-700 mb-1 ml-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock size={18} className="text-slate-400" />
              </div>
              <input 
                type={showPassword ? "text" : "password"} 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password" 
                autoComplete={isLogin ? "current-password" : "new-password"}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-12 py-3 text-[15px] focus:outline-none focus:border-[#0F7A50] focus:bg-white transition-colors placeholder:text-slate-400 text-slate-800"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-[#0F7A50] transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {!isLogin && (
            <>
              <div className="pb-1">
                <label className="block text-[13px] font-medium text-slate-700 mb-1 ml-1">Confirm Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock size={18} className="text-slate-400" />
                  </div>
                  <input 
                    type={showConfirmPassword ? "text" : "password"} 
                    required={!isLogin}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password" 
                    autoComplete="new-password"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-12 py-3 text-[15px] focus:outline-none focus:border-[#0F7A50] focus:bg-white transition-colors placeholder:text-slate-400 text-slate-800"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-[#0F7A50] transition-colors cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="pb-1 mt-3">
                <label className="block text-[13px] font-medium text-slate-700 mb-1 ml-1">Referral Code (Optional)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Hash size={18} className="text-slate-400" />
                  </div>
                  <input 
                    type="text" 
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                    placeholder="Enter referral code" 
                    autoComplete="off"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-[15px] uppercase focus:outline-none focus:border-[#0F7A50] focus:bg-white transition-colors placeholder:text-slate-400 text-slate-800"
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full bg-[#0F7A50] hover:bg-[#0c6140] active:scale-[0.98] text-white font-semibold py-3.5 rounded-2xl shadow-md shadow-[#0F7A50]/20 transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            <span>{isLoading ? 'Please wait...' : (isLogin ? 'Login Now' : 'Create Account')}</span>
            {!isLoading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-[13px] font-medium text-slate-500">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button 
              onClick={() => {
                setIsLogin(!isLogin);
                setErrorMsg('');
              }}
              className="ml-1 text-[#0F7A50] font-bold hover:underline"
            >
              {isLogin ? 'Sign up' : 'Login'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
