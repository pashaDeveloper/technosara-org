const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const migrate = require('../utils/migratePlatformFamilies');

async function main() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
  await mongoose.connect(process.env.MONGO_URI, process.env.DB_NAME ? { dbName: process.env.DB_NAME } : {});
  try { console.log(`Migrated ${await migrate()} platforms; legacy family text was preserved.`); }
  finally { await mongoose.disconnect(); }
}
main().catch(() => { console.error('Platform family migration failed. Check the database configuration.'); process.exitCode = 1; });
