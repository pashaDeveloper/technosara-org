const {test}=require('node:test');
const assert=require('node:assert/strict');
const Game=require('../models/game.model');
const autosave=require('../services/gameAutosave.service');
const recovery=require('../services/gameRecovery.service');
const id='507f1f77bcf86cd799439011';
test('autosave persists metadata, sizes and capabilities without publishing a draft',async t=>{
  const existing=new Game({title:'Game',slug:'game',auto_draft:true,publication_status:'draft',platform_ids:[id]});
  let saved;
  t.mock.method(Game,'findById',async()=>existing);
  t.mock.method(Game,'updateOne',async(filter,update)=>{saved=update.$set;});
  t.mock.method(require('../utils/gameClassifications'),'gameClassificationValues',async()=>({}));
  t.mock.method(require('../utils/gameCapabilities'),'capabilityValues',async body=>{assert.equal(String(body.platform_ids[0]),id);return {platform_capabilities:body.platform_capabilities};});
  t.mock.method(require('../models/company.model'),'countDocuments',async()=>1);
  const storage=[{platform:'pc',kind:'required',checked_at:'2026-11-16T00:00:00Z',bytes:1000000000,provider:'steam',source_url:'https://store.steampowered.com/app/1/'}];
  const requirements = { minimum: 'Memory: 8 GB RAM', recommended: 'Memory: 16 GB RAM', source_url: storage[0].source_url };
  await autosave.save(id,{release_date:'2026-01-01',developer_ids:[id],storage_sizes:storage,pc_requirements:requirements,platform_capabilities:[{platform_id:id,status:{hdr:true}}],detail_banner_mirrored:true,auto_draft:false,publication_status:'published',title:'Injected'});
  assert.deepEqual(saved.pc_requirements.toObject(), {
    minimum: { memory_text: '8 GB RAM', memory_bytes: 8000000000 },
    recommended: { memory_text: '16 GB RAM', memory_bytes: 16000000000 },
    source_url: requirements.source_url,
  });
  assert.equal(saved.detail_banner_mirrored,true);
  assert.ok(saved.release_date);assert.deepEqual(saved.developer_ids,[id]);assert.equal(saved.storage_sizes[0].bytes,1000000000);assert.equal(saved.platform_capabilities[0].status.hdr,true);
  for(const key of ['auto_draft','publication_status','title'])assert.equal(Object.hasOwn(saved,key),false);
});
function fixture(t,values){
  const state={_id:id,title:'Game',developer_ids:[id],...values};const writes=[];
  t.mock.method(Game,'findById',()=>({lean:async()=>structuredClone(state)}));
  t.mock.method(Game,'updateOne',async(filter,update)=>{writes.push({filter,update});Object.assign(state,update.$set);return {modifiedCount:1};});
  return {state,writes};
}
test('opening an existing game migrates legacy requirements to named fields once', async t => {
  const legacy = {
    minimum: [
      { key: 'processor', label: 'Processor', value: 'Intel Core i5' },
      { key: 'memory', label: 'Memory', value: '8 GB RAM' },
    ],
    recommended: 'Graphics: RTX 2060',
    source_url: 'https://store.steampowered.com/app/1/',
  };
  const { state } = fixture(t, { pc_requirements: legacy });
  const write = t.mock.method(Game.collection, 'updateOne', async (filter, update) => {
    assert.deepEqual(filter, { _id: id, pc_requirements: legacy });
    Object.assign(state, update.$set);
    return { modifiedCount: 1 };
  });
  const hydrated = Game.hydrate({ _id: id, pc_requirements: structuredClone(legacy) });
  const result = await recovery.recover(id);
  assert.deepEqual(result.record.pc_requirements, hydrated.pc_requirements.toObject());
  assert.equal(state.pc_requirements.minimum.processor, 'Intel Core i5');
  assert.equal(state.pc_requirements.recommended.graphics, 'RTX 2060');
  assert.equal(state.pc_requirements.minimum.processor_search, 'intel core i5');
  assert.equal(state.pc_requirements.minimum.memory_bytes, 8000000000);
  await recovery.recover(id);
  assert.equal(write.mock.callCount(), 1);
});
test('recovery restores deleted Cloudinary images and missing metadata from the saved source',async t=>{
  await stubScreenshotDownload(t);
  const {state}=fixture(t,{image:'https://res.cloudinary.com/demo/deleted.webp',screenshots:['https://res.cloudinary.com/demo/shot.webp'],gamebrain_source:{image:'https://example.com/original.jpg',screenshots:[{url:'https://example.com/shot.jpg'}],release_date:'2026-01-01'}});
  const result=await recovery.recover(id,async()=>new Response(null,{status:404}));
  assert.equal(result.record.image,'https://example.com/original.jpg');assert.deepEqual(state.screenshots,['https://example.com/shot.jpg']);assert.equal(state.release_date,'2026-01-01');
});
test('recovery keeps stored images during outages and never probes arbitrary hosts',async t=>{
  fixture(t,{image:'https://res.cloudinary.com/demo/kept.webp',screenshots:['https://example.com/kept.jpg'],gamebrain_source:{}});
  let calls=0;const result=await recovery.recover(id,async url=>{calls++;assert.equal(new URL(url).hostname,'res.cloudinary.com');return new Response(null,{status:502});});
  assert.equal(calls,1);assert.equal(result.record.image,'https://res.cloudinary.com/demo/kept.webp');
  assert.equal(await recovery.missingCloudImage('http://127.0.0.1/image',()=>{throw Error('must not fetch')}),false);
});
test('missing source is fetched again and restores empty screenshots',async t=>{
  await stubScreenshotDownload(t);
  fixture(t,{id:123,screenshots:[]});let calls=0;
  t.mock.method(require('../services/gamebrain.service'),'details',async value=>{calls++;assert.equal(value,'123');return {image:'https://example.com/cover.jpg',screenshots:['https://example.com/shot.jpg']};});
  const result=await recovery.recover(id);assert.equal(calls,1);assert.equal(result.record.screenshots.length,1);assert.ok(result.record.gamebrain_source);
});
test('missing studio is linked to an existing exact match',async t=>{
  fixture(t,{developer_ids:[],developer:'Test Studio',gamebrain_source:{}});
  t.mock.method(require('../models/company.model'),'find',()=>({lean:async()=>[{_id:id,name:'Test Studio'}]}));
  const result=await recovery.recover(id);assert.deepEqual(result.record.developer_ids,[id]);
});

test('official Steam publisher and artwork fill only missing fields',async t=>{
  fixture(t,{publisher_ids:[],official_stores:[{url:'https://store.steampowered.com/app/123/'}],gamebrain_source:{}});
  t.mock.method(require('../services/steamDlc.service'),'details',async()=>({name:'Game',publishers:['Publisher'],background_raw:'https://example.com/banner.jpg'}));
  t.mock.method(require('../models/company.model'),'find',()=>({lean:async()=>[{_id:id,name:'Publisher'}]}));
  const result=await recovery.recover(id,async()=>new Response(null,{headers:{'content-type':'image/jpeg'}}));
  assert.deepEqual(result.record.publisher_ids,[id]);assert.equal(result.record.detail_banner,'https://example.com/banner.jpg');assert.match(result.record.detail_poster,/library_600x900/);
});
test('a different Steam title cannot supply another game publisher or artwork',async t=>{
  fixture(t,{publisher_ids:[],official_stores:[{url:'https://store.steampowered.com/app/123/'}],gamebrain_source:{}});
  t.mock.method(require('../services/steamDlc.service'),'details',async()=>({name:'Other Game',publishers:['Wrong publisher'],background_raw:'https://example.com/wrong.jpg'}));
  const result=await recovery.recover(id);assert.equal(result.record.detail_banner,undefined);assert.deepEqual(result.record.publisher_ids,[]);assert.ok(result.warnings.includes('store_metadata_unavailable'));
});

async function stubScreenshotDownload(t) {
  const sharp = require('sharp');
  const make = (width, height) => sharp({ create: { width, height, channels: 3, background: 'black' } }).png().toBuffer();
  const landscape = await make(40, 20);
  const portrait = await make(20, 40);
  t.mock.method(require('../services/remoteImage.service'), 'download', async url => ({
    buffer: url.includes('portrait') ? portrait : landscape,
  }));
}

test('only new non-portrait screenshot URLs are saved, in selection order', async t => {
  await stubScreenshotDownload(t);
  const { filterScreenshots } = require('../utils/gameScreenshots');
  const urls = ['https://example.com/portrait.jpg', 'https://example.com/landscape.jpg', 'https://example.com/legacy.jpg'];
  assert.deepEqual(await filterScreenshots(urls, [urls[2]]), urls.slice(1));
});

