import { build } from 'esbuild';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';

const harness = "\nimport React,{useState} from 'react';\nimport {createRoot} from 'react-dom/client';\nimport GameImageAsset from './src/pages/games/GameImageAsset';\nconst pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));\nlet calls=0;\nwindow.XMLHttpRequest=class{constructor(){this.upload={};}open(){}setRequestHeader(){}send(){calls++;this.status=200;this.responseText=JSON.stringify({acknowledgement:true,data:{thumbnail:[{url:'https://res.cloudinary.com/demo/new.webp',bytes:100,original_bytes:200}]}});setTimeout(()=>this.onload(),20);}};\nwindow.fetch=async()=>{calls++;return Response.json({data:{thumbnail:[{url:'https://res.cloudinary.com/demo/new.webp',bytes:100,original_bytes:200}]}});};\nfunction App(){const [value,setValue]=useState('https://res.cloudinary.com/demo/original.webp');window.currentValue=value;window.replace=setValue;return <GameImageAsset value={value} onChange={setValue} gameTitle='Test' animated/>;}\ncreateRoot(document.getElementById('root')).render(<App/>);\nconst uploadButton=()=>document.querySelector('path[d=\"M12 16V3m-5 5 5-5 5 5M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5\"]')?.closest('button');\nasync function until(check,label){for(let i=0;i<150;i++){if(check())return;await pause(25)}throw Error(label);}\ntry{\n await until(()=>document.querySelector('input[type=file]'),'asset missing');\n if(uploadButton())throw Error('uploaded image still offers upload');\n const input=document.querySelector('input[type=file]');const transfer=new DataTransfer();transfer.items.add(new File(['test'],'replacement.webp',{type:'image/webp'}));input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));\n await until(()=>uploadButton(),'replacement did not restore upload button');uploadButton().click();\n await until(()=>window.currentValue.includes('/new.webp'),'replacement did not upload');\n if(uploadButton())throw Error('upload button remained after upload');if(calls!==1)throw Error('duplicate upload');\n window.replace('https://example.com/different.webp');await until(()=>uploadButton(),'remote replacement did not restore upload button');\n document.body.dataset.test='PASS';\n}catch(error){document.body.dataset.test='FAIL: '+error.message;}\n";
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
