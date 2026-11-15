import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readApiResponse } from '../src/utils/apiResponse.js';

test('API responses handle HTML fallback, missing routes, auth errors and valid data', async () => {
  await assert.rejects(readApiResponse(new Response('<!doctype html><html>Vite</html>')), error => !error.message.includes('Unexpected token') && error.message.includes('API'));
  await assert.rejects(readApiResponse(new Response('Not found', { status: 404 })), error => error.message.includes('راه‌اندازی'));
  await assert.rejects(readApiResponse(new Response(JSON.stringify({ description: 'ورود لازم است' }), { status: 401 })), { message: 'ورود لازم است' });
  await assert.rejects(readApiResponse(new Response('null')), error => error.message.includes('ساختار'));
  const settings = { quality: 88, blur: 2 };
  assert.deepEqual(await readApiResponse(new Response(JSON.stringify({ data: settings }))), settings);
});
