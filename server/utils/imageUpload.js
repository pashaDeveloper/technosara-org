const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const cloudinary = require('cloudinary').v2;
const { randomBytes } = require('crypto');

function providers(selection) {
  const required = [ ...(selection !== 'cloudinary' ? ['ARVAN_S3_BUCKET', 'ARVAN_PUBLIC_BASE_URL', 'ARVAN_S3_ENDPOINT', 'ARVAN_S3_ACCESS_KEY', 'ARVAN_S3_SECRET_KEY'] : []), ...(selection !== 'arvan' ? ['CLOUD_NAME', 'API_KEY', 'API_SECRET'] : []) ];
  const missing = required.filter(key => !process.env[key]?.trim());
  if (missing.length) throw Object.assign(new Error(`تنظیمات ذخیره تصاویر ناقص است: ${missing.join(', ')}`), { status: 503 });
  const s3 = new S3Client({
    endpoint: process.env.ARVAN_S3_ENDPOINT,
    region: process.env.ARVAN_S3_REGION || 'us-east-1',
    forcePathStyle: process.env.ARVAN_S3_FORCE_PATH_STYLE !== 'false',
    requestChecksumCalculation: 'WHEN_REQUIRED',
    credentials: { accessKeyId: process.env.ARVAN_S3_ACCESS_KEY, secretAccessKey: process.env.ARVAN_S3_SECRET_KEY },
    requestHandler: { connectionTimeout: 10000, requestTimeout: 60000 },
    maxAttempts: 2,
  });
  cloudinary.config({ cloud_name: process.env.CLOUD_NAME, api_key: process.env.API_KEY, api_secret: process.env.API_SECRET });
  const clients = {
    arvan: {
      async put(key, body) {
        await s3.send(new PutObjectCommand({ Bucket: process.env.ARVAN_S3_BUCKET, Key: key, Body: body, ContentType: 'image/webp', ACL: process.env.ARVAN_S3_ACL || 'public-read' }));
        return { key, url: `${process.env.ARVAN_PUBLIC_BASE_URL.replace(/\/$/, '')}/${key}` };
      },
      remove: key => s3.send(new DeleteObjectCommand({ Bucket: process.env.ARVAN_S3_BUCKET, Key: key })),
    },
    cloudinary: {
      put: (key, body) => new Promise((resolve, reject) => {
        const publicId = key.replace(/\.webp$/, '');
        const stream = cloudinary.uploader.upload_stream({ public_id: publicId, asset_folder: publicId.slice(0, publicId.lastIndexOf('/')), resource_type: 'image', overwrite: false, timeout: 60000 }, (error, result) => {
          if (error) return reject(error);
          resolve({ key: result.public_id, url: result.secure_url });
        });
        stream.on('error', reject);
        stream.end(body);
      }),
      async remove(key) {
        const result = await cloudinary.uploader.destroy(key.replace(/\.webp$/, ''), { resource_type: 'image', invalidate: true });
        if (!['ok', 'not found'].includes(result?.result)) throw new Error('Cloudinary image deletion failed');
        return result;
      },
    },
  };
  return selection === 'both' ? clients : { [selection]: clients[selection] };
}

// Wait for every upload before rollback: late successes must not leave partial copies.
async function uploadPair(folder, full, preview, clients, selection = 'both', track, name = '') {
  if (!['arvan', 'cloudinary', 'both'].includes(selection)) throw new Error('Invalid storage provider');
  clients ||= providers(selection);
  if (selection !== 'both') clients = { [selection]: clients[selection] };
  const version = (name ? name + '-' : '') + randomBytes(9).toString('base64url');
  const jobs = Object.entries(clients).flatMap(([provider, client]) => [
    { provider, client, variant: 'image', key: `${folder}/${version}.webp`, body: full },
    { provider, client, variant: 'preview', key: `${folder}/${version}-preview-64.webp`, body: preview },
  ].filter(job => job.body != null));
  if (track) jobs.forEach(job => track(() => job.client.remove(job.key)));
  const results = await Promise.allSettled(jobs.map(job => job.client.put(job.key, job.body)));
  if (results.some(result => result.status === 'rejected')) {
    // Also remove attempted keys: a timed-out request may have reached storage.
    const cleanup = await Promise.allSettled(jobs.map(job => job.client.remove(job.key)));
    const failures = [...new Set(results.flatMap((result, index) => {
      if (result.status !== 'rejected') return [];
      const name = jobs[index].provider === 'arvan' ? 'ابر آروان' : 'Cloudinary';
      const cause = result.reason;
      const denied = cause?.name === 'AccessDenied' || cause?.$metadata?.httpStatusCode === 403 || cause?.http_code === 403;
      return [denied ? `${name}: دسترسی ذخیره فایل رد شد (403)؛ مجوز نوشتن و تنظیمات فضای ذخیره‌سازی را بررسی کنید.` : `${name}: آپلود فایل ناموفق بود؛ دوباره تلاش کنید.`];
    }))];
    const error = Object.assign(new Error(failures.join(' ')), { status: 502 });
    if (cleanup.some(result => result.status === 'rejected')) console.error('[catalog-storage] Partial upload cleanup failed');
    throw error;
  }
  const copies = {};
  jobs.forEach((job, index) => {
    copies[job.provider] ||= {};
    copies[job.provider][job.variant] = results[index].value;
  });
  return copies;
}



const multer = require("multer");
const compressImage = require('./compressImage');
const uploadSettings = require('../services/uploadSettings.service');


const MAX_BYTES = 5 * 1024 * 1024;
const jsonFields = new Set(["founders", "key_members", "activity_fields", "specialties", "positions", "awards", "social_links", "addressInfo"]);
const badRequest = message => Object.assign(new Error(message), { status: 400, statusCode: 400 });

const uploadState = Symbol("imageUploadState");

function transaction(req, res) {
  if (req[uploadState]) return req[uploadState].track;
  const pending = [];
  let committed = false;
  let cleanup;
  req.commitUploads = () => { committed = true; pending.length = 0; };
  req.rollbackUploads = () => {
    if (committed) return Promise.resolve();
    if (!cleanup) cleanup = (async () => {
      const results = await Promise.allSettled(pending.map(async remove => {
        for (let attempt = 0; ; attempt++) {
          try { return await remove(); }
          catch (error) { if (attempt === 2) throw error; }
        }
      }));
      const failures = results.filter(result => result.status === "rejected");
      if (failures.length) throw new AggregateError(failures.map(result => result.reason), "Uploaded image cleanup failed");
      pending.length = 0;
    })();
    return cleanup;
  };
  // Services sometimes return an error response instead of throwing. Clean up
  // before ending that response; commit happens explicitly after the DB write.
  const end = res.end;
  res.end = function (...args) {
    res.end = end;
    req.rollbackUploads().then(() => end.apply(res, args), error => {
      console.error("[upload] rollback failed", error);
      end.apply(res, args);
    });
    return res;
  };
  const track = remove => pending.push(remove);
  req[uploadState] = { track, sources: {} };
  return track;
}

module.exports = function imageUpload(folder, provider) {
  if (!/^[a-z0-9-]+$/.test(folder)) throw new Error("Invalid upload folder");
  if (!["arvan", "cloudinary", "both"].includes(provider)) throw new Error("Invalid upload provider");
  const fields = config => {
    const parse = multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: folder === 'games' ? 100 * 1024 * 1024 : MAX_BYTES, files: folder === 'games' ? 1 : config.reduce((sum, field) => sum + (field.maxCount || 1), 0), fields: 100, fieldSize: 8 * 1024 * 1024 },
    }).fields(config);
    return (req, res, next) => {
      const processFiles = async error => {
      if (error) { error.status = error.statusCode = 400; return next(error); }
      const track = transaction(req, res);
      req.body ||= {};
      req.uploadedFiles ||= {};
      req.uploadedImageValues ||= {};
      try {
        if (req.is("multipart/form-data")) {
          for (const key of jsonFields) {
            if (typeof req.body[key] === "string") {
              try { req.body[key] = JSON.parse(req.body[key]); }
              catch { throw badRequest("Invalid JSON field: " + key); }
            }
          }
        }
        let clients, settings;
        for (const field of config) {
          const files = req[uploadState].sources[field.name] || [...(req.files?.[field.name] || [])];
          const value = req.body[field.name] ?? (field.name === "avatar" ? req.body.avatarUrl : undefined);
          if (!files.length && typeof value === "string" && value.startsWith("data:")) {
            const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
            if (!match || value.length > Math.ceil(MAX_BYTES * 4 / 3) + 100) throw badRequest("Invalid image data");
            files.push({ buffer: Buffer.from(match[2], "base64") });
          }
          if (!files.length) continue;
          settings ||= req[uploadState].settings ||= await uploadSettings.read();
          const gameTitle = String(req.body.gameTitle || '').trim();
          if (folder === 'games' && !gameTitle) throw badRequest('نام بازی را پیش از آپلود وارد کنید.');
          req[uploadState].sources[field.name] = files;
          req.uploadedFiles[field.name] ||= [];
          for (const [index, file] of files.entries()) {
            if (folder === 'games' && ['video', 'trailer', 'gameplay', 'micro_trailer'].includes(field.name)) {
              const uploaded = await module.exports.uploadVideo(file, gameTitle, field.name, settings, track);
              req.uploadedFiles[field.name][index] = uploaded;
              req.body[field.name] = uploaded.url;
              continue;
            }
            if (file.buffer.length > MAX_BYTES) throw badRequest("Image exceeds 5 MB");
            let full, preview, previewDimensions;
            try {
              const animated = folder === 'games' && field.name === 'detail_gif';
              ({ full, preview } = await compressImage(file.buffer, settings, animated, folder === 'games'));
            } catch { throw badRequest(field.name === 'detail_gif' ? 'فایل باید GIF یا WebP متحرک معتبر و حداکثر ۱۵۰ فریم باشد.' : 'Image must be a valid PNG, JPEG or WebP'); }
            previewDimensions = await require('sharp')(preview).metadata();
            clients ||= module.exports.createClients(provider);
            const title = gameTitle || req.body.slug || req.body.english_name || req.body.name || req.params?.id || req.admin?._id || "untitled";
            const slug = String(title).normalize("NFKC").toLowerCase()
              .replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "untitled";
            const previous = req.uploadedFiles[field.name][index];
            const gameTypes = { thumbnail: 'card', detail_banner: 'cover', detail_poster: 'poster', detail_gif: 'animated', screenshot: 'screenshot', cover: 'cover', logo: 'logo' };
            const role = gameTypes[field.name] || field.name;
            const path = folder === 'games' ? `game/${slug}${role === 'screenshot' ? '/screenshot' : ''}` : `${folder}/${slug}/${field.name}`;
            const copies = { ...previous?.copies, ...await module.exports.uploadPair(path, full, preview, clients, provider, track, folder === 'games' ? role : '') };
            const primary = copies.arvan || copies.cloudinary;
            const uploaded = {
              url: primary.image.url, key: primary.image.key, public_id: primary.image.key,
              storage: copies.arvan ? "arvan" : "cloudinary", copies,
              original_bytes: file.buffer.length, bytes: full.length,
              ...(primary.preview ? { blur: { url: primary.preview.url, public_id: primary.preview.key, width: previewDimensions.width, height: previewDimensions.height, amount: settings.blur } } : {}),
            };
            req.uploadedFiles[field.name][index] = uploaded;
            if (field.name === "avatar") {
              delete req.body.avatar;
              req.body.avatarUrl = uploaded.url;
            } else {
              req.body[field.name] = uploaded.url;
              if (folder === 'platform') {
                if (field.name === 'thumbnail') req.uploadedImageValues.preview = primary.preview.url;
              } else req.uploadedImageValues = { preview_url: primary.preview.url, image_storage: copies };
            }
          }
        }
        if (req.aborted || res.destroyed) { await req.rollbackUploads(); return; }
        next();
      } catch (error) {
        try { await req.rollbackUploads(); }
        catch (cleanupError) { console.error("[upload] rollback failed", cleanupError); }
        next(error);
      }
      };
      if (req[uploadState]) return processFiles();
      return parse(req, res, processFiles);
    };
  };
  return { fields, single: name => fields([{ name, maxCount: 1 }]) };
};

module.exports.createClients = providers;
module.exports.uploadPair = uploadPair;
module.exports.uploadVideo = async function (file, title, kind, settings, track) {
  if (!['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'].includes(file.mimetype)) throw badRequest('فرمت ویدئو معتبر نیست.');
  providers('cloudinary');
  const slug = String(title).normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  if (!slug) throw badRequest('نام بازی معتبر نیست.');
  const path = `game/${slug}`;
  const key = `${path}/${kind}-${randomBytes(9).toString('base64url')}`;
  track(async () => {
    const result = await cloudinary.uploader.destroy(key, { resource_type: 'video', invalidate: true });
    if (!['ok', 'not found'].includes(result?.result)) throw new Error('Video cleanup failed');
  });
  const preview = { width: settings.previewSize, height: settings.previewSize, crop: 'fill', quality: settings.previewQuality, format: 'jpg', start_offset: '0' };
  if (settings.blur) preview.effect = `blur:${settings.blur * 100}`;
  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      public_id: key, asset_folder: path, resource_type: 'video', overwrite: false, timeout: 180000,
      transformation: [{ width: settings.maxDimension, height: settings.maxDimension, crop: 'limit', quality: settings.videoQuality, video_codec: 'h264', fetch_format: 'mp4' }],
      eager: [preview], eager_async: false,
    }, (error, response) => error ? reject(Object.assign(new Error('آپلود یا فشرده‌سازی ویدئو ناموفق بود.'), { status: 502 })) : resolve(response));
    stream.on('error', reject);
    stream.end(file.buffer);
  });
  if (!result.width || !result.height || !result.eager?.[0]?.secure_url) throw Object.assign(new Error('ویدئو یا پیش‌نمایش آن معتبر نیست.'), { status: 502 });
  return { url: result.secure_url, key: result.public_id, public_id: result.public_id, storage: 'cloudinary', resource_type: 'video', bytes: result.bytes, original_bytes: file.buffer.length,
    blur: { url: result.eager[0].secure_url, public_id: result.public_id, width: settings.previewSize, height: settings.previewSize, amount: settings.blur } };
};

// Call only after the database write and upload commit have succeeded.
module.exports.removeReplacedCopies = async function (previous, current) {
  const jobs = [];
  for (const provider of ['arvan', 'cloudinary']) {
    const retained = new Set(Object.values(current?.[provider] || {}).map(copy => copy?.key));
    const keys = [...new Set(Object.values(previous?.[provider] || {}).map(copy => copy?.key).filter(key => typeof key === 'string' && key && !retained.has(key)))];
    for (const key of keys) jobs.push(async () => {
      const client = module.exports.createClients(provider)[provider];
      for (let attempt = 0; ; attempt++) {
        try { return await client.remove(key); }
        catch (error) { if (attempt === 2) throw error; }
      }
    });
  }
  const results = await Promise.allSettled(jobs.map(job => job()));
  const failures = results.filter(result => result.status === 'rejected');
  if (failures.length) throw new AggregateError(failures.map(result => result.reason), 'Previous image cleanup failed');
};

module.exports.finishImageReplacement = async function (req, res, previous, current = req.uploadedImageValues?.image_storage) {
  req.commitUploads?.();
  if (!current) return;
  try {
    await module.exports.removeReplacedCopies(previous, current);
  } catch (error) {
    // The new image is already saved. Never roll it back because old-file deletion failed.
    console.error('[upload] previous image cleanup failed', error);
    res.setHeader('X-Image-Cleanup-Pending', 'true');
  }
};
