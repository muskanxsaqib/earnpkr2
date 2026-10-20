// ============================================================================
// File: src/types/themeCatalog.ts
// Curated High-Fidelity Tactile, Glass & Neumorphic Theme Definitions
// ============================================================================

export type AppThemeId =
  | 'astro-neu'
  | 'astro-glass'
  | 'pink-acrylic'
  | 'liquid-champagne'
  | 'pastel-jelly'
  | 'neo-gray-dark'
  | 'neo-blue-dark';

export interface AppThemeItem {
  id: AppThemeId;
  name: string;
  shortLabel: string;
  badge: string;
  tagline: string;
  bodyClass: string;
  swatch1: string;
  swatch2: string;
  previewGradient: string;
  isDark: boolean;
  accentColor: string;
}

export const APP_THEMES_CATALOG: AppThemeItem[] = [
  {
    id: 'astro-neu',
    name: 'Astro-Neumorphic OS (Tactile Matte & Glass Dock)',
    shortLabel: 'Astro-Neu OS',
    badge: 'THEME 1 • ASTRO-NEU',
    tagline: 'Raised matte neumorphic cards, recessed wells & frosted glass docks',
    bodyClass: 'theme-astro-neu',
    swatch1: '#e4e7ec',
    swatch2: '#0e1220',
    previewGradient: 'from-slate-700 via-slate-800 to-sky-950',
    isDark: false,
    accentColor: '#00f0ff',
  },
  {
    id: 'astro-glass',
    name: 'Astro-Glass UI (Frosted Crystal & Cyber Glass)',
    shortLabel: 'Astro-Glass',
    badge: 'THEME 2 • GLASS UI',
    tagline: 'Translucent frosted glass surfaces, specular borders & cyan LED accents',
    bodyClass: 'theme-astro-glass',
    swatch1: '#dbe4f0',
    swatch2: '#38bdf8',
    previewGradient: 'from-sky-500 via-cyan-500 to-indigo-600',
    isDark: false,
    accentColor: '#0ea5e9',
  },
  {
    id: 'pink-acrylic',
    name: 'Classic Pink 3D Acrylic & Plush',
    shortLabel: 'Classic Pink',
    badge: 'THEME 3 • SIGNATURE',
    tagline: 'Signature pastel pink acrylic glass, rose & plush gradients',
    bodyClass: 'theme-pink-acrylic',
    swatch1: '#ffdde9',
    swatch2: '#ec4899',
    previewGradient: 'from-pink-500 via-rose-500 to-purple-600',
    isDark: false,
    accentColor: '#ec4899',
  },
  {
    id: 'liquid-champagne',
    name: '3D Liquid Glass Champagne & Gold',
    shortLabel: 'Liquid Gold',
    badge: 'THEME 4 • ROYAL GOLD',
    tagline: '3D Liquid glass pearl with warm champagne gold luster',
    bodyClass: 'theme-liquid-champagne',
    swatch1: '#fef3c7',
    swatch2: '#d97706',
    previewGradient: 'from-amber-600 via-yellow-500 to-emerald-600',
    isDark: false,
    accentColor: '#f59e0b',
  },
  {
    id: 'pastel-jelly',
    name: '3D Pastel Jelly Droplet OS',
    shortLabel: 'Pastel Jelly',
    badge: 'THEME 5 • JELLY-OS',
    tagline: 'Glossy water-droplet jelly cards with soft candy shine',
    bodyClass: 'theme-pastel-jelly',
    swatch1: '#6190e8',
    swatch2: '#f48fb1',
    previewGradient: 'from-sky-400 via-indigo-400 to-pink-400',
    isDark: false,
    accentColor: '#6366f1',
  },
  {
    id: 'neo-gray-dark',
    name: 'Neo Gray Dark (Slate & Neumorphic Charcoal)',
    shortLabel: 'Neo Gray Dark',
    badge: 'THEME 6 • DARK SLATE',
    tagline: 'Midnight dark mode with dual-tone soft embossed shadows',
    bodyClass: 'theme-neo-gray-dark',
    swatch1: '#111520',
    swatch2: '#94a3b8',
    previewGradient: 'from-slate-900 via-slate-800 to-slate-950',
    isDark: true,
    accentColor: '#94a3b8',
  },
  {
    id: 'neo-blue-dark',
    name: 'Neo Blue Dark (Deep Space Glass & Cyan LED)',
    shortLabel: 'Neo Blue Glass',
    badge: 'THEME 7 • DEEP SPACE',
    tagline: 'Deep space dark glass windows with electric cyan & indigo glow',
    bodyClass: 'theme-neo-blue-dark',
    swatch1: '#0b0e19',
    swatch2: '#00f0ff',
    previewGradient: 'from-cyan-600 via-blue-700 to-indigo-950',
    isDark: true,
    accentColor: '#00f0ff',
  },
];
