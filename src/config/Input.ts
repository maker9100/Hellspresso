import type { MoveIntent } from './types';
import type { Action, Settings } from '../ui/Settings';

export class Input {
  private down = new Set<string>();
  private pressed = new Set<string>();
  private lookX=0;
  private lookY=0;
  private readonly events=new AbortController();
  constructor(private readonly settings: ()=>Settings, private readonly locked: ()=>boolean) {
    document.addEventListener('keydown',event=>{
      if (!this.locked()) return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
      if (Object.values(this.settings().bindings).some(keys=>keys.includes(event.code))) {
        event.preventDefault();
        if (!event.repeat) this.pressed.add(event.code);
        this.down.add(event.code);
      }
    },{signal:this.events.signal});
    document.addEventListener('keyup',event=>this.down.delete(event.code),{signal:this.events.signal});
    document.addEventListener('mousemove',event=>{
      if (this.locked()) { this.lookX+=event.movementX; this.lookY+=event.movementY; }
    },{signal:this.events.signal});
    window.addEventListener('blur',()=>this.clear(),{signal:this.events.signal});
  }
  matches(action:Action,code:string):boolean { return this.settings().bindings[action].includes(code); }
  held(action:Action):boolean { return this.settings().bindings[action].some(code=>this.down.has(code)); }
  take(action:Action):boolean {
    const codes=this.settings().bindings[action];
    const found=codes.some(code=>this.pressed.has(code));
    for(const code of codes) this.pressed.delete(code);
    return found;
  }
  intent():MoveIntent {
    return { forward:Number(this.held('forward'))-Number(this.held('backward')),
      right:Number(this.held('right'))-Number(this.held('left')), sprint:this.held('sprint'),
      jump:this.take('jump'),dash:this.take('dash'),slide:this.take('slide') };
  }
  look():{x:number;y:number} { const value={x:this.lookX,y:this.lookY}; this.lookX=0;this.lookY=0;return value; }
  clear():void { this.down.clear();this.pressed.clear();this.lookX=0;this.lookY=0; }
  dispose():void { this.events.abort();this.clear(); }
}
