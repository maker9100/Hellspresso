import { RULES } from '../config/rules';
import { TUNABLES } from '../config/tunables';
import type { GameState } from '../core/GameStateMachine';
import type { Resources } from '../player/Resources';
import type { Settings } from './Settings';
import { keyLabel } from './Settings';

export interface HudSnapshot {
  state:GameState; resources:Readonly<Resources>; mode:string; elapsed:number; caffeineSpent:number; fps:number;
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
  private toastUntil=0;
  constructor(parent:HTMLElement,debug:boolean){
    this.root.className='hud';
    this.root.innerHTML=`<div class="hud-top"><div class="location"><span class="eyebrow">HELLSPRESSO / LOCAL</span><b>꺼지지 않는 야근</b><small>이동 테스트 구역</small></div><div class="run-clock" id="run-clock">00:00</div></div>
      <div class="reticle" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      <div class="vitals"><div class="vital hp"><div><b>HP</b><span id="hp-value"></span></div><div class="track"><i id="hp-fill"></i></div></div>
      <div class="vital caf"><div><b>CAF <small>EXISTENCE FUEL</small></b><span id="caf-value"></span></div><div class="track"><i id="caf-fill"></i></div></div>
      <div class="vital stamina"><div><b>STAMINA</b><span id="stamina-value"></span></div><div class="track"><i id="stamina-fill"></i></div></div></div>
      <div class="weapon"><small>01 / OFFICE EQUIPMENT</small><strong>커터칼</strong><span>MELEE <b>∞</b></span></div>
      <div class="hint-strip" id="hints"></div>
      <output class="debug-output" id="debug-output" ${debug?'':'hidden'}></output><output class="fps-output" id="fps-output"></output>
      <div class="low-caffeine"><strong>CAFFEINE LOW</strong><span>존재 유지 연료가 부족하다</span></div>`;
    parent.append(this.root);
    const get=(id:string):HTMLElement=>{const e=this.root.querySelector<HTMLElement>(id);if(!e)throw new Error(id);return e;};
    this.hp=get('#hp-value');this.caf=get('#caf-value');this.stamina=get('#stamina-value');
    this.hpFill=get('#hp-fill');this.cafFill=get('#caf-fill');this.staminaFill=get('#stamina-fill');
    this.debug=get('#debug-output');this.fps=get('#fps-output');this.hints=get('#hints');
    this.message=document.createElement('div');this.message.className='toast';this.message.setAttribute('role','status');this.message.hidden=true;parent.append(this.message);
  }
  toast(message:string):void{this.message.textContent=message;this.toastUntil=performance.now()+TUNABLES.prototype.uiToastSeconds*1000;}
  update(snapshot:HudSnapshot,settings:Settings):void{
    const {resources:r,state}=snapshot;
    this.root.hidden=state==='MENU'||state==='LOADING';
    this.root.classList.toggle('danger',r.caffeine<=TUNABLES.debug.caffeineWarning&&state!=='DEAD');
    this.root.classList.toggle('aiming',state==='PLAYING');
    this.hp.textContent=`${r.hp.toFixed(0)} / ${RULES.resources.hpMax}`;
    this.caf.textContent=`${r.caffeine.toFixed(1)} / ${RULES.resources.caffeineMax}`;
    this.stamina.textContent=`${r.stamina.toFixed(1)} / ${RULES.resources.staminaMax}`;
    this.hpFill.style.width=`${r.hp/RULES.resources.hpMax*100}%`;
    this.cafFill.style.width=`${r.caffeine/RULES.resources.caffeineMax*100}%`;
    this.staminaFill.style.width=`${r.stamina/RULES.resources.staminaMax*100}%`;
    this.hints.hidden=!settings.tutorial;
    this.hints.textContent=`${keyLabel(settings.bindings['sprint'][0]??'')} 달리기　${keyLabel(settings.bindings['dash'][0]??'')} 대시　${keyLabel(settings.bindings['slide'][0]??'')} 슬라이드　${keyLabel(settings.bindings['jump'][0]??'')} ×2 점프　${keyLabel(settings.bindings['inventory'][0]??'')} 소지품　ESC 정지`;
    this.message.hidden=performance.now()>this.toastUntil;
    this.fps.hidden=!settings.showFps;this.fps.textContent=`${snapshot.fps.toFixed(0)} FPS`;
    const elapsed=Math.floor(snapshot.elapsed);
    const clock=this.root.querySelector('#run-clock');if(clock)clock.textContent=`${String(Math.floor(elapsed/60)).padStart(2,'0')}:${String(elapsed%60).padStart(2,'0')}`;
    const rate=snapshot.elapsed>0?snapshot.caffeineSpent/snapshot.elapsed*60:0;
    this.debug.textContent=`CAF/분 공급 0.0 | 소비 ${rate.toFixed(1)} | 수지 ${(-rate).toFixed(1)}\n표본 ${snapshot.elapsed.toFixed(2)}초 / ${snapshot.mode} / ${state}`;
  }
}
