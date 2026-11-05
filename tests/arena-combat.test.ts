import { expect, test } from 'vitest';
import { Scene } from 'three';
import { ArenaCombat } from '../src/core/ArenaCombat';
import { CollisionWorld } from '../src/physics/CollisionWorld';
import { ResourceSystem } from '../src/player/Resources';

test('aimed cutter hits award essence that only restores CAF on extraction', () => {
  const resources = new ResourceSystem();
  const notices:string[] = [];
  const arena = new ArenaCombat(new Scene(), new CollisionWorld([]), value => notices.push(value));
  const step = (seconds:number, attack=false, extract=false) =>
    arena.update(seconds,{x:0,y:0,z:14.5},1.65,0,0,true,attack,extract,resources);
  step(0.01,true);
  step(0.36,true);
  step(0.36,true);
  expect(notices.at(-1)).toContain('처치');
  expect(resources.current.caffeine).toBe(100);
  step(0.01,false,true);
  expect(resources.current.caffeine).toBe(100);
  step(0.8);
  expect(resources.current.caffeine).toBe(160);
  arena.dispose();
});
