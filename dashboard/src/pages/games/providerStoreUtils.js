const normalize = value => String(value || '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const stores = [
  ['steam', ['steampowered.com'], ['steam']],
  ['epic-games', ['epicgames.com'], ['epicgames', 'epicgamesstore', 'epic']],
  ['xbox-store', ['xbox.com'], ['xbox', 'xboxstore']],
  ['playstation-store', ['store.playstation.com'], ['playstation', 'playstationstore', 'psstore']],
  ['gog', ['gog.com'], ['gog']],
  ['nintendo-eshop', ['nintendo.com'], ['nintendo', 'nintendoeshop']],
  ['ubisoft-store', ['store.ubisoft.com'], ['ubisoft', 'ubisoftstore']],
  ['ea-app', ['ea.com'], ['ea', 'eaapp', 'origin']],
  ['battle-net', ['battle.net'], ['battlenet']],
];

export function matchProviderStore(row, options) {
  const source = normalize(row.source || row.store_name);
  let host = '';
  try { host = new URL(row.url).hostname.toLowerCase(); } catch { /* Source can still identify the store. */ }
  const known = stores.find(([, domains]) => domains.some(domain => host === domain || host.endsWith(`.${domain}`)))
    || stores.find(([code, , aliases]) => [normalize(code), ...aliases].includes(source));
  const names = known ? [normalize(known[0]), ...known[2]] : source ? [source] : [];
  const matches = options.filter(option => [option.code, option.name_en, option.name, option.short_name]
    .some(value => value && names.includes(normalize(value))));
  return matches.length === 1 ? matches[0]._id : undefined;
}

export function selectProviderStores(rows, options) {
  return rows.map(row => {
    if (row.store_id) return row;
    const id = matchProviderStore(row, options);
    return id ? { ...row, store_id: id } : row;
  });
}
