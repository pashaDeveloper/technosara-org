import { build } from 'esbuild';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';

const harness = "\nimport React from 'react';import {createRoot} from 'react-dom/client';import {Provider} from 'react-redux';import {configureStore} from '@reduxjs/toolkit';import {MemoryRouter} from 'react-router-dom';import {nabApi} from './src/services/nab';import GameForm from './src/pages/games/GameForm';\nconst pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));let calls=[];\nwindow.addEventListener('error',e=>document.body.dataset.test='FAIL: '+(e.error?.stack||e.message));window.addEventListener('unhandledrejection',e=>document.body.dataset.test='FAIL: '+e.reason?.message);\nwindow.fetch=async(input,init)=>{const r=new Request(input,init);calls.push({path:new URL(r.url).pathname,method:r.method});return new Response(JSON.stringify({data:[]}),{headers:{'Content-Type':'application/json'}})};\nconst record={_id:'507f1f77bcf86cd799439011',id:42,title:'Stored Game',name:'Stored Game',slug:'stored-game',status:'released',description:'Saved description',short_description:'Saved short',image:'https://res.cloudinary.com/demo/image/upload/game/stored/card-a.webp',detail_banner:'https://res.cloudinary.com/demo/image/upload/game/stored/cover-b.webp',storage_sizes:[],platform_ids:[],saved_resources:{dlc:[{provider:'xbox',app_id:'DLC',title:'Saved Expansion',content:{title:'Saved Expansion',description:'Saved DLC description'}}],trophies:[{key:'group',provider:'psn',platform:'ps5',game:{title:'Stored Game'},counts:{gold:1},total:1,trophies:[{external_id:'1',name:'Saved trophy',name_fa:'FA',description_fa:'FA',achievement_type:'gold'}]}]}};\nconst store=configureStore({reducer:{[nabApi.reducerPath]:nabApi.reducer},middleware:get=>get().concat(nabApi.middleware)});createRoot(document.getElementById('root')).render(<Provider store={store}><MemoryRouter><GameForm record={record} onSubmit={()=>{}}/></MemoryRouter></Provider>);\ntry{await pause(3000);const external=calls.filter(r=>r.method==='POST'||r.path.includes('/lookup')||r.path.includes('/trophies/status'));if(external.length)throw Error('Edit fetched remote sources: '+JSON.stringify(external));if(document.getElementById('game-description')?.value!=='Saved description')throw Error('Saved text replaced');if(!document.body.textContent.includes('Saved Expansion')||!document.body.textContent.includes('Saved trophy'))throw Error('Stored related data missing');document.body.dataset.test='PASS';}catch(e){document.body.dataset.test||='FAIL: '+e.message;}\n";
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
