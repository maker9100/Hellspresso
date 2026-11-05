import {describe,expect,it} from 'vitest';
import {FixedStepper} from '../src/core/FixedStepLoop';
import {ResourceSystem} from '../src/player/Resources';

describe('고정 timestep',()=>{
  it.each([15,30,60,144])('%s FPS에서10초 동안 CAF20 감소',fps=>{
    const r=new ResourceSystem();const loop=new FixedStepper(dt=>r.advance(dt,false));loop.setRunning(true);
    for(let i=0;i<fps*10;i++)loop.frame(1/fps);
    expect(r.current.caffeine).toBeCloseTo(80,6);
  });
  it('3초 프레임 지연을 버리지 않고 나눠 처리한다',()=>{
    const r=new ResourceSystem();const loop=new FixedStepper(dt=>r.advance(dt,false));loop.setRunning(true);
    expect(loop.frame(3)).toBe(8);expect(loop.pendingSeconds).toBeGreaterThan(2);
    while(loop.pendingSeconds>1e-8)loop.frame(0);
    expect(r.current.caffeine).toBeCloseTo(94,6);
  });
  it('정지 후300초를 보낸 뒤에도 CAF는 유지된다',()=>{
    const r=new ResourceSystem();const loop=new FixedStepper(dt=>r.advance(dt,false));loop.setRunning(true);
    for(let i=0;i<60;i++)loop.frame(1/60);
    loop.setRunning(false);loop.frame(300);expect(r.current.caffeine).toBeCloseTo(98,6);
  });
  it('정지 전 미처리 활성 시간은 정산한다',()=>{
    const r=new ResourceSystem();const loop=new FixedStepper(dt=>r.advance(dt,false));loop.setRunning(true);loop.frame(2);loop.setRunning(false);
    while(loop.pendingSeconds>1e-8)loop.frame(0);
    expect(r.current.caffeine).toBeCloseTo(96,6);
  });
});
