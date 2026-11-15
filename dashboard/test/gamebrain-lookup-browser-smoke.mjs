import { build } from 'esbuild';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';

const harness = `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import {MemoryRouter} from 'react-router-dom';
import {nabApi} from './src/services/nab';
import GameForm from './src/pages/games/GameForm';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
window.addEventListener('error',event=>{document.body.dataset.test='FAIL: '+(event.error?.stack || event.message);});
window.addEventListener('unhandledrejection',event=>{document.body.dataset.test='FAIL: '+event.reason?.message;});
let requests=[], submitted;
window.fetch=async(input,init)=>{
 const request=new Request(input,init);const url=new URL(request.url);requests.push({path:url.pathname,method:request.method,query:url.searchParams.get('query')});
 let data=[];
 if(url.pathname.endsWith('/games/dlc/discover'))data={items:[],errors:[]};
 if(url.pathname.endsWith('/games/lookup')){const name=url.searchParams.get('query');data={results:[{id:name==='Halo'?2:1,name:name==='Halo'?'Halo Infinite':'God of War',year:2018,saved:true}]};}
 else if(url.pathname.endsWith('/games/lookup/1')){await pause(700);data={id:1,name:'God of War',developer:'Santa Monica',themes:[{value:'fantasy',name:'Fantasy'}]};}
 else if(url.pathname.endsWith('/games/lookup/2')){data={id:2,name:'Halo Infinite',release_date:'2021-12-08',description:'Original Gamebrain',short_description:'Short',developer:'343 Industries',themes:[{value:'science_fiction',name:'Science Fiction'}]};return new Response(JSON.stringify({data,local:{created:true,record:{_id:'507f1f77bcf86cd799439011',auto_draft:true,...data}}}),{headers:{'Content-Type':'application/json'}});}
 if(url.pathname.includes('/translation'))return new Response(JSON.stringify({translation:'Translated Gamebrain'}),{headers:{'Content-Type':'application/json'}});
 return new Response(JSON.stringify({data}),{headers:{'Content-Type':'application/json'}});
};
const store=configureStore({reducer:{[nabApi.reducerPath]:nabApi.reducer},middleware:get=>get().concat(nabApi.middleware)});
const root=createRoot(document.getElementById('root'));root.render(<Provider store={store}><MemoryRouter><GameForm onSubmit={(body,save,id)=>{submitted={body,id}}} /></MemoryRouter></Provider>);
async function until(check,label){for(let i=0;i<100;i++){if(check())return;await pause(30);}throw Error(label);}
const type=value=>{const input=document.getElementById('game-title');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));};
try{
 await until(()=>document.getElementById('game-title'),'form not rendered');
 type('God');await until(()=>document.querySelector('[role=option]'),'suggestions missing');if(!document.querySelector('[role=option] .bg-emerald-500'))throw Error('Saved indicator missing');
 const input=document.getElementById('game-title');input.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));await pause(30);input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
 await until(()=>input.value==='God of War','keyboard selection failed');
 type('Halo');await until(()=>document.querySelector('[role=option] button')?.textContent.includes('Halo'),'new suggestions missing');document.querySelector('[role=option] button').click();
 await until(()=>document.querySelector('iframe')?.contentDocument?.querySelector('h1')?.textContent==='Halo Infinite','selected details missing');await pause(900);
 if(document.querySelector('input[name=developer]')?.value==='Santa Monica')throw Error('stale details replaced current selection');
 if(document.querySelector('iframe')?.contentDocument?.querySelector('h1')?.textContent!=='Halo Infinite')throw Error('stale details replaced current selection');
 if(document.getElementById('game-slug').value!=='halo-infinite')throw Error('slug not updated');
 if(requests.some(request=>request.method!=='GET'&&!request.path.includes('/translation')&&!request.path.includes('/games/lookup/')&&!['/games/store-descriptions','/games/media/source','/games/dlc/discover'].some(path=>request.path.endsWith(path))))throw Error('selection wrote to catalog');
 const desc=document.getElementById('game-description');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(desc,'Manual text');desc.dispatchEvent(new Event('input',{bubbles:true}));await pause(50);
 document.querySelector('button[aria-label*=Gamebrain]').click();await until(()=>document.getElementById('game-short_description').value==='Translated Gamebrain','reset did not restore source');
 const reset=[...document.querySelectorAll('button[aria-label*=Gamebrain]')][1];reset.click();await until(()=>desc.value==='Translated Gamebrain','full description reset failed');
 await pause(1500);document.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await pause(300);if(!submitted)throw Error('final submit missing: '+[...document.querySelectorAll('[role=alert]')].map(x=>x.textContent).join(';'));if(submitted.id!=='507f1f77bcf86cd799439011')throw Error('saved record not updated');
 type('x');await pause(400);if(document.querySelector('iframe')?.contentDocument?.body.textContent.includes('343 Industries'))throw Error('old preview retained after name change');
 document.body.dataset.test='PASS';
}catch(error){document.body.dataset.test ||= 'FAIL: '+error.message;}
`;
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
