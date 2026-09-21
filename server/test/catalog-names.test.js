const { test } = require('node:test');
const assert = require('node:assert/strict');
const { personNames, companyNames, genreNames } = require('../utils/catalogNames');

test('name migration preserves both languages and is idempotent', () => {
  const person = personNames({ name: 'هیدئو کوجیما', english_name: 'Hideo Kojima' });
  assert.deepEqual(person, { name: 'Hideo Kojima', name_fa: 'هیدئو کوجیما' });
  assert.deepEqual(personNames(person), person);
  const genre = genreNames({ name: 'Action', name_fa: 'اکشن' });
  assert.deepEqual(genre, { name: 'اکشن', name_en: 'Action' });
  assert.deepEqual(genreNames(genre), genre);
  const company = companyNames({ name: 'نینتندو', english_name: 'Nintendo' });
  assert.deepEqual(company, { name: 'Nintendo' });
  assert.deepEqual(companyNames(company), company);
  assert.throws(() => companyNames({ name: 'نینتندو' }), /Missing English name/);
});

test('catalog services save, edit and search the new name fields', async t => {
  const mongoose = require('mongoose');
  require('../models/admin.model');
  const Person = require('../models/person.model');
  const Company = require('../models/company.model');
  const Genre = require('../models/genre.model');
  const people = require('../services/person.service');
  const companies = require('../services/company.service');
  const genres = require('../services/genre.service');
  const database = `technosara_names_test_${process.pid}_${Date.now()}`;
  await mongoose.connect('mongodb://127.0.0.1:27017', { dbName: database, serverSelectionTimeoutMS: 3000 });
  t.after(async () => {
    assert.equal(mongoose.connection.name, database);
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
  const admin = { _id: new mongoose.Types.ObjectId() };
  async function call(handler, overrides = {}) {
    let result;
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { result = body; return this; } };
    await handler({ admin, query: {}, params: {}, body: {}, ...overrides }, res);
    assert.ok(res.statusCode < 400, JSON.stringify(result));
    return result;
  }
  await call(people.create, { body: { name: 'Hideo Kojima', name_fa: 'هیدئو کوجیما', english_name: 'obsolete', slug: 'kojima' } });
  const person = await Person.findOne({ slug: 'kojima' });
  assert.equal(person.name_fa, 'هیدئو کوجیما');
  assert.equal(Object.hasOwn(person.toObject(), 'english_name'), false);
  for (const search of ['Hideo', 'کوجیما']) assert.equal((await call(people.list, { query: { search } })).total, 1);
  await call(people.update, { params: { id: person._id }, body: { name: 'H. Kojima', name_fa: 'کوجیما' } });
  assert.equal((await Person.findById(person._id)).name, 'H. Kojima');
  await call(companies.addCompany, { body: { name: 'Kojima Productions', english_name: 'obsolete', name_fa: 'قدیمی', slug: 'kojima-productions', type: 'developer', founders: [{ person_id: person._id }] } });
  const company = await Company.findOne({ slug: 'kojima-productions' });
  assert.equal(company.founders[0].name, 'H. Kojima');
  assert.equal(Object.hasOwn(company.toObject(), 'english_name'), false);
  assert.equal(Object.hasOwn(company.toObject(), 'name_fa'), false);
  await call(companies.updateCompany, { params: { id: company._id }, body: { name: 'Kojima Studio' } });
  assert.equal((await call(companies.getCompanies, { query: { search: 'Kojima Studio' } })).total, 1);
  await call(genres.addGenre, { body: { name: 'اکشن', name_en: 'Action', slug: 'action' } });
  const genre = await Genre.findOne({ slug: 'action' });
  assert.equal(genre.name, 'اکشن');
  assert.equal(genre.name_en, 'Action');
  assert.equal(Object.hasOwn(genre.toObject(), 'name_fa'), false);
  for (const search of ['اکشن', 'Action']) assert.equal((await call(genres.getGenres, { query: { search } })).total, 1);
  await call(genres.updateGenre, { params: { id: genre._id }, body: { name: 'ماجراجویی', name_en: 'Adventure' } });
  assert.equal((await Genre.findById(genre._id)).name_en, 'Adventure');
});
