import {describe,expect,it} from 'vitest';
import {GameStateMachine} from '../src/core/GameStateMachine';
import {defaults,rebind} from '../src/ui/Settings';

describe('상태와 키 바인딩',()=>{
  it('인벤토리는 시뮬레이션을 유지하고 정지는 멈춘다',()=>{
    const s=new GameStateMachine();s.transition('LOADING');s.transition('PAUSED');s.transition('PLAYING');s.transition('INVENTORY');expect(s.simulating).toBe(true);s.transition('PAUSED');expect(s.simulating).toBe(false);
  });
  it('DEAD에서 PLAYING 직접 재개를 거부한다',()=>{
    const s=new GameStateMachine();s.transition('LOADING');s.transition('PAUSED');s.transition('PLAYING');s.transition('DEAD');expect(()=>s.transition('PLAYING')).toThrow();
  });
  it('중복 키·H·대시 Q/Alt를 거부하고 새 키를 적용한다',()=>{
    const s=defaults();expect(rebind(s,'dash','KeyH')).not.toBeNull();expect(rebind(s,'dash','KeyQ')).not.toBeNull();expect(rebind(s,'dash','AltLeft')).not.toBeNull();expect(rebind(s,'dash','KeyW')).not.toBeNull();expect(rebind(s,'dash','KeyG')).toBeNull();expect(s.bindings.dash).toEqual(['KeyG']);
  });
});
