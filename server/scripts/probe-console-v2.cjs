const fs = require('node:fs');
(async () => {
  for (const channel of ['ProductAddOns_9NXMBTB02ZSF', 'ProductAddOns_C496CLVXMJP8']) {
    const r = await fetch('https://emerald.xboxservices.com/xboxcomfd/browse?locale=en-US', { method: 'POST', headers: { 'Content-Type': 'application/json', 'MS-API-Version': '1.1' }, body: JSON.stringify({ ChannelId: channel, ChannelKeyToBeUsedInResponse: channel, ReturnFilters: false, Filters: '' }), signal: AbortSignal.timeout(20000) });
    const s = await r.text(); console.log('xbox', channel, r.status, s.slice(0, 3000));
    if (r.ok) fs.writeFileSync(`xbox-channel-${channel}.json`, s);
  }
  const js = fs.readFileSync('sony-addons-js.txt', 'utf8');
  const fragment = JSON.parse(js.match(/function I\(\).*?\(\[("(?:[^"\\]|\\.)*")/)[1]);
  const query = JSON.parse(js.match(/function _\(\).*?\(\[("(?:[^"\\]|\\.)*")/)[1]);
  const text = query.trim() + '\n\n' + fragment.trim();
  for (const operation of [text, text.replace(/\n/g, '\n')]) {
    const u = new URL('https://web.np.playstation.com/api/graphql/v1/op');
    u.searchParams.set('operationName', 'getAddOnProductsByConcept');
    u.searchParams.set('variables', JSON.stringify({ conceptId: '201930', pageArgs: { size: 48 } }));
    u.searchParams.set('query', operation);
    const r = await fetch(u, { headers: { 'x-psn-store-locale-override': 'en-US' }, signal: AbortSignal.timeout(20000) });
    console.log('sony fullquery', r.status, (await r.text()).slice(0, 1500));
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
