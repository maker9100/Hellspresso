import { BOSS_HP, FIRST_STATION, BOSS_FLOOR } from '../assets/campaignPlan';
import { FLOORS, ROUTE_X } from '../assets/officeRoute';
import { ITEMS, weaponSpec } from '../core/items';
import type { WeaponId } from '../core/items';
import type { Aabb, Vec3 } from '../core/types';
import { RULES } from '../config/rules';
import { TUNABLES } from '../config/tunables';
import type { GameState } from '../core/GameStateMachine';
import type { Resources } from '../player/Resources';
import type { Settings } from './Settings';
import { keyLabel } from './Settings';

export interface HudSnapshot {
  state:GameState; resources:Readonly<Resources>; mode:string; weapon:WeaponId|undefined; ammo:string; floor:number; position:Vec3; map:boolean; pickup:boolean; lift:number; liftShade:number; safe:boolean; onStairs:boolean; bossHP:number; guide:string; warpTint:number; elapsed:number; caffeineSpent:number; fps:number;
}

export class HUD {
  readonly root=document.createElement('section');
  private readonly hp:HTMLElement;
  private readonly caf:HTMLElement;
  private readonly stamina:HTMLElement;
  private readonly hpFill:HTMLElement;
  private readonly cafFill:HTMLElement;
  private readonly staminaFill:HTMLElement;
  private readonly debug:HTMLElement;
  private readonly fps:HTMLElement;
  private readonly hints:HTMLElement;
  private readonly message:HTMLElement;
  private readonly route:HTMLElement;
  private readonly weapon:HTMLElement;
  private readonly liftShade:HTMLElement;
  private readonly liftHint:HTMLElement;
  private readonly effect=document.createElement('div');
  private effectAnimation:Animation|undefined;
  private readonly map:HTMLElement;
  private mapFloor=-1;
  private readonly layout:SVGSVGElement;
  private readonly marker:HTMLElement;
  private readonly mapName:HTMLElement;
  private toastUntil=0;
  constructor(parent:HTMLElement,debug:boolean,private readonly colliders:readonly Aabb[]=[]){
    this.root.className='hud';
    this.root.innerHTML=`<div class="hud-top"><div class="location"><span class="eyebrow">HELLSPRESSO / STAGE 01</span><b id="floor-name">지옥 사무실</b><small id="office-route"></small></div><div class="run-clock" id="run-clock">00:00</div></div>
      <div class="reticle" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      <div class="vitals"><div class="vital hp"><div><b>HP</b><span id="hp-value"></span></div><div class="track"><i id="hp-fill"></i></div></div>
      <div class="vital caf"><div><b>CAF <small>EXISTENCE FUEL</small></b><span id="caf-value"></span></div><div class="track"><i id="caf-fill"></i></div></div>
      <div class="vital stamina"><div><b>STAMINA</b><span id="stamina-value"></span></div><div class="track"><i id="stamina-fill"></i></div></div></div>
      <div class="weapon"><small>01 / OFFICE EQUIPMENT</small><strong>커터칼</strong><span><b>∞</b></span></div>
      <div class="hint-strip" id="hints"></div>
      <output class="debug-output" id="debug-output" ${debug?'':'hidden'}></output><output class="fps-output" id="fps-output"></output>
      <div class="train-health" hidden><b>DEVIL TRAIN</b><progress max="${BOSS_HP}" value="0"></progress></div>
      <div class="warp-tint" aria-hidden="true"></div>
      <div class="lift-shade" aria-hidden="true"></div>
      <div class="lift-hint" hidden></div>
      <div class="pickup-indicator" hidden aria-label="아이템 줍기">◇</div>
      <div class="floor-map" hidden><b></b><div class="map-plan"><div class="map-fixtures"></div><svg class="map-layout" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"></svg><i></i></div></div>`;
    this.effect.className='hud-effect';
    this.effect.setAttribute('aria-hidden','true');
    this.root.append(this.effect);
    parent.append(this.root);
    const get=(id:string):HTMLElement=>{const e=this.root.querySelector<HTMLElement>(id);if(!e)throw new Error(id);return e;};
    this.hp=get('#hp-value');this.caf=get('#caf-value');this.stamina=get('#stamina-value');
    this.hpFill=get('#hp-fill');this.cafFill=get('#caf-fill');this.staminaFill=get('#stamina-fill');
    this.debug=get('#debug-output');this.fps=get('#fps-output');this.hints=get('#hints');this.route=get('#office-route');this.weapon=get('.weapon');
    this.liftShade=get('.lift-shade');this.liftHint=get('.lift-hint');
    this.layout=this.root.querySelector<SVGSVGElement>('.map-layout')!;
    this.map=get('.floor-map');this.marker=get('.map-plan>i');this.mapName=get('.floor-map>b');
    this.message=document.createElement('div');this.message.className='toast';this.message.setAttribute('role','status');this.message.hidden=true;parent.append(this.message);
  }
  toast(message:string):void{this.message.textContent=message;this.toastUntil=performance.now()+TUNABLES.prototype.uiToastSeconds*1000;}
  flash(type:'hit'|'hurt'|'heal'|'pickup'):void{
    const color={hit:'#ff913f',hurt:'#bc231fc4',heal:'#99c87b91',pickup:'#ebbd6e95'}[type];
    this.effectAnimation?.cancel();
    const frame=type==='hit'?{backgroundColor:color,transform:'translate(-50%,-50%) scale(1)'}:{boxShadow:`inset 0 0 85px ${color}`};
    this.effect.classList.toggle('hit',type==='hit');
    this.effectAnimation=this.effect.animate([{...frame,opacity:1},{...frame,opacity:0}],{duration:type==='hit'?145:350,easing:'ease-out'});
  }
  update(snapshot:HudSnapshot,settings:Settings):void{
    const {resources:r,state}=snapshot;
    this.root.hidden=state==='MENU'||state==='LOADING'||state==='INTRO'||state==='ENDING';
    const floor=FLOORS[snapshot.floor]!;
    const name=this.root.querySelector('#floor-name')!;
    if(name.textContent!==floor.name)name.textContent=floor.name;
    const stage=snapshot.floor<5?'01':snapshot.floor<FIRST_STATION?'02':snapshot.floor<=BOSS_FLOOR?'03':'04';
    const stageLabel=this.root.querySelector('.location .eyebrow');
    if(stageLabel&&stageLabel.textContent!==`HELLSPRESSO / STAGE ${stage}`)stageLabel.textContent=`HELLSPRESSO / STAGE ${stage}`;
    const boss=this.root.querySelector<HTMLElement>('.train-health')!;
    boss.hidden=snapshot.bossHP<=0;
    boss.querySelector('progress')!.value=snapshot.bossHP;
    this.root.querySelector<HTMLElement>('.warp-tint')!.style.opacity=String(snapshot.warpTint*.65);
    this.weapon.hidden=!snapshot.weapon;
    if(snapshot.weapon){
      const label=this.weapon.querySelector('strong')!, kind=this.weapon.querySelector('small')!, ammo=this.weapon.querySelector('b')!;
      if(label.textContent!==ITEMS[snapshot.weapon].name)label.textContent=ITEMS[snapshot.weapon].name;
      const attack=weaponSpec(snapshot.weapon).attack.toUpperCase();
      if(kind.textContent!==attack)kind.textContent=attack;
      if(ammo.textContent!==snapshot.ammo)ammo.textContent=snapshot.ammo;
    }
    this.root.querySelector<HTMLElement>('.pickup-indicator')!.hidden=!snapshot.pickup||state!=='PLAYING';
    this.liftShade.style.opacity=String(snapshot.liftShade);
    this.liftHint.hidden=snapshot.lift<0||snapshot.liftShade>0||state!=='PLAYING';
    if(!this.liftHint.hidden){
      const key=keyLabel(settings.bindings.interact[0]??'');
      const label=snapshot.lift===4?`${key} 위층`:snapshot.lift===0?`${key} 아래층`:`${key} 아래층 · Q 위층`;
      if(this.liftHint.textContent!==label)this.liftHint.textContent=label;
    }
    this.map.hidden=!snapshot.map||state!=='PLAYING';
    if(!this.map.hidden){
      this.map.dataset['floor']=String(snapshot.floor);
      if(this.mapFloor!==snapshot.floor){
        this.mapFloor=snapshot.floor;this.layout.replaceChildren();
        if(snapshot.floor>=5&&'width' in floor){
          const width=Number(floor.width), left=ROUTE_X-width/2, length=floor.start-floor.end;
          for(const {min,max} of this.colliders){
            if(min.y>floor.y+1.6||max.y<floor.y+.45||max.z<floor.end||min.z>floor.start)continue;
            const x=Math.max(0,(min.x-left)/width*100), right=Math.min(100,(max.x-left)/width*100);
            const top=Math.max(0,(floor.start-max.z)/length*100), bottom=Math.min(100,(floor.start-min.z)/length*100);
            if(x>=right||top>=bottom)continue;
            const rect=document.createElementNS('http://www.w3.org/2000/svg','rect');
            rect.setAttribute('x',String(x));rect.setAttribute('y',String(top));
            rect.setAttribute('width',String(right-x));rect.setAttribute('height',String(bottom-top));
            this.layout.append(rect);
          }
        }
      }
      if(this.mapName.textContent!==floor.name)this.mapName.textContent=floor.name;
      const x=snapshot.floor===0?snapshot.position.x:snapshot.position.x-ROUTE_X;
      const clamp=(value:number)=>Math.max(3,Math.min(97,value));
      this.marker.style.left=`${clamp(50+x*100/('width' in floor?Number(floor.width):26))}%`;
      this.marker.style.top=`${clamp((floor.start-snapshot.position.z)/(floor.start-floor.end)*100)}%`;
    }
    const route=snapshot.safe?'성역 · CAF 유지':snapshot.onStairs?'비상계단 · 하강':snapshot.guide||floor.advice;
    if(this.route.textContent!==route)this.route.textContent=route;
    this.root.classList.toggle('danger',r.caffeine<=TUNABLES.debug.caffeineWarning&&state!=='DEAD');
    this.root.classList.toggle('aiming',state==='PLAYING');
    this.hp.textContent=`${r.hp.toFixed(0)} / ${RULES.resources.hpMax}`;
    this.caf.textContent=`${r.caffeine.toFixed(1)} / ${RULES.resources.caffeineMax}`;
    this.stamina.textContent=`${r.stamina.toFixed(1)} / ${RULES.resources.staminaMax}`;
    this.hpFill.style.width=`${r.hp/RULES.resources.hpMax*100}%`;
    this.cafFill.style.width=`${r.caffeine/RULES.resources.caffeineMax*100}%`;
    this.staminaFill.style.width=`${r.stamina/RULES.resources.staminaMax*100}%`;
    this.hints.hidden=!settings.tutorial;
    this.hints.textContent=`${keyLabel(settings.bindings['sprint'][0]??'')} 달리기　${keyLabel(settings.bindings['dash'][0]??'')} 대시　${keyLabel(settings.bindings['slide'][0]??'')} 슬라이드　${keyLabel(settings.bindings['jump'][0]??'')} ×2 점프　${keyLabel(settings.bindings['interact'][0]??'')} 줍기　H 회복　M 지도　${keyLabel(settings.bindings['inventory'][0]??'')} 소지품`;
    this.message.hidden=state==='PLAYING'||state==='INTRO'||state==='INVENTORY'||performance.now()>this.toastUntil;
    this.fps.hidden=!settings.showFps;this.fps.textContent=`${snapshot.fps.toFixed(0)} FPS`;
    const elapsed=Math.floor(snapshot.elapsed);
    const clock=this.root.querySelector('#run-clock');if(clock)clock.textContent=`${String(Math.floor(elapsed/60)).padStart(2,'0')}:${String(elapsed%60).padStart(2,'0')}`;
    const rate=snapshot.elapsed>0?snapshot.caffeineSpent/snapshot.elapsed*60:0;
    this.debug.textContent=`CAF/분 공급 0.0 | 소비 ${rate.toFixed(1)} | 수지 ${(-rate).toFixed(1)}\n표본 ${snapshot.elapsed.toFixed(2)}초 / ${snapshot.mode} / ${state}`;
  }
}
