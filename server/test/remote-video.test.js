const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { Readable } = require('node:stream');
const https = require('node:https');
const { downloadVideo } = require('../services/remoteImage.service');

function mockResponse(t, statusCode, headers, chunks = []) {
  return t.mock.method(https, 'get', (_url, _options, callback) => {
    const request = new EventEmitter();
    request.destroy = error => { request.emit('error', error); request.emit('close'); };
    process.nextTick(() => {
      const response = Object.assign(Readable.from(chunks), { statusCode, headers });
      response.once('end', () => request.emit('close'));
      callback(response);
    });
    return request;
  });
}

test('downloads a direct CDN video with an octet-stream content type', async t => {
  const bytes = Buffer.from('video payload');
  mockResponse(t, 200, { 'content-type': 'application/octet-stream' }, [bytes]);
  assert.deepEqual(await downloadVideo('https://8.8.8.8/trailer.webm?token=signed'), {
    buffer: bytes, mimetype: 'video/webm',
  });
});

test('rejects embedded pages and private redirect targets', async t => {
  const get = mockResponse(t, 302, { location: 'https://127.0.0.1/trailer.mp4' });
  await assert.rejects(downloadVideo('https://www.youtube.com/watch?v=example'), { status: 400 });
  await assert.rejects(downloadVideo('https://8.8.8.8/trailer.mp4'), { status: 400 });
  assert.equal(get.mock.callCount(), 1);
});

test('rejects oversized videos and HTML masquerading as downloadable files', async t => {
  const get = mockResponse(t, 200, { 'content-type': 'video/mp4', 'content-length': String(101 * 1024 * 1024) });
  await assert.rejects(downloadVideo('https://8.8.8.8/trailer.mp4'), { status: 400 });
  get.mock.restore();
  mockResponse(t, 200, { 'content-type': 'text/html' }, [Buffer.from('<p>Not a video</p>')]);
  await assert.rejects(downloadVideo('https://8.8.8.8/trailer.mp4'), { status: 400 });
});
