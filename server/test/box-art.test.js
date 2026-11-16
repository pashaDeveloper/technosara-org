const { test } = require('node:test');
const assert = require('node:assert/strict');
const { read, systemFor, chooseLibretro, tgdbImages } = require('../services/boxArt.service');
const Platform = require('../models/platform.model');
const id = '507f1f77bcf86cd799439011';

test('box-art platform matching keeps services and different consoles separate', () => {
  assert.equal(systemFor({ code: 'playstation-4' }), 'ps4');
  assert.equal(systemFor({ name: 'Xbox Series X' }), 'xboxseries');
  assert.equal(systemFor({ name: 'Xbox Series S', code: 'xbox-series-s' }), 'xboxseries');
  assert.equal(systemFor({ value: 'xbox_series_xs' }), 'xboxseries');
  assert.equal(systemFor({ name: 'XBox One', code: 'xbox-one' }), 'xboxone');
  assert.equal(systemFor({ code: 'xbox-classic' }), 'xbox');
  assert.equal(systemFor({ name: 'Nintendo Switch 2' }), 'switch2');
  assert.equal(systemFor({ name: 'Xbox Game Pass' }), null);
  assert.equal(systemFor({ name: 'Xbox Cloud Gaming' }), null);
  assert.equal(systemFor({ name: 'PC' }), undefined);
});

test('Libretro matches title and region without confusing editions or sequels', () => {
  const paths = ['Named_Boxarts/Dark Souls III (Japan).png', 'Named_Boxarts/Dark Souls III (USA).png', 'Named_Boxarts/Dark Souls II (USA).png', 'Named_Boxarts/Dark Souls III (Deluxe Edition) (USA).png'];
  assert.equal(chooseLibretro(paths, 'Dark Souls 3'), paths[1]);
  assert.equal(chooseLibretro(paths.slice(2), 'Dark Souls III'), undefined);
  assert.equal(chooseLibretro(paths, 'Other Game'), undefined);
});

test('TheGamesDB selects front box art and rejects external or unsafe filenames', () => {
  const data = image => ({ include: { boxart: { data: { 123: [image] } } } });
  const game = { id: 123, game_title: 'Game' };
  assert.ok(tgdbImages(data({ type: 'boxart', side: 'front', filename: 'boxart/front/123-1.jpg' }), game).high_quality.endsWith('/original/boxart/front/123-1.jpg'));
  for (const image of [{ type: 'boxart', side: 'back', filename: 'boxart/back/123.jpg' }, { type: 'boxart', side: 'front', filename: 'https://evil.example/image.jpg' }, { type: 'boxart', side: 'front', filename: 'boxart/front/../../secret' }]) assert.equal(tgdbImages(data(image), game), null);
});

test('no-key lookup uses only the selected console public archive', async t => {
  t.mock.method(Platform, 'findById', () => ({ lean: async () => ({ code: 'ps4' }) }));
  const result = await read({ title: 'Dark Souls III', platform_id: id }, async url => {
    assert.equal(url, 'https://api.github.com/repos/libretro-thumbnails/Sony_-_PlayStation_4/git/trees/master?recursive=1');
    return new Response(JSON.stringify({ tree: [{ type: 'blob', path: 'Named_Boxarts/Dark Souls III (Japan).png' }] }));
  }, {});
  assert.equal(result.provider, 'libretro');
  assert.equal(result.side, 'front');
  assert.ok(result.high_quality.includes('Sony_-_PlayStation_4/master/Named_Boxarts/'));
});

test('TheGamesDB key stays on the server and search is filtered to the exact console', async t => {
  t.mock.method(Platform, 'findById', () => ({ lean: async () => ({ code: 'ps5' }) }));
  const calls = [];
  const result = await read({ title: 'Game', platform_id: id }, async url => {
    calls.push(url);
    if (url.includes('/Platforms?')) return new Response(JSON.stringify({ data: { platforms: { 50: { id: 50, name: 'Sony Playstation 5' } } } }));
    assert.equal(new URL(url).searchParams.get('filter[platform]'), '50');
    return new Response(JSON.stringify({ data: { games: [{ id: 123, game_title: 'Game', platform: 50 }, { id: 124, game_title: 'Game', platform: 7 }] }, include: { boxart: { data: { 123: [{ type: 'boxart', side: 'front', filename: 'boxart/front/123.jpg' }] } } } }));
  }, { THEGAMESDB_API_KEY: 'test-secret' });
  assert.equal(calls.length, 2);
  assert.equal(result.provider, 'thegamesdb');
  assert.ok(!JSON.stringify(result).includes('test-secret'));
});

test('unsupported no-key consoles give an actionable error without fetching', async t => {
  t.mock.method(Platform, 'findById', () => ({ lean: async () => ({ code: 'ps5' }) }));
  await assert.rejects(read({ title: 'Game', platform_id: id }, () => { throw new Error('must not fetch'); }, {}), { status: 503 });
});

test('Series S uses the shared Series X|S box-art archive, not Xbox One', async t => {
  t.mock.method(Platform, 'findById', () => ({ lean: async () => ({ name: 'Xbox Series S', code: 'xbox-series-s' }) }));
  const result = await read({ title: 'Halo Infinite', platform_id: id }, async url => {
    if (url.includes('/Platforms?')) return Response.json({ data: { platforms: { 50: { id: 50, name: 'Microsoft Xbox Series X' }, 51: { id: 51, name: 'Microsoft Xbox One' } } } });
    assert.equal(new URL(url).searchParams.get('filter[platform]'), '50');
    return Response.json({ data: { games: [{ id: 123, game_title: 'Halo Infinite', platform: 50 }] }, include: { boxart: { data: { 123: [{ type: 'boxart', side: 'front', filename: 'boxart/front/123.jpg' }] } } } });
  }, { THEGAMESDB_API_KEY: 'test-secret' });
  assert.equal(result.provider, 'thegamesdb');
});

test('similar titles offer usable covers only on the selected console', async t => {
  t.mock.method(Platform, 'findById', () => ({ lean: async () => ({ code: 'ps5' }) }));
  let covers = [123, 124];
  const fetcher = async url => {
    if (url.includes('/Platforms?')) return Response.json({ data: { platforms: { 50: { id: 50, name: 'Sony Playstation 5' } } } });
    return Response.json({
      data: { games: [123, 124, 125].map(id => ({ id, game_title: 'Game', platform: 50 })).concat([{ id: 126, game_title: 'Game Deluxe', platform: 50 }, { id: 127, game_title: 'Game', platform: 7 }]) },
      include: { boxart: { data: Object.fromEntries([...covers, 126, 127].map(id => [id, [{ type: 'boxart', side: 'front', filename: `boxart/front/${id}.jpg` }]])) } },
    });
  };
  const request = () => read({ title: 'Game', platform_id: id }, fetcher, { THEGAMESDB_API_KEY: 'test-secret' });
  const result = await request();
  assert.equal(result.candidates.length, 3);
  assert.ok(result.candidates[0].source_url.endsWith('id=123'));
  assert.ok(result.candidates[1].source_url.endsWith('id=124'));
  covers = [124];
  assert.ok((await request()).candidates[0].source_url.endsWith('id=124'));
  covers = [];
  const similar = await request();
  assert.equal(similar.candidates.length, 1);
  assert.equal(similar.candidates[0].title, 'Game Deluxe');
});


test('TheGamesDB retries a title suffix while preserving exact title and platform checks', async t => {
  t.mock.method(Platform, 'findById', () => ({ lean: async () => ({ code: 'ps5' }) }));
  const queries = [];
  const result = await read({ title: "Assassin's Creed Black Flag Resynced", platform_id: id }, async url => {
    if (url.includes('/Platforms?')) return Response.json({ data: { platforms: { 4980: { id: 4980, name: 'Sony Playstation 5' } } } });
    const name = new URL(url).searchParams.get('name'); queries.push(name);
    if (queries.length === 1) return Response.json({data:{games:[]}});
    return Response.json({data:{games:[{id:123,game_title:"Assassin's Creed: Black Flag Resynced",platform:4980},{id:124,game_title:"Assassin's Creed IV: Black Flag",platform:4980}]},include:{boxart:{data:{123:[{type:'boxart',side:'front',filename:'boxart/front/123.jpg'}]}}}});
  }, {THEGAMESDB_API_KEY:'test-secret'});
  assert.deepEqual(queries, ["Assassin's Creed Black Flag Resynced", 'Black Flag Resynced']);
  assert.equal(result.title, "Assassin's Creed: Black Flag Resynced");
});


test('public archive suggests nearby titles for manual selection', async t => {
  t.mock.method(Platform, 'findById', () => ({lean:async()=>({code:'ps4'})}));
  const result = await read({title:'Dark Souls',platform_id:id}, async()=>Response.json({tree:[{type:'blob',path:'Named_Boxarts/Dark Souls III (USA).png'},{type:'blob',path:'Named_Boxarts/Other Game (USA).png'}]}), {});
  assert.equal(result.candidates.length,1);
  assert.equal(result.candidates[0].title,'Dark Souls III (USA)');
});
