const fs = require('node:fs');
const html = fs.readFileSync('xbox-dlc-probe.html', 'utf8');
for (const x of html.matchAll(/ProductAddOns/g)) console.log(x.index, html.slice(x.index - 70, x.index + 700));
for (const f of fs.readdirSync('.').filter(x => /^xbox-chunk/.test(x))) {
  const s = fs.readFileSync(f, 'utf8');
  console.log(f, s.length, [...new Set(s.match(/https?:[^\s"<>]{8,180}/g))].filter(x => /catalog|channel|reco|storeedge|storefront/i.test(x)).slice(0, 30));
  for (const term of ['SeededProduct', 'seededProduct', 'seededchannel', '/channels/', 'ProductAddOns']) {
    let i = s.indexOf(term);
    if (i >= 0) console.log(term, s.slice(Math.max(0, i - 200), i + 800));
  }
}
