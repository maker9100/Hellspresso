// 선택 QA 도구: playwright@1.62.1을 별도 설치하면 실행할 수 있다.
// 게임 런타임에는 Playwright/브라우저 바이너리를 포함하지 않는다.
import assert from 'node:assert/strict';
import {createServer} from 'vite';

const {chromium}=await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const server=await createServer({server:{host:'127.0.0.1',port:0}});
await server.listen();
const address=server.httpServer.address();
if(!address || typeof address==='string')throw new Error('테스트 서버 주소 없음');
const browser=await chromium.launch({headless:true,
  ...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{}),
  args:process.env.BROWSER_ARGS?JSON.parse(process.env.BROWSER_ARGS):[],
});
const checks=[];
const errors=[];
try{
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  await page.addInitScript(()=>{if(!localStorage.getItem('hellspresso.settings.v1'))localStorage.setItem('hellspresso.settings.v1',JSON.stringify({renderScale:0.5,shadows:'off'}));});
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  const snap=()=>page.evaluate(()=>window.__HELLSPRESSO_QA__.snapshot());
  const state=desired=>page.waitForFunction(value=>document.querySelector('#app').dataset.state===value,desired,{timeout:5000});
  const ensurePlaying=async()=>{
    try{await page.waitForFunction(()=>document.querySelector('#app').dataset.state==='PLAYING',null,{timeout:1200});}
    catch(error){if((await snap()).state!=='PAUSED')throw error;await page.getByRole('button',{name:'계속하기'}).click();await state('PLAYING');}
  };
  const restart=async()=>{await page.getByRole('button',{name:'새로 시작'}).click();await ensurePlaying();};
  await page.goto(`http://127.0.0.1:${address.port}/?debug=1`);
  await page.waitForFunction(()=>!!window.__HELLSPRESSO_QA__);
  assert.equal(await page.locator('canvas.game-canvas').count(),1);checks.push('WebGL2/menu boot');
  if(process.env.QA_SCREENSHOT_DIR)await page.screenshot({path:`${process.env.QA_SCREENSHOT_DIR}/menu-check.png`});
  await page.getByRole('button',{name:'새 게임 시작'}).click();await ensurePlaying();
  assert.equal(await page.evaluate(()=>!!document.pointerLockElement),true);checks.push('pointer lock entry');
  const first=await snap();await page.keyboard.down('w');await page.waitForTimeout(350);await page.keyboard.up('w');
  assert((await snap()).position.z<first.position.z-0.5);checks.push('W movement');
  let before=await snap();await page.keyboard.press('f');await page.waitForFunction(value=>window.__HELLSPRESSO_QA__.snapshot().resources.stamina<value-9.5,before.resources.stamina);
  assert(Math.abs(before.resources.stamina-(await snap()).resources.stamina-10)<0.5);checks.push('dash 10');
  await page.waitForFunction(()=>{const s=window.__HELLSPRESSO_QA__.snapshot();return s.mode==='GROUND';});before=await snap();await page.keyboard.press('c');await page.waitForFunction(value=>window.__HELLSPRESSO_QA__.snapshot().resources.stamina<value-14.5,before.resources.stamina);
  assert(Math.abs(before.resources.stamina-(await snap()).resources.stamina-15)<0.5);checks.push('slide 15');
  await page.waitForFunction(()=>window.__HELLSPRESSO_QA__.snapshot().mode==='GROUND');await page.keyboard.press('Space');await page.waitForFunction(()=>window.__HELLSPRESSO_QA__.snapshot().jumps===1);
  console.log(JSON.stringify({phase:'first-jump',snapshot:await snap()}));
  await page.keyboard.press('Space');await page.waitForTimeout(120);
  console.log(JSON.stringify({phase:'second-jump',snapshot:await snap()}));
  await page.waitForFunction(()=>window.__HELLSPRESSO_QA__.snapshot().jumps===2,null,{timeout:3000});
  before=await snap();await page.keyboard.press('c');await page.waitForTimeout(120);
  assert((await snap()).resources.stamina>=before.resources.stamina);checks.push('double jump / reject air slide');
  await page.keyboard.press('Tab');await state('INVENTORY');
  assert.equal(await page.evaluate(()=>!!document.pointerLockElement),false);
  before=await snap();await page.waitForTimeout(650);assert((await snap()).resources.caffeine<before.resources.caffeine-0.5);
  assert.equal((await snap()).state,'INVENTORY');checks.push('inventory unlock keeps time running');
  await page.getByRole('button',{name:'게임으로 돌아가기'}).click();await state('PLAYING');
  await page.keyboard.press('Escape');await state('PAUSED');
  before=await snap();await page.waitForTimeout(650);assert(Math.abs((await snap()).resources.caffeine-before.resources.caffeine)<0.05);checks.push('ESC pause freezes CAF');
  await page.getByRole('button',{name:'조작법',exact:true}).click();await page.locator('[data-bind="dash"]').click();await page.keyboard.press('g');
  assert.equal((await page.locator('[data-bind="dash"]').textContent()).trim(),'G');
  await page.reload();await page.waitForFunction(()=>!!window.__HELLSPRESSO_QA__);
  await page.getByRole('button',{name:'조작법',exact:true}).click();assert.equal((await page.locator('[data-bind="dash"]').textContent()).trim(),'G');checks.push('key rebind persists reload');
  await page.getByRole('button',{name:'뒤로',exact:true}).click();await page.getByRole('button',{name:'새 게임 시작'}).click();await ensurePlaying();
  before=await snap();await page.keyboard.press('g');await page.waitForFunction(value=>window.__HELLSPRESSO_QA__.snapshot().resources.stamina<value-9.5,before.resources.stamina);checks.push('rebound dash works');
  await page.evaluate(()=>window.__HELLSPRESSO_QA__.applyDelta({hp:-100}));await state('DEAD');assert.equal((await snap()).cause,'hp');checks.push('HP death');
  await page.evaluate(()=>window.__HELLSPRESSO_QA__.applyDelta({hp:150,caffeine:300}));assert.equal((await snap()).resources.hp,0);checks.push('dead cannot heal');
  await restart();await page.evaluate(()=>window.__HELLSPRESSO_QA__.applyDelta({hp:-100,caffeine:-100}));await state('DEAD');assert.equal((await snap()).cause,'both');checks.push('simultaneous death');
  await restart();await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await state('PAUSED');checks.push('blur handler pauses');
  await page.getByRole('button',{name:'계속하기'}).click();await state('PLAYING');
  await page.evaluate(()=>window.__HELLSPRESSO_QA__.applyDelta({hp:500,caffeine:500}));
  assert.equal((await snap()).resources.hp,150);assert((await snap()).resources.caffeine<=300);checks.push('runtime overcharge clamp');
  await page.keyboard.press('Escape');await state('PAUSED');await page.getByRole('button',{name:'메인 메뉴',exact:true}).click();
  await page.getByRole('button',{name:'새 게임 시작'}).click();await ensurePlaying();
  if(process.env.QA_SCREENSHOT_DIR)await page.screenshot({path:`${process.env.QA_SCREENSHOT_DIR}/play-check.png`});
  console.log(JSON.stringify({phase:'interactive',checks,errors}));
  if(!process.env.QA_SKIP_REAL_CAF){
    await page.waitForFunction(()=>window.__HELLSPRESSO_QA__.snapshot().state==='DEAD',null,{timeout:60000});
    const final=await snap();assert.equal(final.cause,'caffeine');assert(Math.abs(final.elapsed-50)<0.02);checks.push('real 50-second caffeine death');
  }
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({result:'PASS',browser:await browser.version(),checks,errors}));
}finally{await browser.close();await server.close();}
