export class SoundGenerator {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private nodes: AudioNode[] = [];
  private chirpTimeout: ReturnType<typeof setTimeout> | null = null;
  private isMuted: boolean = false;
  private currentSound: string = 'none';

  constructor() {}

  private initAudioCtx() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  /** Pink noise approximation: white noise passed through a series of low-pass filters */
  private createPinkNoiseBuffer(duration = 30): AudioBuffer {
    const ctx = this.audioCtx!;
    const sampleRate = ctx.sampleRate;
    const bufferSize = sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    // Paul Kellett's pink noise algorithm
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    return buffer;
  }

  /** Brown/red noise: each sample is previous + small random step */
  private createBrownNoiseBuffer(duration = 30): AudioBuffer {
    const ctx = this.audioCtx!;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5; // compensate for reduced amplitude
    }
    return buffer;
  }

  private createLoopingSource(buffer: AudioBuffer): AudioBufferSourceNode {
    const src = this.audioCtx!.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    // Random loop start to prevent phase coherence artifacts
    src.loopStart = Math.random() * buffer.duration * 0.5;
    src.loopEnd = buffer.duration;
    return src;
  }

  private createFilter(type: BiquadFilterType, freq: number, q = 1, gain = 0): BiquadFilterNode {
    const f = this.audioCtx!.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    f.gain.value = gain;
    return f;
  }

  private createLFO(freq: number, depth: number, target: AudioParam) {
    const lfo = this.audioCtx!.createOscillator();
    const lfoGain = this.audioCtx!.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = freq;
    lfoGain.gain.value = depth;
    lfo.connect(lfoGain);
    lfoGain.connect(target);
    lfo.start();
    this.nodes.push(lfo, lfoGain);
  }

  private stopAll() {
    if (this.chirpTimeout) {
      clearTimeout(this.chirpTimeout);
      this.chirpTimeout = null;
    }
    this.nodes.forEach(n => {
      try { (n as any).stop?.(); } catch {}
      try { n.disconnect(); } catch {}
    });
    this.nodes = [];
    if (this.masterGain) {
      try { this.masterGain.disconnect(); } catch {}
      this.masterGain = null;
    }
    this.currentSound = 'none';
  }

  private track(...nodes: AudioNode[]) {
    this.nodes.push(...nodes);
  }

  public play(type: string) {
    this.initAudioCtx();
    this.stopAll();
    this.currentSound = type;
    if (type === 'none') return;

    const ctx = this.audioCtx!;
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = this.isMuted ? 0 : this.getDefaultGain(type);
    this.masterGain.connect(ctx.destination);

    switch (type) {
      case 'rain':
        this.playRain();
        break;
      case 'waves':
        this.playWaves();
        break;
      case 'fire':
        this.playFire();
        break;
      case 'forest':
        this.playForest();
        break;
    }
  }

  // ─── Rain ─────────────────────────────────────────────────────────────────
  // Pink noise → gentle lowpass (mimics rain patter) + shimmer LFO
  private playRain() {
    const ctx = this.audioCtx!;

    // Main rain layer: pink noise shaped with cascaded lowpass filters
    const pinkBuf = this.createPinkNoiseBuffer(30);
    const src = this.createLoopingSource(pinkBuf);

    // 3-stage lowpass cascade for a soft "shhh" texture
    const lp1 = this.createFilter('lowpass', 5000);
    const lp2 = this.createFilter('lowpass', 2500);
    const lp3 = this.createFilter('lowpass', 1200);

    // Shimmer layer: another source at lower amplitude + slightly different frequency
    const src2 = this.createLoopingSource(pinkBuf);
    const shimmerGain = ctx.createGain();
    shimmerGain.gain.value = 0.35;
    const shLp = this.createFilter('lowpass', 3000);

    // Wire main rain path
    src.connect(lp1);
    lp1.connect(lp2);
    lp2.connect(lp3);
    lp3.connect(this.masterGain!);

    // Wire shimmer
    src2.connect(shLp);
    shLp.connect(shimmerGain);
    shimmerGain.connect(this.masterGain!);

    // Slow amplitude modulation ~3Hz for the patter rhythm
    this.createLFO(3.2, 0.08, this.masterGain!.gain);

    src.start();
    src2.start();
    this.track(src, src2, lp1, lp2, lp3, shimmerGain, shLp);
  }

  // ─── Ocean Waves ──────────────────────────────────────────────────────────
  // Pink noise + two amplitude LFOs at different rates
  private playWaves() {
    const ctx = this.audioCtx!;
    const pinkBuf = this.createPinkNoiseBuffer(30);
    const src = this.createLoopingSource(pinkBuf);

    // Deep lowpass for the rumble of the ocean floor
    const lp = this.createFilter('lowpass', 700, 0.8);
    // High-shelf cut to remove harsh high frequencies
    const shelf = this.createFilter('highshelf', 2000, 1, -14);

    src.connect(lp);
    lp.connect(shelf);
    shelf.connect(this.masterGain!);

    // Slow primary wave (every ~20s)
    this.createLFO(0.05, 0.25, this.masterGain!.gain);
    // Secondary irregular surge (every ~7s) offset phase
    this.createLFO(0.13, 0.12, this.masterGain!.gain);
    // Slight pitch shimmer
    this.createLFO(0.07, 3, src.playbackRate);

    src.start();
    this.track(src, lp, shelf);
  }

  // ─── Fire ─────────────────────────────────────────────────────────────────
  // Brown noise (deep rumble) + sporadic high-frequency crackle bursts
  private playFire() {
    const ctx = this.audioCtx!;
    const brownBuf = this.createBrownNoiseBuffer(30);
    const src = this.createLoopingSource(brownBuf);

    // Warm low-pass for the base flame hiss
    const lp = this.createFilter('lowpass', 500, 0.5);
    // Slight high-mid presence for the crackling character
    const peak = this.createFilter('peaking', 1800, 2, 4);

    // Slow amplitude flicker (3–5Hz like a real flame)
    const flickerGain = ctx.createGain();
    flickerGain.gain.value = 0.85;

    src.connect(lp);
    lp.connect(peak);
    peak.connect(flickerGain);
    flickerGain.connect(this.masterGain!);

    this.createLFO(4.5, 0.15, flickerGain.gain);
    this.createLFO(1.8, 0.08, flickerGain.gain);

    // Crackle layer: filtered white noise burst every 0.3–1.5s
    const crackBuf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
    const cd = crackBuf.getChannelData(0);
    for (let i = 0; i < cd.length; i++) cd[i] = Math.random() * 2 - 1;

    const schedCrackle = () => {
      if (this.currentSound !== 'fire') return;
      const c = ctx.createBufferSource();
      c.buffer = crackBuf;
      const cg = ctx.createGain();
      const crackLp = ctx.createBiquadFilter();
      crackLp.type = 'highpass';
      crackLp.frequency.value = 2000;
      cg.gain.value = 0.04 + Math.random() * 0.06;
      c.connect(crackLp);
      crackLp.connect(cg);
      cg.connect(this.masterGain!);
      c.start();
      this.chirpTimeout = setTimeout(schedCrackle, 300 + Math.random() * 1200);
    };
    schedCrackle();

    src.start();
    this.track(src, lp, peak, flickerGain);
  }

  // ─── Forest ───────────────────────────────────────────────────────────────
  // Wind layer (pink bandpass) + scheduled periodic bird chirps
  private playForest() {
    const ctx = this.audioCtx!;
    const pinkBuf = this.createPinkNoiseBuffer(30);
    const windSrc = this.createLoopingSource(pinkBuf);

    // Narrow bandpass for wind through leaves
    const windBp = this.createFilter('bandpass', 900, 0.4);
    const windLp = this.createFilter('lowpass', 400);
    const windGain = ctx.createGain();
    windGain.gain.value = 0.5;

    windSrc.connect(windBp);
    windBp.connect(windLp);
    windLp.connect(windGain);
    windGain.connect(this.masterGain!);

    // Slow wind swell
    this.createLFO(0.08, 0.15, windGain.gain);

    // Bird chirp scheduler: short sine bursts at bird-like frequencies
    const birdFreqs = [2800, 3400, 2200, 4000, 3100, 2600];
    const schedBird = () => {
      if (this.currentSound !== 'forest') return;
      const freq = birdFreqs[Math.floor(Math.random() * birdFreqs.length)];
      const chirpCount = 2 + Math.floor(Math.random() * 4); // 2–5 notes
      for (let i = 0; i < chirpCount; i++) {
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq + (Math.random() - 0.5) * 400;
        env.gain.value = 0;
        osc.connect(env);
        env.connect(this.masterGain!);
        const t = ctx.currentTime + i * 0.12;
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(0.06, t + 0.02);
        env.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        osc.start(t);
        osc.stop(t + 0.1);
      }
      // Next bird call in 2–8 seconds
      this.chirpTimeout = setTimeout(schedBird, 2000 + Math.random() * 6000);
    };
    setTimeout(schedBird, 1000 + Math.random() * 3000);

    windSrc.start();
    this.track(windSrc, windBp, windLp, windGain);
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.audioCtx) {
      const target = muted ? 0 : this.getDefaultGain(this.currentSound);
      this.masterGain.gain.setTargetAtTime(target, this.audioCtx.currentTime, 0.15);
    }
  }

  private getDefaultGain(type: string): number {
    switch (type) {
      case 'rain':   return 0.6;
      case 'waves':  return 0.5;
      case 'fire':   return 0.7;
      case 'forest': return 0.55;
      default:       return 0.5;
    }
  }

  public stop() {
    this.stopAll();
  }
}
