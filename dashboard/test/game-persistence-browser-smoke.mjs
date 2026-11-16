import { build } from 'esbuild';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';

const harness = "\nimport React,{useState} from 'react';\nimport {createRoot} from 'react-dom/client';\nimport {useForm} from 'react-hook-form';\nimport {formValues,definition} from './src/pages/games/definitions';\nimport {useGamePersistence} from './src/pages/games/useGamePersistence';\nconst pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));\nconst db={_id:'game',id:123,title:'Test Game',slug:'test-game',auto_draft:true,status:'released',storage_sizes:[],platform_capabilities:[],developer_ids:[],image:'https://res.cloudinary.com/demo/deleted.webp'};\nlet active=0,maxActive=0;\nwindow.fetch=async(url,init)=>{\n if(url.endsWith('/recover')){await pause(40);db.image='https://example.com/restored.jpg';db.release_date='2026-01-01';return Response.json({data:{record:structuredClone(db),warnings:[]}});}\n if(url.endsWith('/autosave')){active++;maxActive=Math.max(active,maxActive);await pause(150);Object.assign(db,JSON.parse(init.body));active--;return Response.json({data:{saved:true}});}\n throw Error('Unexpected request '+url);\n};\nfunction Form(){const {watch,getValues,setValue}=useForm({defaultValues:formValues(definition,db)});const values=watch();const persistence=useGamePersistence({storedGame:db,values,getValues,setValue,ready:true});window.setField=setValue;window.values=getValues;window.persist=persistence;return <div>{persistence.state}</div>;}\nfunction App(){const [shown,setShown]=useState(true);window.show=setShown;return shown?<Form/>:null;}\ncreateRoot(document.getElementById('root')).render(<App/>);\nasync function until(check,label){for(let i=0;i<200;i++){if(check())return;await pause(25)}throw Error(label);}\ntry{\n await until(()=>window.persist&&!window.persist.recovering&&window.values('image')==='https://example.com/restored.jpg','missing media not restored');\n window.setField('storage_sizes',JSON.stringify([{platform:'pc',bytes:1000,kind:'install',provider:'manual',source_url:'https://example.com',checked_at:'2026-01-01'}]));\n await until(()=>db.storage_sizes.length===1,'size not autosaved');\n window.setField('developer_ids',['company']);await until(()=>active===1,'save did not start');\n window.setField('platform_capabilities',JSON.stringify([{platform_id:'ps5',status:{hdr:true}}]));await pause(30);window.show(false);\n await until(()=>db.platform_capabilities.length===1,'exit lost pending changes');\n if(maxActive!==1)throw Error('autosave writes raced');if(db.auto_draft!==true)throw Error('draft finalized');\n window.show(true);await until(()=>window.values('storage_sizes').includes('1000')&&window.values('platform_capabilities').includes('hdr'),'saved form did not restore');\n document.body.dataset.test='PASS';\n}catch(error){document.body.dataset.test='FAIL: '+error.message;}\n";
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
