import { RULES } from '../config/rules';
import { TUNABLES } from '../config/tunables';

export interface Resources { hp: number; caffeine: number; stamina: number }
export type DeathCause = 'hp' | 'caffeine' | 'both';
const EPSILON = 1e-8; // 부동소수점 반올림 오차만 정규화한다.

export function clampResources(value: Resources): Resources {
  const clamp = (n: number, max: number): number => {
    if (!Number.isFinite(n)) throw new RangeError('자원은 유한한 수여야 한다.');
    if (n < EPSILON) return 0;
    return Math.min(max, n);
  };
  return {
    hp: clamp(value.hp, RULES.resources.hpMax),
    caffeine: clamp(value.caffeine, RULES.resources.caffeineMax),
    stamina: clamp(value.stamina, RULES.resources.staminaMax),
  };
}

export function deathCause(value: Resources): DeathCause | null {
  const hp = value.hp <= EPSILON;
  const caffeine = value.caffeine <= EPSILON;
  return hp && caffeine ? 'both' : hp ? 'hp' : caffeine ? 'caffeine' : null;
}

export class ResourceSystem {
  private value: Resources;
  private ended: DeathCause | null;
  private regenerationDelay = 0;

  constructor(initial: Resources = {
    hp: RULES.resources.hpBase,
    caffeine: RULES.resources.caffeineBase,
    stamina: TUNABLES.movement.initialStamina,
  }) {
    this.value = clampResources(initial);
    this.ended = deathCause(this.value);
  }

  get current(): Readonly<Resources> { return { ...this.value }; }
  get cause(): DeathCause | null { return this.ended; }

  applyDelta(delta: Partial<Resources>): boolean {
    if (this.ended) return false;
    this.value = clampResources({
      hp: this.value.hp + (delta.hp ?? 0),
      caffeine: this.value.caffeine + (delta.caffeine ?? 0),
      stamina: this.value.stamina + (delta.stamina ?? 0),
    });
    this.ended = deathCause(this.value);
    return true;
  }

  spendStamina(amount: number): boolean {
    if (!Number.isFinite(amount) || amount < 0) throw new RangeError('잘못된 소모량');
    if (this.ended || this.value.stamina + EPSILON < amount) return false;
    this.applyDelta({ stamina: -amount });
    if (amount > 0) this.regenerationDelay = TUNABLES.movement.staminaRegenDelaySeconds;
    return true;
  }

  advance(seconds: number, inHolyZone: boolean): void {
    if (!Number.isFinite(seconds) || seconds < 0) throw new RangeError('잘못된 경과 시간');
    if (this.ended) return;
    const delayed = Math.min(seconds, this.regenerationDelay);
    this.regenerationDelay -= delayed;
    this.applyDelta({
      caffeine: inHolyZone ? 0 : -RULES.resources.caffeineDrainPerSecond * seconds,
      stamina: RULES.resources.staminaRegenPerSecond * (seconds - delayed),
    });
  }
}
