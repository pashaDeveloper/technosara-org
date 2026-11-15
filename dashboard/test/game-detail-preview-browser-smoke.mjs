import { build } from 'esbuild';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';

const harness = `
import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import GameDetailPreview from './src/pages/games/GameDetailPreview';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
window.addEventListener('error',event=>{document.body.dataset.test='FAIL: '+event.message;});
function App(){const [title,setTitle]=useState('Call of Duty: Black Ops 6');window.updatePreview=()=>setTitle('Halo Infinite');return <GameDetailPreview game={{title, image:location.origin+'/cover.jpg', detail_banner:location.origin+'/cover.jpg', short_description:'A cinematic adventure across new worlds.', description:'Explore the world and discover a new adventure.', platform_ids:['ps5','pc'], genre_ids:['action'], screenshots:JSON.stringify([location.origin+'/cover.jpg']), rating:'{"mean":0.92}',playtime:'{"median":12}'}} platforms={{data:{data:[{_id:'ps5',name:'PlayStation 5'},{_id:'pc',name:'PC'}]}}} genres={{data:{data:[{_id:'action',name:'Action'}]}}} />;}
createRoot(document.getElementById('root')).render(<App/>);
async function until(check,label){for(let i=0;i<100;i++){if(check())return;await pause(30);}throw Error(label);}
try{
await until(()=>document.querySelector('iframe')?.contentDocument.querySelector('h1'),'preview missing');
const frame=()=>document.querySelector('iframe');const doc=()=>frame().contentDocument;
if(!doc().querySelector('h1').textContent.includes('Black Ops'))throw Error('title missing');
if(doc().querySelector('.edge-hero-art').style.backgroundImage)throw Error('card image reused as detail banner');
if(doc().querySelector('.edge-discount').textContent!=='۳۲٪ تخفیف در آخر هفته‌ها')throw Error('reference header missing');
if(doc().querySelector('.edge-buy').textContent.trim()!=='خرید بازی')throw Error('buy button missing');
doc().querySelectorAll('.edge-editions button')[1].click();await pause(80);
if(doc().querySelectorAll('.edge-editions button')[1].getAttribute('aria-pressed')!=='true')throw Error('edition selection failed');
doc().querySelector('.edge-buy').click();await until(()=>doc().querySelector('[role=status]'),'preview purchase notice missing');
doc().querySelector('.edge-gallery-main').click();await until(()=>doc().querySelector('.edge-lightbox'),'gallery failed');doc().querySelector('.edge-lightbox button').click();
window.updatePreview();await until(()=>doc().querySelector('h1').textContent==='Halo Infinite','live update failed');
if(doc().defaultView.getComputedStyle(doc().body).fontFamily.indexOf('Vazir')<0)throw Error('preview typography missing');
document.querySelectorAll('button')[1].click();await pause(100);if(frame().style.width!=='390px')throw Error('mobile toggle failed');
if(doc().documentElement.scrollWidth>390)throw Error('mobile horizontal overflow');
document.querySelectorAll('button')[2].click();await until(()=>document.querySelector('[role=dialog]'),'fullscreen failed');
document.querySelectorAll('button')[2].click();await until(()=>!document.querySelector('[role=dialog]'),'fullscreen close failed');
document.querySelectorAll('button')[0].click();await pause(100);
if(doc().documentElement.scrollWidth>frame().clientWidth+1)throw Error('preview overflows');
await doc().fonts.ready;
if(doc().documentElement.lang!=='fa'||doc().querySelector('main').dir!=='rtl')throw Error('Persian layout missing');
if(!doc().fonts.check('16px Vazir'))throw Error('Vazir font did not load');
document.body.dataset.test='PASS';
}catch(error){document.body.dataset.test='FAIL: '+error.message;}
`;
const bundle = await build({ plugins: [{ name: 'inline-css', setup(build) { build.onLoad({filter:/\.css\?inline$/}, async args => ({contents: 'export default '+JSON.stringify(await readFile(args.path.replace(/\?inline$/, ''), 'utf8')), loader:'js'})); build.onResolve({filter:/\.css\?inline$/}, args => ({path:resolve(args.resolveDir,args.path)})); } }], stdin: { contents: harness, resolveDir: resolve('.'), loader: 'jsx' }, jsx: 'automatic', alias: { '@': resolve('src') }, bundle: true, write: false, format: 'esm', define: { 'process.env.NODE_ENV': '"production"' } });
const server = createServer((request, response) => {
  if(request.url==='/fonts/vazir/Vazir.woff2'){response.setHeader('Content-Type','font/woff2');readFile(resolve('public/fonts/vazir/Vazir.woff2')).then(data=>response.end(data));return;}
  if(request.url.startsWith('/game-preview/')){const file=request.url.endsWith('reference.png')?'reference.png':'bo6.jpg';response.setHeader('Content-Type',file.endsWith('png')?'image/png':'image/jpeg');readFile(resolve('public/game-preview',file)).then(data=>response.end(data));return;}
  if(request.url==='/cover.jpg'){response.setHeader('Content-Type','image/jpeg');readFile(resolve('../client/edge-game-detail/bo6.jpg')).then(data=>response.end(data));return;}
  response.setHeader('Content-Type', request.url === '/app.js' ? 'text/javascript' : 'text/html');
  response.end(request.url === '/app.js' ? bundle.outputFiles[0].text : '<html><body><div id="root"></div><script type="module" src="/app.js"></script></body></html>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const profile = await mkdtemp(join(tmpdir(), 'gamebrain-lookup-'));
const browser = spawn(process.env.DASHBOARD_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', '--window-size=1640,2500', '--no-first-run', '--disable-gpu', '--disable-extensions', '--disable-background-networking', `--user-data-dir=${profile}`, '--remote-debugging-port=0', `http://127.0.0.1:${server.address().port}`], { windowsHide: true });
let logs = '', socket;
browser.stderr.on('data', data => { logs += data; }); browser.stdout.resume();
const pause = () => new Promise(resolve => setTimeout(resolve, 100));
try {
  for (let i = 0; i < 100 && !logs.includes('DevTools listening'); i++) await pause();
  const endpoint = logs.match(/DevTools listening on (ws:\/\/[^\s]+)/)?.[1];
  if (!endpoint) throw Error('Browser did not start');
  const targets = await (await fetch(`http://${new URL(endpoint).host}/json/list`)).json();
  socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
  await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
  let id = 0; const pending = new Map();
  socket.addEventListener('message', event => { const message = JSON.parse(event.data); if (message.id) { pending.get(message.id)?.(message.result); pending.delete(message.id); } });
  const evaluate = expression => new Promise(resolve => { pending.set(++id, resolve); socket.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression, returnByValue: true } })); });
  let status;
  for (let i = 0; i < 200; i++) { status = (await evaluate('document.body.dataset.test')).result?.value; if (status) break; await pause(); }
  if(status==='PASS'){const shot=await new Promise(resolve=>{pending.set(++id,resolve);socket.send(JSON.stringify({id,method:'Page.captureScreenshot',params:{format:'png'}}));});await writeFile(join(tmpdir(),'game-detail-preview.png'),Buffer.from(shot.data,'base64'));}
  console.log(status || 'No browser test result'); if (status !== 'PASS') process.exitCode = 1;
} finally { socket?.close(); browser.kill(); server.close(); }
