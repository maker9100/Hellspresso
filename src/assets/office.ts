import {
  BoxGeometry, BufferGeometry, CylinderGeometry, Float32BufferAttribute, Group, Mesh,
  MeshBasicMaterial, PlaneGeometry, Quaternion, Vector3,
} from 'three';
import type { Material } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Aabb, Vec3 } from '../core/types';
import { createOfficeDemon } from './officeDemon';
import { cityWindowTexture, contactShadow, officeMaterials, signTexture } from './officeMaterials';
import { disposeGroup } from './procedural';

type Point = readonly [number, number, number];
const stair = { x:10.5, width:3.85, startZ:-16.25, depth:0.36, rise:0.2, count:18 };
const landingY = -stair.rise*stair.count;
const landingEnd = -25.3;
export const officePlan = {
  spawn:{x:0,y:0,z:10.8},
  enemySpawn:{x:0,y:0,z:4.1},
  stairZ:stair.startZ,
  landingY,
  reachedLanding: (p:Vec3) =>
    Math.abs(p.x-stair.x)<stair.width/2 && p.z<-23.85 && p.z>landingEnd && Math.abs(p.y-landingY)<0.13,
};

const pools: Point[] = [];
for (const x of [-5.65, 0, 5.65]) {
  for (const z of [10.2,5.4,0,-5.3,-10.5,-14.25]) pools.push([x,3.44,z]);
}

export function createOffice() {
  const root = new Group();
  const colliders: Aabb[] = [];
  const material = officeMaterials();
  const batches = new Map<Material, BufferGeometry[]>();

  function batch(geometry:BufferGeometry, surface:Material, shade=1):void {
    const position=geometry.getAttribute('position');
    const color=new Float32Array(position.count*3);
    for(let i=0;i<position.count;i++){
      const x=position.getX(i), y=position.getY(i), z=position.getZ(i);
      let illumination=0.48;
      for(const [lx,ly,lz] of pools){
        const distance=(x-lx)**2+(z-lz)**2+0.20*(y-ly)**2;
        illumination=Math.max(illumination,0.49+0.51*Math.exp(-distance/9));
      }
      if(y<0) illumination=0.82;
      color.fill(illumination*shade,i*3,i*3+3);
    }
    geometry.setAttribute('color',new Float32BufferAttribute(color,3));
    const group=batches.get(surface);
    if(group)group.push(geometry);
    else batches.set(surface,[geometry]);
  }

  function box(center:Point,size:Point,surface:Material,solid=false,shade=1,tile=1.5):void {
    const [x,y,z]=center, [w,h,d]=size;
    const geometry=new BoxGeometry(w,h,d,Math.ceil(w/2.4),Math.ceil(h/2.4),Math.ceil(d/2.4));
    geometry.translate(x,y,z);
    const p=geometry.getAttribute('position'), n=geometry.getAttribute('normal'), uv=geometry.getAttribute('uv');
    for(let i=0;i<p.count;i++){
      const vertical=Math.abs(n.getY(i))>0.5;
      uv.setXY(i,(Math.abs(n.getX(i))>0.5?p.getZ(i):p.getX(i))/tile,
        (vertical?p.getZ(i):p.getY(i))/tile);
    }
    batch(geometry,surface,shade);
    if(solid)colliders.push({min:{x:x-w/2,y:y-h/2,z:z-d/2},max:{x:x+w/2,y:y+h/2,z:z+d/2}});
  }

  function tube(from:Point,to:Point,radius:number,surface:Material,segments=14):void {
    const a=new Vector3(...from), b=new Vector3(...to);
    const delta=b.clone().sub(a);
    const geometry=new CylinderGeometry(radius,radius,delta.length(),segments);
    geometry.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0,1,0),delta.normalize()));
    geometry.translate((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);
    batch(geometry,surface);
  }

  function sign(text:string,caption:string,point:Point,width:number,height:number,yaw=0,accent='#f3ba66'):void {
    const label=new Mesh(new PlaneGeometry(width,height),
      new MeshBasicMaterial({map:signTexture(text,caption,accent),toneMapped:false}));
    label.position.set(...point);
    label.rotation.y=yaw;
    root.add(label);
  }

  // Open-plan room with a single marked fire door to the stairs.
  box([0,-0.19,-1.375],[26,0.38,29.75],material.carpet,true,1,0.9);
  box([0,3.77,-1.375],[26,0.23,29.75],material.ceiling,true,0.83,0.72);
  box([-13.13,1.82,-1.35],[0.26,3.64,29.9],material.plaster,true);
  box([13.13,1.82,-1.35],[0.26,3.64,29.9],material.plaster,true);
  box([0,1.82,13.62],[26,3.64,0.24],material.plaster,true);
  box([-2.225,1.82,-16.36],[21.55,3.64,0.22],material.plaster,true);
  box([12.73,1.82,-16.36],[0.54,3.64,0.22],material.plaster,true);
  box([10.5,3.14,-16.36],[3.90,1,0.24],material.plaster,true);
  for(const side of [-1,1]){
    box([side*12.96,0.13,-1.35],[0.11,0.26,29.9],material.trim);
    box([side*12.96,2.75,-1.35],[0.09,0.12,29.9],material.trim);
  }
  box([-2.2,0.12,-16.18],[21.5,0.24,0.12],material.trim);
  box([0,0.13,13.47],[26,0.26,0.11],material.trim);
  for(const z of [-12.2,-3.4,5.35,11.65]){
    for(const x of [-12.7,12.7])box([x,1.82,z],[0.56,3.64,0.50],material.concrete,true);
  }
  const exterior=new MeshBasicMaterial({map:cityWindowTexture(),toneMapped:false});
  for(const z of [-8.3,0.9,8.4]){
    box([-12.91,2.0,z],[0.12,1.8,3.8],material.trim);
    const pane=new Mesh(new PlaneGeometry(3.63,1.61),exterior);
    pane.position.set(-12.83,2.0,z);
    pane.rotation.y=Math.PI/2;
    root.add(pane);
    box([-12.77,2.0,z],[0.09,1.65,0.075],material.trim);
    box([-12.73,1.13,z],[0.39,0.10,3.88],material.steel);
  }

  for(const side of [-1,1]){
    box([side*12.98,0.65,-1.35],[0.045,1.01,29.7],material.greenPaint,false,0.63);
    box([side*12.93,1.18,-1.35],[0.09,0.055,29.7],material.steel);
  }
  for(const z of [-11.7,6.15]){
    sign('05  /  STAFF','NIGHT SHIFT  ·  FLOOR PLAN',[-12.95,2.18,z],1.18,0.34,Math.PI/2,'#aeae8a');
  }
  const ao=contactShadow();
  function deskShadow(x:number,z:number,width:number,depth:number):void{
    const shadow=new Mesh(new PlaneGeometry(width,depth),ao);
    shadow.rotation.x=-Math.PI/2;
    shadow.position.set(x,0.009,z);
    root.add(shadow);
  }

  function chair(x:number,z:number,facing:number,faded:boolean):void{
    const fabric=faded?material.clothFaded:material.cloth;
    box([x,0.50,z],[0.51,0.12,0.52],fabric);
    box([x,0.83,z+0.23*facing],[0.47,0.49,0.09],fabric);
    tube([x,0.11,z],[x,0.46,z],0.047,material.steel,8);
    for(const [dx,dz] of [[0.23,0.17],[-0.23,0.17],[0,-0.27]] as const){
      tube([x,0.13,z],[x+dx,0.095,z+dz],0.021,material.trim,6);
      tube([x+dx,0.043,z+dz],[x+dx,0.10,z+dz],0.033,material.rubber,6);
    }
  }

  function workstation(x:number,z:number,facing:number,on:boolean):void{
    const monitorZ=z-0.20*facing;
    box([x,0.86,monitorZ],[0.45,0.035,0.27],material.trim);
    box([x,0.95,monitorZ],[0.12,0.18,0.095],material.steel);
    box([x,1.145,monitorZ],[0.65,0.40,0.11],material.trim);
    box([x,1.16,monitorZ+facing*0.059],[0.55,0.306,0.014],on?material.monitor:material.monitorDead);
    if(on){
      for(const [row,width] of [[0,0.30],[1,0.20],[2,0.26]] as const){
        box([x-0.23+width/2,1.21-row*0.057,monitorZ+facing*0.069],
          [width,0.009,0.003],material.lampDim);
      }
    }
    box([x-0.07,0.818,z+0.27*facing],[0.46,0.032,0.16],material.keyboard);
    for(let i=0;i<3;i++){
      box([x-0.07,0.838,z+0.27*facing+(i-1)*0.045],[0.41,0.007,0.02],material.trim);
    }
    box([x+0.35,0.824,z+0.25*facing],[0.09,0.043,0.13],material.trim);
    box([x-0.57,0.812,z+0.12*facing],[0.26,0.02,0.35],material.folder);
    box([x-0.58,0.83,z+0.13*facing],[0.21,0.012,0.27],material.paper);
    const mugX=x+0.53;
    tube([mugX,0.81,z-0.14*facing],[mugX,0.94,z-0.14*facing],0.064,material.paper,10);
    tube([mugX,0.935,z-0.14*facing],[mugX,0.944,z-0.14*facing],0.051,material.rubber,10);
  }

  function desk(x:number,z:number,w:number,d:number,partition=false):void{
    box([x,0.752,z],[w,0.104,d],material.laminate,true);
    box([x,0.69,z],[w,0.05,d],material.trim);
    for(const side of [-1,1]){
      box([x+side*(w/2-0.15),0.365,z],[0.085,0.72,d-0.14],material.steel,true);
      box([x+side*(w/2-0.43),0.32,z-0.23],[0.48,0.59,0.76],material.steel,true);
    }
    if(partition)box([x,1.01,z],[w-0.16,0.43,0.08],material.clothFaded,true);
    deskShadow(x,z,w+0.9,d+1.03);
  }

  for(const x of [-5.65,5.65]){
    for(const [i,z] of [6.5,1.2,-4.1,-9.4].entries()){
      desk(x,z,4.18,2.15,true);
      for(const side of [-1,1]){
        workstation(x+side*0.97,z+side*0.54,side,(i+(side+1)/2)%3===0);
        chair(x+side*0.92,z+side*1.52,side,i%2===1);
      }
    }
  }
  desk(-2.27,9.24,2.55,1.62);
  chair(-2.24,10.47,1,true);
  workstation(-2.47,9.18,-1,false);
  // The opening extractor sits on the desk as a separate prop from the export pipes.
  box([-1.49,0.88,9.17],[0.34,0.16,0.24],material.trim);
  tube([-1.61,0.96,9.17],[-1.27,0.96,9.17],0.041,material.steel,9);
  tube([-1.51,0.96,9.17],[-1.36,0.96,9.17],0.047,material.caffeine,10);
  sign('05 / OFFICE','CAFFEINE EXPORT DIVISION',[0,2.31,-16.20],3.55,1.00);
  sign('STAFF ONLY','EXPORT NETWORK / EAST RISER',[12.84,2.13,-3.2],2.55,0.72,-Math.PI/2,'#dc8466');

  // Recessed fluorescent fixtures, with the east side on emergency lighting.
  for(const [x,y,z] of pools){
    box([x,y+0.15,z],[1.42,0.11,0.50],material.trim);
    const lit=(x+z>-9 && z<11)||x===0;
    for(const offset of [-0.13,0.13]){
      box([x,y+0.09,z+offset],[1.29,0.044,0.115],lit?material.lamp:material.lampDim);
    }
  }
  for(let z=-14;z<13;z+=4.8){
    box([12.63,3.33,z],[0.15,0.13,0.95],material.trim);
    box([12.55,3.33,z],[0.022,0.055,0.75],material.alarm);
  }

  const pulses: Array<{ mesh:Mesh; start:number; end:number; phase:number }> = [];
  for(const [line,x] of [8.94,10.04,11.14].entries()){
    const y=3.16-line*0.105, r=0.16+line*0.027;
    const start=4.9-line*4.1, end=start-1.8;
    tube([x,y,12.9],[x,y,start],r,material.pipe);
    const bend=-13.35-line*0.26;
    tube([x,y,end],[x,y,bend],r,material.pipe);
    tube([x,y,bend+0.022],[x,y+0.27,bend-0.28],r,material.pipe);
    tube([x,y+0.25,bend-0.27],[x,3.69,bend-0.29],r,material.pipe);
    tube([x,3.55,bend-0.29],[x,3.64,bend-0.29],r+0.055,material.trim);
    tube([x,y,start],[x,y,end],r*0.74,material.caffeine);
    for(const offset of [-0.11,0.11]){
      tube([x+offset,y-0.105,start],[x+offset,y-0.105,end],0.018,material.steel,6);
    }
    for(const z of [start,end,12.4,9.4,5.8,-2.8,-6.4,-10.3,-12.9]){
      if(z<start&&z>end)continue;
      tube([x,y,z-0.052],[x,y,z+0.052],r+0.049,material.trim);
      box([x,(3.67+y+r)/2,z],[0.07,Math.max(0.08,3.67-y-r),0.08],material.steel);
    }
    const pulse=new Mesh(new CylinderGeometry(r*0.77,r*0.77,0.28,12),
      new MeshBasicMaterial({color:0xbd3330,toneMapped:false}));
    pulse.rotation.x=Math.PI/2;
    pulse.position.set(x,y,start);
    root.add(pulse);
    pulses.push({mesh:pulse,start:start-0.15,end:end+0.15,phase:line*0.29});
  }
  box([11.5,2.63,1.65],[2.16,0.62,0.06],material.trim);
  for(const x of [10.69,12.31])tube([x,2.94,1.65],[x,3.69,1.65],0.018,material.steel,7);
  sign('CAF / EXPORT','PRESSURIZED · KEEP CLEAR',[11.5,2.63,1.687],2.1,0.58);

  // The open fire door frames an actual descending flight and a lower landing.
  for(const side of [-1,1]){
    const x=stair.x+side*stair.width/2;
    box([x,1.17,-16.18],[0.16,2.37,0.30],material.shutter,true);
    box([x+side*0.13,-0.29,-20.76],[0.24,7.29,9.1],material.plaster,true);
    const railingY=0.88;
    tube([x-side*0.22,railingY,stair.startZ],[x-side*0.22,landingY+railingY,stair.startZ-stair.depth*stair.count],0.04,material.hazard,9);
    for(let i=1;i<=17;i+=4){
      const z=stair.startZ-(i-0.5)*stair.depth;
      const y=-i*stair.rise;
      tube([x-side*0.22,y,z],[x-side*0.22,y+0.96,z],0.025,material.steel,8);
    }
  }
  for(const side of [-1,1]){
    const x=stair.x+side*(stair.width/2-0.045);
    tube([x,0.46,stair.startZ],[x,landingY+0.46,stair.startZ-stair.depth*stair.count],0.028,material.steel,8);
    tube([x,1.39,stair.startZ],[x,landingY+1.39,stair.startZ-stair.depth*stair.count],0.031,material.trim,8);
  }
  box([10.5,2.40,-16.19],[3.92,0.18,0.30],material.shutter,true);
  box([12.35,1.10,-15.12],[0.09,2.18,1.90],material.greenPaint,true);
  box([12.22,0.98,-14.50],[0.19,0.06,0.11],material.steel);
  sign('05  /  EXIT','FIRE STAIRS  ·  04 DOWN',[10.5,2.94,-16.20],3.2,0.9,0,'#f9ca7e');
  box([10.5,2.48,-16.02],[0.82,0.07,0.09],material.guide);
  for(let i=0;i<8;i++){
    box([8.9+i*0.45,0.013,-15.79],[0.22,0.022,0.19],material.hazard);
  }
  for(let i=1;i<=stair.count;i++){
    const top=-i*stair.rise;
    const z=stair.startZ-(i-0.5)*stair.depth;
    box([stair.x,(top-4.17)/2,z],[stair.width,top+4.17,stair.depth],material.concrete,true);
    box([stair.x,top+0.007,z+0.12],[stair.width-0.16,0.016,0.052],i%3===0?material.hazard:material.trim);
  }
  const stairsEnd=stair.startZ-stair.depth*stair.count;
  box([stair.x,landingY-0.23,(stairsEnd+landingEnd)/2],
    [stair.width,0.46,stairsEnd-landingEnd],material.concrete,true);
  box([stair.x,-0.29,landingEnd-0.12],[stair.width+0.32,7.29,0.24],material.plaster,true);
  box([stair.x,3.66,-20.75],[stair.width,0.22,9.0],material.ceiling,true);
  box([stair.x,landingY+1.12,landingEnd+0.06],[1.82,2.24,0.12],material.greenPaint);
  box([stair.x,landingY+1.05,landingEnd+0.14],[1.35,0.085,0.09],material.steel);
  sign('04 / OFFICE','UPPER OFFICE LANDING',[stair.x,landingY+2.72,landingEnd+0.14],2.66,0.75);
  box([stair.x,landingY+2.30,landingEnd+0.21],[0.66,0.10,0.12],material.guide);
  box([stair.x,landingY+0.011,-24.31],[1.64,0.018,0.045],material.guide);
  for(let i=0;i<3;i++){
    box([stair.x-1.74,0.45-i*1.17,-17.8-i*2.1],[0.055,0.13,0.49],material.lamp);
  }

  for(const [surface,geometries] of batches){
    const merged=mergeGeometries(geometries);
    for(const geometry of geometries)geometry.dispose();
    if(!merged)throw new Error('사무실 메시를 병합할 수 없다.');
    const mesh=new Mesh(merged,surface);
    mesh.receiveShadow=surface!==material.ceiling;
    root.add(mesh);
  }

  const openingDemon=createOfficeDemon();
  openingDemon.visible=false;
  root.add(openingDemon);
  return {
    root,colliders,openingDemon,spawn:officePlan.spawn,
    animate(seconds:number):void{
      for(const pulse of pulses){
        const t=(seconds*0.63+pulse.phase)%1;
        pulse.mesh.position.z=pulse.start+(pulse.end-pulse.start)*t;
      }
    },
    dispose:()=>disposeGroup(root),
  };
}
