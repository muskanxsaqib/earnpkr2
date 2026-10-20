import { supabase, broadcastChange } from './supabase';

export interface FeatureFlagRow {
  feature_name: string;
  is_enabled: boolean;
  description: string;
  created_at?: string;
  updated_at?: string;
}

export const KNOWN_FEATURE_FLAGS = {
  PROMO_CODES: 'promo_codes',
  DAILY_TASK_VERIFICATION: 'daily_task_verification',
  CUSTOM_WITHDRAWAL_RULES: 'custom_withdrawal_rules',
} as const;

/**
 * Fetch all feature flags from the `feature_flags` table.
 * If the table does not exist or has an error, falls back to matching keys from `app_settings`.
 */
export async function getFeatureFlags(): Promise<Record<string, boolean>> {
  const flags: Record<string, boolean> = {
    [KNOWN_FEATURE_FLAGS.PROMO_CODES]: false,
    [KNOWN_FEATURE_FLAGS.DAILY_TASK_VERIFICATION]: false,
    [KNOWN_FEATURE_FLAGS.CUSTOM_WITHDRAWAL_RULES]: false,
  };

  try {
    const { data, error } = await supabase
      .from('feature_flags')
      .select('feature_name, is_enabled');

    if (!error && Array.isArray(data) && data.length > 0) {
      for (const row of data) {
        if (row.feature_name) {
          flags[row.feature_name] = Boolean(row.is_enabled);
        }
      }
      return flags;
    }
  } catch (err) {
    console.warn('Feature flags table query notice:', err);
  }

  // Graceful fallback to app_settings
  try {
    const { data: settings } = await supabase
      .from('app_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['promo_feature_enabled', 'require_task_before_claim', 'withdrawal_rules_enabled']);

    if (Array.isArray(settings)) {
      for (const s of settings) {
        if (s.setting_key === 'promo_feature_enabled') {
          flags[KNOWN_FEATURE_FLAGS.PROMO_CODES] = s.setting_value === 'true';
        } else if (s.setting_key === 'require_task_before_claim') {
          flags[KNOWN_FEATURE_FLAGS.DAILY_TASK_VERIFICATION] = s.setting_value === 'true';
        } else if (s.setting_key === 'withdrawal_rules_enabled') {
          flags[KNOWN_FEATURE_FLAGS.CUSTOM_WITHDRAWAL_RULES] = s.setting_value === 'true';
        }
      }
    }
  } catch (err) {
    console.warn('Settings fallback query notice:', err);
  }

  return flags;
}

/**
 * Set a feature flag in both `feature_flags` table and `app_settings` for dual resilience.
 */
export async function setFeatureFlag(
  featureName: string,
  isEnabled: boolean,
  description?: string
): Promise<boolean> {
  let success = false;

  // 1. Update feature_flags table
  try {
    const payload: Partial<FeatureFlagRow> = {
      feature_name: featureName,
      is_enabled: isEnabled,
      updated_at: new Date().toISOString(),
    };
    if (description) {
      payload.description = description;
    }

    const { error } = await supabase
      .from('feature_flags')
      .upsert(payload, { onConflict: 'feature_name' });

    if (!error) {
      success = true;
    }
  } catch (err) {
    console.warn('Feature flags table upsert error:', err);
  }

  // 2. Synchronize corresponding key in app_settings
  let settingKey = '';
  if (featureName === KNOWN_FEATURE_FLAGS.PROMO_CODES) {
    settingKey = 'promo_feature_enabled';
  } else if (featureName === KNOWN_FEATURE_FLAGS.DAILY_TASK_VERIFICATION) {
    settingKey = 'require_task_before_claim';
  } else if (featureName === KNOWN_FEATURE_FLAGS.CUSTOM_WITHDRAWAL_RULES) {
    settingKey = 'withdrawal_rules_enabled';
  }

  if (settingKey) {
    try {
      await supabase.from('app_settings').upsert(
        {
          setting_key: settingKey,
          setting_value: isEnabled ? 'true' : 'false',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'setting_key' }
      );
      await broadcastChange('app_settings', 'update', { [settingKey]: isEnabled ? 'true' : 'false' });
    } catch (err) {
      console.warn('app_settings sync error:', err);
    }
  }

  return success;
}
