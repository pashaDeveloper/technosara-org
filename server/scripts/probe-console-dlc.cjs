const fs = require('node:fs');
for (const name of ['sony', 'xbox']) {
  const html = fs.readFileSync(`${name}-dlc-probe.html`, 'utf8');
  for (const term of name === 'sony' ? ['addOns', 'apollo', '__NEXT_DATA__', 'sha256Hash', 'queryRetrieve', 'AddOn'] : ['ProductAddOns_', 'ProductAddOns', 'continuationToken']) {
    const i = html.indexOf(term);
    console.log(name, term, i, html.slice(Math.max(0, i - 150), i + 850));
  }
  console.log(name, 'scripts', [...html.matchAll(/<script[^>]*src="([^"]+)/g)].map(row => row[1]));
  if (name === 'sony') {
    const data = JSON.parse(html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)?.[1] || '{}');
    fs.writeFileSync('sony-dlc-probe.json', JSON.stringify(data, null, 2));
    console.log('nextkeys', Object.keys(data.props || {}));
  }
}
