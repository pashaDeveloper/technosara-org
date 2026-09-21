// Read-only connectivity checks. Credentials and response payloads are never logged.
const path = require('node:path');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env'), override: true, quiet: true });
const env = process.env;
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const hmac = (key, value) => crypto.createHmac('sha256', key).update(value).digest();
const safeError = error => ({ error: error.name, code: error.cause?.code || error.code || 'connection_failed' });
async function mongo() {
  try {
    await mongoose.connect(env.MONGODB_URI || env.MONGO_URI, { dbName: env.DB_NAME || 'technosara', serverSelectionTimeoutMS: 15000, connectTimeoutMS: 15000 });
    await mongoose.connection.db.command({ ping: 1 });
    return { service: 'MongoDB', ok: true };
  } catch (error) { return { service: 'MongoDB', ok: false, ...safeError(error) }; }
  finally { await mongoose.disconnect(); }
}
async function cloudinary() {
  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(env.CLOUD_NAME)}/ping`, {
      headers: { Authorization: `Basic ${Buffer.from(`${env.API_KEY}:${env.API_SECRET}`).toString('base64')}` }, signal: AbortSignal.timeout(20000), redirect: 'error',
    });
    return { service: 'Cloudinary', ok: response.ok, status: response.status };
  } catch (error) { return { service: 'Cloudinary', ok: false, ...safeError(error) }; }
}
async function arvan() {
  try {
    const endpoint = new URL(env.ARVAN_S3_ENDPOINT);
    const date = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const day = date.slice(0, 8);
    const scope = `${day}/${env.ARVAN_S3_REGION || 'us-east-1'}/s3/aws4_request`;
    const payloadHash = hash('');
    const headers = `host:${endpoint.host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${date}\n`;
    const signed = 'host;x-amz-content-sha256;x-amz-date';
    const canonical = `GET\n/\n\n${headers}\n${signed}\n${payloadHash}`;
    const key = hmac(hmac(hmac(hmac(`AWS4${env.ARVAN_S3_SECRET_KEY}`, day), env.ARVAN_S3_REGION || 'us-east-1'), 's3'), 'aws4_request');
    const signature = hmac(key, `AWS4-HMAC-SHA256\n${date}\n${scope}\n${hash(canonical)}`).toString('hex');
    const response = await fetch(endpoint.origin + '/', { headers: {
      'x-amz-date': date, 'x-amz-content-sha256': payloadHash,
      Authorization: `AWS4-HMAC-SHA256 Credential=${env.ARVAN_S3_ACCESS_KEY}/${scope}, SignedHeaders=${signed}, Signature=${signature}`,
    }, signal: AbortSignal.timeout(20000), redirect: 'error' });
    const body = await response.text();
    return { service: 'ArvanCloud', ok: response.ok, status: response.status,
      ...(response.ok ? { bucketCount: (body.match(/<Bucket>/g) || []).length } : { code: body.match(/<Code>([A-Za-z0-9]+)<\/Code>/)?.[1] || 'request_failed' }) };
  } catch (error) { return { service: 'ArvanCloud', ok: false, ...safeError(error) }; }
}
Promise.all([mongo(), cloudinary(), arvan()]).then(results => {
  results.forEach(result => console.log(JSON.stringify(result)));
  process.exitCode = results.every(result => result.ok) ? 0 : 1;
});
