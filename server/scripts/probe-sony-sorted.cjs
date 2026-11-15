const fs = require('node:fs'), vm = require('node:vm'), crypto = require('node:crypto');
const modules = {}, cache = {};
const chunks = [];
chunks.push = chunk => Object.assign(modules, chunk[1]);
const context = { self: { pswCommerceAnywhere: chunks }, console, __DEV__: false, setTimeout, clearTimeout };
for (const file of ['sony-network-js.txt', 'sony-common-js.txt', 'sony-framework-js.txt']) vm.runInNewContext(fs.readFileSync(file, 'utf8'), context);
function req(id) {
  if (cache[id]) return cache[id].exports;
  if (!modules[id]) throw new Error(`Missing ${id}`);
  const module = cache[id] = { exports: {} }; modules[id](module, module.exports, req); return module.exports;
}
req.d = (exports, defs) => { for (const key in defs) Object.defineProperty(exports, key, { enumerable: true, get: defs[key] }); };
req.r = exports => Object.defineProperty(exports, '__esModule', { value: true });
req.nmd = module => { module.paths = []; module.children ||= []; return module; };
req.o = (object, key) => Object.hasOwn(object, key);
req.n = mod => { const result = mod?.__esModule ? () => mod.default : () => mod; req.d(result, { a: result }); return result; };
(async () => {
  const text = fs.readFileSync('sony-query-probe.graphql', 'utf8');
  const parse = req(5111).J1;
  const ast = parse(text);
  const sorted = req(585).print(req(1221).sortAST(ast));
  fs.writeFileSync('sony-sorted-probe.graphql', sorted);
  const hash = crypto.createHash('sha256').update(sorted).digest('hex');
  const u = new URL('https://web.np.playstation.com/api/graphql/v1/op');
  u.searchParams.set('operationName', 'getAddOnProductsByConcept');
  u.searchParams.set('variables', JSON.stringify({ conceptId: '201930', pageArgs: { size: 48 } }));
  u.searchParams.set('extensions', JSON.stringify({ persistedQuery: { version: 1, sha256Hash: hash } }));
  const r = await fetch(u, { headers: { 'Content-Type': 'application/json', 'x-psn-store-locale-override': 'en-us', 'X-PSN-App-Ver': '3.48.0', 'apollographql-client-name': '@sie-private/web-commerce-anywhere' } }); const s = await r.text();
  console.log(hash, r.status, s.slice(0, 2200));
  if (r.ok) fs.writeFileSync('sony-gql-result.json', s);
})().catch(e => { console.error(e.stack); process.exitCode = 1; });
