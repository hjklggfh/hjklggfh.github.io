export interface FrameInfo {
  now: number;
  delta: number;
  fixedAlpha: number;
}

export class Clock {
  private last = performance.now();
  private accumulator = 0;
  readonly fixedStep = 1 / 60;

  begin(now: number): FrameInfo {
    const rawDelta = (now - this.last) / 1000;
    this.last = now;
    const delta = Math.min(0.08, Math.max(0, rawDelta));
    this.accumulator += delta;
    return { now, delta, fixedAlpha: this.accumulator / this.fixedStep };
  }

  consumeFixedStep(): boolean {
    if (this.accumulator >= this.fixedStep) {
      this.accumulator -= this.fixedStep;
      return true;
    }
    return false;
  }
}
