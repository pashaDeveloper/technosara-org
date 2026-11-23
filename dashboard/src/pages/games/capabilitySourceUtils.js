const normalize = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
export function capabilityPlatform(platform) {
  if ([platform.name_fa, platform.name].some(value => /^(?:ویندوز|مایکروسافت‌?\s*ویندوز|پی‌?\s*سی|رایانهٔ? شخصی)$/.test(String(value || '').trim()))) return 'pc';
  const names = [platform.code, platform.value, platform.slug, platform.name_en, platform.name, platform.short_name].map(normalize);
  const aliases = { pc: ['pc', 'windows', 'microsoftwindows'], ps4: ['ps4', 'playstation4'], ps5: ['ps5', 'playstation5'], xbox_one: ['xboxone'], xbox_series_xs: ['xboxseriesxs', 'xboxseries', 'xboxsx'] };
  return Object.keys(aliases).find(key => aliases[key].some(alias => names.includes(alias)));
}
export function mergeCapabilitySources(currentGlobal, results) {
  const states = { ...currentGlobal };
  let added = 0;
  for (const result of results) {
    if (result.error) continue;
    const evidence = [result.capability_status, ...(result.platforms || []).map(row => row.status)];
    for (const status of evidence) {
      for (const [key, value] of Object.entries(status || {})) {
        if (value !== true || Object.hasOwn(states, key)) continue;
        states[key] = true;
        added++;
      }
    }
  }
  return { states, added };
}
