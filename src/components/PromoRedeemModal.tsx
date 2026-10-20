import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Ticket, Gift, CheckCircle2, AlertCircle, X, Sparkles } from 'lucide-react';
import { secureApiCall } from '../lib/api';

interface PromoRedeemModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  username?: string;
  hasActivePlan: boolean;
  onSuccessRedeem: (amount: number, code: string) => void;
}

export function PromoRedeemModal({
  isOpen,
  onClose,
  userId,
  username,
  hasActivePlan,
  onSuccessRedeem,
}: PromoRedeemModalProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ amount: number; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessData(null);

    if (!userId) {
      setErrorMsg('Please login again to redeem promo codes.');
      return;
    }

    setLoading(true);
    try {
      const result = await secureApiCall('/api/promo/redeem', { code });

      if (!result.ok) {
        setErrorMsg(result.error || result.message || 'Invalid or expired code.');
      } else {
        const wonAmount = Number(result.amount || 0);
        setSuccessData({
          amount: wonAmount,
          message: result.message || `Rs ${wonAmount} added to your balance!`,
        });
        setCode('');
        onSuccessRedeem(wonAmount, code.trim().toUpperCase());
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error redeeming code');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setErrorMsg(null);
    setSuccessData(null);
    onClose();
  };

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
            <div className="bg-gradient-to-r from-[#0F7A50] to-emerald-600 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white shrink-0">
                  <Ticket size={22} />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-100 block">
                    Instant Wallet Voucher
                  </span>
                  <h3 className="text-base sm:text-lg font-extrabold text-white leading-tight">
                    Redeem Promo / Gift Code
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {successData ? (
                <div className="py-4 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-400 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
                    <Gift size={30} />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-slate-900">Bonus Added!</h4>
                    <p className="text-xs text-slate-500 mt-1">{successData.message}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                      Credited to Withdrawable Balance
                    </span>
                    <span className="text-2xl font-black text-emerald-700 font-mono tabular-nums">
                      +PKR {successData.amount.toLocaleString()}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="w-full py-3 bg-[#0F7A50] hover:bg-[#0c6140] text-white font-bold rounded-xl text-sm transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Official WhatsApp ya Telegram group se milne wala <strong>Promo / Gift Code</strong> niche darj karein aur foran PKR bonus apne wallet mein hasil karein.
                  </p>

                  {errorMsg && (
                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2">
                      <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Enter Promo Code
                    </label>
                    <input
                      type="text"
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="e.g. WELCOME50 or EID100"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold uppercase tracking-wider text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F7A50]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !code.trim()}
                    className="w-full py-3.5 bg-[#0F7A50] hover:bg-[#0c6140] disabled:bg-slate-200 disabled:text-slate-400 text-white font-black rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-[#0F7A50]/20 cursor-pointer"
                  >
                    <Sparkles size={16} />
                    <span>{loading ? 'Verifying Code...' : 'Claim Instant Bonus'}</span>
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
