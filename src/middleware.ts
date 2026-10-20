import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Sliding-window IP rate limiting tracker
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Blacklist of automated penetration testing tools and vulnerability scanners
const SUSPICIOUS_USER_AGENTS = [
  'sqlmap',
  'nikto',
  'masscan',
  'dirbuster',
  'nmap',
  'acunetix',
  'havij',
  'zgrab',
  'gobuster',
  'wpscan',
];

// Blacklist of automated code-rippers, scrapers, and headless browser bots
const FORBIDDEN_SCRAPERS = [
  'curl',
  'wget',
  'python-requests',
  'python-urllib',
  'scrapy',
  'httrack',
  'beautifulsoup',
  'headlesschrome',
  'puppeteer',
  'selenium',
  'phantomjs',
  'postmanruntime',
  'insomnia',
  'apache-httpclient',
  'go-http-client',
  'okhttp',
  'aiohttp',
  'httpclient',
  'libwww-perl',
  'winhttp',
  'webcopier',
  'webcopy',
  'cyotek',
  'teleport',
  'offline explorer',
  'offline-explorer',
  'site-sniffer',
  'page-ripper',
  'superbot',
];

// Allowed legitimate search engine crawlers & social card bots
const ALLOWED_CRAWLERS = [
  'googlebot',
  'bingbot',
  'duckduckbot',
  'slurp',
  'baiduspider',
  'yandexbot',
  'facebookexternalhit',
  'whatsapp',
  'telegrambot',
  'twitterbot',
];

// Exploit paths probed by automated Linux bots / vulnerability scanners
const BLOCKED_PATH_PATTERNS = [
  /\/\.env/i,
  /\/\.git/i,
  /\/wp-login\.php/i,
  /\/wp-admin/i,
  /\/phpmyadmin/i,
  /\/xmlrpc\.php/i,
  /\/etc\/passwd/i,
  /\/proc\/self/i,
  /\.\.[\/\\]+/,
];

// Clean rateLimitMap periodically to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ua = req.headers.get('user-agent') || '';
  const method = req.method;

  // Extract client IP address
  const cfIp = req.headers.get('cf-connecting-ip');
  const realIp = req.headers.get('x-real-ip');
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = (cfIp || realIp || (forwarded ? forwarded.split(',')[0].trim() : '') || '127.0.0.1').trim();

  // 1. Block access to source maps (.map files)
  if (pathname.endsWith('.map')) {
    return new NextResponse('Source maps are disabled for security.', { status: 404 });
  }

  // 2. Block exploit path probes (.env, .git, wp-login, etc.)
  if (BLOCKED_PATH_PATTERNS.some((pattern) => pattern.test(pathname))) {
    return new NextResponse(
      JSON.stringify({ ok: false, error: 'Access Denied: Forbidden security path probe.' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json', 'X-Blocked-By': 'TaskEarnHub-WAF' },
      }
    );
  }

  // 3. Scanner, Scraper & Penetration Tool Defense
  const uaLower = ua.toLowerCase();
  const isAllowedCrawler = ALLOWED_CRAWLERS.some((bot) => uaLower.includes(bot));

  if (!isAllowedCrawler) {
    // 3a. Block Malicious Vulnerability Scanners (sqlmap, nmap, nikto, etc.)
    if (SUSPICIOUS_USER_AGENTS.some((tool) => uaLower.includes(tool))) {
      return new NextResponse(
        JSON.stringify({ ok: false, error: 'Access Denied: Vulnerability scanner signature detected.' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json', 'X-Blocked-By': 'TaskEarnHub-WAF' },
        }
      );
    }

    // 3b. Block Automated Code Scrapers & Headless Rippers on APIs
    if (pathname.startsWith('/api/')) {
      const isForbiddenScraper = FORBIDDEN_SCRAPERS.some((scraper) => uaLower.includes(scraper));
      if (isForbiddenScraper) {
        return new NextResponse(
          JSON.stringify({
            ok: false,
            error: 'Direct terminal, cURL, and automated bot scripts are strictly blocked by Security Shield.',
            blocked_ua: ua,
          }),
          {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
              'X-Blocked-By': 'TaskEarnHub-WAF',
            },
          }
        );
      }
    }
  }

  // 3. Cross-Site Request Forgery (CSRF) & Cross-Origin Validation on Mutations
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method) && pathname.startsWith('/api/')) {
    const origin = req.headers.get('origin');
    const host = req.headers.get('host');

    // If request has Origin header, verify that it matches our host
    if (origin && host) {
      const originHost = origin.replace(/^https?:\/\//i, '').split('/')[0];
      const reqHost = host.split('/')[0];

      if (originHost !== reqHost && !originHost.includes('localhost') && !originHost.includes('127.0.0.1')) {
        return new NextResponse(
          JSON.stringify({
            ok: false,
            error: 'Cross-Site Request Forgery (CSRF) blocked: Origin mismatch.',
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }
  }

  // 3. Sliding-Window Rate Limiting for API routes
  if (pathname.startsWith('/api/')) {
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window
    const isAuthRoute = pathname.includes('/auth/') || pathname.includes('/admin/verify');
    const maxRequests = isAuthRoute ? 25 : 120; // 25 req/min on auth, 120 req/min on general APIs

    let record = rateLimitMap.get(ip);
    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
    } else {
      record.count += 1;
    }
    rateLimitMap.set(ip, record);

    if (record.count > maxRequests) {
      return new NextResponse(
        JSON.stringify({
          ok: false,
          error: 'Too many requests. Please slow down and try again in 1 minute.',
          retry_after_seconds: 60,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60',
          },
        }
      );
    }
  }

  // 5. Inject Enterprise Security Headers (The Big 7 + Source & Frame Shield)
  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Strict-Transport-Security', 'max-age=315360000; includeSubDomains');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Content-Security-Policy', "frame-ancestors 'none';");
  response.headers.set('X-Source-Protection', 'Active');

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
