import { CAMPAIGN_CACHES } from '../assets/campaignPlan';
import { BoxGeometry, CylinderGeometry, Group, IcosahedronGeometry, Mesh, MeshStandardMaterial } from 'three';
import type { Scene } from 'three';
import { TUNABLES } from '../config/tunables';
import { CACHES, floorAt } from '../assets/officeRoute';
import type { WorldItem } from '../assets/officeRoute';
import { ITEMS, isHealing, isWeapon } from './items';
import type { ItemId } from './items';
import type { Inventory } from './Inventory';
import type { Vec3 } from './types';

type Pickup = WorldItem & { mesh:Mesh; initial:boolean; expires:number };

export class Loot {
  private readonly root=new Group();
  private readonly geometry={
    essence:new CylinderGeometry(.12,.12,.29,9), heart:new IcosahedronGeometry(.19,1),
    supply:new BoxGeometry(.33,.25,.27), weapon:new BoxGeometry(.54,.12,.20),
  };
  private readonly material={
    essence:new MeshStandardMaterial({color:0xc04434,emissive:0x6e1916}),
    heart:new MeshStandardMaterial({color:0x862117,emissive:0x4f120c}),
    heal:new MeshStandardMaterial({color:0xafd295,emissive:0x355229}),
    supply:new MeshStandardMaterial({color:0xc2a36b,emissive:0x47320f}),
    weapon:new MeshStandardMaterial({color:0x7ea9b8,emissive:0x234651}),
  };
  private drops:Pickup[]=[];
  private time=0;
  constructor(scene:Scene,private readonly items:readonly WorldItem[]){scene.add(this.root);}
  reset():void{
    this.root.clear();
    this.drops=[];
    this.time=0;
    for(const item of this.items)this.spawn(item,true);
  }
  spawn(item:WorldItem,initial=false):void{
    const id=item.id;
    const merged=this.drops.find(drop=>!initial&&!drop.initial&&drop.surface===item.surface&&drop.id===id&&Math.hypot(item.x-drop.x,item.y-drop.y,item.z-drop.z)<.65);
    if(merged){merged.count+=item.count;merged.expires=this.time+TUNABLES.drops.ordinaryLifetimeSeconds;return;}
    if(this.drops.length>=192&&!initial){
      const same=this.drops.find(drop=>!drop.initial&&drop.id===id&&Math.abs(drop.y-item.y)<1);
      if(same){same.count+=item.count;same.expires=this.time+TUNABLES.drops.ordinaryLifetimeSeconds;return;}
      const oldest=this.drops.find(drop=>!drop.initial);
      if(oldest)this.remove(oldest);
    }
    const geometry=id==='essence'||id==='heart'?id:isWeapon(id)?'weapon':'supply';
    const material=isHealing(id)?'heal':geometry;
    const mesh=new Mesh(this.geometry[geometry],this.material[material]);
    mesh.position.set(item.x,item.y+(item.surface?.075:.27),item.z);
    if(item.surface){
      if(geometry==='essence'||geometry==='heart')mesh.scale.setScalar(.8);
      if(geometry==='supply')mesh.scale.set(.75,.55,.78);
      if(geometry==='weapon')mesh.scale.set(.69,.75,.79);
    }
    this.root.add(mesh);
    this.drops.push({...item,mesh,initial,expires:initial?Infinity:this.time+TUNABLES.drops.ordinaryLifetimeSeconds});
  }
  drop(id:ItemId,count:number,position:Vec3):void{this.spawn({id,count,...position});}
  reward(id:ItemId,count:number,position:Vec3):void{
    const floor=floorAt(position);
    const caches=[...CACHES,...CAMPAIGN_CACHES.map(cache=>({position:{...cache.position,y:cache.position.y+.68},crate:false}))].filter(cache=>floorAt(cache.position)===floor);
    caches.sort((a,b)=>Math.hypot(a.position.x-position.x,a.position.z-position.z)-Math.hypot(b.position.x-position.x,b.position.z-position.z));
    const cache=caches[0];
    if(!cache)return;
    const slot=['heart','coffeeCandy','espresso','latte','coffeeVodka','cutterBlade','mechanicalPencil','leadTube'].indexOf(id);
    const {x,y,z}=cache.position;
    this.spawn({id,count,x:x+((slot%4)-1.5)*.25,y:y+(cache.crate?.09:0),z:z-.21+Math.floor(slot/4)*.42,surface:true});
  }
  update(dt:number,position:Vec3,inventory:Inventory):void{
    this.time+=dt;
    for(const drop of this.drops.slice()){
      if(drop.expires<this.time){this.remove(drop);continue;}
      if(drop.surface&&drop.id==='essence'&&this.range(drop,position)<TUNABLES.drops.pickupRadius&&inventory.add(drop.id,drop.count)){
        this.remove(drop);continue;
      }
      drop.mesh.visible=Math.abs(drop.z-position.z)<42&&Math.abs(drop.y-position.y)<5;
      if(drop.mesh.visible&&!drop.surface){
        drop.mesh.rotation.y=this.time*1.8;
        drop.mesh.position.y=drop.y+.27+.055*Math.sin(this.time*3+drop.x);
      }
    }
  }
  private range(drop:Pickup,position:Vec3):number{
    if(Math.abs(drop.y-position.y)>1.2)return Infinity;
    return Math.hypot(drop.x-position.x,drop.z-position.z);
  }
  nearest(position:Vec3):Pickup|undefined{
    let best:Pickup|undefined;
    let distance:number=TUNABLES.drops.pickupRadius;
    for(const drop of this.drops){
      if(drop.surface&&drop.id==='essence')continue;
      const range=this.range(drop,position);
      if(range<distance){best=drop;distance=range;}
    }
    return best;
  }
  collect(position:Vec3,inventory:Inventory):string|undefined{
    const candidates=this.drops.map(drop=>({drop,distance:this.range(drop,position)}))
      .filter(({drop,distance})=>!(drop.surface&&drop.id==='essence')&&distance<TUNABLES.drops.pickupRadius).sort((a,b)=>a.distance-b.distance);
    for(const {drop} of candidates){
      if(inventory.add(drop.id,drop.count)){
        this.remove(drop);
        return ITEMS[drop.id].name;
      }
    }
    return undefined;
  }
  private remove(drop:Pickup):void{
    this.root.remove(drop.mesh);
    this.drops.splice(this.drops.indexOf(drop),1);
  }
  dispose():void{
    this.root.clear();
    this.root.removeFromParent();
    for(const geometry of Object.values(this.geometry))geometry.dispose();
    for(const material of Object.values(this.material))material.dispose();
  }
}
