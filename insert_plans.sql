INSERT INTO public.plans (plan_number, name, invest_amount, daily_return, total_days, required_referrals, referral_bonus)
VALUES 
  (1, 'Plan 1', 250, 20, 30, 3, 50),
  (2, 'Plan 2', 300, 25, 30, 5, 50),
  (3, 'Plan 3', 500, 45, 30, 7, 50),
  (4, 'Plan 4', 700, 70, 30, 10, 50),
  (5, 'Plan 5', 1000, 90, 30, 15, 50),
  (6, 'Plan 6', 1500, 120, 30, 20, 50),
  (7, 'Plan 7', 2000, 150, 30, 25, 50),
  (8, 'Plan 8', 3000, 210, 30, 30, 50),
  (9, 'Plan 9', 4000, 260, 30, 35, 50),
  (10, 'Plan 10', 5000, 300, 30, 40, 50)
ON CONFLICT (plan_number) DO UPDATE SET
  name = EXCLUDED.name,
  invest_amount = EXCLUDED.invest_amount,
  daily_return = EXCLUDED.daily_return,
  total_days = EXCLUDED.total_days,
  required_referrals = EXCLUDED.required_referrals,
  referral_bonus = EXCLUDED.referral_bonus;
