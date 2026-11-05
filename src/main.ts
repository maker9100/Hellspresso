import './styles.css';
import { Game } from './core/Game';

const root=document.querySelector<HTMLElement>('#app');
if(!root)throw new Error('게임 루트가 없다.');
try {
  const game=new Game(root);
  window.addEventListener('pagehide',event=>{if(!event.persisted)game.dispose();});
  if(import.meta.hot)import.meta.hot.dispose(()=>game.dispose());
}catch(error){
  root.replaceChildren();
  const message=document.createElement('div');message.className='fatal-error';
  const heading=document.createElement('h1');heading.textContent='HELLSPRESSO';
  const text=document.createElement('p');text.textContent='3D 화면을 시작할 수 없다. WebGL2와 하드웨어 가속을 확인해 주세요.';
  const detail=document.createElement('pre');detail.textContent=error instanceof Error?error.message:String(error);
  message.append(heading,text,detail);root.append(message);console.error(error);
}
