// Optional local smoke check: DASHBOARD_BROWSER must point to Chrome or Edge.
// Run after npm run build: node test/profile-browser-smoke.mjs (requires local MongoDB).
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
const database = 'technosara_profile_browser_' + process.pid + '_' + Date.now();
await mongoose.connect('mongodb://127.0.0.1:27017', { dbName: database, serverSelectionTimeoutMS: 3000 });
await Admin.create({ name: 'کاربر آزمایشی', email: 'profile@example.com', password: 'password-123', role: 'superAdmin' });
const app = express();
app.use(express.json({ limit: '512kb' }), cookieParser());
app.use('/api', require('./routes/dashboard.route')());
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
    for (let i = 0; i < 600; i++) {
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


  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await navigate('/signin');
  await at('/signin');
  await fill('#email', 'profile@example.com');
  await fill('#password', 'password-123');
  await evaluate("document.querySelector('form').requestSubmit()");
  await at('/');
  await navigate('/my-profile');
  await until(() => evaluate("document.querySelector('[name=name]')?.value === 'کاربر آزمایشی'"), 'registered information in level one');
  assert.equal(await evaluate("document.body.textContent.includes('حذف تصویر')"), false);
  assert.equal(await evaluate("document.querySelectorAll('nav[aria-label=\"مراحل احراز هویت\"] button')[2].disabled"), true);
  await evaluate("Array.from(document.querySelectorAll('button')).find(button => button.textContent.includes('انتخاب عکس پروفایل')).click()");
  await until(() => evaluate("!!document.querySelector('img[aria-label=\"Avatar 51\"]')"), 'same avatar gallery as registration');
  await click('img[aria-label="Avatar 51"]');
  await click('button[value=save]');
  await until(async () => (await Admin.findOne({ email: 'profile@example.com' })).avatar.url.endsWith('/avatar/female/51.png'), 'preset avatar saved');
  await until(() => evaluate("document.querySelector('button[value=save]').disabled"), 'saved profile state');
  await evaluate("document.querySelectorAll('nav[aria-label=\"مراحل احراز هویت\"] button')[1].click()");
  await until(() => evaluate("!!document.querySelector('[name=phone]')"), 'level two form');
  await fill('[name=phone]', '۰۹۱۲۳۴۵۶۷۸۹');
  await fill('[name=nationalCode]', '0123456789');
  await fill('[name=identityNumber]', '123');
  await click('#birthDate');
  await until(() => evaluate("!!document.querySelector('[role=dialog] select')"), 'birthday calendar with month and year selection');
  await writeFile('.cache/profile-birthday.png', Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  const birthDate = `${new Date().getFullYear() - 25}-01-15`;
  await click(`[data-day="${birthDate}"] button`);
  await until(() => evaluate("document.querySelector('#birthDate').getAttribute('aria-expanded') === 'false'"), 'birthday selected');
  await click('button[value=verify]');
  await until(() => evaluate("Array.from(document.querySelectorAll('button')).some(button => button.textContent === 'تأیید سطح ۲')"), 'pending review visible to owner');
  assert.equal((await Admin.findOne({ email: 'profile@example.com' })).birthDate, birthDate);
  assert.equal(await evaluate("document.querySelectorAll('nav[aria-label=\"مراحل احراز هویت\"] button')[2].disabled"), true);
  await evaluate("Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'تأیید سطح ۲').click()");
  await until(() => evaluate("!!document.querySelector('[name=province]')"), 'approval opens next stage automatically');
  await fill('[name=province]', 'تهران');
  await fill('[name=city]', 'تهران');
  await fill('[name=address]', 'خیابان آزمایشی');
  await fill('[name=postalCode]', '1234567890');
  await click('button[value=verify]');
  await until(() => evaluate("Array.from(document.querySelectorAll('button')).some(button => button.textContent === 'تأیید سطح ۳')"), 'level three review');
  await evaluate("Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'تأیید سطح ۳').click()");
  await until(() => evaluate("document.body.textContent.includes('سطح فعلی شما: ۳ از ۳')"), 'all levels approved');
  await navigate('/my-profile');
  await until(() => evaluate("document.body.textContent.includes('سطح فعلی شما: ۳ از ۳')"), 'level persisted after reload');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await delay(400);
  assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true);
  await writeFile('.cache/profile-mobile.png', Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await delay(400);
  await writeFile('.cache/profile-desktop.png', Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  assert.deepEqual(errors, []);
  console.log('Profile browser smoke passed: level one, avatar gallery, sequential approval, persistence, mobile layout.');
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

