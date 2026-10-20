// ============================================================================
// File: src/components/ThemeFontStudioModal.tsx
// Interactive Modal / Drawer for Switching Themes, Fonts, Sounds & RGB Light
// Rendered via React Portal into document.body so parent backdrop-filter
// headers/sidebars never trap or squish the fixed overlay.
// ============================================================================

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Palette, Volume2, VolumeX, Sparkles, RotateCcw, Check, Type, X } from 'lucide-react';
import { useTactileTheme } from '../context/TactileThemeContext';
import { APP_THEMES_CATALOG } from '../types/themeCatalog';
import { APP_FONT_PACKS } from '../types/fontCatalog';

interface ThemeFontStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThemeFontStudioModal: React.FC<ThemeFontStudioModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    theme,
    font,
    soundEnabled,
    rgbLightEnabled,
    hasUserOverride,
    setTheme,
    setFont,
    toggleSound,
    toggleRgbLight,
    resetToPlatformDefault,
    playPop,
    playSuccess,
  } = useTactileTheme();

  const [activeTab, setActiveTab] = useState<'themes' | 'fonts' | 'audio'>('themes');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);

  useEffect(() => {
    try {
      setIsAdminUnlocked(sessionStorage.getItem('admin_gate_unlocked') === 'true');
    } catch (e) {}
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          playPop(480);
          onClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-2xl max-h-[88vh] flex flex-col rounded-[26px] sm:rounded-[30px] acrylic-frame overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="plush-pillow rounded-[22px] sm:rounded-[25px] p-4 sm:p-6 flex flex-col flex-grow overflow-hidden space-y-3.5">
          {/* Top Header */}
          <div className="flex items-start justify-between gap-3 border-b border-slate-200/70 pb-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <Sparkles className="w-2.5 h-2.5 shrink-0" />
                  <span>UI Theme &amp; Sound Studio</span>
                </span>
                {hasUserOverride && (
                  <button
                    type="button"
                    onClick={resetToPlatformDefault}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 hover:text-emerald-600 bg-slate-100 hover:bg-emerald-50 px-2.5 py-0.5 rounded-full border border-slate-200 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-2.5 h-2.5 shrink-0" />
                    <span>Reset Default</span>
                  </button>
                )}
              </div>
              <h2 className="text-base sm:text-xl font-black text-slate-900 leading-tight">
                Customize Theme, Fonts &amp; Audio
              </h2>
            </div>

            <button
              type="button"
              data-custom-sound
              onClick={() => {
                playPop(480);
                onClose();
              }}
              aria-label="Close Studio"
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-600 font-bold flex items-center justify-center transition cursor-pointer shrink-0 border border-slate-200/80"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 3-Tab Switcher */}
          <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-slate-100/90 border border-slate-200/80 shrink-0">
            <button
              type="button"
              onClick={() => {
                playPop(600);
                setActiveTab('themes');
              }}
              className={`py-2 px-2.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'themes'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                  : 'text-slate-700 hover:text-slate-950'
              }`}
            >
              <Palette className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Themes ({APP_THEMES_CATALOG.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playPop(600);
                setActiveTab('fonts');
              }}
              className={`py-2 px-2.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'fonts'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                  : 'text-slate-700 hover:text-slate-950'
              }`}
            >
              <Type className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Fonts ({APP_FONT_PACKS.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playPop(600);
                setActiveTab('audio');
              }}
              className={`py-2 px-2.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'audio'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                  : 'text-slate-700 hover:text-slate-950'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Sound &amp; RGB</span>
            </button>
          </div>

          {/* Tab 1: Themes Grid */}
          {activeTab === 'themes' && (
            <div className="overflow-y-auto px-1 py-1 space-y-2.5 flex-grow max-h-[54vh] custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {APP_THEMES_CATALOG.map((thm) => {
                  const isSelected = theme === thm.id;
                  return (
                    <div
                      key={thm.id}
                      onClick={() => setTheme(thm.id)}
                      className={`studio-item-card p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                        isSelected
                          ? 'border-emerald-500 ring-2 ring-emerald-400/30 bg-white'
                          : 'border-slate-200/90 bg-white/85 hover:bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider truncate">
                          {thm.badge}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <span
                            className="w-4 h-4 rounded-full border border-slate-300 shadow-2xs"
                            style={{ backgroundColor: thm.swatch1 }}
                          />
                          <span
                            className="w-4 h-4 rounded-full border border-slate-300 shadow-2xs"
                            style={{ backgroundColor: thm.swatch2 }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-black text-slate-900 leading-snug">
                          {thm.name}
                        </div>
                        <div className="text-[11px] font-medium text-slate-600 mt-0.5 leading-snug">
                          {thm.tagline}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
                        <span className="text-[10px] font-bold text-slate-500">
                          {thm.isDark ? '🌙 Dark Mode' : '☀️ Light / Glass'}
                        </span>
                        <span
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition inline-flex items-center gap-1 shrink-0 ${
                            isSelected
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                          <span>{isSelected ? 'Active' : 'Apply'}</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 2: Fonts Grid */}
          {activeTab === 'fonts' && (
            <div className="overflow-y-auto px-1 py-1 space-y-2.5 flex-grow max-h-[54vh] custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {APP_FONT_PACKS.map((f) => {
                  const isSelected = font === f.id;
                  return (
                    <div
                      key={f.id}
                      onClick={() => setFont(f.id)}
                      className={`studio-item-card p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                        isSelected
                          ? 'border-emerald-500 ring-2 ring-emerald-400/30 bg-white'
                          : 'border-slate-200/90 bg-white/85 hover:bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider truncate">
                          {f.badge}
                        </span>
                        {isSelected && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black shrink-0">
                            ✓ ACTIVE
                          </span>
                        )}
                      </div>

                      <div>
                        <div
                          className="text-sm sm:text-base font-black text-slate-900 leading-snug"
                          style={{ fontFamily: f.displayCss }}
                        >
                          {f.sampleHeadline}
                        </div>
                        <div
                          className="text-xs font-medium text-slate-600 mt-1 leading-relaxed"
                          style={{ fontFamily: f.bodyCss }}
                        >
                          {f.sampleBody}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] font-mono-code text-slate-500 gap-2">
                        <span className="truncate">Display: {f.displayFontName}</span>
                        <span className="truncate">Body: {f.bodyFontName}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 3: Audio & Ambient Lighting */}
          {activeTab === 'audio' && (
            <div className="overflow-y-auto px-1 py-1 space-y-3 flex-grow max-h-[54vh] custom-scrollbar">
              {/* Tactile Sound FX Card */}
              <div className="studio-item-card p-4 rounded-2xl bg-white/90 border border-slate-200 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-black text-slate-900">
                    Tactile Web Audio Synthesizer
                  </div>
                  <div className="text-xs text-slate-600 font-medium mt-0.5">
                    Pure synthesized pop &amp; chime sounds on buttons, tabs and reward claims.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleSound}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-black cursor-pointer transition shrink-0 flex items-center gap-1.5 ${
                    soundEnabled
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  <span>{soundEnabled ? 'Sound ON' : 'Muted'}</span>
                </button>
              </div>

              {/* Ambient RGB Edge Light Card */}
              <div className="studio-item-card p-4 rounded-2xl bg-white/90 border border-slate-200 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-black text-slate-900">
                    Ambient Soft RGB Perimeter Glow
                  </div>
                  <div className="text-xs text-slate-600 font-medium mt-0.5">
                    Animated rainbow neon light ring along cards, packages, and studio boxes.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleRgbLight}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-black cursor-pointer transition shrink-0 flex items-center gap-1.5 ${
                    rgbLightEnabled
                      ? 'bg-gradient-to-r from-sky-500 via-purple-500 to-pink-500 text-white shadow-sm'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{rgbLightEnabled ? 'RGB ON' : 'RGB OFF'}</span>
                </button>
              </div>

              {/* Audio Test Bench */}
              <div className="studio-item-card p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <span className="text-xs font-black text-slate-800 uppercase block">
                  Audio Test Bench (Tap to Test Sound Waves):
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    data-custom-sound
                    onClick={() => playPop(520)}
                    className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 hover:bg-slate-100 cursor-pointer"
                  >
                    Button Pop (520Hz)
                  </button>
                  <button
                    type="button"
                    data-custom-sound
                    onClick={() => playPop(760)}
                    className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 hover:bg-slate-100 cursor-pointer"
                  >
                    High Pop (760Hz)
                  </button>
                  <button
                    type="button"
                    data-custom-sound
                    onClick={() => playSuccess()}
                    className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                  >
                    Success Chime (Chord)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex flex-wrap items-center justify-between border-t border-slate-200/80 pt-3 gap-2 shrink-0">
            <span className="text-[11px] font-semibold text-slate-500 truncate">
              Saved on your device.
            </span>
            <div className="flex items-center gap-2">
              {isAdminUnlocked && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const adminToken = sessionStorage.getItem('admin_session_token') || '';
                      const res = await fetch('/api/admin/settings/save', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
                        body: JSON.stringify({
                          settings: {
                            default_theme_mode: theme,
                            default_font_mode: font,
                          },
                        }),
                      });
                      const data = await res.json().catch(() => null);
                      if (res.ok && data?.ok) {
                        alert('✅ Theme & Font successfully saved to Supabase as platform defaults for all users!');
                      } else {
                        alert(data?.error || 'Failed to save defaults to database.');
                      }
                    } catch (e: any) {
                      alert('Error saving global default: ' + e.message);
                    }
                  }}
                  title="Make this theme and font active for everyone visiting the website"
                  className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-[11px] font-black transition-colors cursor-pointer"
                >
                  🌍 Set as Global Default
                </button>
              )}
              <button
                type="button"
                data-custom-sound
                onClick={() => {
                  playSuccess();
                  onClose();
                }}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white text-xs font-black transition cursor-pointer shadow-md shrink-0"
              >
                ✓ Done &amp; Apply
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

/**
 * Compact Header Trigger Button for Landing Page, Home Dashboard, and Profile
 */
export const ThemeStudioTriggerButton: React.FC<{
  compact?: boolean;
  className?: string;
}> = ({ compact = false, className = '' }) => {
  const [open, setOpen] = useState(false);
  const { allowUserThemeSwitcher, playPop, theme } = useTactileTheme();
  const currentThemeObj = APP_THEMES_CATALOG.find((t) => t.id === theme) || APP_THEMES_CATALOG[0];

  if (!allowUserThemeSwitcher) return null;

  return (
    <>
      <button
        type="button"
        data-custom-sound
        onClick={() => {
          playPop(680);
          setOpen(true);
        }}
        title="Customize Theme, Font & Sound"
        className={`neu-pill inline-flex items-center justify-center gap-1.5 rounded-xl font-bold transition-all cursor-pointer active:scale-95 ${
          compact
            ? 'w-9 h-9 sm:w-10 sm:h-10 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200/80'
            : 'px-3 py-2 text-xs bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200/80'
        } ${className}`}
      >
        <Palette className="w-4 h-4 text-emerald-600 shrink-0" />
        {!compact && <span className="hidden sm:inline truncate">{currentThemeObj.shortLabel}</span>}
      </button>

      <ThemeFontStudioModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
};
