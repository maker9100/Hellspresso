import { ACESFilmicToneMapping, Color, DirectionalLight, Fog, HemisphereLight, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three';
import { assets } from '../assets/registry';
import { FLOORS, MAP_LOOT, floorAt, inSafeZone } from '../assets/officeRoute';
import { officePlan } from '../assets/office';
import { createWeaponViews } from '../assets/weaponView';
import { createOfficeDemon } from '../assets/officeDemon';
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
import { ArenaCombat } from './ArenaCombat';
import type { CombatActions } from './ArenaCombat';
import { Loot } from './Loot';
import { Input } from './Input';
import { Inventory } from './Inventory';
import { TouchControls } from '../ui/TouchControls';
import { PointerLock } from './PointerLock';
import { NEUTRAL_INTENT } from './types';

const OPENING_DURATION=4.65;

export class Game {
  private readonly settings=new SettingsStore();
  private readonly renderer=new WebGLRenderer({antialias:true});
  private readonly scene=new Scene();
  private readonly camera=new PerspectiveCamera(TUNABLES.camera.fovDegrees,1,TUNABLES.prototype.cameraNear,TUNABLES.prototype.cameraFar);
  private readonly machine=new GameStateMachine();
  private readonly arena=assets.arena();
  private readonly cutter=assets.cutter();
  private readonly weaponViews=createWeaponViews();
  private readonly collision=new CollisionWorld(this.arena.colliders);
  private readonly sun=new DirectionalLight(0xffe0be,1.85);
  private readonly events=new AbortController();
  private readonly hud:HUD;
  private readonly menu:Menu;
  private readonly input:Input;
  private readonly pointer:PointerLock;
  private readonly loop:FixedStepLoop;
  private readonly touch:TouchControls;
  private readonly combat:ArenaCombat;
  private readonly inventory=new Inventory();
  private readonly loot=new Loot(this.scene,MAP_LOOT);
  private readonly holySeen=new Set<number>();
  private actions:CombatActions={};
  private pick=false;
  private map=false;
  private readonly touchMode=matchMedia('(pointer: coarse)').matches;
  private resources=new ResourceSystem();
  private movement=new Movement(this.collision,this.arena.spawn);
  private elapsed=0;
  private caffeineSpent=0;
  private yaw=0;
  private pitch=0;
  private displayTime=0;
  private fps=0;
  private openingTime=0;
  private readonly openingTarget=new Vector3();
  private readonly menuTarget=new Vector3(-2.3,1.48,-2);

  constructor(private readonly parent:HTMLElement){
    parent.replaceChildren(this.renderer.domElement);
    this.renderer.domElement.className='game-canvas';
    this.renderer.domElement.setAttribute('aria-label','HELLSPRESSO 3D 플레이 화면');
    this.renderer.toneMapping=ACESFilmicToneMapping;
    this.scene.background=new Color(0x1a1215);
    this.scene.fog=new Fog(0x241c1b,16,54);
    this.scene.add(this.arena.root);
    this.scene.add(new HemisphereLight(0xffe9d4,0x46323c,2.05));
    this.sun.position.set(...TUNABLES.prototype.sunPosition);this.sun.castShadow=true;
    const extent=TUNABLES.prototype.shadowExtent;
    Object.assign(this.sun.shadow.camera,{left:-extent,right:extent,top:extent,bottom:-extent,far:extent*3});
    this.scene.add(this.sun);
    this.camera.rotation.order='YXZ';this.camera.add(this.cutter,...this.weaponViews.values());this.scene.add(this.camera);
    this.hud=new HUD(parent,new URLSearchParams(location.search).get('debug')==='1');
    this.pointer=new PointerLock(this.renderer.domElement,locked=>{
      if(this.touchMode)return;
      if(locked && (this.machine.current==='PAUSED'||this.machine.current==='INVENTORY'))this.change('PLAYING');
      else if(!locked && this.machine.current==='PLAYING')this.change('PAUSED');
    },message=>this.hud.toast(message));
    this.input=new Input(()=>this.settings.value,()=>this.pointer.locked && this.machine.current==='PLAYING');
    this.combat=new ArenaCombat(this.scene,this.collision,message=>{
      if(this.machine.current==='INVENTORY')this.menu.inventoryNotice(message);

    },{
      spawn:officePlan.enemySpawn, model:createOfficeDemon(), stage:true,
      drop:(id,count,position)=>this.loot.drop(id,count,position), flash:type=>this.hud.flash(type),
    },this.inventory);
    this.renderer.domElement.addEventListener('pointerdown',event=>{
      if(event.button===0 && this.pointer.locked && this.machine.current==='PLAYING')this.actions.attack=true;
    },{signal:this.events.signal});
    this.touch=new TouchControls(parent,action=>{
      if(this.machine.current!=='PLAYING')return;
      if(action==='attack'){this.actions.attack=true;return;}
      if(action==='extract'){this.requestExtraction();return;}
      if(action==='pickup'){this.pick=true;return;}
      if(action==='heal'){this.actions.heal='quick';return;}
      if(action==='reload'){this.actions.reload=true;return;}
      if(action==='map'){this.map=!this.map;return;}
      this.change(action==='pause'?'PAUSED':'INVENTORY');
    });
    this.menu=new Menu(parent,this.settings,this.inventory,{
      start:()=>this.start(),
      skipOpening:()=>this.beginEscape(),
      resume:()=>this.resume(),
      menu:()=>this.change('MENU'),
      changed:()=>this.applySettings(),
      toast:message=>this.hud.toast(message),
      extract:id=>{this.actions.extract=id;},
      heal:id=>{this.actions.heal=id;},
      drop:id=>{
        const count=this.inventory.count(id);
        if(count&&this.inventory.spend(id,count))this.loot.drop(id,count,this.movement.position);
      },
    });
    this.loop=new FixedStepLoop(dt=>this.update(dt),delta=>this.render(delta));
    document.addEventListener('keydown',this.keydown,{signal:this.events.signal});
    const preventBrowserGesture = (event:Event):void => {
      if(this.machine.current==='PLAYING'||this.machine.current==='INTRO')event.preventDefault();
    };
    for(const type of ['selectstart','contextmenu','gesturestart','gesturechange','gestureend']){
      parent.addEventListener(type,preventBrowserGesture,{capture:true,passive:false,signal:this.events.signal});
    }
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
    this.combat.reset();this.loot.reset();this.holySeen.clear();this.map=false;
    this.elapsed=0;this.caffeineSpent=0;this.yaw=0;this.pitch=0;this.loop.reset();
    this.openingTime=0;
    this.change('INTRO');
  }

  private beginEscape():void{
    if(this.machine.current!=='INTRO')return;
    this.openingTime=OPENING_DURATION;
    this.poseOpeningDemon();
    this.change('PAUSED');
    this.resume();
  }

  private resume():void{
    if(this.touchMode)this.change('PLAYING');
    else this.pointer.request();
  }

  private change(next:GameState):void{
    if(next===this.machine.current)return;
    this.loop?.setRunning(false);
    if(this.machine.current==='DEAD' && next!=='MENU')return;
    this.machine.transition(next);
    if(next==='MENU'){
      this.combat.reset();
      this.arena.openingDemon.visible=false;
    }
    this.loop?.stepper.setRunning(this.machine.simulating);
    this.input?.clear();
    this.actions={};this.pick=false;
    this.parent.dataset['state']=next;
    this.touch?.show(this.touchMode && next==='PLAYING');
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
      else this.resume();
    }else if(this.machine.current==='PLAYING'){
      if(event.code===RULES.quickHealKey)this.actions.heal='quick';
      else if(this.input.matches('extractor',event.code))this.requestExtraction();
      else if(this.input.matches('interact',event.code))this.pick=true;
      else if(this.input.matches('reload',event.code))this.actions.reload=true;
      else if(event.code==='KeyM')this.map=!this.map;
    }
  };

  private update(dt:number):void{
    if(this.resources.cause || this.machine.current==='MENU'||this.machine.current==='LOADING'||this.machine.current==='INTRO'||this.machine.current==='DEAD'||this.machine.current==='ENDING')return;
    const intent=this.machine.current==='PLAYING'
      ? this.touchMode ? {...NEUTRAL_INTENT,...this.touch.intent()} : this.input.intent()
      : NEUTRAL_INTENT;
    this.movement.update(dt,intent,this.yaw,this.resources);
    const p=this.movement.position;
    const floor=floorAt(p), safe=inSafeZone(p,floor);
    const current=this.resources.current;
    if(safe&&!this.holySeen.has(floor)){
      this.holySeen.add(floor);
      this.resources.applyDelta({hp:RULES.resources.hpMax-current.hp,caffeine:Math.max(0,RULES.resources.caffeineBase-current.caffeine)});
      this.hud.flash('heal');
    }
    const before=this.resources.current.caffeine;
    this.resources.advance(dt,safe);
    this.caffeineSpent+=before-this.resources.current.caffeine;
    this.loot.update(dt,p);
    if(this.pick&&this.loot.collect(p,this.inventory))this.hud.flash('pickup');
    if(!this.resources.cause)this.combat.update(dt,p,this.movement.eyeHeight,
      this.yaw,this.pitch,this.machine.simulating,this.actions,this.resources,safe);
    this.actions={};this.pick=false;
    this.elapsed+=dt;this.resolveDeath();
    if(this.machine.current==='PLAYING'&&p.z<-164)this.change('ENDING');
  }

  private requestExtraction():void{
    this.actions.extract=this.inventory.essence>=RULES.extraction.essence.input?'essence':'heart';
  }

  private resolveDeath():void{if(this.resources.cause && this.machine.current!=='DEAD' && (this.machine.simulating||this.machine.current==='PAUSED'))this.change('DEAD');}

  private snapshot(){
    const p=this.movement.position, floor=floorAt(p), weapon=this.inventory.weapon;
    return {state:this.machine.current,cause:this.resources.cause,resources:this.resources.current,position:{...p},
      height:this.movement.height,grounded:this.movement.grounded,jumps:this.movement.jumps,mode:this.movement.mode,
      cutterEquipped:weapon==='cutter',floor,onStairs:p.z<FLOORS[floor]!.end,map:this.map,weapon,
      ammo:weapon?this.combat.ammoLabel(weapon):'',pickup:!!this.loot.nearest(p),safe:inSafeZone(p,floor),
      yaw:this.yaw,pitch:this.pitch,elapsed:this.elapsed,caffeineSpent:this.caffeineSpent,fps:this.fps};
  }

  private resize():void{
    const width=this.parent.clientWidth,height=this.parent.clientHeight;
    this.camera.aspect=width/Math.max(1,height);this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,this.touchMode?1:TUNABLES.presentation.maxPixelRatio)*this.settings.value.renderScale);
    this.renderer.setSize(width,height);
  }

  private applySettings():void{
    const size=TUNABLES.settings.shadowSizes[this.settings.value.shadows];
    this.renderer.shadowMap.enabled=size>0 && !this.touchMode;
    this.sun.shadow.map?.dispose();this.sun.shadow.map=null;
    this.sun.shadow.mapSize.set(Math.max(1,size),Math.max(1,size));
    this.sun.shadow.needsUpdate=true;this.resize();
  }

  private poseOpeningDemon():void{
    const actor=this.arena.openingDemon;
    const contact=Math.max(0,Math.min(1,(this.openingTime-1.85)/0.34));
    const fall=Math.max(0,Math.min(1,(this.openingTime-2.30)/0.72));
    actor.visible=true;
    actor.position.set(-2.90-fall*0.83,-fall*0.02,8.10-fall*0.55);
    actor.rotation.set(0.09+contact*0.99-fall*0.88,fall*0.15,fall*1.49);
  }

  private renderOpening(delta:number):void{
    if(!document.hidden)this.openingTime=Math.min(OPENING_DURATION,this.openingTime+Math.min(delta,0.10));
    this.poseOpeningDemon();
    const strike=Math.max(0,1-Math.abs(this.openingTime-2.10)/0.25)*this.settings.value.screenShake;
    const settle=Math.max(0,(this.openingTime-2.65)/2);
    this.camera.position.set(-1.05+settle*0.66,1.28+settle*0.34-strike*0.12,10.56+settle*0.2);
    this.openingTarget.set(-2.76+settle*1.2,1.36-strike*0.38-settle*0.32,8.44-settle*1.3);
    this.camera.lookAt(this.openingTarget);
    this.camera.rotateZ(strike*0.09);
    this.cutter.visible=false;
    this.menu.setOpeningBeat(this.openingTime>=OPENING_DURATION?2:this.openingTime>=2.23?1:0,this.settings.value.subtitles);
  }

  private render(delta:number):void{
    this.displayTime+=delta;
    this.fps=delta>0?this.fps*0.9+0.1/delta:this.fps;
    this.arena.animate(this.displayTime);
    if(this.machine.current==='MENU'){
      this.camera.position.set(2.3+Math.sin(this.displayTime*0.20)*0.72,2.16,11.75);
      this.camera.lookAt(this.menuTarget);
      this.cutter.visible=false;
    }else if(this.machine.current==='INTRO'){
      this.renderOpening(delta);
    }else{
      const look=this.touchMode?this.touch.look():this.input.look();
      if(this.machine.current==='PLAYING'){
        this.yaw=(this.yaw-look.x*this.settings.value.sensitivity)%(Math.PI*2);
        const limit=TUNABLES.camera.pitchLimitDegrees*Math.PI/180;
        this.pitch=Math.max(-limit,Math.min(limit,this.pitch-look.y*this.settings.value.sensitivity));
      }
      this.camera.rotation.set(this.pitch,this.yaw,0,'YXZ');
      const p=this.movement.position;this.camera.position.set(p.x,p.y+this.movement.eyeHeight,p.z);
      this.cutter.visible=this.inventory.isEquipped('cutter') && this.machine.current!=='DEAD' && this.machine.current!=='ENDING';
      const c=TUNABLES.prototype.cutterModel;
      const swing=this.combat.cutterSwing;
      this.cutter.rotation.z=c.rotation[2]+swing*0.96;
      this.cutter.position.y=c.position[1]+Math.sin(this.elapsed*c.bobFrequency)*c.bobAmplitude*this.settings.value.screenShake+swing*0.042;
    }
    const snapshot=this.snapshot();
    for(const [id,model] of this.weaponViews){
      model.visible=id===snapshot.weapon&&this.machine.simulating;
      if(model.visible){
        model.position.y=-.24+this.combat.cutterSwing*.06;
        model.rotation.z=-.24+this.combat.cutterSwing*.43;
      }
    }
    this.hud.update(snapshot,this.settings.value);
    this.menu.updateInventory(snapshot.resources.caffeine);
    this.renderer.render(this.scene,this.camera);
  }

  dispose():void{
    this.events.abort();this.loop.dispose();this.input.dispose();this.pointer.dispose();this.menu.dispose();this.touch.dispose();this.combat.dispose();this.loot.dispose();
    this.arena.dispose();disposeGroup(this.cutter);for(const model of this.weaponViews.values())disposeGroup(model);this.sun.shadow.map?.dispose();this.renderer.dispose();
    this.parent.replaceChildren();
  }
}
