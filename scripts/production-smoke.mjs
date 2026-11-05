import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {preview} from 'vite';

const {chromium}=await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const server=await preview({preview:{host:'127.0.0.1',port:0}});
const address=server.httpServer.address();
if(!address || typeof address==='string')throw new Error('테스트 서버 주소 없음');
const browser=await chromium.launch({headless:true,
  ...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{}),
  args:process.env.BROWSER_ARGS?JSON.parse(process.env.BROWSER_ARGS):[],
});
const errors=[];
try{
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  await page.addInitScript(()=>localStorage.setItem('hellspresso.settings.v1',JSON.stringify({renderScale:0.5,shadows:'off'})));
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  page.on('requestfailed',request=>errors.push(request.url()));
  await page.goto(`http://127.0.0.1:${address.port}/?debug=1`);
  await page.getByRole('button',{name:'새 게임 시작'}).waitFor();
  assert.equal(await page.evaluate(()=>typeof window.__HELLSPRESSO_QA__),'undefined');
  await page.getByRole('button',{name:'새 게임 시작'}).click();
  await page.waitForFunction(()=>document.querySelector('#app').dataset.state==='PLAYING');
  // 잠금 직후 첫 마우스 이벤트는 Chromium에서 movement가 0일 수 있다.
  // 기준 위치를 먼저 정한 뒤 여러 실제 마우스 이벤트로 시점 변화를 확인한다.
  await page.mouse.move(640,360,{steps:2});
  await page.waitForTimeout(150);
  await page.evaluate(()=>{window.__mouseProbe=[];document.addEventListener('mousemove',event=>window.__mouseProbe.push({x:event.movementX,y:event.movementY,locked:!!document.pointerLockElement}));});
  const clip={x:500,y:220,width:280,height:200};
  const before=await page.screenshot({clip});
  await page.mouse.move(1100,150,{steps:8});await page.waitForTimeout(200);
  const after=await page.screenshot({clip});
  console.log(JSON.stringify({mouseProbe:await page.evaluate(()=>window.__mouseProbe),state:await page.locator('#app').getAttribute('data-state')}));
  const hash=b=>createHash('sha256').update(b).digest('hex');
  const nativeMouseViewChanged=hash(before)!==hash(after);
  if(!nativeMouseViewChanged){
    // 일부 headless 실행기는 포인터 재중앙화 이벤트를 반대 방향으로 함께 전달한다.
    // 이 경우 실제 마우스 경로는 미검증으로 남기고 DOM 입력 처리와 렌더를 따로 확인한다.
    await page.evaluate(()=>document.dispatchEvent(new MouseEvent('mousemove',{bubbles:true,movementX:160,movementY:-35})));
    await page.waitForTimeout(200);
    assert.notEqual(hash(before),hash(await page.screenshot({clip})),'DOM 시점 입력이 3D 화면을 바꾸어야 한다');
  }
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>document.querySelector('#app').dataset.state==='PAUSED');
  assert.equal(await page.evaluate(()=>!!document.pointerLockElement),false);
  const caf=await page.locator('#caf-value').textContent();await page.waitForTimeout(500);
  assert.equal(await page.locator('#caf-value').textContent(),caf);
  await page.getByRole('button',{name:'계속하기'}).click();
  try{await page.waitForFunction(()=>document.querySelector('#app').dataset.state==='PLAYING',null,{timeout:1200});}
  catch(error){
    if(await page.locator('#app').getAttribute('data-state')!=='PAUSED')throw error;
    await page.getByRole('button',{name:'계속하기'}).click();
    await page.waitForFunction(()=>document.querySelector('#app').dataset.state==='PLAYING',null,{timeout:3000});
  }
  assert.equal(await page.evaluate(()=>!!document.pointerLockElement),true);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({result:'PASS',browser:await browser.version(),nativeMouseViewChanged,checks:['built dist boot','production QA mutation API absent',nativeMouseViewChanged?'native mouse changes rendered view':'synthetic DOM mouse changes rendered view (native input unverified)','ESC releases pointer lock','pause preserves CAF','click resumes pointer lock after ESC','no runtime or request errors'],errors}));
}finally{await browser.close();await server.close();}
