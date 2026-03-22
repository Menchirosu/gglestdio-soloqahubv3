export class SoundGenerator {
  private audioCtx: AudioContext | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private lfo: OscillatorNode | null = null;
  private filter: BiquadFilterNode | null = null;
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

  private createWhiteNoiseBuffer(duration: number = 2): AudioBuffer {
    this.initAudioCtx();
    const bufferSize = this.audioCtx!.sampleRate * duration;
    const buffer = this.audioCtx!.createBuffer(1, bufferSize, this.audioCtx!.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private stopCurrent() {
    if (this.source) {
      this.source.stop();
      this.source.disconnect();
      this.source = null;
    }
    if (this.lfo) {
      this.lfo.stop();
      this.lfo.disconnect();
      this.lfo = null;
    }
    if (this.filter) {
      this.filter.disconnect();
      this.filter = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
  }

  public play(type: string) {
    this.initAudioCtx();
    this.stopCurrent();
    this.currentSound = type;

    if (type === 'none') return;

    this.gainNode = this.audioCtx!.createGain();
    this.gainNode.gain.value = this.isMuted ? 0 : 0.3;
    this.gainNode.connect(this.audioCtx!.destination);

    const buffer = this.createWhiteNoiseBuffer();
    this.source = this.audioCtx!.createBufferSource();
    this.source.buffer = buffer;
    this.source.loop = true;

    switch (type) {
      case 'rain':
        this.filter = this.audioCtx!.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.frequency.value = 1500;
        this.source.connect(this.filter);
        this.filter.connect(this.gainNode);
        this.gainNode.gain.value = this.isMuted ? 0 : 0.15;
        break;

      case 'waves':
        this.filter = this.audioCtx!.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.frequency.value = 1000;
        
        const waveGain = this.audioCtx!.createGain();
        this.lfo = this.audioCtx!.createOscillator();
        this.lfo.type = 'sine';
        this.lfo.frequency.value = 0.1; // 10 seconds per wave
        
        const lfoGain = this.audioCtx!.createGain();
        lfoGain.gain.value = 0.2;
        
        this.lfo.connect(lfoGain);
        lfoGain.connect(waveGain.gain);
        
        waveGain.gain.value = 0.3;
        
        this.source.connect(this.filter);
        this.filter.connect(waveGain);
        waveGain.connect(this.gainNode);
        
        this.lfo.start();
        this.gainNode.gain.value = this.isMuted ? 0 : 0.2;
        break;

      case 'fire':
        this.filter = this.audioCtx!.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.frequency.value = 400; // Brown-ish noise
        
        // Add some crackle
        const crackleGain = this.audioCtx!.createGain();
        crackleGain.gain.value = 0.05;
        
        this.source.connect(this.filter);
        this.filter.connect(this.gainNode);
        this.gainNode.gain.value = this.isMuted ? 0 : 0.25;
        break;

      case 'forest':
        this.filter = this.audioCtx!.createBiquadFilter();
        this.filter.type = 'bandpass';
        this.filter.frequency.value = 800;
        this.filter.Q.value = 0.5;
        
        this.source.connect(this.filter);
        this.filter.connect(this.gainNode);
        this.gainNode.gain.value = this.isMuted ? 0 : 0.08;
        break;
    }

    this.source.start();
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.gainNode) {
      this.gainNode.gain.setTargetAtTime(muted ? 0 : this.getDefaultGain(this.currentSound), this.audioCtx!.currentTime, 0.1);
    }
  }

  private getDefaultGain(type: string): number {
    switch (type) {
      case 'rain': return 0.15;
      case 'waves': return 0.2;
      case 'fire': return 0.25;
      case 'forest': return 0.08;
      default: return 0.3;
    }
  }

  public stop() {
    this.stopCurrent();
    this.currentSound = 'none';
  }
}
