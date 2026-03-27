import { Howl } from 'howler';

const SOUNDS: Record<string, Howl> = {
  rain: new Howl({ src: ['/sounds/rain.mp3'], loop: true, volume: 0.6 }),
  waves: new Howl({ src: ['/sounds/ocean.mp3'], loop: true, volume: 0.5 }),
  fire: new Howl({ src: ['/sounds/fireplace.mp3'], loop: true, volume: 0.7 }),
  forest: new Howl({ src: ['/sounds/forest.mp3'], loop: true, volume: 0.55 }),
};

export class SoundGenerator {
  private current: Howl | null = null;
  private currentType: string = 'none';
  private isMuted: boolean = false;

  public play(type: string) {
    if (this.current) {
      this.current.stop();
      this.current = null;
    }
    this.currentType = type;
    if (type === 'none') return;

    const howl = SOUNDS[type];
    if (!howl) return;

    this.current = howl;
    howl.mute(this.isMuted);
    howl.play();
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.current) this.current.mute(muted);
  }

  public stop() {
    if (this.current) {
      this.current.stop();
      this.current = null;
    }
    this.currentType = 'none';
  }
}
