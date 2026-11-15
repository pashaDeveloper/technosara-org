import { build } from 'esbuild';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';

const harness = '\nimport React,{useState} from \'react\';\nimport {createRoot} from \'react-dom/client\';\nimport ScreenshotGallery from \'./src/pages/games/ScreenshotGallery\';\nconst pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));\nwindow.addEventListener(\'error\',event=>{document.body.dataset.test=\'FAIL: \'+(event.error?.stack||event.message)});\nwindow.addEventListener(\'unhandledrejection\',event=>{document.body.dataset.test=\'FAIL: \'+event.reason?.message});\nlet calls=[],active=0,maxActive=0;\nwindow.fetch=async(input,init)=>{\n const request=new Request(input,init);const body=await request.json();calls.push(body);active++;maxActive=Math.max(active,maxActive);await pause(60);active--;\n if(body.url.includes(\'fail\'))return new Response(JSON.stringify({description:\'Test failure\'}),{status:502,headers:{\'Content-Type\':\'application/json\'}});\n return new Response(JSON.stringify({data:{screenshot:[{url:\'https://res.cloudinary.com/demo/image/upload/\'+calls.length+\'.webp\',bytes:1000,original_bytes:30000}]}}),{headers:{\'Content-Type\':\'application/json\'}});\n};\nfunction App(){const [value,setValue]=useState(JSON.stringify([\'https://example.com/one.jpg\',\'https://example.com/fail.jpg\',\'https://example.com/three.jpg\']));const [busy,setBusy]=useState(false);window.currentValue=value;return <ScreenshotGallery value={value} onChange={setValue} gameTitle="Test" disabled={busy} onBusyChange={setBusy}/>;}\ncreateRoot(document.getElementById(\'root\')).render(<App/>);\nasync function until(check,label){for(let i=0;i<150;i++){if(check())return;await pause(25)}throw Error(label)}\ntry{\n await until(()=>document.querySelectorAll(\'button[aria-haspopup=dialog]\').length===3,\'images missing\');\n document.querySelector(\'button.bg-blue-600\').click();await until(()=>calls.length===3&&active===0,\'batch incomplete\');await pause(200);\n const values=JSON.parse(window.currentValue);if(!values[0].includes(\'cloudinary\')||!values[1].includes(\'fail\')||!values[2].includes(\'cloudinary\'))throw Error(\'partial failure lost valid uploads\');\n if(maxActive!==1)throw Error(\'batch was not sequential\');\n document.querySelector(\'button[aria-haspopup=dialog]\').click();if(!document.querySelector(\'dialog[open]\'))throw Error(\'zoom did not open\');\n document.querySelector(\'dialog[open] button\').click();if(document.querySelector(\'dialog[open]\'))throw Error(\'zoom did not close\');\n document.querySelector(\'button.bg-blue-600\').click();await until(()=>calls.length===4&&active===0,\'retry incomplete\');if(calls.length!==4)throw Error(\'successful assets uploaded twice\');\n document.body.dataset.test=\'PASS\';\n}catch(error){document.body.dataset.test||=\'FAIL: \'+error.message;}\n';
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
