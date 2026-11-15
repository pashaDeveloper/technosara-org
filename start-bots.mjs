import { spawn } from 'node:child_process';
import { accessSync, constants } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('.', import.meta.url));
const bots = ['central-bot', 'customer-bot'];
const checkOnly = process.argv.includes('--check');

// Validate both installations before starting either bot.
try {
  for (const bot of bots) {
    for (const file of ['server.mjs', '.env', 'node_modules/mongodb/package.json']) {
      try { accessSync(join(root, bot, file), constants.R_OK); }
      catch { throw new Error(`Missing ${bot}/${file}. Configure .env and run npm.cmd install inside ${bot}.`); }
    }
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

if (checkOnly) {
  console.log('Both bot installations are ready. No bots were started.');
} else {
  const children = new Set();
  let stopping = false;
  let forceTimer;
  function stop(code = 0) {
    if (stopping) return;
    stopping = true;
    process.exitCode = code;
    for (const child of children) {
      if (child.connected) child.send({ type: 'shutdown' }, () => {});
      else child.kill('SIGTERM');
    }
    forceTimer = setTimeout(() => {
      for (const child of children) child.kill('SIGKILL');
    }, 15000);
    forceTimer.unref();
  }
  process.on('SIGINT', () => stop());
  process.on('SIGTERM', () => stop());
  console.log('Starting central-bot and customer-bot. Press Ctrl+C to stop both.');
  console.log('Game data is read directly from the panel MongoDB.');
  for (const bot of bots) {
    const child = spawn(process.execPath, ['--env-file=.env', 'server.mjs'], {
      cwd: join(root, bot), stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      detached: process.platform === 'win32', windowsHide: true,
    });
    // Detached Windows processes cannot reliably inherit PowerShell console handles.
    child.stdout.pipe(process.stdout, { end: false });
    child.stderr.pipe(process.stderr, { end: false });
    children.add(child);
    child.on('error', error => {
      console.error(`[${bot}] Could not start: ${error.message}`);
      children.delete(child);
      stop(1);
    });
    child.on('exit', (code, signal) => {
      children.delete(child);
      if (!stopping) {
        console.error(`[${bot}] Stopped (${signal || code}); stopping the other bot.`);
        stop(code || 1);
      }
      if (!children.size) clearTimeout(forceTimer);
    });
  }
}
