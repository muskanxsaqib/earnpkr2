import React, { useState, useEffect } from 'react';
import { Shield, Lock, User, Eye, EyeOff, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { hashSHA256, isSHA256 } from '../lib/crypto';

interface AdminSecurityGateProps {
  onUnlock: () => void;
}

export function AdminSecurityGate({ onUnlock }: AdminSecurityGateProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if session storage already has unlock state for seamless navigation
  useEffect(() => {
    const isUnlocked = sessionStorage.getItem('admin_gate_unlocked') === 'true';
    if (isUnlocked) {
      onUnlock();
    } else {
      setInitializing(false);
    }
  }, [onUnlock]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Authenticate against secure backend route
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.ok && data?.admin_token) {
        sessionStorage.setItem('admin_gate_unlocked', 'true');
        sessionStorage.setItem('admin_session_token', data.admin_token);
        onUnlock();
      } else {
        setError(data?.error || 'Invalid username or password. Access Denied.');
      }
    } catch (err: any) {
      console.error('Security verification error:', err);
      setError('An error occurred during authentication. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 bg-slate-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', duration: 0.5 }}
        className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100 max-w-md w-full relative overflow-hidden"
      >
        {/* Visual Header / Lock Graphic */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-100 shadow-inner">
            <Shield className="w-8 h-8 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Double Lock Protection</h2>
          <p className="text-sm text-slate-500 mt-1.5">Please provide secondary security credentials to unlock administrative access.</p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-rose-50 text-rose-700 text-xs font-semibold p-3.5 rounded-xl border border-rose-100 mb-6"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Username</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <User size={18} />
              </span>
              <input
                type="text"
                required
                disabled={loading}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter security username"
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 hover:bg-slate-50/70 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-2xl text-[14px] font-medium transition-colors focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Password</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Lock size={18} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                disabled={loading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter security password"
                className="w-full pl-11 pr-12 py-3.5 bg-slate-50 hover:bg-slate-50/70 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-2xl text-[14px] font-medium transition-colors focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl transition-colors shadow-sm flex items-center justify-center gap-2 mt-2 disabled:bg-slate-300"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Verifying Credentials...
              </>
            ) : (
              <>
                <Shield className="w-5 h-5 text-indigo-400" />
                Unlock Dashboard
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
