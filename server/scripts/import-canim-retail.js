const path = require('node:path');
const fs = require('node:fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

const sourcePath = process.argv[2];
const targetPath = path.join(__dirname, '../.env');
const connect = (filename) => {
  const env = dotenv.parse(fs.readFileSync(filename));
  const uri = env.MONGO_URI || env.ATLAS_URI;
  if (!uri) throw new Error('MongoDB connection is missing');
  return mongoose.createConnection(uri, { dbName: env.DB_NAME || undefined, serverSelectionTimeoutMS: 15000 }).asPromise();
};

const referenceFields = ['title', 'description', 'logo', 'thumbnail', 'keynotes', 'tags', 'createdAt', 'updatedAt'];
const productFields = [
  'title', 'summary', 'thumbnail', 'gallery', 'features', 'variations', 'campaign',
  'price', 'condition', 'status', 'isDeleted', 'category', 'brand', 'store', 'createdAt', 'updatedAt',
];

async function copy(source, target, sourceName, targetName, fields, defaults = {}) {
  const sourceCollection = source.collection(sourceName);
  const targetCollection = target.collection(targetName);
  const projection = Object.fromEntries(fields.map((key) => [key, 1]));
  let scanned = 0;
  let inserted = 0;
  for await (const { _id, ...doc } of sourceCollection.find({}, { projection })) {
    const result = await targetCollection.updateOne({ _id }, { $setOnInsert: { ...defaults, ...doc } }, { upsert: true });
    scanned++;
    inserted += result.upsertedCount;
  }
  return { scanned, inserted };
}

async function main() {
  if (!sourcePath) throw new Error('Pass the Canim server .env path');
  const source = await connect(sourcePath);
  let target;
  try {
    target = await connect(targetPath);
    const [sourceProducts, targetProducts] = await Promise.all([
      source.db.listCollections({ name: 'products' }).next(),
      target.db.listCollections({ name: 'products' }).next(),
    ]);
    if (!sourceProducts) throw new Error('Source products collection was not found');
    const sourceUuid = sourceProducts.info?.uuid?.toString('hex');
    const sharedProducts = Boolean(sourceUuid && sourceUuid === targetProducts?.info?.uuid?.toString('hex'));
    const result = { sharedProducts };
    for (const group of ['brands', 'categories', 'stores']) {
      result[group] = await copy(source.db, target.db, group, `retail_${group}`, referenceFields, { isDeleted: false, status: 'active' });
    }
    result.products = await copy(source.db, target.db, 'products', 'retail_products', productFields, { isDeleted: false, status: 'active' });
    result.reviews = await copy(source.db, target.db, 'reviews', 'retail_reviews', ['product', 'rating', 'comment', 'createdAt', 'updatedAt']);
    console.log(JSON.stringify(result));
  } finally {
    await Promise.all([source.close(), target?.close()]);
  }
}

main().catch((error) => {
  console.error('Retail import failed', error.name, error.code || '');
  process.exitCode = 1;
});
