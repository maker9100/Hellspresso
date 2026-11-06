import { BoxGeometry, Group, Mesh, MeshStandardMaterial, TorusGeometry } from 'three';
import { WEAPONS } from '../core/items';
import type { WeaponId } from '../core/items';

export function createWeaponViews():Map<WeaponId,Group>{
  const models=new Map<WeaponId,Group>();
  const steel=new MeshStandardMaterial({color:0x939698,metalness:.38,roughness:.45});
  const frame=new MeshStandardMaterial({color:0x2b2628,roughness:.62});
  const orange=new MeshStandardMaterial({color:0xc77727,roughness:.68});
  const red=new MeshStandardMaterial({color:0x722d34,roughness:.8});
  const paper=new MeshStandardMaterial({color:0xb6a281,roughness:.86});
  for(const id of Object.keys(WEAPONS) as WeaponId[]){
    if(id==='cutter')continue;
    const model=new Group();
    const part=(x:number,y:number,z:number,w:number,h:number,d:number,material=frame)=>{
      const mesh=new Mesh(new BoxGeometry(w,h,d),material);
      mesh.position.set(x,y,z);model.add(mesh);return mesh;
    };
    if(id==='stapler'||id==='sniper'||id==='sharpener'||id==='doubleBarrel'||id==='crossbow'){
      const long=id==='sniper'||id==='crossbow';
      part(0,0,0,.085,.081,long?.37:.20,id==='sharpener'?orange:frame);
      part(0,-.071,.05,.062,.11,.06,red).rotation.x=.24;
      if(id==='doubleBarrel'){
        for(const x of [-.026,.026])part(x,.042,-.095,.038,.04,.28,steel);
      }else if(id==='crossbow'){
        part(0,.025,-.19,.29,.023,.035,orange);
        for(const x of [-.081,.081])part(x,.021,-.13,.18,.01,.013,steel).rotation.y=x*5;
      }else{
        part(0,.052,-.06,.075,.035,long?.33:.20,steel);
        if(id==='sniper')part(0,.101,-.03,.048,.048,.115);
        if(id==='sharpener')part(0,.034,-.13,.09,.085,.09,steel);
      }
    }else if(id==='worshipBook'||id==='slayerBook'){
      part(0,0,0,.18,.044,.26,paper);
      for(const y of [-.028,.028])part(0,y,0,.197,.012,.276,id==='slayerBook'?frame:red);
      part(0,.036,-.015,.11,.004,.02,orange);
      part(0,.036,-.015,.02,.004,.11,orange);
    }else if(id==='triangle'||id==='shuriken'){
      for(let i=0;i<3;i++){
        const angle=i*Math.PI*2/3;
        part(Math.sin(angle)*.064,0,Math.cos(angle)*.064,.16,.013,id==='triangle'?.02:.04,id==='triangle'?orange:steel).rotation.y=angle;
      }
    }else if(id==='garrote'){
      const loop=new Mesh(new TorusGeometry(.081,.008,6,18),steel);
      loop.rotation.x=Math.PI/2;model.add(loop);part(0,0,.079,.085,.021,.034,frame);
    }else if(id==='butterfly'){
      for(const side of [-1,1]){
        part(side*.022,.006,.03,.032,.027,.14,orange).rotation.y=side*.27;
        part(side*.026,.007,-.088,.033,.014,.13,steel).rotation.y=-side*.29;
      }
    }else if(id==='stamp'){
      part(0,-.014,0,.145,.05,.13,red);part(0,.042,.012,.052,.079,.075,orange);
    }else{
      part(0,0,0,.13,.05,.20,id==='powerBank'?orange:frame);
      part(0,.026,-.05,.088,.006,.03,red);
      if(id==='tackMine')for(const x of [-.044,0,.044])part(x,.041,.03,.011,.042,.012,steel);
    }
    model.position.set(.27,-.24,-.54);
    model.rotation.set(.15,-.16,-.24);
    model.visible=false;
    models.set(id,model);
  }
  return models;
}
