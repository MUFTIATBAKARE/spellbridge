import * as THREE from 'three';

export type UpdateCallback = (delta: number, elapsed: number) => void;
export type RenderCallback = () => void;
export type ResizeCallback = (width: number, height: number) => void;

export class GameLoop {
  private readonly clock: THREE.Clock;
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;

  private readonly updateCallbacks: Set<UpdateCallback> = new Set();
  private readonly renderCallbacks: Set<RenderCallback> = new Set();
  private readonly resizeCallbacks: Set<ResizeCallback> = new Set();

  private readonly handleWindowResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.resizeCallbacks.forEach((cb) => cb(width, height));
  };

  private readonly handleVisibilityChange = (): void => {
    if (document.hidden) {
      // Pause clock when tab is hidden to prevent delta jumps upon return
      this.clock.stop();
    } else {
      this.clock.start();
    }
  };

  constructor() {
    this.clock = new THREE.Clock(false);
    window.addEventListener('resize', this.handleWindowResize, { passive: true });
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  public onUpdate(callback: UpdateCallback): () => void {
    this.updateCallbacks.add(callback);
    return () => this.updateCallbacks.delete(callback);
  }

  public onRender(callback: RenderCallback): () => void {
    this.renderCallbacks.add(callback);
    return () => this.renderCallbacks.delete(callback);
  }

  public onResize(callback: ResizeCallback): () => void {
    this.resizeCallbacks.add(callback);
    return () => this.resizeCallbacks.delete(callback);
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clock.start();

    const loop = (): void => {
      if (!this.isRunning) return;

      // Delta time strictly clamped at 0.1s to avoid physics spikes
      const rawDelta = this.clock.getDelta();
      const delta = Math.min(rawDelta, 0.1);
      const elapsed = this.clock.getElapsedTime();

      this.updateCallbacks.forEach((cb) => cb(delta, elapsed));
      this.renderCallbacks.forEach((cb) => cb());

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  public stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    this.clock.stop();
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public destroy(): void {
    this.stop();
    window.removeEventListener('resize', this.handleWindowResize);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.updateCallbacks.clear();
    this.renderCallbacks.clear();
    this.resizeCallbacks.clear();
  }
}

