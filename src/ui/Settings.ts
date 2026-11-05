import { TUNABLES } from '../config/tunables';

export const ACTIONS = ['forward','backward','left','right','sprint','jump','dash','slide','interact','extractor','reload','inventory'] as const;
export type Action = typeof ACTIONS[number];
export interface Settings {
  sensitivity: number;
  renderScale: number;
  shadows: 'off' | 'low' | 'medium';
  effectsVolume: number;
  musicVolume: number;
  screenShake: number;
  showFps: boolean;
  subtitles: boolean;
  tutorial: boolean;
  bindings: Record<Action,string[]>;
}
const STORAGE_KEY = 'hellspresso.settings.v1';

export function defaults(): Settings {
  const p = TUNABLES.presentation;
  const bindings = {} as Record<Action,string[]>;
  for (const action of ACTIONS) bindings[action] = [...TUNABLES.keys[action]];
  return { sensitivity:TUNABLES.camera.sensitivity, renderScale:p.renderScale, shadows:p.shadows,
    effectsVolume:p.effectsVolume, musicVolume:p.musicVolume, screenShake:p.screenShake,
    showFps:p.showFps, subtitles:p.subtitles, tutorial:p.tutorial, bindings };
}

export function rebind(settings: Settings, action: Action, code: string): string | null {
  if (!/^(Key[A-Z]|Digit[0-9]|Space|ShiftLeft|ShiftRight|ControlLeft|ControlRight|Tab|ArrowUp|ArrowDown|ArrowLeft|ArrowRight)$/.test(code)) return '이 키는 사용할 수 없다.';
  if ((TUNABLES.keys.reservedKeys as readonly string[]).includes(code)) return 'H와 ESC는 예약키다.';
  if (action==='dash' && code==='KeyQ') return '대시에는 Q와 Alt를 사용할 수 없다.';
  if (ACTIONS.some(other => other!==action && settings.bindings[other].includes(code))) return '다른 동작이 사용 중인 키다.';
  settings.bindings[action] = [code];
  return null;
}

export class SettingsStore {
  value: Settings = defaults();
  storageError = false;
  constructor() {
    try {
      const raw: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
      if (!raw || typeof raw!=='object') return;
      const saved = raw as Record<string,unknown>;
      for (const key of ['effectsVolume','musicVolume','screenShake'] as const)
        if (typeof saved[key]==='number' && Number.isFinite(saved[key]) && saved[key]>=0 && saved[key]<=1) this.value[key]=saved[key];
      for (const key of ['showFps','subtitles','tutorial'] as const)
        if (typeof saved[key]==='boolean') this.value[key]=saved[key];
      const sensitivity=saved['sensitivity'];
      if (typeof sensitivity==='number' && sensitivity>=TUNABLES.settings.sensitivityMin && sensitivity<=TUNABLES.settings.sensitivityMax) this.value.sensitivity=sensitivity;
      const scale=saved['renderScale'];
      if (typeof scale==='number' && (TUNABLES.settings.scaleOptions as readonly number[]).includes(scale)) this.value.renderScale=scale;
      if (saved['shadows']==='off' || saved['shadows']==='low' || saved['shadows']==='medium') this.value.shadows=saved['shadows'];
      const bindings=saved['bindings'];
      if (bindings && typeof bindings==='object') {
        const proposed=bindings as Record<string,unknown>;
        const candidate={} as Record<Action,string[]>;
        const used=new Set<string>();
        let valid=true;
        for (const action of ACTIONS) {
          const keys=proposed[action];
          if (!Array.isArray(keys) || keys.length<1 || keys.length>3) { valid=false; break; }
          candidate[action]=[];
          for (const code of keys) {
            const test=defaults();
            for (const a of ACTIONS) test.bindings[a]=[];
            if (typeof code!=='string' || rebind(test,action,code)!==null || used.has(code)) { valid=false; break; }
            used.add(code); candidate[action].push(code);
          }
        }
        if (valid) this.value.bindings=candidate;
      }
    } catch { this.storageError=true; }
  }
  save(): void { try { localStorage.setItem(STORAGE_KEY,JSON.stringify(this.value)); this.storageError=false; } catch { this.storageError=true; } }
  reset(): void { this.value=defaults(); this.save(); }
}

export function keyLabel(code: string): string {
  return code.replace('Key','').replace('Digit','').replace('Left','').replace('Right','').replace('Control','Ctrl').replace('Space','SPACE').replace('Arrow','');
}
