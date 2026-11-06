import { BoxGeometry, Group, Mesh, MeshBasicMaterial } from 'three';
import { BOSS_FLOOR, CITY_CENTER, FIRST_STATION, STATION, WARPS, stairOffsets } from '../assets/campaignPlan';
import { floorAt } from '../assets/officeRoute';
import { CollisionWorld } from '../physics/CollisionWorld';
import type { Vec3 } from './types';

interface Cell extends Vec3 { open:boolean; links:number[] }
const STEP=2;

export class StationGuide {
  readonly root=new Group();
  private readonly geometry=new BoxGeometry(1,.025,.14);
  private readonly material=new MeshBasicMaterial({color:0x41aaff});
  private readonly tiles:Mesh[]=[];
  private readonly grids=new Map<number,Cell[]>();
  private age=0;
  private sincePath=0;
  private best=Infinity;
  private floor=-1;
  private path:Vec3[]=[];
  private hintText='';
  constructor(private readonly world:CollisionWorld){}
  reset():void{
    this.age=0;this.sincePath=0;this.best=Infinity;this.floor=-1;this.path=[];this.hintText='';this.root.visible=false;
  }
  get hint():string{return this.age>=60?this.hintText:'';}
  private grid(index:number):Cell[]{
    const saved=this.grids.get(index);
    if(saved)return saved;
    const floor=STATION[index-FIRST_STATION]!, cells:Cell[]=[];
    const local=new CollisionWorld(this.world.boxes.filter(b=>b.max.y>floor.y&&b.min.y<floor.y+1.78&&b.max.z>floor.end&&b.min.z<floor.start));
    for(let j=0;j<27;j++)for(let i=0;i<33;i++){
      const p={x:CITY_CENTER-32+i*STEP,y:floor.y,z:floor.start-2-j*STEP};
      cells.push({...p,open:local.canOccupy(p,1.78),links:[]});
    }
    for(const [id,a] of cells.entries()){
      if(!a.open)continue;
      for(const next of [id-33,id+33,id%33>0?id-1:-1,id%33<32?id+1:-1]){
        const b=cells[next];
        if(b?.open&&local.canOccupy({x:(a.x+b.x)/2,y:a.y,z:(a.z+b.z)/2},1.78))a.links.push(next);
      }
    }
    this.grids.set(index,cells);
    return cells;
  }
  private find(p:Vec3,index:number):{path:Vec3[];hint:string}{
    const f=STATION[index-FIRST_STATION]!, cells=this.grid(index);
    const targets=stairOffsets.map((x,i)=>({p:{x:CITY_CENTER+x,y:f.y,z:f.end+2},hint:i===0?'비상계단으로 이동':'에스컬레이터 통로로 이동',cost:0}));
    for(const warp of WARPS){
      const destination=floorAt(warp.to);
      if(floorAt(warp.from)===index&&destination>index)
        targets.push({p:warp.from,hint:`뒤틀림 ${warp.mark} 통로로 이동`,cost:4});
    }
    const nearest=(a:Vec3)=>cells.reduce((best,c,i)=>{
      if(!c.open)return best;
      const d=(q:Vec3)=>(q.x-a.x)**2+(q.z-a.z)**2;
      return best<0||d(c)<d(cells[best]!)?i:best;
    },-1);
    const source=nearest(p);
    if(source<0)return {path:[],hint:''};
    const parent=new Int16Array(cells.length).fill(-1);
    const distance=new Int16Array(cells.length).fill(-1);
    const queue=[source];distance[source]=0;
    for(let i=0;i<queue.length;i++){
      const id=queue[i]!;
      for(const next of cells[id]!.links){
        if(distance[next]!==-1)continue;
        distance[next]=distance[id]!+1;parent[next]=id;queue.push(next);
      }
    }
    let end=-1, best=Infinity, hint='', target:Vec3|undefined;
    for(const t of targets){
      const id=nearest(t.p), d=distance[id];
      if(d===undefined||d<0||d+t.cost>=best)continue;
      best=d+t.cost;end=id;hint=t.hint;target=t.p;
    }
    if(end<0||!target)return {path:[],hint:''};
    const path=[target];
    for(let at=end;at>=0;at=parent[at]!)path.push(cells[at]!);
    return {path:path.reverse(),hint};
  }
  update(dt:number,p:Vec3,index:number,enabled:boolean):void{
    if(!enabled||index<FIRST_STATION||index>=BOSS_FLOOR){
      if(this.floor!==-1)this.reset();
      return;
    }
    if(this.floor!==index){this.reset();this.floor=index;}
    this.age+=dt;this.sincePath-=dt;
    if(this.sincePath>0)return;
    this.sincePath=.8;
    const {path,hint}=this.find(p,index);
    this.path=path;this.hintText=hint;
    if(!path.length){this.root.visible=false;return;}
    const remaining=path.length*STEP+Math.hypot(path[0]!.x-p.x,path[0]!.z-p.z);
    if(remaining<this.best-3){this.best=remaining;this.age=0;}
    this.root.visible=this.age>=120;
    if(!this.root.visible)return;
    let count=0;
    for(let i=1;i<this.path.length;i++){
      const a=this.path[i-1]!,b=this.path[i]!;
      const distance=Math.hypot(b.x-a.x,b.z-a.z);
      if(distance<.08)continue;
      const segment=this.tiles[count]??new Mesh(this.geometry,this.material);
      if(!this.tiles[count]){this.tiles[count]=segment;this.root.add(segment);}
      segment.position.set((a.x+b.x)/2,a.y+.045,(a.z+b.z)/2);
      segment.rotation.y=-Math.atan2(b.z-a.z,b.x-a.x);
      segment.scale.x=distance;
      segment.visible=true;count++;
    }
    for(let i=count;i<this.tiles.length;i++)this.tiles[i]!.visible=false;
  }
  dispose():void{this.root.removeFromParent();this.geometry.dispose();this.material.dispose();}
}
