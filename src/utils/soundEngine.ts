import { AlarmTone } from '../types/todo';

class ContinuousAlarmEngine {
  private audioCtx: AudioContext | null = null;
  private soundTimer: number | null = null;
  private vibrationTimer: number | null = null;
  private isPlaying = false;
  private currentTone: AlarmTone = 'chime';
  private currentVolume = 0.75;

  public unlockAudio(): boolean {
    if (typeof window === 'undefined') return false;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return false;
    if (!this.audioCtx) {
      this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx.state === 'running';
  }

  public isAudioReady(): boolean {
    return !!this.audioCtx && this.audioCtx.state === 'running';
  }

  private playBurst(tone: AlarmTone, volume: number) {
    this.unlockAudio();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(Math.max(0.05, Math.min(1, volume)), now);
    masterGain.connect(ctx.destination);

    const scheduleNote = (freq: number, startOffset: number, duration: number, type: OscillatorType = 'sine') => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + startOffset);

      gain.gain.setValueAtTime(0.001, now + startOffset);
      gain.gain.exponentialRampToValueAtTime(0.45, now + startOffset + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + duration);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now + startOffset);
      osc.stop(now + startOffset + duration + 0.03);
    };

    switch (tone) {
      case 'chime':
        // Ascending warm harmonic chime (C5 - E5 - G5 - C6)
        scheduleNote(523.25, 0.0, 0.35, 'triangle');
        scheduleNote(659.25, 0.14, 0.35, 'triangle');
        scheduleNote(783.99, 0.28, 0.42, 'triangle');
        scheduleNote(1046.5, 0.42, 0.65, 'sine');
        break;
      case 'beacon':
        // Clear attention-grabbing dual pulse
        scheduleNote(880, 0.0, 0.16, 'square');
        scheduleNote(880, 0.22, 0.16, 'square');
        scheduleNote(1174.66, 0.44, 0.28, 'triangle');
        break;
      case 'bell':
        // Resonant bell strike
        scheduleNote(698.46, 0.0, 0.85, 'sine');
        scheduleNote(1396.91, 0.0, 0.45, 'sine');
        scheduleNote(880, 0.35, 0.75, 'sine');
        break;
      case 'pulse':
        // Crisp modern rhythmic triplet
        scheduleNote(587.33, 0.0, 0.14, 'sine');
        scheduleNote(739.99, 0.16, 0.14, 'sine');
        scheduleNote(880, 0.32, 0.24, 'sine');
        break;
    }
  }

  public previewTone(tone: AlarmTone, volume: number) {
    this.playBurst(tone, volume);
  }

  public startContinuous(options: {
    sound: boolean;
    vibration: boolean;
    tone: AlarmTone;
    volume: number;
  }) {
    this.stop();
    this.isPlaying = true;
    this.currentTone = options.tone;
    this.currentVolume = options.volume;

    if (options.sound) {
      this.playBurst(this.currentTone, this.currentVolume);
      this.soundTimer = window.setInterval(() => {
        if (!this.isPlaying) return;
        this.playBurst(this.currentTone, this.currentVolume);
      }, 1700);
    }

    if (options.vibration && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([320, 140, 320, 620]);
      } catch {
        // Ignore on unsupported browsers
      }
      this.vibrationTimer = window.setInterval(() => {
        if (!this.isPlaying) return;
        try {
          navigator.vibrate([320, 140, 320, 620]);
        } catch {
          // Ignore
        }
      }, 1500);
    }
  }

  public stop() {
    this.isPlaying = false;
    if (this.soundTimer !== null) {
      window.clearInterval(this.soundTimer);
      this.soundTimer = null;
    }
    if (this.vibrationTimer !== null) {
      window.clearInterval(this.vibrationTimer);
      this.vibrationTimer = null;
    }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(0);
      } catch {
        // Ignore
      }
    }
  }

  public triggerHapticTap(ms = 14) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch {
        // Ignore
      }
    }
  }
}

export const alarmEngine = new ContinuousAlarmEngine();
