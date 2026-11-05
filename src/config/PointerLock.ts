export class PointerLock {
  private readonly events=new AbortController();
  private pending=false;
  constructor(private readonly element:HTMLCanvasElement,private readonly changed:(locked:boolean)=>void,private readonly error:(message:string)=>void) {
    document.addEventListener('pointerlockchange',()=>{this.pending=false;this.changed(this.locked);},{signal:this.events.signal});
    document.addEventListener('pointerlockerror',()=>this.failed(),{signal:this.events.signal});
  }
  get locked():boolean { return document.pointerLockElement===this.element; }
  request():void {
    if(this.pending || this.locked)return;
    if(!this.element.requestPointerLock){this.failed();return;}
    this.pending=true;
    try { void Promise.resolve(this.element.requestPointerLock()).catch(()=>this.failed()); }
    catch { this.failed(); }
  }
  release():void { if(this.locked)document.exitPointerLock(); }
  private failed():void {this.pending=false;this.error('마우스 잠금을 허용한 뒤 다시 클릭해 주세요.');}
  dispose():void {this.release();this.events.abort();}
}
