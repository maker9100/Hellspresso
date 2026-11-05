import { ACESFilmicToneMapping, Color, DirectionalLight, Fog, GridHelper, HemisphereLight, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three';
import { assets } from '../assets/registry';
import { disposeGroup } from '../assets/procedural';
import { TUNABLES } from '../config/tunables';
import { RULES } from '../config/rules';
import { CollisionWorld } from '../physics/CollisionWorld';
import { Movement } from '../player/Movement';
import { ResourceSystem } from '../player/Resources';
import type { Resources } from '../player/Resources';
import { HUD } from '../ui/HUD';
import { Menu } from '../ui/Menu';
import { SettingsStore } from '../ui/Settings';
import { FixedStepLoop } from './FixedStepLoop';
import { GameStateMachine } from './GameStateMachine';
import type { GameState } from './GameStateMachine';
import { Input } from './Input';
import { PointerLock } from './PointerLock';
import { NEUTRAL_INTENT } from './types';

export class Game {
  private readonly settings=new SettingsStore();
  private readonly renderer=new WebGLRenderer({antialias:true});
  private readonly scene=new Scene();
  private readonly camera=new PerspectiveCamera(TUNABLES.camera.fovDegrees,1,TUNABLES.prototype.cameraNear,TUNABLES.prototype.cameraFar);
  private readonly machine=new GameStateMachine();
  private readonly arena=assets.arena();
  private readonly cutter=assets.cutter();
  private readonly collision=new CollisionWorld(this.arena.colliders);
  private readonly sun=new DirectionalLight(TUNABLES.prototype.sunColor,TUNABLES.prototype.sunlightIntensity);
  private readonly events=new AbortController();
  private readonly hud:HUD;
  private readonly menu:Menu;
  private readonly input:Input;
  private readonly pointer:PointerLock;
  private readonly loop:FixedStepLoop;
  private resources=new ResourceSystem();
  private movement=new Movement(this.collision,this.arena.spawn);
  private elapsed=0;
  private caffeineSpent=0;
  private yaw=0;
  private pitch=0;
  private displayTime=0;
  private fps=0;

  constructor(private readonly parent:HTMLElement){
    parent.replaceChildren(this.renderer.domElement);
    this.renderer.domElement.className='game-canvas';
    this.renderer.domElement.setAttribute('aria-label','HELLSPRESSO 3D 플레이 화면');
    this.renderer.toneMapping=ACESFilmicToneMapping;
    this.scene.background=new Color(TUNABLES.presentation.palette.background);
    this.scene.fog=new Fog(TUNABLES.presentation.palette.background,TUNABLES.prototype.fogNear,TUNABLES.prototype.fogFar);
    this.scene.add(this.arena.root);
    this.scene.add(new HemisphereLight(TUNABLES.prototype.skyColor,TUNABLES.prototype.groundColor,TUNABLES.prototype.hemisphereIntensity));
    this.sun.position.set(...TUNABLES.prototype.sunPosition);this.sun.castShadow=true;
    const extent=TUNABLES.prototype.shadowExtent;
    Object.assign(this.sun.shadow.camera,{left:-extent,right:extent,top:extent,bottom:-extent,far:extent*3});
    this.scene.add(this.sun);
    const grid=new GridHelper(TUNABLES.prototype.grid.extent,TUNABLES.prototype.grid.divisions,TUNABLES.prototype.grid.color,TUNABLES.prototype.grid.color);
    grid.position.y=TUNABLES.prototype.gridOffset;this.arena.root.add(grid);
    this.camera.rotation.order='YXZ';this.camera.add(this.cutter);this.scene.add(this.camera);
    this.hud=new HUD(parent,new URLSearchParams(location.search).get('debug')==='1');
    this.pointer=new PointerLock(this.renderer.domElement,locked=>{
      if(locked && (this.machine.current==='PAUSED'||this.machine.current==='INVENTORY'))this.change('PLAYING');
      else if(!locked && this.machine.current==='PLAYING')this.change('PAUSED');
    },message=>this.hud.toast(message));
    this.input=new Input(()=>this.settings.value,()=>this.pointer.locked && this.machine.current==='PLAYING');
    this.menu=new Menu(parent,this.settings,{start:()=>this.start(),resume:()=>this.pointer.request(),menu:()=>this.change('MENU'),changed:()=>this.applySettings(),toast:message=>this.hud.toast(message)});
    this.loop=new FixedStepLoop(dt=>this.update(dt),delta=>this.render(delta));
    document.addEventListener('keydown',this.keydown,{signal:this.events.signal});
    window.addEventListener('resize',()=>this.resize(),{signal:this.events.signal});
    window.addEventListener('blur',()=>{if(TUNABLES.focus.pauseOnBlur)this.pause();},{signal:this.events.signal});
    window.addEventListener('pagehide',()=>this.pause(),{signal:this.events.signal});
    document.addEventListener('visibilitychange',()=>{if(document.hidden && TUNABLES.focus.pauseWhenHidden)this.pause();},{signal:this.events.signal});
    this.renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();this.pause();this.hud.toast('그래픽 연결이 중단되었다.');},{signal:this.events.signal});
    this.renderer.domElement.addEventListener('webglcontextrestored',()=>{this.applySettings();this.hud.toast('그래픽이 복구되었다. 계속하기를 눌러 주세요.');},{signal:this.events.signal});
    if(import.meta.env.DEV && new URLSearchParams(location.search).get('debug')==='1'){
      Object.assign(window,{__HELLSPRESSO_QA__:{snapshot:()=>this.snapshot(),applyDelta:(delta:Partial<Resources>)=>{this.resources.applyDelta(delta);this.resolveDeath();}}});
    }
    this.applySettings();this.loop.start();
    this.parent.dataset['state']='MENU';
  }

  private start():void{
    this.change('LOADING');
    this.resources=new ResourceSystem();this.movement=new Movement(this.collision,this.arena.spawn);
    this.elapsed=0;this.caffeineSpent=0;this.yaw=0;this.pitch=0;this.loop.reset();
    this.change('PAUSED');this.pointer.request();
  }

  private change(next:GameState):void{
    if(next===this.machine.current)return;
    this.loop?.setRunning(false);
    if(this.machine.current==='DEAD' && next!=='MENU')return;
    this.machine.transition(next);
    this.loop?.stepper.setRunning(this.machine.simulating);
    this.input?.clear();
    this.parent.dataset['state']=next;
    this.menu?.show(next,this.resources.cause);
    if(next!=='PLAYING')this.pointer?.release();
  }

  private pause():void{if(this.machine.simulating)this.change('PAUSED');}

  private readonly keydown=(event:KeyboardEvent):void=>{
    if(event.repeat || event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement)return;
    if(event.code==='Escape'){this.pause();return;}
    if(!this.machine.simulating)return;
    if(this.input.matches('inventory',event.code)){
      event.preventDefault();
      if(this.machine.current==='PLAYING')this.change('INVENTORY');
      else this.pointer.request();
    }else if(event.code===RULES.quickHealKey){this.hud.toast('회복 아이템이 없다.');}
    else if(this.input.matches('extractor',event.code)){this.hud.toast('추출할 재료가 없다.');}
  };

  private update(dt:number):void{
    if(this.resources.cause || this.machine.current==='MENU'||this.machine.current==='LOADING'||this.machine.current==='DEAD'||this.machine.current==='ENDING')return;
    this.movement.update(dt,this.machine.current==='PLAYING'?this.input.intent():NEUTRAL_INTENT,this.yaw,this.resources);
    const before=this.resources.current.caffeine;
    this.resources.advance(dt,false);
    this.caffeineSpent+=before-this.resources.current.caffeine;
    this.elapsed+=dt;this.resolveDeath();
  }

  private resolveDeath():void{if(this.resources.cause && this.machine.current!=='DEAD' && (this.machine.simulating||this.machine.current==='PAUSED'))this.change('DEAD');}

  private snapshot(){return {state:this.machine.current,cause:this.resources.cause,resources:this.resources.current,position:{...this.movement.position},height:this.movement.height,grounded:this.movement.grounded,jumps:this.movement.jumps,mode:this.movement.mode,yaw:this.yaw,pitch:this.pitch,elapsed:this.elapsed,caffeineSpent:this.caffeineSpent,fps:this.fps};}

  private resize():void{
    const width=this.parent.clientWidth,height=this.parent.clientHeight;
    this.camera.aspect=width/Math.max(1,height);this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,TUNABLES.presentation.maxPixelRatio)*this.settings.value.renderScale);
    this.renderer.setSize(width,height);
  }

  private applySettings():void{
    const size=TUNABLES.settings.shadowSizes[this.settings.value.shadows];
    this.renderer.shadowMap.enabled=size>0;
    this.sun.shadow.map?.dispose();this.sun.shadow.map=null;
    this.sun.shadow.mapSize.set(Math.max(1,size),Math.max(1,size));
    this.sun.shadow.needsUpdate=true;this.resize();
  }

  private render(delta:number):void{
    this.displayTime+=delta;
    this.fps=delta>0?this.fps*0.9+0.1/delta:this.fps;
    if(this.machine.current==='MENU'){
      const c=TUNABLES.prototype;
      this.camera.position.set(c.menuCamera[0]+Math.sin(this.displayTime*c.menuDriftSpeed)*c.menuDriftDistance,c.menuCamera[1],c.menuCamera[2]);
      this.camera.lookAt(new Vector3(...c.menuTarget));this.cutter.visible=false;
    }else{
      const look=this.input.look();
      if(this.machine.current==='PLAYING'){
        this.yaw=(this.yaw-look.x*this.settings.value.sensitivity)%(Math.PI*2);
        const limit=TUNABLES.camera.pitchLimitDegrees*Math.PI/180;
        this.pitch=Math.max(-limit,Math.min(limit,this.pitch-look.y*this.settings.value.sensitivity));
      }
      this.camera.rotation.set(this.pitch,this.yaw,0,'YXZ');
      const p=this.movement.position;this.camera.position.set(p.x,p.y+this.movement.eyeHeight,p.z);
      this.cutter.visible=this.machine.current!=='DEAD';
      const c=TUNABLES.prototype.cutterModel;
      this.cutter.position.y=c.position[1]+Math.sin(this.elapsed*c.bobFrequency)*c.bobAmplitude*this.settings.value.screenShake;
    }
    this.hud.update(this.snapshot(),this.settings.value);
    this.renderer.render(this.scene,this.camera);
  }

  dispose():void{
    this.events.abort();this.loop.dispose();this.input.dispose();this.pointer.dispose();this.menu.dispose();
    this.arena.dispose();disposeGroup(this.cutter);this.sun.shadow.map?.dispose();this.renderer.dispose();
    this.parent.replaceChildren();
  }
}
