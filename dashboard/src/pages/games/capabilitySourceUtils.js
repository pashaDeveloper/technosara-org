const normalize = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
export function capabilityPlatform(platform) {
  const names = [platform.code, platform.value, platform.slug, platform.name_en, platform.name, platform.short_name].map(normalize);
  const aliases = { pc: ['pc', 'windows', 'microsoftwindows'], ps4: ['ps4', 'playstation4'], ps5: ['ps5', 'playstation5'], xbox_one: ['xboxone'], xbox_series_xs: ['xboxseriesxs', 'xboxseries', 'xboxsx'] };
  return Object.keys(aliases).find(key => aliases[key].some(alias => names.includes(alias)));
}
export function mergeCapabilitySources(currentRows, currentGlobal, results, platforms, selectedIds) {
  const rows = currentRows.map(row => ({ ...row, status: { ...row.status } }));
  const states = { ...currentGlobal };
  let added = 0;
  for (const result of results) {
    if (result.error) continue;
    for (const [key, value] of Object.entries(result.capability_status || {})) if (value === true && !Object.hasOwn(states, key)) { states[key] = true; added++; }
    for (const evidence of result.platforms || []) {
      for (const platform of platforms.filter(item => selectedIds.includes(item._id) && capabilityPlatform(item) === evidence.platform)) {
        let row = rows.find(item => item.platform_id === platform._id);
        for (const [key, value] of Object.entries(evidence.status || {})) {
          if (value !== true || row && Object.hasOwn(row.status, key)) continue;
          if (!row) { row = { platform_id: platform._id, status: {} }; rows.push(row); }
          row.status[key] = true; added++;
        }
      }
    }
  }
  return { rows, states, added };
}
