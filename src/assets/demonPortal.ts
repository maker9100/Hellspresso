import { AdditiveBlending, CircleGeometry, Group, Mesh, MeshBasicMaterial, TorusGeometry } from 'three';

export function createDemonPortal():Group{
  const portal=new Group();
  const core=new Mesh(new CircleGeometry(.84,24),new MeshBasicMaterial({
    color:0x431533,transparent:true,opacity:.82,depthWrite:false,
  }));
  core.scale.y=1.24;
  portal.add(core);
  for(const [radius,thickness,color,opacity] of [[.84,.028,0xff7169,1],[.94,.062,0x9b2957,.55],[1.04,.018,0xffa047,.7]] as const){
    const ring=new Mesh(new TorusGeometry(radius!,thickness!,6,32),new MeshBasicMaterial({
      color,transparent:true,opacity,blending:AdditiveBlending,depthWrite:false,
    }));
    ring.scale.y=1.24;
    portal.add(ring);
  }
  portal.visible=false;
  return portal;
}
