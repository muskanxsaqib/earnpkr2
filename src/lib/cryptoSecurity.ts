import crypto from 'crypto';

// Secret key for HMAC signing (uses service role key or fallback secret)
const HMAC_INTERNAL_SECRET =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.INTERNAL_SECURITY_SECRET ||
  'eh_sec_7b653ec4_950f_451a_a636_697556058668_master_key';

/**
 * 1. Cryptographic SHA-256 Digest
 */
export function generateSHA256(data: string): string {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * 2. HMAC-SHA256 Request & Payload Signature Generator
 */
export function generateHMAC(payload: string | object, secret: string = HMAC_INTERNAL_SECRET): string {
  const content = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return crypto.createHmac('sha256', secret).update(content, 'utf8').digest('hex');
}

/**
 * 3. HMAC-SHA256 Signature Verification (Constant-Time Safe Comparison)
 */
export function verifyHMAC(payload: string | object, signature: string, secret: string = HMAC_INTERNAL_SECRET): boolean {
  try {
    const expected = generateHMAC(payload, secret);
    const expectedBuf = Buffer.from(expected, 'hex');
    const signatureBuf = Buffer.from(signature, 'hex');

    if (expectedBuf.length !== signatureBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(expectedBuf, signatureBuf);
  } catch {
    return false;
  }
}

/**
 * 4. PBKDF2 Password / Secret Hasher
 */
export function hashWithPBKDF2(text: string, salt: string, iterations = 10000, keylen = 64): Promise<string> {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(text, salt, iterations, keylen, 'sha512', (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey.toString('hex'));
    });
  });
}

/**
 * 5. Deep SQL Injection & XSS Input Sanitizer
 * Strips script tags, HTML event handlers, and dangerous SQL sequence tokens.
 */
export function sanitizeInputString(input: string): string {
  if (typeof input !== 'string') return '';

  let sanitized = input;

  // Strip script and style tags
  sanitized = sanitized.replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '');
  sanitized = sanitized.replace(/<\s*style[^>]*>[\s\S]*?<\s*\/\s*style\s*>/gi, '');

  // Strip dangerous HTML event handlers (onload, onerror, onclick, etc.)
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*[^>\s]+/gi, '');

  // Strip javascript: and vbscript: URIs
  sanitized = sanitized.replace(/javascript\s*:/gi, '');
  sanitized = sanitized.replace(/vbscript\s*:/gi, '');
  sanitized = sanitized.replace(/data\s*:\s*text\/html/gi, '');

  // SQL Injection dangerous tokens neutralization
  sanitized = sanitized.replace(/(\b(UNION(\s+ALL)?|SELECT|DROP|DELETE|TRUNCATE|ALTER|EXEC|EXECUTE)\b)/gi, '');
  sanitized = sanitized.replace(/--|\/\*|\*\/|;/g, '');

  return sanitized.trim();
}

/**
 * 6. Financial Amount Strict Validator
 * Prevents negative values, floating point exploits, NaN, Infinity, and decimal precision attacks.
 */
export function assertValidPositiveInt(val: any, min = 1, max = 10000000): number {
  if (val === null || val === undefined) {
    throw new Error('Amount is required.');
  }

  const num = Number(val);

  if (isNaN(num) || !isFinite(num)) {
    throw new Error('Invalid number format.');
  }

  if (num < min) {
    throw new Error(`Amount must be at least PKR ${min.toLocaleString()}.`);
  }

  if (num > max) {
    throw new Error(`Amount cannot exceed PKR ${max.toLocaleString()}.`);
  }

  // Ensure strict non-fractional integer to avoid floating point division flaws
  return Math.floor(num);
}

/**
 * 7. Cryptographically Secure Token Generator
 */
export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}
