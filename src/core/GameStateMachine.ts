export type GameState = 'MENU' | 'LOADING' | 'PLAYING' | 'INVENTORY' | 'PAUSED' | 'DEAD' | 'ENDING';
const TRANSITIONS: Record<GameState, readonly GameState[]> = {
  MENU: ['LOADING'], LOADING: ['PAUSED', 'MENU'],
  PLAYING: ['INVENTORY', 'PAUSED', 'DEAD', 'ENDING'],
  INVENTORY: ['PLAYING', 'PAUSED', 'DEAD'],
  PAUSED: ['PLAYING', 'MENU', 'DEAD'], DEAD: ['MENU'], ENDING: ['MENU'],
};

export class GameStateMachine {
  private value: GameState = 'MENU';
  get current(): GameState { return this.value; }
  get simulating(): boolean { return this.value === 'PLAYING' || this.value === 'INVENTORY'; }
  transition(next: GameState): boolean {
    if (next === this.value) return false;
    if (!TRANSITIONS[this.value].includes(next)) throw new Error(`금지된 상태 전이: ${this.value} → ${next}`);
    this.value = next;
    return true;
  }
}
