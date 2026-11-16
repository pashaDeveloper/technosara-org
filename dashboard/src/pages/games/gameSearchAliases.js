const key = value => value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
const roman = { i:1, ii:2, iii:3, iv:4, v:5, vi:6, vii:7, viii:8, ix:9, x:10 };
export function gameSearchAliases(title = '', source = {}) {
  const clean = title.replace(/[\u2122\u00ae\u00a9]/g, '').replace(/\b(i|ii|iii|iv|v|vi|vii|viii|ix|x)\b/gi, value => roman[value.toLowerCase()]).trim();
  const result = [...(Array.isArray(source.aliases) ? source.aliases : []), ...(Array.isArray(source.alternative_names) ? source.alternative_names : [])].map(value => typeof value === 'string' ? value : value?.name).filter(Boolean);
  const rules = [[/call\s+of\s+duty/i,'COD'],[/grand\s+theft\s+auto/i,'GTA'],[/red\s+dead\s+redemption/i,'RDR'],[/assassin['\u2019]?s?\s+creed/i,'AC'],[/resident\s+evil/i,'RE'],[/battlefield/i,'BF'],[/need\s+for\s+speed/i,'NFS'],[/far\s+cry/i,'FC']];
  for (const [pattern, prefix] of rules) {
    if (!pattern.test(clean)) continue;
    const tail = clean.replace(pattern, '').replace(/^[\s:.-]+/, '').trim();
    result.push(prefix);
    if (tail) result.push(prefix + ' ' + tail);
  }
  const blackOps = clean.match(/\bblack\s+ops(?:\s+(\d+))?\s*$/i);
  if (blackOps) {
    const number = blackOps[1] || '1';
    result.push('BO' + number, 'BO ' + number, 'Black Ops ' + number);
    if (/call\s+of\s+duty/i.test(clean)) result.push('COD BO' + number, 'COD Black Ops ' + number);
  }
  const words = clean.match(/[a-z0-9]+/gi) || [];
  if (words.length >= 2 && words.length <= 8 && words.every(word => /^[a-z]+$|^\d+$/.test(word.toLowerCase()))) {
    const acronym = words.map(word => /^\d+$/.test(word) ? word : word[0].toUpperCase()).join('');
    if (acronym.length >= 2 && acronym.length <= 12) result.push(acronym);
  }
  const seen = new Set([key(title)]);
  return result.filter(value => typeof value === 'string' && value.trim() && value.length <= 200).filter(value => { const normalized = key(value); if (!normalized || seen.has(normalized)) return false; seen.add(normalized); return true; }).slice(0, 30);
}
