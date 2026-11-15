const fs = require('node:fs');
(async () => {
  const query = 'query getAddOnProductsByConcept($conceptId: ID!, $pageArgs: PageArgs) { addOnProductsRetrieve(conceptId: $conceptId, pageArgs: $pageArgs) { addOnProducts { id name } } }';
  const u = new URL('https://web.np.playstation.com/api/graphql/v1/op');
  u.searchParams.set('operationName', 'getAddOnProductsByConcept');
  u.searchParams.set('variables', JSON.stringify({ conceptId: '201930', pageArgs: { size: 100, offset: 0 } }));
  u.searchParams.set('query', query);
  const r = await fetch(u, { headers: { 'x-psn-store-locale-override': 'en-US' }, signal: AbortSignal.timeout(20000) });
  console.log('sony gql', r.status, (await r.text()).slice(0, 1500));
  const html = fs.readFileSync('xbox-dlc-probe.html', 'utf8');
  const urls = [...html.matchAll(/<script[^>]*src="([^"]+)/g)].map(row => row[1]).filter(url => url.includes('assets-xbxweb'));
  await Promise.all(urls.map(async (url, index) => {
    const text = await (await fetch(url)).text();
    fs.writeFileSync(`xbox-chunk-${index}.txt`, text);
    for (const term of ['reco.mp.', 'ProductAddOns', 'getRelatedProducts', 'seededProducts', 'Reco', '/recommendations', 'catalog.gamepass']) {
      let i = -1, count = 0;
      while ((i = text.indexOf(term, i + 1)) >= 0 && count++ < 5) console.log(index, term, text.slice(Math.max(0, i - 180), i + 550));
    }
  }));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
