import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry } from 'three';
import type { Material } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Aabb } from '../core/types';
import { CAMPAIGN_CACHES, CITY_CENTER, CITY_END, CITY_START, STATION, STAGE04_Z, WARPS, stairOffsets } from './campaignPlan';
import { routeMaterials, signTexture } from './officeMaterials';

export function trainModel(color:number):Group{
  const group=new Group();
  const body=new MeshStandardMaterial({color,roughness:.72,metalness:.18});
  const chassis=new MeshStandardMaterial({color:0x212128});
  const glass=new MeshBasicMaterial({color:0x27353f});
  const lamps=new MeshBasicMaterial({color:0xff8258});
  const piece=(x:number,y:number,z:number,w:number,h:number,d:number,m:Material)=>{
    const mesh=new Mesh(new BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);group.add(mesh);
  };
  piece(0,1.46,0,2.8,2.35,9,body);
  piece(0,.4,0,2.53,.51,8.8,chassis);
  piece(0,2.73,0,2.58,.27,8.82,chassis);
  for(const side of [-1,1]){
    piece(side*.82,1.02,4.52,.38,.24,.08,lamps);
    piece(side*.59,2.02,4.52,1.04,.64,.08,glass);
    for(const z of [-3,-1,1,3])piece(side*1.407,2.04,z,.025,.56,1.23,glass);
    for(const z of [-2.9,2.9])piece(side*1.08,.22,z,.56,.42,.72,chassis);
  }
  return group;
}

export function addCampaignWorld(root:Group,colliders:Aabb[]){
  const cx=CITY_CENTER, base=-14.4;
  const {concrete,plaster,laminate}=routeMaterials();
  const dark=new MeshStandardMaterial({color:0x29252a,roughness:1});
  const steel=new MeshStandardMaterial({color:0x514b50,roughness:.78});
  const brown=new MeshStandardMaterial({color:0x67423b,roughness:.9});
  const tile=new MeshStandardMaterial({color:0x888582,roughness:.84});
  const blue=new MeshBasicMaterial({color:0x579dd7});
  const red=new MeshBasicMaterial({color:0xda353c});
  const violet=new MeshBasicMaterial({color:0xa23fec});
  const amber=new MeshBasicMaterial({color:0xd69a4f});
  const white=new MeshBasicMaterial({color:0xd3cbb2});
  const green=new MeshBasicMaterial({color:0x62b09e});
  const liquid=new MeshStandardMaterial({color:0x75162a,emissive:0x53141d,roughness:.24});
  const textured=new Set<Material>([concrete,plaster,laminate]);
  const railTraffic:Array<{mesh:Group;z:number}>=[];
  const escalators:Array<{mesh:Mesh;start:number;y:number;phase:number}>=[];
  const stepMarker=new BoxGeometry(4.13,.018,.075);
  const batches=new Map<Material,BoxGeometry[]>();
  function box(x:number,y:number,z:number,w:number,h:number,d:number,m:Material,solid=false){
    const g=new BoxGeometry(w,h,d);
    if(textured.has(m)){
      const p=g.getAttribute('position'), n=g.getAttribute('normal'), uv=g.getAttribute('uv');
      for(let i=0;i<p.count;i++)uv.setXY(i,(Math.abs(n.getX(i))>.5?p.getZ(i):p.getX(i))*.55,(Math.abs(n.getY(i))>.5?p.getZ(i):p.getY(i))*.55);
    }
    g.translate(x,y,z);
    const batch=batches.get(m)??[];batch.push(g);batches.set(m,batch);
    if(solid)colliders.push({min:{x:x-w/2,y:y-h/2,z:z-d/2},max:{x:x+w/2,y:y+h/2,z:z+d/2}});
  }
  function flush(){
    for(const [m,b] of batches){
      const g=mergeGeometries(b);
      for(const item of b)item.dispose();
      if(g)root.add(new Mesh(g,m));
    }
    batches.clear();
  }
  function sign(label:string,caption:string,x:number,y:number,z:number,w=5,angle=0,color='#ffb069'){
    const mesh=new Mesh(new PlaneGeometry(w,w*.28),new MeshBasicMaterial({map:signTexture(label,caption,color),toneMapped:false}));
    mesh.position.set(x,y,z);mesh.rotation.y=angle;root.add(mesh);
  }
  function floor(x:number,y:number,start:number,end:number,w:number,m=concrete){
    box(x,y-.27,(start+end)/2,w,.54,start-end,m,true);
  }
  function wall(x:number,y:number,z:number,w:number,d:number,m=plaster,h=4.8){
    box(x,y+h/2,z,w,h,d,m,true);
  }
  function boundary(y:number,z:number,width:number,gaps:number[],size:number){
    let left=-width/2;
    for(const gap of [...gaps,size/2+width/2]){
      const right=gap-size/2;
      if(right>left)wall(cx+(left+right)/2,y,z,right-left,.32);
      left=gap+size/2;
    }
  }
  function pipe(x:number,y:number,z:number,length:number,across=false,r=.46){
    const mesh=new Mesh(new CylinderGeometry(r,r,length,8),brown);
    mesh.rotation[across?'z':'x']=Math.PI/2;mesh.position.set(x,y,z);root.add(mesh);
    box(x,y-r*.72,z,across?length:.09,.06,across?.09:length,liquid);
  }
  function car(x:number,z:number,truck=false,y=base){
    box(x,y+.57,z,2.05,1.07,truck?6.3:3.9,truck?steel:brown,true);
    box(x,y+1.26,z+(truck?1.12:0),1.84,.67,truck?3.8:1.85,dark,true);
    for(const side of [-1,1]){
      for(const off of [-1.28,1.28])box(x+side*.91,y+.22,z+off,.48,.49,.67,dark);
      box(x+side*.68,y+.73,z+1.98,.36,.16,.055,amber);
    }
  }

  floor(cx,base,CITY_START,-166,8);
  for(const side of [-1,1])wall(cx+side*4.16,base,-158, .32,16.2,dark,5);
  sign('DEMON CITY','CAFFEINE EXPORT DISTRICT',cx,base+3.55,-164,5);
  boundary(base,-166,88,[0],8.2);
  for(let z=-166;z>CITY_END;z-=16){
    const end=Math.max(z-16,CITY_END);
    if(z===-246){
      floor(cx-7,base,z,end,74,dark);
      floor(cx+40,base,z,end,8,dark);
    }else floor(cx,base,z,end,88,dark);
    for(const side of [-1,1]){
      wall(cx+side*44,base,(z+end)/2,.6,z-end,dark,12);
      box(cx+side*14.5,base+.078,(z+end)/2,7,.156,z-end,concrete);
      box(cx+side*5,base+.009,z-6,.13,.018,4.4,white);
      const x=cx+side*24.8;
      box(x,base+2.65,z-4,.20,5.3,.20,steel);
      box(x,base+5.35,z-4,1.9,.14,.7,amber);
    }
    if(Math.round(z)%3===0)for(let i=-4;i<=4;i++)box(cx+i*2.55,base+.014,z-2,1.1,.016,.63,white);
  }
  for(const side of [-1,1]){
    for(let i=0;i<10;i++){
      const z=-176-i*17.2, x=cx+side*(30+(i%2)*3), height=12+(i*13%27);
      if(i===3||i===4||i===9)continue;
      wall(x,base,z,11,12.6,i%2?brown:dark,height);
      for(let row=0;row<Math.floor(height/3);row++){
        for(const off of [-3,0,3])box(x+off,base+2+row*2.7,z+6.32,1.5,.72,.038,(row+i)%3?steel:amber);
      }
    }
    pipe(cx+side*17,base+8,-240,142);
  }
  for(const z of [-190,-221,-275,-306])pipe(cx,base+7.9,z,36,true,.66);
  for(const [x,z] of [[-4,-177],[8,-197],[-5,-214],[9,-229],[-8,-250],[6,-268],[-3,-279],[12,-316],[-9,-335]] as const)
    car(cx+x,z,z===-268||z===-316);
  const fountain=new Mesh(new CylinderGeometry(5.1,5.4,1,12),steel);
  fountain.position.set(cx,base+.5,-236);root.add(fountain);
  colliders.push({min:{x:cx-3.8,y:base,z:-239.8},max:{x:cx+3.8,y:base+1,z:-232.2}});
  const pool=new Mesh(new CylinderGeometry(4.72,4.72,.12,12),liquid);pool.position.set(cx,base+1.01,-236);root.add(pool);
  box(cx,base+2.1,-236,.66,2.5,.66,liquid);
  for(const side of [-1,1]){
    const x=cx+side*29, z=-238;
    floor(x,base,z+11,z-11,16,concrete);
    for(const off of [-8,8])wall(x+off,base,z,.4,22,brown);
    box(x,base+3.68,z,16,.38,22,steel,true);
    for(const zz of [-246,-231]){
      box(x+side*4.9,base+.38,zz,3.5,.76,1.2,laminate,true);
      box(x-side*4.1,base+.66,zz,3,.18,1.2,steel,true);
    }
    sign(side===1?'HELL COFFEE':'NIGHT MARKET','OPEN / BACK ALLEY',x,base+3,-226.8,7);
    for(const off of [-1,1])box(cx+side*16+off*2.5,base+.53,-274,2.18,1.06,.64,concrete,true);
  }
  // A recessed maintenance passage links two ends of the east service lane.
  const tunnelX=cx+33, tunnelY=base-2.6;
  floor(tunnelX,tunnelY,-246,-262,5.8,concrete);
  for(const side of [-1,1])wall(tunnelX+side*3,tunnelY,-254,.2,16,dark,2.6);
  box(tunnelX,base-.10,-254,5.8,.2,2,steel,true);
  for(const direction of [-1,1])for(let step=0;step<13;step++){
    const top=base-(step+1)*.2;
    box(tunnelX,top-.2,-254+direction*(8-(step+.5)*.47),4.65,.4,.475,concrete,true);
  }
  sign('SERVICE PASSAGE','EAST / CHECKPOINT',tunnelX,base+1.7,-245.6,3.8);
  // An exterior service stair opens the west market roof as a second sightline.
  const roofX=cx-29;
  for(let step=0;step<18;step++){
    const top=base+3.6-(step+1)*.2;
    box(roofX,top-.2,-249-(step+.5)*.37,2.65,.4,.375,steel,true);
  }
  box(roofX,base+3.48,-250,2.65,.24,2.3,steel,true);

  sign('CENTRAL SQUARE','CAFFEINE EXPORT COMPANY',cx-21,base+5.1,-225,10,Math.PI/2);
  sign('CHECKPOINT','INDUSTRIAL FREIGHT',cx,base+5.2,-272,8);
  floor(cx+10,base+3.6,-294,-327,7,steel);
  for(const z of [-298,-313,-325])for(const side of [-1,1])wall(cx+10+side*3,base,z,.7,.8,concrete,3.35);
  for(const z of [-294,-327]){
    const direction=z===-294?1:-1;
    for(let i=1;i<=18;i++){
      const top=base+3.6-.2*i;
      box(cx+10,top-.19,z+direction*(i-.5)*.36,5,.38,.365,concrete,true);
    }
  }
  car(cx+10,-310,true,base+3.6);
  for(const x of [-23,23])car(cx+x,-344,true);
  boundary(base,CITY_END,88,[-24,-8,8,24],4.8);
  for(const [i,x] of [-24,-8,8,24].entries())sign(['WEST','SOUTH','NEW SOUTH','EAST'][i]!,'HELL SHINJUKU CENTRAL',cx+x,base+4,-357.7,5.6);
  sign('HELL SHINJUKU CENTRAL','HELL SUBWAY LINE 1',cx,base+8,-357.5,27);
  flush();

  for(const [i,f] of STATION.entries()){
    const {y,start,end,width}=f, z=(start+end)/2;
    floor(cx,y,start,end,width,i<2?tile:concrete);
    box(cx,y+4.91,z,width,.28,56,dark,true);
    for(const side of [-1,1])wall(cx+side*34,y,z,.42,56,i>=4?dark:plaster);
    if(i>0)boundary(y,start,width,[...stairOffsets],4.4);
    boundary(y,end,width,i===6?[0]:[...stairOffsets],i===6?6:4.4);
    for(const x of [-20,0,20])for(let depth=4;depth<54;depth+=8){
      box(cx+x,y+4.71,start-depth,3,.10,.27,i===4?violet:i>=5?red:white);
      if(x!==0)box(cx+x,y+.011,start-depth,.10,.016,3.6,i>=4?amber:blue);
    }
    sign(['G / CONCOURSE','B1 / FREE PASSAGE','B2 / RAIL PLATFORMS','B3 / INTERCHANGE','B4 / DISTORTION','B5 / RESTRICTED','B6 / DEVIL TRAIN'][i]!,
      i===6?'KEEP OFF THE TRACKS':'HELL SHINJUKU CENTRAL',cx,y+3.75,start-11,8);
    if(i<6){
      const lower=STATION[i+1]!;
      for(const [j,x] of stairOffsets.entries()){
        sign(j===0?'STAIRS':'ESCALATOR','B'+(i+1)+' / DOWN',cx+x,y+2.95,end+.24,3.5);
        for(let step=0;step<27;step++){
          const top=y-.2*(step+1), length=(end-lower.start)/27;
          const sz=end-length*(step+.5);
          box(cx+x,top-.20,sz,4.35,.40,length+.006,j===0?concrete:steel,true);
          if(j===0)box(cx+x,top+.006,sz+.15,4.2,.013,.04,white);
          else if(step%3===0){
            const mesh=new Mesh(stepMarker,amber);mesh.position.set(cx+x,top+.024,sz);
            escalators.push({mesh,start:end,y,phase:step});root.add(mesh);
          }
        }
        for(const s of [-1,1])wall(cx+x+s*2.27,lower.y,(end+lower.start)/2,.18,end-lower.start,steel,10.2);
      }
    }
    if(i===0||i===1){
      for(const x of [-27,-17,-7,7,17,27]){
        box(cx+x,y+.46,start-21,1.8,.92,1.18,steel,true);
        box(cx+x,y+.95,start-20.65,.28,.064,.24,green);
      }
      for(const s of [-1,1])for(const d of [28,43]){
        wall(cx+s*27,y,start-d,13,.35,plaster,3.2);
        box(cx+s*25,y+.55,start-d+2.4,6.2,1.1,1.4,laminate,true);
        sign(s===1?'EAST ARCADE':'WEST ARCADE','SHOPS / FREE PASSAGE',cx+s*26,y+2.65,start-d+.22,5);
      }
    }
    if(i===2||i===5||i===6){
      for(const x of (i===6?[0]:[-15,0,15])){
        box(cx+x,y+.012,z,3.8,.025,48,dark);
        for(const s of [-1,1])box(cx+x+s*.92,y+.05,z,.07,.09,48,steel);
        for(let d=6;d<52;d+=1.45)box(cx+x,y+.028,start-d,2.52,.05,.22,brown);
        for(const s of [-1,1])box(cx+x+s*2.21,y+.021,z,.22,.03,48,amber);
      }
      if(i===2){
        for(const side of [-1,1])wall(cx+side*2,y,z,.14,32,steel,.9);
        const moving=trainModel(0x6b7d65);
        moving.position.set(cx,y,start-27);railTraffic.push({mesh:moving,z:start-27});root.add(moving);
      }
      if(i!==6)for(const [j,x] of [-15,0,15].entries()){
        if(i===2&&j===1)continue;
        const carZ=start-25-(j%2)*6;
        const train=trainModel(i===2?0x677780:0x514040);
        train.position.set(cx+x,y,carZ);root.add(train);
        colliders.push({min:{x:cx+x-1.43,y,z:carZ-4.55},max:{x:cx+x+1.43,y:y+2.9,z:carZ+4.55}});
        sign(i===2?['WEST MAIN','CIRCLE LINE','EAST MAIN'][j]!:['CLOSED A','MAINTENANCE','CLOSED B'][j]!,
          i===2?'PLATFORM '+(j+1):'AUTHORIZED PERSONNEL',cx+x+3.5,y+2.95,start-17,3.8);
      }
    }
    if(i===3||i===4){
      for(const [j,depth] of [15,25,36,46].entries()){
        for(const [k,x] of (j%2===0?[-16,15]:[-23,-2,23]).entries()){
          wall(cx+x,y,start-depth,i===4?13:10,.58,i===4?dark:plaster,4.6);
          sign(i===3?['A LINE','B LINE','C LINE','D LINE','H EXPRESS','Z EXPRESS'][(j*2+k)%6]!:'TRANSFER '+['A','B','C','D'][j]!,
            i===4?'SIGNAL LOST':'INTERCHANGE',cx+x,y+2.45,start-depth+.32,3.7);
        }
      }
    }
    if(i===5){
      for(const [x,depth,label] of [[-24,18,'CONTROL ROOM'],[25,25,'MAINTENANCE'],[-24,43,'WAREHOUSE']] as const){
        wall(cx+x,y,start-depth,8,.32,dark,3.1);
        wall(cx+x+(x<0?-4:4),y,start-depth+3,.32,6,steel,3.1);
        box(cx+x,y+.55,start-depth+1,3.5,1.10,1.2,brown,true);
        sign(label,'NO PUBLIC ACCESS',cx+x,y+2.5,start-depth+.19,4.8,0,'#fd796b');
      }
    }
    for(const x of [-29,29])for(const d of [12,31,49])wall(cx+x,y,start-d,.58,.58,steel,4.7);
    for(const warp of WARPS.filter(w=>w.from.y===y)){
      const p=warp.from;
      for(const side of [-1,1])box(p.x+side*1.3,p.y+1.27,p.z,.12,2.5,.17,violet);
      box(p.x,p.y+.025,p.z,2.5,.04,.24,violet);
      sign('SHAFT '+warp.mark,'UNSTABLE TRANSFER',p.x,p.y+2.6,p.z-.12,2.25,0,'#d68fff');
    }
    flush();
  }
  const last=STATION[6]!;
  floor(cx,last.y,last.end,STAGE04_Z-2,22,brown);
  for(const s of [-1,1])wall(cx+s*11,last.y,(last.end+STAGE04_Z)/2,.45,last.end-STAGE04_Z,dark,8);
  wall(cx,last.y,STAGE04_Z-1,22,.5,dark,7);
  const lava=new MeshBasicMaterial({color:0xea4d20});
  for(const side of [-1,1]){
    box(cx+side*6.8,last.y+.016,last.end-10.5,5.3,.033,20.4,lava);
    box(cx+side*3.95,last.y+.21,last.end-10.5,.4,.42,20.4,brown,true);
  }
  sign('LAVA RIVER','STAGE 04 / DOWNSTREAM',cx,last.y+3.35,STAGE04_Z+1,6);
  for(const c of CAMPAIGN_CACHES){
    const {x,y,z}=c.position;
    box(x,y+.33,z,2,.66,.94,laminate,true);
    for(const s of [-1,1])box(x+s*.96,y+.74,z,.08,.2,.94,steel);
    if(c.safe){
      box(x,y+.009,z,5.8,.018,5.6,green);
      sign('SAFE ROOM','CAF DRAIN SUSPENDED',x,y+2.25,z-.57,2.65,0,'#a0dfca');
    }
  }
  flush();

  const gate=(z:number,w:number)=>{
    const mesh=new Mesh(new BoxGeometry(w,3.4,.30),steel);
    mesh.position.set(cx,last.y+1.7,z);root.add(mesh);return mesh;
  };
  const entry=gate(last.start-12,67), exit=gate(last.end+.38,6);
  entry.visible=false;
  return {
    setGates(active:boolean,cleared:boolean){entry.visible=active&&!cleared;exit.visible=!cleared;},
    animate(seconds:number){
      for(const {mesh,z} of railTraffic)mesh.position.z=z+Math.sin(seconds*.28)*10;
      for(const {mesh,start,y,phase} of escalators){
        const step=Math.floor((phase+seconds*1.4)%27);
        mesh.position.z=start-(step+.5)*14/27;
        mesh.position.y=y-(step+1)*.2+.024;
      }
    },
  };
}
