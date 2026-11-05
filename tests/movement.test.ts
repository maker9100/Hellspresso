import {describe,expect,it} from 'vitest';
import {Movement} from '../src/player/Movement';
import {ResourceSystem} from '../src/player/Resources';
import {CollisionWorld} from '../src/physics/CollisionWorld';
import {NEUTRAL_INTENT} from '../src/core/types';
import type {Aabb,MoveIntent} from '../src/core/types';

const floor:Aabb={min:{x:-100,y:-1,z:-100},max:{x:100,y:0,z:100}};
const dt=1/60;
const setup=(extra:Aabb[]=[])=>({movement:new Movement(new CollisionWorld([floor,...extra]),{x:0,y:0,z:0}),resources:new ResourceSystem()});
function tick(value:ReturnType<typeof setup>,intent:Partial<MoveIntent>={}){value.movement.update(dt,{...NEUTRAL_INTENT,...intent},0,value.resources);}

describe('이동·충돌',()=>{
  it('대각선 이동은 직진보다 빨라지지 않는다',()=>{
    const a=setup(),b=setup();for(let i=0;i<60;i++){tick(a,{forward:1});tick(b,{forward:1,right:1});}
    expect(Math.hypot(a.movement.position.x,a.movement.position.z)).toBeCloseTo(Math.hypot(b.movement.position.x,b.movement.position.z),6);
  });
  it('달리기는9m/s이며 미정 기본값은 추가 비용0',()=>{
    const a=setup();for(let i=0;i<60;i++)tick(a,{forward:1,sprint:true});expect(a.movement.position.z).toBeCloseTo(-9,6);expect(a.resources.current.stamina).toBe(100);
  });
  it('대시 연속 입력은 쿨다운 중 중복 지불하지 않는다',()=>{
    const a=setup();tick(a,{dash:true});expect(a.resources.current.stamina).toBe(90);tick(a,{dash:true});expect(a.resources.current.stamina).toBe(90);
  });
  it('점프는 두 번뿐이며 공중 슬라이드는 소비하지 않는다',()=>{
    const a=setup();tick(a,{jump:true});tick(a,{jump:true});expect(a.movement.jumps).toBe(2);
    tick(a,{jump:true,slide:true});expect(a.movement.jumps).toBe(2);expect(a.resources.current.stamina).toBe(100);expect(a.movement.mode).toBe('AIR');
  });
  it('지상 슬라이드는15를 한 번만 소비한다',()=>{
    const a=setup();tick(a,{slide:true});tick(a,{slide:true});expect(a.resources.current.stamina).toBe(85);expect(a.movement.height).toBe(0.9);
  });
  it('수직 벽은 큰 이동량에서도 통과하지 않는다',()=>{
    const world=new CollisionWorld([floor,{min:{x:1,y:0,z:-5},max:{x:2,y:10,z:5}}]);
    const result=world.move({x:0,y:0,z:0},{x:50,y:-1,z:0},1.8,false);
    expect(result.position.x).toBeCloseTo(0.65);expect(result.grounded).toBe(true);
  });
  it('천장이 낮으면 슬라이드 후 일어나지 않는다',()=>{
    const a=setup([{min:{x:-10,y:1,z:-20},max:{x:10,y:1.2,z:-0.5}}]);
    tick(a,{slide:true,forward:1});for(let i=0;i<50;i++)tick(a);
    expect(a.movement.height).toBe(0.9);
  });
  it('0.25m 단차를 통과하고 더 높은 벽은 막는다',()=>{
    const a=setup([{min:{x:-2,y:0,z:-3},max:{x:2,y:0.25,z:-1}}]);
    for(let i=0;i<15;i++)tick(a,{forward:1});expect(a.movement.position.y).toBeCloseTo(0.25);expect(a.movement.position.z).toBeLessThan(-1);
  });
});
