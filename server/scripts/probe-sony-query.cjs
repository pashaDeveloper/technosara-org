const fs = require('node:fs'), crypto = require('node:crypto');
function withTypenames(text, fragment) {
  const lines = text.trim().split('\n'), result = []; let depth = 0;
  for (const line of lines) {
    if (line.trim() === '}' && (depth > 1 || fragment)) result.push(' '.repeat(depth * 2) + '__typename');
    result.push(line);
    depth += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
  }
  return result.join('\n');
}
(async () => {
  const js = fs.readFileSync('sony-addons-js.txt', 'utf8');
  const fragment = JSON.parse(js.match(/function I\(\).*?\(\[("(?:[^"\\]|\\.)*")/)[1]);
  const query = JSON.parse(js.match(/function _\(\).*?\(\[("(?:[^"\\]|\\.)*")/)[1]);
  const text = withTypenames(query, false) + '\n\n' + withTypenames(fragment, true);
  fs.writeFileSync('sony-query-probe.graphql', text);
  for (const useHash of [true, false]) {
    const u = new URL('https://web.np.playstation.com/api/graphql/v1/op');
    u.searchParams.set('operationName', 'getAddOnProductsByConcept');
    u.searchParams.set('variables', JSON.stringify({ conceptId: '201930', pageArgs: { size: 48 } }));
    if (useHash) u.searchParams.set('extensions', JSON.stringify({ persistedQuery: { version: 1, sha256Hash: crypto.createHash('sha256').update(text).digest('hex') } }));
    else u.searchParams.set('query', text);
    const r = await fetch(u, { headers: { 'x-psn-store-locale-override': 'en-US' } }); const s = await r.text();
    console.log(useHash, r.status, s.slice(0, 1800));
    if (r.ok) fs.writeFileSync('sony-gql-result.json', s);
  }
})();
