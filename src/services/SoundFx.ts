/**
 * SoundFx.ts
 * 
 * Zero-dependency Web Audio API synthesizer for SpellBridge 3D:
 * - Hop wood-pop: snappy acoustic pop on stepping stone jump
 * - Ascending chime: pleasant harmonic tone on correct letter step
 * - Victory fanfare: cheerful arpeggiated chord progression on word completion
 * - Water splash / wobble: gentle bubble drop and wobble tone on wrong step
 * - Game over tone: descending melodic chime
 * 
 * Auto-unlocks AudioContext on user interaction to comply with browser autoplay policies.
 */

export class SoundFx {
  private static instance: SoundFx | null = null;
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    this.initAudioUnlock();
  }

  public static getInstance(): SoundFx {
    if (!SoundFx.instance) {
      SoundFx.instance = new SoundFx();
    }
    return SoundFx.instance;
  }

  private initAudioUnlock(): void {
    const unlock = () => {
      this.ensureContext();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };

    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
  }

  private ensureContext(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    return this.ctx;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
  }

  /**
   * Snappy wooden pop sound when character hops
   */
  public playHop(): void {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.08);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  /**
   * Ascending bell / marimba chime for correct letter
   * @param stepIndex 0, 1, 2, ... pitch ascends with each letter in word
   */
  public playCorrect(stepIndex: number = 0): void {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const baseFreqs = [392.0, 440.0, 523.25, 587.33, 659.25, 783.99]; // G4, A4, C5, D5, E5, G5
    const freq = baseFreqs[stepIndex % baseFreqs.length];

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    // Subtle harmonic overtone
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2, now);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.35);
    osc2.stop(now + 0.35);
  }

  /**
   * Sinking water splash / wobble for incorrect letter
   */
  public playWrong(): void {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Pitch wobble oscillator
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(140, now + 0.1);
    osc.frequency.linearRampToValueAtTime(90, now + 0.28);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    // Water bubble pop
    const bubbleOsc = ctx.createOscillator();
    const bubbleGain = ctx.createGain();
    bubbleOsc.type = 'sine';
    bubbleOsc.frequency.setValueAtTime(450, now);
    bubbleOsc.frequency.exponentialRampToValueAtTime(180, now + 0.2);
    bubbleGain.gain.setValueAtTime(0.18, now);
    bubbleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    bubbleOsc.connect(bubbleGain);
    bubbleGain.connect(ctx.destination);

    osc.start(now);
    bubbleOsc.start(now);
    osc.stop(now + 0.3);
    bubbleOsc.stop(now + 0.25);
  }

  /**
   * Triumphant victory fanfare when completing word
   */
  public playVictory(): void {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const notes = [
      { f: 523.25, t: 0.00, d: 0.12 }, // C5
      { f: 659.25, t: 0.11, d: 0.12 }, // E5
      { f: 783.99, t: 0.22, d: 0.12 }, // G5
      { f: 1046.5, t: 0.33, d: 0.45 }, // C6
    ];

    const start = ctx.currentTime;
    notes.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, start + note.t);

      gain.gain.setValueAtTime(0.25, start + note.t);
      gain.gain.exponentialRampToValueAtTime(0.001, start + note.t + note.d);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start + note.t);
      osc.stop(start + note.t + note.d);
    });
  }

  /**
   * Game Over descending tone
   */
  public playGameOver(): void {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const notes = [
      { f: 392.0, t: 0.00, d: 0.2 }, // G4
      { f: 349.2, t: 0.18, d: 0.2 }, // F4
      { f: 311.1, t: 0.36, d: 0.2 }, // Eb4
      { f: 261.6, t: 0.54, d: 0.5 }, // C4
    ];

    const start = ctx.currentTime;
    notes.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.f, start + note.t);

      gain.gain.setValueAtTime(0.22, start + note.t);
      gain.gain.exponentialRampToValueAtTime(0.001, start + note.t + note.d);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start + note.t);
      osc.stop(start + note.t + note.d);
    });
  }
}
