import { Box3, BoxGeometry, Mesh, MeshStandardMaterial, Ray, Vector3 } from 'three';
import type { Group, Scene } from 'three';
import { disposeGroup } from '../assets/procedural';
import { RULES } from '../config/rules';
import { TUNABLES } from '../config/tunables';
import type { CollisionWorld } from '../physics/CollisionWorld';
import type { ResourceSystem } from '../player/Resources';
import { Inventory } from './Inventory';
import type { Vec3 } from './types';

interface Encounter {
  spawn:Vec3;
  chaseLimitZ?:number;
  model?:Group;
}

export class ArenaCombat {
  private readonly enemy = new Mesh(new BoxGeometry(0.85, 1.8, 0.65),
    new MeshStandardMaterial({color:0xdb5733, emissive:0x6b1909}));
  private readonly walls: Box3[];
  private hp = 0;
  private nextSpawn = 0;
  private swing = 0;
  private bite = 0;
  private extraction = 0;

  constructor(scene: Scene, private readonly world: CollisionWorld, private readonly toast: (text:string)=>void,
    private readonly encounter:Encounter={spawn:{x:0,y:0,z:13}},
    private readonly inventory = new Inventory()) {
    this.walls = world.boxes.map(box => new Box3(new Vector3(box.min.x,box.min.y,box.min.z), new Vector3(box.max.x,box.max.y,box.max.z)));
    this.enemy.visible = false;
    if(encounter.model){
      this.enemy.material.visible=false;
      encounter.model.position.y=-0.9;
      this.enemy.add(encounter.model);
    }
    scene.add(this.enemy);
  }

  reset(): void {
    this.nextSpawn = this.swing = this.bite = this.extraction = this.hp = 0;
    this.inventory.reset();
    this.enemy.visible = false;
  }

  get cutterSwing():number {
    return Math.sin(Math.PI*Math.min(1,Math.max(0,this.swing)/TUNABLES.weapons.cutter.interval));
  }

  update(dt:number, player:Vec3, eye:number, yaw:number, pitch:number, canExtract:boolean, attack:boolean, extract:boolean, resources:ResourceSystem):void {
    const melee = TUNABLES.enemies.melee;
    const cutter = TUNABLES.weapons.cutter;
    this.swing -= dt;
    this.bite -= dt;
    const fighting = player.z >= (this.encounter.chaseLimitZ ?? -Infinity);
    if (fighting && this.hp <= 0) {
      this.nextSpawn -= dt;
      if (this.nextSpawn <= 0) {
        this.hp = melee.hp;
        const spawn=this.encounter.spawn;
        this.enemy.position.set(spawn.x,spawn.y+0.9,spawn.z);
        this.enemy.visible = true;
        this.bite = melee.attackInterval;
      }
    }
    const extractorEquipped = this.inventory.isEquipped('extractor');
    if (this.extraction > 0 && !extractorEquipped) {
      this.extraction = 0;
      this.toast('정수 추출이 취소됐다.');
    }
    if (extract && canExtract && this.extraction <= 0) {
      if (!extractorEquipped) this.toast('정수 추출기를 장착해야 한다.');
      else if (this.inventory.essence < RULES.extraction.essence.input) this.toast('추출할 정수가 부족하다.');
      else if (resources.current.caffeine >= RULES.resources.caffeineMax) this.toast('카페인이 가득 찼다.');
      else {
        this.extraction = TUNABLES.extractor.secondsPerUse;
        this.toast('정수 추출 중…');
      }
    }
    if (attack && !this.inventory.isEquipped('cutter')) this.toast('커터칼을 장착해야 한다.');
    else if (attack && this.swing <= 0 && this.extraction <= 0) {
      this.swing = cutter.interval;
      const origin = new Vector3(player.x,player.y+eye,player.z);
      const direction = new Vector3(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch));
      const ray = new Ray(origin,direction);
      const hit = ray.intersectBox(new Box3().setFromObject(this.enemy),new Vector3());
      if (fighting && this.hp>0 && hit && hit.distanceTo(origin)<=cutter.reach && !this.blocked(ray,hit.distanceTo(origin))) {
        this.hp -= cutter.damage;
        if (this.hp <= 0) {
          this.enemy.visible = false;
          this.nextSpawn = 6;
          if (this.inventory.addEssence(TUNABLES.drops.essencePerKill)) {
            this.toast('처치! 정수 확보 · 가방에서 확인');
          } else this.toast('처치! 가방에 정수를 넣을 공간이 없다.');
        } else this.toast('커터칼 명중');
      } else this.toast('커터칼 휘두르기');
    }
    if (fighting && this.hp > 0) {
      const p = this.enemy.position;
      const dx=player.x-p.x, dz=player.z-p.z, distance=Math.hypot(dx,dz);
      if(this.encounter.model)this.encounter.model.rotation.y=Math.atan2(dx,dz);
      if (distance > 1.25) {
        const step = Math.min(distance-1.25,melee.speed*dt)/distance;
        const {position} = this.world.move({x:p.x,y:p.y-0.9,z:p.z},{x:dx*step,y:0,z:dz*step},1.8,false);
        p.set(position.x,position.y+0.9,position.z);
      }
      if (distance <= melee.attackRange && Math.abs(player.y-(p.y-0.9)) < 1.4 && this.bite <= 0) {
        const origin = new Vector3(p.x,p.y+0.10,p.z);
        const delta = new Vector3(player.x,player.y+0.9,player.z).sub(origin);
        if (!this.blocked(new Ray(origin,delta.clone().normalize()),delta.length())) {
          resources.applyDelta({hp:-melee.damage});
          this.bite = melee.attackInterval;
          this.toast('악마에게 맞았다.');
        }
      }
    }
    if (this.extraction > 0 && canExtract && !resources.cause) {
      this.extraction -= dt;
      if (this.extraction <= 0) {
        const rule = RULES.extraction.essence;
        const batches = Math.min(Math.floor(this.inventory.essence/rule.input),TUNABLES.extractor.maxEssenceBatches,
          Math.ceil((RULES.resources.caffeineMax-resources.current.caffeine)/rule.caffeine));
        if (this.inventory.spendEssence(batches*rule.input)) {
          resources.applyDelta({caffeine:batches*rule.caffeine});
          this.toast(`정수 추출 완료 · CAF ${Math.floor(resources.current.caffeine)}`);
        }
      }
    }
  }

  private blocked(ray:Ray,distance:number):boolean {
    const hit = new Vector3();
    return this.walls.some(box=>ray.intersectBox(box,hit)!==null && hit.distanceTo(ray.origin)<distance);
  }

  dispose():void {
    this.enemy.removeFromParent();
    if(this.encounter.model)disposeGroup(this.encounter.model);
    this.enemy.geometry.dispose();
    this.enemy.material.dispose();
  }
}
