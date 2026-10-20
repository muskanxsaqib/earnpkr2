// ============================================================================
// File: src/types/fontCatalog.ts
// 6 Curated Font Packs & Runtime Google Font Injection Helper
// ============================================================================

export type AppFontMode =
  | 'tech-modern'
  | 'cute-plush'
  | 'luxury-serif'
  | 'bold-syne'
  | 'cyber-orbitron'
  | 'clean-poppins';

export interface AppFontPackItem {
  id: AppFontMode;
  num: number;
  shortLabel: string;
  title: string;
  badge: string;
  displayFontName: string;
  bodyFontName: string;
  monoFontName: string;
  googleFontsUrl: string;
  displayCss: string;
  bodyCss: string;
  monoCss: string;
  desc: string;
  sampleHeadline: string;
  sampleBody: string;
}

export const APP_FONT_PACKS: AppFontPackItem[] = [
  {
    id: 'tech-modern',
    num: 1,
    shortLabel: 'Space Grotesk + Jakarta',
    title: 'Tech Modern (Space Grotesk & Plus Jakarta Sans)',
    badge: 'PACK 1 • TECH MODERN',
    displayFontName: 'Space Grotesk',
    bodyFontName: 'Plus Jakarta Sans',
    monoFontName: 'JetBrains Mono',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Space+Grotesk:wght@600;700;800&family=JetBrains+Mono:wght@500;700&display=swap',
    displayCss: "'Space Grotesk', -apple-system, sans-serif",
    bodyCss: "'Plus Jakarta Sans', -apple-system, sans-serif",
    monoCss: "'JetBrains Mono', monospace",
    desc: 'Geometric tech headlines paired with crisp Plus Jakarta Sans and monospaced code numbers.',
    sampleHeadline: 'DAILY REWARD & TEAM EARNINGS HUB',
    sampleBody: 'Collect fixed daily rewards and instant EasyPaisa / JazzCash withdrawals.',
  },
  {
    id: 'cute-plush',
    num: 2,
    shortLabel: 'Outfit + Quicksand',
    title: 'Cute Plush (Outfit & Quicksand Bubble)',
    badge: 'PACK 2 • CUTE PLUSH',
    displayFontName: 'Outfit',
    bodyFontName: 'Quicksand',
    monoFontName: 'Space Mono',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Outfit:wght@600;700;800;900&family=Quicksand:wght@500;600;700&family=Space+Mono:wght@700&display=swap',
    displayCss: "'Outfit', sans-serif",
    bodyCss: "'Quicksand', sans-serif",
    monoCss: "'Space Mono', monospace",
    desc: 'Rounded friendly aesthetics with bubbly letterforms and friendly curves.',
    sampleHeadline: 'CREATIVE REWARD & DIGITAL BOUTIQUE',
    sampleBody: 'Smooth animations, 3D icons, and cheerful daily reward collections.',
  },
  {
    id: 'luxury-serif',
    num: 3,
    shortLabel: 'Playfair + Montserrat',
    title: 'Luxury Editorial (Playfair Display & Montserrat)',
    badge: 'PACK 3 • EDITORIAL',
    displayFontName: 'Playfair Display',
    bodyFontName: 'Montserrat',
    monoFontName: 'DM Mono',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,600&family=Montserrat:wght@400;500;600;700&family=DM+Mono:wght@500&display=swap',
    displayCss: "'Playfair Display', Georgia, serif",
    bodyCss: "'Montserrat', sans-serif",
    monoCss: "'DM Mono', monospace",
    desc: 'High-fashion editorial elegance with high-contrast serif headlines.',
    sampleHeadline: 'ROYAL VIP PORTFOLIOS & PRIVATE WEALTH',
    sampleBody: 'Curated reward packages and bespoke financial growth.',
  },
  {
    id: 'bold-syne',
    num: 4,
    shortLabel: 'Syne + Sora',
    title: 'Avant-Garde Neo (Syne Extra Bold & Sora)',
    badge: 'PACK 4 • AVANT-GARDE',
    displayFontName: 'Syne',
    bodyFontName: 'Sora',
    monoFontName: 'JetBrains Mono',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=Sora:wght@400;600;700&display=swap',
    displayCss: "'Syne', sans-serif",
    bodyCss: "'Sora', sans-serif",
    monoCss: "'JetBrains Mono', monospace",
    desc: 'Hyper-stylized contemporary typography favored by top design agencies and web3 brands.',
    sampleHeadline: 'NEXT-GEN REWARD ARCHITECTURE',
    sampleBody: 'Pushing the boundaries of interactive earning dashboards.',
  },
  {
    id: 'cyber-orbitron',
    num: 5,
    shortLabel: 'Orbitron + Rajdhani',
    title: 'Cyberpunk Sci-Fi (Orbitron & Rajdhani)',
    badge: 'PACK 5 • SCI-FI CYBER',
    displayFontName: 'Orbitron',
    bodyFontName: 'Rajdhani',
    monoFontName: 'Share Tech Mono',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Orbitron:wght@700;800;900&family=Rajdhani:wght@500;600;700&family=Share+Tech+Mono&display=swap',
    displayCss: "'Orbitron', monospace",
    bodyCss: "'Rajdhani', sans-serif",
    monoCss: "'Share Tech Mono', monospace",
    desc: 'Angular tactical heads-up display styling for futuristic telemetry and dashboards.',
    sampleHeadline: 'CYBER MATRIX & DAILY PROFIT RADAR',
    sampleBody: 'Instant reward uplink operating at maximum efficiency.',
  },
  {
    id: 'clean-poppins',
    num: 6,
    shortLabel: 'Poppins + Inter',
    title: 'Universal Enterprise (Poppins & Inter)',
    badge: 'PACK 6 • UNIVERSAL CLEAN',
    displayFontName: 'Poppins',
    bodyFontName: 'Inter',
    monoFontName: 'Roboto Mono',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap',
    displayCss: "'Poppins', sans-serif",
    bodyCss: "'Inter', sans-serif",
    monoCss: "'Roboto Mono', monospace",
    desc: 'The gold standard for SaaS, enterprise applications, and conversion landing pages.',
    sampleHeadline: 'GLOBAL PAYMENTS & EARNING PLATFORM',
    sampleBody: 'Trusted by thousands of active members for instant daily payouts.',
  },
];

/**
 * Dynamically injects Google Fonts link into document <head>
 */
export function injectGoogleFont(url: string) {
  if (typeof document === 'undefined') return;
  const linkId = 'dynamic-google-fonts-link';
  let existingLink = document.getElementById(linkId) as HTMLLinkElement | null;
  if (!existingLink) {
    existingLink = document.createElement('link');
    existingLink.id = linkId;
    existingLink.rel = 'stylesheet';
    document.head.appendChild(existingLink);
  }
  if (existingLink.href !== url) {
    existingLink.href = url;
  }
}
