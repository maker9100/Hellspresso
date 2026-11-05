import { BoxGeometry, BufferGeometry, CanvasTexture, CylinderGeometry, Group, LineSegments, Material, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, SRGBColorSpace, Texture } from 'three';
import { TUNABLES } from '../config/tunables';
import type { Aabb, Vec3 } from '../core/types';

export interface ArenaAsset { root:Group; colliders:Aabb[]; spawn:Vec3; dispose:()=>void }

export function disposeGroup(root:Group):void {
  const geometries=new Set<BufferGeometry>();
  const materials=new Set<Material>();
  root.traverse(node=>{
    if(!(node instanceof Mesh || node instanceof LineSegments))return;
    geometries.add(node.geometry);
    const list=Array.isArray(node.material)?node.material:[node.material];
    for(const material of list)materials.add(material);
  });
  for(const geometry of geometries)geometry.dispose();
  for(const material of materials){if('map' in material && material.map instanceof Texture)material.map.dispose();material.dispose();}
  root.clear();
}

export function createArena():ArenaAsset {
  const c=TUNABLES.prototype;
  const root=new Group();
  const colliders:Aabb[]=[];
  const materials=Object.fromEntries(Object.entries(c.colors).map(([name,color])=>[name,new MeshStandardMaterial({color,roughness:1})])) as Record<keyof typeof c.colors,MeshStandardMaterial>;
  const emissive=new MeshStandardMaterial({color:c.colors.amber,emissive:c.colors.amber});
  const box=(center:readonly number[],size:readonly number[],material:MeshStandardMaterial):Mesh=>{
    const mesh=new Mesh(new BoxGeometry(size[0],size[1],size[2]),material);
    mesh.position.set(center[0]??0,center[1]??0,center[2]??0);
    mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh;
  };
  for(const solid of c.solids){
    box(solid.center,solid.size,materials[solid.material]);
    colliders.push({min:{x:solid.center[0]-solid.size[0]/2,y:solid.center[1]-solid.size[1]/2,z:solid.center[2]-solid.size[2]/2},max:{x:solid.center[0]+solid.size[0]/2,y:solid.center[1]+solid.size[1]/2,z:solid.center[2]+solid.size[2]/2}});
  }
  for(const x of c.pillars.xs)for(const z of c.pillars.zs){
    const pillar=new Mesh(new CylinderGeometry(c.pillars.radius,c.pillars.radius,c.pillars.height),materials.concrete);
    pillar.position.set(x,c.pillars.height/2,z);pillar.castShadow=true;root.add(pillar);
    colliders.push({min:{x:x-c.pillars.radius,y:0,z:z-c.pillars.radius},max:{x:x+c.pillars.radius,y:c.pillars.height,z:z+c.pillars.radius}});
  }
  for(const x of c.lamps.xs)for(const z of c.lamps.zs)box([x,c.lamps.height,z],[c.lamps.width,c.lamps.width,c.lamps.depth],emissive);
  for(const x of c.deskProps.xs)for(const z of c.deskProps.zs){
    const size=c.deskProps.monitor;
    const screenMaterial=new MeshStandardMaterial({color:c.deskProps.screenColor,emissive:c.deskProps.screenColor});
    box([x,c.deskProps.height+size[1]/2,z],size,screenMaterial);
  }
  const canvas=document.createElement('canvas');canvas.width=c.sign.textureWidth;canvas.height=c.sign.textureHeight;
  const ctx=canvas.getContext('2d');
  if(ctx){
    ctx.fillStyle='#21191c';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle='#ff9b38';ctx.font=`italic bold ${canvas.height/3}px Impact, sans-serif`;ctx.textAlign='center';
    ctx.fillText('HELLSPRESSO',canvas.width/2,canvas.height/2);
    ctx.fillStyle='#d2b8a1';ctx.font=`${canvas.height/12}px sans-serif`;
    ctx.fillText('CAFFEINE IS EXISTENCE.   /   SλVE POINT',canvas.width/2,canvas.height*3/4);
  }
  const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;
  const sign=new Mesh(new PlaneGeometry(c.sign.width,c.sign.height),new MeshBasicMaterial({map:texture}));
  sign.position.set(...c.sign.position);root.add(sign);
  return {root,colliders,spawn:{x:c.spawn[0],y:c.spawn[1],z:c.spawn[2]},dispose:()=>disposeGroup(root)};
}

export function createCutter():Group {
  const c=TUNABLES.prototype.cutterModel;
  const group=new Group();
  const handle=new Mesh(new BoxGeometry(...c.handle),new MeshStandardMaterial({color:TUNABLES.prototype.colors.amber,roughness:1}));
  const blade=new Mesh(new BoxGeometry(...c.blade),new MeshStandardMaterial({color:TUNABLES.prototype.colors.paper,metalness:1,roughness:TUNABLES.prototype.bladeRoughness}));
  blade.position.y=(c.handle[1]+c.blade[1])/2;
  group.add(handle,blade);group.position.set(...c.position);group.rotation.set(...c.rotation);
  return group;
}
