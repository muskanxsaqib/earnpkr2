import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ExternalLink, Clock, CheckCircle2, ShieldCheck, X, Play, Globe, MessageCircle, Send, Sparkles } from 'lucide-react';
import { DailyVerificationTask } from '../lib/platformFeatures';

interface TaskVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: DailyVerificationTask;
  dayNumber: number;
  rewardAmount: number;
  planName?: string;
  isCollecting?: boolean;
  onVerifiedCollect: () => void;
}

export function TaskVerificationModal({
  isOpen,
  onClose,
  task,
  dayNumber,
  rewardAmount,
  planName,
  isCollecting = false,
  onVerifiedCollect,
}: TaskVerificationModalProps) {
  const totalSeconds = Math.max(3, Number(task?.timer_seconds) || 15);
  const [hasOpenedLink, setHasOpenedLink] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setHasOpenedLink(false);
      setSecondsLeft(Math.max(3, Number(task?.timer_seconds) || 15));
      setIsCompleted(false);
    }
  }, [isOpen, task]);

  useEffect(() => {
    if (!isOpen || !hasOpenedLink || isCompleted) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsCompleted(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, hasOpenedLink, isCompleted]);

  const handleStartTask = () => {
    const url = task?.url?.trim() || 'https://www.google.com';
    window.open(url, '_blank', 'noopener,noreferrer');
    if (!hasOpenedLink) {
      setHasOpenedLink(true);
    }
  };

  const progressPercent = hasOpenedLink
    ? Math.min(100, Math.round(((totalSeconds - secondsLeft) / totalSeconds) * 100))
    : 0;

  const getCategoryBadge = () => {
    switch (task?.category) {
      case 'youtube':
        return { label: 'YouTube Video Task', icon: <Play size={14} className="text-rose-600" />, bg: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'whatsapp':
        return { label: 'WhatsApp Channel Task', icon: <MessageCircle size={14} className="text-emerald-600" />, bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'telegram':
        return { label: 'Telegram Channel Task', icon: <Send size={14} className="text-sky-600" />, bg: 'bg-sky-50 text-sky-700 border-sky-200' };
      case 'tiktok':
        return { label: 'TikTok Video Task', icon: <Sparkles size={14} className="text-purple-600" />, bg: 'bg-purple-50 text-purple-700 border-purple-200' };
      default:
        return { label: 'Partner Link Task', icon: <Globe size={14} className="text-indigo-600" />, bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    }
  };

  const catBadge = getCategoryBadge();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.18 }}
            className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100"
          >
            {/* Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 block">
                    {planName ? `${planName} · Day ${dayNumber}` : `Day ${dayNumber} Reward Verification`}
                  </span>
                  <h3 className="text-base font-extrabold text-white leading-tight">
                    Complete Task to Claim Rs. {rewardAmount}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Task Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${catBadge.bg}`}>
                    {catBadge.icon}
                    {catBadge.label}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-600 tabular-nums flex items-center gap-1">
                    <Clock size={13} className="text-amber-500" />
                    {totalSeconds}s Timer
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-900 leading-snug">
                  {task?.title || 'Watch Official Partner Link & Complete Timer'}
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Apna <strong>Day {dayNumber} (Rs. {rewardAmount})</strong> reward collect karne ke liye niche button daba kar link open karein aur <strong>{totalSeconds} seconds</strong> timer mukammal karein.
                </p>
              </div>

              {/* Step 1: Open Link & Timer Status */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleStartTask}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    hasOpenedLink
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20'
                  }`}
                >
                  <ExternalLink size={16} />
                  <span>
                    {hasOpenedLink ? 'Re-Open Task Link in New Tab' : 'Step 1: Open Task Link & Start Timer'}
                  </span>
                </button>

                {/* Live Timer Progress Bar */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-600">
                      {!hasOpenedLink
                        ? 'Waiting to open task link...'
                        : isCompleted
                        ? 'Task Verified! Ready to Claim'
                        : 'Verifying Task Engagement...'}
                    </span>
                    <span
                      className={`font-mono font-black text-sm tabular-nums ${
                        isCompleted
                          ? 'text-emerald-600'
                          : hasOpenedLink
                          ? 'text-amber-600'
                          : 'text-slate-400'
                      }`}
                    >
                      {isCompleted ? '00:00 ✓' : `00:${String(secondsLeft).padStart(2, '0')}`}
                    </span>
                  </div>

                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        isCompleted ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Claim Reward Button */}
              <button
                type="button"
                disabled={!isCompleted || isCollecting}
                onClick={onVerifiedCollect}
                className={`w-full py-3.5 px-5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
                  isCompleted
                    ? 'bg-[#0F7A50] hover:bg-[#0c6140] text-white shadow-lg shadow-[#0F7A50]/25 cursor-pointer active:scale-98'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 size={18} />
                <span>
                  {isCollecting
                    ? 'Crediting Wallet...'
                    : isCompleted
                    ? `Step 2: Verify & Collect Rs. ${rewardAmount}`
                    : `Complete ${secondsLeft}s Timer to Unlock Claim`}
                </span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
