import { FLOORS, ROUTE_X } from '../assets/officeRoute';
import { ITEMS, weaponSpec } from '../core/items';
import type { WeaponId } from '../core/items';
import type { Vec3 } from '../core/types';
import { RULES } from '../config/rules';
import { TUNABLES } from '../config/tunables';
import type { GameState } from '../core/GameStateMachine';
import type { Resources } from '../player/Resources';
import type { Settings } from './Settings';
import { keyLabel } from './Settings';

export interface HudSnapshot {
  state:GameState; resources:Readonly<Resources>; mode:string; weapon:WeaponId|undefined; ammo:string; floor:number; position:Vec3; map:boolean; pickup:boolean; safe:boolean; onStairs:boolean; elapsed:number; caffeineSpent:number; fps:number;
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
  private readonly effect=document.createElement('div');
  private effectAnimation:Animation|undefined;
  private readonly map:HTMLElement;
  private readonly marker:HTMLElement;
  private readonly mapName:HTMLElement;
  private toastUntil=0;
  constructor(parent:HTMLElement,debug:boolean){
    this.root.className='hud';
    this.root.innerHTML=`<div class="hud-top"><div class="location"><span class="eyebrow">HELLSPRESSO / STAGE 01</span><b id="floor-name">지옥 사무실</b><small id="office-route"></small></div><div class="run-clock" id="run-clock">00:00</div></div>
      <div class="reticle" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      <div class="vitals"><div class="vital hp"><div><b>HP</b><span id="hp-value"></span></div><div class="track"><i id="hp-fill"></i></div></div>
      <div class="vital caf"><div><b>CAF <small>EXISTENCE FUEL</small></b><span id="caf-value"></span></div><div class="track"><i id="caf-fill"></i></div></div>
      <div class="vital stamina"><div><b>STAMINA</b><span id="stamina-value"></span></div><div class="track"><i id="stamina-fill"></i></div></div></div>
      <div class="weapon"><small>01 / OFFICE EQUIPMENT</small><strong>커터칼</strong><span><b>∞</b></span></div>
      <div class="hint-strip" id="hints"></div>
      <output class="debug-output" id="debug-output" ${debug?'':'hidden'}></output><output class="fps-output" id="fps-output"></output>
      <div class="pickup-indicator" hidden aria-label="아이템 줍기">◇</div>
      <div class="floor-map" hidden><b></b><div class="map-plan"><div class="map-fixtures"></div><i></i></div></div>`;
    this.effect.className='hud-effect';
    this.effect.setAttribute('aria-hidden','true');
    this.root.append(this.effect);
    parent.append(this.root);
    const get=(id:string):HTMLElement=>{const e=this.root.querySelector<HTMLElement>(id);if(!e)throw new Error(id);return e;};
    this.hp=get('#hp-value');this.caf=get('#caf-value');this.stamina=get('#stamina-value');
    this.hpFill=get('#hp-fill');this.cafFill=get('#caf-fill');this.staminaFill=get('#stamina-fill');
    this.debug=get('#debug-output');this.fps=get('#fps-output');this.hints=get('#hints');this.route=get('#office-route');this.weapon=get('.weapon');
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
    this.weapon.hidden=!snapshot.weapon;
    if(snapshot.weapon){
      const label=this.weapon.querySelector('strong')!, kind=this.weapon.querySelector('small')!, ammo=this.weapon.querySelector('b')!;
      if(label.textContent!==ITEMS[snapshot.weapon].name)label.textContent=ITEMS[snapshot.weapon].name;
      const attack=weaponSpec(snapshot.weapon).attack.toUpperCase();
      if(kind.textContent!==attack)kind.textContent=attack;
      if(ammo.textContent!==snapshot.ammo)ammo.textContent=snapshot.ammo;
    }
    this.root.querySelector<HTMLElement>('.pickup-indicator')!.hidden=!snapshot.pickup||state!=='PLAYING';
    this.map.hidden=!snapshot.map||state!=='PLAYING';
    if(!this.map.hidden){
      this.map.dataset['floor']=String(snapshot.floor);
      if(this.mapName.textContent!==floor.name)this.mapName.textContent=floor.name;
      const x=snapshot.floor===0?snapshot.position.x:snapshot.position.x-ROUTE_X;
      const clamp=(value:number)=>Math.max(3,Math.min(97,value));
      this.marker.style.left=`${clamp(50+x*5)}%`;
      this.marker.style.top=`${clamp((floor.start-snapshot.position.z)/(floor.start-floor.end)*100)}%`;
    }
    const route=snapshot.safe?'성역 · CAF 유지':snapshot.onStairs?'비상계단 · 하강':floor.advice;
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
