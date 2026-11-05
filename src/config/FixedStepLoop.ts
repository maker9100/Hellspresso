import { TUNABLES } from '../config/tunables';

export class FixedStepper {
  private accumulated = 0;
  private running = false;
  readonly step = 1 / TUNABLES.clock.fixedHz;

  constructor(private readonly update: (seconds: number) => void) {}
  get pendingSeconds(): number { return this.accumulated; }
  setRunning(value: boolean): void { this.running = value; }
  reset(): void { this.accumulated = 0; }

  frame(seconds: number): number {
    if (!Number.isFinite(seconds) || seconds < 0) throw new RangeError('잘못된 프레임 시간');
    if (this.running) this.accumulated += seconds;
    let count = 0;
    while (this.accumulated + Number.EPSILON >= this.step && count < TUNABLES.clock.maxStepsPerFrame) {
      this.accumulated = Math.max(0, this.accumulated - this.step);
      this.update(this.step);
      count += 1;
    }
    return count;
  }
}

export class FixedStepLoop {
  readonly stepper: FixedStepper;
  private last = performance.now();
  private handle = 0;
  private disposed = false;
  private capturing = false;

  constructor(update: (seconds: number) => void, private readonly render: (delta: number) => void) {
    this.stepper = new FixedStepper(update);
  }

  start(): void {
    this.last = performance.now();
    this.handle = requestAnimationFrame(this.frame);
  }

  setRunning(running: boolean): void {
    this.capture(); // 상태 전환 시점까지 경과한 활성 시간을 먼저 정산한다.
    this.stepper.setRunning(running);
  }

  reset(): void { this.stepper.reset(); this.last = performance.now(); }

  private capture(): number {
    if (this.capturing) return 0;
    this.capturing = true;
    const now = performance.now();
    const elapsed = Math.max(0, (now - this.last) / 1000);
    this.last = now;
    try { this.stepper.frame(elapsed); }
    finally { this.capturing = false; }
    return elapsed;
  }

  private readonly frame = (): void => {
    if (this.disposed) return;
    this.render(this.capture());
    this.handle = requestAnimationFrame(this.frame);
  };

  dispose(): void { this.disposed = true; cancelAnimationFrame(this.handle); }
}
