// ============================================================================
// File: src/utils/audioSynth.ts
// Pure Web Audio API Sound Generator (Zero External Assets Needed!)
// ============================================================================

class TactileAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    try {
      const saved = localStorage.getItem('app_sound_muted');
      this.isMuted = saved === 'true';
    } catch {
      this.isMuted = false;
    }
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    try {
      localStorage.setItem('app_sound_muted', String(muted));
    } catch {
      // ignore storage errors
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    if (!this.isMuted) {
      this.playPop(660);
    }
    return this.isMuted;
  }

  /**
   * 1. Tactile Pop Sound (For buttons, tabs, toggles, filter chips)
   * Frequency: 400Hz - 900Hz. Duration: 75ms.
   */
  public playPop(freq = 520) {
    if (this.isMuted || typeof window === 'undefined') return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.35, t + 0.065);

      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.075);
    } catch {
      // Gracefully silent if user has not interacted with DOM yet
    }
  }

  /**
   * 2. Success Chord (For copy to clipboard, reward claims, checkout, saved alerts)
   * Polyphonic 3-note ascending chime (C6 -> E6 -> G6)
   */
  public playSuccess() {
    if (this.isMuted || typeof window === 'undefined') return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const notes = [1046.5, 1318.5, 1567.98]; // C6, E6, G6
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const t = this.ctx.currentTime + idx * 0.065;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.05, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.19);
      });
    } catch {
      // ignore audio context error
    }
  }

  /**
   * 3. Warning / Delete Tone (For delete actions, validations, errors)
   * Descending low-frequency buzz
   */
  public playWarning() {
    if (this.isMuted || typeof window === 'undefined') return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, t);
      osc.frequency.exponentialRampToValueAtTime(130, t + 0.12);

      gain.gain.setValueAtTime(0.04, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.14);
    } catch {
      // ignore audio context error
    }
  }

  /**
   * 4. Laser Snap / Confetti Blast (For celebrating grand events, modal opens)
   */
  public playSnap() {
    if (this.isMuted || typeof window === 'undefined') return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, t);
      osc.frequency.exponentialRampToValueAtTime(200, t + 0.09);

      gain.gain.setValueAtTime(0.07, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.095);
    } catch {
      // ignore audio context error
    }
  }
}

export const soundFx = new TactileAudioEngine();
