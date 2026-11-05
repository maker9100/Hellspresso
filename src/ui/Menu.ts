import type { GameState } from '../core/GameStateMachine';
import type { DeathCause } from '../player/Resources';
import { ACTIONS, keyLabel, rebind, SettingsStore } from './Settings';
import type { Action } from './Settings';
import { TUNABLES } from '../config/tunables';

interface Callbacks { start:()=>void; resume:()=>void; menu:()=>void; changed:()=>void; toast:(text:string)=>void }
const LABELS:Record<Action,string>={forward:'앞으로',backward:'뒤로',left:'왼쪽',right:'오른쪽',sprint:'달리기',jump:'점프 / 2단 점프',dash:'대시',slide:'슬라이딩',interact:'상호작용',extractor:'정수 추출기',reload:'재장전',inventory:'인벤토리'};

export class Menu {
  readonly root=document.createElement('section');
  private state:GameState='MENU';
  private panel:'home'|'settings'|'controls'|'credits'='home';
  private readonly events=new AbortController();
  private capturing:Action|null=null;
  private cause:DeathCause|null=null;
  constructor(parent:HTMLElement,private readonly store:SettingsStore,private readonly callbacks:Callbacks){
    this.root.className='overlay';parent.append(this.root);
    this.root.addEventListener('click',this.click,{signal:this.events.signal});
    this.root.addEventListener('change',this.changeSetting,{signal:this.events.signal});
    document.addEventListener('keydown',this.captureKey,{capture:true,signal:this.events.signal});
    this.render();
  }
  show(state:GameState,cause:DeathCause|null):void{this.state=state;this.cause=cause;this.panel='home';this.capturing=null;this.render();}
  private button(action:string,label:string,primary=false):string{return `<button data-action="${action}" class="${primary?'primary':''}">${label}<span aria-hidden="true">↗</span></button>`;}
  private render():void{
    this.root.hidden=this.state==='PLAYING'||this.state==='LOADING';
    if(this.root.hidden)return;
    const s=this.store.value;
    let body='';
    if(this.panel==='settings'){
      const range=(key:string,label:string,value:number,min=0,max=1)=>`<label class="setting"><span>${label}</span><input aria-label="${label}" type="range" min="${min}" max="${max}" step="${(max-min)/100}" value="${value}" data-setting="${key}"><output>${value.toFixed(3)}</output></label>`;
      const toggle=(key:string,label:string,checked:boolean)=>`<label class="setting"><span>${label}</span><input type="checkbox" data-setting="${key}" ${checked?'checked':''}></label>`;
      body=`<h2>설정<span>SETTINGS</span></h2><div class="settings-list">
        <label class="setting"><span>렌더링 해상도</span><select data-setting="renderScale">${TUNABLES.settings.scaleOptions.map(v=>`<option value="${v}" ${s.renderScale===v?'selected':''}>${v*100}%</option>`).join('')}</select></label>
        <label class="setting"><span>그림자</span><select data-setting="shadows">${(['off','low','medium'] as const).map(v=>`<option ${s.shadows===v?'selected':''} value="${v}">${v==='off'?'끔':v==='low'?'낮음':'보통'}</option>`).join('')}</select></label>
        ${range('sensitivity','마우스 감도',s.sensitivity,TUNABLES.settings.sensitivityMin,TUNABLES.settings.sensitivityMax)}
        ${range('effectsVolume','효과음',s.effectsVolume)}${range('musicVolume','배경음악',s.musicVolume)}${range('screenShake','화면 흔들림',s.screenShake)}
        ${toggle('showFps','FPS 표시',s.showFps)}${toggle('subtitles','자막',s.subtitles)}${toggle('tutorial','조작 안내',s.tutorial)}</div>
        <div class="button-row">${this.button('fullscreen','전체화면')}${this.button('reset','초기화')}${this.button('back','뒤로')}</div>`;
    }else if(this.panel==='controls'){
      body=`<h2>조작법<span>CONTROLS</span></h2><p class="subtle">키를 클릭한 뒤 사용할 키를 누르세요. ESC로 변경 취소.</p><div class="bindings">${ACTIONS.map(action=>`<div><span>${LABELS[action]}</span><button data-bind="${action}">${this.capturing===action?'키 입력 대기':s.bindings[action].map(keyLabel).join(' / ')}</button></div>`).join('')}<div><span>빠른 HP 회복 / 정지</span><b>H / ESC</b></div></div><p class="subtle">슬라이딩은 C 권장. Ctrl 조합은 브라우저 단축키와 충돌할 수 있다.</p>${this.button('back','뒤로')}`;
    }else if(this.panel==='credits'){
      body=`<h2>SλVE POINT · GPT 6.1 Sol<span>CREDITS</span></h2><p>HELLSPRESSO — DEMO VERSION</p>${this.button('back','뒤로')}`;
    }else if(this.state==='MENU'){
      this.root.classList.add('main-menu');
      this.root.innerHTML=`<header class="brand-line"><b>SλVE POINT</b><span>PC / SINGLE PLAYER</span></header><div class="main-layout"><div class="title-block"><span class="eyebrow">DEAD TIRED. STILL WORKING.</span><h1>HELL<span>SPRESSO</span><i>DEMO</i></h1><p>카페인이 없는 자<br>죽음을 맞이할지어다.</p><div class="title-rule"></div><small>과로는 끝났다. 야근은 계속된다.</small></div><div class="menu-card"><div class="card-label"><span>RESUME EXISTENCE</span><i>01</i></div><h2>다시, 한 잔.</h2><p class="subtle">키보드와 마우스로 지옥을 누빈다.<br>체력보다 먼저 카페인이 바닥날 수 있다.</p>${this.button('start','새 게임 시작',true)}<button disabled>이어하기<span>기록 없음</span></button><div class="button-row">${this.button('settings','설정')}${this.button('controls','조작법')}</div>${this.button('credits','크레딧')}<div class="local-status"><i></i> 게스트 · 로컬 모드</div></div></div><footer class="menu-footer"><span>CAFFEINE IS EXISTENCE.</span><span>이동 데모 · 0.1.0</span></footer>`;
      return;
    }else if(this.state==='INVENTORY'){
      body=`<span class="eyebrow warning">CAFFEINE IS STILL DRAINING</span><h2>소지품<span>INVENTORY</span></h2><div class="inventory-item"><b>01 커터칼</b><span>기본 장비</span></div><div class="inventory-item"><b>정수 추출기</b><span>생존 도구</span></div><div class="empty-inventory">회복 아이템과 제작 재료가 없다.</div><p class="warning">이 화면에서도 시간이 흐른다.</p>${this.button('resume','게임으로 돌아가기',true)}`;
    }else if(this.state==='DEAD'){
      const title=this.cause==='hp'?'치명상':this.cause==='both'?'HP · 카페인 동시 고갈':'카페인 고갈';
      body=`<span class="eyebrow warning">EMPLOYMENT TERMINATED</span><h2>존재 종료<span>${title}</span></h2><p class="subtle">카페인이 없는 자 죽음을 맞이할지어다.</p>${this.button('restart','새로 시작',true)}${this.button('menu','메인 메뉴')}`;
    }else{
      body=`<span class="eyebrow">TAKE A BREATH</span><h2>잠깐의 휴식<span>PAUSED</span></h2><p class="subtle">시간과 카페인 감소가 멈췄다.</p>${this.button('resume','계속하기',true)}<div class="button-row">${this.button('settings','설정')}${this.button('controls','조작법')}</div>${this.button('menu','메인 메뉴')}`;
    }
    this.root.classList.remove('main-menu');
    this.root.innerHTML=`<div class="modal-card">${body}<div class="local-status"><i></i> ${this.store.storageError?'설정을 저장할 수 없다':'SλVE POINT / HELLSPRESSO'}</div></div>`;
  }
  private readonly click=(event:MouseEvent):void=>{
    const target=event.target instanceof Element?event.target.closest<HTMLButtonElement>('button'):null;
    if(!target)return;
    const binding=target.dataset['bind'];
    if(binding && ACTIONS.includes(binding as Action)){this.capturing=binding as Action;this.render();return;}
    switch(target.dataset['action']){
      case'start':this.callbacks.start();break;
      case'restart':this.callbacks.menu();this.callbacks.start();break;
      case'resume':this.callbacks.resume();break;
      case'menu':this.callbacks.menu();break;
      case'settings':this.panel='settings';this.render();break;
      case'controls':this.panel='controls';this.render();break;
      case'credits':this.panel='credits';this.render();break;
      case'back':this.panel='home';this.render();break;
      case'reset':this.store.reset();this.callbacks.changed();this.render();break;
      case'fullscreen':{
        const action=document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();
        void action.catch(()=>this.callbacks.toast('전체화면을 사용할 수 없다.'));break;
      }
    }
  };
  private readonly changeSetting=(event:Event):void=>{
    const el=event.target;
    if(!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement))return;
    const key=el.dataset['setting'];const s=this.store.value;
    if(key==='shadows' && (el.value==='off'||el.value==='low'||el.value==='medium'))s.shadows=el.value;
    if(key==='renderScale')s.renderScale=Number(el.value);
    if(key==='sensitivity'||key==='effectsVolume'||key==='musicVolume'||key==='screenShake')s[key]=Number(el.value);
    if((key==='showFps'||key==='subtitles'||key==='tutorial') && el instanceof HTMLInputElement)s[key]=el.checked;
    this.store.save();this.callbacks.changed();this.render();
  };
  private readonly captureKey=(event:KeyboardEvent):void=>{
    if(!this.capturing)return;
    event.preventDefault();event.stopImmediatePropagation();
    if(event.code==='Escape'){this.capturing=null;this.render();return;}
    const error=rebind(this.store.value,this.capturing,event.code);
    if(error){this.callbacks.toast(error);return;}
    this.store.save();this.callbacks.changed();this.capturing=null;this.render();
  };
  dispose():void{this.events.abort();this.root.remove();}
}
