/**
 * Generates a secure SHA-256 hash of a string using the browser's native Web Crypto API.
 */
export async function hashSHA256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Checks if a string is a valid SHA-256 hex hash (64 hex characters).
 */
export function isSHA256(str: string): boolean {
  return /^[a-f0-9]{64}$/i.test(str);
}
