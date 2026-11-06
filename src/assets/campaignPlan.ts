import type { Vec3 } from '../core/types';
import type { ItemId } from '../core/items';

export interface CampaignZone {
  name:string; start:number; end:number; y:number; guards:number; advice:string;
  center:number; width:number; ranged:boolean;
}
export const CITY_START=-149.9;
export const CITY_CENTER=10.5;
export const CITY_END=-358;
const city=(name:string,start:number,end:number,guards:number,advice:string,ranged=false):CampaignZone=>
  ({name,start,end,y:-14.4,guards,advice,center:CITY_CENTER,width:88,ranged});
export const CITY=[
  city('사무실 앞 광장',CITY_START,-181,4,'카페인 대로'),
  city('카페인 대로',-181,-219,5,'중앙 광장'),
  city('중앙 광장 · 지옥 상점가',-219,-261,6,'분수 뒤 검문소 또는 양쪽 골목'),
  city('폐차 검문소 · 뒷골목',-261,-294,6,'산업 고가도로',true),
  city('산업 고가도로',-294,-327,6,'지상도로와 고가 통로',true),
  city('지옥철 중앙역 앞 광장',-327,CITY_END,4,'역사 출입구'),
];
export const STATION_NAMES=['G · 지상 역사','B1 · 지하상가','B2 · 일반 철도 승강장','B3 · 복합 환승층','B4 · 차원 왜곡 구역','B5 · 폐쇄 철도 시설','B6 · 데빌 트레인'];
export const STATION:CampaignZone[]=STATION_NAMES.map((name,i)=>{
  const start=CITY_END-70*i;
  return {name,start,end:start-56,y:-14.4-5.4*i,guards:i===6?0:i<3?4:6,
    advice:i===6?'데빌 트레인 격파':'다음 층 하강로',center:CITY_CENTER,width:68,ranged:i>=3};
});
export const FIRST_STATION=5+CITY.length;
export const BOSS_FLOOR=FIRST_STATION+6;
export const BOSS_HP=520;
export const STAGE04_Z=STATION[6]!.end-21;
export const FINALE:CampaignZone={name:'용암 강 하류',start:STATION[6]!.end,end:STAGE04_Z, y:STATION[6]!.y,guards:0,advice:'용암 강 하류 입구',center:CITY_CENTER,width:22,ranged:false};
export const stairOffsets=[-20,20] as const;
export interface Warp { from:Vec3; to:Vec3; mark:string }
const warpPoint=(floor:number,x:number,depth:number):Vec3=>({x:CITY_CENTER+x,y:STATION[floor]!.y,z:STATION[floor]!.start-depth});
const xA=warpPoint(2,-26,39), xB=warpPoint(4,-26,12), yA=warpPoint(1,25,39), yB=warpPoint(3,25,15);
export const WARPS:readonly Warp[]=[
  {from:xA,to:xB,mark:'X'},{from:xB,to:xA,mark:'X'},
  {from:yA,to:yB,mark:'Y'},{from:yB,to:yA,mark:'Y'},
  {from:warpPoint(4,26,31),to:warpPoint(3,-25,33),mark:'A'},
  {from:warpPoint(4,24,42),to:warpPoint(4,-25,43),mark:'D'},
];
export interface CampaignCache {
  position:Vec3; safe:boolean; supplies:readonly (readonly [ItemId,number])[];
}
const cache=(position:Vec3,safe:boolean,...supplies:CampaignCache['supplies']):CampaignCache=>({position,safe,supplies});
const street=(x:number,z:number):Vec3=>({x:CITY_CENTER+x,y:-14.4,z});
export const CAMPAIGN_CACHES:readonly CampaignCache[]=[
  cache(street(3,-170),true,['espresso',2],['heart',4]),
  cache(street(-18,-201),false,['heart',3],['essence',35]),
  cache(street(27,-239),true,['latte',2],['heart',4],['mechanicalPencil',2]),
  cache(street(-24,-252),false,['tape',1],['cableTie',5],['coffeeCandy',3]),
  cache(street(-23,-276),true,['heart',4],['leadTube',2],['essence',25]),
  cache(street(20,-312),true,['espresso',2],['heart',4]),
  cache(street(15,-342),true,['heart',4],['coffeeVodka',1]),
  ...STATION.slice(0,6).map(f=>cache({x:CITY_CENTER+4,y:f.y,z:f.start-6},true,['heart',4],['latte',1],['essence',25])),
  cache(warpPoint(1,-25,25),false,['coffeeCandy',3],['leadTube',2]),
  cache(warpPoint(3,-26,30),false,['tape',1],['awl',2],['heart',3]),
  cache(warpPoint(4,24,21),false,['coffeeVodka',1],['heart',3]),
  cache(warpPoint(5,23,36),false,['sniper',1],['powerBank',3],['heart',3]),
  cache(warpPoint(6,3,5),true,['coffeeVodka',2],['heart',5],['sniper',1]),
];
export function campaignSafe(p:Vec3):CampaignCache|undefined{
  return CAMPAIGN_CACHES.find(c=>c.safe&&Math.abs(p.y-c.position.y)<1&&Math.hypot(p.x-c.position.x,p.z-c.position.z)<3.4);
}

export function stationEscalator(p:Vec3):boolean{
  if(Math.abs(p.x-(CITY_CENTER+stairOffsets[1]))>1.86)return false;
  return STATION.slice(0,6).some((upper,i)=>{
    const lower=STATION[i+1]!;
    return p.z<upper.end-.18&&p.z>lower.start+.15&&Math.abs(p.y-(upper.y-(upper.end-p.z)*5.4/14))<.5;
  });
}
