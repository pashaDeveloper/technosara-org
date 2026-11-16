import { build } from 'esbuild';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';

const harness = "\nimport React from 'react';import{createRoot}from'react-dom/client';import GameDetailPreview from './src/pages/games/GameDetailPreview';\nconst pause=ms=>new Promise(r=>setTimeout(r,ms));\nconst trophies=Array.from({length:7},(_,i)=>({external_id:String(i),name:'PS trophy '+i,description:'Preview detail '+i,achievement_type:'platinum'}));\ncreateRoot(document.getElementById('root')).render(<GameDetailPreview game={{title:'Test',rating:{mean:0.8,count:123,mean_players:0.9,mean_critics:0.7},playtime:{mean:25,median:24}}} resources={{trophies:[{provider:'psn',trophies},{provider:'openxbl',trophies:[{name:'Xbox trophy',icon_url:'https://example.com/icon.png',achievement_type:'standard',points:20}]}],dlc:Array.from({length:5},(_,i)=>({provider:'playstation',content:{title:'DLC '+i}}))}}/>);\nasync function until(check,label){for(let i=0;i<150;i++){if(check())return;await pause(30)}throw Error(label)}\ntry{await until(()=>document.querySelector('iframe')?.contentDocument.querySelector('#purchase-tab-trophy'),'preview missing');const doc=document.querySelector('iframe').contentDocument;doc.querySelector('#purchase-tab-trophy').click();await until(()=>doc.body.textContent.includes('PS trophy 0'),'trophies missing');if(doc.querySelectorAll('.edge-purchase-items article').length!==3)throw Error('page size wrong');doc.querySelector('.edge-resource-pagination button[aria-label=\"Next page\"]').click();await until(()=>doc.body.textContent.includes('PS trophy 3'),'next page failed');if(!doc.querySelector('.edge-trophy-platinum'))throw Error('platinum badge missing');doc.querySelectorAll('.edge-resource-tabs button')[1].click();await until(()=>doc.body.textContent.includes('Xbox trophy'),'Xbox tab failed');doc.querySelector('#purchase-tab-dlc').click();await pause(60);doc.queryRADE=0;doc.querySelectorAll('.edge-resource-tabs button')[0].click();await until(()=>doc.body.textContent.includes('DLC 0'),'DLC tab failed');doc.querySelector('.edge-resource-pagination button[aria-label=\"Next page\"]').click();await until(()=>doc.body.textContent.includes('DLC 3'),'DLC pagination failed');if(doc.querySelectorAll('.edge-purchase-items article').length!==2)throw Error('DLC last page wrong');if(doc.querySelectorAll('.edge-resource-tabs button').length!==1)throw Error('empty DLC platform visible');if(doc.querySelector('.edge-dlc-item p'))throw Error('DLC description visible');\nconst review=doc.querySelector('.edge-reviews');if(review.textContent.includes('234')||review.textContent.includes('94%'))throw Error('fabricated reviews');if(!review.querySelector('.edge-review-comments .edge-skeleton'))throw Error('review skeleton missing');\nif(!doc.querySelector('.edge-game-ratings').textContent.includes('\\u06f8'))throw Error('score out of ten missing');if(!doc.querySelector('.edge-playtime').textContent.includes('\\u06f2\\u06f5'))throw Error('playtime missing');document.body.dataset.test='PASS';}catch(e){document.body.dataset.test='FAIL: '+e.message;}\n";
const bundle = await build({ plugins: [{ name: 'inline-css', setup(build) { build.onLoad({filter:/\.css\?inline$/}, async args => ({contents: 'export default '+JSON.stringify(await readFile(args.path.replace(/\?inline$/, ''), 'utf8')), loader:'js'})); build.onResolve({filter:/\.css\?inline$/}, args => ({path:resolve(args.resolveDir,args.path)})); } }], stdin: { contents: harness, resolveDir: resolve('.'), loader: 'jsx' }, jsx: 'automatic', alias: { '@': resolve('src') }, bundle: true, write: false, format: 'esm', define: { 'process.env.NODE_ENV': '"production"' } });
const server = createServer((request, response) => {
  response.setHeader('Content-Type', request.url === '/app.js' ? 'text/javascript' : 'text/html');
  response.end(request.url === '/app.js' ? bundle.outputFiles[0].text : '<html><body><div id="root"></div><script type="module" src="/app.js"></script></body></html>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const profile = await mkdtemp(join(tmpdir(), 'gamebrain-lookup-'));
const browser = spawn(process.env.DASHBOARD_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', '--no-first-run', '--disable-gpu', '--disable-extensions', '--disable-background-networking', `--user-data-dir=${profile}`, '--remote-debugging-port=0', `http://127.0.0.1:${server.address().port}`], { windowsHide: true });
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
  console.log(status || 'No browser test result'); if (status !== 'PASS') process.exitCode = 1;
} finally { socket?.close(); browser.kill(); server.close(); }
