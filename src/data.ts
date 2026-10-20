import { InvestmentPlan, MarketAsset } from './types';

export const INVESTMENT_PLANS: InvestmentPlan[] = [
  {
    id: 'plan_1',
    name: 'Mini Plan',
    investAmount: 250,
    dailyReturn: 20,
    totalDays: 30,
    requiredReferrals: 3,
    referralBonus: 150,
    icon: 'flame',
    theme: { from: 'from-purple-500', to: 'to-indigo-500', bg: 'bg-purple-50', text: 'text-purple-500' }
  },
  {
    id: 'plan_2',
    name: 'Starter Plan',
    investAmount: 300,
    dailyReturn: 25,
    totalDays: 30,
    requiredReferrals: 5,
    referralBonus: 250,
    icon: 'flame',
    theme: { from: 'from-blue-500', to: 'to-cyan-500', bg: 'bg-blue-50', text: 'text-blue-500' }
  },
  {
    id: 'plan_3',
    name: 'Basic Plan',
    investAmount: 500,
    dailyReturn: 45,
    totalDays: 30,
    requiredReferrals: 7,
    referralBonus: 350,
    icon: 'rocket',
    theme: { from: 'from-emerald-500', to: 'to-teal-500', bg: 'bg-emerald-50', text: 'text-emerald-500' }
  },
  {
    id: 'plan_4',
    name: 'Standard Plan',
    investAmount: 700,
    dailyReturn: 70,
    totalDays: 30,
    requiredReferrals: 10,
    referralBonus: 500,
    icon: 'diamond',
    theme: { from: 'from-orange-400', to: 'to-amber-500', bg: 'bg-orange-50', text: 'text-orange-500' }
  },
  {
    id: 'plan_5',
    name: 'Gold Plan',
    investAmount: 1000,
    dailyReturn: 90,
    totalDays: 30,
    requiredReferrals: 15,
    referralBonus: 750,
    icon: 'crown',
    theme: { from: 'from-rose-500', to: 'to-pink-500', bg: 'bg-rose-50', text: 'text-rose-500' }
  },
  {
    id: 'plan_6',
    name: 'Premium Plan',
    investAmount: 1500,
    dailyReturn: 120,
    totalDays: 30,
    requiredReferrals: 20,
    referralBonus: 1000,
    icon: 'briefcase',
    theme: { from: 'from-violet-500', to: 'to-purple-600', bg: 'bg-violet-50', text: 'text-violet-500' }
  },
  {
    id: 'plan_7',
    name: 'Pro Plan',
    investAmount: 2000,
    dailyReturn: 150,
    totalDays: 30,
    requiredReferrals: 25,
    referralBonus: 1250,
    icon: 'rocket',
    theme: { from: 'from-cyan-500', to: 'to-blue-600', bg: 'bg-cyan-50', text: 'text-cyan-500' }
  },
  {
    id: 'plan_8',
    name: 'Elite Plan',
    investAmount: 3000,
    dailyReturn: 210,
    totalDays: 30,
    requiredReferrals: 30,
    referralBonus: 1500,
    icon: 'diamond',
    theme: { from: 'from-amber-500', to: 'to-orange-600', bg: 'bg-amber-50', text: 'text-amber-500' }
  },
  {
    id: 'plan_9',
    name: 'VIP Plan',
    investAmount: 4000,
    dailyReturn: 260,
    totalDays: 30,
    requiredReferrals: 35,
    referralBonus: 1750,
    icon: 'crown',
    theme: { from: 'from-fuchsia-500', to: 'to-pink-600', bg: 'bg-fuchsia-50', text: 'text-fuchsia-500' }
  },
  {
    id: 'plan_10',
    name: 'Royal Plan',
    investAmount: 5000,
    dailyReturn: 300,
    totalDays: 30,
    requiredReferrals: 40,
    referralBonus: 2000,
    icon: 'briefcase',
    theme: { from: 'from-indigo-500', to: 'to-blue-600', bg: 'bg-indigo-50', text: 'text-indigo-500' }
  }
];

export const MARKET_TRENDS: MarketAsset[] = [
  { symbol: 'BTC', name: 'Bitcoin', price: 64230.50, change24h: 2.4, sparkline: [40, 45, 42, 50, 48, 55, 60] },
  { symbol: 'ETH', name: 'Ethereum', price: 3450.20, change24h: -1.2, sparkline: [60, 58, 55, 57, 52, 50, 48] },
  { symbol: 'SOL', name: 'Solana', price: 145.80, change24h: 5.6, sparkline: [20, 25, 30, 28, 35, 40, 45] },
  { symbol: 'BNB', name: 'Binance Coin', price: 590.10, change24h: 0.8, sparkline: [40, 42, 41, 43, 44, 43, 45] }
];
