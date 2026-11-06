import { Box3, BoxGeometry, Group, Mesh, MeshBasicMaterial, Ray, SphereGeometry, Vector3 } from 'three';
import type { Scene } from 'three';
import { disposeGroup } from '../assets/procedural';
import { createOfficeDemon } from '../assets/officeDemon';
import { FLOORS, ROUTE_X, floorAt } from '../assets/officeRoute';
import { RULES } from '../config/rules';
import { TUNABLES } from '../config/tunables';
import type { CollisionWorld } from '../physics/CollisionWorld';
import type { ResourceSystem } from '../player/Resources';
import { Inventory } from './Inventory';
import { ITEMS, isConsumableWeapon, weaponSpec } from './items';
import type { ExtractId, HealingId, ItemId, WeaponId } from './items';
import type { Vec3 } from './types';

type Flash = 'hit'|'hurt'|'heal';
interface Enemy {
  mesh:Group; position:Vec3; hp:number; ranged:boolean; attackIn:number; boss:boolean;
}
interface Shot {
  mesh:Mesh; pos:Vector3; velocity:Vector3; damage:number; seconds:number;
  kind:'round'|'blast'|'trap'|'guard'; radius:number;
}
interface Ammo { loaded:number; reserve:number }
interface ArenaHooks {
  spawn:Vec3;
  model?:Group;
  stage?:boolean;
  drop?:(id:ItemId,count:number,position:Vec3)=>void;
  flash?:(type:Flash)=>void;
}
export interface CombatActions {
  attack?:boolean; extract?:ExtractId; heal?:HealingId|'quick'; reload?:boolean;
}
const HEALING = Object.keys(RULES.healing) as HealingId[];

export class ArenaCombat {
  private readonly group = new Group();
  private readonly enemyPool:Group[]=[];
  private readonly guardWeapons:Group[]=[];
  private readonly walls:Box3[];
  private readonly bulletGeometry=new SphereGeometry(.065,7,5);
  private readonly bulletMaterials={
    round:new MeshBasicMaterial({color:0xfbd97c}), blast:new MeshBasicMaterial({color:0xff5334}),
    trap:new MeshBasicMaterial({color:0xd78e26}), guard:new MeshBasicMaterial({color:0xdd522a}),
  };
  private readonly shotPool:Shot[]=[];
  private readonly ammo=new Map<WeaponId,Ammo>();
  private enemies:Enemy[]=[];
  private floor=-1;
  private spawnIn=0;
  private cooldown=0;
  private swing=0;
  private reload: {id:WeaponId; time:number}|undefined;
  private extraction: {id:ExtractId; time:number}|undefined;
  private healing: {id:HealingId; time:number}|undefined;
  private healCooldown=0;

  constructor(scene:Scene,private readonly world:CollisionWorld,private readonly notice:(text:string)=>void,
    private readonly hooks:ArenaHooks={spawn:{x:0,y:0,z:13}},private readonly inventory=new Inventory()){
    this.walls=world.boxes.map(b=>new Box3(new Vector3(b.min.x,b.min.y,b.min.z),new Vector3(b.max.x,b.max.y,b.max.z)));
    scene.add(this.group);
  }
  reset():void{
    this.clearZone();
    this.floor=-1;this.spawnIn=0;this.cooldown=0;this.swing=0;this.healCooldown=0;
    this.reload=undefined;this.extraction=undefined;this.healing=undefined;this.ammo.clear();this.inventory.reset();
  }
  get cutterSwing():number{return Math.sin(Math.PI*Math.min(1,this.swing/.23));}

  ammoLabel(id:WeaponId):string {
    const value=this.weaponAmmo(id);
    if(value)return this.reload?.id===id?'RELOAD':`${value.loaded} / ${value.reserve}`;
    return isConsumableWeapon(id)?String(this.inventory.count(id)):'∞';
  }
  private weaponAmmo(id:WeaponId):Ammo|undefined{
    const spec=weaponSpec(id);
    if(!spec.magazine)return undefined;
    const existing=this.ammo.get(id);
    if(existing)return existing;
    const ammo={loaded:spec.magazine,reserve:spec.reserve??0};
    this.ammo.set(id,ammo);
    return ammo;
  }

  private clearZone():void{
    for(const mesh of this.enemyPool)mesh.visible=false;
    this.enemies=[];
    for(const shot of this.shotPool){shot.seconds=0;shot.mesh.visible=false;}
  }
  private spawn(position:Vec3,ranged=false,boss=false):void{
    const index=this.enemies.length;
    let mesh=this.enemyPool[index];
    if(!mesh){
      mesh=(index===0?this.hooks.model:undefined)??createOfficeDemon();
      this.enemyPool[index]=mesh;
      const gun=new Group();
      const receiver=new Mesh(new BoxGeometry(.16,.13,.48),new MeshBasicMaterial({color:0x262126}));
      const barrel=new Mesh(new BoxGeometry(.06,.06,.31),new MeshBasicMaterial({color:0x655553}));
      barrel.position.z=.34;
      gun.position.set(-.32,1.1,.21);
      gun.add(receiver,barrel);mesh.add(gun);
      this.guardWeapons[index]=gun;
      this.group.add(mesh);
    }
    this.guardWeapons[index]!.visible=ranged;
    mesh.visible=true;mesh.position.set(position.x,position.y,position.z);
    mesh.scale.setScalar(boss?1.45:ranged?.91:1);
    this.enemies.push({mesh,position:{...position},hp:boss?200:ranged?60:80,ranged,attackIn:1.1,boss});
  }
  private enterZone(index:number):void{
    this.clearZone();
    this.floor=index;
    this.spawnIn=0;
    if(!this.hooks.stage||index===0){this.spawn(this.hooks.spawn);return;}
    const floor=FLOORS[index]!;
    const offsets=index===4?[-5,5,-3,3]:index===3?[-1.2,1.4,.8]:[-1.4,1.4];
    for(let i=0;i<floor.guards;i++){
      this.spawn({x:ROUTE_X+(offsets[i]??0),y:floor.y,z:floor.start-7-i*(index===4?4.2:3.3)},index===3||index===4&&i===2,index===4&&i===3);
    }
  }
  private damage(enemy:Enemy,damage:number):void{
    if(enemy.hp<=0)return;
    enemy.hp-=damage;
    this.hooks.flash?.('hit');
    if(enemy.hp>0)return;
    enemy.mesh.visible=false;
    this.spawnIn=6;
    const {essenceMin,essenceMax}=TUNABLES.drops;
    const essence=essenceMin+Math.floor(Math.random()*(essenceMax-essenceMin+1));
    const drop=(id:ItemId,count:number,offset:number)=>{
      if(this.hooks.drop)this.hooks.drop(id,count,{...enemy.position,x:enemy.position.x+offset});
      else this.inventory.add(id,count);
    };
    drop('essence',essence,-.21);
    drop('heart',TUNABLES.drops.heartsPerKill,.23);
    const materials=TUNABLES.drops.craftingProbabilities;
    if(Math.random()<materials.cutterBlade)drop('cutterBlade',1,-.52);
    if(Math.random()<materials.mechanicalPencil)drop('mechanicalPencil',1,.71);
    if(Math.random()<materials.leadTube)drop('leadTube',1,-.74);
    const roll=Math.random();
    let odds=0;
    for(const id of HEALING){
      odds+=TUNABLES.drops.healingProbabilities[id];
      if(roll<odds){drop(id,1,.52);break;}
    }
  }
  private wallDistance(ray:Ray,max:number):number{
    const result=new Vector3();
    for(const wall of this.walls){
      if(ray.intersectBox(wall,result))max=Math.min(max,result.distanceTo(ray.origin));
    }
    return max;
  }
  private target(ray:Ray,max:number):{enemy:Enemy;distance:number}|undefined{
    let nearest;
    const hit=new Vector3();
    for(const enemy of this.enemies){
      if(enemy.hp<=0)continue;
      const {x,y,z}=enemy.position;
      const half=enemy.boss?.65:.44;
      const bounds=new Box3(new Vector3(x-half,y,z-half),new Vector3(x+half,y+(enemy.boss?2.8:1.95),z+half));
      if(!ray.intersectBox(bounds,hit))continue;
      const distance=hit.distanceTo(ray.origin);
      if(distance<=max&&(!nearest||distance<nearest.distance))nearest={enemy,distance};
    }
    return nearest;
  }
  private addShot(kind:Shot['kind'],pos:Vector3,velocity:Vector3,damage:number,seconds:number,radius=0):void{
    let shot=this.shotPool.find(item=>item.seconds<=0);
    if(!shot){
      if(this.shotPool.length>=64)return;
      const mesh=new Mesh(this.bulletGeometry,this.bulletMaterials[kind]);
      this.group.add(mesh);
      shot={mesh,pos:new Vector3(),velocity:new Vector3(),damage:0,seconds:0,kind,radius};
      this.shotPool.push(shot);
    }
    Object.assign(shot,{kind,damage,seconds,radius});
    shot.pos.copy(pos);shot.velocity.copy(velocity);shot.mesh.position.copy(pos);
    shot.mesh.material=this.bulletMaterials[kind];shot.mesh.scale.setScalar(kind==='blast'||kind==='trap'?2:1);shot.mesh.visible=true;
  }
  private hitArea(point:Vector3,radius:number,damage:number):void{
    for(const enemy of this.enemies){
      if(enemy.hp<=0)continue;
      const center=new Vector3(enemy.position.x,enemy.position.y+.9,enemy.position.z);
      const rayDir=center.clone().sub(point);
      const distance=rayDir.length();
      if(distance<=radius&&this.wallDistance(new Ray(point,rayDir.normalize()),distance)>=distance-0.02)this.damage(enemy,damage);
    }
  }
  private tickShots(dt:number,player:Vec3,eye:number,safe:boolean,resources:ResourceSystem):void{
    for(const shot of this.shotPool){
      if(shot.seconds<=0)continue;
      shot.seconds-=dt;
      const delta=shot.velocity.clone().multiplyScalar(dt);
      const step=delta.length();
      let wall=false;
      if(step>0){
        const ray=new Ray(shot.pos,delta.normalize());
        const limit=this.wallDistance(ray,step);
        wall=limit<step;
        if(shot.kind==='round'){
          const target=this.target(ray,limit);
          if(target){this.damage(target.enemy,shot.damage);shot.seconds=0;}
          else if(wall)shot.seconds=0;
        }else if(shot.kind==='guard'){
          const box=new Box3(new Vector3(player.x-.38,player.y,player.z-.38),new Vector3(player.x+.38,player.y+eye+.17,player.z+.38));
          const hit=ray.intersectBox(box,new Vector3());
          if(!safe&&hit&&hit.distanceTo(shot.pos)<=limit){
            resources.applyDelta({hp:-shot.damage});this.hooks.flash?.('hurt');shot.seconds=0;
          }else if(wall)shot.seconds=0;
        }
        shot.pos.addScaledVector(ray.direction,Math.max(0,limit-(wall?.028:0)));
        if(shot.kind==='blast'){
          if(wall)shot.velocity.set(0,0,0);
          else shot.velocity.y-=12*dt;
        }
      }
      if(shot.kind==='trap'&&this.enemies.some(e=>e.hp>0&&Math.hypot(e.position.x-shot.pos.x,e.position.y-shot.pos.y,e.position.z-shot.pos.z)<1.5))shot.seconds=0;
      if(shot.seconds<=0&&(shot.kind==='blast'||shot.kind==='trap'))this.hitArea(shot.pos,shot.radius,shot.damage);
      shot.mesh.position.copy(shot.pos);shot.mesh.visible=shot.seconds>0;
    }
  }

  private fire(player:Vec3,eye:number,yaw:number,pitch:number):void{
    const id=this.inventory.weapon;
    if(!id||this.cooldown>0||this.extraction||this.reload)return;
    const spec=weaponSpec(id), ammo=this.weaponAmmo(id);
    const ammoCost=id==='doubleBarrel'?2:1;
    if(ammo&&ammo.loaded<ammoCost){this.startReload();return;}
    const from=new Vector3(player.x,player.y+eye,player.z);
    const dir=new Vector3(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch));
    const ray=new Ray(from,dir);
    const limit=this.wallDistance(ray,spec.range);
    const target=this.target(ray,limit);
    if(id==='garrote'&&!target){this.cooldown=.18;return;}
    if(isConsumableWeapon(id)&&!this.inventory.spend(id))return;
    if(ammo)ammo.loaded-=ammoCost;
    this.cooldown=spec.interval;this.swing=.23;
    switch(spec.attack){
      case 'throw':
        if(target&&target.distance<.5)this.damage(target.enemy,spec.damage);
        else this.addShot('round',from,dir.multiplyScalar(28),spec.damage,spec.range/28);
        break;
      case 'blast':
        this.addShot('blast',from,dir.multiplyScalar(16).add(new Vector3(0,2.1,0)),spec.damage,1.5,spec.splash);
        break;
      case 'trap':
        this.addShot('trap',new Vector3(player.x,player.y+.09,player.z),new Vector3(),spec.damage,28,spec.splash);
        break;
      case 'hex':
        if(target)this.hitArea(ray.at(target.distance+.12,new Vector3()),spec.splash??2,spec.damage);
        break;
      case 'scatter':
        for(let i=0;i<(spec.pellets??1);i++){
          const spray=dir.clone().add(new Vector3((i-(spec.pellets??1)/2+.5)*.032,i%2?.014:-.014,0)).normalize();
          const pellet=new Ray(from,spray), victim=this.target(pellet,this.wallDistance(pellet,spec.range));
          if(victim)this.damage(victim.enemy,spec.damage);
        }
        break;
      default:
        if(target)this.damage(target.enemy,spec.damage);
    }
  }
  private startReload():void{
    const id=this.inventory.weapon;
    if(!id||this.reload)return;
    const spec=weaponSpec(id), ammo=this.weaponAmmo(id);
    if(ammo&&spec.magazine&&ammo.reserve>0&&ammo.loaded<spec.magazine)this.reload={id,time:spec.reload??1};
  }
  private prepareUse(actions:CombatActions,resources:ResourceSystem):void{
    if(this.extraction&&!this.inventory.isEquipped('extractor'))this.extraction=undefined;
    if(actions.extract&&!this.extraction){
      const id=actions.extract, rule=RULES.extraction[id];
      if(this.inventory.isEquipped('extractor')&&this.inventory.count(id)>=rule.input&&resources.current.caffeine<RULES.resources.caffeineMax){
        this.extraction={id,time:TUNABLES.extractor.secondsPerUse};
      }
    }
    if(actions.heal&&!this.healing&&this.healCooldown<=0&&resources.current.hp<RULES.resources.hpMax){
      const missing=RULES.resources.hpMax-resources.current.hp;
      const available=HEALING.filter(id=>this.inventory.count(id)>0);
      const id=actions.heal==='quick'?(available.find(i=>RULES.healing[i]>=missing)??available.at(-1)):actions.heal;
      if(id&&this.inventory.count(id)>0)this.healing={id,time:TUNABLES.healing.useSeconds};
    }
  }
  private finishUse(dt:number,resources:ResourceSystem):void{
    if(resources.cause)return;
    if(this.extraction&&(this.extraction.time-=dt)<=0){
      const {id}=this.extraction, rule=RULES.extraction[id];
      this.extraction=undefined;
      const batches=Math.min(Math.floor(this.inventory.count(id)/rule.input),id==='essence'?TUNABLES.extractor.maxEssenceBatches:1,Math.ceil((RULES.resources.caffeineMax-resources.current.caffeine)/rule.caffeine));
      if(batches>0&&this.inventory.spend(id,batches*rule.input)){
        resources.applyDelta({caffeine:batches*rule.caffeine});
        this.notice(`${ITEMS[id].name} 추출 · CAF +${batches*rule.caffeine}`);
        this.hooks.flash?.('heal');
      }
    }
    if(this.healing&&(this.healing.time-=dt)<=0){
      const {id}=this.healing;
      this.healing=undefined;this.healCooldown=TUNABLES.healing.cooldownSeconds;
      if(resources.current.hp<RULES.resources.hpMax&&this.inventory.spend(id)){
        resources.applyDelta({hp:RULES.healing[id]});
        this.notice(`${ITEMS[id].name} 사용 · HP +${RULES.healing[id]}`);
        this.hooks.flash?.('heal');
      }
    }
  }

  update(dt:number,player:Vec3,eye:number,yaw:number,pitch:number,active:boolean,actions:CombatActions,resources:ResourceSystem,safe=false):void{
    if(!active)return;
    const floor=this.hooks.stage?floorAt(player):0;
    if(floor!==this.floor)this.enterZone(floor);
    this.cooldown=Math.max(0,this.cooldown-dt);this.swing=Math.max(0,this.swing-dt);this.healCooldown-=dt;
    this.prepareUse(actions,resources);
    if(actions.reload)this.startReload();
    if(this.reload&&(this.reload.time-=dt)<=0){
      const {id}=this.reload,ammo=this.weaponAmmo(id),spec=weaponSpec(id);
      this.reload=undefined;
      if(ammo&&spec.magazine){const count=Math.min(spec.magazine-ammo.loaded,ammo.reserve);ammo.loaded+=count;ammo.reserve-=count;}
    }
    if(actions.attack)this.fire(player,eye,yaw,pitch);
    this.tickShots(dt,player,eye,safe,resources);

    const onFloor=!this.hooks.stage||Math.abs(player.y-FLOORS[floor]!.y)<1.4;
    if(!safe&&onFloor&&!resources.cause){
      for(const enemy of this.enemies){
        if(enemy.hp<=0)continue;
        const p=enemy.position,dx=player.x-p.x,dz=player.z-p.z,range=Math.hypot(dx,dz);
        if(range>21)continue;
        enemy.mesh.rotation.y=Math.atan2(dx,dz);
        const minRange=enemy.ranged?6:1.22;
        if(range>minRange){
          const travel=Math.min(range-minRange,(enemy.ranged?2.25:enemy.boss?1.7:2.8)*dt)/range;
          enemy.position=this.world.move(p,{x:dx*travel,y:0,z:dz*travel},1.8,false).position;
          enemy.mesh.position.set(enemy.position.x,enemy.position.y,enemy.position.z);
        }
        enemy.attackIn-=dt;
        if(range>(enemy.ranged?17:1.6)||enemy.attackIn>0)continue;
        const start=new Vector3(p.x,p.y+1.12,p.z);
        const toward=new Vector3(player.x,player.y+eye*.76,player.z).sub(start);
        const distance=toward.length();
        if(this.wallDistance(new Ray(start,toward.normalize()),distance)<distance-.02)continue;
        enemy.attackIn=enemy.ranged?1.4:1;
        if(enemy.ranged)this.addShot('guard',start,toward.multiplyScalar(10),6,2);
        else {resources.applyDelta({hp:enemy.boss?-16:-8});this.hooks.flash?.('hurt');}
      }
    }
    this.finishUse(dt,resources);
    if(floor===0&&onFloor&&this.enemies.every(enemy=>enemy.hp<=0)&&(this.spawnIn-=dt)<=0){
      this.enemies=[];this.spawn(this.hooks.spawn);
    }
  }
  dispose():void{
    for(const shot of this.shotPool)shot.mesh.removeFromParent();
    disposeGroup(this.group);
    this.group.removeFromParent();
    this.bulletGeometry.dispose();
    for(const material of Object.values(this.bulletMaterials))material.dispose();
  }
}
