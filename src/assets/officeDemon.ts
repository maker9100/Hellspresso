import { CylinderGeometry, Group, IcosahedronGeometry, Mesh, MeshBasicMaterial, MeshStandardMaterial, Quaternion, Vector3 } from 'three';
import type { Material } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function createOfficeDemon(): Group {
  const root=new Group();
  const suit=new MeshStandardMaterial({color:0x302f34,roughness:0.94});
  const lapel=new MeshStandardMaterial({color:0x413f47,roughness:0.86});
  const flesh=new MeshStandardMaterial({color:0x884339,roughness:0.90});
  const horn=new MeshStandardMaterial({color:0x352723,roughness:0.85});
  const shirt=new MeshStandardMaterial({color:0x9b917e,roughness:1});
  const tie=new MeshStandardMaterial({color:0x742426,roughness:0.92});
  const eyes=new MeshBasicMaterial({color:0xffac69,toneMapped:false});

  function block(x:number,y:number,z:number,w:number,h:number,d:number,rounding:number,surface:Material):Mesh{
    const mesh=new Mesh(new RoundedBoxGeometry(w,h,d,1,rounding),surface);
    mesh.position.set(x,y,z);
    root.add(mesh);
    return mesh;
  }
  function tapered(from:Vector3,to:Vector3,base:number,tip:number,surface:Material):void{
    const axis=to.clone().sub(from);
    const mesh=new Mesh(new CylinderGeometry(tip,base,axis.length(),7),surface);
    mesh.quaternion.copy(new Quaternion().setFromUnitVectors(new Vector3(0,1,0),axis.normalize()));
    mesh.position.copy(from).lerp(to,0.5);
    root.add(mesh);
  }

  block(0,1.18,0,0.52,0.59,0.30,0.079,suit);
  block(0,1.255,0.153,0.22,0.43,0.038,0.012,shirt);
  block(0,1.225,0.177,0.066,0.29,0.025,0.008,tie);
  block(0,0.82,0,0.44,0.23,0.29,0.05,suit);
  block(0,1.455,0.034,0.14,0.14,0.15,0.04,flesh);
  const skull=new Mesh(new IcosahedronGeometry(1,2),flesh);
  skull.scale.set(0.171,0.195,0.151);
  skull.position.set(0,1.627,0.026);
  root.add(skull);
  block(0,1.49,0.082,0.20,0.105,0.19,0.038,flesh);
  block(0,1.588,0.158,0.058,0.094,0.06,0.024,flesh);

  for(const side of [-1,1]){
    block(side*0.13,0.43,0,0.174,0.68,0.207,0.036,suit);
    block(side*0.13,0.085,0.056,0.177,0.15,0.32,0.048,horn);
    const arm=block(side*0.31,1.09,0.045,0.16,0.50,0.185,0.05,suit);
    arm.rotation.set(-0.18,0,side*0.13);
    block(side*0.355,0.83,0.109,0.128,0.17,0.158,0.04,flesh);
    block(side*0.137,1.308,0.165,0.08,0.33,0.026,0.008,lapel).rotation.z=side*0.30;
    block(side*0.081,1.656,0.156,0.09,0.055,0.037,0.01,horn).rotation.z=side*0.12;
    block(side*0.081,1.653,0.179,0.054,0.014,0.014,0.004,eyes);
    const base=new Vector3(side*0.123,1.744,0.016);
    const mid=new Vector3(side*0.183,1.886,-0.029);
    const tip=new Vector3(side*0.166,2.015,-0.105);
    tapered(base,mid,0.058,0.036,horn);
    tapered(mid,tip,0.037,0.004,horn);
  }
  return root;
}
