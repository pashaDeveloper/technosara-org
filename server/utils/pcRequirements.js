const keys = {
  os: 'os',
  'operating system': 'os',
  processor: 'processor',
  cpu: 'processor',
  memory: 'memory',
  ram: 'memory',
  graphics: 'graphics',
  gpu: 'graphics',
  directx: 'directx',
  network: 'network',
  storage: 'storage',
  'hard drive': 'storage',
  'sound card': 'sound_card',
  notes: 'notes',
  'additional notes': 'additional_notes',
};

const byteFactors = { KB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12, KIB: 1024, MIB: 1024 ** 2, GIB: 1024 ** 3, TIB: 1024 ** 4 };

function normalizeItem(item) {
  if (!item || typeof item.value !== 'string') return item;
  const key = item.key === 'notes' && typeof item.label === 'string' &&
    item.label.trim().toLowerCase() === 'additional notes' ? 'additional_notes' : item.key;
  const next = { ...item, key };
  delete next.bytes;
  delete next.search_text;
  if ((key === 'memory' || key === 'storage') && !item.value.trim().includes('\n')) {
    const match = item.value.trim().match(/^(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?\s*(KiB|MiB|GiB|TiB|KB|MB|GB|TB)\b(?!\s*(?:[-–—]|to\b|\/\s*\d))/i);
    if (match) {
      const bytes = Math.round(Number(match[1].replace(/,/g, '') + (match[2] || '')) * byteFactors[match[3].toUpperCase()]);
      if (Number.isSafeInteger(bytes) && bytes > 0) next.bytes = bytes;
    }
  } else if (key === 'processor' || key === 'graphics') {
    next.search_text = item.value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    if (!next.search_text) delete next.search_text;
  }
  return key === item.key && next.bytes === item.bytes && next.search_text === item.search_text ? item : next;
}

function requirementItems(text) {
  return text.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => {
    const match = line.match(/^([^:]{1,120}):\s*(.+)$/);
    if (!match) return { key: 'notes', label: 'Notes', value: line };
    const [, label, value] = match;
    const normalized = label.trim().toLowerCase();
    return {
      key: Object.hasOwn(keys, normalized) ? keys[normalized] : 'other',
      label: label.trim(),
      value,
    };
  });
}

function normalizeTier(tier) {
  const items = typeof tier === 'string' ? requirementItems(tier) : tier;
  if (!Array.isArray(items)) {
    if (!tier || typeof tier !== 'object') return tier;
    const next = { ...tier };
    for (const key of ['memory', 'storage', 'processor', 'graphics']) {
      const numeric = key === 'memory' || key === 'storage';
      const field = numeric ? `${key}_bytes` : `${key}_search`;
      const item = normalizeItem({ key, value: tier[numeric ? `${key}_text` : key] });
      const derived = numeric ? item.bytes : item.search_text;
      if (derived === undefined) delete next[field];
      else next[field] = derived;
    }
    return Object.keys(next).length === Object.keys(tier).length &&
      Object.keys(next).every(key => next[key] === tier[key]) ? tier : next;
  }

  const fields = {};
  for (const item of items) {
    if (typeof item?.value !== 'string' || !item.value.trim()) continue;
    const { key, value, label } = normalizeItem(item);
    if (key === 'other' || !Object.values(keys).includes(key)) {
      (fields.other ||= []).push({ label, value });
      continue;
    }
    const field = key === 'memory' || key === 'storage' ? `${key}_text` : key;
    fields[field] = fields[field] ? `${fields[field]}\n${value}` : value;
  }
  return normalizeTier(fields);
}

function normalizePcRequirements(requirements) {
  if (!requirements || typeof requirements !== 'object') return requirements;
  const updates = {};
  for (const tier of ['minimum', 'recommended']) {
    const items = requirements[tier];
    const normalized = normalizeTier(items);
    if (normalized !== items) updates[tier] = normalized;
  }
  return Object.keys(updates).length ? { ...requirements, ...updates } : requirements;
}

module.exports = { normalizePcRequirements };
