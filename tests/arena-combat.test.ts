import { expect, test, vi } from 'vitest';
import { Scene } from 'three';
import { ArenaCombat } from '../src/core/ArenaCombat';
import type { CombatActions } from '../src/core/ArenaCombat';
import { Inventory } from '../src/core/Inventory';
import { RECIPES } from '../src/core/items';
import { CollisionWorld } from '../src/physics/CollisionWorld';
import { ResourceSystem } from '../src/player/Resources';

test.each([[0,1],[.9999,7]])('demon automatically stores essence in the configured range (%s)', (roll,count) => {
  const resources = new ResourceSystem();
  const inventory = new Inventory();
  const drop = vi.fn();
  const random = vi.spyOn(Math,'random').mockReturnValue(roll);
  const arena = new ArenaCombat(new Scene(),new CollisionWorld([]),()=>{}, {spawn:{x:0,y:0,z:13},drop},inventory);
  try {
    for(const dt of [.01,.36,.36])arena.update(dt,{x:0,y:0,z:14.5},1.65,0,0,true,{attack:true},resources);
    expect(drop).not.toHaveBeenCalledWith('essence',expect.anything(),expect.anything());
    expect(drop).toHaveBeenCalledWith('heart',1,expect.anything());
    expect(inventory.essence).toBe(count);
    expect(resources.current.caffeine).toBe(100);
  } finally {
    random.mockRestore();
    arena.dispose();
  }
});

test('healing and extraction spend separate inventory items', () => {
  const resources = new ResourceSystem();
  const inventory = new Inventory();
  const arena = new ArenaCombat(new Scene(),new CollisionWorld([]),()=>{},undefined,inventory);
  const step = (dt:number,actions:CombatActions={}) =>
    arena.update(dt,{x:0,y:0,z:28},1.65,0,0,true,actions,resources,true);
  inventory.add('essence',25);
  inventory.add('coffeeVodka');
  step(.01,{extract:'essence',heal:'coffeeVodka'});
  step(3);
  expect(resources.current).toMatchObject({hp:150,caffeine:105});
  expect(inventory.count('essence')).toBe(0);
  expect(inventory.count('coffeeVodka')).toBe(0);
  arena.dispose();
});

test.each(RECIPES)('crafts $id with its ingredients and can equip it', recipe => {
  const inventory=new Inventory();
  expect(inventory.craft(recipe)).toBe(false);
  for(const {id,count} of recipe.options[0]!)expect(inventory.add(id,count)).toBe(true);
  expect(inventory.craft(recipe)).toBe(true);
  expect(inventory.count(recipe.id)).toBe(recipe.output);
  expect(inventory.equip(recipe.id)).toBe(true);
  expect(inventory.weapon).toBe(recipe.id);
  expect(inventory.get('cutter')?.placement).not.toBeNull();
});
