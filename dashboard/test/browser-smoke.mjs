// Optional local smoke check: DASHBOARD_BROWSER must point to Chrome or Edge.
// Run after npm run build: node test/browser-smoke.mjs
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { once } from 'node:events';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../server/package.json', import.meta.url));
const express = require('express');
const cookieParser = require('cookie-parser');

const browserPath = process.env.DASHBOARD_BROWSER;
if (!browserPath) throw new Error('Set DASHBOARD_BROWSER to the Chrome or Edge executable.');
const dependencies = require('./test/fixtures/dashboard')();
const app = express();
app.use(express.json(), cookieParser());
let savedGenre;
let translationRequests = 0;
const genreId = '123456789012345678901234';
app.post('/api/translations', (req, res) => {
  translationRequests++;
  // Mock provider response: verifies form behavior, not translation quality.
  assert.equal(req.body.text, 'اکشن ماجراجویی');
  res.json({ translation: 'Action Adventure' });
});
app.post('/api/genres', (req, res) => {
  savedGenre = { ...req.body, _id: genreId };
  res.status(201).json({ acknowledgement: true });
});
app.get('/api/genres', (req, res) => res.json({ data: savedGenre ? [savedGenre] : [], total: savedGenre ? 1 : 0 }));
app.get('/api/genres/:id', (req, res) => res.json({ data: savedGenre }));
app.patch('/api/genres/:id', (req, res) => {
  savedGenre = { ...savedGenre, ...req.body };
  res.json({ acknowledgement: true });
});
app.get(['/api/platforms/all', '/api/companies/all', '/api/people/all', '/api/companies/countries', '/api/people/countries'], (req, res) => res.json({ data: [] }));
app.use('/api', require('./routes/dashboard.route')(dependencies));
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
  const targets = await (await fetch(`http://${new URL(debugUrl).host}/json/list`, { signal: AbortSignal.timeout(10000) })).json();
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

  await navigate('/signup');
  await until(() => evaluate("!!document.querySelector('button[aria-label=\"مرحله 2\"]')"), 'setup form');
  await click('button[aria-label="مرحله 2"]');
  await until(() => evaluate("!!document.querySelector('#name')"), 'name step');
  await fill('#name', 'Test Admin');
  await click('button[aria-label="مرحله 3"]');
  await until(() => evaluate("!!document.querySelector('#email')"), 'email step');
  await fill('#email', 'admin@example.com');
  await click('button[aria-label="مرحله 4"]');
  await until(() => evaluate("!!document.querySelector('#password')"), 'password step');
  await fill('#password', 'Password123!');
  await click('button[aria-label="مرحله 5"]');
  await until(() => evaluate("!!document.querySelector('[name=confirmPassword]')"), 'confirm step');
  await fill('[name=confirmPassword]', 'Password123!');
  await evaluate("document.querySelector('form').requestSubmit()");
  await at('/signin');
  assert.equal(dependencies.state.registrations[0].email, 'admin@example.com');
  await fill('#email', 'admin@example.com');
  await fill('#password', 'wrong-password');
  await evaluate("document.querySelector('form').requestSubmit()");
  await until(() => evaluate("document.body.textContent.includes('Invalid credentials')"), 'login error');
  await fill('#password', 'password-123');
  await evaluate("document.querySelector('form').requestSubmit()");
  await at('/');
  await until(() => evaluate("document.querySelectorAll('canvas').length >= 8"), 'all dashboard charts');
  if (!process.argv.includes('--genres')) {
  await navigate('/my-profile');
  await until(() => evaluate("Array.from(document.querySelectorAll('input')).some(input => input.value === 'admin@example.com')"), 'persisted account');
  await fill('input[name="phone"]', '۰۹۱۲۳۴۵۶۷۸۹');
  assert.equal(await evaluate("document.querySelector('input[name=phone]').value"), '09123456789');
  assert.equal(await evaluate("document.querySelector('button[type=submit]').disabled"), false);
  await evaluate("Array.from(document.querySelectorAll('button')).find(el => el.textContent === 'لغو تغییرات').click()");
  assert.equal(await evaluate("document.querySelector('input[name=phone]').value"), '');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true);
  await send('Emulation.clearDeviceMetricsOverride');
  assert.equal(await evaluate("document.cookie.includes('smoke-token')"), false);
  }
  await navigate('/genres/add');
  await until(() => evaluate("!!document.querySelector('#genre-name')"), 'single-page genre form');
  assert.equal(await evaluate("document.querySelectorAll('form').length"), 1);
  assert.equal(await evaluate("!!document.querySelector('#genre-name') && !!document.querySelector('#genre-slug') && !!document.querySelector('#genre-description') && !!document.querySelector('input[type=file]')"), true);
  assert.equal(await evaluate("document.body.textContent.includes('نامک یکتا')"), false);
  await fill('#genre-name', 'اکشن ماجراجویی');
  assert.equal(await evaluate("!!document.querySelector('input[name=is_active]')"), false);
  assert.equal(await evaluate("Array.from(document.querySelectorAll('button')).some(button => button.textContent.includes('ترجمه'))"), false);
  await until(() => evaluate("document.querySelector('#genre-name_en').value === 'Action Adventure' && document.querySelector('#genre-slug').value === 'action-adventure'"), 'translated name and slug');
  assert.equal(translationRequests, 1);
  assert.equal(await evaluate("document.body.textContent.includes('حذف عکس')"), false);
  await evaluate("(() => { const el = document.querySelector('#genre-description'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(el, 'توضیحات ژانر'); el.dispatchEvent(new Event('input', { bubbles: true })); })()");
  await evaluate("document.querySelector('form').requestSubmit()");
  await at('/genres');
  assert.equal(savedGenre.name_en, 'Action Adventure');
  assert.equal(savedGenre.name, 'اکشن ماجراجویی');
  assert.equal(savedGenre.slug, 'action-adventure');
  assert.equal(savedGenre.description, 'توضیحات ژانر');
  assert.equal(Object.hasOwn(savedGenre, 'is_active'), false);
  await navigate('/genres/update/' + genreId);
  await until(() => evaluate("document.querySelector('#genre-name_en')?.value === 'Action Adventure'"), 'persisted genre form');
  await fill('#genre-name_en', 'Adventure');
  await fill('#genre-slug', 'adventure');
  await evaluate("document.querySelector('form').requestSubmit()");
  await at('/genres');
  assert.equal(savedGenre.name_en, 'Adventure');
  assert.equal(savedGenre.slug, 'adventure');
  assert.equal(translationRequests, 1);
  await navigate('/genres/add');
  await until(() => evaluate("!!document.querySelector('#genre-name')"), 'genre cancel');
  await evaluate("Array.from(document.querySelectorAll('a')).find(link => link.textContent === 'انصراف').click()");
  await at('/genres');
  for (const [route, selector, target] of [['/people/add', '#person-name_fa', 'name']]) {
    await navigate(route);
    await until(() => evaluate(`!!document.querySelector(${JSON.stringify(selector)})`), route + ' translation form');
    await fill(selector, 'اکشن ماجراجویی');
    await until(() => evaluate(`document.querySelector('[name=${target}]')?.value === 'Action Adventure' && document.querySelector('[name=slug]')?.value === 'action-adventure'`), route + ' translated English and slug');
  }
  await navigate('/platforms/add');
  await until(() => evaluate("!!document.querySelector('#name')"), 'platform English name');
  await fill('#name', 'PS4 Account');
  assert.equal(await evaluate("document.querySelector('#platform-slug').value"), 'ps4-account');
  assert.equal(await evaluate("!!document.querySelector('[name=english_name]')"), false);
  await navigate('/companies/add');
  await until(() => evaluate("!!document.querySelector('#company-name')"), 'company English name');
  await fill('#company-name', 'Kojima Productions');
  assert.equal(await evaluate("document.querySelector('#company-slug').value"), 'kojima-productions');
  assert.equal(await evaluate("!!document.querySelector('[name=english_name]')"), false);
  dependencies.state.role = 'admin';
  await navigate('/signup');
  await until(() => evaluate("!!document.querySelector('button[aria-label=\"مرحله 2\"]')"), 'public registration');
  await navigate('/');
  await until(() => evaluate("!!document.querySelector('header')"), 'dashboard');
  await click('header button[aria-haspopup=true]');
  await evaluate("Array.from(document.querySelectorAll('header button')).find(el => el.textContent === 'خروج').click()");
  await at('/signin');
  await navigate('/my-profile');
  await at('/signin');
  assert.deepEqual(errors, []);
  console.log('Browser smoke passed: setup, login, genre translation, genre create/edit, role guard, logout.');
} finally {
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

