import React from 'react';
import { MARKET_TRENDS } from '../data';
import { TrendingUp, TrendingDown, LineChart } from 'lucide-react';
import { motion } from 'motion/react';

export function MarketTrends() {
  return (
    <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-xl shadow-inner">
            <LineChart size={20} className="text-slate-600" />
          </div>
          Live Market
        </h3>
        <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Live
        </span>
      </div>
      
      <div className="space-y-3">
        {MARKET_TRENDS.map((asset, index) => {
          const isPositive = asset.change24h >= 0;
          return (
            <motion.div 
              key={asset.symbol}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-white/80 transition-colors border border-slate-100 shadow-sm group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-inner ${
                  isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                }`}>
                  {asset.symbol.substring(0, 1)}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">{asset.symbol}</h4>
                  <p className="text-xs font-semibold text-slate-500">{asset.name}</p>
                </div>
              </div>
              
              <div className="text-right">
                <p className="font-mono font-black text-slate-800">
                  ${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <div className={`flex items-center justify-end gap-1 text-xs font-bold mt-0.5 ${
                  isPositive ? 'text-emerald-500' : 'text-rose-500'
                }`}>
                  {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {Math.abs(asset.change24h)}%
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
