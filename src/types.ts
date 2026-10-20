export type TabType = 'home' | 'ads' | 'packages' | 'invite' | 'profile' | 'my-plans';

export interface InvestmentPlan {
  id: string;
  name: string;
  investAmount: number;
  dailyReturn: number;
  totalDays: number;
  requiredReferrals: number;
  referralBonus: number;
  icon: 'flame' | 'rocket' | 'diamond' | 'crown' | 'briefcase';
  badge_tag?: string;
  theme: {
    from: string;
    to: string;
    bg: string;
    text: string;
  };
}

export interface MarketAsset {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  sparkline: number[];
}
