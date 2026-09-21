// Optional local smoke check: DASHBOARD_BROWSER must point to Chrome or Edge.
// Run after npm run build: node test/catalog-browser-smoke.mjs (requires local MongoDB).
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { once } from 'node:events';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../server/package.json', import.meta.url));
const express = require('express');
const cookieParser = require('cookie-parser');

const browserPath = process.env.DASHBOARD_BROWSER;
if (!browserPath) throw new Error('Set DASHBOARD_BROWSER to the Chrome or Edge executable.');
const mongoose = require('mongoose');
const Admin = require('./models/admin.model');
process.env.TOKEN_SECRET = 'isolated-profile-browser-secret';
const database = 'technosara_catalog_browser_' + process.pid + '_' + Date.now();
await mongoose.connect('mongodb://127.0.0.1:27017', { dbName: database, serverSelectionTimeoutMS: 3000 });
const admin = await Admin.create({ name: 'کاربر آزمایشی', email: 'profile@example.com', password: 'password-123', role: 'superAdmin' });
const app = express();
app.use(express.json({ limit: '512kb' }), cookieParser());
app.get('/api/admin/account/me', (req,res)=>res.json({data:admin}));
app.get('/api/auth/methods', (req,res)=>res.json({}));
app.use('/api/brands', require('./routes/brand.route'));
app.use('/api/platforms', require('./routes/platform.route'));
app.use('/api/people', require('./routes/person.route'));
const founder = await require('./models/person.model').create({ name: 'Browser Founder' });
const token = require('jsonwebtoken').sign({_id:String(admin._id),role:'superAdmin'},process.env.TOKEN_SECRET);
app.use(require('./middleware/error.middleware'));
app.use('/api', (req, res) => res.status(404).json({ message: 'Not found' }));
app.use(express.static(resolve('dist')));
app.get('*', (req, res) => res.sendFile(resolve('dist/index.html')));
const upstream = createServer(app);
const processes = [];
let socket;
await mkdir(new URL('../.cache/', import.meta.url), { recursive: true });
const profile = await mkdtemp(new URL('../.cache/browser-smoke-', import.meta.url));
try {
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${upstream.address().port}`;
  async function until(fn, description) {
    console.log('Checking:', description);
    for (let i = 0; i < 150; i++) {
      try { if (await fn()) return; } catch {}
      await delay(100);
    }
    throw new Error(`Timed out: ${description}`);
  }
  await until(async () => (await fetch(base + '/api/auth/methods')).ok, 'app startup');
  assert.match(await (await fetch(base + '/administrators/new')).text(), /id="root"/);
  assert.equal((await fetch(base + '/api/missing')).status, 404);
  const browser = spawn(browserPath, [
    '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-gpu',
    '--disable-background-networking', '--disable-extensions',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: 'pipe', windowsHide: true });
  processes.push(browser);
  let logs = '';
  browser.stderr.on('data', data => { logs += data; });
  await until(() => /DevTools listening on (ws:\/\/[^\s]+)/.test(logs), 'browser startup');
  const debugUrl = logs.match(/DevTools listening on (ws:\/\/[^\s]+)/)[1];
  let targets;
  await until(async () => {
    targets = await (await fetch(`http://${new URL(debugUrl).host}/json/list`, { signal: AbortSignal.timeout(10000) })).json();
    return targets.some(target => target.type === 'page');
  }, 'browser page');
  socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Browser WebSocket connection timed out')), 10000);
    socket.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
    socket.addEventListener('error', () => { clearTimeout(timer); reject(new Error('Browser WebSocket connection failed')); }, { once: true });
  });
  let id = 0;
  const pending = new Map();
  const errors = [];
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const callback = pending.get(message.id);
      if (!callback) return;
      pending.delete(message.id);
      if (message.error) callback.reject(new Error(JSON.stringify(message.error)));
      else callback.resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
    if (message.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(message.params.type)) {
      errors.push(message.params.args.map(arg => arg.value || arg.description).join(' '));
    }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const messageId = ++id;
    const timer = setTimeout(() => { pending.delete(messageId); reject(new Error(`CDP timeout: ${method}`)); }, 30000);
    pending.set(messageId, {
      resolve: value => { clearTimeout(timer); resolve(value); },
      reject: error => { clearTimeout(timer); reject(error); },
    });
    socket.send(JSON.stringify({ id: messageId, method, params }));
  });
  const evaluate = async expression => {
    const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
    return response.result.value;
  };
  await send('Runtime.enable');
  await send('Page.enable');
  const navigate = route => { console.log('Navigating:', route); return send('Page.navigate', { url: base + route }); };
  const at = route => until(() => evaluate(`location.pathname === ${JSON.stringify(route)} && document.querySelectorAll('input').length >= ${route === '/signin' ? 2 : 0}`), route);
  const fill = (selector, value) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);


  await send('Page.addScriptToEvaluateOnNewDocument', {source: 'localStorage.setItem("accessToken", '+JSON.stringify(token)+')'});
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await navigate('/brands/add');
  await until(()=>evaluate("!!document.querySelector('#brand-name')"),'brand form');
  assert.equal(await evaluate("!!document.querySelector('.wave') && !document.querySelector('header')"),true);
  await evaluate("document.querySelectorAll('form button[aria-label]')[1].click()");
  assert.equal(await evaluate("!!document.querySelector('#brand-name').closest('[hidden]')"),false);
  await fill('#brand-name','Browser Brand');
  await until(()=>evaluate("document.querySelector('#brand-slug').value === 'browser-brand'"),'slug');
  await evaluate("document.querySelectorAll('form button[aria-label]')[1].click()");
  await until(()=>evaluate("!!document.querySelector('input[placeholder=\"MM-DD-YYYY\"]')"),'details step');
  await click('button[aria-haspopup="dialog"]');
  await until(()=>evaluate("!!document.querySelector('[role=dialog]')"),'date picker');
  await evaluate("[...document.querySelectorAll('[role=dialog] button')].find(b=>b.textContent.trim()==='1994').click()");
  await evaluate("document.querySelectorAll('[role=dialog] .no-scrollbar')[1].querySelector('button').click()");
  await evaluate("document.querySelectorAll('[role=dialog] .no-scrollbar')[2].querySelector('button').click()");
  await evaluate("document.querySelectorAll('form button[aria-label]')[2].click()");
  await fill('#brand-website','https://example.com/');
  await evaluate("document.querySelectorAll('form button[aria-label]')[3].click()");
  await until(()=>evaluate("!!document.querySelector('button[type=submit]')"),'founders step');
  await evaluate("[...document.querySelectorAll('input[role=combobox]')].find(el=>!el.closest('[hidden]')).click()");
  await until(()=>evaluate("[...document.querySelectorAll('[role=option]')].some(el=>el.textContent.includes('Browser Founder'))"),'founder options');
  await evaluate("[...document.querySelectorAll('[role=option]')].find(el=>el.textContent.includes('Browser Founder')).click()");
  await evaluate("document.querySelector('form').requestSubmit()");
  await until(()=>evaluate("location.pathname === '/brands' && !!document.querySelector('main .edit-button')"),'saved list');
  const Brand = require('./models/brand.model');
  const brand = await Brand.findOne({slug:'browser-brand'});
  assert.ok(brand);
  assert.equal(brand.founded_year,1994);
  assert.equal(brand.founded_date,'1994-01-01');
  assert.equal(String(brand.founders[0].person_id),String(founder._id));
  assert.equal(brand.website,'https://example.com/');
  assert.equal(await evaluate("!!document.querySelector('[name=status]')"),false);
  assert.equal(String(brand.creator),String(admin._id));
  assert.equal(await evaluate("!!document.querySelector('main .grid-cols-12') && !!document.querySelector('main .delete-button')"),true);
  const shot = await send('Page.captureScreenshot',{format:'png'});
  await writeFile(resolve('../reports/brands-list.png'),Buffer.from(shot.data,'base64'));
  await navigate('/brands/update/'+brand._id);
  await until(()=>evaluate("document.querySelector('#brand-name')?.value === 'Browser Brand'"),'edit');
  await fill('#brand-name','Browser Brand Edited');
  await evaluate("document.querySelectorAll('form button[aria-label]')[1].click()");
  await evaluate("document.querySelectorAll('form button[aria-label]')[2].click()");
  await evaluate("document.querySelectorAll('form button[aria-label]')[3].click()");
  await until(()=>evaluate("!!document.querySelector('button[type=submit]')"),'edit contact');
  await evaluate("document.querySelector('form').requestSubmit()");
  await until(()=>evaluate("location.pathname === '/brands' && !!document.querySelector('main .edit-button')"),'updated list');
  assert.equal((await Brand.findById(brand._id)).name,'Browser Brand Edited');
  assert.equal((await Brand.findById(brand._id)).founded_date,'1994-01-01');
  assert.equal(String((await Brand.findById(brand._id)).founders[0].person_id),String(founder._id));
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'),true);
  await click('main .delete-button');
  await click('main button.reject-button');
  await until(async()=>!await Brand.findById(brand._id),'deleted');
  console.log('Brand browser smoke passed: layout, validation, create, edit, delete, mobile.');
} finally {
  assert.equal(mongoose.connection.name, database);
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  socket?.close();
  for (const child of processes.reverse()) {
    if (child.exitCode !== null) continue;
    const exited = once(child, 'exit');
    child.kill();
    await Promise.race([exited, delay(5000)]);
  }
  upstream.closeAllConnections();
  await new Promise(resolve => upstream.close(resolve));
  assert.ok(resolve(profile).startsWith(resolve('.cache') + sep));
  try {
    await rm(profile, { recursive: true, force: true });
  } catch (error) {
    if (!['EPERM', 'EBUSY', 'ENOTEMPTY'].includes(error.code)) throw error;
    console.warn(`Browser checks finished; Windows retained the temporary profile: ${profile}`);
  }
}

