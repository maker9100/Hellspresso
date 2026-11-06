import { ITEMS, isStackable, slotFor } from './items';
import type { EquipmentId, Ingredient, ItemId, Recipe, WeaponId } from './items';
export { ITEMS } from './items';
export type { EquipmentId, ItemId } from './items';

export const BAG = { columns:8, rows:6 } as const;
export const EQUIPMENT = ['cutter','extractor'] as const;

export interface BagPlacement { readonly column:number; readonly row:number; readonly rotated:boolean }
interface InventoryItem { readonly id:ItemId; readonly count:number; readonly placement:BagPlacement|null }
type Contents = Map<ItemId,InventoryItem>;

export function footprint(id:ItemId,rotated:boolean):{width:number;height:number} {
  const {width,height}=ITEMS[id];
  return rotated?{width:height,height:width}:{width,height};
}

function fits(contents:Contents,id:ItemId,placement:BagPlacement):boolean {
  const {column,row,rotated}=placement;
  const {width,height}=footprint(id,rotated);
  if(!Number.isInteger(column)||!Number.isInteger(row)||column<0||row<0||column+width>BAG.columns||row+height>BAG.rows)return false;
  if(id!=='essence'&&column+width===BAG.columns&&row+height===BAG.rows)return false;
  for(const item of contents.values()){
    const other=item.placement;
    if(item.id===id||!other)continue;
    const size=footprint(item.id,other.rotated);
    if(column<other.column+size.width&&column+width>other.column&&row<other.row+size.height&&row+height>other.row)return false;
  }
  return true;
}

function firstFree(contents:Contents,id:ItemId,rotated=false):BagPlacement|undefined{
  for(const orientation of ITEMS[id].width===ITEMS[id].height?[rotated]:[rotated,!rotated]){
    for(let row=0;row<BAG.rows;row++)for(let column=0;column<BAG.columns;column++){
      const placement={column,row,rotated:orientation};
      if(fits(contents,id,placement))return placement;
    }
  }
  return undefined;
}

function add(contents:Contents,id:ItemId,count:number):boolean{
  if(!Number.isSafeInteger(count)||count<=0)return false;
  const existing=contents.get(id);
  if(existing){
    if(!isStackable(id)||!Number.isSafeInteger(existing.count+count))return false;
    contents.set(id,{...existing,count:existing.count+count});
    return true;
  }
  const placement=id==='essence'?{column:BAG.columns-1,row:BAG.rows-1,rotated:false}:firstFree(contents,id);
  if(!placement)return false;
  contents.set(id,{id,count,placement});
  return true;
}

function spend(contents:Contents,id:ItemId,count:number):boolean{
  const item=contents.get(id);
  if(!item||!Number.isSafeInteger(count)||count<=0||item.count<count)return false;
  if(item.count===count)contents.delete(id);
  else contents.set(id,{...item,count:item.count-count});
  return true;
}

export class Inventory {
  private items:Contents=new Map();
  private version=0;
  constructor(){this.reset();}
  get revision():number{return this.version;}
  get essence():number{return this.count('essence');}
  get(id:ItemId):InventoryItem|undefined{return this.items.get(id);}
  count(id:ItemId):number{return this.items.get(id)?.count??0;}
  bagItems():InventoryItem[]{return [...this.items.values()].filter(item=>item.placement!==null);}

  reset():void{
    this.items=new Map(EQUIPMENT.map(id=>[id,{id,count:1,placement:null}]));
    this.version++;
  }

  equipped(slot:EquipmentId):InventoryItem|undefined{
    return [...this.items.values()].find(item=>item.placement===null&&slotFor(item.id)===slot);
  }
  get weapon():WeaponId|undefined{return this.equipped('cutter')?.id as WeaponId|undefined;}
  isEquipped(id:ItemId):boolean{return this.items.get(id)?.placement===null;}
  canPlace(id:ItemId,placement:BagPlacement):boolean{return fits(this.items,id,placement);}

  place(id:ItemId,placement:BagPlacement):boolean{
    const item=this.items.get(id);
    if(!item||!this.canPlace(id,placement))return false;
    this.items.set(id,{...item,placement:{...placement}});
    this.version++;
    return true;
  }
  stow(id:ItemId,rotated:boolean):boolean{
    const position=firstFree(this.items,id,rotated);
    return position!==undefined&&this.place(id,position);
  }
  equip(id:ItemId):boolean{
    const item=this.items.get(id), slot=slotFor(id);
    if(!item||!slot)return false;
    if(item.placement===null)return true;
    const previous=this.equipped(slot);
    const staged=new Map(this.items);
    staged.set(id,{...item,placement:null});
    if(previous){
      const position=firstFree(staged,previous.id);
      if(!position)return false;
      staged.set(previous.id,{...previous,placement:position});
    }
    this.items=staged;
    this.version++;
    return true;
  }
  add(id:ItemId,count=1):boolean{
    if(!add(this.items,id,count))return false;
    this.version++;
    return true;
  }
  spend(id:ItemId,count=1):boolean{
    if(!spend(this.items,id,count))return false;
    this.version++;
    return true;
  }

  private stageRecipe(recipe:Recipe):Contents|undefined{
    for(const ingredients of recipe.options){
      const staged=new Map(this.items);
      const consume=({id,count}:Ingredient)=>spend(staged,id,count);
      if(ingredients.every(consume)&&add(staged,recipe.id,recipe.output))return staged;
    }
    return undefined;
  }
  canCraft(recipe:Recipe):boolean{return this.stageRecipe(recipe)!==undefined;}
  craft(recipe:Recipe):boolean{
    const staged=this.stageRecipe(recipe);
    if(!staged)return false;
    this.items=staged;
    this.version++;
    return true;
  }
}
