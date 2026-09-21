const path = require('node:path');
const { createHash } = require('node:crypto');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
const { MongoClient, BSON } = require('mongoose').mongo;

async function fingerprint(collection) {
  const hash = createHash('sha256');
  let count = 0;
  for await (const document of collection.find({}, { promoteValues: false }).sort({ _id: 1 })) {
    hash.update(BSON.serialize(document));
    count++;
  }
  return { count, sha256: hash.digest('hex') };
}

async function main() {
  const client = new MongoClient(process.env.MONGO_URI || process.env.ATLAS_URI, {
    serverSelectionTimeoutMS: 15000, connectTimeoutMS: 15000,
  });
  try {
    await client.connect();
    const source = client.db('test');
    const target = client.db('technosara');
    const collections = await source.listCollections().toArray();
    const existing = await target.listCollections().toArray();
    if (!collections.length) throw new Error('Source database is empty');
    if (existing.length) throw new Error('Destination is not empty; refusing to overwrite it');
    if (collections.some(c => c.type !== 'collection' || c.name.startsWith('system.'))) {
      throw new Error('Source contains special collections; requires a dedicated migration');
    }
    const before = new Map();
    for (const c of collections) before.set(c.name, await fingerprint(source.collection(c.name)));
    for (const c of collections) {
      const destination = await target.createCollection(c.name, c.options);
      let batch = [];
      for await (const document of source.collection(c.name).find({}, { promoteValues: false })) {
        batch.push(document);
        if (batch.length === 100) { await destination.insertMany(batch); batch = []; }
      }
      if (batch.length) await destination.insertMany(batch);
      const indexes = await source.collection(c.name).listIndexes().toArray();
      for (const index of indexes) {
        if (index.name === '_id_') continue;
        const { v, ns, key, ...options } = index;
        await destination.createIndex(key, options);
      }
      const copied = await fingerprint(destination);
      const current = await fingerprint(source.collection(c.name));
      if (JSON.stringify(before.get(c.name)) !== JSON.stringify(copied) ||
          JSON.stringify(current) !== JSON.stringify(copied)) {
        throw new Error(`Verification failed or source changed: ${c.name}; connection has not been changed`);
      }
      console.log(JSON.stringify({ collection: c.name, ...copied, indexes: indexes.length, verified: true }));
    }
    // Recheck all collections to detect writes while later collections were copied.
    const finalCollections = await source.listCollections().toArray();
    if (JSON.stringify(finalCollections.map(c => c.name).sort()) !== JSON.stringify(collections.map(c => c.name).sort())) {
      throw new Error('Source collection list changed during copying');
    }
    for (const c of collections) {
      if (JSON.stringify(await fingerprint(source.collection(c.name))) !== JSON.stringify(before.get(c.name))) {
        throw new Error(`Source changed during copying: ${c.name}`);
      }
    }
    console.log('COPY_VERIFIED: test -> technosara; source preserved');
  } finally { await client.close(); }
}

main().catch(error => { console.error(error.name + ': ' + error.message); process.exitCode = 1; });
