import { NextResponse } from 'next/server';
import { serverAdminSupabase } from '@/src/lib/serverSupabase';
import { BRANDING_SETTING_KEYS, DEFAULT_SITE_BRANDING, normalizeBranding } from '@/src/lib/brandingCore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const { data, error } = await serverAdminSupabase
      .from('app_settings')
      .select('setting_key, setting_value')
      .in('setting_key', [...BRANDING_SETTING_KEYS]);

    if (error) {
      console.warn('API /api/branding error:', error.message);
      return NextResponse.json({ ok: false, branding: DEFAULT_SITE_BRANDING }, { status: 200 });
    }

    const map: Record<string, string> = {};
    (data || []).forEach((row: any) => {
      if (row?.setting_key) {
        map[row.setting_key] = String(row.setting_value ?? '');
      }
    });

    const branding = normalizeBranding({
      site_name: map['site_name'] || DEFAULT_SITE_BRANDING.site_name,
      site_tagline: map['site_tagline'] !== undefined ? map['site_tagline'] : DEFAULT_SITE_BRANDING.site_tagline,
      site_description: map['site_description'] || DEFAULT_SITE_BRANDING.site_description,
      site_logo_url: map['site_logo_url'] || DEFAULT_SITE_BRANDING.site_logo_url,
      site_icon_preset: (map['site_icon_preset'] as any) || DEFAULT_SITE_BRANDING.site_icon_preset,
      show_landing_page: map['show_landing_page'] ?? DEFAULT_SITE_BRANDING.show_landing_page,
      landing_badge: map['landing_badge'] || DEFAULT_SITE_BRANDING.landing_badge,
      landing_title: map['landing_title'] || DEFAULT_SITE_BRANDING.landing_title,
      landing_about: map['landing_about'] || DEFAULT_SITE_BRANDING.landing_about,
      landing_hero_image: map['landing_hero_image'] ?? DEFAULT_SITE_BRANDING.landing_hero_image,
      landing_show_hero_image: map['landing_show_hero_image'] ?? DEFAULT_SITE_BRANDING.landing_show_hero_image,
      landing_show_live_ticker: map['landing_show_live_ticker'] ?? DEFAULT_SITE_BRANDING.landing_show_live_ticker,
      landing_show_about: map['landing_show_about'] ?? DEFAULT_SITE_BRANDING.landing_show_about,
      landing_show_steps: map['landing_show_steps'] ?? DEFAULT_SITE_BRANDING.landing_show_steps,
      landing_show_plans: map['landing_show_plans'] ?? DEFAULT_SITE_BRANDING.landing_show_plans,
      landing_show_calculator: map['landing_show_calculator'] ?? DEFAULT_SITE_BRANDING.landing_show_calculator,
      landing_show_stats: map['landing_show_stats'] ?? DEFAULT_SITE_BRANDING.landing_show_stats,
      landing_show_faq: map['landing_show_faq'] ?? DEFAULT_SITE_BRANDING.landing_show_faq,
      landing_step1_title: map['landing_step1_title'] || DEFAULT_SITE_BRANDING.landing_step1_title,
      landing_step1_desc: map['landing_step1_desc'] || DEFAULT_SITE_BRANDING.landing_step1_desc,
      landing_step2_title: map['landing_step2_title'] || DEFAULT_SITE_BRANDING.landing_step2_title,
      landing_step2_desc: map['landing_step2_desc'] || DEFAULT_SITE_BRANDING.landing_step2_desc,
      landing_step3_title: map['landing_step3_title'] || DEFAULT_SITE_BRANDING.landing_step3_title,
      landing_step3_desc: map['landing_step3_desc'] || DEFAULT_SITE_BRANDING.landing_step3_desc,
      landing_login_btn_text: map['landing_login_btn_text'] || DEFAULT_SITE_BRANDING.landing_login_btn_text,
      landing_register_btn_text: map['landing_register_btn_text'] || DEFAULT_SITE_BRANDING.landing_register_btn_text,
    });

    return NextResponse.json({
      ok: true,
      branding: {
        ...branding,
        authorized_domains: map['authorized_domains'] || '',
      },
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (err: any) {
    console.error('API /api/branding error:', err);
    return NextResponse.json({ ok: false, branding: DEFAULT_SITE_BRANDING }, { status: 200 });
  }
}
