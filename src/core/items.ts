import { RULES } from '../config/rules';

type Attack = 'melee' | 'bullet' | 'scatter' | 'throw' | 'blast' | 'trap' | 'hex';
interface WeaponSpec {
  name: string; width: number; height: number; attack: Attack; damage: number;
  range: number; interval: number; description: string; magazine?: number; reserve?: number;
  pellets?: number; splash?: number; reload?: number;
}
export const WEAPONS = {
  cutter:{name:'커터칼',width:2,height:1,attack:'melee',damage:35,range:2,interval:.35,description:'시작 무기. 근접 공격.'},
  stapler:{name:'스테이플러 권총',width:2,height:2,attack:'bullet',damage:18,range:60,interval:.22,magazine:12,reserve:72,reload:1.15,description:'빠르게 철심을 쏘는 권총.'},
  sniper:{name:'좌철기 저격총',width:4,height:2,attack:'bullet',damage:100,range:120,interval:1.1,magazine:5,reserve:20,reload:1.9,description:'먼 거리에서 한 발을 정확히 꽂는다.'},
  sharpener:{name:'역방향 연필깎기',width:3,height:2,attack:'scatter',damage:6,pellets:3,range:35,interval:.12,magazine:40,reserve:160,reload:1.4,description:'깎여 나온 조각을 여러 발 발사한다.'},
  powerBank:{name:'폭발성 보조배터리 (HellKEA)',width:2,height:1,attack:'blast',damage:100,range:18,splash:4,interval:1,description:'던지면 잠시 뒤 폭발한다. 소모품.'},
  triangle:{name:'투척용 삼각자',width:2,height:2,attack:'throw',damage:50,range:26,interval:.62,description:'날카로운 모서리를 적에게 던진다. 소모품.'},
  butterfly:{name:'가위 발리송',width:2,height:1,attack:'melee',damage:27,range:1.7,interval:.22,description:'짧은 거리에서 빠르게 벤다.'},
  worshipBook:{name:'악마숭배용 악서',width:2,height:2,attack:'hex',damage:32,range:16,splash:2.5,interval:.85,description:'전방의 악마에게 저주를 건다.'},
  shuriken:{name:'커터칼심 수리검',width:1,height:1,attack:'throw',damage:32,range:28,interval:.45,description:'커터칼심으로 만든 투척 무기. 소모품.'},
  doubleBarrel:{name:'더블베럴 기관 샤프',width:3,height:2,attack:'scatter',damage:8,pellets:2,range:55,interval:.09,magazine:60,reserve:180,reload:1.8,description:'한 번에 샤프심 두 발을 쏜다.'},
  stamp:{name:'도장과 인주',width:2,height:1,attack:'melee',damage:65,range:1.65,interval:.63,description:'붉은 인장으로 강한 근접 타격을 가한다.'},
  garrote:{name:'암살용 케이블타이',width:2,height:1,attack:'melee',damage:100,range:1.2,interval:1.2,description:'바짝 다가가 케이블타이 하나를 사용한다.'},
  tackMine:{name:'폭발형 압정 지뢰',width:2,height:2,attack:'trap',damage:140,range:2,splash:4,interval:1,description:'발밑에 설치하고 적이 접근하면 폭발한다. 소모품.'},
  slayerBook:{name:'악마척살용 악서',width:2,height:2,attack:'hex',damage:90,range:26,splash:3,interval:1.05,description:'넓은 범위에 강력한 악마 척살 주문을 건다.'},
  crossbow:{name:'샤프심통 석궁',width:3,height:2,attack:'throw',damage:75,range:55,interval:.62,magazine:1,reserve:18,reload:.85,description:'샤프심통으로 만든 석궁. 발사 뒤 재장전.'},
} as const satisfies Record<string,WeaponSpec>;
export type WeaponId = keyof typeof WEAPONS;
export function isWeapon(id: string): id is WeaponId { return Object.hasOwn(WEAPONS,id); }
export function weaponSpec(id: WeaponId): WeaponSpec { return WEAPONS[id]; }

const single = (name:string, description='제작 재료.') => ({name,width:1,height:1,description});
export const ITEMS = {
  ...WEAPONS,
  extractor:{name:'정수 추출기',width:3,height:2,description:'정수와 심장을 카페인으로 바꾼다.'},
  essence:single('악마의 정수','25개를 추출하면 CAF +5. 제작 재료로도 쓴다.'),
  heart:single('악마의 심장','1개를 추출하면 CAF +20. 제작 재료로도 쓴다.'),
  cutterBlade:single('커터칼심'), mechanicalPencil:single('샤프'), leadTube:single('샤프심통'),
  stampBody:single('도장'), inkpad:single('인주'), cableTie:single('케이블타이'),
  tape:single('테이프'), tackBox:single('압정통'), tack:single('압정'), awl:single('송곳'),
  coffeeCandy:single('지옥산 커피사탕','맛대가리 ㅈ나게 없는게 특징이다…'),
  espresso:single('지옥산 에스프레소','이탈리아인들이 이 아이템을 혐오합니다…'),
  latte:single('지옥산 라떼','우유가 탄산염 용암이란건 안 비밀이다…'),
  coffeeVodka:single('지옥산 커피 보드카','이 새끼들은 하다하다 술만들때 커피를 넣는 역대급 괴식을 만들어내고야 말았다…'),
} as const;
export type ItemId = keyof typeof ITEMS;
export type HealingId = keyof typeof RULES.healing;
export type ExtractId = 'essence'|'heart';
export type EquipmentId = 'cutter'|'extractor';
export function isHealing(id: ItemId): id is HealingId { return Object.hasOwn(RULES.healing,id); }
export function slotFor(id:ItemId): EquipmentId|undefined {
  return isWeapon(id)?'cutter':id==='extractor'?'extractor':undefined;
}
export function isConsumableWeapon(id:ItemId): boolean {
  return id==='powerBank'||id==='triangle'||id==='shuriken'||id==='garrote'||id==='tackMine';
}
export function isStackable(id:ItemId): boolean { return !slotFor(id)||isConsumableWeapon(id); }
export interface Ingredient { id:ItemId; count:number }
export interface Recipe { id:WeaponId; options:readonly (readonly Ingredient[])[]; output:number; provisional?:boolean }
export const RECIPES: readonly Recipe[] = [
  {id:'shuriken',output:3,provisional:true,options:[[{id:'cutterBlade',count:3},{id:'essence',count:25}]]},
  {id:'doubleBarrel',output:1,options:[[{id:'mechanicalPencil',count:2},{id:'leadTube',count:1},{id:'heart',count:3}]]},
  {id:'stamp',output:1,options:[[{id:'stampBody',count:1},{id:'inkpad',count:1},{id:'essence',count:10}]]},
  {id:'garrote',output:1,options:[[{id:'cableTie',count:5},{id:'tape',count:1},{id:'essence',count:5}]]},
  {id:'tackMine',output:1,options:[
    [{id:'powerBank',count:1},{id:'tackBox',count:1},{id:'essence',count:3}],
    [{id:'powerBank',count:1},{id:'tack',count:10},{id:'essence',count:3}],
  ]},
  {id:'slayerBook',output:1,provisional:true,options:[[{id:'worshipBook',count:1},{id:'heart',count:2},{id:'essence',count:7}]]},
  {id:'crossbow',output:1,options:[[{id:'leadTube',count:2},{id:'awl',count:2},{id:'essence',count:3}]]},
];
