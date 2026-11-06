export const BAG = { columns: 8, rows: 6 } as const;

export const EQUIPMENT = ['cutter', 'extractor'] as const;
export type EquipmentId = typeof EQUIPMENT[number];
export type ItemId = EquipmentId | 'essence';

export const ITEMS = {
  cutter: { name: '커터칼', width: 2, height: 1, description: '장착하면 근접 공격에 사용한다.' },
  extractor: { name: '정수 추출기', width: 3, height: 2, description: '장착하면 정수를 카페인으로 바꿀 수 있다.' },
  essence: { name: '악마의 정수', width: 1, height: 1, description: '정수 추출기에 사용하는 재료다.' },
} as const satisfies Record<ItemId, {name: string; width: number; height: number; description: string}>;

export interface BagPlacement {
  readonly column: number;
  readonly row: number;
  readonly rotated: boolean;
}

interface InventoryItem {
  readonly id: ItemId;
  readonly count: number;
  readonly placement: BagPlacement | null;
}

export function footprint(id: ItemId, rotated: boolean): { width: number; height: number } {
  const { width, height } = ITEMS[id];
  return rotated ? { width: height, height: width } : { width, height };
}

export class Inventory {
  private readonly items = new Map<ItemId, InventoryItem>();
  private version = 0;

  constructor() {
    this.reset();
  }

  get revision(): number { return this.version; }
  get essence(): number { return this.items.get('essence')?.count ?? 0; }

  get(id: ItemId): InventoryItem | undefined { return this.items.get(id); }
  bagItems(): InventoryItem[] { return [...this.items.values()].filter(item => item.placement !== null); }

  reset(): void {
    this.items.clear();
    for (const id of EQUIPMENT) this.items.set(id, { id, count: 1, placement: null });
    this.version++;
  }

  isEquipped(id: EquipmentId): boolean {
    return this.get(id)?.placement === null;
  }

  canPlace(id: ItemId, placement: BagPlacement): boolean {
    const { column, row, rotated } = placement;
    const { width, height } = footprint(id, rotated);
    if (!Number.isInteger(column) || !Number.isInteger(row) || column < 0 || row < 0 ||
      column + width > BAG.columns || row + height > BAG.rows) return false;

    for (const item of this.items.values()) {
      if (item.id === id || !item.placement) continue;
      const occupied = item.placement;
      const size = footprint(item.id, occupied.rotated);
      if (column < occupied.column + size.width && column + width > occupied.column &&
        row < occupied.row + size.height && row + height > occupied.row) return false;
    }
    return true;
  }

  place(id: ItemId, placement: BagPlacement): boolean {
    const item = this.get(id);
    if (!item || !this.canPlace(id, placement)) return false;
    this.set({ ...item, placement: { ...placement } });
    return true;
  }

  stow(id: EquipmentId, rotated: boolean): boolean {
    const space = this.firstFree(id, rotated);
    return space !== undefined && this.place(id, space);
  }

  equip(id: EquipmentId): boolean {
    const item = this.get(id);
    if (!item || item.placement === null) return false;
    this.set({ ...item, placement: null });
    return true;
  }

  addEssence(count: number): boolean {
    if (!Number.isSafeInteger(count) || count <= 0) return false;
    const item = this.get('essence');
    const total = this.essence + count;
    if (!Number.isSafeInteger(total)) return false;
    const placement = item?.placement ?? this.firstFree('essence', false);
    if (!placement) return false;
    this.set({ id: 'essence', count: total, placement });
    return true;
  }

  spendEssence(count: number): boolean {
    const item = this.get('essence');
    if (!item || !Number.isSafeInteger(count) || count <= 0 || item.count < count) return false;
    if (item.count === count) {
      this.items.delete(item.id);
      this.version++;
    } else {
      this.set({ ...item, count: item.count - count });
    }
    return true;
  }

  private firstFree(id: ItemId, rotated: boolean): BagPlacement | undefined {
    for (const orientation of ITEMS[id].width === ITEMS[id].height ? [rotated] : [rotated, !rotated]) {
      for (let row = 0; row < BAG.rows; row++) {
        for (let column = 0; column < BAG.columns; column++) {
          const placement = { column, row, rotated: orientation };
          if (this.canPlace(id, placement)) return placement;
        }
      }
    }
    return undefined;
  }

  private set(item: InventoryItem): void {
    this.items.set(item.id, item);
    this.version++;
  }
}
