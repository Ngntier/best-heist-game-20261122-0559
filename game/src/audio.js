// audio.js — every sound is synthesised live with WebAudio: no audio files,
// no network, nothing to download. A tiny helper builds short tones and
// filtered noise bursts, and each game event gets its own small voice.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.alarmOsc = null;
    this.alarmGain = null;
  }

  // The AudioContext only starts after a real user gesture (browser rule).
  unlock() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        this.ctx = null;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  tone(freq, dur, type = 'sine', vol = 0.12, slideTo = null, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  noise(dur, vol = 0.15, freq = 1200, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(gain).connect(this.ctx.destination);
    src.start(t0);
  }

  step(sneaking) {
    this.noise(0.05, sneaking ? 0.02 : 0.045, sneaking ? 500 : 900);
  }

  pickup() {
    this.tone(660, 0.12, 'sine', 0.14);
    this.tone(990, 0.18, 'sine', 0.14, null, 0.09);
    this.tone(1320, 0.22, 'sine', 0.1, null, 0.18);
  }

  grabTick() {
    this.tone(440, 0.05, 'square', 0.05);
  }

  smoke() {
    this.noise(0.5, 0.18, 700);
  }

  emp() {
    this.tone(1800, 0.4, 'sawtooth', 0.08, 120);
    this.noise(0.25, 0.12, 3200);
  }

  lockpick() {
    this.tone(1200, 0.06, 'square', 0.07);
    this.tone(1500, 0.06, 'square', 0.07, null, 0.07);
  }

  spotted() {
    this.tone(220, 0.35, 'sawtooth', 0.12, 440);
  }

  caught() {
    this.tone(330, 0.25, 'sawtooth', 0.14, 110);
    this.tone(165, 0.5, 'sawtooth', 0.14, 55, 0.2);
  }

  escape() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.13, null, i * 0.11));
  }

  win() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.13, null, i * 0.13));
  }

  // A soft two-tone alarm that follows the alarm meter; call every frame.
  alarmLoop(level) {
    if (!this.ctx || this.muted) return;
    if (level < 25) {
      this.stopAlarm();
      return;
    }
    if (!this.alarmOsc) {
      this.alarmOsc = this.ctx.createOscillator();
      this.alarmGain = this.ctx.createGain();
      this.alarmOsc.type = 'sine';
      this.alarmOsc.frequency.value = 620;
      this.alarmGain.gain.value = 0;
      this.alarmOsc.connect(this.alarmGain).connect(this.ctx.destination);
      this.alarmOsc.start();
    }
    const target = 0.02 + (level / 100) * 0.05;
    this.alarmGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.1);
    this.alarmOsc.frequency.setTargetAtTime(620 + (level / 100) * 320, this.ctx.currentTime, 0.2);
  }

  stopAlarm() {
    if (this.alarmOsc) {
      try { this.alarmOsc.stop(); } catch { /* already stopped */ }
      this.alarmOsc = null;
      this.alarmGain = null;
    }
  }
}
