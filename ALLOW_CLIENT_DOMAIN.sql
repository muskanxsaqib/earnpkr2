-- ==============================================================================
-- 🌐 TASK EARN HUB: 1-CLICK CLIENT DOMAIN AUTHORIZATION QUERY
-- ==============================================================================
-- USAGE INSTRUCTIONS:
-- Jab bhi aap kisi client ke liye website clone karein ya sale karein:
-- 1. Neeche 'myclientdomain.com' ki jagah client ka domain likhein
-- 2. Supabase Dashboard -> SQL Editor mein paste karein aur "RUN" daba dein!
-- 3. Yeh query us naye domain ko instantly whitelist kar degi aur Anti-Clone
--    Killswitch us domain par foran website unlock kar dega!
-- ==============================================================================

-- 1. ADD / WHITELIST CLIENT DOMAIN IN DATABASE:
-- (Replace 'myclientdomain.com' with your client's actual domain name)
INSERT INTO public.app_settings (setting_key, setting_value)
VALUES (
    'authorized_domains',
    'localhost,127.0.0.1,vercel.app,myclientdomain.com,clientstore.vercel.app'
)
ON CONFLICT (setting_key)
DO UPDATE SET setting_value = CASE 
    WHEN public.app_settings.setting_value LIKE '%myclientdomain.com%' THEN public.app_settings.setting_value
    ELSE public.app_settings.setting_value || ',myclientdomain.com,clientstore.vercel.app'
END;

-- ------------------------------------------------------------------------------
-- 2. VERIFY WHITELISTED DOMAINS:
-- ------------------------------------------------------------------------------
SELECT 
    setting_key, 
    setting_value AS whitelisted_domains
FROM public.app_settings 
WHERE setting_key = 'authorized_domains';

-- ==============================================================================
-- 💡 ZERO-SQL ALTERNATIVE METHOD (VIA .ENV FILE):
-- Agar aap SQL query run nahi karna chahte, to client ki hosting ya
-- Vercel Environment Variables mein sirf yeh 1 line add kar dein:
--
-- NEXT_PUBLIC_ALLOWED_DOMAINS="myclientdomain.com,clientstore.vercel.app"
--
-- Ya agar client ko 100% unlocked version dena ho (without any domain restrictions):
-- NEXT_PUBLIC_DISABLE_KILLSWITCH="true"
-- ==============================================================================
