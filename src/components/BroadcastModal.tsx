import React, { useState, useEffect } from 'react';
import { Megaphone, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';

export function BroadcastModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [latestBroadcast, setLatestBroadcast] = useState<any>(null);

  useEffect(() => {
    const fetchLatestBroadcast = async () => {
      try {
        // Query the latest broadcast message
        const { data, error } = await supabase
          .from('admin_messages')
          .select('*')
          .eq('is_broadcast', true)
          .order('created_at', { ascending: false })
          .limit(1);

        if (!error && data && data.length > 0) {
          const msg = data[0];
          // Check if this broadcast was already dismissed
          const dismissedId = localStorage.getItem('dismissed_broadcast_id');
          if (dismissedId !== msg.id) {
            setLatestBroadcast(msg);
            setIsOpen(true);
          }
        }
      } catch (err) {
        console.error('Failed to fetch broadcast message:', err);
      }
    };

    fetchLatestBroadcast();

    // Set up real-time subscription for broadcasts
    const channel = supabase
      .channel('broadcast-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_messages' },
        (payload) => {
          const msg = payload.new as any;
          if (msg && msg.is_broadcast) {
            const dismissedId = localStorage.getItem('dismissed_broadcast_id');
            if (dismissedId !== msg.id) {
              setLatestBroadcast(msg);
              setIsOpen(true);
            }
          }
        }
      )
      .on(
        'broadcast',
        { event: 'db_change' },
        (payload) => {
          if (payload && payload.payload) {
            const { table, data } = payload.payload;
            if (table === 'admin_messages' && data && data.is_broadcast) {
              const dismissedId = localStorage.getItem('dismissed_broadcast_id');
              if (dismissedId !== data.id) {
                setLatestBroadcast(data);
                setIsOpen(true);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDismiss = () => {
    if (latestBroadcast) {
      localStorage.setItem('dismissed_broadcast_id', latestBroadcast.id);
    }
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && latestBroadcast && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDismiss}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="relative bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-100 overflow-hidden"
          >
            {/* Top decorative gradient or pattern */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 to-teal-600" />

            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded">Important Announcement</span>
                  <h3 className="text-lg font-extrabold text-slate-800 mt-1 leading-none">Admin Broadcast</h3>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Message Body */}
            <div className="my-5 bg-slate-50 p-4 rounded-2xl border border-slate-100 max-h-[250px] overflow-y-auto">
              <p className="text-slate-700 text-[14px] leading-relaxed whitespace-pre-wrap font-medium">
                {latestBroadcast.message}
              </p>
            </div>

            {/* Footer Action */}
            <div className="flex justify-end pt-2">
              <button
                onClick={handleDismiss}
                className="w-full sm:w-auto px-6 py-3 bg-[#0F7A50] hover:bg-[#0c6140] text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
              >
                <Check className="w-4 h-4" /> Got It!
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
