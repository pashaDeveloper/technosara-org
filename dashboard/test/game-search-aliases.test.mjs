import {test} from 'node:test';
import assert from 'node:assert/strict';
import {gameSearchAliases} from '../src/pages/games/gameSearchAliases.js';
test('common franchise and numbered aliases',()=>{
  assert.ok(gameSearchAliases('Call Of Duty').includes('COD'));
  const aliases=gameSearchAliases('Call of Duty: Black Ops VI');
  assert.ok(aliases.includes('BO6')); assert.ok(aliases.includes('COD BO6'));
  assert.ok(!aliases.includes('BO1'));
  assert.ok(gameSearchAliases('Call of Duty: Black Ops').includes('BO1'));
  assert.ok(gameSearchAliases('Grand Theft Auto V').includes('GTA 5'));
});
test('keeps source aliases, removes duplicates and handles missing source lists',()=>{
  const aliases=gameSearchAliases('Call of Duty',{aliases:['COD','cod'],alternative_names:[{name:'Custom alias'}]});
  assert.equal(aliases.filter(value=>value.toLowerCase()==='cod').length,1);
  assert.ok(aliases.includes('Custom alias'));
  assert.doesNotThrow(()=>gameSearchAliases('',{aliases:'invalid'}));
  assert.deepEqual(gameSearchAliases('Doom'),[]);
});
