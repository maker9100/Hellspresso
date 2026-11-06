import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry } from 'three';
import type { Material } from 'three';
import type { Aabb, Vec3 } from '../core/types';
import type { ItemId } from '../core/items';
import { CITY, STATION, FINALE, CAMPAIGN_CACHES, campaignSafe } from './campaignPlan';
import { contactShadow, routeMaterials, signTexture } from './officeMaterials';

export interface Floor { name:string; y:number; start:number; end:number; guards:number; advice:string }
export const FLOORS:readonly Floor[]=[
  {name:'최상층 · 지옥 사무실',y:0,start:13.5,end:-16.25,guards:4,advice:'오른쪽 끝 비상계단'},
  {name:'상층 · 사무실',y:-3.6,start:-25.3,end:-51.3,guards:4,advice:'사무실 끝 비상계단'},
  {name:'3층 · 엔진실',y:-7.2,start:-58.5,end:-82.5,guards:4,advice:'정상 엔진 오른쪽 통로'},
  {name:'중층 · 컨베이어 시설',y:-10.8,start:-89.7,end:-115.7,guards:4,advice:'컨베이어 사이 통로'},
  {name:'1층 · 로비',y:-14.4,start:-122.9,end:-149.9,guards:5,advice:'석상 너머 회전문'},
  ...CITY,...STATION,FINALE,
];

export const ROUTE_X=10.5;
export function floorAt(p:Vec3):number {
  for(let i=FLOORS.length-1;i>=1;i--)if(p.z<=FLOORS[i]!.start+0.2)return i;
  return 0;
}
export interface WorldItem extends Vec3 { id:ItemId; count:number; surface?:boolean }
type Cache = { position:Vec3; crate:boolean; supplies:readonly (readonly [ItemId,number])[] };
function cache(x:number,y:number,z:number,crate:boolean,...supplies:Cache['supplies']):Cache{
  return {position:{x,y,z},crate,supplies};
}
export const CACHES:readonly Cache[]=[
  cache(4.52,.81,7.24,false,['stapler',1],['coffeeCandy',2]),
  cache(-4.4,.81,1.86,false,['butterfly',1],['essence',30],['cutterBlade',3]),
  cache(2.65,0,-11.6,true,['heart',2],['stampBody',1],['inkpad',1]),
  cache(7.65,-3.6,-28.2,true,['sharpener',1],['triangle',3],['espresso',2]),
  cache(5.95,-2.79,-35.06,false,['mechanicalPencil',2],['leadTube',3]),
  cache(13,-3.6,-43,true,['cableTie',5],['tape',1],['essence',40]),
  cache(13.8,-7.2,-63.4,true,['sniper',1],['powerBank',3],['latte',2]),
  cache(14,-7.2,-76,true,['tackBox',1],['tack',10],['awl',2]),
  cache(7.5,-7.2,-80,true,['heart',3],['essence',50]),
  cache(13.2,-10.8,-94,true,['worshipBook',1],['coffeeVodka',1]),
  cache(8.9,-10.8,-109,true,['heart',3],['essence',50],['espresso',2]),
  cache(6.7,-14.4,-129,true,['heart',3],['latte',2]),
  cache(14.1,-14.4,-145,true,['coffeeVodka',2]),
];
export const MAP_LOOT:readonly WorldItem[]=CACHES.flatMap(({position,crate,supplies})=>
  supplies.map(([id,count],i)=>({id,count,x:position.x+(i-(supplies.length-1)/2)*(crate?.32:.35),
    y:position.y+(crate?.09:0),z:position.z,surface:true}))).concat(
  CAMPAIGN_CACHES.flatMap(({position,supplies})=>supplies.map(([id,count],i)=>({
    id,count,x:position.x+(i-(supplies.length-1)/2)*.46,y:position.y+.68,z:position.z,surface:true,
  }))),
);
export const LIFTS:readonly Vec3[]=FLOORS.slice(0,5).map((floor,index)=>({
  x:index===0?-10.1:ROUTE_X-9.2,y:floor.y,z:floor.end+3.45,
}));
export function liftAt(p:Vec3):number{
  return LIFTS.findIndex(l=>Math.abs(l.y-p.y)<.75&&Math.hypot(l.x-p.x,l.z-p.z)<1.35);
}
export const HOLY_FLOORS=new Set([1,3]);
export function inSafeZone(p:Vec3,index:number):boolean {
  if(index>=5)return !!campaignSafe(p);
  const floor=FLOORS[index]!;
  return HOLY_FLOORS.has(index)&&p.z<floor.start-0.45&&p.z>floor.start-4&&Math.abs(p.x-ROUTE_X)<2.8&&Math.abs(p.y-floor.y)<1;
}

export function addOfficeRoute(root:Group,colliders:Aabb[]):(seconds:number)=>void{
  const color=(value:number)=>new MeshStandardMaterial({color:value,roughness:.83});
  const surfaces=routeMaterials();
  const {concrete,plaster:wall,carpet,laminate:desktop}=surfaces;
  const tiled=new Set<Material>(Object.values(surfaces));
  const metal=color(0x343538), shadow=contactShadow();
  const seat=color(0x343738), bronze=color(0x5d4039), frame=color(0x6f756e);
  const light=new MeshBasicMaterial({color:0xffc779}), alarm=new MeshBasicMaterial({color:0xd32c24});
  const holy=new MeshBasicMaterial({color:0x8fcfdf}), glass=new MeshStandardMaterial({color:0x76b1a4,transparent:true,opacity:.29,roughness:.2,depthWrite:false});
  const unit=new BoxGeometry(1,1,1);
  const liftLamp=new MeshBasicMaterial({color:0x90d3cf});
  const accent=new MeshStandardMaterial({color:0x593435,metalness:.32,roughness:.56});
  const fans:Mesh[]=[], belts:Array<{mesh:Mesh;phase:number;center:number}>=[], doors:Group[]=[];
  const box=(x:number,y:number,z:number,w:number,h:number,d:number,m:Material,solid=false,parent:Group=root):Mesh=>{
    const geometry=tiled.has(m)?new BoxGeometry(w,h,d):unit;
    if(geometry!==unit){
      const p=geometry.getAttribute('position'), n=geometry.getAttribute('normal'), uv=geometry.getAttribute('uv');
      for(let i=0;i<p.count;i++)uv.setXY(i,(Math.abs(n.getX(i))>.5?p.getZ(i):p.getX(i))*.55,
        (Math.abs(n.getY(i))>.5?p.getZ(i):p.getY(i))*.55);
    }
    const mesh=new Mesh(geometry,m);
    mesh.position.set(x,y,z);
    if(geometry===unit)mesh.scale.set(w,h,d);
    parent.add(mesh);
    if(solid)colliders.push({min:{x:x-w/2,y:y-h/2,z:z-d/2},max:{x:x+w/2,y:y+h/2,z:z+d/2}});
    return mesh;
  };
  const sign=(label:string,sub:string,x:number,y:number,z:number,width=3):void=>{
    const plate=new Mesh(new PlaneGeometry(width,width*.29),new MeshBasicMaterial({map:signTexture(label,sub,'#f4bc74')}));
    plate.position.set(x,y,z);root.add(plate);
  };
  const tube=(x:number,y:number,z:number,r:number,length:number,m:Material,axis:'x'|'z'='z'):Mesh=>{
    const mesh=new Mesh(new CylinderGeometry(r,r,length,12),m);
    mesh.position.set(x,y,z);if(axis==='z')mesh.rotation.x=Math.PI/2;else mesh.rotation.z=Math.PI/2;
    root.add(mesh);return mesh;
  };
  const hallway=(index:number):void=>{
    const from=FLOORS[index]!, to=FLOORS[index+1]!;
    const depth=from.end-to.start, n=18, tread=depth/n, width=4;
    for(let i=0;i<n;i++){
      const y=from.y+(to.y-from.y)*(i+1)/n;
      const z=from.end-(i+.5)*tread;
      box(ROUTE_X,y-.2,z,width,.4,tread+.005,concrete,true);
      box(ROUTE_X,y+.004,z+tread*.33,width-.18,.012,.055,i%3===0?light:metal);
    }
    for(const side of [-1,1]){
      box(ROUTE_X+side*2.13,from.y+.1,(from.end+to.start)/2,.26,8,depth+.08,wall,true);
      for(let i=0;i<4;i++)box(ROUTE_X+side*1.98,from.y+.95-i*.85,from.end-i*depth/4,.08,.08,.55,light);
    }
    box(ROUTE_X,from.y+3.6,(from.end+to.start)/2,4.25,.25,depth,metal,true);
  };

  for(let index=1;index<5;index++){
    const floor=FLOORS[index]!;
    const {y,start,end}=floor, depth=start-end, center=(start+end)/2, width=index===4?30:26;
    box(ROUTE_X,y-.23,center,width,.46,depth,index===1?carpet:concrete,true);
    for(const side of [-1,1]){
      box(ROUTE_X+side*(width/2+.13),y+2.1,center,.26,4.2,depth,wall,true);
      if(index!==5)box(ROUTE_X+side*(width/2-.12),y+.22,center,.13,.36,depth,metal);
    }
    if(index!==5){
      const gap=index===4?8:4;
      const segment=(width-gap)/2;
      for(const side of [-1,1]){
        box(ROUTE_X+side*(gap/2+segment/2),y+2.1,end,segment,4.2,.22,wall,true);
        const rear=(width-4)/2;
        box(ROUTE_X+side*(2+rear/2),y+2.1,start,rear,4.2,.22,wall,true);
      }
      box(ROUTE_X,y+3.6,end,gap,1.2,.22,metal,true);
      box(ROUTE_X,y+4.19,center,width,.24,depth,metal,true);
      for(let z=start-2;z>end;z-=4.2){
        for(const x of [ROUTE_X-5.65,ROUTE_X,ROUTE_X+5.65])box(x,y+3.98,z,1.4,.035,.26,index===2&&x<ROUTE_X?alarm:light);
        box(ROUTE_X,y+.006,z,.12,.014,.58,light);
        for(const side of [-1,1]){
          const x=ROUTE_X+side*(width/2-.10);
          box(x,y+1.08,z,.10,.24,3.87,index===1?desktop:accent);
          box(x,y+2.7,z,.16,.14,.62,frame);
          box(x-side*.095,y+2.7,z,.033,.06,.41,index===2?alarm:light);
        }
      }
      sign(index===4?'01 / EXIT':`0${5-index}  /  DOWN`,index===4?'DEMON CITY':'FIRE STAIRS',ROUTE_X,y+2.85,end+.13,3.3);
    }
    if(inSafeZone({x:ROUTE_X,y,z:start-1},index)){
      box(ROUTE_X,y+.008,start-2.15,5.55,.014,3.45,holy);
      sign('SACRED ZONE','SAFE CHECKPOINT',ROUTE_X,y+3.35,start-3.7,2.65);
    }
    if(index>=1&&index<=3)hallway(index);
  }

  const groundShadow=(x:number,y:number,z:number,width:number,depth:number):void=>{
    const decal=new Mesh(new PlaneGeometry(width,depth),shadow);
    decal.rotation.x=-Math.PI/2;decal.position.set(x,y+.009,z);root.add(decal);
  };
  for(const {position:{x,y,z},crate} of CACHES){
    if(!crate)continue;
    groundShadow(x,y,z,1.9,1.3);
    box(x,y+.054,z,1.28,.108,.76,metal,true);
    for(const side of [-1,1]){
      box(x+side*.62,y+.22,z,.07,.42,.76,desktop,true);
      box(x,y+.19,z+side*.36,1.2,.32,.07,desktop,true);
      box(x+side*.44,y+.26,z+.402,.12,.21,.02,frame);
    }
    box(x,y+.15,z+.40,.18,.06,.025,light);
  }
  for(const [index,{x,y,z}] of LIFTS.entries()){
    box(x,y+.022,z,2.65,.044,2.78,frame);
    box(x,y+1.5,z-1.42,2.7,3,.14,metal,true);
    for(const side of [-1,1]){
      box(x+side*1.35,y+1.5,z,.13,3,2.78,metal,true);
      box(x+side*1.25,y+1.51,z+1.39,.2,3,.16,accent);
      box(x+side*1.22,y+2.66,z,.06,.06,2.55,liftLamp);
      box(x+side*.56,y+1.45,z-1.327,.045,2.64,.018,frame);
    }
    box(x,y+2.96,z+1.37,2.52,.22,.23,metal,true);
    box(x+.95,y+1.09,z+.98,.18,.32,.09,frame);
    box(x+.95,y+1.14,z+1.032,.067,.067,.022,liftLamp);
    sign('LIFT',index===4?'UP / 02-05':'UP / DOWN',x,y+2.64,z+1.49,1.43);
  }

  const office=FLOORS[1]!;
  for(const x of [ROUTE_X-5.65,ROUTE_X+5.65])for(const z of [-30.5,-35.8,-41.1,-46.4]){
    groundShadow(x,office.y,z,5,3.4);
    box(x,office.y+.752,z,4.18,.104,2.15,desktop,true);
    box(x,office.y+1.01,z,4.02,.43,.08,seat,true);
    for(const side of [-1,1]){
      box(x+side*1.8,office.y+.35,z,.2,.7,1.9,metal,true);
      box(x+side*.96,office.y+1.14,z+side*.36,.65,.4,.11,metal);
      box(x+side*.92,office.y+.51,z+side*1.55,.51,.11,.52,seat);
      box(x+side*.92,office.y+.78,z+side*1.8,.49,.47,.09,seat);
      box(x+side*.96,office.y+.82,z+side*.78,.42,.034,.16,frame);
    }
  }
  for(const x of [ROUTE_X+7.8,ROUTE_X+9.1,ROUTE_X+10.4]){
    tube(x,office.y+3.55,-38.4,.15,24,bronze);
    tube(x,office.y+3.55,-37,.17,1.25,alarm);
  }

  const engine=FLOORS[2]!;
  for(let i=0;i<3;i++){
    const x=ROUTE_X+(i-1)*7;
    const z=-70.5;
    groundShadow(x,engine.y,z,6,6.8);
    box(x,engine.y+1.29,z,4.15,2.58,4.9,i===0?bronze:metal,true);
    const housing=tube(x,engine.y+1.46,z+2.65,1.09,.22,frame);
    housing.position.z=z+2.53;
    const fan=box(x,engine.y+1.45,z+2.69,.18,1.84,.105,i===0?alarm:light);
    if(i>0)fans.push(fan);
    else {fan.rotation.z=.54;box(x-.9,engine.y+.12,z+3.1,.62,.22,1.3,bronze);}
    sign(i===0?'01 / OFFLINE':`0${i+1} / ACTIVE`,i===0?'CASING BREACH':'EXPORT ENGINE',x,engine.y+2.96,z+2.55,2.7);
    for(let j=0;j<3;j++){
      if(i===0&&j!==2){
        tube(x+j*.55-1,engine.y+3.26,z+5,.17,3.5,bronze);
        tube(x+j*.55-1,engine.y+3.26,z+3.23,.13,.15,alarm);
        const leak=box(x+j*.55-1,engine.y+1.76,z+3.2,.035,2.75,.025,alarm);
        leak.rotation.z=j*.06;
        box(x+j*.55-1,engine.y+.013,z+3.25,.58,.02,.48,accent);
      }else tube(x+j*.55-1,engine.y+3.26,z,.18,13.2,bronze);
    }
  }

  const factory=FLOORS[3]!;
  for(const x of [ROUTE_X-7.7,ROUTE_X-3.85,ROUTE_X+3.85,ROUTE_X+7.7]){
    box(x,factory.y+.56,-103,2.1,1.12,19,metal,true);
    for(const side of [-1,1])box(x+side*1.01,factory.y+1.15,-103,.12,.19,19,frame);
    tube(x,factory.y+3.38,-103,.14,22,bronze);
    for(let i=0;i<12;i++){
      const mesh=box(x,factory.y+1.13,-103,1.79,.048,.16,i%3===0?frame:carpet);
      belts.push({mesh,phase:i*1.54,center:-103});
    }
    for(const z of [-97,-105,-111])box(x,factory.y+1.49,z,.78,.66,.76,desktop);
  }

  const lobby=FLOORS[4]!;
  groundShadow(ROUTE_X,lobby.y,-135.6,6.8,5.6);
  box(ROUTE_X,lobby.y+.25,-135.6,4.8,.5,3.9,bronze,true);
  box(ROUTE_X,lobby.y+1.68,-135.6,1.45,2.35,.97,bronze,true);
  box(ROUTE_X,lobby.y+2.93,-135.56,.83,.83,.72,bronze);
  for(const side of [-1,1]){
    const horn=box(ROUTE_X+side*.39,lobby.y+3.42,-135.58,.18,.63,.22,metal);
    horn.rotation.z=side*-.32;
    box(ROUTE_X+side*1.09,lobby.y+2,-135.59,.55,1.58,.53,bronze).rotation.z=side*.3;
    box(ROUTE_X+side*.18,lobby.y+3.06,-135.14,.14,.09,.027,alarm);
    const x=ROUTE_X+side*2.03;
    const door=new Group();
    door.position.set(x,lobby.y,-150.08);
    root.add(door);
    box(0,1.15,0,2.42,2.23,.06,glass,false,door);
    box(0,1.15,0,.06,2.23,2.42,glass,false,door);
    box(0,1.17,0,.10,2.34,.10,frame,false,door);
    doors.push(door);
    for(const edge of [-1,1])box(x+edge*1.37,lobby.y+1.21,-149.95,.12,2.42,.2,frame,true);
    box(x,lobby.y+2.49,-149.95,2.85,.12,.2,frame,true);
  }
  box(ROUTE_X,lobby.y+1.18,-149.98,.25,2.36,.30,frame,true);

  return seconds=>{
    fans.forEach((fan,i)=>{fan.rotation.z=seconds*(i===0?5:7);});
    belts.forEach(({mesh,phase,center})=>{mesh.position.z=center-9.25+(seconds*1.8+phase)%18.5;});
    doors.forEach((door,i)=>{door.rotation.y=seconds*(i===0?.65:-.65);});
  };
}
