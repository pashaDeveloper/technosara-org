const { test } = require('node:test');
const assert = require('node:assert/strict');
const search = require('../services/wikidataSearch');

test('Wikidata titles require a current PlayStation platform and preserve source IDs', async () => {
  const claim = (id, rank = 'normal') => ({ rank, mainsnak: { datavalue: { value: { id } } } });
  const requests = [];
  const rows = await search('Ghost', async url => {
    requests.push(url);
    assert.equal(url.searchParams.has('key'), false);
    if (url.searchParams.get('action') === 'wbsearchentities') return { search: [{ id: 'Q1' }, { id: 'Q2' }, { id: 'Q3' }] };
    if (url.searchParams.get('props') === 'labels') return { entities: {
      Q10: { labels: { mul: { value: 'PlayStation 5' } } }, Q11: { labels: { en: { value: 'Windows' } } },
    } };
    return { entities: {
      Q1: { labels: { en: { value: 'Ghost Game' } }, claims: { P400: [claim('Q10'), claim('Q11')] } },
      Q2: { labels: { en: { value: 'PC game' } }, claims: { P400: [claim('Q11')] } },
      Q3: { labels: { en: { value: 'Removed platform' } }, claims: { P400: [claim('Q10', 'deprecated')] } },
    } };
  });
  assert.equal(requests.length, 3);
  assert.deepEqual(rows, [{ provider: 'wikidata', platform_family: 'playstation', id: 'Q1', title: 'Ghost Game', image: null, platforms: ['PlayStation 5'], source_url: 'https://www.wikidata.org/wiki/Q1' }]);
});

test('Wikidata empty searches stop early and API errors remain failures', async () => {
  assert.deepEqual(await search('Missing', async () => ({ search: [] })), []);
  await assert.rejects(search('Ghost', async () => ({ error: { code: 'maxlag' } })), /unavailable/);
});
