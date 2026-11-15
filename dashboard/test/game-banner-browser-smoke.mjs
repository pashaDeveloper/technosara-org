import { build } from 'esbuild';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';

const harness = `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import {nabApi} from './src/services/nab';
import StoreCoverPicker from './src/pages/games/StoreCoverPicker';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const requests=[];let selected='';
window.fetch=async(input,init)=>{const request=new Request(input,init);requests.push(request.url);return new Response(JSON.stringify({data:request.url.includes('media/source')?{card_images:['https://images.example/square','https://images.example/portrait','https://images.example/portrait-hd'],banner_images:['https://images.example/square','https://images.example/small','https://images.example/hd','https://images.example/4k']}:{url:'https://store.playstation.com/en-us/product/TEST'}}),{headers:{'Content-Type':'application/json'}});};
window.Image=class{set src(value){this.naturalWidth=value.endsWith('square')?2048:value.endsWith('small')?800:value.endsWith('hd')?1920:3840;this.naturalHeight=value.endsWith('square')?2048:value.endsWith('4k')?2160:1080;if(value.includes('portrait')){this.naturalWidth=value.endsWith('hd')?800:400;this.naturalHeight=value.endsWith('hd')?1200:600;}setTimeout(()=>this.onload?.(),10);}};
const store=configureStore({reducer:{[nabApi.reducerPath]:nabApi.reducer},middleware:get=>get().concat(nabApi.middleware)});
const root=createRoot(document.getElementById('root'));root.render(<Provider store={store}><StoreCoverPicker kind="banner" auto title="Halo Infinite" officialStores="[]" offers="[]" onSelect={url=>{selected=url;}} /></Provider>);
try{for(let i=0;i<100&&!selected;i++)await pause(40);if(selected!=='https://images.example/4k')throw Error('highest-quality wide banner not selected: '+selected);if(requests.filter(url=>url.includes('media/source')).length!==1)throw Error('unexpected source requests');selected='';root.render(<Provider store={store}><StoreCoverPicker key='portrait' kind='portrait' auto title='Halo Infinite' officialStores='[]' offers='[]' onSelect={url=>{selected=url;}} /></Provider>);for(let i=0;i<100&&!selected;i++)await pause(40);if(selected!=='https://images.example/portrait-hd')throw Error('highest-quality portrait not selected: '+selected);document.body.dataset.test='PASS';}catch(error){document.body.dataset.test='FAIL: '+error.message;}
`;
const bundle = await build({ plugins: [{ name: 'inline-css', setup(build) { build.onLoad({filter:/\.css\?inline$/}, async args => ({contents: 'export default '+JSON.stringify(await readFile(args.path.replace(/\?inline$/, ''), 'utf8')), loader:'js'})); build.onResolve({filter:/\.css\?inline$/}, args => ({path:resolve(args.resolveDir,args.path)})); } }], stdin: { contents: harness, resolveDir: resolve('.'), loader: 'jsx' }, jsx: 'automatic', alias: { '@': resolve('src') }, bundle: true, write: false, format: 'esm', define: { 'process.env.NODE_ENV': '"production"' } });
const server = createServer((request, response) => {
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
