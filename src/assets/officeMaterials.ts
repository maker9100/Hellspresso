import { CanvasTexture, MeshBasicMaterial, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace } from 'three';

type Surface = 'carpet' | 'plaster' | 'concrete' | 'ceiling' | 'laminate' | 'steel';

function random(seed: number): () => number {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
}

export function paintedTexture(width: number, height: number, paint: (ctx: CanvasRenderingContext2D) => void): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('사무실 텍스처를 만들 수 없다.');
  paint(ctx);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function surface(kind: Surface): CanvasTexture {
  const palettes: Record<Surface, readonly [number, number, number]> = {
    carpet: [67, 65, 62], plaster: [140, 130, 116], concrete: [98, 93, 85],
    ceiling: [97, 95, 87], laminate: [139, 112, 88], steel: [94, 90, 85],
  };
  const texture = paintedTexture(256, 256, ctx => {
    const next = random(1946);
    const base = palettes[kind];
    const data = ctx.createImageData(256, 256);
    for (let y = 0; y < 256; y++) {
      for (let x = 0; x < 256; x++) {
        const weave = kind === 'carpet' ? (y % 3 === 0 ? -11 : 7) + (x % 4 < 2 ? 4 : -4) : 0;
        const grain = kind === 'laminate' ? 4 * Math.sin(x * 0.27 + 1.6 * Math.sin(y * 0.04)) : 0;
        const mottling = 6 * Math.sin(x * Math.PI / 64) * Math.cos(y * Math.PI / 128);
        const shade = (next() - 0.5) * (kind === 'carpet' ? 38 : 25) + weave + grain + mottling;
        const offset = (y * 256 + x) * 4;
        for (let i = 0; i < 3; i++) data.data[offset + i] = (base[i] ?? 0) + shade;
        data.data[offset + 3] = 255;
      }
    }
    ctx.putImageData(data, 0, 0);
    if (kind === 'ceiling' || kind === 'carpet') {
      ctx.strokeStyle = kind === 'ceiling' ? '#373733' : '#37322a55';
      ctx.lineWidth = kind === 'ceiling' ? 2 : 1;
      ctx.strokeRect(0, 0, 256, 256);
    }
    if (kind === 'plaster' || kind === 'concrete' || kind === 'steel') {
      for (let i = 0; i < 58; i++) {
        const x = next() * 256, y = next() * 256;
        ctx.fillStyle = i % 2 ? '#28231d14' : '#e6d0ad19';
        ctx.fillRect(x, y, 1 + next() * 18, 0.6 + next() * 1.2);
      }
    }
  });
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

export function officeMaterials() {
  const tiled = (kind: Surface, tint = 0xffffff, metalness = 0) =>
    new MeshStandardMaterial({ map: surface(kind), color:tint, roughness:0.94, metalness, vertexColors:true });
  const flat = (color: number, metalness = 0) =>
    new MeshStandardMaterial({ color, roughness:0.84, metalness, vertexColors:true });
  const light = (color:number) => new MeshBasicMaterial({ color, toneMapped:false });

  const ceiling=tiled('ceiling');
  ceiling.emissiveMap=ceiling.map;
  ceiling.emissive.setHex(0x6c695e);
  ceiling.emissiveIntensity=0.92;

  return {
    carpet:tiled('carpet'), plaster:tiled('plaster',0xe1dbd2), concrete:tiled('concrete'),
    ceiling, laminate:tiled('laminate'), steel:tiled('steel',0xa29a97,0.22),
    pipe:tiled('steel',0xaf665a,0.25), trim:flat(0x313234,0.16), rubber:flat(0x24292b),
    cloth:flat(0x353840), clothFaded:flat(0x494b43), paper:flat(0xbcb9a8), folder:flat(0x735c40),
    greenPaint:flat(0x284b42), hazard:flat(0xc8943b), shutter:flat(0x485150,0.22),
    keyboard:flat(0x626260), lamp:light(0xf6edd5), lampDim:light(0xa19e90),
    guide:light(0xd18a3b), alarm:light(0xc32924), monitor:light(0x304c44),
    monitorDead:flat(0x232c2b), caffeine:light(0x891917),
  };
}

export function routeMaterials(){
  const mapped=(kind:Surface,color:number,roughness:number,metalness=0)=>
    new MeshStandardMaterial({map:surface(kind),color,roughness,metalness});
  return {
    concrete:mapped('concrete',0xd4c5bd,.91),
    plaster:mapped('plaster',0xbba5a0,.94),
    carpet:mapped('carpet',0xe5d3bd,1),
    laminate:mapped('laminate',0xf2d9ba,.74),
  };
}

export function contactShadow() {
  const map = paintedTexture(64, 64, ctx => {
    const fade = ctx.createRadialGradient(32,32,5,32,32,31);
    fade.addColorStop(0,'rgba(9, 8, 8, 0.78)');
    fade.addColorStop(0.55,'rgba(9, 8, 8, 0.54)');
    fade.addColorStop(1,'rgba(9, 8, 8, 0)');
    ctx.fillStyle=fade;
    ctx.fillRect(0,0,64,64);
  });
  return new MeshBasicMaterial({ map, transparent:true, depthWrite:false, polygonOffset:true, polygonOffsetFactor:-2 });
}

export function signTexture(top: string, bottom: string, accent: string, background = '#22221f'): CanvasTexture {
  return paintedTexture(512, 144, ctx => {
    ctx.fillStyle = background;
    ctx.fillRect(0,0,512,144);
    ctx.fillStyle = accent;
    ctx.fillRect(0,0,11,144);
    ctx.font = 'bold 61px Arial, sans-serif';
    ctx.fillText(top,30,71,455);
    ctx.fillStyle = '#e2d4bd';
    ctx.font = 'bold 26px Arial, sans-serif';
    ctx.fillText(bottom,32,112,448);
    ctx.strokeStyle = '#c7af8855';
    ctx.strokeRect(11.5,0.5,500,143);
  });
}

export function cityWindowTexture(): CanvasTexture {
  return paintedTexture(384, 256, ctx => {
    const next = random(832);
    const sky = ctx.createLinearGradient(0,0,0,256);
    sky.addColorStop(0,'#23202b');
    sky.addColorStop(0.67,'#653833');
    sky.addColorStop(1,'#271e24');
    ctx.fillStyle = sky;
    ctx.fillRect(0,0,384,256);
    for (let i=0; i<21; i++) {
      const x=i*19+(next()-0.5)*9, w=9+next()*20, y=88+next()*122;
      ctx.fillStyle = i%2 ? '#211e27' : '#30222b';
      ctx.fillRect(x,y,w,256-y);
      for (let row=y+9;row<248;row+=9) {
        for (let column=x+4;column<x+w-2;column+=6) {
          if(next()<0.35) {
            ctx.fillStyle = next()<0.28 ? '#9d4b38' : '#695344';
            ctx.fillRect(column,row,2,2);
          }
        }
      }
    }
    ctx.fillStyle = '#a2756135';
    for(let i=0;i<34;i++) {
      const x=next()*384, y=next()*256;
      ctx.fillRect(x,y,0.8,9+next()*34);
    }
  });
}
