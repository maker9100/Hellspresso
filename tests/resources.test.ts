import { describe, expect, it } from 'vitest';
import { clampResources, deathCause, ResourceSystem } from '../src/player/Resources';

describe('확정 자원 규칙',()=>{
  it('모든 자원에 단일 상한·하한을 적용한다',()=>{
    expect(clampResources({hp:1000,caffeine:1000,stamina:1000})).toEqual({hp:150,caffeine:300,stamina:100});
    expect(clampResources({hp:-1,caffeine:-1,stamina:-1})).toEqual({hp:0,caffeine:0,stamina:0});
  });
  it.each([NaN,Infinity,-Infinity])('비유한 값 %s를 거부한다',n=>expect(()=>clampResources({hp:n,caffeine:100,stamina:100})).toThrow());
  it('기본 CAF는 정확히50초에 고갈된다',()=>{
    const r=new ResourceSystem();
    for(let i=0;i<2999;i++)r.advance(1/60,false);
    expect(r.cause).toBeNull();
    r.advance(1/60,false);expect(r.current.caffeine).toBe(0);expect(r.cause).toBe('caffeine');
  });
  it('CAF300은150초간 유지된다',()=>{
    const r=new ResourceSystem({hp:100,caffeine:300,stamina:0});
    for(let i=0;i<9000;i++)r.advance(1/60,false);
    expect(r.current.caffeine).toBe(0);expect(r.cause).toBe('caffeine');
  });
  it('신성지대 플래그는 감소만 막고 자동 회복하지 않는다',()=>{
    const r=new ResourceSystem({hp:140,caffeine:250,stamina:30});r.advance(10,true);
    expect(r.current).toEqual({hp:140,caffeine:250,stamina:40});
  });
  it('대시10·슬라이드15 지불 후 매초1 회복한다',()=>{
    const r=new ResourceSystem();expect(r.spendStamina(10)).toBe(true);expect(r.current.stamina).toBe(90);
    expect(r.spendStamina(15)).toBe(true);expect(r.current.stamina).toBe(75);
    r.advance(10,false);expect(r.current.stamina).toBeCloseTo(85);
  });
  it('부족한 스태미나에서 원자적으로 거부한다',()=>{
    const r=new ResourceSystem({hp:100,caffeine:100,stamina:9});expect(r.spendStamina(10)).toBe(false);expect(r.current.stamina).toBe(9);
  });
  it('HP0/CAF0/동시0을 구별한다',()=>{
    expect(deathCause({hp:0,caffeine:100,stamina:100})).toBe('hp');
    expect(deathCause({hp:100,caffeine:0,stamina:100})).toBe('caffeine');
    expect(deathCause({hp:0,caffeine:0,stamina:100})).toBe('both');
  });
  it('사망 후 회복과 스태미나 소비를 거부한다',()=>{
    const r=new ResourceSystem();r.applyDelta({hp:-100,caffeine:-100});
    expect(r.applyDelta({hp:150,caffeine:300})).toBe(false);expect(r.spendStamina(0)).toBe(false);expect(r.cause).toBe('both');
  });
  it('살아 있을 때 모든 증가 경로가 clamp를 통과한다',()=>{
    const r=new ResourceSystem();r.applyDelta({hp:999,caffeine:999,stamina:999});
    expect(r.current).toEqual({hp:150,caffeine:300,stamina:100});
  });
  it('음수 시간과 소모를 거부한다',()=>{
    const r=new ResourceSystem();expect(()=>r.advance(-1,false)).toThrow();expect(()=>r.spendStamina(-10)).toThrow();
  });
});
