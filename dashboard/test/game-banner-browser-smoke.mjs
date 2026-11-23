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
import GameImageAsset from './src/pages/games/GameImageAsset';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const requests=[];let selected='';
window.fetch=async(input,init)=>{const request=new Request(input,init);requests.push(request.url);return new Response(JSON.stringify({data:request.url.includes('media/source')?{card_images:['https://images.example/square','https://images.example/portrait','https://images.example/portrait-hd'],banner_images:['https://images.example/square-alt','https://images.example/square','https://images.example/4k']}:{url:'https://store.playstation.com/en-us/product/TEST'}}),{headers:{'Content-Type':'application/json'}});};
window.Image=class{set src(value){const sizes={square:[2048,2048],'square-alt':[1600,1600],portrait:[400,600],'portrait-hd':[800,1200],'4k':[3840,2160]};[this.naturalWidth,this.naturalHeight]=sizes[value.split('/').pop()];setTimeout(()=>this.onload?.(),10);}};
const store=configureStore({reducer:{[nabApi.reducerPath]:nabApi.reducer},middleware:get=>get().concat(nabApi.middleware)});
const root=createRoot(document.getElementById('root'));root.render(<Provider store={store}><StoreCoverPicker kind="detail" auto title="Halo Infinite" officialStores="[]" offers="[]" onSelect={url=>{selected=url;}} /></Provider>);
const expectSelection=async(name)=>{
  const expected='https://images.example/'+name;
  for(let i=0;i<100&&selected!==expected;i++)await pause(40);
  if(selected!==expected)throw Error('expected '+expected+', received '+selected);
};
const sourceRequests=()=>requests.filter(url=>url.includes('media/source')).length;
const choose=async(button,name)=>{
  for(let i=0;i<100&&button.disabled;i++)await pause(40);
  if(button.disabled)throw Error('store button stayed disabled');
  selected='';
  button.click();
  await expectSelection(name);
};
try{
  await expectSelection('4k');
  if(sourceRequests()!==1)throw Error('unexpected initial source requests');
  const [sony,xbox]=document.querySelectorAll('button');
  await choose(sony,'square');
  await choose(xbox,'4k');
  await choose(sony,'square-alt');
  await choose(xbox,'square');
  await choose(sony,'portrait-hd');
  await choose(sony,'portrait');
  await choose(sony,'4k');
  await choose(sony,'square');
  if(sourceRequests()!==2)throw Error('cycling fetched the same source again');
  selected='';
  root.render(<Provider store={store}><StoreCoverPicker key='portrait' kind='portrait' auto title='Halo Infinite' officialStores='[]' offers='[]' onSelect={url=>{selected=url;}} /></Provider>);
  await expectSelection('portrait-hd');
  const brokenStore='https://store.playstation.com/en-us/product/OLD';
  const liveStore='https://store.playstation.com/en-us/product/NEW';
  const storeRequests=[];
  const fetchStore=window.fetch;
  window.fetch=async(input,init)=>{
    const request=new Request(input,init);
    const body=await request.json();
    storeRequests.push(body);
    if(request.url.includes('store-descriptions'))return Response.json({data:{url:liveStore}});
    if(body.url===brokenStore)return Response.json({description:'Store unavailable'},{status:502});
    return Response.json({data:{card_images:['https://images.example/portrait']}});
  };
  selected='';
  root.render(<Provider store={store}><StoreCoverPicker key="retry" kind="detail" auto title="Halo Infinite"
    officialStores={JSON.stringify([{url:brokenStore}])} offers="[]" onSelect={url=>{selected=url;}} /></Provider>);
  await expectSelection('portrait');
  if(storeRequests.length!==3||storeRequests[1].url||storeRequests[2].url!==liveStore)throw Error('saved store lookup did not retry by title');
  window.fetch=fetchStore;
  const stored='https://res.cloudinary.com/demo/saved.webp';
  const uploaded='https://res.cloudinary.com/demo/square.webp';
  const originalFetch=window.fetch;
  let pending=false, value=stored, imported;
  window.fetch=async(input,init)=>{
    const request=new Request(new URL(typeof input==='string'?input:input.url,location.origin),init);
    if(!request.url.endsWith('/media/import'))return originalFetch(input,init);
    imported=await request.json();
    return Response.json({data:{detail_banner:[{url:uploaded,bytes:9000}]}});
  };
  function Asset(){
    const [mirrored,setMirrored]=React.useState(false);
    return <GameImageAsset fieldName="detail_banner" value={stored} onChange={url=>{value=url;}}
    gameTitle="Halo Infinite" onPendingChange={state=>{pending=state;}}
    mirrored={mirrored} onToggleMirror={()=>setMirrored(!mirrored)}
    sourcePicker={stage=><button id="stage" onClick={()=>stage('https://images.example/4k')}>Stage</button>} />;
  }
  root.render(<Asset />);
  for(let i=0;i<100&&!document.querySelector('#stage');i++)await pause(40);
  document.querySelector('#stage').click();
  const staged=()=>document.querySelector('img.object-contain[src="https://images.example/4k"]');
  for(let i=0;i<100&&!staged();i++)await pause(40);
  if(!pending||value!==stored||!staged())throw Error('wide candidate was not staged at its original aspect ratio');
  const mirror=document.querySelector('button[aria-pressed="false"]');
  mirror.click();
  for(let i=0;i<100&&mirror.getAttribute('aria-pressed')!=='true';i++)await pause(40);
  if(staged().style.transform!=='scaleX(-1)')throw Error('mirror did not flip the image');
  mirror.click();
  for(let i=0;i<100&&mirror.getAttribute('aria-pressed')!=='false';i++)await pause(40);
  if(staged().style.transform)throw Error('mirror did not restore the image');
  document.querySelector('button[title="آپلود تصویر"]').click();
  for(let i=0;i<100&&value!==uploaded;i++)await pause(40);
  if(value!==uploaded||pending||imported?.url!=='https://images.example/4k'||imported?.fieldName!=='detail_banner')throw Error('confirmed cover was not imported');
  document.body.dataset.test='PASS';
}catch(error){document.body.dataset.test='FAIL: '+error.message;}
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
