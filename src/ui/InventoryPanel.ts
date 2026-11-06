import { RULES } from '../config/rules';
import { TUNABLES } from '../config/tunables';
import { BAG, EQUIPMENT, ITEMS, footprint } from '../core/Inventory';
import type { BagPlacement, EquipmentId, Inventory, ItemId } from '../core/Inventory';
import './inventory.css';

const SLOT_LABELS: Record<EquipmentId, string> = { cutter: '근접 무기', extractor: '생존 장비' };
const ICONS: Record<ItemId, string> = {
  cutter: '<path fill="#c5c7bc" d="M38 23h19l14 7-4 5H38z"/><path fill="#747870" d="m45 23 3 12h2l-3-12zm10 0 3 12h2l-3-12z"/><path fill="#b78043" d="M10 20h33l4 6v10l-4 5H10l-5-5V25z"/><path fill="#372b22" d="M12 29h19v7H12zm22-4h8v8h-8z"/>',
  extractor: '<path fill="#7a7870" d="M10 16h38l9 7v15l-6 5H10z"/><path fill="#a7967b" d="M52 25h18v11H52z"/><path fill="#434742" d="M9 20h42v17H9zm11 18h18l-5 15H19z"/><path fill="#b54f3d" d="M16 23h23v10H16z"/><path fill="#f2b287" d="M21 26h12v2H21z"/><path fill="#6c6b60" d="M4 20h8v17H4z"/>',
  essence: '<path fill="#bebbb1" d="M31 7h14v8l5 6v23l-5 5H31l-5-5V21l5-6z"/><path fill="#9e3930" d="M30 25h16v16l-3 4H33l-3-4z"/><path fill="#e19a76" d="M32 27h3v12h-3z"/><path fill="#59594f" d="M30 6h16v9H30z"/>',
};

type Target = { kind: 'bag'; column: number; row: number } | { kind: 'slot'; id: EquipmentId };

interface Drag {
  pointer: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  grabColumn: number;
  grabRow: number;
  moving: boolean;
}

function icon(id: ItemId): string {
  return `<svg viewBox="0 0 76 56" aria-hidden="true" focusable="false">${ICONS[id]}</svg>`;
}

function rectStyle(element: HTMLElement, placement: BagPlacement, id: ItemId): void {
  const { width, height } = footprint(id, placement.rotated);
  element.style.left = `${placement.column / BAG.columns * 100}%`;
  element.style.top = `${placement.row / BAG.rows * 100}%`;
  element.style.width = `${width / BAG.columns * 100}%`;
  element.style.height = `${height / BAG.rows * 100}%`;
}

export class InventoryPanel {
  readonly root = document.createElement('section');
  private readonly events = new AbortController();
  private readonly grid: HTMLElement;
  private readonly cards: HTMLElement;
  private readonly preview: HTMLElement;
  private readonly slots: Record<EquipmentId, HTMLButtonElement>;
  private readonly capacity: HTMLElement;
  private readonly caf: HTMLElement;
  private readonly fuel: HTMLProgressElement;
  private readonly info: HTMLElement;
  private readonly status: HTMLElement;
  private readonly rotateButton: HTMLButtonElement;
  private readonly gearButton: HTMLButtonElement;
  private readonly extractButton: HTMLButtonElement;
  private readonly cancelButton: HTMLButtonElement;
  private active = false;
  private revision = -1;
  private selected: ItemId | undefined;
  private rotated = false;
  private drag: Drag | undefined;
  private blockClickUntil = 0;

  constructor(private readonly inventory: Inventory, private readonly callbacks: { resume: () => void; extract: () => void }) {
    this.root.className = 'inventory-board';
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-labelledby', 'inventory-heading');
    this.root.innerHTML = `
      <header class="inventory-header">
        <div>
          <p class="inventory-kicker">HELLSPRESSO / FIELD LOADOUT</p>
          <h2 id="inventory-heading">인벤토리</h2>
        </div>
        <div class="inventory-fuel">
          <div><b>CAF</b> <span data-inventory-caf></span></div>
          <progress aria-label="카페인" max="${RULES.resources.caffeineMax}" value="0"></progress>
        </div>
        <button type="button" class="inventory-return" data-inventory-action="resume">게임으로 돌아가기 <span aria-hidden="true">↗</span></button>
      </header>
      <div class="inventory-layout">
        <section class="inventory-panel inventory-equipment" aria-labelledby="equipment-heading">
          <div class="inventory-panel-head"><h3 id="equipment-heading">장비 슬롯</h3><span>01 / EQUIPMENT</span></div>
          <div class="inventory-slots">
            ${EQUIPMENT.map(id => `<button type="button" class="inventory-slot" data-slot="${id}"></button>`).join('')}
          </div>
        </section>
        <section class="inventory-panel inventory-pack" aria-labelledby="bag-heading">
          <div class="inventory-panel-head"><h3 id="bag-heading">휴대 가방</h3><span data-inventory-capacity></span></div>
          <div class="inventory-grid" aria-label="8×6 휴대 가방">
            <div class="inventory-cells"></div>
            <div class="inventory-cards"></div>
            <div class="inventory-preview" aria-hidden="true" hidden></div>
          </div>
        </section>
      </div>
      <div class="inventory-details">
        <div data-inventory-info class="inventory-info"></div>
        <div class="inventory-actions">
          <button type="button" data-inventory-action="gear" hidden></button>
          <button type="button" data-inventory-action="extract" hidden>정수 추출</button>
          <button type="button" data-inventory-action="rotate" disabled>90° 회전 <kbd>R</kbd></button>
          <button type="button" data-inventory-action="cancel" disabled>선택 취소</button>
        </div>
        <p class="inventory-status" data-inventory-status role="status"></p>
      </div>
      <footer class="inventory-footer"><b>● 실시간</b> 인벤토리를 보는 동안에도 CAF가 줄어들고 적은 움직인다.</footer>`;
    const get = <T extends HTMLElement>(selector: string): T => {
      const element = this.root.querySelector<T>(selector);
      if (!element) throw new Error(`인벤토리 요소 없음: ${selector}`);
      return element;
    };
    this.grid = get('.inventory-grid');
    this.cards = get('.inventory-cards');
    this.preview = get('.inventory-preview');
    this.slots = { cutter: get('[data-slot="cutter"]'), extractor: get('[data-slot="extractor"]') };
    this.capacity = get('[data-inventory-capacity]');
    this.caf = get('[data-inventory-caf]');
    this.fuel = get('progress');
    this.info = get('[data-inventory-info]');
    this.status = get('[data-inventory-status]');
    this.rotateButton = get('[data-inventory-action="rotate"]');
    this.gearButton = get('[data-inventory-action="gear"]');
    this.extractButton = get('[data-inventory-action="extract"]');
    this.cancelButton = get('[data-inventory-action="cancel"]');

    this.grid.style.setProperty('--bag-columns', String(BAG.columns));
    this.grid.style.setProperty('--bag-rows', String(BAG.rows));
    const cells = get('.inventory-cells');
    for (let row = 0; row < BAG.rows; row++) {
      for (let column = 0; column < BAG.columns; column++) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'inventory-cell';
        cell.dataset['column'] = String(column);
        cell.dataset['row'] = String(row);
        cell.tabIndex = -1;
        cell.setAttribute('aria-label', `가방 ${row + 1}행 ${column + 1}열`);
        cells.append(cell);
      }
    }

    const options = { signal: this.events.signal };
    this.root.addEventListener('click', this.click, options);
    this.root.addEventListener('pointerdown', this.pointerDown, options);
    this.root.addEventListener('pointerleave', () => { if (!this.drag) this.showTarget(null); }, options);
    this.root.addEventListener('contextmenu', event => event.preventDefault(), options);
    document.addEventListener('pointermove', this.pointerMove, options);
    document.addEventListener('pointerup', this.pointerUp, options);
    document.addEventListener('pointercancel', event => {
      if (this.drag?.pointer === event.pointerId) this.releaseDrag();
    }, options);
    document.addEventListener('keydown', this.keyDown, { ...options, capture: true });
  }

  open(): void {
    this.active = true;
    this.selected = undefined;
    this.rotated = false;
    this.renderItems();
    this.describeSelection();
    this.setStatus(this.defaultHint());
    this.root.querySelector<HTMLButtonElement>('.inventory-return')?.focus({ preventScroll: true });
  }

  close(): void {
    this.active = false;
    this.releaseDrag();
    this.selected = undefined;
  }

  update(caffeine: number): void {
    if (!this.active) return;
    if (this.fuel.value !== Math.ceil(caffeine)) {
      this.fuel.value = Math.ceil(caffeine);
      this.caf.textContent = `${Math.ceil(caffeine)} / ${RULES.resources.caffeineMax}`;
      this.root.classList.toggle('inventory-fuel-low', caffeine <= TUNABLES.debug.caffeineWarning);
    }
    if (this.revision === this.inventory.revision) return;
    if (this.selected && !this.inventory.get(this.selected)) {
      this.selected = undefined;
      this.releaseDrag();
    }
    this.renderItems();
    this.describeSelection();
  }

  notify(message: string): void {
    if (this.active) this.setStatus(message);
  }

  dispose(): void {
    this.close();
    this.events.abort();
    this.root.remove();
  }

  private defaultHint(): string {
    return matchMedia('(pointer: coarse)').matches
      ? '아이템을 탭한 뒤 빈 칸이나 장비 슬롯을 탭해 옮긴다.'
      : '아이템을 드래그하거나 선택 후 빈 칸을 클릭한다. R 키로 회전.';
  }

  private setStatus(message: string, invalid = false): void {
    this.status.textContent = message;
    this.status.classList.toggle('inventory-invalid', invalid);
  }

  private renderItems(): void {
    this.revision = this.inventory.revision;
    const focus = this.root.contains(document.activeElement)
      ? (document.activeElement as HTMLElement).dataset['item'] : undefined;
    for (const id of EQUIPMENT) {
      const button = this.slots[id];
      const equipped = this.inventory.isEquipped(id);
      if (equipped) button.dataset['item'] = id;
      else delete button.dataset['item'];
      button.classList.toggle('inventory-empty-slot', !equipped);
      button.setAttribute('aria-label', `${SLOT_LABELS[id]} · ${equipped ? ITEMS[id].name : '비어 있음'}`);
      button.innerHTML = `<span class="inventory-slot-label">${SLOT_LABELS[id]}</span>
        ${equipped ? icon(id) : '<span class="inventory-slot-empty-mark" aria-hidden="true">+</span>'}
        <b>${equipped ? ITEMS[id].name : '비어 있음'}</b>`;
    }
    const tiles: HTMLButtonElement[] = [];
    let used = 0;
    for (const { id, count, placement } of this.inventory.bagItems()) {
      if (!placement) continue;
      const { width, height } = footprint(id, placement.rotated);
      used += width * height;
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'inventory-tile';
      tile.dataset['item'] = id;
      tile.dataset['rotated'] = String(placement.rotated);
      tile.setAttribute('aria-label', `${ITEMS[id].name} ${count}개 · ${width}×${height}칸`);
      tile.innerHTML = `<span class="inventory-tile-content">${icon(id)}
        ${id === 'essence' ? `<b class="inventory-quantity">${count}</b>` : `<b class="inventory-tile-label">${ITEMS[id].name}</b>`}
      </span>`;
      rectStyle(tile, placement, id);
      tiles.push(tile);
    }
    this.cards.replaceChildren(...tiles);
    this.capacity.textContent = `${used} / ${BAG.columns * BAG.rows}칸`;
    if (focus) this.root.querySelector<HTMLButtonElement>(`[data-item="${focus}"]`)?.focus({ preventScroll: true });
    this.markSelected();
  }

  private markSelected(): void {
    for (const tile of this.root.querySelectorAll<HTMLElement>('[data-item], [data-slot]')) {
      const id = tile.dataset['item'];
      const selected = id !== undefined && id === this.selected;
      if (id) tile.setAttribute('aria-pressed', String(selected));
      else tile.removeAttribute('aria-pressed');
      tile.classList.toggle('inventory-selected', selected);
    }
    this.root.classList.toggle('inventory-dragging', Boolean(this.drag?.moving));
  }

  private describeSelection(): void {
    const id = this.selected;
    const item = id ? this.inventory.get(id) : undefined;
    this.rotateButton.disabled = !id || ITEMS[id].width === ITEMS[id].height;
    this.cancelButton.disabled = !item;
    this.gearButton.hidden = !item || id === 'essence';
    this.extractButton.hidden = id !== 'essence' || !item;
    if (!id || !item) {
      this.info.innerHTML = '<b>아이템을 선택하세요</b><small>이름 · 크기 · 수량을 확인할 수 있어.</small>';
      return;
    }
    const { width, height } = footprint(id, this.rotated);
    const itemLocation = item.placement ? '가방' : '장착 중';
    const pending = this.rotated !== (item.placement?.rotated ?? false) ? ' · 회전 미리보기' : '';
    this.info.innerHTML = `<b>${ITEMS[id].name}</b><small>${itemLocation} · ${width}×${height}칸 · ${item.count}개${pending}</small>
      <small>${ITEMS[id].description}</small>`;
    this.gearButton.textContent = item.placement ? '장착' : '가방에 넣기';
    this.extractButton.disabled = !this.inventory.isEquipped('extractor') || item.count < RULES.extraction.essence.input;
    this.extractButton.title = this.extractButton.disabled
      ? `정수 추출기를 장착하고 정수 ${RULES.extraction.essence.input}개가 필요하다.` : '';
  }

  private select(id: ItemId): void {
    const item = this.inventory.get(id);
    if (!item) return;
    this.selected = id;
    this.rotated = item.placement?.rotated ?? false;
    this.showTarget(null);
    this.markSelected();
    this.describeSelection();
    this.setStatus(this.defaultHint());
  }

  private clearSelection(): void {
    this.releaseDrag();
    this.selected = undefined;
    this.rotated = false;
    this.markSelected();
    this.describeSelection();
    this.setStatus(this.defaultHint());
  }

  private apply(target: Target): void {
    const id = this.selected;
    if (!id) return;
    if (target.kind === 'slot') {
      if (target.id !== id) {
        this.setStatus('이 아이템은 해당 슬롯에 장착할 수 없다.', true);
        return;
      }
      this.inventory.equip(target.id);
      this.finishMove('장비를 장착했다.');
      return;
    }
    if (!this.inventory.place(id, { column: target.column, row: target.row, rotated: this.rotated })) {
      this.setStatus('아이템이 겹치거나 가방 밖으로 나간다.', true);
      this.showTarget(target);
      return;
    }
    this.finishMove('아이템을 옮겼다.');
  }

  private finishMove(message: string): void {
    const item = this.selected ? this.inventory.get(this.selected) : undefined;
    this.rotated = item?.placement?.rotated ?? false;
    this.showTarget(null);
    this.renderItems();
    this.describeSelection();
    this.setStatus(message);
  }

  private toggleGear(): void {
    const id = this.selected;
    if (!id || id === 'essence') return;
    if (this.inventory.isEquipped(id)) {
      if (this.inventory.stow(id, this.rotated)) this.finishMove('가방에 넣었다.');
      else this.setStatus('가방에 빈 공간이 부족하다.', true);
    } else {
      this.inventory.equip(id);
      this.finishMove('장비를 장착했다.');
    }
  }

  private rotate(): void {
    const id = this.selected;
    if (!id || ITEMS[id].width === ITEMS[id].height) return;
    const oldSize = footprint(id, this.rotated);
    this.rotated = !this.rotated;
    if (this.drag?.moving) {
      const drag = this.drag;
      const column = drag.grabColumn;
      drag.grabColumn = oldSize.height - 1 - drag.grabRow;
      drag.grabRow = column;
      this.showTarget(this.targetAt(drag.x, drag.y));
    } else {
      const original = this.inventory.get(id)?.placement;
      if (original) {
        const candidate = { ...original, rotated: this.rotated };
        if (this.inventory.place(id, candidate)) {
          this.finishMove('아이템을 90° 회전했다.');
          return;
        }
        this.showTarget({ kind: 'bag', column: original.column, row: original.row });
      }
      this.setStatus('회전할 크기를 골랐다. 들어갈 빈 칸을 선택해.');
    }
    this.describeSelection();
  }

  private showTarget(target: Target | null): void {
    const id = this.selected;
    for (const slot of EQUIPMENT) {
      const aimed = id !== undefined && target?.kind === 'slot' && target.id === slot;
      this.slots[slot].classList.toggle('inventory-drop-ok', aimed && id === slot);
      this.slots[slot].classList.toggle('inventory-drop-no', aimed && id !== slot);
    }
    if (!id || target?.kind !== 'bag') {
      this.preview.hidden = true;
      return;
    }
    const placement = { column: target.column, row: target.row, rotated: this.rotated };
    this.preview.classList.toggle('inventory-drop-no', !this.inventory.canPlace(id, placement));
    rectStyle(this.preview, placement, id);
    this.preview.hidden = false;
  }

  private targetAt(x: number, y: number): Target | null {
    const hit = document.elementFromPoint(x, y);
    if (!hit || !this.root.contains(hit)) return null;
    const slot = hit.closest<HTMLElement>('[data-slot]')?.dataset['slot'];
    if (slot === 'cutter' || slot === 'extractor') return { kind: 'slot', id: slot };
    if (!this.grid.contains(hit)) return null;
    const box = this.grid.getBoundingClientRect();
    const column = Math.floor((x - box.left) / box.width * BAG.columns);
    const row = Math.floor((y - box.top) / box.height * BAG.rows);
    return {
      kind: 'bag', column: column - (this.drag?.grabColumn ?? 0), row: row - (this.drag?.grabRow ?? 0),
    };
  }

  private releaseDrag(): void {
    const drag = this.drag;
    this.drag = undefined;
    if (drag?.moving) this.blockClickUntil = performance.now() + 150;
    this.showTarget(null);
    this.markSelected();
  }

  private readonly click = (event: MouseEvent): void => {
    if (!this.active || (event.detail > 0 && performance.now() < this.blockClickUntil)) return;
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button') : null;
    if (!button) return;
    switch (button.dataset['inventoryAction']) {
      case 'resume': this.callbacks.resume(); return;
      case 'gear': this.toggleGear(); return;
      case 'extract': this.callbacks.extract(); return;
      case 'rotate': this.rotate(); return;
      case 'cancel': this.clearSelection(); return;
    }
    const id = button.dataset['item'] as ItemId | undefined;
    if (id) {
      this.select(id);
      return;
    }
    const slot = button.dataset['slot'] as EquipmentId | undefined;
    if (slot && this.selected) {
      this.apply({ kind: 'slot', id: slot });
      return;
    }
    if (button.classList.contains('inventory-cell')) {
      this.apply({ kind: 'bag', column: Number(button.dataset['column']), row: Number(button.dataset['row']) });
    }
  };

  private readonly pointerDown = (event: PointerEvent): void => {
    if (!this.active) return;
    this.blockClickUntil = 0;
    if (event.pointerType !== 'mouse' || event.button !== 0 || this.drag) return;
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('[data-item]') : null;
    const id = button?.dataset['item'] as ItemId | undefined;
    if (!id || !button) return;
    const item = this.inventory.get(id);
    if (!item) return;
    const { width, height } = footprint(id, item.placement?.rotated ?? false);
    const bounds = button.getBoundingClientRect();
    this.drag = {
      pointer: event.pointerId, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY,
      grabColumn: item.placement ? Math.min(width - 1, Math.floor((event.clientX - bounds.left) / bounds.width * width)) : 0,
      grabRow: item.placement ? Math.min(height - 1, Math.floor((event.clientY - bounds.top) / bounds.height * height)) : 0,
      moving: false,
    };
    if (this.selected !== id) this.select(id);
    else if (this.rotated !== (item.placement?.rotated ?? false)) {
      this.drag.grabColumn = 0;
      this.drag.grabRow = 0;
    }
  };

  private readonly pointerMove = (event: PointerEvent): void => {
    if (!this.active || event.pointerType !== 'mouse' || !this.selected) return;
    const drag = this.drag;
    if (drag && drag.pointer === event.pointerId) {
      if ((event.buttons & 1) === 0) {
        this.releaseDrag();
        return;
      }
      drag.x = event.clientX;
      drag.y = event.clientY;
      if (!drag.moving && Math.hypot(drag.x - drag.startX, drag.y - drag.startY) >= 5) {
        drag.moving = true;
        this.markSelected();
      }
      if (!drag.moving) return;
    }
    this.showTarget(this.targetAt(event.clientX, event.clientY));
  };

  private readonly pointerUp = (event: PointerEvent): void => {
    if (this.drag?.pointer !== event.pointerId) return;
    const target = this.drag.moving ? this.targetAt(event.clientX, event.clientY) : null;
    this.releaseDrag();
    if (target) this.apply(target);
  };

  private readonly keyDown = (event: KeyboardEvent): void => {
    if (!this.active || !this.selected || event.repeat) return;
    if (event.code === 'KeyR') {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.rotate();
    }
  };
}
