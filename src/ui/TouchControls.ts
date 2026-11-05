type MoveAction = 'jump' | 'dash' | 'slide';
type Action = MoveAction | 'pause' | 'inventory' | 'attack' | 'extract';

export class TouchControls {
  private readonly root = document.createElement('div');
  private readonly events = new AbortController();
  private readonly stick: HTMLElement;
  private readonly knob: HTMLElement;
  private moveId: number | null = null;
  private lookId: number | null = null;
  private lastX = 0;
  private lastY = 0;
  private lookX = 0;
  private lookY = 0;
  private right = 0;
  private forward = 0;
  private readonly pressed = new Set<MoveAction>();

  constructor(parent: HTMLElement, onAction: (action: 'pause' | 'inventory' | 'attack' | 'extract') => void) {
    this.root.className = 'touch-controls';
    this.root.hidden = true;
    this.root.innerHTML = `
      <div class="touch-look" aria-label="드래그로 시점 회전"></div>
      <div class="touch-stick" aria-label="이동 조이스틱"><div></div></div>
      <div class="touch-actions">
        <button type="button" data-action="slide">슬라이드</button>
        <button type="button" data-action="dash">대시</button>
        <button type="button" data-action="jump">점프</button>
        <button type="button" data-action="attack">공격</button>
        <button type="button" data-action="extract">추출</button>
      </div>
      <div class="touch-menu">
        <button type="button" data-action="inventory">소지품</button>
        <button type="button" data-action="pause">정지</button>
      </div>`;
    this.stick = this.root.querySelector<HTMLElement>('.touch-stick')!;
    this.knob = this.stick.firstElementChild as HTMLElement;
    const look = this.root.querySelector<HTMLElement>('.touch-look')!;
    const options = { signal: this.events.signal };
    this.stick.addEventListener('pointerdown', event => {
      if (this.moveId !== null) return;
      this.moveId = event.pointerId;
      this.stick.setPointerCapture(event.pointerId);
      this.move(event);
    }, options);
    this.stick.addEventListener('pointermove', event => {
      if (event.pointerId === this.moveId) this.move(event);
    }, options);
    look.addEventListener('pointerdown', event => {
      if (this.lookId !== null) return;
      this.lookId = event.pointerId;
      this.lastX = event.clientX;
      this.lastY = event.clientY;
      look.setPointerCapture(event.pointerId);
    }, options);
    look.addEventListener('pointermove', event => {
      if (event.pointerId !== this.lookId) return;
      this.lookX += (event.clientX - this.lastX) * 2;
      this.lookY += (event.clientY - this.lastY) * 2;
      this.lastX = event.clientX;
      this.lastY = event.clientY;
    }, options);
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
      this.stick.addEventListener(type, event => {
        if (event.pointerId === this.moveId) this.resetMove();
      }, options);
      look.addEventListener(type, event => {
        if (event.pointerId === this.lookId) this.lookId = null;
      }, options);
    }
    for (const button of this.root.querySelectorAll<HTMLButtonElement>('button')) {
      const action = button.dataset['action'] as Action;
      if (action === 'pause' || action === 'inventory' || action === 'attack' || action === 'extract') {
        button.addEventListener('click', () => onAction(action), options);
      } else {
        button.addEventListener('pointerdown', () => this.pressed.add(action), options);
        button.addEventListener('click', event => {
          if (event.detail === 0) this.pressed.add(action);
        }, options);
      }
    }
    parent.append(this.root);
  }

  private move(event: PointerEvent): void {
    const bounds = this.stick.getBoundingClientRect();
    const radius = bounds.width * 0.36;
    const dx = event.clientX - bounds.left - bounds.width / 2;
    const dy = event.clientY - bounds.top - bounds.height / 2;
    const distance = Math.hypot(dx, dy);
    const scale = distance > radius * 0.12 ? Math.min(1 / radius, 1 / distance) : 0;
    this.right = dx * scale;
    this.forward = -dy * scale;
    this.knob.style.transform = `translate(${this.right * radius}px, ${-this.forward * radius}px)`;
  }

  private resetMove(): void {
    this.moveId = null;
    this.forward = 0;
    this.right = 0;
    this.knob.style.transform = '';
  }

  intent() {
    return {
      forward: this.forward, right: this.right,
      jump: this.pressed.delete('jump'),
      dash: this.pressed.delete('dash'),
      slide: this.pressed.delete('slide'),
    };
  }

  look() {
    const result = { x: this.lookX, y: this.lookY };
    this.lookX = 0;
    this.lookY = 0;
    return result;
  }

  show(visible: boolean): void {
    this.root.hidden = !visible;
    if (visible) return;
    this.resetMove();
    this.lookId = null;
    this.look();
    this.pressed.clear();
  }

  dispose(): void {
    this.events.abort();
    this.root.remove();
  }
}
