import { build } from 'esbuild';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';

const harness = "\nimport React from 'react';import {createRoot} from 'react-dom/client';import {Provider} from 'react-redux';import {configureStore} from '@reduxjs/toolkit';\nimport {nabApi} from './src/services/nab';import GameDlcImport from './src/pages/games/GameDlcImport';import GameTrophies from './src/pages/games/GameTrophies';\nconst pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));let writes=[];\nwindow.addEventListener('error',event=>{document.body.dataset.test='FAIL: '+(event.error?.stack||event.message)});\nwindow.addEventListener('unhandledrejection',event=>{document.body.dataset.test='FAIL: '+event.reason?.message});\nwindow.fetch=async(input,init)=>{const r=new Request(input,init),u=new URL(r.url);let data=[];\n if(u.pathname.endsWith('/trophies/status'))data={providers:{openxbl:true,psn:false,platprices:false}};\n else if(u.pathname.endsWith('/dlc/discover'))data={items:[{provider:'xbox',app_id:'child',parent_app_id:'parent',title:'Test Expansion'}],errors:[]};\n else if(u.pathname.endsWith('/dlc/import')){writes.push('dlc');data={title:'Test Expansion',content:{description:'Persian',image:'https://example.com/a.png'}};}\n else if(u.pathname.endsWith('/trophies/candidates'))data=[{title:'Test Game',ppid:'set',platforms:['xbox_one']}];\n else if(u.pathname.endsWith('/trophies/preview'))data={provider:'openxbl',ppid:'set',platform:'xbox_one',total:1,game:{title:'Test Game'},counts:{standard:1},trophies:[{external_id:'1',name:'English',name_fa:'FA',description_fa:'FA',achievement_type:'standard'}]};\n else if(u.pathname.endsWith('/trophies/import')){writes.push('trophy');data={saved:1};}\n return new Response(JSON.stringify({data}),{headers:{'Content-Type':'application/json'}});\n};\nconst store=configureStore({reducer:{[nabApi.reducerPath]:nabApi.reducer},middleware:get=>get().concat(nabApi.middleware)});\nconst source=JSON.stringify([{url:'https://www.xbox.com/en-US/games/store/test/ABCDEFGHIJKL'}]);\ncreateRoot(document.getElementById('root')).render(<Provider store={store}><GameDlcImport gameId=\"507f1f77bcf86cd799439011\" title=\"Test Game\" officialStores={source} offers=\"[]\"/><GameTrophies gameId=\"507f1f77bcf86cd799439011\" title=\"Test Game\" officialStores={source} offers=\"[]\"/></Provider>);\ntry{for(let i=0;i<200&&writes.length<2;i++)await pause(25);if(!writes.includes('dlc')||!writes.includes('trophy'))throw Error('Import waited for a button: '+writes.join(','));document.body.dataset.test='PASS';}catch(error){document.body.dataset.test||='FAIL: '+error.message;}\n";
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
