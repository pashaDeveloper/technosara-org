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
    for (let i = 0; i < 100; i++) {
      try { if (await fn()) return; } catch {}
      await delay(100);
    }
    throw new Error(`Timed out: ${description}`);
  }
  await until(async () => (await fetch(base + '/api/auth/methods')).ok, 'app startup');
  assert.match(await (await fetch(base + '/administrators/new')).text(), /id="app"/);
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
  const targets = await (await fetch(`http://${new URL(debugUrl).host}/json/list`)).json();
  socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
  await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
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
  const at = route => until(() => evaluate(`location.pathname === ${JSON.stringify(route)} && document.querySelectorAll('input').length >= ${route === '/login' ? 2 : 0}`), route);
  const fill = (selector, value) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); el.value = ${JSON.stringify(value)}; el.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);

  await navigate('/login/setup');
  await at('/setup/2');
  await until(() => evaluate("document.querySelectorAll('input').length === 3"), 'setup form');
  await fill('#username', 'admin@example.com');
  await fill('#password', 'password-123');
  await fill('#confirmPassword', 'password-123');
  await click('main button');
  await at('/login');
  await fill('[name=username]', 'admin@example.com');
  await fill('[name=password]', 'wrong-password');
  await evaluate("document.querySelector('form').requestSubmit()");
  try {
    await until(() => evaluate("document.body.textContent.includes('Invalid credentials')"), 'error toast');
  } catch (error) {
    console.error(await evaluate('document.body.innerHTML'));
    console.error(errors);
    throw error;
  }
  await fill('[name=password]', 'password-123');
  await evaluate("document.querySelector('form').requestSubmit()");
  await at('/');
  await navigate('/account');
  await at('/me');
  await until(() => evaluate("document.body.textContent.includes('admin@example.com')"), 'account details');
  assert.equal(await evaluate("document.cookie.includes('smoke-token')"), false);
  await navigate('/admin-register');
  await at('/administrators/new');
  await until(() => evaluate("!!document.querySelector('#administrator-confirm-password')"), 'admin form');
  await fill('#administrator-username', 'second@example.com');
  await fill('#administrator-password', 'password-123');
  await fill('#administrator-confirm-password', 'password-123');
  await evaluate("document.querySelector('form').requestSubmit()");
  await at('/me');
  await click('header button[title]');
  await until(() => evaluate("localStorage.getItem('theme') !== null"), 'theme persistence');
  dependencies.state.role = 'admin';
  await navigate('/administrators/new');
  await at('/');
  await navigate('/me');
  await at('/me');
  await until(() => evaluate("!!document.querySelector('main button')"), 'logout button');
  await click('main button');
  await at('/login');
  await navigate('/me');
  await at('/login');
  assert.deepEqual(errors, []);
  console.log('Browser smoke passed: setup, login errors, login, account, registration, theme, role guard, logout, protected routes.');
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
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
