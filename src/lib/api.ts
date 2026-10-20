import { supabase } from './supabase';

export interface ApiResponse<T = any> {
  ok: boolean;
  message?: string;
  data?: T;
  error?: string;
  [key: string]: any;
}

export async function secureApiCall<T = any>(
  endpoint: string,
  body: Record<string, any> = {},
  customHeaders: Record<string, string> = {}
): Promise<ApiResponse<T>> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token || '';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      credentials: 'same-origin',
      body: JSON.stringify(body),
    });

    const json = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        ok: false,
        error: json?.error || json?.message || `Request failed with status ${response.status}`,
        message: json?.message || json?.error || 'Server error',
      };
    }

    return {
      ok: true,
      ...json,
    };
  } catch (err: any) {
    console.error(`API Call Error (${endpoint}):`, err);
    return {
      ok: false,
      error: err?.message || 'Network error occurred.',
      message: err?.message || 'Network error occurred.',
    };
  }
}
